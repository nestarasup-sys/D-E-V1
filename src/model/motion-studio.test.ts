import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {PRESET_CATALOG,PRESET_COUNT,PRESET_CATEGORIES,instantiatePreset,getPreset} from './presets';
import {layerSchema,layerAtCaption,retimeLayer,emptyLayerMotion,validateLayers} from './layers';
import {projectSchema,parseProject,projectDuration,starterProject} from './project';
import {buildPilotProject} from './pilot';
import {compileDirection,makeAutomaticDirection} from './direction';
import {applyOperations} from './operations';
import {retimeShotLayers} from './shots';

describe('motor de 50 composições e cenas originais do Codex',()=>{
  it('entrega exatamente 50 modelos com seis categorias e IDs únicos',()=>{
    expect(PRESET_COUNT).toBe(50);
    expect(new Set(PRESET_CATALOG.map(p=>p.id)).size).toBe(50);
    const totals=PRESET_CATEGORIES.map(c=>PRESET_CATALOG.filter(p=>p.category===c).length);
    expect(totals).toEqual([10,8,10,8,8,6]);
    for(const p of PRESET_CATALOG)expect(getPreset(p.id).recipe).toBeTruthy();
  });
  it('todos os 50 modelos geram camadas reais válidas, com tempo e geometria',()=>{
    for(const preset of PRESET_CATALOG){
      const layers=instantiatePreset(preset.id,{
        title:'O sonho da casa própria',subtitle:'Ilustração editorial, não é prova',
        durationFrames:120,
      },randomUUID);
      expect(layers.length,preset.id).toBeGreaterThanOrEqual(2);
      expect(layers.length,preset.id).toBeLessThanOrEqual(48);
      expect(new Set(layers.map(x=>x.id)).size,preset.id).toBe(layers.length);
      expect(validateLayers(layers,120),preset.id).toEqual([]);
      for(const layer of layers){
        expect(layerSchema.parse(layer)).toEqual(layer);
        expect(layer.startFrame+layer.durationFrames).toBeLessThanOrEqual(120);
      }
      expect(layers.some(l=>l.kind==='text'),preset.id).toBe(true);
    }
  });
  it('o Codex consegue construir uma composição inédita sem escrever código executável',()=>{
    const project=buildPilotProject({newId:randomUUID});
    const layer={
      name:'Personagem de exemplo',kind:'character' as const,x:400,y:270,
      width:390,height:620,characterType:'parent' as const,expression:'curious' as const,
      behavior:'point' as const,
    };
    const planned=compileDirection(project,{version:1,title:'Sequência autoral',
      beats:[
        {startFrame:0,durationFrames:450,purpose:'context',title:'Trabalhando',
          layers:[layer,{name:'Título original',kind:'text',x:100,y:140,
            width:1200,height:180,text:'CADA ESCOLHA TEM UM CUSTO'}]},
        {startFrame:450,durationFrames:450,purpose:'transition',title:'Resultado',
          presetId:'data-budget'},
      ],
    },randomUUID);
    expect(planned.preview.shots).toHaveLength(2);
    expect(planned.preview.shots[0].layers.map(l=>l.kind)).toEqual(['character','text']);
    expect(planned.preview.shots[0].layers[0].durationFrames).toBe(450);
    expect(planned.preview.shots[1].layers.length).toBeGreaterThan(2);
    expect(planned.preview.clips).toEqual(project.clips);
    expect(planned.preview.captions).toEqual(project.captions);
    expect(planned.report.coveragePercent).toBe(100);
  });
  it('direção automática distribui composições distintas, com arte ilustrativa identificada',()=>{
    const project=buildPilotProject({newId:randomUUID});
    const draft=makeAutomaticDirection(project);
    expect(draft.beats.every(beat=>!!beat.presetId)).toBe(true);
    const result=compileDirection(project,draft,randomUUID);
    expect(new Set(result.preview.shots.map(s=>s.presetId)).size).toBeGreaterThan(5);
    expect(result.preview.shots.every(s=>s.layers.length>0)).toBe(true);
    expect(result.preview.shots.flatMap(s=>s.layers).every(l=>l.illustrative)).toBe(true);
    expect(projectDuration(result.preview)).toBe(900);
  });
  it('referência de legenda reposiciona a animação sem alterar o áudio',()=>{
    const cap=randomUUID(),key=randomUUID();
    const layer=layerSchema.parse({
      id:key,name:'Fala com gráfico',kind:'text',x:100,y:180,
      width:800,height:150,durationFrames:60,cueCaptionId:cap,
      cueOffsetFrames:6,
    });
    expect(layerAtCaption(layer,300,[{id:cap,startFrame:345,endFrame:425}])).toBe(51);
    expect(layerAtCaption(layer,300,[])).toBe(0);
    const resized=retimeLayer(layer,90);
    expect(resized.durationFrames).toBe(90);
  });
  it('redimensiona todas as camadas e preserva movimentos dentro do novo plano',()=>{
    const layers=instantiatePreset('person-family',{title:'Família',durationFrames:180},randomUUID);
    layers[0].motion.scale=[{frame:0,value:1,easing:'linear'},
      {frame:179,value:1.1,easing:'linear'}];
    const smaller=retimeShotLayers(layers,180,72);
    expect(validateLayers(smaller,72)).toEqual([]);
    expect(smaller[0].motion.scale.at(-1)!.frame).toBeLessThan(72);
  });
  it('números reais sem fonte são bloqueados e mídias só podem ser locais',()=>{
    expect(()=>layerSchema.parse({id:randomUUID(),name:'Dado sem origem',
      kind:'chart',x:0,y:0,width:500,height:500,durationFrames:100,values:[35]})).toThrow();
    expect(()=>layerSchema.parse({id:randomUUID(),name:'Foto sem mídia',
      kind:'image',x:0,y:0,width:500,height:500,durationFrames:100})).toThrow();
    const project=buildPilotProject({newId:randomUUID});
    expect(()=>compileDirection(project,{version:1,title:'Falso dado',beats:[
      {startFrame:0,durationFrames:900,purpose:'data',title:'Dado',
        presetId:'data-bars',data:{labels:['A'],values:[32],sourceEvidenceId:randomUUID()}},
    ]},randomUUID)).toThrow(/referência/);
  });
  it('mantém JSON v2 anterior intacto no modo antigo e com camadas opcionais',()=>{
    const base=structuredClone(starterProject) as Record<string,unknown>;
    expect(parseProject(base).visualMode).toBe('legacy');
    const pilot=buildPilotProject({newId:randomUUID});
    const old=structuredClone(pilot);
    for(const shot of old.shots){
      delete (shot as unknown as Record<string,unknown>).layers;
      delete (shot as unknown as Record<string,unknown>).presetId;
    }
    const parsed=projectSchema.parse(old);
    expect(parsed.shots.every(s=>s.layers.length===0)).toBe(true);
    const next=applyOperations(parsed,[{type:'updateShot',shotId:parsed.shots[0].id,
      changes:{presetId:'person-worker',layers:instantiatePreset('person-worker',
        {title:'Novo visual',durationFrames:parsed.shots[0].durationFrames},randomUUID)}}]);
    expect(next.shots[0].layers.length).toBeGreaterThan(1);
    expect(next.scenes).toEqual(parsed.scenes);
  });
  it('rejeita keyframes fora da duração e identificadores duplicados',()=>{
    const first=layerSchema.parse({id:randomUUID(),name:'Teste',kind:'text',
      x:100,y:50,width:330,height:130,durationFrames:45,motion:emptyLayerMotion()});
    const bad={...first,motion:{...first.motion,x:[{frame:45,value:4,easing:'linear' as const}]}};
    expect(validateLayers([bad],45).length).toBeGreaterThan(0);
    expect(validateLayers([first,first],45).length).toBeGreaterThan(0);
  });
});
