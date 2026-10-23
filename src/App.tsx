import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Documentary } from './video/Documentary';
import { useEditor } from './model/store';
import { projectDuration, sceneStart, projectSchema, sceneSchema, type Scene, type Project } from './model/project';
import type { Operation } from './model/operations';
import { z } from 'zod';

const endpoint = 'http://127.0.0.1:4317';
const proposalSchema = z.object({summary:z.string().min(1).max(1000),sceneId:z.string(),changes:sceneSchema.omit({id:true,imageUrl:true}).strict()}).strict();
type Proposal = z.infer<typeof proposalSchema>;
const seconds = (frames:number, fps:number) => `${Math.floor(frames/fps/60).toString().padStart(2,'0')}:${Math.floor((frames/fps)%60).toString().padStart(2,'0')}`;
function saveJson(project:Project) {
  const blob = new Blob([JSON.stringify(project,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');a.href = url;a.download = 'dark-studio-project.json';a.click();
  URL.revokeObjectURL(url);
}
function newScene(after:Scene):Scene {
  return {...after, id:`scene-${crypto.randomUUID()}`, title:'NOVA CENA', subtitle:'Edite este texto no painel à direita.', kicker:'NOVO BLOCO', imageUrl:''};
}
export function App() {
  const {project,selectedSceneId,select,apply,replace,undo,redo,past,future} = useEditor();
  const player = useRef<PlayerRef>(null);
  const file = useRef<HTMLInputElement>(null);
  const [command,setCommand] = useState('Destaque o título e deixe a cena com clima mais investigativo.');
  const [proposal,setProposal] = useState<Proposal|null>(null);
  const [agentStatus,setAgentStatus] = useState<'idle'|'loading'|'online'|'offline'>('idle');
  const [message,setMessage] = useState('');
  const [imageDraft,setImageDraft] = useState('');
  const selectedIndex = Math.max(0,project.scenes.findIndex(s=>s.id===selectedSceneId));
  const scene = project.scenes[selectedIndex];
  useEffect(()=>setImageDraft(scene.imageUrl || ''),[scene.id,scene.imageUrl]);
  const total = useMemo(()=>projectDuration(project),[project]);
  function update(changes:Partial<Omit<Scene,'id'>>) {
    try {apply([{type:'updateScene',sceneId:scene.id,changes}]);setProposal(null);setMessage('');}
    catch (e) {setMessage(e instanceof Error?e.message:String(e));}
  }
  function action(ops:Operation[]) {
    try {apply(ops);setProposal(null);setMessage('');}
    catch (e) {setMessage(e instanceof Error?e.message:String(e));}
  }
  async function importProject(event:ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];if(!picked)return;
    try {const data=projectSchema.parse(JSON.parse(await picked.text())); replace(data);setProposal(null);setMessage('Projeto importado.');}
    catch (e) {setMessage(`JSON inválido: ${e instanceof Error?e.message:'erro desconhecido'}`);}
    event.target.value='';
  }
  async function requestAgent() {
    setAgentStatus('loading');setProposal(null);setMessage('');
    try {
      const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),120000);
      let response:Response;
      try {response=await fetch(`${endpoint}/v1/propose`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instruction:command,selectedSceneId:scene.id,project}),signal:ctrl.signal});}
      finally {clearTimeout(timeout);}
      const payload:unknown=await response.json();
      if(!response.ok)throw new Error(typeof payload==='object'&&payload!==null&&'error'in payload?String(payload.error):`HTTP ${response.status}`);
      const parsed=proposalSchema.parse(payload);
      if(parsed.sceneId!==scene.id)throw new Error('Resposta da IA não corresponde à cena selecionada.');
      setProposal(parsed);setAgentStatus('online');
    } catch (e) {setAgentStatus('offline');setMessage(e instanceof Error?e.message:String(e));}
  }
  function jumpTo(index:number) {select(project.scenes[index].id);player.current?.seekTo(sceneStart(project,index));}
  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brandmark">D</span><div><strong>DARK STUDIO</strong><small>INVESTIGATIVE EDITOR 0.1</small></div></div>
      <div className="projectName"><span className="dot"/>{project.name}</div>
      <div className="topActions"><button onClick={undo} disabled={!past.length} title="Desfazer">↶ Desfazer</button><button onClick={redo} disabled={!future.length} title="Refazer">↷ Refazer</button><button onClick={()=>file.current?.click()}>Importar JSON</button><button className="primary" onClick={()=>saveJson(project)}>Salvar projeto ↧</button></div>
      <input className="hidden" ref={file} type="file" accept="application/json,.json" onChange={importProject}/>
    </header>
    <div className="workspace">
      <aside className="library"><div className="panelTitle">BIBLIOTECA DE CENAS <span>{project.scenes.length}</span></div>
      <p className="help">Selecionar uma cena também posiciona o vídeo na timeline.</p>
      <div className="scenes">{project.scenes.map((s,i)=><button key={s.id} className={`sceneCard ${selectedSceneId===s.id?'selected':''}`} onClick={()=>jumpTo(i)}>
        <div className="sceneIndex">{String(i+1).padStart(2,'0')} <span>{seconds(s.durationFrames,project.fps)}</span></div>
        <strong>{s.title}</strong><small>{s.kind==='stat'?'Gráfico / dado':s.kind==='quote'?'Citação':'Título / abertura'}</small></button>)}</div>
      <button className="wide dashed" onClick={()=>{const added=newScene(scene);action([{type:'addScene',scene:added,afterId:scene.id}]);select(added.id);}}>＋ Adicionar cena</button>
      <div className="libraryNote"><b>FONTES VERIFICÁVEIS</b><p>Esta versão trabalha com cenas. A biblioteca de arquivos, fontes, narração e FFmpeg será acrescentada nas próximas etapas.</p></div>
      </aside>
      <main className="stage"><div className="panelTitle">PRÉ-VISUALIZAÇÃO <span>1920 × 1080 • 30 FPS</span></div>
        <div className="preview"><Player ref={player} component={Documentary} inputProps={{project}} fps={project.fps} durationInFrames={Math.max(1,total)} compositionWidth={project.width} compositionHeight={project.height} controls clickToPlay style={{width:'100%',aspectRatio:'16/9'}}/></div>
        <div className="stageFooter"><div>● PREVIEW LOCAL <span>As cenas são renderizadas pelo Remotion Player.</span></div><strong>{seconds(total,project.fps)} total</strong></div>
        <div className="timelineTop"><strong>TIMELINE</strong><span>{project.scenes.length} cenas · navegue e reordene abaixo</span></div>
        <div className="timeline"><div className="track"><span className="trackLabel">VISUAL</span><div className="clips">{project.scenes.map((s,i)=><button key={s.id} onClick={()=>jumpTo(i)} className={`clip ${s.id===scene.id?'active':''}`} style={{flex:s.durationFrames}} title={s.title}><span>{i+1}. {s.title}</span></button>)}</div></div>
        <div className="track"><span className="trackLabel">TEXTO</span><div className="clips">{project.scenes.map((s,i)=><div className="textClip" key={s.id} style={{flex:s.durationFrames}}>{i===0?'TÍTULO':'TEXTO'}</div>)}</div></div>
        <div className="track"><span className="trackLabel">ÁUDIO</span><div className="emptyTrack">Trilha de narração — próxima etapa</div></div></div>
        <div className="timelineHint">O preview mostra o resultado real. A timeline v0.1 permite seleção e reordenação; arrastar clipes e áudio multitrilha ainda não foram implementados.</div>
      </main>
      <aside className="inspector"><div className="panelTitle">PROPRIEDADES <span>CENA {selectedIndex+1}</span></div>
        <div className="field"><label>Tipo de cena</label><select value={scene.kind} onChange={e=>update({kind:e.target.value as Scene['kind']})}><option value="title">Título</option><option value="stat">Estatística</option><option value="quote">Citação</option></select></div>
        <div className="field"><label>Chamada superior</label><input value={scene.kicker} maxLength={100} onChange={e=>update({kicker:e.target.value})}/></div>
        <div className="field"><label>Título principal</label><textarea rows={3} value={scene.title} maxLength={180} onChange={e=>update({title:e.target.value})}/></div>
        <div className="field"><label>Subtítulo</label><textarea rows={3} value={scene.subtitle} maxLength={400} onChange={e=>update({subtitle:e.target.value})}/></div>
        <div className="field"><label>Duração ({seconds(scene.durationFrames,30)})</label><input type="range" min="30" max="600" step="15" value={Math.min(scene.durationFrames,600)} onChange={e=>update({durationFrames:Number(e.target.value)})}/></div>
        <div className="twoCols"><div className="field"><label>Destaque</label><input type="color" value={scene.accentColor} onChange={e=>update({accentColor:e.target.value})}/></div><div className="field"><label>Fundo</label><input type="color" value={scene.backgroundColor} onChange={e=>update({backgroundColor:e.target.value})}/></div></div>
        <div className="field"><label>Imagem de fundo (URL HTTPS)</label><input placeholder="https://..." value={imageDraft} onChange={e=>setImageDraft(e.target.value)} onBlur={()=>{if(imageDraft!==scene.imageUrl)update({imageUrl:imageDraft});}}/></div>
        <div className="sceneActions"><button onClick={()=>action([{type:'moveScene',sceneId:scene.id,direction:'left'}])} disabled={selectedIndex===0}>← Mover</button><button onClick={()=>action([{type:'moveScene',sceneId:scene.id,direction:'right'}])} disabled={selectedIndex===project.scenes.length-1}>Mover →</button><button className="danger" disabled={project.scenes.length===1} onClick={()=>action([{type:'removeScene',sceneId:scene.id}])}>Excluir</button></div>
        <div className="agent"><div className="agentHeading"><span>✦ AGENTE DE EDIÇÃO</span><small className={agentStatus==='online'?'online':''}>{agentStatus==='loading'?'TRABALHANDO':agentStatus==='online'?'CONECTADO':'LOCAL · :4317'}</small></div>
          <p>Peça uma alteração. O Codex opera em um processo externo; nada é aplicado sem sua aprovação.</p>
          <textarea rows={4} value={command} onChange={e=>setCommand(e.target.value)} placeholder="Ex.: deixe o título mais dramático, sem criar fatos..."/>
          <button className="primary wide" onClick={requestAgent} disabled={agentStatus==='loading'||!command.trim()}>{agentStatus==='loading'?'Gerando proposta...':'Gerar proposta com Codex →'}</button>
          {proposal&&<div className="proposal"><b>PROPOSTA DA IA</b><p>{proposal.summary}</p><small>Novo título: {proposal.changes.title}</small><div className="proposalActions"><button className="primary" onClick={()=>{action([{type:'updateScene',sceneId:proposal.sceneId,changes:proposal.changes}]);setProposal(null);}}>Aplicar mudança</button><button onClick={()=>setProposal(null)}>Descartar</button></div></div>}
          {message&&<p role="alert" className="warning">{message}</p>}
          <small className="agentFoot">Inicie o serviço com <code>npm run dev:agent</code> e autentique o Codex no computador.</small>
        </div>
      </aside>
    </div>
  </div>;
}
