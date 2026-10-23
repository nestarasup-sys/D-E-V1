import {useEffect,useState} from 'react';
import {getProject, getProjectHistory, restoreProject} from '../services/projects';

export function ProjectHistory({id,onClose,onRestored}:{id:string,onClose:()=>void,onRestored:()=>void}) {
  const [history,setHistory]=useState<Awaited<ReturnType<typeof getProjectHistory>>>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;void getProjectHistory(id).then(items=>{if(live)setHistory(items);}).catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[id]);
  async function restore(revision:string){
    if(!window.confirm('Restaurar esta versão? A versão atual será guardada no histórico, mas as últimas edições serão substituídas.'))return;
    setBusy(true);setError('');
    try{
      const current=await getProject(id);
      await restoreProject(id,revision,current.revision);
      onRestored();onClose();
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }
  return <div className="historyOverlay" role="presentation">
    <section className="historyDialog" role="dialog" aria-modal="true" aria-label="Histórico do projeto">
      <div className="homeSectionTop"><h2>Histórico de versões</h2><button onClick={onClose}>Fechar</button></div>
      <p className="homeNote">Até 30 versões anteriores locais são guardadas automaticamente. Restaurar não apaga a versão atual do histórico.</p>
      {error&&<p className="warning" role="alert">{error}</p>}
      {!history.length?<p>Não existem versões anteriores ainda. Edite e salve o projeto para criar a primeira.</p>:
      <div>{history.map(snapshot=><div className="historyRow" key={snapshot.revision}>
        <div><strong>{snapshot.name}</strong><small>{new Date(snapshot.createdAt).toLocaleString('pt-BR')} · {snapshot.scenes} cenas · {snapshot.revision.slice(0,8)}</small></div>
        <button disabled={busy} onClick={()=>void restore(snapshot.revision)}>Restaurar</button>
      </div>)}</div>}
    </section>
  </div>;
}
