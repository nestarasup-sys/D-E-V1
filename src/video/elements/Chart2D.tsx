import type {SceneLayer} from '../../model/layers';

/** Chart uses only registered numeric data. Without evidence, show a neutral
 * placeholder. The caller validates sourceEvidenceId against project.evidence. */
export function Chart2D({layer,progress}:{layer:SceneLayer;progress:number}){
  const values=layer.values,labels=layer.labels;
  if(!values.length)return <div style={{
    width:'100%',height:'100%',background:'#142d41',border:'3px dashed #9db3bd',
    display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',
    color:'#f0d19e',fontWeight:800,fontSize:36,textAlign:'center',padding:28}}>
    DADOS PENDENTES
    <small style={{fontSize:23,marginTop:14,color:'#dce7f0'}}>Sem valores inventados</small>
  </div>;
  const chartType=layer.chartType;
  const max=Math.max(0,...values),min=Math.min(0,...values),range=Math.max(1,max-min);
  const yFor=(v:number)=>410-(v-min)/range*330;
  const visible=Math.max(0,Math.min(1,progress));
  if(chartType==='donut'){
    const positives=values.map(v=>Math.max(0,v)),sum=positives.reduce((a,b)=>a+b,0);
    let cursor=0;
    const circle=positives.map((v,i)=>{
      const start=cursor;cursor+=sum?v/sum:0;
      return <circle key={i} cx="380" cy="255" r="159" fill="none"
        stroke={i%2?layer.secondaryColor:layer.color} strokeWidth="76"
        strokeDasharray={(Math.max(0,cursor-start)*999*visible)+' 999'}
        strokeDashoffset={-start*999} transform="rotate(-90 380 255)"/>;
    });
    return <svg viewBox="0 0 1000 510" width="100%" height="100%">
      <circle cx="380" cy="255" r="159" fill="none" stroke="#455d72" strokeWidth="76"/>
      {circle}
      <text x="380" y="268" fill="#e6f1f7" fontSize="41" fontWeight="800" textAnchor="middle">COMPOSIÇÃO</text>
      {values.slice(0,7).map((v,i)=><g key={i}>
        <circle cx="680" cy={90+i*54} r="11" fill={i%2?layer.secondaryColor:layer.color}/>
        <text x="712" y={104+i*54} fill="#fff" fontSize="26">{(labels[i]||'Categoria '+(i+1)).slice(0,28)}</text>
        <text x="946" y={104+i*54} fill="#efd4a6" fontSize="26" textAnchor="end">{v.toLocaleString('pt-BR')}</text>
      </g>)}
    </svg>;
  }
  const points=values.map((v,i)=>({x:70+i*860/Math.max(1,values.length-1),
    y:yFor(v)}));
  const areaPath=points.map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ')+
    (points.length?' L '+points.at(-1)!.x+' 410 L 70 410 Z':'');
  return <svg viewBox="0 0 1000 510" width="100%" height="100%">
    {[0,1,2,3,4].map(k=><g key={k}>
      <line x1="64" y1={80+k*83} x2="958" y2={80+k*83} stroke="#d3e2ed22" strokeWidth="2"/>
    </g>)}
    <line x1="64" y1={yFor(0)} x2="958" y2={yFor(0)} stroke="#faf5e6bb" strokeWidth="3"/>
    {chartType==='line'||chartType==='area'?
      <>
        {chartType==='area'&&<path d={areaPath} fill={layer.color} opacity={.18*visible}/>}
        <polyline points={points.slice(0,Math.max(1,Math.ceil(visible*points.length)))
          .map(p=>p.x+','+p.y).join(' ')} fill="none" stroke={layer.color} strokeWidth="10"
          strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="9" fill={layer.color}
          opacity={visible>i/points.length?1:0}/>)}
      </>:
      values.map((v,i)=>{
        const gap=865/values.length,barWidth=Math.min(110,gap*.62);
        const top=Math.min(yFor(0),yFor(v)),h=Math.max(2,Math.abs(yFor(v)-yFor(0))*visible);
        return <g key={i}>
          <rect x={70+i*gap+(gap-barWidth)/2} y={v>=0?yFor(0)-h:yFor(0)}
            width={barWidth} height={h} fill={i===values.length-1?layer.color:'#8caaba'} rx="4"/>
          <text x={70+i*gap+gap/2} y={top-12} textAnchor="middle" fontSize="27" fill="#f3eee2">
            {v.toLocaleString('pt-BR')}{layer.unit?' '+layer.unit:''}</text>
        </g>;
      })}
    {labels.slice(0,values.length).map((label,i)=><text key={i}
      x={70+(i+.5)*865/values.length} y="481" fill="#d5e5ef" fontSize="23" textAnchor="middle">
      {label.slice(0,17)}</text>)}
    <text x="935" y="42" fill="#e8bd81" fontSize="21" textAnchor="end">FONTE CADASTRADA · REVISAR</text>
  </svg>;
}
