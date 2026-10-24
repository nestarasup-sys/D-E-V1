import type {CSSProperties,ReactNode} from 'react';
import {Img} from 'remotion';
import type {Asset,Caption} from '../../model/project';
import type {SceneLayer} from '../../model/layers';
import {layerAtCaption} from '../../model/layers';
import {evaluateKeyframes} from '../../model/shots';
import {Character2D} from './Character2D';
import {Object2D} from './Object2D';
import {Scene2D} from './Scene2D';
import {Chart2D} from './Chart2D';

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function procedure(layer:SceneLayer,frame:number,progress:number){
  const t=frame/30,intensity=layer.behaviorIntensity;
  const result={dx:0,dy:0,scale:1,rotate:0,alpha:1};
  switch(layer.behavior){
    case 'float':result.dy=Math.sin(t*1.9+layer.x*.002)*11*intensity;break;
    case 'pulse':result.scale=1+Math.sin(t*3.8)*.04*intensity;break;
    case 'walk':result.dx=frame*.34*intensity;result.dy=Math.abs(Math.sin(t*11))*5;break;
    case 'wave':result.rotate=Math.sin(t*5)*2.7;break;
    case 'point':result.rotate=-2.5;break;
    case 'nod':result.dy=Math.sin(t*4)*3;break;
    case 'think':result.dy=Math.sin(t*.9)*5;break;
    case 'celebrate':result.scale=1+Math.sin(t*6)*.035;break;
    case 'orbit':result.rotate=t*20*intensity;break;
    case 'shake':result.dx=Math.sin(t*17)*6*intensity;break;
    case 'parallax':result.dx=Math.sin(t*.4)*17*intensity;break;
    case 'draw':result.alpha=clamp(progress*2);break;
    case 'typewriter':result.alpha=clamp(progress*3);break;
    case 'count':result.scale=.98+progress*.02;break;
    case 'grow':result.scale=.92+progress*.08;break;
    case 'stagger':result.alpha=clamp(progress*3);break;
    case 'slide-in':result.dx=(1-clamp(progress*5))*-45*intensity;break;
    case 'bounce':result.dy=-22*Math.abs(Math.sin(t*5))*Math.exp(-frame/120)*intensity;break;
  }
  return result;
}
function Shape({layer}:{layer:SceneLayer}){
  const gradient=layer.effects.gradient;
  const common:CSSProperties={height:'100%',width:'100%',
    background:gradient?`linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`:layer.color};
  const kind=layer.shapeType;
  if(kind==='circle')common.borderRadius='50%';
  if(kind==='ring'){common.background='transparent';common.border='20px solid '+layer.color;common.borderRadius='50%';}
  if(kind==='pill')common.borderRadius='120px';
  if(kind==='triangle')common.clipPath='polygon(50% 0,100% 100%,0 100%)';
  if(kind==='line'){common.height='6px';common.marginTop=layer.height/2;}
  return <div style={common}/>;
}
function Connector({layer,progress}:{layer:SceneLayer;progress:number}){
  const length=Math.max(1,layer.width-26);
  return <svg viewBox={'0 0 '+layer.width+' '+layer.height} width="100%" height="100%">
    <defs><marker id={'tip-'+layer.id} markerWidth="10" markerHeight="10" refX="7" refY="3"
      orient="auto" markerUnits="strokeWidth"><path d="M0 0 L0 6 L8 3Z" fill={layer.color}/></marker></defs>
    <path d={'M12 '+layer.height/2+' L'+(layer.width-14)+' '+layer.height/2}
      stroke={layer.color} strokeWidth={Math.max(4,Math.min(14,layer.height))}
      strokeLinecap="round" fill="none" strokeDasharray={length}
      strokeDashoffset={length*(1-progress)} markerEnd={'url(#tip-'+layer.id+')'}/>
  </svg>;
}
function Particles({layer,frame}:{layer:SceneLayer;frame:number}){
  const points=Array.from({length:28},(_,i)=>{
    const a=i*2.39996;
    const r=Math.sqrt((i+1)/28);
    const x=layer.width/2+Math.cos(a+frame*.007)*layer.width*.43*r;
    const y=layer.height/2+Math.sin(a+frame*.005)*layer.height*.43*r;
    return {x,y,r:4+(i*7)%15};
  });
  return <svg viewBox={'0 0 '+layer.width+' '+layer.height} width="100%" height="100%">
    {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.r}
      fill={i%3===0?'#ecf1f5':layer.color} opacity={.4+(i%5)*.12}/>)}
  </svg>;
}
function LayerContents({layer,elapsed,progress,asset}:{
  layer:SceneLayer;elapsed:number;progress:number;asset?:Asset;
}):ReactNode{
  switch(layer.kind){
    case 'text':{
      let label=layer.text;
      if(layer.behavior==='typewriter')
        label=label.slice(0,Math.max(1,Math.ceil(label.length*clamp(progress*5))));
      if(layer.behavior==='count'&&layer.value!==undefined)
        label=(layer.value*clamp(progress*2)).toLocaleString('pt-BR',{maximumFractionDigits:1})+
          (layer.unit?' '+layer.unit:'');
      const gradient=layer.effects.gradient;
      const words=label.split(/(\s+)/);
      const wordCount=words.filter(part=>part.trim().length>0).length;
      let seen=0;
      return <div style={{width:'100%',height:'100%',fontSize:layer.fontSize,
        fontFamily:'"'+layer.fontFamily+'", Arial, sans-serif',
        fontWeight:layer.fontWeight,lineHeight:layer.lineHeight,
        letterSpacing:layer.letterSpacing,textAlign:layer.textAlign,
        whiteSpace:'pre-wrap',overflowWrap:'anywhere',
        textShadow:layer.effects.shadowBlur>0?undefined:'0 3px 16px #0008',
        color:gradient?'transparent':layer.color,
        backgroundImage:gradient?
          `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`:undefined,
        backgroundClip:gradient?'text':undefined,WebkitBackgroundClip:gradient?'text':undefined,
        WebkitTextStroke:layer.strokeWidth>0?`${layer.strokeWidth}px ${layer.strokeColor}`:undefined,
        display:'flex',alignItems:'center',overflow:'hidden'}}>
        <div style={{width:'100%'}}>{layer.behavior==='word-reveal'?
          words.map((part,i)=>{
            if(!part.trim())return <span key={i}>{part}</span>;
            const index=seen++;
            return <span key={i} style={{opacity:clamp(progress*wordCount*1.6-index),
              display:'inline-block'}}>{part}</span>;
          }):label}</div>
      </div>;
    }
    case 'character':return <Character2D layer={layer} frame={elapsed}/>;
    case 'object':return <Object2D layer={layer} frame={elapsed}/>;
    case 'building':return <Object2D layer={{...layer,objectType:'home'}} frame={elapsed}/>;
    case 'scene':return <Scene2D layer={layer} frame={elapsed}/>;
    case 'chart':return <Chart2D layer={layer} progress={progress}/>;
    case 'shape':return <Shape layer={layer}/>;
    case 'vector':return <svg viewBox={'0 0 '+layer.width+' '+layer.height} width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet">
      {layer.effects.gradient&&<defs><linearGradient id={'gradient-'+layer.id}>
        <stop offset="0%" stopColor={layer.effects.gradient.from}/>
        <stop offset="100%" stopColor={layer.effects.gradient.to}/>
      </linearGradient></defs>}
      <path d={layer.vectorPath} fill={layer.effects.gradient?
        'url(#gradient-'+layer.id+')':layer.color} stroke={layer.strokeWidth>0?layer.strokeColor:'none'}
        strokeWidth={layer.strokeWidth}/>
    </svg>;
    case 'connector':return <Connector layer={layer} progress={clamp(progress*3)}/>;
    case 'particles':return <Particles layer={layer} frame={elapsed}/>;
    case 'image':return asset?.kind==='image'?<Img src={asset.url} style={{
      width:'100%',height:'100%',objectFit:layer.framing.fit,
      objectPosition:layer.framing.focusX+'% '+layer.framing.focusY+'%',
      transform:'scale('+layer.framing.zoom+')',transformOrigin:'center'
    }}/>:null;
  }
}
export function AnimatedLayer({layer,frame,shotStart,captions,assets,allLayers}:{
  layer:SceneLayer;frame:number;shotStart:number;
  captions:readonly Caption[];assets:ReadonlyMap<string,Asset>;
  allLayers?:readonly SceneLayer[];
}){
  const start=layerAtCaption(layer,shotStart,captions);
  const elapsed=frame-start;
  if(elapsed<0||elapsed>=layer.durationFrames)return null;
  const progress=clamp(elapsed/Math.max(1,layer.durationFrames-1));
  const behavior=procedure(layer,elapsed,progress);
  const x=evaluateKeyframes(layer.motion.x,elapsed,0)+layer.x+behavior.dx;
  const y=evaluateKeyframes(layer.motion.y,elapsed,0)+layer.y+behavior.dy;
  const scale=evaluateKeyframes(layer.motion.scale,elapsed,1)*behavior.scale;
  const rotation=evaluateKeyframes(layer.motion.rotation,elapsed,0)+behavior.rotate;
  const opacity=evaluateKeyframes(layer.motion.opacity,elapsed,1)*behavior.alpha;
  const fx=layer.effects;
  const mask=fx.mask==='circle'?'circle(50% at 50% 50%)':
    fx.mask==='ellipse'?'ellipse(50% 50% at 50% 50%)':undefined;
  const filters=[
    fx.blur>0?`blur(${fx.blur}px)`:'',
    fx.shadowBlur>0?`drop-shadow(${fx.shadowX}px ${fx.shadowY}px ${fx.shadowBlur}px ${fx.shadowColor})`:'',
  ].filter(Boolean).join(' ');
  const style:CSSProperties={
    position:'absolute',left:x,top:y,width:layer.width,height:layer.height,zIndex:layer.zIndex,
    transform:'rotate('+rotation+'deg) scale('+scale+')',
    transformOrigin:'center center',opacity,
    overflow:fx.radius>0||mask?'hidden':'visible',pointerEvents:'none',
    borderRadius:fx.radius,clipPath:mask,filter:filters||undefined,
    contain:layer.kind==='scene'?'paint':undefined,
  };
  return <div style={style} aria-label={layer.name}>
    {layer.kind==='group'?
      allLayers?.filter(child=>child.parentId===layer.id).sort((a,b)=>a.zIndex-b.zIndex)
        .map(child=><AnimatedLayer key={child.id} layer={child} frame={elapsed}
          shotStart={shotStart} captions={captions} assets={assets} allLayers={allLayers}/>) :
      <LayerContents layer={layer} elapsed={elapsed} progress={progress}
        asset={layer.assetId?assets.get(layer.assetId):undefined}/>}
  </div>;
}
