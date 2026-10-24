import type {CSSProperties,ReactNode} from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame} from 'remotion';
import type {Evidence} from '../model/project';
import type {Shot} from '../model/shots';

/**
 * Biblioteca editorial 100% vetorial/HTML, sem fotos, logotipos ou "provas"
 * fabricadas. As capturas reais só entram como mídias locais importadas.
 * Todas as construções gráficas carregam identificação de representação.
 */
const paper:CSSProperties={background:'#ebe6d9',color:'#202c35',boxShadow:'16px 22px 50px #0009',
  borderRadius:5,border:'1px solid #b6b1a5'};
const smallLabel:CSSProperties={fontSize:25,fontWeight:800,letterSpacing:5,textTransform:'uppercase'};
const graphicTitle:CSSProperties={fontSize:93,fontWeight:850,lineHeight:1.07,letterSpacing:-2,maxWidth:1460};
const cardText:CSSProperties={fontSize:39,lineHeight:1.38,fontWeight:500};

function Lines({count=5}: {count?:number}){
  return <div style={{display:'flex',flexDirection:'column',gap:18,marginTop:30}}>
    {Array.from({length:count},(_,i)=><div key={i} style={{background:'#82909b55',height:9,width:(95-(i%3)*14)+'%'}}/>)}
  </div>;
}
function Emphasis({text,highlight}:{text:string;highlight:string}){
  if(!highlight||!text.toLocaleLowerCase().includes(highlight.toLocaleLowerCase()))return <>{text}</>;
  const index=text.toLocaleLowerCase().indexOf(highlight.toLocaleLowerCase());
  return <>{text.slice(0,index)}<mark style={{background:'#f0c56c',padding:'2px 4px'}}>{text.slice(index,index+highlight.length)}</mark>{text.slice(index+highlight.length)}</>;
}
function Frame({shot,children}:{shot:Shot;children:ReactNode}){
  return <AbsoluteFill style={{padding:'90px 110px 160px',justifyContent:'center'}}>
    <div style={{...smallLabel,color:shot.accentColor,marginBottom:30}}>{shot.kicker||'ARQUIVO / INVESTIGAÇÃO'}</div>
    {children}
  </AbsoluteFill>;
}
function Document({shot,frame}:{shot:Shot;frame:number}){
  const d=shot.investigation;
  const progress=interpolate(frame,[0,22],[0,1],{extrapolateRight:'clamp'});
  return <Frame shot={shot}>
    <div style={{display:'grid',gridTemplateColumns:'42% 58%',gap:75,alignItems:'center'}}>
      <div><div style={graphicTitle}>{shot.title}</div>
        <div style={{fontSize:37,color:'#c5d3e1',lineHeight:1.34,marginTop:35}}>{shot.subtitle}</div>
        <div style={{width:185,height:8,background:shot.accentColor,marginTop:45}}/>
      </div>
      <div style={{...paper,padding:64,height:680,transform:'rotate(-1deg)',position:'relative'}}>
        <div style={{...smallLabel,fontSize:19,color:'#596370',borderBottom:'2px solid #929ba555',paddingBottom:20}}>
          {d.representation==='source-excerpt'?'TRECHO TRANSCRITO PARA CONFERÊNCIA':'RECONSTITUIÇÃO EDITORIAL'}
        </div>
        <div style={{fontSize:44,fontWeight:800,margin:'38px 0 22px',lineHeight:1.13}}>{shot.title.slice(0,75)}</div>
        {d.excerpt?<div style={{...cardText,fontSize:35,overflowWrap:'anywhere',maxHeight:340,overflow:'hidden'}}>
          <Emphasis text={d.excerpt} highlight={d.highlight}/></div>:<Lines count={7}/>}
        <div style={{position:'absolute',left:62,right:62,bottom:52,height:6,background:'#adb7bc'}}>
          <div style={{width:(progress*100)+'%',height:6,background:shot.accentColor}}/>
        </div>
      </div>
    </div>
  </Frame>;
}
function Dossier({shot,frame}:{shot:Shot;frame:number}){
  const reveal=interpolate(frame,[0,18],[0,1],{extrapolateRight:'clamp'});
  return <Frame shot={shot}>
    <div style={{display:'flex',gap:92,alignItems:'center'}}>
      <div style={{position:'relative',width:640,height:640,flexShrink:0}}>
        <div style={{...paper,background:'#b6a17a',position:'absolute',left:60,top:45,width:510,height:550,
          transform:'rotate(-10deg)'}}/>
        <div style={{...paper,position:'absolute',left:15,top:12,width:535,height:565,padding:57,
          transform:'rotate(-2deg) translateY('+(22*(1-reveal))+'px)'}}>
          <div style={{...smallLabel,color:'#8d3d37',fontSize:28}}>ARQUIVO / ANÁLISE</div>
          <div style={{height:4,width:180,background:'#b5534a',margin:'26px 0'}}/>
          <div style={{fontSize:57,fontWeight:900,letterSpacing:-1,marginBottom:22,overflowWrap:'anywhere'}}>
            {shot.title.slice(0,53)}</div>
          <Lines count={5}/>
          <div style={{position:'absolute',bottom:48,right:50,border:'5px solid #a44d48',color:'#a44d48',
            padding:'13px 21px',transform:'rotate(-12deg)',fontSize:29,fontWeight:900}}>EM ANÁLISE</div>
        </div>
      </div>
      <div style={{maxWidth:900}}><div style={{...graphicTitle,fontSize:110}}>{shot.title}</div>
        <p style={{fontSize:43,color:'#b9cfe0',lineHeight:1.33}}>{shot.subtitle}</p>
        <div style={{...smallLabel,color:shot.accentColor}}>Pistas • documentos • contexto</div>
      </div>
    </div>
  </Frame>;
}
function EvidenceChain({shot,frame}:{shot:Shot;frame:number}){
  const data=shot.investigation;
  const pct=interpolate(frame,[5,48],[0,1],{extrapolateRight:'clamp'});
  const points=[{x:160,y:165},{x:710,y:365},{x:1240,y:155}];
  return <Frame shot={shot}>
    <div style={graphicTitle}>{shot.title}</div>
    <div style={{fontSize:35,color:'#c1d3e1',marginTop:16}}>{shot.subtitle}</div>
    <div style={{position:'relative',height:450,marginTop:40}}>
      <svg viewBox="0 0 1450 470" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
        <path d="M 360 180 L 730 315 L 1180 180" stroke="#ffffff44" strokeWidth={7} fill="none"/>
        <path d="M 360 180 L 730 315 L 1180 180" stroke={shot.accentColor} strokeWidth={7}
          strokeDasharray="1400" strokeDashoffset={1400*(1-pct)} fill="none"/>
      </svg>
      {points.map((p,i)=>{
        const labels=[data.excerpt.slice(0,70)||'REGISTRO',
          data.highlight||'CRUZAMENTO','CONCLUSÃO / REVISÃO'];
        return <div key={i} style={{position:'absolute',left:p.x-75,top:p.y-110,width:330,minHeight:125,
          background:'#1b2b3c',border:'3px solid '+shot.accentColor,borderRadius:8,padding:22,
          opacity:interpolate(frame,[i*11,i*11+13],[0,1],{extrapolateRight:'clamp'})}}>
          <div style={{...smallLabel,fontSize:18,color:shot.accentColor}}>PASSO 0{i+1}</div>
          <div style={{fontSize:27,fontWeight:700,marginTop:12,overflowWrap:'anywhere'}}>{labels[i]}</div>
        </div>;
      })}
    </div>
  </Frame>;
}
function Chart({shot,frame}:{shot:Shot;frame:number}){
  const {points,unit}=shot.investigation;
  const growth=interpolate(frame,[5,45],[0,1],{extrapolateRight:'clamp'});
  const max=Math.max(1,...points.map(p=>Math.abs(p.value)));
  return <Frame shot={shot}>
    <div style={{...graphicTitle,fontSize:90}}>{shot.title}</div>
    <div style={{fontSize:36,color:'#bccfe1',margin:'15px 0 45px'}}>{shot.subtitle}</div>
    {points.length===0?<div style={{border:'3px dashed #8b96a0',padding:70,fontSize:43,color:'#e4be8d'}}>
      DADOS NÃO ANEXADOS — GRÁFICO ILUSTRATIVO
    </div>:<div style={{height:455,display:'flex',gap:28,alignItems:'end',padding:'20px 0 0'}}>
      {points.map((point,i)=><div key={i} style={{flex:1,height:'100%',display:'flex',
        flexDirection:'column',justifyContent:'end',alignItems:'center',gap:16}}>
        <div style={{fontSize:35,fontWeight:800,color:'#f5f7fa'}}>{point.value.toLocaleString('pt-BR')}{unit?' '+unit:''}</div>
        <div style={{height:Math.max(5,Math.abs(point.value)/max*280*growth),width:'88%',
          background:i===points.length-1?shot.accentColor:'#7792a4',borderRadius:'8px 8px 0 0'}}/>
        <div style={{fontSize:26,color:'#dee7ef',minHeight:55,textAlign:'center'}}>{point.label}</div>
      </div>)}
    </div>}
  </Frame>;
}
function Comparison({shot,frame}:{shot:Shot;frame:number}){
  const d=shot.investigation;
  const reveal=interpolate(frame,[5,22],[0,1],{extrapolateRight:'clamp'});
  const columns=[
    {label:d.leftLabel||'ANTES',value:d.leftValue||'PONTO A'},
    {label:d.rightLabel||'DEPOIS',value:d.rightValue||'PONTO B'},
  ];
  return <Frame shot={shot}>
    <div style={graphicTitle}>{shot.title}</div>
    <div style={{display:'flex',gap:30,marginTop:70}}>
      {columns.map((c,i)=><div key={i} style={{flex:1,minHeight:400,padding:62,background:i?'#234251':'#182b3d',
        borderTop:'9px solid '+(i?shot.accentColor:'#a4b1bd'),opacity:reveal,
        transform:'translateY('+(25*(1-reveal))+'px)'}}>
        <div style={{...smallLabel,color:i?shot.accentColor:'#bbcada'}}>{c.label}</div>
        <div style={{fontSize:91,fontWeight:900,marginTop:62,overflowWrap:'anywhere'}}>{c.value}</div>
      </div>)}
    </div>
  </Frame>;
}
function SchematicMap({shot,frame}:{shot:Shot;frame:number}){
  const labels=shot.investigation.locationLabels;
  const names=labels.length?labels:['ORIGEM','TRAJETO','DESTINO'];
  const positions=[{x:160,y:310},{x:520,y:140},{x:920,y:390},{x:1280,y:190}].slice(0,names.length);
  const path=positions.map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ');
  const progress=interpolate(frame,[0,45],[0,1],{extrapolateRight:'clamp'});
  return <Frame shot={shot}>
    <div style={graphicTitle}>{shot.title}</div>
    <div style={{fontSize:35,color:'#cbd7e5',marginTop:15}}>{shot.subtitle}</div>
    <div style={{position:'relative',height:500,marginTop:28,background:'#152735',
      backgroundImage:'linear-gradient(#ffffff08 2px,transparent 2px),linear-gradient(90deg,#ffffff08 2px,transparent 2px)',
      backgroundSize:'70px 70px',border:'2px solid #45536a'}}>
      <svg viewBox="0 0 1450 520" width="100%" height="100%">
        <path d={path} fill="none" stroke={shot.accentColor} strokeWidth="8"
          strokeLinecap="round" strokeDasharray="1900" strokeDashoffset={1900*(1-progress)}/>
        {positions.map((p,i)=><g key={i}>
          <circle cx={p.x} cy={p.y} r={21} fill={shot.accentColor}/>
          <circle cx={p.x} cy={p.y} r={39} stroke={shot.accentColor} strokeWidth={3} fill="none"/>
          <text x={p.x+45} y={p.y-28} fill="#ffffff" fontSize="36" fontWeight="700">{names[i]}</text>
        </g>)}
      </svg>
    </div>
  </Frame>;
}
function LowerThird({shot}:{shot:Shot}){
  return <AbsoluteFill style={{justifyContent:'flex-end',padding:'0 105px 200px'}}>
    <div style={{background:'#102031ed',borderLeft:'10px solid '+shot.accentColor,
      padding:'34px 50px',width:1250,boxShadow:'8px 8px 22px #000a'}}>
      <div style={{...smallLabel,color:shot.accentColor,fontSize:23}}>{shot.kicker}</div>
      <div style={{fontSize:72,fontWeight:900,marginTop:10}}>{shot.title}</div>
      <div style={{fontSize:34,color:'#d7e6f3',marginTop:5}}>{shot.subtitle}</div>
    </div>
  </AbsoluteFill>;
}
function Footer({shot,evidence}:{shot:Shot;evidence?:Evidence}){
  const d=shot.investigation;
  const linked=Boolean(d.sourceEvidenceId);
  const verified=linked&&evidence?.reviewStatus==='verified';
  const map=shot.style==='map';
  const status=map?'ESQUEMA ILUSTRATIVO — NÃO É MAPA GEOGRÁFICO':
    d.representation==='source-excerpt'&&!verified?'TRECHO NÃO VERIFICADO':
    verified?'FONTE CONFERIDA PELO EDITOR':
    d.representation==='reconstruction'?'RECONSTITUIÇÃO EDITORIAL':'ILUSTRAÇÃO / NÃO É PROVA';
  return <div style={{position:'absolute',bottom:24,left:110,right:110,display:'flex',
    alignItems:'end',justifyContent:'space-between',gap:30,fontSize:22,fontWeight:700,letterSpacing:1.7,
    color:verified?'#a0d3df':'#d5b178'}}>
    <span style={{background:'#070d15dd',padding:'9px 16px'}}>{status}</span>
    <span style={{fontSize:20,color:'#d6dde7',maxWidth:930,textAlign:'right',overflowWrap:'anywhere'}}>
      {evidence?'ORIGEM: '+evidence.sourceTitle:'FONTE: NÃO INFORMADA'}</span>
  </div>;
}
export function InvestigationVisual({shot,evidence}:{shot:Shot;evidence?:Evidence}){
  const frame=useCurrentFrame();
  const content=shot.style==='dossier'?<Dossier shot={shot} frame={frame}/>:
    shot.style==='document'?<Document shot={shot} frame={frame}/>:
    shot.style==='evidence'?<EvidenceChain shot={shot} frame={frame}/>:
    shot.style==='chart'?<Chart shot={shot} frame={frame}/>:
    shot.style==='comparison'?<Comparison shot={shot} frame={frame}/>:
    shot.style==='map'?<SchematicMap shot={shot} frame={frame}/>:
    <LowerThird shot={shot}/>;
  return <AbsoluteFill>
    <AbsoluteFill style={{background:'repeating-linear-gradient(0deg,transparent,transparent 4px,#ffffff05 5px)'}}/>
    {content}
    <Footer shot={shot} evidence={evidence}/>
  </AbsoluteFill>;
}
