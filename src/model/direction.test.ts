import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {buildPilotProject,pilotBeats} from './pilot';
import {compileDirection,makeAutomaticDirection,reviewVisualDirection,directionSchema,type Direction} from './direction';
import {investigationSchema} from './shots';
import {parseProject,projectDuration} from './project';
import {applyOperations} from './operations';

const uuid=()=>randomUUID();
function fixture(){
  const assetId=uuid();
  const asset={id:assetId,kind:'audio' as const,name:'voz-local.wav',mime:'audio/wav',
    url:'http://127.0.0.1:4317/media/'+assetId,durationFrames:900,rights:{status:'unknown' as const,sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''},};
  return buildPilotProject({newId:uuid,voiceAsset:asset,speechFrames:pilotBeats.map(b=>b.end-b.start-8)});
}
function doc(project=fixture()):Direction{
  return directionSchema.parse({version:1 as const,title:project.name,beats:[
    {startFrame:0,durationFrames:150,purpose:'hook' as const,title:'PERGUNTA',motionPreset:'subtle-zoom' as const},
    {startFrame:150,durationFrames:150,purpose:'proof' as const,title:'DOCUMENTO',motionPreset:'pan-left' as const},
    {startFrame:300,durationFrames:150,purpose:'data' as const,title:'GRÁFICO',motionPreset:'emphasis' as const},
    {startFrame:450,durationFrames:150,purpose:'contrast' as const,title:'CONTRASTE',motionPreset:'still' as const},
    {startFrame:600,durationFrames:150,purpose:'location' as const,title:'LOCALIZAÇÃO',motionPreset:'pan-right' as const},
    {startFrame:750,durationFrames:150,purpose:'conclusion' as const,title:'FECHAMENTO',motionPreset:'subtle-zoom' as const},
  ]});
}
describe('diretor de montagem investigativa offline e responsável',()=>{
  it('planeja 30s em múltiplas composições, preservando voz, legenda, mídia e fonte',()=>{
    const current=fixture();
    const before=JSON.stringify(current);
    const compiled=compileDirection(current,doc(current),uuid);
    expect(compiled.operations[0].type).toBe('replaceShots');
    expect(compiled.preview.visualMode).toBe('shots');
    expect(compiled.preview.shots.map(x=>x.style)).toEqual(['dossier','document','chart','comparison','map','evidence']);
    expect(compiled.preview.clips).toEqual(current.clips);
    expect(compiled.preview.captions).toEqual(current.captions);
    expect(compiled.preview.assets).toEqual(current.assets);
    expect(compiled.preview.evidence).toEqual(current.evidence);
    expect(compiled.preview.scenes).toEqual(current.scenes);
    expect(compiled.report.coveragePercent).toBe(100);
    expect(compiled.report.shots).toBe(6);
    expect(JSON.stringify(current)).toBe(before);
  });
  it('gera estrutura automática do texto sem fingir pesquisa ou fonte verificada',()=>{
    const project=fixture();
    const direction=makeAutomaticDirection(project);
    const compiled=compileDirection(project,direction,uuid);
    expect(compiled.preview.shots.length).toBeGreaterThan(6);
    expect(compiled.preview.shots.every(s=>s.investigation.representation==='illustration')).toBe(true);
    expect(compiled.preview.shots.every(s=>s.investigation.sourceEvidenceId===undefined)).toBe(true);
    expect(compiled.report.coveragePercent).toBe(100);
    expect(compiled.preview.shots.every(s=>s.title.length<=60)).toBe(true);
    expect(projectDuration(compiled.preview)).toBe(900);
  });
  it('bloqueia roteiro visual com buraco e áudio intocado',()=>{
    const project=fixture();
    const direction=doc(project);
    direction.beats[1].startFrame=180;
    expect(()=>compileDirection(project,direction,uuid)).toThrow(/contínuos/);
    const short=doc(project);short.beats.pop();
    expect(()=>compileDirection(project,short,uuid)).toThrow(/cobre/);
  });
  it('não permite apresentar valores ou trechos como fonte sem cadastro',()=>{
    const project=fixture();
    const badData=doc(project);
    badData.beats[2] = {...badData.beats[2],investigation:investigationSchema.parse({points:[{label:'Exemplo',value:10}],unit:'°C'})};
    expect(()=>compileDirection(project,badData,uuid)).toThrow(/sourceEvidenceId/);
    const sourceExcerpt=doc(project);
    sourceExcerpt.beats[1]={...sourceExcerpt.beats[1],
      investigation:investigationSchema.parse({representation:'source-excerpt',excerpt:'Texto supostamente oficial'})};
    expect(()=>compileDirection(project,sourceExcerpt,uuid)).toThrow(/evidenceId/);
  });
  it('referência pendente é marcada; verificada só quando editor confirma',()=>{
    const old=fixture();
    const evidenceId=uuid();
    const project=parseProject({...old,evidence:[{
      id:evidenceId,claim:'Amostra simulada',sourceTitle:'Tabela de teste sintética',
      sourceUrl:'',notes:'Material sintético; não publicar',reviewStatus:'pending',
    }]});
    const direction=doc(project);
    direction.beats[2]={...direction.beats[2],investigation:investigationSchema.parse({sourceEvidenceId:evidenceId,points:[{label:'Teste',value:10}],unit:'un'})};
    const staged=compileDirection(project,direction,uuid);
    expect(staged.report.unverifiedVisuals).toBeGreaterThan(0);
    expect(staged.report.issues.some(x=>x.code==='source-unverified')).toBe(true);
    const checked=parseProject({...project,evidence:[{...project.evidence[0],reviewStatus:'verified'}]});
    expect(compileDirection(checked,direction,uuid).report.unverifiedVisuals).toBe(0);
  });
  it('diagnostica buracos da timeline, planos longos e gráficos sem dados',()=>{
    const original=fixture();
    const directed=compileDirection(original,doc(original),uuid).preview;
    const hole=applyOperations(directed,[{type:'removeShot',shotId:directed.shots[2].id}]);
    expect(reviewVisualDirection(hole).issues.some(x=>x.code==='visual-gap')).toBe(true);
    const long=applyOperations(directed,[{type:'updateShot',shotId:directed.shots[0].id,
      changes:{durationFrames:300,motion:{x:[],y:[],scale:[],rotation:[],opacity:[]}}}]);
    expect(reviewVisualDirection(long).longShots).toBe(1);
    expect(reviewVisualDirection(directed).issues.some(x=>x.code==='chart-placeholder')).toBe(true);
  });
  it('aceita planos antigos sem investigação e rejeita fonte inexistente',()=>{
    const project=fixture();
    const old=structuredClone(project);
    old.shots.forEach(shot=>{delete (shot as unknown as {investigation?:unknown}).investigation;});
    expect(parseProject(old).shots[0].investigation.representation).toBe('illustration');
    const invalid=doc(project);
    invalid.beats[1]={...invalid.beats[1],investigation:investigationSchema.parse({sourceEvidenceId:uuid()})};
    expect(()=>compileDirection(project,invalid,uuid)).toThrow(/não cadastrada/);
  });
});
