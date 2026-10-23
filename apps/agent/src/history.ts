import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,stat,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {parseProject} from '../../../src/model/project';

const SHA=/^[0-9a-f]{64}$/;
const MAX_SNAPSHOTS=30;

export interface Snapshot {revision:string;createdAt:string;name:string;scenes:number}
export function hashProjectFile(raw:string):string {
  return createHash('sha256').update(raw).digest('hex');
}
export async function snapshotBeforeSave(directory:string,raw:string):Promise<void>{
  const revision=hashProjectFile(raw);
  const folder=join(directory,'history');
  await mkdir(folder,{recursive:true});
  const dest=join(folder,revision+'.json');
  try{await writeFile(dest,raw,{encoding:'utf8',flag:'wx'});}
  catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
  const entries=await listHistory(directory);
  await Promise.all(entries.slice(MAX_SNAPSHOTS).map(item=>unlink(join(folder,item.revision+'.json')).catch(()=>{})));
}
export async function listHistory(directory:string):Promise<Snapshot[]>{
  const folder=join(directory,'history');
  let names:string[];
  try{names=(await readdir(folder)).filter(name=>SHA.test(name.slice(0,-5))&&name.endsWith('.json'));}
  catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  const result:Snapshot[]=[];
  for(const name of names){
    try{
      const file=join(folder,name);
      const raw=await readFile(file,'utf8');
      const revision=name.slice(0,-5);
      if(hashProjectFile(raw)!==revision)continue;
      const project=parseProject(JSON.parse(raw));
      const stats=await stat(file);
      result.push({revision,createdAt:stats.mtime.toISOString(),name:project.name,scenes:project.scenes.length});
    }catch{/* Snapshot danificado não será oferecido para restauração. */}
  }
  return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function readSnapshot(directory:string,revision:string):Promise<unknown>{
  if(!SHA.test(revision))throw new Error('Revisão de histórico inválida.');
  const raw=await readFile(join(directory,'history',revision+'.json'),'utf8');
  if(hashProjectFile(raw)!==revision)throw new Error('Histórico corrompido; restauração bloqueada.');
  return parseProject(JSON.parse(raw));
}
