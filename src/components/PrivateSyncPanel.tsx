import {useEffect,useState} from 'react';
import type {ProjectSummary} from '../services/projects';
const API='http://127.0.0.1:4317';
const headers={'Content-Type':'application/json','X-Dark-Studio-Client':'desktop'};
type Conflict={id:string;name:string;reason:string};
type SyncStatus={
  enabled:boolean;repository:string;sharedProjectIds:string[];busy:boolean;
  lastRun:string|null;lastError:string|null;
  lastResult:{uploaded:number;downloaded:number;unchanged:number;conflicts:Conflict[]}|null;
  conflicts:Conflict[];
};
async function request(path:string,method='GET',body?:unknown):Promise<SyncStatus>{
  const response=await fetch(API+path,{method,headers:method==='GET'?undefined:headers,
    body:body===undefined?undefined:JSON.stringify(body)});
  const data:unknown=await response.json();
  if(!response.ok)throw new Error(typeof data==='object'&&data!==null&&'error'in data?String(data.error):'Erro HTTP '+response.status);
  return data as SyncStatus;
}
export function PrivateSyncPanel({projects,refresh}:{projects:ProjectSummary[],refresh:()=>void}){
  const [status,setStatus]=useState<SyncStatus|null>(null);
  const [repo,setRepo]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    async function poll(){
      try{const s=await request('/v1/sync/status');
        if(mounted){setStatus(s);setRepo(old=>old||s.repository);}
      }catch(e){if(mounted)setError(e instanceof Error?e.message:'Serviço offline');}
    }
    void poll();
    const timer=setInterval(()=>void poll(),6000);
    return()=>{mounted=false;clearInterval(timer);};
  },[]);
  async function action(next:()=>Promise<SyncStatus>){
    setBusy(true);setError('');
    try{setStatus(await next());refresh();}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível sincronizar');}
    finally{setBusy(false);}
  }
  const connect=()=>{
    if(!repo.trim())return;
    if(!window.confirm('Conectar repositório PRIVADO? Só os projetos selecionados serão enviados ao GitHub.'))return;
    void action(()=>request('/v1/sync/config','POST',{
      enabled:true,repository:repo.trim(),
      sharedProjectIds:repo.trim()===status?.repository?(status.sharedProjectIds||[]):[],
    }));
  };
  const disable=()=>void action(()=>request('/v1/sync/config','POST',{
    enabled:false,repository:status?.repository||'',sharedProjectIds:status?.sharedProjectIds||[],
  }));
  const share=(id:string,checked:boolean)=>{
    if(checked&&!window.confirm('Autoriza enviar o JSON deste projeto para o GitHub PRIVADO? O roteiro e os metadados ficarão acessíveis aos colaboradores do repositório.'))return;
    void action(()=>request('/v1/sync/share','POST',{projectId:id,shared:checked}));
  };
  return <section className="privateSync">
    <div className="privateSyncHeading"><div>
      <small>CODEX EXTERNO • SEM CHAT NO EDITOR</small>
      <h2>Sincronização privada</h2>
      <p>Projetos JSON no GitHub privado, acessíveis ao Codex Cloud conectado. Mídia permanece no computador.</p>
    </div><span className={'syncState '+(status?.enabled?'enabled':'')}>{status?.enabled?'ATIVADA':'DESATIVADA'}</span></div>
    <label htmlFor="syncRepo">Repositório GitHub privado</label>
    <div className="syncControls">
      <input id="syncRepo" value={repo} onChange={e=>setRepo(e.target.value)}
        placeholder="usuario/repositorio-privado" maxLength={140}/>
      <button className="primary" disabled={busy||!!status?.busy||!repo.trim()} onClick={connect}>Conectar</button>
      <button disabled={busy||!!status?.busy||!status?.enabled} onClick={()=>void action(()=>request('/v1/sync/run','POST',{}))}>↻ Sincronizar agora</button>
      {status?.enabled&&<button disabled={busy||status.busy} onClick={disable}>Desativar</button>}
    </div>
    <p className="syncHelper">Requer GitHub CLI instalado e <code>gh auth login</code>. Crie um <a href="https://github.com/new" target="_blank" rel="noreferrer">repositório privado</a> com branch <code>main</code>. A conta precisa ter acesso de escrita.</p>
    {status?.enabled&&<div className="syncShare"><strong>Autorize projetos individualmente</strong>
      {projects.map(project=><label key={project.id}>
        <input type="checkbox" checked={status.sharedProjectIds.includes(project.id)} disabled={busy||status.busy}
          onChange={e=>share(project.id,e.target.checked)}/>
        <span>{project.name}</span>
        <small>{status.sharedProjectIds.includes(project.id)?'Compartilhado':'Somente local'}</small>
      </label>)}
      {!projects.length&&<p>Nenhum projeto local. Projetos publicados pelo Codex no privado poderão ser recebidos.</p>}
    </div>}
    {status?.lastResult&&<p className="syncHelper">Última execução: {status.lastResult.uploaded} enviados, {status.lastResult.downloaded} recebidos, {status.lastResult.unchanged} inalterados.</p>}
    {status && status.conflicts.length>0 &&<div className="syncConflict"><strong>Conflitos preservados (sem sobrescrita):</strong>
      {status.conflicts.map(c=><p key={c.id}>{c.name}: {c.reason}</p>)}
    </div>}
    {status?.lastError&&<p className="warning" role="alert">{status.lastError}</p>}
    {error&&<p className="warning" role="alert">{error}</p>}
    <p className="syncHelper">GitHub privado não é criptografia ponta a ponta. Não conecte seu repositório público D-E-V1. Para receber mudanças, o Codex deve publicar/mesclar as alterações na branch main do repositório privado.</p>
  </section>;
}
