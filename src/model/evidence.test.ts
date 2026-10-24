import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {starterProject,parseProject} from './project';
import {applyOperations} from './operations';

function claim(sceneId:string){
  return {
    id:randomUUID(),sceneId,claim:'Afirmação a conferir',
    sourceTitle:'Documento original',sourceUrl:'https://example.org/documento',
    notes:'Revisão pendente',reviewStatus:'pending' as const,
  };
}
describe('registro editorial de fontes',()=>{
  it('adiciona, documenta, verifica e remove evidência por operações',()=>{
    const sceneId=starterProject.scenes[0].id;
    const evidence=claim(sceneId);
    const added=applyOperations(starterProject,[{type:'addEvidence',evidence}]);
    expect(added.evidence[0].reviewStatus).toBe('pending');
    expect(added.evidence[0].publicationDate).toBeUndefined();
    expect(added.evidence[0].sourceExcerpt).toBeUndefined();
    const documented=applyOperations(added,[{type:'updateEvidence',evidenceId:evidence.id,changes:{
      sourceExcerpt:'Tabela publicada no boletim',
      publicationDate:'2026-10-20',
      accessedAt:'2026-10-23',
      region:'Brasil',
      unit:'BRL',
      rights:'Conteúdo público com atribuição',
    }}]);
    expect(documented.evidence[0].publicationDate).toBe('2026-10-20');
    expect(documented.evidence[0].reviewStatus).toBe('pending');
    const checked=applyOperations(documented,[{type:'updateEvidence',evidenceId:evidence.id,changes:{reviewStatus:'verified'}}]);
    expect(checked.evidence[0].reviewStatus).toBe('verified');
    const removed=applyOperations(checked,[{type:'removeEvidence',evidenceId:evidence.id}]);
    expect(removed.evidence).toHaveLength(0);
  });
  it('mantém fontes antigas compatíveis sem novos metadados',()=>{
    const evidence=claim(starterProject.scenes[0].id);
    const parsed=parseProject({...structuredClone(starterProject),evidence:[evidence]});
    expect(parsed.evidence[0].reviewStatus).toBe('pending');
    expect(parsed.evidence[0].rights).toBeUndefined();
  });
  it('não verifica automaticamente nem aceita vínculo ou URL inválida',()=>{
    const evidence=claim('scene-fantasma');
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence}])).toThrow();
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence:{
      ...evidence,sceneId:starterProject.scenes[0].id,sourceUrl:'http://inseguro.invalid',
    }}])).toThrow();
  });
  it('preserva fontes desvinculadas quando a cena é removida',()=>{
    const evidence=claim('scene-2');
    const added=applyOperations(starterProject,[{type:'addEvidence',evidence}]);
    const next=applyOperations(added,[{type:'removeScene',sceneId:'scene-2'}]);
    expect(next.evidence[0].sceneId).toBeUndefined();
    expect(next.evidence[0].claim).toBe(evidence.claim);
  });
});
