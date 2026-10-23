import {parseProject, type Project} from '../model/project';

const BASE='http://127.0.0.1:4317';
export interface ProjectSummary {
  id:string; name:string; sceneCount:number; durationFrames:number;
  assetCount:number; modifiedAt:string; revision:string;
}
export interface ProjectRecord {project:Project;revision:string;path:string;modifiedAt:string;}
export class ApiError extends Error {
  constructor(message:string,public readonly status:number){super(message);}
}
async function request(path:string,init?:RequestInit):Promise<unknown>{
  let response:Response;
  try{response=await fetch(BASE+path,init);}
  catch{throw new ApiError('Serviço local indisponível. Abra npm run dev:service no terminal.',0);}
  let data:unknown;
  try{data=await response.json();}catch{throw new ApiError('O serviço retornou uma resposta inválida.',response.status);}
  if(!response.ok){
    const message=typeof data==='object'&&data!==null&&'error'in data?String(data.error):'Erro HTTP '+response.status;
    throw new ApiError(message,response.status);
  }
  return data;
}
function record(data:unknown):ProjectRecord {
  if(typeof data!=='object'||data===null||!('project' in data)||!('revision' in data)||!('path' in data)||!('modifiedAt' in data))
    throw new ApiError('O servidor retornou um projeto incompleto.',500);
  const value=data as Record<string,unknown>;
  if(typeof value.revision!=='string'||typeof value.path!=='string'||typeof value.modifiedAt!=='string')
    throw new ApiError('Metadados inválidos do projeto.',500);
  return {project:parseProject(value.project),revision:value.revision,path:value.path,modifiedAt:value.modifiedAt};
}
const jsonHeaders={'Content-Type':'application/json'};
export async function listProjects():Promise<{projects:ProjectSummary[];directory:string}> {
  const result=await request('/v1/projects');
  if(typeof result!=='object'||result===null||!('projects' in result)||!('directory' in result))throw new Error('Lista inválida.');
  const data=result as {projects:ProjectSummary[],directory:string};
  if(!Array.isArray(data.projects)||typeof data.directory!=='string')throw new Error('Lista inválida.');
  return data;
}
export async function createProject(name:string):Promise<ProjectRecord>{
  return record(await request('/v1/projects',{method:'POST',headers:jsonHeaders,body:JSON.stringify({name})}));
}
export async function importProject(project:Project):Promise<ProjectRecord>{
  return record(await request('/v1/projects/import',{method:'POST',headers:jsonHeaders,body:JSON.stringify({project})}));
}
export async function getProject(id:string):Promise<ProjectRecord>{
  return record(await request('/v1/projects/'+encodeURIComponent(id)));
}
export async function saveProject(project:Project,revision:string):Promise<ProjectRecord>{
  return record(await request('/v1/projects/'+encodeURIComponent(project.id),{
    method:'PUT',headers:{...jsonHeaders,'If-Match':revision},body:JSON.stringify({project}),
  }));
}
export async function duplicateProject(id:string):Promise<ProjectRecord>{
  return record(await request('/v1/projects/'+encodeURIComponent(id)+'/duplicate',{method:'POST'}));
}
export async function archiveProject(id:string):Promise<void>{
  await request('/v1/projects/'+encodeURIComponent(id),{method:'DELETE'});
}

export interface ProjectSnapshot {revision:string;createdAt:string;name:string;scenes:number}
export async function getProjectHistory(id:string):Promise<ProjectSnapshot[]>{
  const result=await request('/v1/projects/'+encodeURIComponent(id)+'/history');
  if(typeof result!=='object'||result===null||!('snapshots' in result)||!Array.isArray(result.snapshots))
    throw new ApiError('Histórico inválido.',500);
  return result.snapshots as ProjectSnapshot[];
}
export async function restoreProject(id:string,revision:string,expectedRevision:string):Promise<ProjectRecord>{
  return record(await request('/v1/projects/'+encodeURIComponent(id)+'/restore',{
    method:'POST',headers:{...jsonHeaders,'If-Match':expectedRevision},body:JSON.stringify({revision}),
  }));
}
