import {describe,it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProjectRepository} from './project-store';
import {projectDigest,syncProjects,type PrivateRemote,type SyncState} from './sync-core';
import type {Project} from '../../../src/model/project';

class FakeRemote implements PrivateRemote {
  private data=new Map<string,{project:Project;sha:string}>();
  public publicRepo=false;
  private counter=0;
  async verifyPrivate(){if(this.publicRepo)throw new Error('Repositório deve ser privado');}
  async list(){return [...this.data].map(([id,v])=>({id,sha:v.sha}));}
  async read(id:string){
    const record=this.data.get(id);
    if(!record)throw new Error('missing');
    return structuredClone(record);
  }
  async write(project:Project,expectedSha:string|null){
    const old=this.data.get(project.id);
    if((old?.sha??null)!==expectedSha)throw new Error('HTTP 409: conflito remoto');
    const sha='sha-'+(++this.counter);
    this.data.set(project.id,{project:structuredClone(project),sha});
    return sha;
  }
  async externallyEdit(id:string,title:string){
    const original=await this.read(id);
    await this.write({...original.project,name:title},original.sha);
  }
}
async function setup(run:(local:ProjectRepository,remote:FakeRemote,state:SyncState,sync:()=>Promise<Awaited<ReturnType<typeof syncProjects>>>)=>Promise<void>){
  const root=await mkdtemp(join(tmpdir(),'dark-studio-sync-'));
  const local=new ProjectRepository(root),remote=new FakeRemote();
  const state:SyncState={repository:'owner/private',entries:{}};
  const sync=()=>syncProjects(local,remote,state,async()=>{});
  try{await run(local,remote,state,sync);}finally{await rm(root,{recursive:true,force:true});}
}
describe('sincronização privada',()=>{

  it('não envia nenhum projeto local quando lista de consentimento está vazia',()=>setup(async(local,remote,state)=>{
    const p=await local.create('Sigiloso');
    const result=await syncProjects(local,remote,state,async()=>{},new Set());
    expect(result.uploaded).toBe(0);
    await expect(remote.read(p.project.id)).rejects.toThrow('missing');
  }));
  it('envia somente projeto explicitamente autorizado',()=>setup(async(local,remote,state)=>{
    const publicavel=await local.create('Autorizado');
    const reservado=await local.create('Não autorizado');
    const result=await syncProjects(local,remote,state,async()=>{},new Set([publicavel.project.id]));
    expect(result.uploaded).toBe(1);
    expect((await remote.read(publicavel.project.id)).project.name).toBe('Autorizado');
    await expect(remote.read(reservado.project.id)).rejects.toThrow('missing');
  }));

  it('publica projetos locais em branco e registra base',()=>setup(async(local,remote,state,sync)=>{
    const p=await local.create('Abertura');
    const result=await sync();
    expect(result.uploaded).toBe(1);
    expect((await remote.read(p.project.id)).project.name).toBe('Abertura');
    expect(state.entries[p.project.id]?.hash).toBe(projectDigest(p.project));
  }));
  it('puxa alterações feitas pelo Codex na nuvem',()=>setup(async(local,remote,state,sync)=>{
    const p=await local.create('Antes');await sync();
    await remote.externallyEdit(p.project.id,'Depois do Codex');
    const result=await sync();
    expect(result.downloaded).toBe(1);
    expect((await local.read(p.project.id)).project.name).toBe('Depois do Codex');
    expect(result.conflicts).toHaveLength(0);
  }));
  it('envia edições manuais depois de sincronizadas',()=>setup(async(local,remote,_state,sync)=>{
    const p=await local.create('Antes');await sync();
    await local.save(p.project.id,{...p.project,name:'Editado no editor'},p.revision);
    const result=await sync();
    expect(result.uploaded).toBe(1);
    expect((await remote.read(p.project.id)).project.name).toBe('Editado no editor');
  }));
  it('não sobrescreve alterações simultâneas',()=>setup(async(local,remote,_state,sync)=>{
    const p=await local.create('Antes');await sync();
    await remote.externallyEdit(p.project.id,'Codex remoto');
    await local.save(p.project.id,{...p.project,name:'Editor local'},p.revision);
    const result=await sync();
    expect(result.conflicts).toHaveLength(1);
    expect((await remote.read(p.project.id)).project.name).toBe('Codex remoto');
    expect((await local.read(p.project.id)).project.name).toBe('Editor local');
  }));
  it('baixa projetos criados no remoto',()=>setup(async(local,remote,_state,sync)=>{
    const sample=await local.create('Novo no ChatGPT');
    const data=sample.project;
    await local.archive(data.id);
    await remote.write(data,null);
    const result=await sync();
    expect(result.downloaded).toBe(1);
    expect((await local.read(data.id)).project.name).toBe('Novo no ChatGPT');
  }));
  it('recusa repositório público antes de transferir',()=>setup(async(local,remote,_state,sync)=>{
    const p=await local.create('Não divulgar');
    remote.publicRepo=true;
    await expect(sync()).rejects.toThrow('privado');
    await expect(remote.read(p.project.id)).rejects.toThrow('missing');
  }));
  it('recusa apagar implicitamente projetos',()=>setup(async(local,remote,_state,sync)=>{
    const p=await local.create('Preservar');await sync();
    await local.archive(p.project.id);
    const result=await sync();
    expect(result.conflicts).toHaveLength(1);
    expect((await remote.read(p.project.id)).project.name).toBe('Preservar');
  }));
});
