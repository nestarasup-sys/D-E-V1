import { useState } from 'react';
import { useEditor } from '../model/store';
import {
  storyboardProposalSchema, batchProposalSchema,
  storyboardAppendOperations, batchUpdateOperations,
  type StoryboardProposal, type BatchProposal,
} from '../model/director';

const endpoint = 'http://127.0.0.1:4317';

async function postProposal(route: string, data: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(endpoint + route, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String(payload.error) : 'Erro HTTP ' + response.status,
      );
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function DirectorPanel({onClose}: {onClose: () => void}) {
  const {project, apply} = useEditor();
  const [mode, setMode] = useState<'storyboard'|'batch'>('storyboard');
  const [script, setScript] = useState('');
  const [maxScenes, setMaxScenes] = useState(6);
  const [instruction, setInstruction] = useState('Aumente o impacto visual sem alterar fatos ou números.');
  const [targets, setTargets] = useState<string[]>(project.scenes.slice(0,3).map(s=>s.id));
  const [storyboard, setStoryboard] = useState<StoryboardProposal|null>(null);
  const [batch, setBatch] = useState<BatchProposal|null>(null);
  const [chosenBeats, setChosenBeats] = useState<number[]>([]);
  const [chosenUpdates, setChosenUpdates] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function switchMode(next: 'storyboard'|'batch') {
    setMode(next);
    setError('');
    setStatus('');
  }
  function toggle<T,>(items: T[], value: T): T[] {
    return items.includes(value) ? items.filter(item => item !== value) : [...items,value];
  }
  async function request() {
    setError('');setStatus('');setStoryboard(null);setBatch(null);
    setChosenBeats([]);setChosenUpdates([]);
    setPending(true);
    const fingerprint = JSON.stringify(useEditor.getState().project);
    try {
      if (mode === 'storyboard') {
        if (script.trim().length < 80) throw new Error('O roteiro precisa de pelo menos 80 caracteres.');
        const result = storyboardProposalSchema.parse(
          await postProposal('/v1/storyboard', {script, maxScenes}),
        );
        setStoryboard(result);
        setChosenBeats(result.scenes.map((_,i)=>i));
      } else {
        if (targets.length === 0) throw new Error('Selecione pelo menos uma cena.');
        const result = batchProposalSchema.parse(
          await postProposal('/v1/batch-propose', {
            project: useEditor.getState().project, sceneIds: targets, instruction,
          }),
        );
        if (result.updates.some(item=>!targets.includes(item.sceneId))) {
          throw new Error('A IA retornou alterações para cenas não selecionadas.');
        }
        setBatch(result);
        setChosenUpdates(result.updates.map(u=>u.sceneId));
      }
      setSnapshot(fingerprint);
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar a proposta.');
    } finally {
      setPending(false);
    }
  }
  function accept() {
    setError('');
    try {
      const current = useEditor.getState().project;
      if (JSON.stringify(current) !== snapshot) {
        throw new Error('O projeto mudou desde a proposta. Gere novamente para evitar conflitos.');
      }
      if (mode === 'storyboard' && storyboard) {
        const ops = storyboardAppendOperations(current, storyboard, chosenBeats, ()=>crypto.randomUUID());
        apply(ops);
        setStatus(ops.length + ' novas cenas adicionadas ao final do projeto. Você pode desfazer em um clique.');
        setStoryboard(null);
      } else if (mode === 'batch' && batch) {
        const ops = batchUpdateOperations(current, batch, chosenUpdates);
        apply(ops);
        setStatus(ops.length + ' alterações aplicadas em uma única ação reversível.');
        setBatch(null);
      }
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Falha ao aplicar alterações.');
    }
  }

  return <div className="directorOverlay" role="presentation">
    <section className="directorModal" role="dialog" aria-modal="true" aria-label="Diretor de IA">
      <div className="directorHeader">
        <div><h2>✦ DIRETOR DE IA</h2><p>Codex externo → proposta validada → seleção humana → operações reversíveis no editor.</p></div>
        <button onClick={onClose} aria-label="Fechar Diretor IA">✕ Fechar</button>
      </div>
      <div className="directorModes">
        <button aria-pressed={mode==='storyboard'} onClick={()=>switchMode('storyboard')}>Roteiro → storyboard</button>
        <button aria-pressed={mode==='batch'} onClick={()=>switchMode('batch')}>Editar várias cenas</button>
      </div>
      <div className="directorEditor">
        <div>
          {mode==='storyboard' ? <>
            <h3>Roteiro do capítulo</h3>
            <p>Cole o texto que será narrado. A IA só pode planejar cenas a partir do que estiver escrito, sem inventar fatos ou fontes.</p>
            <textarea aria-label="Roteiro" value={script} onChange={e=>setScript(e.target.value)} rows={13} maxLength={12000} placeholder="Cole o roteiro investigativo aqui. Mínimo de 80 caracteres..."/>
            <div className="directorControls"><label htmlFor="max-scenes">Máximo de cenas:</label><input id="max-scenes" type="number" min={2} max={10} value={maxScenes} onChange={e=>setMaxScenes(Math.max(2,Math.min(10,Number(e.target.value)||2)))}/></div>
            <p className="directorHint">Novas cenas serão acrescentadas no fim. As cenas e os clipes existentes não serão movidos.</p>
          </> : <>
            <h3>Instrução para várias cenas</h3>
            <textarea aria-label="Instrução multicena" rows={5} maxLength={1200} value={instruction} onChange={e=>setInstruction(e.target.value)}/>
            <h3>Selecione até oito cenas</h3>
            <div style={{maxHeight:250,overflowY:'auto'}}>
              {project.scenes.map(s=><label className="directorTarget" key={s.id}>
                <input type="checkbox" checked={targets.includes(s.id)} disabled={!targets.includes(s.id)&&targets.length>=8} onChange={()=>setTargets(t=>toggle(t,s.id))}/>
                <span title={s.title}>{s.title}</span>
              </label>)}
            </div>
            <p className="directorHint">O agente não pode mudar IDs, imagens nem arquivos de mídia.</p>
          </>}
          <button className="primary wide" disabled={pending||(mode==='storyboard'?script.trim().length<80:!instruction.trim()||!targets.length)} onClick={()=>void request()}>
            {pending?'Codex preparando proposta...':'Gerar proposta sem alterar o projeto →'}
          </button>
          {error&&<p className="directorError" role="alert">{error}</p>}
          {status&&<p role="status" style={{color:'#8de5b3'}}>{status}</p>}
        </div>
        <div className="directorResults">
          <strong>REVISÃO ANTES DE APLICAR</strong>
          {!storyboard && !batch && <p>Aqui aparecerá o plano produzido pelo agente. Nada é alterado automaticamente.</p>}
          {mode==='storyboard' && storyboard && <>
            <p>{storyboard.summary}</p>
            {storyboard.scenes.map((beat,i)=><div className="directorCard" key={i}>
              <label><input type="checkbox" checked={chosenBeats.includes(i)} onChange={()=>setChosenBeats(b=>toggle(b,i))}/>
                <strong>{i+1}. {beat.title}</strong></label>
              <small>{Math.round(beat.durationFrames/30)}s · {beat.kicker} · {beat.subtitle}</small>
              <small><b>Visual:</b> {beat.visualDirection}</small>
              {beat.evidenceNeeded&&<small><b>Verificar:</b> {beat.evidenceNeeded}</small>}
            </div>)}
            <div className="directorControls">
              <button className="primary" onClick={accept} disabled={!chosenBeats.length}>Adicionar {chosenBeats.length} cena(s)</button>
              <button onClick={()=>setStoryboard(null)}>Descartar</button>
            </div>
          </>}
          {mode==='batch' && batch && <>
            <p>{batch.summary}</p>
            {batch.updates.map(update=><div className="directorCard" key={update.sceneId}>
              <label><input type="checkbox" checked={chosenUpdates.includes(update.sceneId)} onChange={()=>setChosenUpdates(b=>toggle(b,update.sceneId))}/>
                <strong>{project.scenes.find(s=>s.id===update.sceneId)?.title||update.sceneId} → {update.changes.title}</strong></label>
              <small>{update.reason}</small>
            </div>)}
            <div className="directorControls">
              <button className="primary" onClick={accept} disabled={!chosenUpdates.length}>Aplicar {chosenUpdates.length} alteração(ões)</button>
              <button onClick={()=>setBatch(null)}>Descartar</button>
            </div>
          </>}
        </div>
      </div>
    </section>
  </div>;
}
