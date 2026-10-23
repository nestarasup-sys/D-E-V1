import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {DATA_ROOT} from './media';
import {json,readJson} from './http';
import {projectSchema} from '../../../src/model/project';

const JOB_DIR=join(DATA_ROOT,'jobs');
const active=new Set<string>();
export type JobStatus={id:string,state:'queued'|'bundling'|'rendering'|'completed'|'failed',progress:number,outputPath?:string,error?:string};
export async function handleExport(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(req.method==='POST'&&url.pathname==='/v1/export'){
    if(active.size){json(res,429,{error:'Já existe uma exportação em andamento'});return true;}
    try{
      const project=projectSchema.parse(await readJson(req,2_000_000));
      // O renderizador não recebe URLs arbitrárias fornecidas pelo projeto.
      if(project.scenes.some(s=>s.imageUrl&& !/^http:\/\/127\.0\.0\.1:4317\/media\/[0-9a-f-]{36}$/.test(s.imageUrl))){json(res,400,{error:'Remova URLs externas de imagem antes de exportar. Importe os arquivos para a biblioteca local.'});return true;}
      const id=randomUUID();await mkdir(JOB_DIR,{recursive:true});
      const inputPath=join(JOB_DIR,id+'.input.json');const statusPath=join(JOB_DIR,id+'.status.json');
      await writeFile(inputPath,JSON.stringify(project),'utf8');await writeFile(statusPath,JSON.stringify({id,state:'queued',progress:0}),'utf8');
      active.add(id);
      const worker=fileURLToPath(new URL('./render-worker.ts',import.meta.url));
      const child=spawn(process.execPath,['--import','tsx',worker,id],{cwd:resolve(process.cwd()),stdio:'ignore',windowsHide:true});
      child.once('error',async(e)=>{active.delete(id);await writeFile(statusPath,JSON.stringify({id,state:'failed',progress:0,error:e.message}));});
      child.once('exit',async(code)=>{active.delete(id);if(code!==0){const status=await readFile(statusPath,'utf8').then(s=>JSON.parse(s) as JobStatus).catch(()=>({id,state:'failed',progress:0}) as JobStatus);if(status.state!=='failed'&&status.state!=='completed')await writeFile(statusPath,JSON.stringify({...status,state:'failed',error:`Processo saiu com código ${code}`}));}});
      json(res,202,{id});
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Projeto inválido'});}
    return true;
  }
  const match=/^\/v1\/export\/([0-9a-f-]{36})$/.exec(url.pathname);
  if(req.method==='GET'&&match){
    try{const status=JSON.parse(await readFile(join(JOB_DIR,match[1]+'.status.json'),'utf8')) as JobStatus;json(res,200,status);}
    catch{json(res,404,{error:'Exportação não encontrada'});}return true;
  }
  return false;
}
