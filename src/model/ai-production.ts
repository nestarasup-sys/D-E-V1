/** Declarative audiovisual interchange for ChatGPT -> Dark Studio (no Codex). */
import {z} from 'zod';
import {directionSchema,compileDirection} from './direction';
import {projectSchema,starterProject,type Project,type Asset} from './project';
import {retimeCamera,retimeMotion,retimeShotLayers} from './shots';

export const narratorSchema=z.object({
  engine:z.literal('windows-sapi').default('windows-sapi'),
  voice:z.string().trim().max(140).default(''),
  rate:z.number().int().min(-10).max(10).default(1),
  pauseMs:z.number().int().min(0).max(2500).default(350),
}).strict().default({});
export const brollNeedSchema=z.object({
  query:z.string().trim().min(2).max(180),
  description:z.string().max(450).default(''),
  purpose:z.string().max(280).default('Contexto narrativo'),
  provider:z.enum(['pexels','manual']).default('pexels'),
  licenseNote:z.string().max(300).default('Verificar direitos e atribuição antes de publicar'),
}).strict();
const beat=directionSchema.shape.beats.element.omit({
  startFrame:true,durationFrames:true,
}).extend({
  plannedFrames:z.number().int().min(15).max(1800).default(120),
  narration:z.string().trim().min(1).max(1600),
  broll:brollNeedSchema.optional(),
});
export const productionSchema=z.object({
  format:z.literal('darkstudio-production'),
  version:z.literal(1),
  title:z.string().trim().min(1).max(120),
  voice:narratorSchema,
  brand:directionSchema.shape.brand,
  beats:z.array(beat).min(1).max(200),
}).strict();
export type AIProduction=z.infer<typeof productionSchema>;
export type ProductionBeat=AIProduction['beats'][number];
export type NarratedAudio={asset:Asset;frames:number};

export const productionPlanSchema=z.object({
  version:z.literal(1),
  source:productionSchema,
  segments:z.array(z.object({
    durationFrames:z.number().int().min(15).max(1800),
    narrationFrames:z.number().int().positive().max(1800),
    captionId:z.string().uuid(),clipId:z.string().uuid(),
  }).strict()).min(1).max(200),
}).strict();
export type ProductionPlan=z.infer<typeof productionPlanSchema>;

function scaled(frame:number,oldFrames:number,newFrames:number){
  return Math.min(newFrames-1,Math.max(0,
    Math.round(frame*(newFrames-1)/Math.max(1,oldFrames-1))));
}
function adaptBeat(input:ProductionBeat,length:number){
  const scale=(n:number)=>scaled(n,input.plannedFrames,length);
  return {
    ...input,
    startFrame:0,
    durationFrames:length,
    cameraPath:input.cameraPath?.map(p=>({...p,frame:scale(p.frame)}))
      .filter((p,i,a)=>i===0||p.frame>a[i-1].frame),
    transitionIn:input.transitionIn?
      {...input.transitionIn,durationFrames:Math.min(length,input.transitionIn.durationFrames)}:undefined,
    layers:input.layers?.map(layer=>{
      const start=scale(layer.startFrame);
      const end=scale(Math.min(input.plannedFrames-1,
        layer.startFrame+(layer.durationFrames??input.plannedFrames-layer.startFrame)-1));
      const durationFrames=Math.max(1,Math.min(length-start,end-start+1));
      const curve=layer.motion;
      return {
        ...layer,startFrame:start,durationFrames,
        motion:curve?Object.fromEntries(Object.entries(curve).map(([name,keys])=>[
          name,keys.map(k=>({...k,frame:scaled(k.frame,input.plannedFrames,length)}))
            .filter((k,i,a)=>i===0||k.frame>a[i-1].frame),
        ])):undefined,
        rigKeys:layer.rigKeys?.map(k=>({...k,frame:scaled(k.frame,input.plannedFrames,length)}))
          .filter((k,i,a)=>i===0||k.frame>a[i-1].frame),
        chartStages:layer.chartStages?.map(k=>({...k,frame:scaled(k.frame,input.plannedFrames,length)}))
          .filter((k,i,a)=>i===0||k.frame>a[i-1].frame),
      };
    }),
  };
}
export function compileProduction(sourceInput:unknown,audio:NarratedAudio[],id:()=>string):Project{
  const source=productionSchema.parse(sourceInput);
  if(source.beats.length!==audio.length)
    throw new Error('A quantidade de áudios não corresponde às falas do JSON.');
  let start=0;
  const segments:ProductionPlan['segments']=[];
  const captions:Project['captions']=[];
  const clips:Project['clips']=[];
  const scenes:Project['scenes']=[];
  const beats:unknown[]=[];
  for(let i=0;i<source.beats.length;i++){
    const original=source.beats[i],item=audio[i];
    const narrationFrames=item.frames;
    const silence=Math.round(source.voice.pauseMs*30/1000);
    const durationFrames=Math.max(15,narrationFrames+silence);
    if(narrationFrames<1||durationFrames>1800)
      throw new Error('A fala '+(i+1)+' excede 60 segundos. Divida-a em trechos menores.');
    const captionId=id(),clipId=id();
    segments.push({durationFrames,narrationFrames,captionId,clipId});
    captions.push({id:captionId,startFrame:start,endFrame:start+narrationFrames,
      text:original.narration,words:[]});
    clips.push({id:clipId,assetId:item.asset.id,lane:'narration',startFrame:start,
      durationFrames:narrationFrames,trimStartFrames:0,volume:1,volumeKeyframes:[]});
    scenes.push({id:'scene-'+id(),kind:'title',title:original.title.slice(0,180),
      subtitle:original.subtitle,kicker:original.kicker,
      durationFrames,accentColor:original.accentColor??'#e2ad56',
      backgroundColor:original.backgroundColor??'#101827',imageUrl:''});
    const {narration,plannedFrames,broll,...visual}=original;
    const adapted=adaptBeat(original,durationFrames);
    const {narration:drop1,plannedFrames:drop2,broll:drop3,...shotFields}=adapted;
    void narration;void plannedFrames;void broll;void visual;void drop1;void drop2;void drop3;
    beats.push({...shotFields,startFrame:start,durationFrames});
    start+=durationFrames;
  }
  const skeleton=projectSchema.parse({...structuredClone(starterProject),
    id:id(),name:source.title,scenes,assets:audio.map(a=>a.asset),clips,captions,shots:[],
    visualMode:'legacy',chapters:[],
    productionPlan:{version:1,source,segments},
  });
  const draft={version:1,title:source.title,brand:source.brand,beats};
  const complete=compileDirection(skeleton,draft,id).preview;
  const withMedia={...complete,shots:complete.shots.map((shot,i)=>({
    ...shot,mediaPlan:source.beats[i].broll?{
      query:source.beats[i].broll.query,
      intendedUse:source.beats[i].broll.purpose,
      licenseNote:source.beats[i].broll.licenseNote,
    }:shot.mediaPlan,
  }))};
  return projectSchema.parse(withMedia);
}

/** Re-time only matching segment-relative scene/shot/caption data. Do not scale whole MP4. */
export function resyncProduction(current:Project,newAudio:NarratedAudio[],id:()=>string,newSource?:AIProduction):Project{
  void id;
  const plan=current.productionPlan?productionPlanSchema.parse(current.productionPlan):null;
  if(!plan)throw new Error('Este projeto não veio de produção JSON v0.18.');
  if(plan.segments.length!==newAudio.length||current.scenes.length!==newAudio.length)
    throw new Error('As cenas e falas do roteiro foram alteradas. Exporte uma cópia antes de regenerar.');
  const starts:number[]=[];let total=0;
  for(const seg of plan.segments){starts.push(total);total+=seg.durationFrames;}
  const newSeg=plan.segments.map((s,i)=>{
    const narrationFrames=newAudio[i].frames;
    const length=Math.max(15,narrationFrames+Math.round(plan.source.voice.pauseMs*.03));
    if(length>1800||narrationFrames<1)throw new Error('Narração excede o limite de 60 segundos por trecho.');
    return {...s,narrationFrames,durationFrames:length};
  });
  const newStarts:number[]=[];let cursor=0;for(const s of newSeg){newStarts.push(cursor);cursor+=s.durationFrames;}
  const which=(frame:number)=>{
    let i=starts.length-1;
    while(i>0&&frame<starts[i])i--;
    return i;
  };
  const scenes=current.scenes.map((scene,i)=>({...scene,durationFrames:newSeg[i].durationFrames}));
  const narrationClips=new Set(plan.segments.map(s=>s.clipId));
  const narrationAssets=new Set(current.clips.filter(c=>narrationClips.has(c.id)).map(c=>c.assetId));
  const remap=(frame:number)=>{
    const i=which(frame),relative=Math.max(0,frame-starts[i]);
    return newStarts[i]+Math.min(newSeg[i].durationFrames-1,
      scaled(relative,plan.segments[i].durationFrames,newSeg[i].durationFrames));
  };
  const shots=current.shots.map(shot=>{
    const i=which(shot.startFrame);
    const old=plan.segments[i].durationFrames,length=newSeg[i].durationFrames;
    // Existing shots authored within each spoken block keep their layering and IDs.
    const newStart=newStarts[i]+scaled(shot.startFrame-starts[i],old,length);
    const newLength=Math.max(1,Math.min(newStarts[i]+length-newStart,
      Math.round(shot.durationFrames*length/old)));
    return {...shot,startFrame:newStart,durationFrames:newLength,
      motion:retimeMotion(shot.motion,shot.durationFrames,newLength),
      cameraPath:retimeCamera(shot.cameraPath,shot.durationFrames,newLength),
      layers:retimeShotLayers(shot.layers,shot.durationFrames,newLength),
      transitionIn:{...shot.transitionIn,durationFrames:Math.min(newLength,shot.transitionIn.durationFrames)},
    };
  });
  const captions=current.captions.map(c=>{
    const i=plan.segments.findIndex(s=>s.captionId===c.id);
    if(i>=0)return {...c,startFrame:newStarts[i],
      endFrame:newStarts[i]+newSeg[i].narrationFrames,words:[]};
    const begin=remap(c.startFrame),end=remap(c.endFrame);
    return {...c,startFrame:begin,endFrame:Math.max(begin+1,end),words:[]};
  });
  const clips=current.clips.filter(c=>!narrationClips.has(c.id)).map(c=>{
    const begin=remap(c.startFrame);
    return {...c,startFrame:begin,durationFrames:Math.max(1,Math.min(c.durationFrames,cursor-begin))};
  });
  for(let i=0;i<newSeg.length;i++){
    clips.push({id:newSeg[i].clipId,assetId:newAudio[i].asset.id,lane:'narration',
      startFrame:newStarts[i],durationFrames:newSeg[i].narrationFrames,
      trimStartFrames:0,volume:1,volumeKeyframes:[]});
  }
  const assets=current.assets.filter(a=>!narrationAssets.has(a.id)).concat(newAudio.map(a=>a.asset));
  return projectSchema.parse({...current,scenes,shots,captions,clips,assets,
    productionPlan:{...plan,source:newSource??plan.source,segments:newSeg}});
}
