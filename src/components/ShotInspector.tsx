import {useState} from 'react';
import {motionPropertySchema,motionBounds,retimeMotion,retimeShotLayers,retimeCamera,type Shot,type MotionProperty,type Keyframe,type CameraPoint} from '../model/shots';
import type {Asset,Evidence,Caption} from '../model/project';
import {PresetBrowser} from './PresetBrowser';
import {LayerEditor} from './LayerEditor';
import {investigativeStyles} from '../model/shots';
import {InvestigationInspector} from './InvestigationInspector';

const names:Record<MotionProperty,string>={x:'Posição X (%)',y:'Posição Y (%)',scale:'Zoom (escala)',rotation:'Rotação (°)',opacity:'Opacidade'};
const properties=motionPropertySchema.options;
const seconds=(frames:number)=>(frames/30).toFixed(2);
export function ShotInspector({shot,assets,evidence,captions,selectedLayerId,onSelectedLayer,onEdit,onRemove}:{
  shot:Shot;assets:Asset[];evidence:Evidence[];captions:Caption[];
  selectedLayerId:string|null;onSelectedLayer:(id:string|null)=>void;
  onEdit:(changes:Partial<Omit<Shot,'id'>>)=>void;onRemove:()=>void;
}){
  const [property,setProperty]=useState<MotionProperty>('scale');
  const frames=shot.motion[property];
  function modify(next:Keyframe[]){
    onEdit({motion:{...shot.motion,[property]:next.sort((a,b)=>a.frame-b.frame)}});
  }
  function setFrame(index:number,changes:Partial<Keyframe>){
    const next=frames.map((f,i)=>i===index?{...f,...changes}:f);
    modify(next);
  }
  function add(){
    const occupied=new Set(frames.map(f=>f.frame));
    const center=Math.round((shot.durationFrames-1)/2);
    let frame=center;
    while(frame<shot.durationFrames&&occupied.has(frame))frame++;
    if(frame>=shot.durationFrames)frame=Array.from({length:shot.durationFrames},(_,i)=>i).find(i=>!occupied.has(i))??-1;
    if(frame<0)return;
    const defaultValue=property==='scale'?1:property==='opacity'?1:0;
    modify([...frames,{frame,value:defaultValue,easing:'ease-in-out'}]);
  }
  function preset(name:'zoom'|'pan'|'fade'|'reset'){
    if(name==='reset'){
      onEdit({motion:{x:[],y:[],scale:[],rotation:[],opacity:[]}});return;
    }
    const end=shot.durationFrames-1;
    if(name==='zoom')onEdit({motion:{...shot.motion,scale:[
      {frame:0,value:1,easing:'ease-in-out'},{frame:end,value:1.14,easing:'linear'}]}});
    if(name==='pan')onEdit({motion:{...shot.motion,x:[
      {frame:0,value:-5,easing:'ease-in-out'},{frame:end,value:5,easing:'linear'}]}});
    if(name==='fade')onEdit({motion:{...shot.motion,opacity:[
      {frame:0,value:0,easing:'ease-out'},{frame:Math.min(12,end),value:1,easing:'linear'}]}});
  }
  return <section className="shotInspector">
    <div className="panelTitle">PLANO SELECIONADO <span>{shot.id.slice(0,8)}</span></div>
    <div className="field"><label>Conteúdo / mídia</label>
      <select value={shot.assetId||''} onChange={e=>{
        const asset=assets.find(a=>a.id===e.target.value);
        onEdit({kind:asset?(asset.kind==='video'?'video':'image'):'graphic',assetId:asset?.id});
      }}>
        <option value="">Composição gráfica</option>
        {assets.filter(a=>a.kind!=='audio').map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}
      </select>
    </div>
    {shot.kind==='video'&&<div className="field"><label>Corte inicial do vídeo (segundos)</label>
      <input type="number" step=".1" min={0} value={seconds(shot.trimStartFrames)}
        onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value))onEdit({trimStartFrames:Math.max(0,Math.round(value*30))});}}/>
    </div>}
    {shot.kind!=='graphic'&&<div className="shotMotion">
      <div className="panelTitle">B-ROLL · CROP E LICENÇA</div>
      <div className="field"><label>Encaixe</label><select value={shot.framing.fit}
        onChange={e=>onEdit({framing:{...shot.framing,fit:e.target.value as 'cover'|'contain'}})}>
        <option value="cover">Preencher tela</option><option value="contain">Mostrar arquivo inteiro</option>
      </select></div>
      <div className="twoCols">{(['focusX','focusY','zoom'] as const).map(k=>
        <div className="field" key={k}><label>{k}</label>
        <input type="number" min={k==='zoom'?1:0} max={k==='zoom'?4:100}
          step={k==='zoom'?.05:1} value={shot.framing[k]}
          onChange={e=>onEdit({framing:{...shot.framing,[k]:Number(e.target.value)}})}/></div>)}</div>
      {shot.assetId&&<p className="help">Licença da mídia: {assets.find(a=>a.id===shot.assetId)?.rights.status||'desconhecida'}.
        Revise a origem na biblioteca antes de publicar.</p>}
      {shot.mediaPlan&&<p className="help">Direção de B-roll: {shot.mediaPlan.query} — {shot.mediaPlan.intendedUse}. Licença: {shot.mediaPlan.licenseNote}</p>}
    </div>}
    <div className="field"><label>Estilo de composição</label>
      <select disabled={shot.kind!=='graphic'} value={shot.style}
        onChange={e=>onEdit({style:e.target.value as Shot['style']})}>
        {(['headline','split','number','quote','chapter','timeline',...investigativeStyles] as const).map(style=>
          <option value={style} key={style}>{style}</option>)}
      </select>
    </div>
    <div className="field"><label>Título no plano</label>
      <textarea rows={2} maxLength={180} value={shot.title} onChange={e=>onEdit({title:e.target.value})}/></div>
    <div className="field"><label>Subtítulo</label><textarea rows={2} maxLength={400} value={shot.subtitle} onChange={e=>onEdit({subtitle:e.target.value})}/></div>
    <div className="twoCols"><div className="field"><label>Início (segundos)</label>
      <input type="number" step=".1" min={0} value={seconds(shot.startFrame)}
        onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value))onEdit({startFrame:Math.max(0,Math.round(value*30))});}}/>
    </div><div className="field"><label>Duração (segundos)</label>
      <input type="number" step=".1" min={1/30} value={seconds(shot.durationFrames)}
        onChange={e=>{
          const next=Math.max(1,Math.round(Number(e.target.value)*30));
          if(Number.isFinite(next))onEdit({durationFrames:next,motion:retimeMotion(shot.motion,shot.durationFrames,next),
            layers:retimeShotLayers(shot.layers,shot.durationFrames,next),
            cameraPath:retimeCamera(shot.cameraPath,shot.durationFrames,next),
            transitionIn:{...shot.transitionIn,durationFrames:Math.min(shot.transitionIn.durationFrames,next)}});
        }}/>
    </div></div>
    <div className="twoCols"><div className="field"><label>Cor de destaque</label>
      <input type="color" value={shot.accentColor} onChange={e=>onEdit({accentColor:e.target.value})}/>
    </div><div className="field"><label>Fundo</label>
      <input type="color" value={shot.backgroundColor} onChange={e=>onEdit({backgroundColor:e.target.value})}/>
    </div></div>
    {shot.kind==='graphic'&&investigativeStyles.some(s=>s===shot.style)&&
      <InvestigationInspector shot={shot} evidence={evidence} onEdit={onEdit}/>}
    <PresetBrowser shot={shot} onEdit={onEdit} onSelected={onSelectedLayer}/>
    <LayerEditor shot={shot} selectedId={selectedLayerId} onSelected={onSelectedLayer}
      assets={assets} captions={captions} evidence={evidence} onEdit={onEdit}/>
    <div className="shotMotion">
      <div className="panelTitle">MOTION ENGINE · CÂMERA E TRANSIÇÃO</div>
      <p className="help">Trajetória de câmera em pixels a partir do centro do canvas. A prévia e o MP4 usam os mesmos frames.</p>
      <div className="twoCols">
        <div className="field"><label>Entrada do plano</label>
          <select value={shot.transitionIn.type}
            onChange={e=>onEdit({transitionIn:{...shot.transitionIn,
              type:e.target.value as Shot['transitionIn']['type']}})}>
            <option value="cut">Corte seco</option><option value="fade">Fusão</option>
            <option value="slide-left">Deslizar</option><option value="wipe">Revelação</option>
          </select>
        </div>
        <div className="field"><label>Duração da transição (frames)</label>
          <input type="number" min={1} max={Math.min(90,shot.durationFrames)} step={1}
            value={shot.transitionIn.durationFrames}
            onChange={e=>onEdit({transitionIn:{...shot.transitionIn,
              durationFrames:Math.max(1,Math.min(90,shot.durationFrames,Math.round(Number(e.target.value))))}})}/>
        </div>
      </div>
      <div className="projectActions">
        <button disabled={shot.durationFrames<2} onClick={()=>onEdit({cameraPath:[
          {frame:0,x:0,y:0,zoom:1,rotation:0,easing:'ease-in-out'},
          {frame:shot.durationFrames-1,x:160,y:0,zoom:1.16,rotation:0,easing:'linear'},
        ]})}>Trajetória cinematográfica</button>
        <button onClick={()=>onEdit({cameraPath:[]})}>Câmera fixa</button>
      </div>
      {shot.cameraPath.map((point,i)=><div className="kfRow" key={'camera-'+i}>
        <label>Frame<input type="number" min={0} max={shot.durationFrames-1}
          value={point.frame} onChange={e=>{
            const points=shot.cameraPath.map((p,j)=>j===i?{...p,frame:Math.round(Number(e.target.value))}:p);
            onEdit({cameraPath:points.sort((a,b)=>a.frame-b.frame)});
          }}/></label>
        {(['x','y','zoom','rotation'] as const).map(k=>
          <label key={k}>{k}<input type="number" step={k==='zoom'?.05:1}
            min={k==='zoom'?.5:k==='rotation'?-45:k==='x'?-1920:-1080}
            max={k==='zoom'?4:k==='rotation'?45:k==='x'?1920:1080}
            value={point[k]} onChange={e=>onEdit({cameraPath:shot.cameraPath.map((p,j)=>j===i?
              {...p,[k]:Number(e.target.value)}:p)})}/></label>)}
        <button title="Remover ponto de câmera" onClick={()=>
          onEdit({cameraPath:shot.cameraPath.filter((_,j)=>j!==i)})}>×</button>
      </div>)}
      <button className="wide" disabled={shot.cameraPath.length>=24||
        shot.cameraPath.length>=shot.durationFrames} onClick={()=>{
        const used=new Set(shot.cameraPath.map(p=>p.frame));
        const frame=Array.from({length:shot.durationFrames},(_,i)=>i).find(i=>!used.has(i));
        if(frame===undefined)return;
        const point:CameraPoint={frame,x:0,y:0,zoom:1,rotation:0,easing:'ease-in-out'};
        onEdit({cameraPath:[...shot.cameraPath,point].sort((a,b)=>a.frame-b.frame)});
      }}>+ Ponto de câmera</button>
    </div>
    <div className="shotMotion"><div className="panelTitle">ANIMAÇÃO DO PLANO INTEIRO</div>
      <p className="help">Quadros relativos ao início deste plano (30 FPS). A curva pertence ao quadro-chave de partida.</p>
      <div className="projectActions">
        <button onClick={()=>preset('zoom')}>Zoom suave</button>
        <button onClick={()=>preset('pan')}>Panorâmica</button>
        <button onClick={()=>preset('fade')}>Fade-in</button>
        <button onClick={()=>preset('reset')}>Sem movimento</button>
      </div>
      <div className="field"><label>Propriedade</label><select value={property} onChange={e=>setProperty(e.target.value as MotionProperty)}>
        {properties.map(p=><option key={p} value={p}>{names[p]}</option>)}
      </select></div>
      {frames.map((key,i)=><div key={key.frame+'-'+i} className="kfRow">
        <label>Frame<input type="number" min={0} max={shot.durationFrames-1} step={1} value={key.frame}
          onChange={e=>setFrame(i,{frame:Math.round(Number(e.target.value))})}/></label>
        <label>Valor<input type="number" min={motionBounds[property][0]} max={motionBounds[property][1]} step={property==='scale'||property==='opacity'?.01:1}
          value={key.value} onChange={e=>setFrame(i,{value:Number(e.target.value)})}/></label>
        <label>Curva<select value={key.easing} onChange={e=>setFrame(i,{easing:e.target.value as Keyframe['easing']})}>
          <option value="linear">Linear</option><option value="ease-in">Acelera</option>
          <option value="ease-out">Desacelera</option><option value="ease-in-out">Suave</option>
        </select></label>
        <button aria-label="Excluir quadro-chave" onClick={()=>modify(frames.filter((_,j)=>j!==i))}>×</button>
      </div>)}
      <button className="wide" onClick={add} disabled={frames.length>=40||shot.durationFrames<=frames.length}>+ Quadro-chave</button>
    </div>
    <div className="sceneActions"><button className="danger" onClick={()=>{
      if(window.confirm('Excluir este plano da timeline? A narração não será movida.'))onRemove();
    }}>Excluir plano</button></div>
  </section>;
}
