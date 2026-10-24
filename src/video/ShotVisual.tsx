import {AbsoluteFill,Img,OffthreadVideo,useCurrentFrame} from 'remotion';
import type {CSSProperties} from 'react';
import type {Asset,Evidence} from '../model/project';
import {evaluateMotion,investigativeStyles,type Shot,type ChannelKit} from '../model/shots';
import {InvestigationVisual} from './InvestigationVisual';

const fonts:Record<ChannelKit['font'],string>={
  sans:'Arial, Helvetica, sans-serif',serif:'Georgia, Times New Roman, serif',mono:'Consolas, Courier New, monospace',
};
const headlineStyle:CSSProperties={fontSize:116,fontWeight:900,lineHeight:1.04,letterSpacing:-3,color:'#f7f8fc',margin:0};
const subStyle:CSSProperties={fontSize:37,color:'#d3dee9',lineHeight:1.35,maxWidth:1400};
function Design({shot,frame,kit}:{shot:Shot;frame:number;kit:ChannelKit}){
  const accent=shot.accentColor || kit.accentColor;
  const label=<div style={{fontSize:26,fontWeight:800,letterSpacing:8,color:accent,marginBottom:26}}>{shot.kicker}</div>;
  const title=<div style={headlineStyle}>{shot.title}</div>;
  const subtitle=shot.subtitle?<div style={{...subStyle,marginTop:22}}>{shot.subtitle}</div>:null;
  if(shot.style==='chapter')return <AbsoluteFill style={{justifyContent:'center',padding:135}}>
    {label}<div style={{fontSize:153,fontWeight:900,lineHeight:1.0,letterSpacing:-5,color:'#fff',maxWidth:1640}}>{shot.title}</div>
    <div style={{width:240,height:7,background:accent,marginTop:38}}/>{subtitle}
    <div style={{position:'absolute',right:108,bottom:92,fontSize:23,letterSpacing:5,color:'#ffffff99'}}>CAPÍTULO</div>
  </AbsoluteFill>;
  if(shot.style==='number')return <AbsoluteFill style={{justifyContent:'center',padding:145}}>
    {label}<div style={{fontSize:shot.title.length>8?122:230,fontWeight:900,color:accent,lineHeight:1.03}}>{shot.title}</div>
    <div style={{width:450,height:4,background:'#ffffff3f',margin:'37px 0 14px'}}/>{subtitle}
  </AbsoluteFill>;
  if(shot.style==='quote')return <AbsoluteFill style={{justifyContent:'center',padding:'120px 165px'}}>
    <div style={{fontSize:215,position:'absolute',top:65,left:130,color:accent,opacity:.8}}>“</div>
    {label}<div style={{fontSize:98,fontWeight:800,letterSpacing:-2,color:'#fff',lineHeight:1.14,maxWidth:1500}}>{shot.title}</div>
    {subtitle}<div style={{width:160,height:7,background:accent,marginTop:50}}/>
  </AbsoluteFill>;
  if(shot.style==='split')return <AbsoluteFill style={{display:'flex',flexDirection:'row'}}>
    <div style={{width:'57%',height:'100%',padding:'110px 80px 110px 145px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
      {label}<div style={{...headlineStyle,fontSize:100}}>{shot.title}</div>{subtitle}
    </div>
    <div style={{position:'relative',width:'43%',height:'100%',background:accent+'22',borderLeft:'5px solid '+accent,
      display:'flex',justifyContent:'center',alignItems:'center'}}>
      <div style={{width:450,height:450,border:'14px solid '+accent,transform:'rotate(25deg)',opacity:.28}}/>
      <div style={{position:'absolute',fontSize:70,fontWeight:900,opacity:.76,letterSpacing:10}}>DADOS</div>
    </div>
  </AbsoluteFill>;
  if(shot.style==='timeline'){
    const barCount=5;
    return <AbsoluteFill style={{justifyContent:'center',padding:125}}>
      {label}<div style={{...headlineStyle,fontSize:103,marginBottom:60}}>{shot.title}</div>
      <div style={{display:'flex',alignItems:'end',gap:36,height:240}}>
        {Array.from({length:barCount},(_,i)=><div key={i} style={{flex:1,height:(50+(i*27+frame*0.35)%150)+'px',
          background:accent,opacity:.44+i*.12,borderRadius:12}}/>)}
      </div>{subtitle}
    </AbsoluteFill>;
  }
  return <AbsoluteFill style={{justifyContent:'center',padding:'115px 145px'}}>
    {label}{title}<div style={{height:8,width:170,background:accent,marginTop:37}}/>{subtitle}
  </AbsoluteFill>;
}
export function ShotVisual({shot,asset,kit,evidence}:{shot:Shot;asset?:Asset;kit:ChannelKit;evidence?:Evidence}){
  const frame=useCurrentFrame();
  const m=evaluateMotion(shot,frame);
  const accent=shot.accentColor||kit.accentColor;
  const transform='translate('+m.x+'%, '+m.y+'%) scale('+m.scale+') rotate('+m.rotation+'deg)';
  return <AbsoluteFill style={{background:shot.backgroundColor,overflow:'hidden',fontFamily:fonts[kit.font]}}>
    <AbsoluteFill style={{background:'radial-gradient(circle at 70% 25%, '+accent+'24 0%, transparent 54%)'}}/>
    <AbsoluteFill style={{transform,opacity:m.opacity,willChange:'transform, opacity'}}>
      {shot.kind==='graphic'?(investigativeStyles.some(s=>s===shot.style)?
        <InvestigationVisual shot={shot} evidence={evidence}/>:<Design shot={shot} frame={frame} kit={kit}/>):
        asset?.kind==='image'?<Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:
        asset?.kind==='video'?<OffthreadVideo src={asset.url} startFrom={shot.trimStartFrames} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
      {shot.kind!=='graphic'&&shot.title&&<AbsoluteFill style={{justifyContent:'flex-end',padding:'0 120px 175px'}}>
        <div style={{maxWidth:1260,background:'#000000b5',borderLeft:'9px solid '+accent,padding:'25px 38px'}}>
          <div style={{fontSize:71,fontWeight:900,color:'#fff'}}>{shot.title}</div>
          {shot.subtitle&&<div style={{fontSize:32,color:'#e4eef8'}}>{shot.subtitle}</div>}
        </div>
      </AbsoluteFill>}
    </AbsoluteFill>
    <div style={{position:'absolute',top:32,right:55,fontSize:21,fontWeight:700,letterSpacing:4,
      color:'#ffffffaa'}}>{kit.brandName}</div>
  </AbsoluteFill>;
}
