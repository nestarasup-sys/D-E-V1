import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Documentary } from './video/Documentary';
import { useEditor } from './model/store';
import { projectDuration, sceneStart, type Scene, type Project, type Asset, type Lane, type MediaClip } from './model/project';
import type { Operation } from './model/operations';
import {parseSrt,exportSrt} from './model/captions';
import {ShotTimeline} from './components/ShotTimeline';
import {ShotInspector} from './components/ShotInspector';
import {CaptionInspector} from './components/CaptionInspector';
import {ChannelKitPanel} from './components/ChannelKitPanel';
import type {Shot} from './model/shots';
import {EvidencePanel} from './components/EvidencePanel';

const endpoint = 'http://127.0.0.1:4317';
const seconds = (frames:number, fps:number) => `${Math.floor(frames/fps/60).toString().padStart(2,'0')}:${Math.floor((frames/fps)%60).toString().padStart(2,'0')}`;
function saveJson(project:Project) {
  const blob = new Blob([JSON.stringify(project,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');a.href = url;a.download = 'dark-studio-project.json';a.click();
  URL.revokeObjectURL(url);
}
function newScene(after:Scene):Scene {
  return {...after, id:`scene-${crypto.randomUUID()}`, title:'NOVA CENA', productionNotes:'', subtitle:'Edite este texto no painel à direita.', kicker:'NOVO BLOCO', imageUrl:''};
}
export function Editor({onHome,syncStatus,onReload}:{onHome:()=>void,syncStatus:string,onReload?:()=>void}) {
  const {project,selectedSceneId,select,apply,undo,redo,past,future} = useEditor();
  const player = useRef<PlayerRef>(null);
  const [message,setMessage] = useState('');
  const [selectedShotId,setSelectedShotId]=useState<string|null>(null);
  const [selectedCaptionId,setSelectedCaptionId]=useState<string|null>(null);
  const [imageDraft,setImageDraft] = useState('');
  const [importing,setImporting] = useState(false);
  const [exportId,setExportId] = useState<string|null>(null);
  const [exportState,setExportState] = useState('');
  const [exportProgress,setExportProgress] = useState(0);
  const mediaFile = useRef<HTMLInputElement>(null);
  const captionFile = useRef<HTMLInputElement>(null);
  const [captionNotice,setCaptionNotice] = useState('');
  const [mediaMessage,setMediaMessage] = useState('');
  const {selectedClipId,selectClip}=useEditor();
  const selectedClip=project.clips.find(c=>c.id===selectedClipId)||null;
  const selectedShot=project.shots.find(s=>s.id===selectedShotId)||null;
  const selectedCaption=project.captions.find(c=>c.id===selectedCaptionId)||null;
  const clipAsset=selectedClip?project.assets.find(a=>a.id===selectedClip.assetId):null;
  const selectedIndex = Math.max(0,project.scenes.findIndex(s=>s.id===selectedSceneId));
  const scene = project.scenes[selectedIndex];
  useEffect(()=>setImageDraft(scene.imageUrl || ''),[scene.id,scene.imageUrl]);
  const total = useMemo(()=>projectDuration(project),[project]);
  useEffect(()=>{
    if(!exportId)return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;
    async function poll(){
      try{
        const response=await fetch(`${endpoint}/v1/export/${exportId}`);
        if(!response.ok)throw new Error('Falha ao consultar exportação');
        const status: {state:string,progress:number,outputPath?:string,error?:string}=await response.json();
        if(cancelled)return;
        setExportProgress(status.progress);setExportState(status.state==='completed'?`Pronto: ${status.outputPath}`:status.state==='failed'?`Erro: ${status.error}`:status.state);
        if(status.state!=='completed'&&status.state!=='failed')timer=setTimeout(poll,1200);
      }catch(e){if(!cancelled)setExportState(e instanceof Error?e.message:'Falha ao consultar');}
    }
    void poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[exportId]);
  async function importSubtitles(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setCaptionNotice('');
    try{
      const captions=parseSrt(await file.text(),project.fps,projectDuration(project),()=>crypto.randomUUID());
      if(project.captions.length&&!window.confirm('Substituir as legendas atuais por '+captions.length+' trechos do SRT? Você pode desfazer.'))return;
      apply([{type:'replaceCaptions',captions}]);
      setCaptionNotice(captions.length+' legendas sincronizadas importadas. O áudio permanece inalterado.');
    }catch(e){setCaptionNotice(e instanceof Error?e.message:'Arquivo SRT inválido');}
  }
  function downloadSubtitles(){
    const blob=new Blob([exportSrt(project.captions,project.fps)],{type:'application/x-subrip;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='dark-studio-legendas.srt';a.click();URL.revokeObjectURL(url);
  }
  async function uploadMedia(event:ChangeEvent<HTMLInputElement>){
    const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length)return;
    setImporting(true);setMediaMessage('');
    try{
      for(const file of files){
        const response=await fetch(`${endpoint}/v1/media/import`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});
        const result: {asset?:Asset,error?:string}=await response.json();
        if(!response.ok||!result.asset)throw new Error(`${file.name}: ${result.error||'Falha ao importar'}`);
        const durationFrames=await mediaDuration(result.asset);
        const asset={...result.asset,...(durationFrames?{durationFrames}:{})};
        apply([{type:'addAsset',asset}]);
      }
      setMediaMessage(`${files.length} arquivo(s) importado(s). Clique em um item para colocá-lo na timeline.`);
    }catch(e){setMediaMessage(e instanceof Error?e.message:'Falha ao importar');}
    finally{setImporting(false);}
  }
  async function mediaDuration(asset:Asset):Promise<number|undefined>{
    if(asset.kind==='image')return undefined;
    return new Promise(resolve=>{
      const el=document.createElement(asset.kind==='video'?'video':'audio');
      const timer=setTimeout(()=>{el.removeAttribute('src');resolve(undefined);},7000);
      el.preload='metadata';
      el.onloadedmetadata=()=>{clearTimeout(timer);const frames=Number.isFinite(el.duration)?Math.max(1,Math.floor(el.duration*30)):undefined;el.removeAttribute('src');resolve(frames);};
      el.onerror=()=>{clearTimeout(timer);resolve(undefined);};el.src=asset.url;
    });
  }
  function insertAsset(asset:Asset,lane:Lane){
    const start=sceneStart(project,selectedIndex);const available=total-start;
    const duration=Math.max(1,Math.min(available,asset.durationFrames|| (asset.kind==='audio'?available:scene.durationFrames)));
    const clip:MediaClip={id:crypto.randomUUID(),assetId:asset.id,lane,startFrame:start,durationFrames:duration,trimStartFrames:0,volume:lane==='music'?0.25:1,volumeKeyframes:[]};
    try{apply([{type:'addClip',clip}]);selectClip(clip.id);player.current?.seekTo(start);setMediaMessage('Clipe adicionado; selecione-o na timeline para ajustar.');}
    catch(e){setMediaMessage(e instanceof Error?e.message:'Não foi possível adicionar o clipe');}
  }
  function updateClip(changes:Partial<Omit<MediaClip,'id'|'assetId'>>){
    if(!selectedClip)return;try{apply([{type:'updateClip',clipId:selectedClip.id,changes}]);setMediaMessage('');}
    catch(e){setMediaMessage(e instanceof Error?e.message:'Propriedades inválidas');}
  }
  async function exportVideo(){
    setExportState('Preparando...');setExportId(null);setExportProgress(0);
    try{
      const response=await fetch(`${endpoint}/v1/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
      const result: {id?:string,error?:string}=await response.json();if(!response.ok||!result.id)throw new Error(result.error||'Falha ao iniciar exportação');
      setExportId(result.id);
    }catch(e){setExportState(e instanceof Error?e.message:'Falha ao exportar');}
  }
  function update(changes:Partial<Omit<Scene,'id'>>) {
    try {apply([{type:'updateScene',sceneId:scene.id,changes}]);setMessage('');}
    catch (e) {setMessage(e instanceof Error?e.message:String(e));}
  }
  function action(ops:Operation[]) {
    try {apply(ops);setMessage('');}
    catch (e) {setMessage(e instanceof Error?e.message:String(e));}
  }
  function updateShot(id:string,changes:Partial<Omit<Shot,'id'>>){
    try{apply([{type:'updateShot',shotId:id,changes}]);setMessage('');}
    catch(e){setMessage(e instanceof Error?e.message:'Plano inválido. Verifique início, duração e keyframes.');}
  }
  function addShot(){
    const start=sceneStart(project,selectedIndex);
    const duration=Math.max(1,Math.min(105,total-start));
    const shot:Shot={
      id:crypto.randomUUID(),kind:'graphic',style:'headline',startFrame:start,durationFrames:duration,
      trimStartFrames:0,zIndex:1,title:'NOVO PLANO',subtitle:'Edite este plano na timeline.',
      kicker:'DARK STUDIO',accentColor:project.channelKit.accentColor,backgroundColor:'#111e2c',
      motion:{x:[],y:[],scale:[],rotation:[],opacity:[]},
    };
    try{
      const ops:Operation[]=project.visualMode==='shots'?[]:[{type:'setVisualMode',visualMode:'shots'}];
      apply([...ops,{type:'addShot',shot}]);
      setSelectedShotId(shot.id);setSelectedCaptionId(null);setMessage('');
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao criar plano');}
  }
  function editVolumeKeyframe(index:number,changes:Partial<MediaClip['volumeKeyframes'][number]>){
    if(!selectedClip)return;
    const next=selectedClip.volumeKeyframes.map((kf,i)=>i===index?{...kf,...changes}:kf).sort((a,b)=>a.frame-b.frame);
    updateClip({volumeKeyframes:next});
  }
  function addVolumeKeyframe(){
    if(!selectedClip)return;
    const last=selectedClip.durationFrames-1;
    const occupied=new Set(selectedClip.volumeKeyframes.map(k=>k.frame));
    const target=Math.round(last/2);
    let frame=target;
    while(frame<=last&&occupied.has(frame))frame++;
    if(frame>last)frame=Array.from({length:last+1},(_,i)=>i).find(i=>!occupied.has(i))??-1;
    if(frame<0)return;
    updateClip({volumeKeyframes:[...selectedClip.volumeKeyframes,
      {frame,value:selectedClip.volume,easing:'ease-in-out' as const}].sort((a,b)=>a.frame-b.frame)});
  }
  function setVolumeFade(kind:'in'|'out'|'reset'){
    if(!selectedClip)return;
    const last=selectedClip.durationFrames-1;
    const fade=Math.min(18,last);
    const keyframes=kind==='reset'?[]:kind==='in'?
      [{frame:0,value:0,easing:'ease-out' as const},{frame:fade,value:selectedClip.volume,easing:'linear' as const}]:
      [{frame:Math.max(0,last-fade),value:selectedClip.volume,easing:'ease-in' as const},
        {frame:last,value:0,easing:'linear' as const}];
    updateClip({volumeKeyframes:keyframes});
  }
  function jumpTo(index:number) {select(project.scenes[index].id);player.current?.seekTo(sceneStart(project,index));}
  return <div className="shell">
    <header className="topbar"><div className="brand"><span className="brandmark">D</span><div><strong>DARK STUDIO</strong><small>INVESTIGATIVE EDITOR vNEXT</small></div></div>
      <div className="projectName"><span className="dot"/>{project.name}</div>
      <div className="topActions"><button onClick={onHome}>← Projetos</button><button onClick={undo} disabled={!past.length} title="Desfazer">↶ Desfazer</button><button onClick={redo} disabled={!future.length} title="Refazer">↷ Refazer</button><button onClick={()=>mediaFile.current?.click()} disabled={importing}>{importing?'Importando...':'Importar mídia'}</button><button className="primary" onClick={()=>void exportVideo()}>Exportar MP4</button><button onClick={()=>saveJson(project)}>Exportar JSON ↧</button></div>
      <input className="hidden" ref={captionFile} type="file" accept=".srt,.txt" onChange={e=>void importSubtitles(e)}/>
      <input className="hidden" ref={mediaFile} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mp3,.wav,.m4a,.ogg" onChange={uploadMedia}/>
    </header>
    <div className="workspace">
      <aside className="library"><div className="panelTitle">BIBLIOTECA DE CENAS <span>{project.scenes.length}</span></div>
      <p className="help">Selecionar uma cena também posiciona o vídeo na timeline.</p>
      <div className="scenes">{project.scenes.map((s,i)=><button key={s.id} className={`sceneCard ${selectedSceneId===s.id?'selected':''}`} onClick={()=>jumpTo(i)}>
        <div className="sceneIndex">{String(i+1).padStart(2,'0')} <span>{seconds(s.durationFrames,project.fps)}</span></div>
        <strong>{s.title}</strong><small>{s.kind==='stat'?'Gráfico / dado':s.kind==='quote'?'Citação':'Título / abertura'}</small></button>)}</div>
      <button className="wide dashed" onClick={()=>{const added=newScene(scene);action([{type:'addScene',scene:added,afterId:scene.id}]);select(added.id);}}>＋ Adicionar cena</button>
      <button className="wide dashed" onClick={addShot}>＋ Adicionar plano na cena</button>
      {project.visualMode==='shots'&&<button className="wide" onClick={()=>{
        if(window.confirm('Exibir o modo antigo de cartões? Os planos serão preservados, mas não aparecerão no preview até retornar ao modo Planos.'))action([{type:'setVisualMode',visualMode:'legacy'}]);
      }}>Visualização antiga de cartões</button>}
      {project.visualMode==='legacy'&&project.shots.length>0&&<button className="wide" onClick={()=>{
        action([{type:'setVisualMode',visualMode:'shots'}]);
      }}>Visualização por planos</button>}
      {project.chapters.length>0&&<div className="libraryNote"><b>CAPÍTULOS · {project.chapters.length}</b>
        {project.chapters.map(ch=><p key={ch.id}>{ch.title}</p>)}
      </div>}
      <div className="libraryNote"><b>ARQUIVOS DE MÍDIA · {project.assets.length}</b><p>Importe imagens, vídeo e narração pelo serviço local. Depois adicione-os a uma trilha.</p>
      <div className="assetList">{project.assets.map(a=><div className="assetRow" key={a.id}><strong title={a.name}>{a.kind==='image'?'▣':a.kind==='video'?'▶':'♫'} {a.name}</strong><div className="assetActions">
      {a.kind==='audio'?<><button onClick={()=>insertAsset(a,'narration')}>+ Narração</button><button onClick={()=>insertAsset(a,'music')}>+ Música</button><button onClick={()=>insertAsset(a,'sfx')}>+ Efeito</button></>:<button onClick={()=>insertAsset(a,'visual')}>+ Visual</button>}
      </div></div>)}</div>{mediaMessage&&<p className="warning" role="alert">{mediaMessage}</p>}</div>
      <div className="libraryNote"><b>LEGENDAS SINCRONIZADAS · {project.captions.length}</b>
        <p>Importe um SRT com timestamps (gerado por ferramenta local ou pelo Codex) e revise o timing em relação à narração.</p>
        <div className="projectActions"><button onClick={()=>captionFile.current?.click()}>Importar SRT</button>
          <button disabled={!project.captions.length} onClick={downloadSubtitles}>Exportar SRT</button></div>
        {captionNotice&&<p className="warning" role="status">{captionNotice}</p>}
      </div>
      </aside>
      <main className="stage"><div className="panelTitle">PRÉ-VISUALIZAÇÃO <span>1920 × 1080 • 30 FPS</span></div>
        <div className="preview"><Player ref={player} component={Documentary} inputProps={{project}} fps={project.fps} durationInFrames={Math.max(1,total)} compositionWidth={project.width} compositionHeight={project.height} controls clickToPlay style={{width:'100%',aspectRatio:'16/9'}}/></div>
        <div className="projectSync" role="status"><span>{syncStatus}</span>{onReload&&<button onClick={onReload}>Recarregar projeto do disco</button>}</div>
        <div className="stageFooter"><div>● PREVIEW LOCAL <span>Cenas, clipes, narração e música pelo Remotion Player.</span></div><strong>{seconds(total,project.fps)} total</strong></div>
        {project.visualMode==='shots'&&<ShotTimeline shots={project.shots} totalFrames={total}
          selectedId={selectedShotId} onSelect={id=>{
            setSelectedShotId(id);setSelectedCaptionId(null);selectClip(null);
            const shot=project.shots.find(s=>s.id===id);
            if(shot)player.current?.seekTo(shot.startFrame);
          }}
          onEdit={(id,changes)=>{
            updateShot(id,changes);
            if(changes.startFrame!==undefined)player.current?.seekTo(changes.startFrame);
          }}/>}
        <div className="timelineTop"><strong>TIMELINE MULTITRILHA</strong><span>{project.clips.length} clipes · ajuste início e duração nas propriedades</span></div>
        <div className="timeline multiTimeline">
          <div className="track"><span className="trackLabel">CENAS</span><div className="clips">{project.scenes.map((s,i)=><button key={s.id} onClick={()=>jumpTo(i)} className={`clip ${s.id===scene.id?'active':''}`} style={{flex:s.durationFrames}} title={s.title}><span>{i+1}. {s.title}</span></button>)}</div></div>
          {(['visual','narration','music','sfx'] as const).map(lane=><div className="track" key={lane}><span className="trackLabel">{lane==='visual'?'VISUAL':lane==='narration'?'NARRAÇÃO':lane==='sfx'?'EFEITOS':'MÚSICA'}</span><div className={`laneRail lane-${lane}`}>
            {project.clips.filter(c=>c.lane===lane).map(c=>{const a=project.assets.find(item=>item.id===c.assetId);return <button key={c.id} title={a?.name||c.id} className={`mediaClip ${c.id===selectedClipId?'clipSelected':''}`} style={{left:`${c.startFrame/total*100}%`,width:`${c.durationFrames/total*100}%`}} onClick={()=>{selectClip(c.id);player.current?.seekTo(c.startFrame);}}><span>{a?.name||'Arquivo ausente'}</span></button>;})}
          </div></div>)}
        </div>
        {project.captions.length>0&&<div className="track captionTrack"><span className="trackLabel">LEGENDAS</span><div className="laneRail">
          {project.captions.map(c=><button key={c.id} className="captionTick"
            title={c.text} style={{left:(c.startFrame/total*100)+'%',width:((c.endFrame-c.startFrame)/total*100)+'%'}}
            onClick={()=>{setSelectedCaptionId(c.id);setSelectedShotId(null);selectClip(null);player.current?.seekTo(c.startFrame);}}>{c.text}</button>)}
        </div></div>}
        <div className="timelineHint">Clipes têm posição temporal independente das cenas. Clique para editar início, duração, corte e volume. Reordenação de cenas fica bloqueada enquanto houver mídia para preservar sincronização.</div>
        {exportState&&<div className="exportStatus" role="status"><strong>EXPORTAÇÃO MP4 · {exportState}</strong><progress max={1} value={exportProgress}/><small>Renderização local em processo separado, com Remotion e FFmpeg. Salvo em Vídeos/DarkStudio.</small></div>}
      </main>
      <aside className="inspector">
        {selectedShot&&<ShotInspector shot={selectedShot} assets={project.assets} evidence={project.evidence}
          onEdit={changes=>updateShot(selectedShot.id,changes)}
          onRemove={()=>{action([{type:'removeShot',shotId:selectedShot.id}]);setSelectedShotId(null);}}/>}
        {selectedCaption&&<CaptionInspector caption={selectedCaption}
          onEdit={changes=>action([{type:'updateCaption',captionId:selectedCaption.id,changes}])}
          onClose={()=>setSelectedCaptionId(null)}/>}
        <div className="panelTitle">PROPRIEDADES <span>{selectedClip?'CLIPE':'CENA '+(selectedIndex+1)}</span></div>
        {selectedClip&&<section className="clipInspector"><div className="clipTitle">{clipAsset?.name||'Mídia não encontrada'}</div>
          <div className="field"><label>Trilha</label><select value={selectedClip.lane} onChange={e=>updateClip({lane:e.target.value as Lane})}><option value="visual" disabled={clipAsset?.kind==='audio'}>Visual</option><option value="narration" disabled={clipAsset?.kind!=='audio'}>Narração</option><option value="music" disabled={clipAsset?.kind!=='audio'}>Música</option><option value="sfx" disabled={clipAsset?.kind!=='audio'}>Efeitos sonoros</option></select></div>
          <div className="field"><label>Início (segundos)</label><input type="number" min={0} max={total/project.fps} step="0.1" value={Number((selectedClip.startFrame/project.fps).toFixed(2))} onChange={e=>updateClip({startFrame:Math.round(Number(e.target.value)*project.fps)})}/></div>
          <div className="field"><label>Duração (segundos)</label><input type="number" min={1/project.fps} step="0.1" value={Number((selectedClip.durationFrames/project.fps).toFixed(2))} onChange={e=>updateClip({durationFrames:Math.max(1,Math.round(Number(e.target.value)*project.fps))})}/></div>
          {clipAsset?.kind!=='image'&&<div className="field"><label>Corte no início do arquivo (segundos)</label><input type="number" min={0} step="0.1" value={Number((selectedClip.trimStartFrames/project.fps).toFixed(2))} onChange={e=>updateClip({trimStartFrames:Math.max(0,Math.round(Number(e.target.value)*project.fps))})}/></div>}
          {clipAsset?.kind==='audio'&&<div className="field"><label>Volume {Math.round(selectedClip.volume*100)}%</label><input type="range" min={0} max={1} step={0.05} value={selectedClip.volume} onChange={e=>updateClip({volume:Number(e.target.value)})}/></div>}
          {clipAsset?.kind==='audio'&&<div className="field"><label>Curva de volume · {selectedClip.volumeKeyframes.length} keyframes</label>
            <div className="projectActions"><button onClick={()=>setVolumeFade('in')}>Fade in</button>
              <button onClick={()=>setVolumeFade('out')}>Fade out</button><button onClick={()=>setVolumeFade('reset')}>Sem fade</button></div>
            {selectedClip.volumeKeyframes.map((key,i)=><div className="kfRow" key={key.frame+'-'+i}>
              <label>Frame<input type="number" min={0} max={selectedClip.durationFrames-1} value={key.frame}
                onChange={e=>editVolumeKeyframe(i,{frame:Math.round(Number(e.target.value))})}/></label>
              <label>Volume<input type="number" step=".05" min={0} max={1} value={key.value}
                onChange={e=>editVolumeKeyframe(i,{value:Number(e.target.value)})}/></label>
              <label>Curva<select value={key.easing} onChange={e=>editVolumeKeyframe(i,{easing:e.target.value as typeof key.easing})}>
                <option value="linear">Linear</option><option value="ease-in">Acelera</option>
                <option value="ease-out">Desacelera</option><option value="ease-in-out">Suave</option></select></label>
              <button aria-label="Excluir keyframe de volume" onClick={()=>updateClip({volumeKeyframes:selectedClip.volumeKeyframes.filter((_,j)=>j!==i)})}>×</button>
            </div>)}
            <button disabled={selectedClip.volumeKeyframes.length>=40} onClick={addVolumeKeyframe}>+ Quadro-chave de volume</button>
          </div>}
          <div className="sceneActions"><button onClick={()=>{apply([{type:'removeClip',clipId:selectedClip.id}]);selectClip(null);}}>Excluir clipe</button><button onClick={()=>selectClip(null)}>Editar cena</button></div>
        </section>}
        <div className={selectedClip?'sceneInspectorMuted':''}>
        <div className="field"><label>Tipo de cena</label><select value={scene.kind} onChange={e=>update({kind:e.target.value as Scene['kind']})}><option value="title">Título</option><option value="stat">Estatística</option><option value="quote">Citação</option></select></div>
        <div className="field"><label>Chamada superior</label><input value={scene.kicker} maxLength={100} onChange={e=>update({kicker:e.target.value})}/></div>
        <div className="field"><label>Título principal</label><textarea rows={3} value={scene.title} maxLength={180} onChange={e=>update({title:e.target.value})}/></div>
        <div className="field"><label>Subtítulo</label><textarea rows={3} value={scene.subtitle} maxLength={400} onChange={e=>update({subtitle:e.target.value})}/></div>
        <div className="field"><label>Duração ({seconds(scene.durationFrames,30)})</label><input type="range" min="30" max="600" step="15" value={Math.min(scene.durationFrames,600)} onChange={e=>update({durationFrames:Number(e.target.value)})}/></div>
        <div className="twoCols"><div className="field"><label>Destaque</label><input type="color" value={scene.accentColor} onChange={e=>update({accentColor:e.target.value})}/></div><div className="field"><label>Fundo</label><input type="color" value={scene.backgroundColor} onChange={e=>update({backgroundColor:e.target.value})}/></div></div>
        <div className="field"><label>Imagem de fundo (URL; para exportar, prefira importar na biblioteca)</label><input placeholder="https://..." value={imageDraft} onChange={e=>setImageDraft(e.target.value)} onBlur={()=>{if(imageDraft!==scene.imageUrl)update({imageUrl:imageDraft});}}/></div>
        <div className="field"><label>Notas de produção / evidências</label><textarea rows={3} maxLength={500} value={scene.productionNotes||''} onChange={e=>update({productionNotes:e.target.value})} placeholder="Direção visual e evidências a verificar..."/></div>
        <div className="sceneActions"><button onClick={()=>action([{type:'moveScene',sceneId:scene.id,direction:'left'}])} disabled={selectedIndex===0}>← Mover</button><button onClick={()=>action([{type:'moveScene',sceneId:scene.id,direction:'right'}])} disabled={selectedIndex===project.scenes.length-1}>Mover →</button><button className="danger" disabled={project.scenes.length===1} onClick={()=>action([{type:'removeScene',sceneId:scene.id}])}>Excluir</button></div>
        <EvidencePanel sceneId={scene.id} evidence={project.evidence.filter(e=>e.sceneId===scene.id)} onOps={action}/>
        <ChannelKitPanel kit={project.channelKit} onChange={changes=>action([{type:'updateChannelKit',changes}])}/>
        </div>{message&&<p role="alert" className="warning">{message}</p>}
      </aside>
    </div>
  </div>;
}
