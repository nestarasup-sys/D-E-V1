import {describe,it,expect} from 'vitest';
import {parseProject,starterProject,projectDuration,type Project} from './project';
import {applyOperations} from './operations';
import {evaluateKeyframes,evaluateMotion,retimeMotion} from './shots';
import {buildPilotProject,PILOT_FRAMES,pilotBeats} from './pilot';

function idFactory(){
  let count=0;
  return ()=> '00000000-0000-4000-8000-'+String(++count).padStart(12,'0');
}
describe('modelo de episódios com planos e compatibilidade',()=>{
  it('abre projeto v2 de cartões sem converter, mantendo visual antigo',()=>{
    const {shots:_,chapters:__,channelKit:___,visualMode:____,...old}=structuredClone(starterProject);
    const parsed=parseProject(old);
    expect(parsed.version).toBe(2);
    expect(parsed.visualMode).toBe('legacy');
    expect(parsed.shots).toHaveLength(0);
    expect(parsed.scenes.map(x=>x.title)).toEqual(old.scenes.map(x=>x.title));
    expect(projectDuration(parsed)).toBe(projectDuration(starterProject));
  });
  it('gera um piloto de 900 frames com 8 planos e 3 capítulos, sem dados privados',()=>{
    const project=buildPilotProject({newId:idFactory()});
    expect(projectDuration(project)).toBe(PILOT_FRAMES);
    expect(project.shots).toHaveLength(8);
    expect(project.visualMode).toBe('shots');
    expect(project.chapters).toHaveLength(3);
    expect(project.captions).toHaveLength(8);
    expect(project.shots.every(s=>s.durationFrames>=60&&s.durationFrames<=150)).toBe(true);
    expect(project.shots[0].startFrame).toBe(0);
    expect(project.shots.at(-1)!.startFrame+project.shots.at(-1)!.durationFrames).toBe(900);
    expect(new Set(project.shots.map(x=>x.style)).size).toBeGreaterThanOrEqual(5);
  });
  it('narrador e legenda continuam nos mesmos frames ao mover um plano visual',()=>{
    const uuid=idFactory();
    const assetId=uuid();
    const asset={id:assetId,kind:'audio' as const,mime:'audio/wav',name:'voz.wav',
      url:'http://127.0.0.1:4317/media/'+assetId,durationFrames:900,
      rights:{status:'unknown' as const,sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}};
    const before=buildPilotProject({newId:uuid,voiceAsset:asset,speechFrames:pilotBeats.map(x=>x.end-x.start-8)});
    expect(before.clips[0].durationFrames).toBe(900);
    const first=before.shots[0];
    const after=applyOperations(before,[{type:'updateShot',shotId:first.id,changes:{startFrame:6,durationFrames:first.durationFrames-6,motion:retimeMotion(first.motion,first.durationFrames,first.durationFrames-6)}}]);
    expect(after.shots[0].startFrame).toBe(6);
    expect(after.clips).toEqual(before.clips);
    expect(after.captions).toEqual(before.captions);
  });
  it('rejeita corte maior que a duração do episódio e keyframes fora da área',()=>{
    const project=buildPilotProject({newId:idFactory()});
    const shot=project.shots[0];
    expect(()=>applyOperations(project,[{type:'updateShot',shotId:shot.id,changes:{startFrame:850}}])).toThrow();
    expect(()=>applyOperations(project,[{type:'updateShot',shotId:shot.id,changes:{
      motion:{...shot.motion,x:[{frame:shot.durationFrames,value:6,easing:'linear'}]},
    }}])).toThrow();
  });
  it('avalia easing e retima movimentos quando a duração muda',()=>{
    expect(evaluateKeyframes([{frame:0,value:0,easing:'linear'},{frame:10,value:10,easing:'linear'}],5,0)).toBe(5);
    expect(evaluateKeyframes([{frame:0,value:0,easing:'ease-in'},{frame:10,value:10,easing:'linear'}],5,0)).toBeLessThan(5);
    const project=buildPilotProject({newId:idFactory()});
    const first=project.shots[0];
    const next=retimeMotion(first.motion,first.durationFrames,60);
    expect(next.scale.at(-1)?.frame).toBe(59);
    expect(evaluateMotion({...first,motion:next},59).scale).toBeGreaterThan(0);
  });
  it('rejeita plano de mídia inexistente e preserva identidade do projeto antigo',()=>{
    const pilot=buildPilotProject({newId:idFactory()});
    const first=pilot.shots[0];
    expect(()=>applyOperations(pilot,[{type:'updateShot',shotId:first.id,changes:{kind:'image',assetId:'00000000-0000-4000-8000-000000000999'}}])).toThrow();
    const old:Project=structuredClone(starterProject);
    const parsed=parseProject(JSON.parse(JSON.stringify(old)) as unknown);
    expect(parsed.id).toBe(old.id);
    expect(parsed.scenes).toEqual(old.scenes);
  });
});
