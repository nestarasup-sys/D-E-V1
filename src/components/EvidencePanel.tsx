import {useState} from 'react';
import type {Evidence} from '../model/project';
import type {Operation} from '../model/operations';

export function EvidencePanel({sceneId,evidence,onOps}:{
  sceneId:string;evidence:Evidence[];onOps:(ops:Operation[])=>void;
}){
  const [claim,setClaim]=useState('');
  const [sourceTitle,setSourceTitle]=useState('');
  const [sourceUrl,setSourceUrl]=useState('');
  const [notes,setNotes]=useState('');
  const [error,setError]=useState('');
  function add(){
    try{
      if(!claim.trim()||!sourceTitle.trim())throw new Error('Informe a afirmação e a origem da evidência.');
      onOps([{type:'addEvidence',evidence:{
        id:crypto.randomUUID(),sceneId,claim:claim.trim(),sourceTitle:sourceTitle.trim(),sourceUrl:sourceUrl.trim(),
        notes:notes.trim(),reviewStatus:'pending',
      }}]);
      setClaim('');setSourceTitle('');setSourceUrl('');setNotes('');setError('');
    }catch(e){setError(e instanceof Error?e.message:'Evidência inválida');}
  }
  function change(e:Evidence,status:Evidence['reviewStatus']){
    if(status==='verified'&&!window.confirm('Você conferiu pessoalmente a origem e a afirmação? Confirmar não verifica automaticamente a fonte.'))return;
    try{onOps([{type:'updateEvidence',evidenceId:e.id,changes:{reviewStatus:status}}]);setError('');}
    catch(err){setError(err instanceof Error?err.message:'Falha ao revisar evidência');}
  }
  return <section className="evidencePanel">
    <div className="panelTitle">FONTES E EVIDÊNCIAS <span>{evidence.length}</span></div>
    <p className="help">Fontes vinculadas à cena. Marcadores não substituem conferência editorial.</p>
    {evidence.map(e=><article key={e.id} className="evidenceItem">
      <strong>{e.claim}</strong><small>Origem: {e.sourceTitle}</small>
      {e.sourceUrl&&<a href={e.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte ↗</a>}
      {e.notes&&<small>Notas: {e.notes}</small>}
      <div className="projectActions"><select aria-label="Situação da evidência" value={e.reviewStatus}
        onChange={event=>change(e,event.target.value as Evidence['reviewStatus'])}>
        <option value="pending">Pendente</option><option value="verified">Verificada por mim</option><option value="rejected">Rejeitada</option>
      </select><button onClick={()=>{
        if(window.confirm('Remover o registro desta fonte?'))onOps([{type:'removeEvidence',evidenceId:e.id}]);
      }}>Excluir</button></div>
    </article>)}
    <div className="evidenceForm">
      <label>Afirmação a verificar<input value={claim} onChange={e=>setClaim(e.target.value)} maxLength={500} placeholder="Ex.: valor mencionado na narração"/></label>
      <label>Origem / documento<input value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} maxLength={200} placeholder="Fonte oficial ou arquivo físico"/></label>
      <label>URL HTTPS (opcional)<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} maxLength={2000} placeholder="https://..."/></label>
      <label>Notas editoriais<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={600} rows={2}/></label>
      <button className="wide" onClick={add}>+ Registrar fonte pendente</button>
    </div>
    {error&&<p className="warning" role="alert">{error}</p>}
  </section>;
}
