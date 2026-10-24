import {useEffect,useState} from 'react';
import {ensureServiceCompatible} from '../services/service-guard';

interface Issue {severity:'error'|'warning'|'info';code:string;message:string;sceneId?:string}
interface Report {projectId:string;checkedAt:string;readyForRender:boolean;issues:Issue[];counts:{errors:number;warnings:number;info:number}}
interface Environment {platform:string;node:string;ramTotalGiB:number;ramFreeGiB:number;cpuConcurrency:string}
export function ProjectDiagnostics({projectId,onClose}:{projectId:string,onClose:()=>void}){
  const [report,setReport]=useState<Report|null>(null);
  const [runtime,setRuntime]=useState<Environment|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function check(){
    setBusy(true);setError('');
    try{
      await ensureServiceCompatible();
      const [r,e]=await Promise.all([
        fetch('http://127.0.0.1:4317/v1/projects/'+encodeURIComponent(projectId)+'/diagnostics'),
        fetch('http://127.0.0.1:4317/v1/diagnostics'),
      ]);
      if(!r.ok||!e.ok)throw new Error('Falha no serviço local; confira se ele está aberto.');
      setReport(await r.json() as Report);setRuntime(await e.json() as Environment);
    }catch(err){setError(err instanceof Error?err.message:'Erro de diagnóstico');}
    finally{setBusy(false);}
  }
  useEffect(()=>{void check();},[projectId]);
  return <div className="historyOverlay" role="presentation">
    <section className="historyDialog" role="dialog" aria-modal="true" aria-label="Diagnóstico do projeto">
      <div className="homeSectionTop"><h2>Diagnóstico do projeto</h2><button onClick={onClose}>Fechar</button></div>
      <button disabled={busy} onClick={()=>void check()}>↻ Verificar novamente</button>
      {error&&<p role="alert" className="warning">{error}</p>}
      {runtime&&<p className="homeNote">Sistema: {runtime.platform} · Node {runtime.node} · RAM total {runtime.ramTotalGiB} GB · disponível {runtime.ramFreeGiB} GB · render {runtime.cpuConcurrency}</p>}
      {report&&<>
        <p className={report.readyForRender?'syncSuccess':'warning'} role="status">
          {report.readyForRender?'Nenhum arquivo de mídia ausente detectado.':'Arquivos de mídia ausentes: confira antes de renderizar.'}
          {' '}Erros: {report.counts.errors} · Alertas: {report.counts.warnings} · Informações: {report.counts.info}
        </p>
        <p className="homeNote">Este diagnóstico não valida automaticamente fatos, licenças ou reprodução de todos os codecs.</p>
        {report.issues.map((item,i)=><div className={'diagnosticRow diagnostic-'+item.severity} key={i}>
          <strong>{item.severity==='error'?'ERRO':item.severity==='warning'?'REVISAR':'INFO'}</strong>
          <span>{item.message}</span>
        </div>)}
        {!report.issues.length&&<p>Nenhuma pendência estrutural encontrada.</p>}
      </>}
    </section>
  </div>;
}
