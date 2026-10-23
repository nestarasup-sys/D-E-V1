import {describe, expect, it} from 'vitest';
import {applyOperations} from './operations';
import {starterProject, type Project} from './project';
import {
  storyboardAppendOperations,
  batchUpdateOperations,
  storyboardProposalSchema,
  batchProposalSchema,
} from './director';

const storyboard = {
  summary: 'Capítulo de teste com evidências pendentes.',
  scenes: [
    {kind:'title' as const,title:'ABERTURA',subtitle:'Contexto',kicker:'ATO 1',
      durationFrames:120,accentColor:'#f1bd67',backgroundColor:'#0a111e',
      visualDirection:'Zoom em um documento ilustrativo.',evidenceNeeded:'Confirmar origem do documento.'},
    {kind:'quote' as const,title:'DOCUMENTO',subtitle:'Trecho a confirmar',kicker:'ATO 2',
      durationFrames:90,accentColor:'#ffffff',backgroundColor:'#111111',
      visualDirection:'Destacar palavras do texto.',evidenceNeeded:'Conferir texto original.'},
  ],
};

function copy(): Project { return structuredClone(starterProject); }
function proposedChange() {
  const scene = starterProject.scenes[0];
  return {
    kind: scene.kind, title: 'TÍTULO REVISADO', subtitle: scene.subtitle,
    kicker: scene.kicker, durationFrames: scene.durationFrames,
    accentColor: scene.accentColor, backgroundColor: scene.backgroundColor,
  };
}

describe('Diretor de IA — operações não destrutivas', () => {
  it('acrescenta cenas no final na ordem do storyboard', () => {
    let number = 0;
    const project = copy();
    const ops = storyboardAppendOperations(project, storyboard, [1,0], ()=>String(++number));
    const next = applyOperations(project,ops);
    expect(next.scenes.slice(-2).map(s=>s.title)).toEqual(['ABERTURA','DOCUMENTO']);
    expect(next.scenes.slice(0,3)).toEqual(project.scenes);
    expect(next.scenes[3].productionNotes).toContain('Confirmar origem');
  });
  it('não altera clipes já presentes ao anexar cenas', () => {
    const project = copy();
    const assetId = 'de95201a-6d63-438e-94e5-b862bc77f61e';
    project.assets.push({id:assetId,name:'voz.mp3',kind:'audio',mime:'audio/mpeg',
      url:'http://127.0.0.1:4317/media/'+assetId,durationFrames:200});
    project.clips.push({id:'737383e1-c605-49db-b9aa-3e312a390b61',assetId,
      lane:'narration',startFrame:0,durationFrames:90,trimStartFrames:0,volume:1});
    const next = applyOperations(project, storyboardAppendOperations(project, storyboard, [0], ()=>'fresh'));
    expect(next.clips).toEqual(project.clips);
  });
  it('rejeita índices inventados e seleção vazia', () => {
    expect(()=>storyboardAppendOperations(copy(),storyboard,[99],()=> 'id')).toThrow();
    expect(()=>storyboardAppendOperations(copy(),storyboard,[],()=> 'id')).toThrow();
  });
  it('valida a quantidade e a cor dos beats', () => {
    expect(storyboardProposalSchema.safeParse({...storyboard,scenes:[]}).success).toBe(false);
    expect(storyboardProposalSchema.safeParse({...storyboard,scenes:[{...storyboard.scenes[0],accentColor:'red'}]}).success).toBe(false);
  });
  it('aplica somente cenas autorizadas de forma atômica', () => {
    const project = copy();
    const proposal = {summary:'Revisão',updates:[
      {sceneId:project.scenes[0].id,reason:'Melhor clareza',changes:proposedChange()},
    ]};
    const next = applyOperations(project,batchUpdateOperations(project,proposal,[project.scenes[0].id]));
    expect(next.scenes[0].title).toBe('TÍTULO REVISADO');
    expect(next.scenes.slice(1)).toEqual(project.scenes.slice(1));
  });
  it('rejeita edição de cena inexistente e duplicada', () => {
    const project = copy();
    const first = {sceneId:project.scenes[0].id,reason:'Teste',changes:proposedChange()};
    const proposal = {summary:'Teste',updates:[first]};
    expect(()=>batchUpdateOperations(project,proposal,['scene-fantasma'])).toThrow();
    expect(batchProposalSchema.safeParse({...proposal,updates:[first,first]}).success).toBe(false);
  });
});
