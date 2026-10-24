import {mkdir,readFile,readdir,rename,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DATA_ROOT} from './media';

export const JOB_DIR=join(DATA_ROOT,'jobs');
export type JobPhase='queued'|'bundling'|'rendering'|'completed'|'failed'|'interrupted';
export interface JobStatus {
  id:string;
  state:JobPhase;
  progress:number;
  projectId?:string;
  pid?:number;
  createdAt?:string;
  updatedAt?:string;
  outputPath?:string;
  error?:string;
}
const UUID=/^[0-9a-f-]{36}$/;
const pendingStates:JobPhase[]=['queued','bundling','rendering'];
export function isPending(status:JobStatus):boolean{return pendingStates.includes(status.state);}
function pathFor(id:string):string{
  if(!UUID.test(id))throw new Error('ID do render inválido');
  return join(JOB_DIR,id+'.status.json');
}
export async function readJob(id:string):Promise<JobStatus>{
  const data=JSON.parse(await readFile(pathFor(id),'utf8')) as JobStatus;
  if(data.id!==id||!Number.isFinite(data.progress))throw new Error('Status do render inválido.');
  return data;
}
/** Atomic updates prevent a partial JSON status file from appearing during polling. */
export async function writeJob(job:JobStatus):Promise<void>{
  await mkdir(JOB_DIR,{recursive:true});
  const tmp=join(JOB_DIR,'.'+randomUUID()+'.tmp');
  try{
    await writeFile(tmp,JSON.stringify({...job,updatedAt:new Date().toISOString()}),'utf8');
    await rename(tmp,pathFor(job.id));
  }finally{await rm(tmp,{force:true}).catch(()=>{});}
}
export function processIsAlive(pid:unknown):boolean{
  if(typeof pid!=='number'||!Number.isSafeInteger(pid)||pid<1)return false;
  try{process.kill(pid,0);return true;}
  catch(e){return (e as NodeJS.ErrnoException).code==='EPERM';}
}
export async function recoverJob(job:JobStatus):Promise<JobStatus>{
  if(!isPending(job)||processIsAlive(job.pid))return job;
  const stopped:JobStatus={...job,state:'interrupted',error:
    'Render anterior interrompido; o estado foi preservado. Refaça apenas a exportação quando estiver pronto.'};
  await writeJob(stopped);
  return stopped;
}
export async function listJobs(projectId?:string):Promise<JobStatus[]>{
  let files:string[];
  try{files=(await readdir(JOB_DIR)).filter(name=>UUID.test(name.slice(0,-12))&&name.endsWith('.status.json'));}
  catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  const result=await Promise.all(files.slice(-300).map(async name=>{
    const id=name.slice(0,-12);
    try{return await recoverJob(await readJob(id));}
    catch{return null;}
  }));
  return result.filter((job):job is JobStatus=>Boolean(job)&&(!projectId||job?.projectId===projectId))
    .sort((a,b)=>(b.createdAt??b.updatedAt??'').localeCompare(a.createdAt??a.updatedAt??''));
}
