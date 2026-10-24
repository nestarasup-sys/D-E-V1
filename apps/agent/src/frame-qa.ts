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
import {createPortugueseOCR,type OCRWord} from './ocr-local';

export interface RasterIssue {frame:number;seconds?:number;code:string;severity:'info'|'warning';message:string;recommendation?:string}
export interface RasterReport {frames:number[];samples:Array<{
  frame:number;change:number;luminanceSpread:number;edgeActivity:number;darkPercent:number
}>;issues:RasterIssue[];method:string;ocr:{status:'ready'|'unavailable';language:string;framesAnalyzed:number;error?:string};
  recognized:Array<{frame:number;seconds:number;words:OCRWord[]}>}
export async function inspectRenderedFrames(input:unknown):Promise<RasterReport>{
  const project=projectSchema.parse(input),duration=projectDuration(project);
  const intervals=project.visualMode==='shots'?project.shots.map(s=>[s.startFrame,s.durationFrames] as const):
    project.scenes.reduce((a,s)=>{
      const start=a.length?a[a.length-1][0]+a[a.length-1][1]:0;
      a.push([start,s.durationFrames]);return a;
    },[] as Array<readonly [number,number]>);
  // Adaptive sampling: opening, transition, motion keyframes, middle and the last frames.
  const selected=intervals.filter((_,i)=>i%Math.max(1,Math.ceil(intervals.length/10))===0).slice(0,10);
  const frames=[...new Set(selected.flatMap(([start,length])=>{
    const offsets=[0,1,2,Math.floor(length*.25),Math.floor(length*.5),
      Math.floor(length*.75),length-2,length-1];
    const shot=project.shots.find(s=>s.startFrame===start);
    if(shot){
      offsets.push(Math.floor(shot.transitionIn.durationFrames/2));
      for(const point of shot.cameraPath)offsets.push(point.frame);
      for(const layer of shot.layers)
        for(const keys of Object.values(layer.motion))
          for(const key of keys)offsets.push(layer.startFrame+key.frame);
    }
    return offsets.filter(n=>n>=0&&n<length).map(n=>Math.min(duration-1,start+n));
  }))].sort((a,b)=>a-b).slice(0,96);
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
    const ocrByFrame=new Map<number,OCRWord[]>();
    let ocrStatus:{status:'ready'|'unavailable';language:string;framesAnalyzed:number;error?:string}={
      status:'unavailable',language:'por',framesAnalyzed:0,
    };
    // OCR only a bounded subset of strategic frames. The other frames retain pixel metrics.
    try{
      const recognizer=await createPortugueseOCR();
      try{
        const textFrames=frames.filter((frame,i)=>i%Math.max(1,Math.ceil(frames.length/24))===0)
          .slice(0,24);
        for(const frame of textFrames){
          const words=await recognizer.recognize(join(directory,'frame-'+frame+'.png'));
          ocrByFrame.set(frame,words);ocrStatus.framesAnalyzed++;
        }
        ocrStatus.status='ready';
      }finally{await recognizer.close();}
    }catch(e){
      ocrStatus.error=e instanceof Error?e.message:'Modelo OCR indisponível';
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
      const recognized=ocrByFrame.get(frame);
      if(recognized){
        for(const word of recognized){
          if(word.x<4||word.y<3||word.x+word.width>raster.width-4||
            word.y+word.height>raster.height-3){
            issues.push({frame,code:'ocr-text-cropped',severity:'warning',
              message:'Texto OCR possivelmente cortado na borda: "'+word.text+'".'});
          }
          if(word.confidence<38)issues.push({frame,code:'ocr-low-confidence',severity:'info',
            message:'OCR com baixa confiança para "'+word.text+
              '" ('+Math.round(word.confidence)+'%); confira contraste/contorno.'});
        }
        for(let i=0;i<recognized.length;i++)for(let j=i+1;j<recognized.length;j++){
          const a=recognized[i],b=recognized[j];
          const area=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
            Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
          if(area>.35*Math.min(a.width*a.height,b.width*b.height))
            issues.push({frame,code:'ocr-word-overlap',severity:'warning',
              message:'Palavras detectadas pelo OCR ocupam regiões sobrepostas.'});
        }
      }
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
          if(recognized&&layer.behavior!=='word-reveal'&&layer.text.trim()){
            const inArea=recognized.filter(w=>w.x+w.width/2>=box.x&&
              w.x+w.width/2<=box.x+box.width&&w.y+w.height/2>=box.y&&
              w.y+w.height/2<=box.y+box.height);
            if(!inArea.length&&regionContrast(raster,box)<.16)
              issues.push({frame,code:'ocr-text-missing',severity:'warning',
                message:'Texto previsto "'+layer.text.slice(0,60)+
                  '" não foi reconhecido nesta região. Pode estar ilegível ou cortado.'});
          }
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
    const recommendations:Record<string,string>={
      'ocr-text-cropped':'Reposicione o texto para dentro da área segura (margem mínima de 5%).',
      'ocr-low-confidence':'Aumente tamanho/peso da fonte, contraste e reduza textura atrás do texto.',
      'ocr-word-overlap':'Separe as caixas de texto, revise o espaçamento e a hierarquia visual.',
      'ocr-text-missing':'Confirme o conteúdo no frame, aumente contraste e verifique recorte ou animação.',
      'abrupt-frame-change':'Revise keyframes, velocidade de câmera ou use transição menos agressiva.',
      'raster-edge-activity':'Verifique objetos próximos às margens e aplique área segura.',
      'flat-frame':'Aumente separação de luminância entre primeiro plano e fundo.',
      'text-region-flat':'Use contorno/sombra e fundo contrastante para textos.',
      'text-overlap-risk':'Mova uma das caixas ou divida a mensagem em dois planos.',
      'text-crop-geometry':'Reposicione a caixa de texto para dentro do canvas.',
      'information-density':'Reduza elementos simultâneos e divida informação entre planos.',
    };
    const unique=new Map<string,RasterIssue>();
    for(const issue of issues){
      const key=issue.frame+':'+issue.code+':'+issue.message;
      unique.set(key,{...issue,seconds:Number((issue.frame/project.fps).toFixed(3)),
        recommendation:recommendations[issue.code]||'Revise o frame indicado na prévia.'});
    }
    return {frames,samples,issues:[...unique.values()].sort((a,b)=>a.frame-b.frame),
      ocr:ocrStatus,recognized:[...ocrByFrame].map(([frame,words])=>({
        frame,seconds:Number((frame/project.fps).toFixed(3)),words,
      })),
      method:'PNG 480×270 com análise de pixels + OCR offline em português nos frames estratégicos. Amostragem adaptativa; verificações geométricas complementares. Resultados são alertas, não certificação.'};
  }finally{await rm(directory,{force:true,recursive:true}).catch(()=>{});}
}
