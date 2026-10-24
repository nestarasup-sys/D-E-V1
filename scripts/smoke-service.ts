/**
 * Integration smoke: a real Node service, an isolated TEMP project directory,
 * the current protocol, proposal list, production status and diagnostics.
 * No personal DarkStudio data or GitHub upload.
 */
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {assertServiceCompatibility} from '../src/model/service-contract';

const root=await mkdtemp(join(tmpdir(),'dark-service-integration-'));
const base='http://127.0.0.1:4317';
let output='';
const worker=spawn(process.execPath,['--import','tsx','apps/agent/src/index.ts'],{
  cwd:resolve(process.cwd()),env:{...process.env,DARK_STUDIO_PROJECTS_DIR:root},
  windowsHide:true,stdio:['ignore','pipe','pipe'],
});
worker.stdout.on('data',(b:Buffer)=>{output=(output+String(b)).slice(-2000);});
worker.stderr.on('data',(b:Buffer)=>{output+=String(b).slice(-output.length+2000);});

async function api(path:string,init?:RequestInit):Promise<unknown>{
  const response=await fetch(base+path,init);
  const body:unknown=await response.json();
  if(!response.ok)throw new Error('HTTP '+response.status+' '+path+' '+JSON.stringify(body));
  return body;
}
function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object')throw new Error('Esperava objeto JSON.');
  return value as Record<string,unknown>;
}
try{
  const deadline=Date.now()+14000;
  let health:unknown;
  while(Date.now()<deadline){
    try{health=await api('/health');break;}
    catch{if(worker.exitCode!==null)break;await new Promise(r=>setTimeout(r,200));}
  }
  if(!health)throw new Error('Serviço não iniciou. Logs: '+output.slice(-1200));
  const valid=assertServiceCompatibility(health);
  if(resolve(valid.projectsDirectory)!==resolve(root))throw Error('Serviço lendo diretório errado.');
  if(resolve(valid.workspace)!==resolve(process.cwd()))throw Error('Serviço executado de outro checkout.');
  const record=object(await api('/v1/projects',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Teste de compatibilidade'})}));
  const project=object(record.project);
  const scenes=project.scenes as Array<{id:string}>;
  const id=String(project.id),revision=String(record.revision);
  const ops=[{type:'updateScene',sceneId:scenes[0].id,changes:{title:'Projeto do Codex'}}];
  await api('/v1/projects/'+id+'/proposals',{
    method:'POST',headers:{'Content-Type':'application/json','If-Match':revision},
    body:JSON.stringify({operations:ops}),
  });
  const listed=object(await api('/v1/projects'));
  const entry=(listed.projects as Array<{id:string,pendingProposals:number}>).find(p=>p.id===id);
  if(entry?.pendingProposals!==1)throw Error('Dashboard não expõe a proposta pendente.');
  const pending=object(await api('/v1/projects/'+id+'/proposals'));
  if((pending.proposals as unknown[]).length!==1)throw Error('Rota de propostas devolveu lista incorreta.');
  const production=object(await api('/v1/projects/'+id+'/production'));
  if(object(production.state).pendingProposals!==1)throw Error('Produção ignorou proposta local.');
  const diagnostic=object(await api('/v1/projects/'+id+'/diagnostics'));
  if(diagnostic.projectId!==id)throw Error('Diagnóstico não corresponde ao projeto.');
  const jobs=object(await api('/v1/export/jobs?projectId='+id));
  if(!Array.isArray(jobs.jobs))throw Error('Histórico de render inválido.');
  console.log('SERVICE SMOKE OK: versão, diretório isolado, 1 proposta, painel e diagnóstico.');
}finally{
  worker.kill();
  await new Promise<void>(resolveWait=>{
    if(worker.exitCode!==null){resolveWait();return;}
    worker.once('close',()=>resolveWait());
    setTimeout(()=>resolveWait(),3500).unref();
  });
  await rm(root,{recursive:true,force:true}).catch(()=>{});
}
