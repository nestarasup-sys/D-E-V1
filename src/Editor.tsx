import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {productionSchema} from './model/production';
import { Player, type PlayerRef } from '@remotion/player';
import { Documentary } from './video/Documentary';
import { useEditor } from './model/store';
import { projectDuration, sceneStart, type Scene, type Project, type Asset, type Lane, type MediaClip } from './model/project';
import type { Operation } from './model/operations';
import {parseSrt,exportSrt} from './model/captions';
import {ensureServiceCompatible} from './services/service-guard';
import {ShotTimeline} from './components/ShotTimeline';
import {LayerTimeline} from './components/LayerTimeline';
import {ShotInspector} from './components/ShotInspector';
import {CaptionInspector} from './components/CaptionInspector';
import {ChannelKitPanel} from './components/ChannelKitPanel';
import {investigationSchema,type Shot} from './model/shots';
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
export function Editor({onHome,syncStatus,onReload,onRegenerateVoice}:{
  onHome:()=>void;syncStatus:string;onReload?:()=>void;
  onRegenerateVoice?:(voice:{voice:string;rate:number;pauseMs:number})=>Promise<void>;
}) {
  const {project,selectedSceneId,select,apply,undo,redo,past,future} = useEditor();
  const player = useRef<PlayerRef>(null);
  const [message,setMessage] = useState('');
  const [selectedShotId,setSelectedShotId]=useState<string|null>(null);
  const [selectedLayerId,setSelectedLayerId]=useState<string|null>(null);
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
  const [rasterBusy,setRasterBusy] = useState(false);
  const [rasterReport,setRasterReport] = useState<{
    frames:number[];issues:Array<{frame:number;seconds?:number;code:string;severity:string;message:string;recommendation?:string}>;
    method:string;ocr?:{status:string;language:string;framesAnalyzed:number;error?:string};
  }|null>(null);
  const production=useMemo(()=>project.productionPlan?
    productionSchema.safeParse(project.productionPlan.source):null,[project.productionPlan]);
  const source=production?.success?production.data:null;
  const [voices,setVoices]=useState<Array<{name:string;culture:string;gender:string}>>([]);
  const [voiceName,setVoiceName]=useState('');
  const [voiceRate,setVoiceRate]=useState(1);
  const [voicePause,setVoicePause]=useState(350);
  const [ttsError,setTtsError]=useState('');
  const [ttsBusy,setTtsBusy]=useState(false);
  useEffect(()=>{
    if(!source)return;
    setVoiceName(source.voice.voice);setVoiceRate(source.voice.rate);setVoicePause(source.voice.pauseMs);
    void fetch(endpoint+'/v1/productions/voices').then(async response=>{
      const data=await response.json() as {voices?:Array<{name:string;culture:string;gender:string}>;error?:string};
      if(!response.ok)throw new Error(data.error||'Vozes locais indisponíveis');
      setVoices(data.voices||[]);
    }).catch(e=>setTtsError(e instanceof Error?e.message:'Falha ao consultar voz'));
  },[source?.voice.voice,source?.voice.rate,source?.voice.pauseMs,!!source]);
  async function regenerateNarration(){
    if(!onRegenerateVoice)return;
    if(!window.confirm('Gerar nova voz e atualizar os tempos das cenas e legendas? Os elementos continuam editáveis. O Dark Studio fará backup do projeto salvo.'))return;
    setTtsBusy(true);setTtsError('');
    try{await onRegenerateVoice({voice:voiceName,rate:voiceRate,pauseMs:voicePause});}
    catch(e){setTtsError(e instanceof Error?e.message:'Falha ao regenerar narrador');}
    finally{setTtsBusy(false);}
  }
  const {selectedClipId,selectClip}=useEditor();
  const selectedClip=project.clips.find(c=>c.id===selectedClipId)||null;
  const selectedShot=project.shots.find(s=>s.id===selectedShotId)||null;
  const [pexelsKey,setPexelsKey]=useState('');
  const [brollQuery,setBrollQuery]=useState('');
  const [brollBusy,setBrollBusy]=useState(false);
  const [brollError,setBrollError]=useState('');
  const [brollCandidates,setBrollCandidates]=useState<Array<{
    id:number;source:string;page:string;thumbnail:string;creator:string;
    durationSeconds:number;width:number;height:number;licenseUrl:string;
  }>>([]);
  useEffect(()=>{
    if(selectedShot?.mediaPlan?.query)setBrollQuery(selectedShot.mediaPlan.query);
  },[selectedShot?.id]);
  async function searchBroll(){
    if(brollQuery.trim().length<2){setBrollError('Informe a descrição da filmagem.');return;}
    setBrollBusy(true);setBrollError('');setBrollCandidates([]);
    try{
      const response=await fetch(endpoint+'/v1/broll/search?query='+encodeURIComponent(brollQuery),{
        headers:pexelsKey?{'X-Pexels-Key':pexelsKey}:{},
      });
      const data=await response.json() as {error?:string;candidates?:typeof brollCandidates};
      if(!response.ok)throw new Error(data.error||'Falha na pesquisa Pexels.');
      setBrollCandidates(data.candidates||[]);
      if(!data.candidates?.length)setBrollError('Nenhum resultado adequado. Mantenha animação procedural ou importe mídia manual.');
    }catch(e){setBrollError(e instanceof Error?e.message:'Erro ao pesquisar');}
    finally{setBrollBusy(false);}
  }
  async function attachBroll(videoId:number){
    if(!window.confirm('Você conferiu a filmagem, a licença do Pexels e sua adequação ao uso? Confirmar download para a biblioteca local?'))return;
    setBrollBusy(true);setBrollError('');
    try{
      const response=await fetch(endpoint+'/v1/broll/import',{method:'POST',
        headers:{'Content-Type':'application/json',...(pexelsKey?{'X-Pexels-Key':pexelsKey}:{})},
        body:JSON.stringify({videoId,licenseConfirmed:true}),
      });
      const data=await response.json() as {error?:string;asset?:Asset};
      if(!response.ok||!data.asset)throw new Error(data.error||'Download indisponível.');
      const asset=data.asset;
      if(selectedShot){
        if(asset.durationFrames!==undefined&&asset.durationFrames<selectedShot.durationFrames){
          apply([{type:'addAsset',asset}]);
          setBrollError('Filmagem importada, mas é curta demais para o plano. Ajuste o plano ou escolha outra mídia.');
        }else{
          apply([{type:'addAsset',asset},
            {type:'updateShot',shotId:selectedShot.id,changes:{kind:'video',assetId:asset.id,trimStartFrames:0}}]);
          setBrollError('Filmagem incorporada ao plano e à biblioteca; a narração foi preservada.');
        }
      }else{apply([{type:'addAsset',asset}]);setBrollError('Filmagem importada à biblioteca. Selecione um plano para aplicar.');}
      setBrollCandidates([]);
    }catch(e){setBrollError(e instanceof Error?e.message:'Não foi possível importar');}
    finally{setBrollBusy(false);}
  }

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
        await ensureServiceCompatible();
        const response=await fetch(`${endpoint}/v1/export/${exportId}`);
        if(!response.ok)throw new Error('Falha ao consultar exportação');
        const status: {state:string,progress:number,outputPath?:string,error?:string}=await response.json();
        if(cancelled)return;
        setExportProgress(status.progress);setExportState(status.state==='completed'?`Pronto: ${status.outputPath}`:['failed','interrupted'].includes(status.state)?`Erro: ${status.error}`:status.state);
        if(status.state!=='completed'&&status.state!=='failed'&&status.state!=='interrupted')timer=setTimeout(poll,1200);
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
        const response=await fetch(`${endpoint}/v1/media/import`,{method:'POST',headers:{'Content-Type':({
          woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf',
        } as Record<string,string>)[file.name.split('.').pop()?.toLowerCase()||'']||
          file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});
        const result: {asset?:Asset,error?:string}=await response.json();
        if(!response.ok||!result.asset)throw new Error(`${file.name}: ${result.error||'Falha ao importar'}`);
        const durationFrames=result.asset.kind==='font'?undefined:await mediaDuration(result.asset);
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
  async function exportArchive(){
    setMediaMessage('Preparando .darkstudio em disco (sem carregar vídeos na RAM)...');
    try{
      await ensureServiceCompatible();
      const response=await fetch(endpoint+'/v1/archive/prepare',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
      const body=await response.json() as {error?:string;url?:string;size?:number};
      if(!response.ok||!body.url)throw new Error(body.error||'Falha no pacote');
      const a=document.createElement('a');a.href=body.url;
      a.download=project.name.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,65)+'.darkstudio';
      document.body.append(a);a.click();a.remove();
      setMediaMessage('Pacote pronto: '+((body.size||0)/1024**3).toFixed(2)+
        ' GiB. Download direto do serviço local, com suporte a retomada por bytes.');
    }catch(e){setMediaMessage(e instanceof Error?e.message:'Falha no .darkstudio');}
  }
  function saveRasterReport(){
    if(!rasterReport)return;
    const blob=new Blob([JSON.stringify(rasterReport,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='darkstudio-qa-'+project.id+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  async function reviewRaster(){
    setRasterBusy(true);setRasterReport(null);
    try{
      await ensureServiceCompatible();
      const response=await fetch(endpoint+'/v1/qa/frames',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
      const data=await response.json() as {error?:string;frames:number[];
        issues:Array<{frame:number;seconds?:number;code:string;severity:string;message:string;recommendation?:string}>;method:string;
        ocr?:{status:string;language:string;framesAnalyzed:number;error?:string}};
      if(!response.ok)throw new Error(data.error||'Revisão de frames indisponível');
      setRasterReport(data);
    }catch(e){setMediaMessage(e instanceof Error?e.message:'Erro de QA raster');}
    finally{setRasterBusy(false);}
  }
  function updateAssetRights(asset:Asset,changes:Partial<Asset['rights']>){
    try{apply([{type:'updateAsset',assetId:asset.id,changes:{rights:{...asset.rights,...changes}}}]);
      setMediaMessage('');}
    catch(e){setMediaMessage(e instanceof Error?e.message:'Licença ou fonte inválida');}
  }
  async function exportVideo(){
    setExportState('Preparando...');setExportId(null);setExportProgress(0);
    try{
      await ensureServiceCompatible();
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
      motion:{x:[],y:[],scale:[],rotation:[],opacity:[]},investigation:investigationSchema.parse({}),layers:[],
      cameraPath:[],transitionIn:{type:'cut',durationFrames:12},
      framing:{fit:'cover',focusX:50,focusY:50,zoom:1,trimStartFrames:0},
    };
    try{
      const ops:Operation[]=project.visualMode==='shots'?[]:[{type:'setVisualMode',visualMode:'shots'}];
      apply([...ops,{type:'addShot',shot}]);
      setSelectedShotId(shot.id);setSelectedLayerId(null);setSelectedCaptionId(null);setMessage('');
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
    <header className="topbar"><div className="brand"><span className="brandmark">D</span><div><strong>DARK STUDIO</strong><small>AI PRODUCTION ENGINE v0.18</small></div></div>
      <div className="projectName"><span className="dot"/>{project.name}</div>
      <div className="topActions"><button onClick={onHome}>← Projetos</button><button onClick={undo} disabled={!past.length} title="Desfazer">↶ Desfazer</button><button onClick={redo} disabled={!future.length} title="Refazer">↷ Refazer</button><button onClick={()=>mediaFile.current?.click()} disabled={importing}>{importing?'Importando...':'Importar mídia'}</button><button className="primary" onClick={()=>void exportVideo()}>Exportar MP4</button><button onClick={()=>saveJson(project)}>Exportar JSON ↧</button><button onClick={()=>void exportArchive()}>Exportar .darkstudio</button></div>
      <input className="hidden" ref={captionFile} type="file" accept=".srt,.txt" onChange={e=>void importSubtitles(e)}/>
      <input className="hidden" ref={mediaFile} type="file" multiple accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mp3,.wav,.m4a,.ogg,.woff2,.woff,.ttf,.otf" onChange={uploadMedia}/>
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
      <div className="libraryNote"><b>ARQUIVOS DE MÍDIA E FONTES · {project.assets.length}</b><p>Importe imagens, vídeo e narração pelo serviço local. Depois adicione-os a uma trilha.</p>
      <div className="assetList">{project.assets.map(a=><div className="assetRow" key={a.id}><strong title={a.name}>{a.kind==='image'?'▣':a.kind==='video'?'▶':a.kind==='font'?'F':'♫'} {a.name}</strong><div className="assetActions">
      {a.kind==='font'?<span>Fonte local · selecione em Tipografia</span>:a.kind==='audio'?<><button onClick={()=>insertAsset(a,'narration')}>+ Narração</button><button onClick={()=>insertAsset(a,'music')}>+ Música</button><button onClick={()=>insertAsset(a,'sfx')}>+ Efeito</button></>:<button onClick={()=>insertAsset(a,'visual')}>+ Visual</button>}
        {a.kind!=='audio'&&<details><summary>Licença e atribuição · {a.rights.status}</summary>
          <div className="field"><label>Status da licença (confirmação humana)</label>
            <select value={a.rights.status} onChange={e=>updateAssetRights(a,{
              status:e.target.value as Asset['rights']['status']})}>
              <option value="unknown">Desconhecida</option>
              <option value="cleared">Autorizada / conferida</option>
              <option value="restricted">Restrita</option>
            </select></div>
          <div className="field"><label>Origem URL</label><input defaultValue={a.rights.sourceUrl}
            onBlur={e=>updateAssetRights(a,{sourceUrl:e.target.value})}/></div>
          <div className="field"><label>Autor</label><input defaultValue={a.rights.creator}
            onBlur={e=>updateAssetRights(a,{creator:e.target.value})}/></div>
          <div className="field"><label>Licença / termos</label><input defaultValue={a.rights.licenseName}
            onBlur={e=>updateAssetRights(a,{licenseName:e.target.value})}/></div>
          {a.kind==='font'&&<div className="field"><label>
            <input type="checkbox" checked={a.rights.redistributionAllowed===true}
              onChange={e=>updateAssetRights(a,{redistributionAllowed:e.target.checked})}/>
            Tenho autorização para redistribuir esta fonte no arquivo .darkstudio
          </label>
          <small>Sem essa autorização, a fonte permanece apenas neste computador. O empacotamento bloqueará sua inclusão.</small>
          </div>}
          <div className="field"><label>Atribuição</label><input defaultValue={a.rights.attribution}
            onBlur={e=>updateAssetRights(a,{attribution:e.target.value})}/></div>
        </details>}
      </div></div>)}</div>{mediaMessage&&<p className="warning" role="alert">{mediaMessage}</p>}</div>
      {source&&<div className="libraryNote">
        <b>NARRADOR AUTOMÁTICO · PRODUÇÃO JSON v0.18</b>
        <p>Áudio PCM real gerado no Windows para {source.beats.length} fala(s).
          As legendas seguem as durações medidas do WAV. Tempos por palavra ainda são aproximados.</p>
        <div className="field"><label>Voz instalada no Windows</label>
          <select value={voiceName} onChange={e=>setVoiceName(e.target.value)}>
            <option value="">Automática (preferir português brasileiro)</option>
            {voices.map(v=><option value={v.name} key={v.name}>{v.name} · {v.culture}</option>)}
          </select></div>
        <div className="twoCols">
          <div className="field"><label>Velocidade (-10 a 10)</label><input type="number"
            min={-10} max={10} step={1} value={voiceRate}
            onChange={e=>setVoiceRate(Number(e.target.value))}/></div>
          <div className="field"><label>Pausa entre cenas (ms)</label><input type="number"
            min={0} max={2500} step={50} value={voicePause}
            onChange={e=>setVoicePause(Number(e.target.value))}/></div>
        </div>
        <button disabled={ttsBusy||!onRegenerateVoice} className="wide"
          onClick={()=>void regenerateNarration()}>
          {ttsBusy?'Gerando narração e sincronizando...':'Regenerar voz e sincronização'}
        </button>
        {ttsError&&<p className="warning" role="alert">{ttsError}</p>}
      </div>}
      {source?.beats.some(b=>!!b.broll)&&<div className="libraryNote">
        <b>B-ROLL PLANEJADO PELO CHATGPT</b>
        <p>O aplicativo preservou pedidos de filmagem. Eles permanecem como cenas procedurais
          até você escolher e autorizar vídeos reais.</p>
        {source.beats.flatMap((beat,i)=>beat.broll?[<p key={i}>
          {i+1}. {beat.broll.query} · {beat.broll.licenseNote}</p>]:[])}
      </div>}
      <div className="libraryNote">
        <b>SMART B-ROLL · PESQUISA OFICIAL PEXELS</b>
        <p>Consulte clipes reais que ilustrem o roteiro, revise a licença e importe para um plano.
          A voz, os efeitos e os objetos sobrepostos continuam na timeline.</p>
        <div className="field"><label>Chave da API Pexels (opcional se configurada no serviço)</label>
          <input type="password" autoComplete="off" value={pexelsKey}
            placeholder="Chave usada apenas nesta sessão"
            onChange={e=>setPexelsKey(e.target.value)}/></div>
        <div className="field"><label>Filme desejado (selecionar um plano antes de aplicar)</label>
          <input value={brollQuery} maxLength={180} placeholder="Ex.: pessoa no supermercado"
            onChange={e=>setBrollQuery(e.target.value)}/></div>
        <div className="projectActions">
          <button disabled={brollBusy} onClick={()=>void searchBroll()}>
            {brollBusy?'Consultando / importando...':'Pesquisar filmagens'}</button>
          <a href="https://www.pexels.com/api/" target="_blank" rel="noreferrer">Obter chave oficial</a>
          <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">Verificar licença</a>
        </div>
        <small>Filmagens fornecidas pelo Pexels. Créditos do autor são preservados.
          O download exige confirmação humana da licença.</small>
        {brollError&&<p className="warning" role="status">{brollError}</p>}
        {brollCandidates.map(c=><div key={c.id} className="assetRow">
          <img src={c.thumbnail} alt={'Prévia de filme Pexels '+c.id}
            width="100" height="64" loading="lazy" style={{objectFit:'cover'}}/>
          <div><b>{c.creator}</b><small> {c.durationSeconds}s · {c.width}×{c.height}</small>
            <a href={c.page} target="_blank" rel="noreferrer">Abrir vídeo e conferir licença</a>
          </div>
          <button disabled={brollBusy} onClick={()=>void attachBroll(c.id)}>
            Conferi licença · importar</button>
        </div>)}
      </div>
      <div className="libraryNote"><b>LEGENDAS SINCRONIZADAS · {project.captions.length}</b>
        <p>Importe um SRT com timestamps (gerado por ferramenta local ou pelo Codex) e revise o timing em relação à narração.</p>
        <div className="projectActions"><button onClick={()=>captionFile.current?.click()}>Importar SRT</button>
          <button disabled={!project.captions.length} onClick={downloadSubtitles}>Exportar SRT</button></div>
        {captionNotice&&<p className="warning" role="status">{captionNotice}</p>}
      </div>
      </aside>
      <main className="stage"><div className="panelTitle">PRÉ-VISUALIZAÇÃO <span>1920 × 1080 • 30 FPS</span></div>
        <div className="preview"><Player ref={player} component={Documentary} inputProps={{project}} fps={project.fps} durationInFrames={Math.max(1,total)} compositionWidth={project.width} compositionHeight={project.height} controls clickToPlay style={{width:'100%',aspectRatio:'16/9'}}/></div>
        <div className="projectActions">
          <button disabled={rasterBusy} onClick={()=>void reviewRaster()}>
            {rasterBusy?'Analisando pixels renderizados...':'Revisar frames renderizados (QA)'}</button>
        </div>
        {rasterReport&&<div className="libraryNote" role="status">
          <strong>REVISÃO VISUAL AUTOMÁTICA · {rasterReport.frames.length} FRAMES</strong>
          <button onClick={saveRasterReport}>Salvar relatório completo JSON</button>
          <p>{rasterReport.method}</p>
          {rasterReport.ocr&&<p>OCR local: {rasterReport.ocr.status} · {rasterReport.ocr.framesAnalyzed} frames · {rasterReport.ocr.language}
            {rasterReport.ocr.error?' · '+rasterReport.ocr.error:''}</p>}
          <p>{rasterReport.issues.length} alerta(s) de revisão, sem garantir ausência de erros.</p>
          {rasterReport.issues.slice(0,24).map((issue,i)=><p key={i}>
            {issue.seconds!==undefined?issue.seconds.toFixed(3)+' s':'Frame '+issue.frame} · {issue.severity} · {issue.message}
            {issue.recommendation&&<small> Sugestão: {issue.recommendation}</small>}</p>)}
        </div>}
        <div className="projectSync" role="status"><span>{syncStatus}</span>{onReload&&<button onClick={onReload}>Recarregar projeto do disco</button>}</div>
        <div className="stageFooter"><div>● PREVIEW LOCAL <span>Cenas, clipes, narração e música pelo Remotion Player.</span></div><strong>{seconds(total,project.fps)} total</strong></div>
        {project.visualMode==='shots'&&<ShotTimeline shots={project.shots} totalFrames={total}
          selectedId={selectedShotId} onSelect={id=>{
            setSelectedShotId(id);setSelectedLayerId(null);setSelectedCaptionId(null);selectClip(null);
            const shot=project.shots.find(s=>s.id===id);
            if(shot)player.current?.seekTo(shot.startFrame);
          }}
          onEdit={(id,changes)=>{
            updateShot(id,changes);
            if(changes.startFrame!==undefined)player.current?.seekTo(changes.startFrame);
          }}/>}
        {selectedShot&&project.visualMode==='shots'&&<LayerTimeline
          shot={selectedShot} captions={project.captions} selectedId={selectedLayerId}
          onSelect={setSelectedLayerId}
          onEdit={changes=>updateShot(selectedShot.id,changes)}
          onSeek={frame=>player.current?.seekTo(frame)}/>}
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
          captions={project.captions} selectedLayerId={selectedLayerId} onSelectedLayer={setSelectedLayerId}
          onEdit={changes=>updateShot(selectedShot.id,changes)}
          onRemove={()=>{action([{type:'removeShot',shotId:selectedShot.id}]);setSelectedShotId(null);setSelectedLayerId(null);}}/>}
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
