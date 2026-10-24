import {AbsoluteFill,Audio,Img,interpolate,OffthreadVideo,Sequence,useCurrentFrame} from 'remotion';
import type {Project,Scene,MediaClip,Asset} from '../model/project';
import {evaluateKeyframes} from '../model/shots';
import {ShotVisual} from './ShotVisual';

function SceneVisual({scene,layer}:{scene:Scene,layer:'background'|'text'}) {
  const frame=useCurrentFrame();
  const opacity=interpolate(frame,[0,18],[0,1],{extrapolateRight:'clamp'});
  const translate=interpolate(frame,[0,30],[42,0],{extrapolateRight:'clamp'});
  const scale=interpolate(frame,[0,scene.durationFrames],[1,1.09],{extrapolateRight:'clamp'});
  if(layer==='background')return <AbsoluteFill style={{backgroundColor:scene.backgroundColor,overflow:'hidden'}}>
    {scene.imageUrl?<AbsoluteFill style={{transform:`scale(${scale})`}}><Img src={scene.imageUrl} style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.4}}/></AbsoluteFill>:null}
  </AbsoluteFill>;
  return <AbsoluteFill style={{fontFamily:'Arial, Helvetica, sans-serif'}}>
    <AbsoluteFill style={{background:'linear-gradient(110deg,rgba(0,0,0,.6),transparent 90%)'}}/>
    <AbsoluteFill style={{padding:120,display:'flex',justifyContent:'center'}}><div style={{opacity,transform:`translateY(${translate}px)`,maxWidth:1550}}>
      <div style={{fontSize:31,color:scene.accentColor,fontWeight:700,letterSpacing:7,marginBottom:38}}>{scene.kicker}</div>
      <div style={{fontSize:scene.kind==='stat'?220:scene.kind==='quote'?105:116,fontWeight:900,color:'#fff',lineHeight:1.04,letterSpacing:-3,overflowWrap:'anywhere'}}>{scene.title}</div>
      <div style={{width:135,height:9,backgroundColor:scene.accentColor,margin:'42px 0'}}/>
      <div style={{fontSize:43,color:'#e2e8f0',lineHeight:1.3,maxWidth:1250}}>{scene.subtitle}</div>
    </div></AbsoluteFill>
    <div style={{position:'absolute',right:100,bottom:65,color:'rgba(255,255,255,.5)',fontSize:25,letterSpacing:4}}>DARK STUDIO</div>
  </AbsoluteFill>;
}
function ClipVisual({clip,asset}:{clip:MediaClip,asset:Asset}) {
  if(asset.kind==='image')return <AbsoluteFill><Img src={asset.url} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>;
  if(asset.kind==='video')return <AbsoluteFill><OffthreadVideo src={asset.url} muted startFrom={clip.trimStartFrames} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>;
  return null;
}
function ClipAudio({clip,asset}:{clip:MediaClip;asset:Asset}){
  const frame=useCurrentFrame();
  const volume=evaluateKeyframes(clip.volumeKeyframes,frame,clip.volume);
  return <Audio src={asset.url} startFrom={clip.trimStartFrames} volume={volume}/>;
}
export function Documentary({project}:{project:Project}) {
  let offset=0;
  const assets=new Map(project.assets.map(a=>[a.id,a]));
  const positions=project.scenes.map(scene=>{const from=offset;offset+=scene.durationFrames;return {scene,from};});
  return <AbsoluteFill style={{background:'#050911'}}>
    {project.visualMode==='legacy'&&positions.map(({scene,from})=><Sequence key={'background-'+scene.id} from={from} durationInFrames={scene.durationFrames}><SceneVisual scene={scene} layer="background"/></Sequence>)}
    {project.visualMode==='legacy'&&project.clips.filter(c=>c.lane==='visual').map(clip=>{const asset=assets.get(clip.assetId);return asset?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationFrames}><ClipVisual clip={clip} asset={asset}/></Sequence>:null;})}
    {project.visualMode==='legacy'&&positions.map(({scene,from})=><Sequence key={'text-'+scene.id} from={from} durationInFrames={scene.durationFrames}><SceneVisual scene={scene} layer="text"/></Sequence>)}
    {project.visualMode==='shots'&&[...project.shots].sort((a,b)=>a.zIndex-b.zIndex||a.startFrame-b.startFrame).map(shot=>
      <Sequence key={'shot-'+shot.id} from={shot.startFrame} durationInFrames={shot.durationFrames}>
        <ShotVisual shot={shot} asset={shot.assetId?assets.get(shot.assetId):undefined} kit={project.channelKit}
          evidence={project.evidence.find(item=>item.id===shot.investigation.sourceEvidenceId)}
          assets={assets} captions={project.captions}/>
      </Sequence>)}
    {project.captions.map(c=><Sequence key={'caption-'+c.id} from={c.startFrame} durationInFrames={c.endFrame-c.startFrame}>
      <AbsoluteFill style={{justifyContent:'flex-end',alignItems:'center',paddingBottom:80,pointerEvents:'none'}}>
        <div style={{fontFamily:'Arial, sans-serif',whiteSpace:'pre-line',fontSize:44,fontWeight:700,
          textAlign:'center',maxWidth:'88%',color:'#fff',textShadow:'0 3px 12px #000,0 1px 3px #000',
          background:project.channelKit.captionStyle==='minimal'?'transparent':'rgba(0,0,0,.56)',padding:'14px 27px',borderRadius:10}}>{c.text}</div>
      </AbsoluteFill>
    </Sequence>)}
    {project.clips.filter(c=>c.lane!=='visual').map(clip=>{const asset=assets.get(clip.assetId);return asset?<Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationFrames}><ClipAudio clip={clip} asset={asset}/></Sequence>:null;})}
  </AbsoluteFill>;
}
