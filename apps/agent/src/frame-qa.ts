/** Pixel-level review of real Remotion PNG frames, all on this computer. No remote vision service. */
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import {PNG} from 'pngjs';
import {projectSchema,projectDuration,type Project} from '../../../src/model/project';
import {pixelChange,rasterMetrics,regionContrast,type RasterFrame} from '../../../src/model/frame-pixels';
import {reviewVisualDirection} from '../../../src/model/direction';

export interface RasterIssue {frame:number;code:string;severity:'info'|'warning';message:string}
export interface RasterReport {frames:number[];samples:Array<{
  frame:number;change:number;luminanceSpread:number;edgeActivity:number;darkPercent:number
}>;issues:RasterIssue[];method:string}
export async function inspectRenderedFrames(input:unknown):Promise<RasterReport>{
  const project=projectSchema.parse(input),duration=projectDuration(project);
  const intervals=project.visualMode==='shots'?project.shots.map(s=>[s.startFrame,s.durationFrames] as const):
    project.scenes.reduce((a,s)=>{
      const start=a.length?a[a.length-1][0]+a[a.length-1][1]:0;
      a.push([start,s.durationFrames]);return a;
    },[] as Array<readonly [number,number]>);
  // At most eight sampled shots plus adjacent frames. The user can inspect the complete MP4 separately.
  const selected=intervals.filter((_,i)=>i%Math.max(1,Math.ceil(intervals.length/8))===0).slice(0,8);
  const frames=[...new Set(selected.flatMap(([start,length])=>{
    const center=Math.min(duration-1,start+Math.floor(length/2));
    return [center,Math.min(duration-1,center+1)];
  }))].sort((a,b)=>a-b);
  const directory=await mkdtemp(join(tmpdir(),'dark-studio-raster-'));
  try{
    const serveUrl=await bundle({entryPoint:resolve('src/video/index.ts')});
    const composition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:{project}});
    const images=new Map<number,RasterFrame>();
    for(const frame of frames){
      const file=join(directory,'frame-'+frame+'.png');
      await renderStill({serveUrl,composition,inputProps:{project},frame,output:file,
        scale:1/4,logLevel:'error'});
      const png=PNG.sync.read(await readFile(file));
      images.set(frame,{width:png.width,height:png.height,data:png.data});
    }
    const issues:RasterIssue[]=[];
    const samples=frames.map(frame=>{
      const raster=images.get(frame)!;
      const metrics=rasterMetrics(raster);
      const change=images.has(frame-1)?pixelChange(images.get(frame-1)!,raster):0;
      if(change>.3)issues.push({frame,code:'abrupt-frame-change',severity:'warning',
        message:'Mudança grande entre frames consecutivos: revise cortes, velocidade ou tremulação.'});
      if(metrics.edgeActivity>.12)issues.push({frame,code:'raster-edge-activity',severity:'info',
        message:'Alta atividade nas bordas do frame; confira cortes e elementos parcialmente fora da tela.'});
      if(metrics.luminanceSpread<.045)issues.push({frame,code:'flat-frame',severity:'info',
        message:'Frame com pouca variação luminosa; confira contraste e legibilidade.'});
      const shot=project.visualMode==='shots'?project.shots.find(s=>
        frame>=s.startFrame&&frame<s.startFrame+s.durationFrames):undefined;
      if(shot){
        const visible=shot.layers.filter(l=>!l.parentId&&frame>=shot.startFrame+l.startFrame&&
          frame<shot.startFrame+l.startFrame+l.durationFrames);
        if(visible.length>14)issues.push({frame,code:'information-density',severity:'warning',
          message:'Muitos elementos visíveis no mesmo frame ('+visible.length+'); simplifique a composição.'});
        for(const layer of visible.filter(l=>l.kind==='text')){
          const box={x:layer.x/4,y:layer.y/4,width:layer.width/4,height:layer.height/4};
          if(regionContrast(raster,box)<.07)issues.push({frame,code:'text-region-flat',severity:'warning',
            message:'A região renderizada de texto "'+layer.name+'" tem pouca variação: verifique legibilidade.'});
          if(layer.x<0||layer.y<0||layer.x+layer.width>1920||layer.y+layer.height>1080)
            issues.push({frame,code:'text-crop-geometry',severity:'warning',
              message:'Texto próximo/fora do canvas; confira cortes nos pixels renderizados.'});
        }
        for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
          const a=visible[i],b=visible[j];
          if(a.kind==='scene'||b.kind==='scene')continue;
          const overlap=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
            Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
          const small=Math.min(a.width*a.height,b.width*b.height);
          if(overlap>.7*small&&a.kind==='text'&&b.kind==='text')
            issues.push({frame,code:'text-overlap-risk',severity:'warning',
              message:'Caixas de texto sobrepostas em '+shot.title.slice(0,70)+'. Verifique o frame real.'});
        }
      }
      return {frame,change,...metrics};
    });
    for(const warning of reviewVisualDirection(project).issues.filter(i=>i.code==='contrast-risk'||i.code==='text-overflow-risk'))
      issues.push({frame:0,code:'geometry-'+warning.code,severity:'info',message:warning.message});
    return {frames,samples,issues,method:'PNG renderizado 480×270: métricas reais de contraste/bordas e diferença entre frames; sobreposição/corte também usam geometria. Não é OCR e não certifica qualidade.'};
  }finally{await rm(directory,{force:true,recursive:true}).catch(()=>{});}
}
