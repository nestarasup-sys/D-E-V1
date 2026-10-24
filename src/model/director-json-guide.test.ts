import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PRESET_CATALOG,PRESET_CATEGORIES} from './presets';
import {layerBehaviors,layerKinds,layerObjectSchema} from './layers';
import {shotSchema,investigativeStyles} from './shots';
import {directionSchema,compileDirection} from './direction';
import {starterProject,projectSchema} from './project';
import {applyOperations} from './operations';
import {SFX_TYPES} from '../../apps/agent/src/sfx';
import {productionSchema} from './ai-production';
import {SERVICE_PROTOCOL,SERVICE_VERSION} from './service-contract';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const guide=read('docs/GUIA_STUDIO_DARK.md');
const direction=JSON.parse(read('docs/examples/GUIA_DIRECAO_12S.example.json')) as unknown;
const operations=JSON.parse(read('docs/examples/GUIA_OPERACOES.example.json')) as unknown;

describe('Guia Studio Dark v0.18 (manual vivo do produto)',()=>{
  it('mantém o nome fixo, a versão atual e 20 seções históricas válidas',()=>{
    expect(guide).toContain('# Guia Studio Dark — versão '+SERVICE_VERSION);
    expect(guide).toContain('Dark Studio');
    expect(guide).toContain('protocolo '+SERVICE_PROTOCOL);
    expect(guide).not.toContain('GUIA_DIRETOR_POR_JSON.md');
    expect(guide).toContain('## 0. Manual atual v0.18');
    for(let i=1;i<=20;i++)expect(guide).toMatch(new RegExp('^## '+i+'\\. ','m'));
  });
  it('explica o fluxo real de produção IA, áudio acústico, direitos e portabilidade',()=>{
    const example=JSON.parse(read('docs/examples/PRODUCAO_018.example.json')) as unknown;
    expect(productionSchema.parse(example).format).toBe('darkstudio-production');
    for(const token of [
      'darkstudio-production','project.json','direction.json','operacoes.json',
      'plannedFrames','narration','wordCue','cueWord','SpeakProgress','wordAlignment',
      'soundDesign','soundEffects','ducking','sfx','NARRADOR AUTOMÁTICO',
      'Pexels','allowAutomaticSelection','licenseConfirmed','0,77',
      'rights.status','redistributionAllowed','DSFont-','@font-face',
      'OCR','96','24','ZIP64','64 GiB','16 GiB','12.000 mídias',
      'Importar JSON','Exportar MP4','Exportar .darkstudio',
      'src/model/ai-production.ts','src/model/service-contract.ts',
      'scripts/tts-production.ps1','npm run smoke:ai-production',
    ])expect(guide,'ausente no Guia Studio Dark: '+token).toContain(token);
    expect(guide).toContain('## 18. Limites atuais');
    expect(guide).toContain('## 19. Como atualizar');
    expect(guide).toContain('## 20. Prompt avançado');
  });
  it('contém um JSON introdutório v0.18 parseável pelo contrato real',()=>{
    const start=guide.indexOf('### 0.5 Exemplo mínimo completo de produção IA');
    expect(start).toBeGreaterThan(0);
    const sample=guide.slice(start).match(/```json\s*([\s\S]*?)\s*```/);
    expect(sample).not.toBeNull();
    const parsed=productionSchema.parse(JSON.parse(sample![1]) as unknown);
    expect(parsed.beats).toHaveLength(2);
    expect(parsed.beats[0].layers?.some(l=>'wordCue' in l)).toBe(true);
    expect(parsed.beats[0].soundEffects).toHaveLength(1);
  });
  it('lista todos os 50 presets reais, categorias e sete estilos investigativos',()=>{
    expect(PRESET_CATALOG).toHaveLength(50);
    expect(PRESET_CATEGORIES).toHaveLength(6);
    for(const preset of PRESET_CATALOG){
      expect(guide,'preset ausente do guia: '+preset.id).toContain('`'+preset.id+'`');
      expect(guide,'categoria ausente do guia: '+preset.category).toContain(preset.category);
    }
    for(const kind of investigativeStyles)expect(guide).toContain('`'+kind+'`');
    for(const style of shotSchema.shape.style.removeDefault().options)expect(guide).toContain('`'+style+'`');
  });
  it('documenta tipos de camada, movimentos, personagens, objetos, cenários e SFX',()=>{
    expect(layerKinds).toHaveLength(12);
    expect(layerBehaviors).toHaveLength(20);
    for(const kind of layerKinds)expect(guide).toContain('`'+kind+'`');
    for(const behavior of layerBehaviors)expect(guide).toContain('`'+behavior+'`');
    for(const kind of layerObjectSchema.shape.characterType.removeDefault().options)expect(guide).toContain('`'+kind+'`');
    for(const kind of layerObjectSchema.shape.objectType.removeDefault().options)expect(guide).toContain('`'+kind+'`');
    for(const kind of layerObjectSchema.shape.sceneType.removeDefault().options)expect(guide).toContain('`'+kind+'`');
    for(const type of SFX_TYPES)expect(guide).toContain('`'+type+'`');
  });

  it('mantém documentado o tutorial visual do dashboard e do editor',()=>{
    const dashboard=read('src/App.tsx');
    const editor=read('src/Editor.tsx');
    const homeLabels=[
      'Importar JSON','Criar piloto audiovisual 30s','Duplicar','Arquivar',
      'Migrar projeto antigo','Revisar Codex','Versões','Diagnóstico','Produção',
    ];
    const editorLabels=[
      'Desfazer','Refazer','Importar mídia','Exportar JSON','Exportar MP4',
      'Importar SRT','Exportar SRT','Fade in','Fade out','Sem fade',
      'Quadro-chave de volume','Recarregar projeto do disco',
    ];
    for(const label of homeLabels){
      expect(dashboard,'botão ausente no dashboard: '+label).toContain(label);
      expect(guide,'função ausente no tutorial: '+label).toContain('`'+label+'`');
    }
    for(const label of editorLabels){
      expect(editor,'controle ausente no editor: '+label).toContain(label);
      expect(guide,'função ausente no tutorial: '+label).toContain('`'+label+'`');
    }
  });

  it('o guia e exemplo v0.15 cobrem os fundamentos de composição autoral',()=>{
    const motionDoc=read('docs/MOTION_ENGINE_015.md');
    const sample=JSON.parse(read('docs/examples/MOTION_ENGINE_015.direction.example.json')) as unknown;
    for(const feature of ['fontFamily','fontWeight','letterSpacing','strokeWidth',
      'word-reveal','parentKey','cameraPath','transitionIn','vectorPath','gradient']){
      expect(guide,'guia principal sem '+feature).toContain('`'+feature+'`');
      expect(motionDoc,'especificação sem '+feature).toContain('`'+feature+'`');
    }
    const project=projectSchema.parse({...structuredClone(starterProject),
      scenes:[{...starterProject.scenes[0],durationFrames:360}],shots:[]});
    const compiled=compileDirection(project,sample,randomUUID);
    expect(compiled.preview.shots).toHaveLength(2);
    expect(compiled.preview.shots[0].layers[1].parentId)
      .toBe(compiled.preview.shots[0].layers[0].id);
    expect(compiled.preview.scenes).toEqual(project.scenes);
  });

  it('documenta os cinco fundamentos extras do Motion Engine v0.16',()=>{
    const spec=read('docs/MOTION_ENGINE_016.md');
    for(const tag of ['rigKeys','chartStages','cashflow','waterfall','counter',
      'mediaPlan','framing','assets[].rights','raster-qa','.darkstudio']){
      expect(guide,'guia sem '+tag).toContain(tag);
      expect(spec,'especificação sem '+tag).toContain(tag);
    }
    expect(read('src/Editor.tsx')).toContain('Exportar .darkstudio');
    expect(read('src/App.tsx')).toContain('.darkstudio');
  });
  it('compila o exemplo completo de 12 s sem mover voz, legendas, fontes ou cenas',()=>{
    const project=projectSchema.parse({
      ...structuredClone(starterProject),
      scenes:[{...starterProject.scenes[0],durationFrames:360}],
      clips:[],captions:[],assets:[],evidence:[],shots:[],visualMode:'legacy',
    });
    const blueprint=directionSchema.parse(direction);
    expect(blueprint.version).toBe(1);
    expect(blueprint.beats.reduce((s,b)=>s+b.durationFrames,0)).toBe(360);
    const planned=compileDirection(project,direction,randomUUID);
    expect(planned.report.coveragePercent).toBe(100);
    expect(planned.report.readyForEditorialReview).toBe(true);
    expect(planned.preview.shots).toHaveLength(4);
    expect(planned.preview.shots[2].layers).toHaveLength(4);
    expect(planned.preview.scenes).toEqual(project.scenes);
    expect(planned.preview.clips).toEqual(project.clips);
    expect(planned.preview.captions).toEqual(project.captions);
    expect(planned.preview.assets).toEqual(project.assets);
    expect(planned.preview.evidence).toEqual(project.evidence);
    expect(planned.operations.map(o=>o.type)).toEqual(['replaceShots','setVisualMode','updateChannelKit']);
  });
  it('operações didáticas modificam apenas cena e identidade do fixture',()=>{
    const updated=applyOperations(starterProject,operations);
    expect(updated.channelKit.brandName).toBe('CANAL EXEMPLO');
    expect(updated.scenes[0].title).toBe('Uma pergunta sobre o futuro');
    expect(updated.clips).toEqual(starterProject.clips);
    expect(updated.evidence).toEqual(starterProject.evidence);
  });
});
