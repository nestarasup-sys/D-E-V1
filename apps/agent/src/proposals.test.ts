import {describe,it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectRepository} from './project-store';
import {ProposalRepository} from './proposals';

async function fixture(run:(repo:ProjectRepository,p:ProposalRepository)=>Promise<void>){
  const root=await mkdtemp(join(tmpdir(),'dark-proposals-'));
  try{const repo=new ProjectRepository(root);await run(repo,new ProposalRepository(repo));}
  finally{await rm(root,{force:true,recursive:true});}
}
describe('propostas do Codex para aprovação humana',()=>{
  it('cria proposta sem editar e permite aprovação',()=>fixture(async(repo,p)=>{
    const initial=await repo.create('Antes');
    const operations=[{type:'updateScene',sceneId:initial.project.scenes[0].id,changes:{title:'Novo roteiro'}}];
    const proposed=await p.create(initial.project.id,operations,initial.revision);
    expect((await repo.read(initial.project.id)).project.scenes[0].title).not.toBe('Novo roteiro');
    expect(proposed.preview?.changedScenes).toHaveLength(1);
    expect(proposed.preview?.changedScenes[0].changedFields).toContain('title');
    expect(await p.list(initial.project.id)).toHaveLength(1);
    expect(await p.count(initial.project.id)).toBe(1);
    const applied=await p.accept(initial.project.id,proposed.id);
    expect(applied.project.scenes[0].title).toBe('Novo roteiro');
    expect(await p.list(initial.project.id)).toHaveLength(0);
    expect(await p.count(initial.project.id)).toBe(0);
    expect((await repo.history(initial.project.id)).length).toBeGreaterThan(0);
  }));
  it('não sobrescreve mudanças manuais feitas depois da proposta',()=>fixture(async(repo,p)=>{
    const initial=await repo.create('Antes');
    const ops=[{type:'updateScene',sceneId:initial.project.scenes[0].id,changes:{title:'IA'}}];
    const proposal=await p.create(initial.project.id,ops,initial.revision);
    await repo.save(initial.project.id,{...initial.project,name:'Edição manual'},initial.revision);
    await expect(p.accept(initial.project.id,proposal.id)).rejects.toMatchObject({status:409});
    expect((await repo.read(initial.project.id)).project.name).toBe('Edição manual');
    await p.reject(initial.project.id,proposal.id);
  }));
  it('rejeita operações inválidas sem criar proposta',()=>fixture(async(repo,p)=>{
    const initial=await repo.create('Antes');
    await expect(p.create(initial.project.id,[{type:'removeScene',sceneId:initial.project.scenes[0].id}],initial.revision)).rejects.toThrow();
    expect(await p.list(initial.project.id)).toHaveLength(0);
  }));
});
