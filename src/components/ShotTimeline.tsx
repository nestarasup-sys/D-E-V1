import {useRef,useState,type PointerEvent} from 'react';
import {retimeMotion,type Shot} from '../model/shots';

type Mode='move'|'trim-start'|'trim-end';
interface Drag{shot:Shot;mode:Mode;clientX:number;width:number}
interface Span{startFrame:number;durationFrames:number}
export function ShotTimeline({shots,totalFrames,selectedId,onSelect,onEdit}:{
  shots:Shot[];totalFrames:number;selectedId:string|null;onSelect:(id:string)=>void;
  onEdit:(shotId:string,changes:Partial<Omit<Shot,'id'>>)=>void;
}){
  const rail=useRef<HTMLDivElement>(null);
  const drag=useRef<Drag|null>(null);
  const [preview,setPreview]=useState<{id:string;span:Span}|null>(null);
  const sorted=[...shots].sort((a,b)=>a.startFrame-b.startFrame||a.zIndex-b.zIndex);
  const ticks=Array.from({length:Math.floor(totalFrames/150)+1},(_,i)=>i*150);
  function begin(e:PointerEvent<HTMLButtonElement>,shot:Shot){
    e.preventDefault();e.stopPropagation();onSelect(shot.id);
    const width=rail.current?.getBoundingClientRect().width??0;
    if(width<10)return;
    const edge=(e.target as HTMLElement).dataset.edge;
    const mode:Mode=edge==='start'?'trim-start':edge==='end'?'trim-end':'move';
    drag.current={shot,mode,clientX:e.clientX,width};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function measure(clientX:number):Span|null{
    const current=drag.current;
    if(!current)return null;
    const change=Math.round((clientX-current.clientX)/current.width*totalFrames);
    const {startFrame:start,durationFrames:duration}=current.shot;
    if(current.mode==='move')return {startFrame:Math.max(0,Math.min(totalFrames-duration,start+change)),durationFrames:duration};
    if(current.mode==='trim-start'){
      const newStart=Math.max(0,Math.min(start+duration-1,start+change));
      return {startFrame:newStart,durationFrames:start+duration-newStart};
    }
    const newEnd=Math.min(totalFrames,Math.max(start+1,start+duration+change));
    return {startFrame:start,durationFrames:newEnd-start};
  }
  function move(e:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const span=measure(e.clientX);
    if(span)setPreview({id:drag.current.shot.id,span});
  }
  function release(e:PointerEvent<HTMLDivElement>){
    const current=drag.current;
    const span=measure(e.clientX);
    drag.current=null;setPreview(null);
    if(!current||!span)return;
    const changes:Partial<Omit<Shot,'id'>>={};
    if(span.startFrame!==current.shot.startFrame)changes.startFrame=span.startFrame;
    if(span.durationFrames!==current.shot.durationFrames){
      changes.durationFrames=span.durationFrames;
      changes.motion=retimeMotion(current.shot.motion,current.shot.durationFrames,span.durationFrames);
    }
    if(Object.keys(changes).length)onEdit(current.shot.id,changes);
  }
  return <section className="shotTimeline">
    <div className="shotTimelineHeading"><strong>PLANOS VISUAIS EDITÁVEIS</strong>
      <small>Arraste para mover. Puxe as alças laterais para cortar. Narração e legendas permanecem no tempo original.</small></div>
    <div className="shotRuler">{ticks.map(f=><span key={f} style={{left:(f/totalFrames*100)+'%'}}>{f/30}s</span>)}</div>
    <div ref={rail} className="shotRail" onPointerMove={move} onPointerUp={release} onPointerCancel={()=>{drag.current=null;setPreview(null);}}>
      {sorted.map((shot,i)=>{
        const display=preview?.id===shot.id?preview.span:shot;
        return <button type="button" key={shot.id}
          className={'shotBlock '+(selectedId===shot.id?'shotBlockActive':'')}
          style={{left:(display.startFrame/totalFrames*100)+'%',width:(display.durationFrames/totalFrames*100)+'%',
            backgroundColor:shot.accentColor+'55',borderColor:shot.accentColor}}
          title={'Plano '+(i+1)+' — '+shot.title+' ('+(display.startFrame/30).toFixed(2)+' s / '+(display.durationFrames/30).toFixed(2)+' s)'}
          onPointerDown={e=>begin(e,shot)}
          onClick={e=>e.preventDefault()}>
          <span className="shotHandle" data-edge="start" title="Arraste para cortar o início"/>
          <span className="shotLabel">{String(i+1).padStart(2,'0')} · {shot.title}</span>
          <span className="shotHandle" data-edge="end" title="Arraste para cortar o fim"/>
        </button>;
      })}
    </div>
  </section>;
}
