import type {SceneLayer} from '../../model/layers';

/** 8 illustrated environments using repeatable SVG primitives.
 * Deliberately schematic; never misrepresented as a real geographic place. */
export function Scene2D({layer,frame}:{layer:SceneLayer;frame:number}){
  const kind=layer.sceneType;
  const tick=frame/30,shift=layer.behavior==='parallax'?Math.sin(tick*.45)*8:0;
  const city=[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{
    const h=210+(i*61)%330,x=i*170-55;
    return <g key={i} transform={'translate('+(shift*(1+i%3*.4))+',0)'}>
      <rect x={x} y={780-h} width={145} height={h} fill={i%2?'#24445a':'#31516a'}/>
      {Array.from({length:Math.floor(h/55)},(_,j)=>
        [0,1,2].map(col=><rect key={j+'-'+col} x={x+20+col*37} y={795-h+j*55}
          width={17} height={24} fill={(j+col+i)%4?'#7b9dad':'#efd093'} opacity=".7"/>))}
    </g>;
  });
  const floor=<><rect x="0" y="775" width="1920" height="305" fill="#183647"/>
    <path d="M0 795 H1920" stroke="#567080" strokeWidth="7"/></>;
  let detail:React.ReactNode;
  switch(kind){
    case 'city':detail=<>{city}{floor}</>;break;
    case 'street':detail=<>{city}{floor}
      <rect x="0" y="900" width="1920" height="180" fill="#273b48"/>
      {[0,1,2,3,4].map(i=><rect key={i} x={i*460+40} y="981" width="250" height="11" fill="#d7c59f"/>)}
      <path d="M165 806 Q280 790 350 805" stroke="#8fc5a3" strokeWidth="12"/></>;break;
    case 'home':detail=<>{floor}
      <rect x="220" y="185" width="1480" height="595" rx="12" fill="#d1c7b7"/>
      <rect x="980" y="245" width="450" height="310" fill="#82adbb"/>
      <path d="M1200 245 V555 M980 400 H1430" stroke="#e0e3e1" strokeWidth="18"/>
      <rect x="350" y="620" width="680" height="170" rx="45" fill="#456677"/>
      <rect x="405" y="570" width="560" height="110" rx="44" fill="#5c8393"/>
      <rect x="350" y="768" width="55" height="55" fill="#27384e"/>
      <rect x="980" y="768" width="55" height="55" fill="#27384e"/>
      <rect x="1190" y="680" width="320" height="27" fill="#986f4b"/>
      <rect x="1240" y="708" width="22" height="100" fill="#986f4b"/>
    </>;break;
    case 'bank':detail=<>{floor}
      <rect x="230" y="190" width="1420" height="600" fill="#d9dbd6"/>
      <polygon points="170,260 940,85 1710,260" fill="#c3ab7d"/>
      {[340,640,940,1240,1540].map(x=><g key={x}>
        <rect x={x} y={302} width={75} height={450} fill="#789aa5"/>
        <rect x={x-16} y={295} width={106} height={22} fill="#c9d5d3"/>
      </g>)}
      <rect x="260" y="745" width="1380" height="45" fill="#9aaeb2"/>
      <text x="940" y="247" fontSize="70" textAnchor="middle" fill="#253a4e" fontWeight="900">CRÉDITO</text>
    </>;break;
    case 'office':detail=<>{floor}
      <rect x="105" y="160" width="1710" height="620" fill="#c6cbd0"/>
      <rect x="190" y="230" width="530" height="350" fill="#74a5c0"/>
      <rect x="960" y="225" width="600" height="360" fill="#87b7c5"/>
      <rect x="340" y="655" width="1210" height="38" fill="#c69f71"/>
      <rect x="430" y="690" width="35" height="145" fill="#775842"/>
      <rect x="1435" y="690" width="35" height="145" fill="#775842"/>
      <rect x="825" y="474" width="350" height="193" rx="16" fill="#223c55"/>
      <rect x="841" y="490" width="317" height="151" fill="#457f9c"/>
      </>;break;
    case 'supermarket':detail=<>{floor}
      <rect x="140" y="185" width="1620" height="610" fill="#c9d5d6"/>
      {[300,760,1220].map((x,i)=><g key={x}>
        <rect x={x} y="315" width="325" height="380" fill="#718b94"/>
        {[0,1,2].map(k=><g key={k}>
          <rect x={x+12} y={392+k*96} width="301" height="12" fill="#3d535e"/>
          {[0,1,2,3].map(q=><rect key={q} x={x+31+q*65} y={339+k*98}
            width="37" height="47" rx="7" fill={['#a88d6e','#83a99e','#cb987d'][i]}/>)}
        </g>)}
      </g>)}
      </>;break;
    case 'construction':detail=<>{city}{floor}
      <rect x="425" y="330" width="990" height="460" fill="#8d9599"/>
      {[0,1,2].map(i=><g key={i}>
        <path d={'M425 '+(425+i*117)+' H1415'} stroke="#e0b36d" strokeWidth="14"/>
        {[0,1,2,3,4].map(j=><rect key={j} x={470+j*184} y={357+i*117}
          width="105" height="86" fill="#243b4f"/>)}
      </g>)}
      <path d="M1520 130 V782 M1180 175 H1730" stroke="#ecb861" strokeWidth="21"/>
      <path d="M1395 175 V350" stroke="#ecb861" strokeWidth="5"/>
      </>;break;
    case 'studio':detail=<>{floor}
      <rect x="110" y="130" width="1710" height="640" fill="#132b46"/>
      {[0,1,2].map(i=><rect key={i} x={190+i*520} y="245" width="430" height="345" rx="14"
        fill={['#2a5066','#23415b','#3d5368'][i]} stroke="#63859d" strokeWidth="6"/>)}
      <path d="M0 780 H1920" stroke="#c99e65" strokeWidth="10"/>
      </>;break;
  }
  return <svg viewBox="0 0 1920 1080" width="100%" height="100%" aria-label={'Cenário esquemático: '+kind}>
    <defs><linearGradient id="dark-scene-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#09182a"/><stop offset="1" stopColor="#486c78"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#dark-scene-sky)"/>
    <circle cx="1450" cy="180" r="115" fill="#f0d18a" opacity=".32"/>
    {detail}
    <rect y="850" width="1920" height="230" fill="#091a2c" opacity=".18"/>
  </svg>;
}
