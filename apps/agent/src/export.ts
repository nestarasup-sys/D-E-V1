import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {json,readJson} from './http';
import {projectSchema} from '../../../src/model/project';
import {JOB_DIR,type JobStatus,listJobs,readJob,writeJob,isPending,recoverJob} from './job-registry';

const active=new Set<string>();
let starting=false;
export async function handleExport(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(req.method==='GET'&&url.pathname==='/v1/export/jobs'){
    try{
      const projectId=url.searchParams.get('projectId')||undefined;
      json(res,200,{jobs:await listJobs(projectId)});
    }catch(e){json(res,500,{error:e instanceof Error?e.message:'Falha ao listar renders'});}
    return true;
  }
  if(req.method==='POST'&&url.pathname==='/v1/export'){
    if(starting||active.size){json(res,429,{error:'Já existe uma exportação em andamento.'});return true;}
    starting=true;
    try{
      const live=(await listJobs()).find(job=>isPending(job));
      if(live){json(res,429,{error:'Outro render permanece ativo (PID '+live.pid+'). Acompanhe a execução existente.'});return true;}
      const project=projectSchema.parse(await readJson(req,2_000_000));
      if(project.scenes.some(s=>s.imageUrl&&
        !/^http:\/\/127\.0\.0\.1:4317\/media\/[0-9a-f-]{36}$/.test(s.imageUrl))){
        json(res,400,{error:'Importe imagens pela biblioteca local em vez de URLs externas.'});return true;
      }
      const id=randomUUID();await mkdir(JOB_DIR,{recursive:true});
      const status:JobStatus={id,state:'queued',progress:0,projectId:project.id,createdAt:new Date().toISOString()};
      await writeFile(join(JOB_DIR,id+'.input.json'),JSON.stringify(project),'utf8');
      await writeJob(status);
      active.add(id);
      const worker=fileURLToPath(new URL('./render-worker.ts',import.meta.url));
      const child=spawn(process.execPath,['--import','tsx',worker,id],
        {cwd:resolve(process.cwd()),stdio:'ignore',windowsHide:true});
      child.once('error',async e=>{
        active.delete(id);
        const current=await readJob(id).catch(()=>status);
        await writeJob({...current,state:'failed',error:e.message}).catch(()=>{});
      });
      child.once('exit',async code=>{
        active.delete(id);
        const current=await readJob(id).catch(()=>status);
        if(code!==0&&current.state!=='failed'&&current.state!=='completed')
          await writeJob({...current,state:'failed',
            error:'Render encerrou com código '+String(code)}).catch(()=>{});
      });
      // Register the child PID before returning job ID to the polling UI.
      // Without this, an immediate /v1/export/:id request can incorrectly
      // turn a newly queued render into an "interrupted" job.
      if(child.pid){
        const live=await readJob(id);
        if(live.state==='queued'&&!live.pid)
          await writeJob({...live,pid:child.pid});
      }
      json(res,202,{id});
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Projeto inválido'});}
    finally{starting=false;}
    return true;
  }
  const match=/^\/v1\/export\/([0-9a-f-]{36})$/.exec(url.pathname);
  if(req.method==='GET'&&match){
    try{
      const job=await recoverJob(await readJob(match[1]));
      json(res,200,job);
    }catch{json(res,404,{error:'Exportação não encontrada'});}
    return true;
  }
  return false;
}
