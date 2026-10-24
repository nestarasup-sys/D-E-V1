import type {SceneLayer} from '../../model/layers';

/** Hand-authored illustrative SVG objects; all geometry stays sharp at 1080p. */
export function Object2D({layer,frame}:{layer:SceneLayer;frame:number}){
  const type=layer.objectType,accent=layer.color;
  const stroke={stroke:'#f2eedf',strokeWidth:7,strokeLinecap:'round' as const,
    strokeLinejoin:'round' as const,fill:'none'};
  const disk=<circle cx={100} cy={100} r={79} fill="#264159" stroke={accent} strokeWidth={4}/>;
  let item:React.ReactNode;
  switch(type){
    case 'home':item=<><path d="M35 93 L100 40 L165 93 L165 159 L35 159Z" fill={accent}/>
      <rect x="86" y="115" width="29" height="44" fill="#25364d"/>
      <rect x="50" y="105" width="24" height="24" fill="#dcefff"/><path d="M27 97 L100 31 L172 97" {...stroke}/></>;break;
    case 'key':item=<><circle cx="75" cy="76" r="27" {...stroke}/><path d="M95 98 L156 159 M139 143 L160 123 M128 132 L147 113" {...stroke}/></>;break;
    case 'car':item=<><path d="M30 108 L52 73 L146 73 L168 108 L172 143 L28 143Z"
      fill={accent}/><path d="M46 111 L62 85 L135 85 L153 111Z" fill="#d5e9f4"/>
      <circle cx="57" cy="146" r="17" fill="#172638"/><circle cx="144" cy="146" r="17" fill="#172638"/></>;break;
    case 'phone':item=<><rect x="67" y="35" width="70" height="134" rx="13" fill={accent}/>
      <rect x="76" y="49" width="52" height="92" rx="5" fill="#1b3148"/>
      <circle cx="102" cy="155" r="5" fill="#fff"/></>;break;
    case 'coin':item=<><circle cx="100" cy="101" r="62" fill={accent}/>
      <circle cx="100" cy="101" r="47" stroke="#9b7441" strokeWidth="4" fill="none"/>
      <text x="100" y="126" fontSize="68" fontWeight="900" textAnchor="middle" fill="#243345">$</text></>;break;
    case 'wallet':item=<><rect x="34" y="66" width="130" height="94" rx="11" fill={accent}/>
      <rect x="91" y="91" width="90" height="45" rx="10" fill="#2d4b62"/>
      <circle cx="128" cy="113" r="7" fill="#f4e6ce"/></>;break;
    case 'contract':item=<><path d="M51 33 H124 L152 62 V170 H51Z" fill="#e9e5d8"/>
      <path d="M124 33 V64 H152 M69 91 H134 M69 108 H134 M69 125 H119" stroke="#50647c" strokeWidth="7"/>
      <path d="M72 148 Q95 139 111 155" stroke="#b27b55" strokeWidth="5" fill="none"/></>;break;
    case 'clock':item=<><circle cx="100" cy="100" r="60" stroke={accent} strokeWidth="12" fill="none"/>
      <path d="M100 60 V100 L133 122" {...stroke}/></>;break;
    case 'bank':item=<><path d="M24 74 L100 31 L177 74Z" fill={accent}/>
      <rect x="40" y="76" width="120" height="12" fill="#f0e2c5"/>
      {[50,80,110,140].map(x=><rect key={x} x={x} y={91} width={12} height={61} fill={accent}/>)}
      <rect x="31" y="153" width="138" height="12" fill="#f0e2c5"/></>;break;
    case 'cart':item=<><path d="M29 53 H47 L65 130 H151 L173 75 H54" {...stroke}/>
      <circle cx="79" cy="155" r="13" fill={accent}/><circle cx="139" cy="155" r="13" fill={accent}/>
      <path d="M79 93 H155" stroke={accent} strokeWidth={8}/></>;break;
    case 'computer':item=<><rect x="30" y="42" width="143" height="102" rx="8" fill={accent}/>
      <rect x="41" y="53" width="120" height="79" fill="#153148"/>
      <path d="M101 143 V166 M66 167 H137" {...stroke}/></>;break;
    case 'truck':item=<><rect x="26" y="61" width="106" height="78" rx="5" fill={accent}/>
      <path d="M130 83 H160 L183 109 V141 H130Z" fill="#cbac76"/>
      <circle cx="68" cy="145" r="18" fill="#26364b"/><circle cx="154" cy="145" r="18" fill="#26364b"/></>;break;
    case 'document':item=<><path d="M48 30 H128 L157 60 V174 H48Z" fill="#f3ebda"/>
      <path d="M128 30 V62 H157 M67 91 H138 M67 111 H138 M67 131 H124" stroke="#7892a5" strokeWidth="8"/></>;break;
    case 'tree':item=<><rect x="91" y="122" width="19" height="45" fill="#97734d"/>
      <circle cx="100" cy="85" r="57" fill="#568a78"/>
      <circle cx="72" cy="100" r="38" fill="#5e9b84"/><circle cx="132" cy="104" r="38" fill="#50846d"/></>;break;
    case 'heart':item=<path d="M100 166 L38 110 Q14 78 40 60 Q65 42 100 76 Q138 39 165 61 Q195 95 163 126Z" fill="#e4a1ad"/>;break;
    case 'lightbulb':item=<><path d="M71 128 Q36 92 59 56 Q79 26 114 33 Q154 37 158 79 Q162 101 129 129Z"
      fill={accent}/><rect x="79" y="128" width="45" height="22" rx="4" fill="#e5e6df"/>
      <rect x="88" y="150" width="28" height="11" rx="4" fill="#a3b2bd"/></>;break;
    case 'calendar':item=<><rect x="33" y="53" width="133" height="115" rx="8" fill="#f3ecdf"/>
      <rect x="33" y="53" width="133" height="30" fill={accent}/>
      {[0,1,2].flatMap(row=>[0,1,2].map(col=><rect key={row+'-'+col} x={50+col*35} y={98+row*20}
        width={19} height={11} fill="#7e9aa6"/>))}</>;break;
    case 'magnifier':item=<><circle cx="85" cy="88" r="42" {...stroke}/>
      <path d="M117 120 L160 165" stroke={accent} strokeWidth={17} strokeLinecap="round"/></>;break;
    case 'book':item=<><path d="M100 57 Q65 32 31 45 V151 Q69 138 100 160 Q130 141 168 151 V45 Q134 32 100 57Z"
      fill="#e5d7b9" stroke={accent} strokeWidth={6}/>
      <path d="M100 59 V160 M44 68 H84 M44 87 H84 M113 68 H152 M113 87 H152" stroke="#8d8577" strokeWidth={4}/></>;break;
    case 'gear':{
      const points=Array.from({length:24},(_,i)=>{
        const angle=i*Math.PI*2/24,rad=i%3===0||i%3===1?69:57;
        return (100+Math.cos(angle)*rad).toFixed(1)+','+(100+Math.sin(angle)*rad).toFixed(1);
      }).join(' ');
      item=<><polygon points={points} fill={accent}/><circle cx="100" cy="100" r="28" fill="#21364b"/></>;
      break;
    }
    case 'factory':item=<><path d="M32 164 V102 L73 125 V96 L111 119 V76 L164 92 V164Z"
      fill={accent}/><rect x="120" y="45" width="25" height="55" fill="#e5d4b4"/>
      {[46,81,116].map(x=><rect key={x} x={x} y="140" width="17" height="15" fill="#17324b"/>)}</>;break;
    case 'rocket':item=<><path d="M80 140 Q69 77 112 37 Q143 63 136 122 L109 151Z" fill="#e6e6df"/>
      <circle cx="115" cy="93" r="17" fill="#83baca"/><path d="M78 123 L50 143 L83 149 M137 123 L157 150 L126 152" fill={accent}/>
      <path d="M98 151 Q108 197 120 152" fill="#ffa75e"/></>;break;
    case 'pin':item=<><path d="M100 172 Q39 113 45 85 A57 57 0 0 1 159 85 Q161 122 100 172Z" fill={accent}/>
      <circle cx="100" cy="89" r="22" fill="#18374a"/></>;break;
  }
  const angle=layer.behavior==='orbit'?frame*0.7:0;
  return <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={'Objeto ilustrativo: '+type}>
    {disk}<g transform={'rotate('+angle+' 100 100)'}>{item}</g>
  </svg>;
}
