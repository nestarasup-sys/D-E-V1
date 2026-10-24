import {describe,expect,it} from 'vitest';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectError,ProjectRepository} from './project-store';
import {applyOperations} from '../../../src/model/operations';

async function withRepo(run: (repo: ProjectRepository)=>Promise<void>) {
  const root=await mkdtemp(join(tmpdir(),'dark-studio-projects-'));
  try {await run(new ProjectRepository(root));}
  finally {await rm(root,{recursive:true,force:true});}
}
describe('Projetos locais para Codex externo',()=>{
  it('mantém snapshots imutáveis antes de salvar e recupera com revisão',async()=>withRepo(async repo=>{
    const initial=await repo.create('Original');
    const changed=await repo.save(initial.project.id,{...initial.project,name:'Segunda versão'},initial.revision);
    const snapshots=await repo.history(initial.project.id);
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0].revision).toBe(initial.revision);
    const restored=await repo.restore(initial.project.id,initial.revision,changed.revision);
    expect(restored.project.name).toBe('Original');
    const after=await repo.history(initial.project.id);
    expect(after.some(item=>item.revision===changed.revision)).toBe(true);
    await expect(repo.restore(initial.project.id,initial.revision,changed.revision))
      .rejects.toMatchObject({status:409});
  }));
  it('bloqueia restauração de versão que não existe',async()=>withRepo(async repo=>{
    const a=await repo.create('Controle');
    await expect(repo.restore(a.project.id,'a'.repeat(64),a.revision)).rejects.toMatchObject({status:400});
  }));

  it('aplica edição local, cria backup e mantém o mesmo projeto',async()=>withRepo(async repo=>{
    const original=await repo.create('Documentário original');
    const sceneId=original.project.scenes[0].id;
    const next=applyOperations(original.project,[
      {type:'updateScene',sceneId,changes:{title:'EDIÇÃO PELO CODEX LOCAL'}},
    ]);
    const saved=await repo.save(original.project.id,next,original.revision);
    expect(saved.project.id).toBe(original.project.id);
    expect(saved.project.scenes[0].title).toBe('EDIÇÃO PELO CODEX LOCAL');
    const previous=JSON.parse(await readFile(join(repo.root,original.project.id,'project.previous.json'),'utf8')) as {scenes:{title:string}[]};
    expect(previous.scenes[0].title).not.toBe('EDIÇÃO PELO CODEX LOCAL');
    await expect(repo.save(original.project.id,next,original.revision))
      .rejects.toMatchObject({status:409});
  }));

  it('cria, lista e lê projeto sem misturar com outro',async()=>withRepo(async repo=>{
    const a=await repo.create('Caso investigativo A');
    const b=await repo.create('Caso investigativo B');
    const listing=await repo.list();
    expect(listing.map(p=>p.name)).toEqual(expect.arrayContaining(['Caso investigativo A','Caso investigativo B']));
    expect(a.project.id).not.toBe(b.project.id);
    expect((await repo.read(a.project.id)).project.name).toBe('Caso investigativo A');
  }));
  it('salva somente com revisão atual e rejeita gravação obsoleta',async()=>withRepo(async repo=>{
    const a=await repo.create('Teste');
    const b=await repo.save(a.project.id,{...a.project,name:'Editado'},a.revision);
    expect(b.project.name).toBe('Editado');
    expect(b.revision).not.toBe(a.revision);
    await expect(repo.save(a.project.id,{...a.project,name:'Sobrescrito'},a.revision))
      .rejects.toMatchObject({status:409});
  }));
  it('detecta edição externa no arquivo JSON',async()=>withRepo(async repo=>{
    const a=await repo.create('Original');
    const file=a.path;
    await writeFile(file,JSON.stringify({...a.project,name:'Alterado pelo Codex'})+'\n','utf8');
    const b=await repo.read(a.project.id);
    expect(b.project.name).toBe('Alterado pelo Codex');
    expect(b.revision).not.toBe(a.revision);
  }));
  it('rejeita JSON inválido escrito por agente externo',async()=>withRepo(async repo=>{
    const a=await repo.create('Teste');
    await writeFile(a.path,'{"version": 2, "id":','utf8');
    await expect(repo.read(a.project.id)).rejects.toMatchObject({status:422});
    expect(await repo.list()).toEqual([]);
    expect(await repo.inspectInvalid()).toEqual([expect.objectContaining({id:a.project.id})]);
  }));
  it('duplica e arquiva sem apagar mídia',async()=>withRepo(async repo=>{
    const a=await repo.create('Caso');
    const b=await repo.duplicate(a.project.id);
    expect(b.project.id).not.toBe(a.project.id);
    await repo.archive(a.project.id);
    expect((await repo.list()).map(p=>p.id)).toEqual([b.project.id]);
    await expect(repo.read(a.project.id)).rejects.toMatchObject({status:404});
    expect((await readFile(b.path,'utf8')).includes('cópia')).toBe(true);
  }));
  it('bloqueia traversal de diretórios',async()=>withRepo(async repo=>{
    await expect(repo.read('../README.md')).rejects.toBeInstanceOf(ProjectError);
  }));
});
