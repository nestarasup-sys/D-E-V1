import {useRef,useState,type PointerEvent} from 'react';
import type {Shot} from '../model/shots';
import {layerAtCaption,retimeLayer,type SceneLayer} from '../model/layers';
import type {Caption} from '../model/project';

type Mode='move'|'trim-left'|'trim-right';
interface Drag{layer:SceneLayer;mode:Mode;x:number;width:number}
export function LayerTimeline({shot,captions,selectedId,onSelect,onEdit,onSeek}:{
  shot:Shot;captions:Caption[];selectedId:string|null;
  onSelect:(id:string)=>void;onEdit:(changes:Partial<Omit<Shot,'id'>>)=>void;
  onSeek:(frame:number)=>void;
}){
  const ref=useRef<HTMLDivElement>(null);
  const drag=useRef<Drag|null>(null);
  const [ghost,setGhost]=useState<{id:string;start:number;duration:number}|null>(null);
  const sorted=[...shot.layers].sort((a,b)=>b.zIndex-a.zIndex);
  function begin(e:PointerEvent<HTMLButtonElement>,layer:SceneLayer){
    e.preventDefault();e.stopPropagation();
    onSelect(layer.id);
    onSeek(shot.startFrame+layerAtCaption(layer,shot.startFrame,captions));
    if(layer.cueCaptionId)return;
    const width=ref.current?.getBoundingClientRect().width??0;
    if(width<10)return;
    const mode=e.target instanceof HTMLElement?e.target.dataset.edge:undefined;
    drag.current={layer,mode:mode==='left'?'trim-left':mode==='right'?'trim-right':'move',
      x:e.clientX,width};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function measure(e:PointerEvent<HTMLDivElement>){
    const d=drag.current;if(!d)return null;
    const frames=Math.round((e.clientX-d.x)/d.width*shot.durationFrames);
    const snap=(value:number)=>e.shiftKey?Math.round(value/15)*15:value;
    const {startFrame:start,durationFrames:duration}=d.layer;
    if(d.mode==='move')return {start:snap(Math.max(0,Math.min(shot.durationFrames-duration,start+frames))),duration};
    if(d.mode==='trim-left'){
      const left=snap(Math.min(start+duration-1,Math.max(0,start+frames)));
      return {start:left,duration:start+duration-left};
    }
    const end=snap(Math.min(shot.durationFrames,Math.max(start+1,start+duration+frames)));
    return {start,duration:end-start};
  }
  function move(e:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const v=measure(e);
    if(v)setGhost({id:drag.current.layer.id,...v});
  }
  function release(e:PointerEvent<HTMLDivElement>){
    const d=drag.current;const next=measure(e);
    drag.current=null;setGhost(null);
    if(!d||!next)return;
    if(next.start===d.layer.startFrame&&next.duration===d.layer.durationFrames)return;
    const revised=retimeLayer(d.layer,next.duration);
    revised.startFrame=next.start;
    onEdit({layers:shot.layers.map(layer=>layer.id===d.layer.id?revised:layer)});
    onSeek(shot.startFrame+next.start);
  }
  if(!shot.layers.length)return null;
  return <section className="layerTimeline">
    <div className="panelTitle">TIMELINE DE ELEMENTOS · {shot.layers.length} CAMADAS</div>
    <p className="help">Arraste o elemento ou suas bordas. Segure Shift para aproximar de meio segundo.
      Elementos ligados a legendas têm o início sincronizado e são editados no inspetor.</p>
    <div className="layerTimeTracks" ref={ref}
      onPointerMove={move} onPointerUp={release}
      onPointerCancel={()=>{drag.current=null;setGhost(null);}}>
      {sorted.map(layer=>{
        const start=ghost?.id===layer.id?ghost.start:
          layerAtCaption(layer,shot.startFrame,captions);
        const length=ghost?.id===layer.id?ghost.duration:layer.durationFrames;
        return <div key={layer.id} className="layerTimeRow">
          <button aria-label={'Selecionar camada '+layer.name}
            className={'layerTimeClip '+(selectedId===layer.id?'layerTimeActive':'')}
            style={{left:(start/shot.durationFrames*100)+'%',
              width:(Math.min(length,shot.durationFrames-start)/shot.durationFrames*100)+'%',
              borderColor:layer.color,backgroundColor:layer.secondaryColor}}
            onPointerDown={e=>begin(e,layer)}>
            {!layer.cueCaptionId&&<span data-edge="left" className="layerTrimHandle"/>}
            <span className="layerTimeName">{layer.name}</span>
            {layer.cueCaptionId&&<span title="Sincronizado com legenda">♫</span>}
            {!layer.cueCaptionId&&<span data-edge="right" className="layerTrimHandle"/>}
          </button>
        </div>;
      })}
    </div>
  </section>;
}
