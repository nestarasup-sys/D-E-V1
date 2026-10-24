import {useEffect,useState} from 'react';
import {listProposals,decideProposal,type ProposalView} from '../services/proposals';

export function ProposalReview({projectId,onClose,onChanged}:{projectId:string,onClose:()=>void,onChanged:()=>void}){
  const [items,setItems]=useState<ProposalView[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function refresh(){
    try{setItems(await listProposals(projectId));setError('');}
    catch(e){setError(e instanceof Error?e.message:'Falha ao buscar propostas');}
  }
  useEffect(()=>{void refresh();},[projectId]);
  async function decide(id:string,action:'accept'|'reject'){
    if(action==='accept'&&!window.confirm('Aplicar esta proposta do Codex ao projeto local? Uma cópia de segurança será criada.'))return;
    setBusy(true);
    try{
      await decideProposal(projectId,id,action);
      await refresh();onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível aplicar a proposta.');}
    finally{setBusy(false);}
  }
  return <div className="historyOverlay" role="presentation">
    <section className="historyDialog" role="dialog" aria-modal="true" aria-label="Propostas do Codex">
      <div className="homeSectionTop"><h2>Propostas do Codex local</h2><button onClick={onClose}>Fechar</button></div>
      <p className="homeNote">O Codex cria propostas pelo comando <code>npm run project -- propose</code>. O arquivo do projeto só muda quando você aprova. Uma proposta obsoleta deve ser descartada e gerada novamente.</p>
      <button onClick={()=>void refresh()}>↻ Atualizar propostas</button>
      {error&&<p className="warning" role="alert">{error}</p>}
      {!items.length?<p>Nenhuma proposta pendente para este projeto.</p>:
        items.map(p=><div className="proposalReviewCard" key={p.id}>
          <strong>Proposta {p.id.slice(0,8)}</strong>
          <small>{new Date(p.createdAt).toLocaleString('pt-BR')}{p.stale?' — Projeto alterado depois da proposta':''}</small>
          {p.preview&&<ul>
            <li>Cenas: {p.preview.beforeScenes} → {p.preview.afterScenes} · Clipes: {p.preview.beforeClips} → {p.preview.afterClips}</li>
            {p.preview.addedScenes.map((name,i)=><li key={'add'+i}>Nova cena: {name}</li>)}
            {p.preview.removedScenes.map((name,i)=><li key={'remove'+i}>Excluir cena: {name}</li>)}
            {p.preview.changedScenes.map(item=><li key={item.id}>Cena alterada: {item.before} → {item.after} (campos: {item.changedFields.join(', ')})</li>)}
            {p.preview.changedClips.map(item=><li key={item.id}>Clipe {item.id.slice(0,8)}: {item.changedFields.join(', ')}</li>)}
            <li>Clipes adicionados: {p.preview.addedClips} · removidos: {p.preview.removedClips}</li>
            {p.preview.visualAudit&&<li><strong>Qualidade da montagem:</strong> {p.preview.visualAudit.coveragePercent}% de cobertura;
              {p.preview.visualAudit.errors} erros de ritmo/cobertura, {p.preview.visualAudit.warnings} alertas,
              {p.preview.visualAudit.unverifiedVisuals} visuais com fonte pendente</li>}
            {p.preview.addedShots.slice(0,16).map((name,i)=><li key={'as'+i}>Plano visual novo: {name}</li>)}
            {p.preview.addedShots.length>16&&<li>+ {p.preview.addedShots.length-16} outros planos para revisão na timeline após aprovação</li>}
            {p.preview.removedShots.map((name,i)=><li key={'rs'+i}>Plano removido: {name}</li>)}
            {p.preview.changedShots.slice(0,12).map(s=><li key={s.id}>Plano {s.id.slice(0,8)}: campos {s.changedFields.join(', ')}</li>)}
            {p.preview.changedShots.length>12&&<li>+ {p.preview.changedShots.length-12} outros planos alterados</li>}
            <li>Legendas: {p.preview.addedCaptions>=0?'+':''}{p.preview.addedCaptions} · Fontes: {p.preview.addedEvidence>=0?'+':''}{p.preview.addedEvidence}</li>
          </ul>}
          <div className="projectActions">
            <button className="primary" disabled={busy||p.stale||!p.preview||(p.preview.visualAudit?.errors??0)>0} onClick={()=>void decide(p.id,'accept')}>Aprovar</button>
            <button disabled={busy} onClick={()=>void decide(p.id,'reject')}>Descartar</button>
          </div>
        </div>)}
    </section>
  </div>;
}
