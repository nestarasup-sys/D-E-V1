import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {starterProject,parseProject} from './project';
import {applyOperations} from './operations';

function claim(sceneId:string){
  return {id:randomUUID(),sceneId,claim:'Afirmação a conferir',sourceTitle:'Documento original',
    sourceUrl:'https://example.org/documento',notes:'Revisão pendente',reviewStatus:'pending' as const};
}
describe('registro editorial de fontes',()=>{
  it('adiciona, verifica e remove uma evidência por operações',()=>{
    const sceneId=starterProject.scenes[0].id;
    const evidence=claim(sceneId);
    const added=applyOperations(starterProject,[{type:'addEvidence',evidence}]);
    expect(added.evidence[0].reviewStatus).toBe('pending');
    expect(added.evidence[0].publicationDate).toBeUndefined();
    expect(added.evidence[0].sourceExcerpt).toBeUndefined();
    const checked=applyOperations(added,[{type:'updateEvidence',evidenceId:evidence.id,changes:{reviewStatus:'verified'}}]);
    expect(checked.evidence[0].reviewStatus).toBe('verified');
    const documented=applyOperations(checked,[{type:'updateEvidence',evidenceId:evidence.id,changes:{
      sourceExcerpt:'Tabela publicada no boletim',publicationDate:'2026-10-20',
      accessedAt:'2026-10-23',region:'Brasil',unit:'R
    const removed=applyOperations(checked,[{type:'removeEvidence',evidenceId:evidence.id}]);
    expect(removed.evidence).toHaveLength(0);
  });
  it('mantém fontes antigas sem novos metadados compatíveis',()=>{
    const evidence=claim(starterProject.scenes[0].id);
    const previous=structuredClone(starterProject);
    const parsed=parseProject({...previous,evidence:[evidence]});
    expect(parsed.evidence[0].reviewStatus).toBe('pending');
    expect(parsed.evidence[0].rights).toBeUndefined();
  });
  it('não marca fonte verificada automaticamente e impede vínculos inválidos',()=>{
    const evidence=claim('scene-fantasma');
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence}])).toThrow();
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence:{...evidence,sceneId:starterProject.scenes[0].id,sourceUrl:'http://inseguro.invalid'}}])).toThrow();
  });
  it('preserva a fonte como desvinculada ao remover sua cena',()=>{
    const evidence=claim('scene-2');
    const added=applyOperations(starterProject,[{type:'addEvidence',evidence}]);
    const next=applyOperations(added,[{type:'removeScene',sceneId:'scene-2'}]);
    expect(next.evidence[0].sceneId).toBeUndefined();
    expect(next.evidence[0].claim).toBe(evidence.claim);
  });
});
,
      rights:'Conteúdo público com atribuição',
    }}]);
    expect(documented.evidence[0].publicationDate).toBe('2026-10-20');
    const removed=applyOperations(checked,[{type:'removeEvidence',evidenceId:evidence.id}]);
    expect(removed.evidence).toHaveLength(0);
  });
  it('não marca fonte verificada automaticamente e impede vínculos inválidos',()=>{
    const evidence=claim('scene-fantasma');
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence}])).toThrow();
    expect(()=>applyOperations(starterProject,[{type:'addEvidence',evidence:{...evidence,sceneId:starterProject.scenes[0].id,sourceUrl:'http://inseguro.invalid'}}])).toThrow();
  });
  it('preserva a fonte como desvinculada ao remover sua cena',()=>{
    const evidence=claim('scene-2');
    const added=applyOperations(starterProject,[{type:'addEvidence',evidence}]);
    const next=applyOperations(added,[{type:'removeScene',sceneId:'scene-2'}]);
    expect(next.evidence[0].sceneId).toBeUndefined();
    expect(next.evidence[0].claim).toBe(evidence.claim);
  });
});
