import {useEffect,useState} from 'react';
import {getProduction,advanceProduction,saveProductionCheckpoint,
  type ProductionOverview} from '../services/production';

const descriptions={
  pending:'Pendente',ready:'Pronto para revisar',review:'Revisão humana',
  proposed:'Proposta no editor',completed:'Registrado',
};
export function ProductionPanel({projectId,onClose,onChanged}:{
  projectId:string;onClose:()=>void;onChanged:()=>void;
}){
  const [state,setState]=useState<ProductionOverview|null>(null);
  const [checkpoint,setCheckpoint]=useState<ProductionOverview|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function refresh(){
    setBusy(true);setError('');
    try{
      const result=await getProduction(projectId);
      setState(result.state);setCheckpoint(result.checkpoint);
    }catch(e){setError(e instanceof Error?e.message:'Falha no estado de produção.');}
    finally{setBusy(false);}
  }
  useEffect(()=>{void refresh();},[projectId]);
  async function action(kind:'checkpoint'|'continue'){
    if(kind==='continue'&&!window.confirm(
      'Tentar preparar uma direção visual ILUSTRATIVA com as cenas e legendas existentes? Não altera o projeto nem aprova automaticamente.')){
      return;
    }
    setBusy(true);setError('');
    try{
      const next=kind==='checkpoint'?await saveProductionCheckpoint(projectId):await advanceProduction(projectId);
      setState(next);
      setCheckpoint(next);
      onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível avançar.');}
    finally{setBusy(false);}
  }
  return <div className="historyOverlay" role="presentation">
    <section className="historyDialog" role="dialog" aria-modal="true" aria-label="Produção do episódio">
      <div className="homeSectionTop"><h2>Produção do episódio</h2><button onClick={onClose}>Fechar</button></div>
      <p className="homeNote">Este painel distingue o que existe no disco do que está pendente no Codex e do que realmente foi exportado. Não certifica fatos nem substitui assistir ao MP4.</p>
      <div className="projectActions">
        <button disabled={busy} onClick={()=>void refresh()}>Atualizar estado</button>
        <button disabled={busy} onClick={()=>void action('checkpoint')}>Salvar checkpoint local</button>
        <button disabled={busy} onClick={()=>void action('continue')}>Preparar próxima etapa</button>
      </div>
      {error&&<p role="alert" className="warning">{error}</p>}
      {checkpoint&&<p className="homeNote">Último checkpoint salvo em {new Date(checkpoint.updatedAt).toLocaleString('pt-BR')}.</p>}
      {state&&<>
        <p className="homeNote">
          Revisão: {state.revision.slice(0,10)} · Propostas: {state.pendingProposals} ·
          MP4s concluídos: {state.completedRenders} · Renders interrompidos: {state.interruptedRenders}
        </p>
        {state.proposedId&&<p className="syncSuccess">Nova proposta: {state.proposedId.slice(0,8)}. Use o botão Revisar Codex.</p>}
        {state.steps.map(phase=><div key={phase.id} className="productionStep">
          <strong>{phase.title}</strong><span>{descriptions[phase.status]}</span>
          <p>{phase.explanation}</p>
        </div>)}
        <p className="homeNote"><strong>Próxima ação:</strong> {state.nextAction}</p>
      </>}
    </section>
  </div>;
}
