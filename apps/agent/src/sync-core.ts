import {createHash} from 'node:crypto';
import {ProjectError, type ProjectRepository} from './project-store';
import {projectSchema, type Project} from '../../../src/model/project';

const digest = (project: Project) =>
  createHash('sha256').update(JSON.stringify(projectSchema.parse(project))).digest('hex');
export const projectDigest = digest;

export interface RemoteEntry {id:string;sha:string}
export interface RemoteProject {project:Project;sha:string}
export interface PrivateRemote {
  verifyPrivate():Promise<void>;
  list():Promise<RemoteEntry[]>;
  read(id:string):Promise<RemoteProject>;
  write(project:Project,sha:string|null):Promise<string>;
}
export interface SyncEntry {hash:string;sha:string}
export interface SyncState {repository:string;entries:Record<string,SyncEntry>}
export interface SyncConflict {id:string;name:string;reason:string}
export interface SyncResult {uploaded:number;downloaded:number;unchanged:number;downloadedIds:string[];conflicts:SyncConflict[]}
export type StateWriter=(state:SyncState)=>Promise<void>;

export async function syncProjects(
  local:ProjectRepository,
  remote:PrivateRemote,
  state:SyncState,
  saveState:StateWriter,
  selectedLocalIds: ReadonlySet<string> | null = null,
):Promise<SyncResult> {
  await remote.verifyPrivate();
  const listed=await remote.list();
  const remoteById=new Map(listed.map(item=>[item.id,item.sha]));
  const localList=await local.list();
  const localById=new Map(localList.map(item=>[item.id,item]));
  const ids=[...new Set([...localById.keys(),...remoteById.keys()])].sort();
  const result:SyncResult={uploaded:0,downloaded:0,unchanged:0,downloadedIds:[],conflicts:[]};

  const mark=async(id:string,project:Project,sha:string)=>{
    state.entries[id]={hash:digest(project),sha};
    await saveState(state);
  };
  const conflict=(id:string,name:string,reason:string)=>{
    result.conflicts.push({id,name,reason});
  };
  for(const id of ids) {
    const summary=localById.get(id);
    // Opt-in por projeto: conectar o repositório não publica toda a biblioteca local.
    if(summary && selectedLocalIds && !selectedLocalIds.has(id))continue;
    let localRecord:Awaited<ReturnType<ProjectRepository['read']>>|null=null;
    let remoteRecord:RemoteProject|null=null;
    try{
      localRecord=summary?await local.read(id):null;
      remoteRecord=remoteById.has(id)?await remote.read(id):null;
    }catch(e){
      conflict(id,summary?.name||id,'Não foi possível validar o projeto remoto/local: '+(e instanceof Error?e.message:String(e)));
      continue;
    }
    const base=state.entries[id]?.hash;
    const localHash=localRecord?digest(localRecord.project):null;
    const remoteHash=remoteRecord?digest(remoteRecord.project):null;
    const name=localRecord?.project.name??remoteRecord?.project.name??id;

    try {
      if (localRecord && !remoteRecord && !base) {
        const sha=await remote.write(localRecord.project,null);
        await mark(id,localRecord.project,sha);
        result.uploaded++;
      } else if (!localRecord && remoteRecord && !base) {
        await local.adopt(remoteRecord.project);
        await mark(id,remoteRecord.project,remoteRecord.sha);
        result.downloaded++;
        result.downloadedIds.push(id);
      } else if (localRecord && remoteRecord && localHash===remoteHash) {
        await mark(id,localRecord.project,remoteRecord.sha);
        result.unchanged++;
      } else if (localRecord && remoteRecord && base && localHash===base && remoteHash!==base) {
        await local.save(id,remoteRecord.project,localRecord.revision);
        await mark(id,remoteRecord.project,remoteRecord.sha);
        result.downloaded++;
      } else if (localRecord && remoteRecord && base && remoteHash===base && localHash!==base) {
        const sha=await remote.write(localRecord.project,remoteRecord.sha);
        await mark(id,localRecord.project,sha);
        result.uploaded++;
      } else {
        conflict(id,name,!localRecord?'Projeto removido/arquivado localmente: publicação remota preservada.':
          !remoteRecord?'Projeto removido remotamente: cópia local preservada.':
          !base?'Há duas versões iniciais diferentes. Resolva antes de habilitar a sincronização deste projeto.':
          'Alterações simultâneas no Windows e no Codex. Nenhuma versão foi sobrescrita.');
      }
    }catch(e){
      if(e instanceof ProjectError && e.status===409){
        conflict(id,name,'Projeto mudou durante a sincronização. Nenhuma versão foi sobrescrita.');
      }else{
        conflict(id,name,'Falha nesta transferência (nada sobrescrito automaticamente): '+(e instanceof Error?e.message:String(e)));
      }
    }
  }
  return result;
}
