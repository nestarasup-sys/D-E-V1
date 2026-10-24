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

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const guide=read('docs/GUIA_DIRETOR_POR_JSON.md');
const direction=JSON.parse(read('docs/examples/GUIA_DIRECAO_12S.example.json')) as unknown;
const operations=JSON.parse(read('docs/examples/GUIA_OPERACOES.example.json')) as unknown;

describe('Guia Diretor por JSON v0.14 (documentação viva)',()=>{
  it('possui 20 seções e metadados de versão do contrato',()=>{
    expect(guide).toContain('Dark Studio');
    expect(guide).toContain('v0.14');
    expect(guide).toContain('protocolo 6');
    for(let i=1;i<=20;i++)expect(guide).toMatch(new RegExp('^## '+i+'\\. ','m'));
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
    expect(layerKinds).toHaveLength(10);
    expect(layerBehaviors).toHaveLength(19);
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
