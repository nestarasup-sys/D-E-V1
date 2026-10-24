import type {SceneLayer,RigPose} from '../../model/layers';
import {ease} from '../../model/shots';

/** Per-joint pose interpolation: additive rig controls coexist with authored gestures. */
export function evaluateRig(layer:SceneLayer,frame:number):RigPose {
  const keys=layer.rigKeys;
  if(!keys.length)return layer.rig;
  if(frame<=keys[0].frame)return keys[0].pose;
  for(let i=1;i<keys.length;i++){
    if(frame<=keys[i].frame){
      const a=keys[i-1],b=keys[i],t=ease((frame-a.frame)/(b.frame-a.frame),a.easing);
      const pose={...a.pose};
      for(const joint of Object.keys(pose) as (keyof RigPose)[]){
        pose[joint]=a.pose[joint]+(b.pose[joint]-a.pose[joint])*t;
      }
      return pose;
    }
  }
  return keys[keys.length-1].pose;
}

/** Lightweight native SVG rig. Every pose is deterministic at any frame.
 * Face, clothes and gestures are editable properties; no AI image is implied. */
export function Character2D({layer,frame}:{layer:SceneLayer;frame:number}){
  const kind=layer.characterType,expression=layer.expression;
  const rig=evaluateRig(layer,frame);
  const intensity=layer.behaviorIntensity;
  const time=frame/30,walk=layer.behavior==='walk';
  const step=walk?Math.sin(time*10)*22*intensity:0;
  const point=layer.behavior==='point',wave=layer.behavior==='wave'||layer.behavior==='celebrate';
  const celebrate=layer.behavior==='celebrate';
  const think=layer.behavior==='think'||layer.behavior==='nod';
  const leftRotate=rig.leftArm+(wave?(-28+Math.sin(time*7)*23)*intensity:point?-35:step);
  const rightRotate=rig.rightArm+(celebrate?(-45+Math.sin(time*7+1)*12):wave?(-15-Math.sin(time*7)*16):
    point?-75:think?15:-step);
  const headMove=layer.behavior==='nod'?Math.sin(time*5)*4:
    expression==='thinking'?Math.sin(time*2)*3:0;
  const skin=kind==='child'?'#f2cfa7':kind==='builder'?'#dcae85':kind==='banker'?'#d5b194':
    kind==='scientist'?'#d7b092':'#e6b98e';
  const shirt=kind==='banker'?'#26354f':kind==='builder'?'#e4ad56':
    kind==='scientist'?'#e5edf0':kind==='presenter'?'#547890':
    kind==='student'?'#6b8d87':kind==='parent'?'#8e6f83':'#446f92';
  const hair=kind==='banker'?'#262326':kind==='scientist'?'#9aa8ab':
    kind==='child'?'#544032':'#2d2932';
  const eyeY=143+headMove;
  const smiling=expression==='happy'||expression==='surprised'||celebrate||rig.smile>.35;
  const worried=expression==='worried'||expression==='sad'||rig.smile<-.35;
  return <svg viewBox="0 0 300 480" width="100%" height="100%" role="img"
    aria-label={'Personagem vetorial ilustrativo: '+kind}>
    <ellipse cx="150" cy="466" rx="104" ry="13" fill="#00000035"/>
    <g transform={walk?'translate(0 '+Math.abs(step)*.12+')':undefined}>
      <g transform={'rotate('+(rig.leftLeg-step*.7)+' 130 355)'}>
        <path d="M105 345 L92 448 Q83 463 107 466 L138 465 L152 346" fill="#283d4f"/>
        <path d="M87 447 Q72 465 96 468 L140 468 Q149 453 129 449Z" fill="#172536"/>
      </g>
      <g transform={'rotate('+(rig.rightLeg+step*.7)+' 170 355)'}>
        <path d="M160 346 L169 451 Q181 464 197 465 L218 461 L199 345" fill="#30465a"/>
        <path d="M172 449 Q169 467 187 469 L229 469 Q232 449 206 448Z" fill="#1c2b3c"/>
      </g>
      <path d="M105 214 Q150 191 198 218 L220 358 Q150 385 79 358Z"
        fill={shirt} stroke="#1d2d3a" strokeWidth="4"/>
      {kind==='scientist'&&<path d="M113 221 L139 290 L126 355 L84 356 L104 228 M194 220 L158 293 L173 358 L217 354Z"
        fill="#ffffffc5"/>}
      {kind==='banker'&&<path d="M151 220 L139 272 L154 308 L167 273Z" fill="#d4b36b"/>}
      {kind==='builder'&&<path d="M113 216 L112 357 M191 217 L190 358" stroke="#fff0a9" strokeWidth="13"/>}
      <g transform={'rotate('+leftRotate+' 105 238)'}>
        <path d="M105 236 Q75 245 68 291 L48 354 Q45 368 60 372 L78 364 L102 302 L125 250Z"
          fill={shirt} stroke="#1e2c39" strokeWidth="3"/>
        <circle cx="59" cy="369" r="15" fill={skin}/>
      </g>
      <g transform={'rotate('+rightRotate+' 198 238)'}>
        <path d="M196 236 Q222 243 237 290 L258 352 Q263 366 247 376 L233 364 L217 308 L184 252Z"
          fill={shirt} stroke="#1e2c39" strokeWidth="3"/>
        <ellipse cx="252" cy="370" rx="16" ry="18" fill={skin}/>
      </g>
      <path d="M141 194 L140 226 Q152 245 168 226 L166 194Z" fill={skin}/>
      <g transform={'rotate('+(rig.head+headMove)+' 151 161)'}>
        <ellipse cx="150" cy="153" rx="69" ry="77" fill={skin}/>
        <path d="M82 154 Q72 75 119 60 Q158 39 202 69 Q228 104 211 159 L202 116
          Q176 87 145 105 L102 118Z" fill={hair}/>
        {kind==='builder'&&<>
          <path d="M81 101 Q103 37 172 57 Q224 71 222 113Z" fill="#f6b847" stroke="#c28d32" strokeWidth="4"/>
          <rect x="72" y="104" width="160" height="13" rx="6" fill="#dca339"/>
        </>}
        <circle cx={125+rig.eyeX} cy={eyeY+rig.eyeY} r="6" fill="#2b2931"/>
        <circle cx={177+rig.eyeX} cy={eyeY+rig.eyeY} r="6" fill="#2b2931"/>
        {think?<path d="M117 126 Q128 120 136 126 M167 126 Q179 128 184 125" stroke="#55433c"
          strokeWidth="3" fill="none"/>:null}
        {worried?<path d="M129 189 Q151 169 174 190" stroke="#713e42" strokeWidth="5" fill="none"/>:
        <path d={smiling?'M125 177 Q148 205 178 178':'M131 184 Q154 '+(192+rig.smile*18)+' 174 184'}
          fill="none" stroke="#794a45" strokeWidth="4" strokeLinecap="round"/>}
        {expression==='surprised'&&<circle cx="151" cy="184" r="11" fill="#784b45"/>}
      </g>
    </g>
  </svg>;
}
