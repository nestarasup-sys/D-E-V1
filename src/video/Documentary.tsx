import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from 'remotion';
import type { Project, Scene } from '../model/project';

function SceneVisual({scene}: {scene:Scene}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18], [0, 1], {extrapolateRight:'clamp'});
  const translate = interpolate(frame,[0,30],[42,0],{extrapolateRight:'clamp'});
  const scale = interpolate(frame,[0,scene.durationFrames],[1,1.09],{extrapolateRight:'clamp'});
  return <AbsoluteFill style={{backgroundColor:scene.backgroundColor, overflow:'hidden', fontFamily:'Arial, Helvetica, sans-serif'}}>
    {scene.imageUrl ? <AbsoluteFill style={{transform:`scale(${scale})`}}><Img src={scene.imageUrl} style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.32}}/></AbsoluteFill> : null}
    <AbsoluteFill style={{background:'linear-gradient(110deg,rgba(0,0,0,.45),transparent 80%)'}}/>
    <AbsoluteFill style={{padding:120,display:'flex',justifyContent:'center'}}>
      <div style={{opacity,transform:`translateY(${translate}px)`,maxWidth:1550}}>
        <div style={{fontSize:31,color:scene.accentColor,fontWeight:700,letterSpacing:7,marginBottom:38}}>{scene.kicker}</div>
        <div style={{fontSize:scene.kind==='stat'?220:scene.kind==='quote'?105:116,fontWeight:900,color:'#fff',lineHeight:1.04,letterSpacing:-3,overflowWrap:'anywhere'}}>{scene.title}</div>
        <div style={{width:135,height:9,backgroundColor:scene.accentColor,margin:'42px 0'}} />
        <div style={{fontSize:43,color:'#e2e8f0',lineHeight:1.3,maxWidth:1250}}>{scene.subtitle}</div>
      </div>
    </AbsoluteFill>
    <div style={{position:'absolute',right:100,bottom:65,color:'rgba(255,255,255,.5)',fontSize:25,letterSpacing:4}}>DARK STUDIO</div>
  </AbsoluteFill>;
}

export function Documentary({project}: {project:Project}) {
  let offset = 0;
  return <AbsoluteFill style={{background:'#050911'}}>{project.scenes.map(scene => {
    const from = offset; offset += scene.durationFrames;
    return <Sequence key={scene.id} from={from} durationInFrames={scene.durationFrames}><SceneVisual scene={scene}/></Sequence>;
  })}</AbsoluteFill>;
}
