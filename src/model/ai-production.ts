/** Declarative audiovisual interchange for ChatGPT -> Dark Studio (no Codex). */
import {z} from 'zod';
import {directionSchema,compileDirection,layerBlueprintSchema} from './direction';
import {projectSchema,starterProject,type Project,type Asset} from './project';
import {retimeCamera,retimeMotion,retimeShotLayers} from './shots';
import {type WordAlignment,matchSpokenWord} from './speech-alignment';

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
export const musicPlanSchema=z.object({
  mood:z.enum(['documentary','tension','hope','calm']),
  volume:z.number().min(.03).max(.4).default(.22),
  ducking:z.number().min(.05).max(.8).default(.28),
}).strict();
export const soundEventSchema=z.object({
  sound:z.enum(['soft-whoosh','page-turn','document-click','ambient-pulse',
    'positive-chime','keyboard-tap','transition-sweep','notification-soft','impact-low']),
  word:z.string().trim().min(1).max(80),
  occurrence:z.number().int().min(1).max(20).default(1),
  offsetFrames:z.number().int().min(-45).max(45).default(0),
  volume:z.number().min(.05).max(.85).default(.45),
}).strict();
const beat=directionSchema.shape.beats.element.omit({
  startFrame:true,durationFrames:true,
}).extend({
  plannedFrames:z.number().int().min(15).max(1800).default(120),
  narration:z.string().trim().min(1).max(1600),
  layers:z.array(layerBlueprintSchema.extend({
    wordCue:z.object({
      word:z.string().trim().min(1).max(80),
      occurrence:z.number().int().min(1).max(20).default(1),
      offsetFrames:z.number().int().min(-120).max(120).default(0),
    }).strict().optional(),
  })).max(48).optional(),
  broll:brollNeedSchema.optional(),
  music:musicPlanSchema.optional(),
  soundEffects:z.array(soundEventSchema).max(8).default([]),
});
export const productionSchema=z.object({
  format:z.literal('darkstudio-production'),
  version:z.literal(1),
  title:z.string().trim().min(1).max(120),
  voice:narratorSchema,
  soundDesign:z.enum(['auto','explicit','off']).default('auto'),
  brand:directionSchema.shape.brand,
  beats:z.array(beat).min(1).max(200),
}).strict();
export type AIProduction=z.infer<typeof productionSchema>;
export type ProductionBeat=AIProduction['beats'][number];
export type NarratedAudio={asset:Asset;frames:number;alignment?:WordAlignment};
export type ProducedSound={asset:Asset;frames:number;beatIndex:number;
  lane:'music'|'sfx';word?:string;occurrence?:number;offsetFrames?:number;
  volume:number;ducking?:number};

export const productionPlanSchema=z.object({
  version:z.literal(1),
  source:productionSchema,
  segments:z.array(z.object({
    durationFrames:z.number().int().min(15).max(1800),
    narrationFrames:z.number().int().positive().max(1800),
    captionId:z.string().uuid(),clipId:z.string().uuid(),
    wordAlignment:z.enum(['aligned','unavailable']).optional(),
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
export function compileProduction(sourceInput:unknown,audio:NarratedAudio[],id:()=>string,sounds:ProducedSound[]=[]):Project{
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
    segments.push({durationFrames,narrationFrames,captionId,clipId,wordAlignment:item.alignment?.status??'unavailable'});
    captions.push({id:captionId,startFrame:start,endFrame:start+narrationFrames,
      text:original.narration,words:(item.alignment?.words.length??0)<=120?
        (item.alignment?.words??[]).map(w=>({...w,
          startFrame:start+w.startFrame,endFrame:start+w.endFrame})):[]});
    clips.push({id:clipId,assetId:item.asset.id,lane:'narration',startFrame:start,
      durationFrames:narrationFrames,trimStartFrames:0,volume:1,volumeKeyframes:[]});
    scenes.push({id:'scene-'+id(),kind:'title',title:original.title.slice(0,180),
      subtitle:original.subtitle,kicker:original.kicker,
      durationFrames,accentColor:original.accentColor??'#e2ad56',
      backgroundColor:original.backgroundColor??'#101827',imageUrl:''});
    const {narration,plannedFrames,broll,music,soundEffects,...visual}=original;
    const adapted=adaptBeat(original,durationFrames);
    const {narration:drop1,plannedFrames:drop2,broll:drop3,music:drop4,soundEffects:drop5,...shotFields}=adapted;
    void narration;void plannedFrames;void broll;void music;void soundEffects;void visual;void drop1;void drop2;void drop3;void drop4;void drop5;
    beats.push({...shotFields,startFrame:start,durationFrames,
      layers:shotFields.layers?.map(layer=>{
        const {wordCue,...rest}=layer;
        return wordCue?{...rest,cueCaptionId:captionId,cueWord:wordCue.word,
          cueOccurrence:wordCue.occurrence,cueOffsetFrames:wordCue.offsetFrames}:rest;
      }),
    });
    start+=durationFrames;
  }
  for(const sound of sounds){
    const segment=segments[sound.beatIndex],narrated=audio[sound.beatIndex];
    if(!segment||!narrated)throw new Error('Áudio procedural ligado a fala inexistente.');
    const segmentStart=segments.slice(0,sound.beatIndex)
      .reduce((n,seg)=>n+seg.durationFrames,0);
    let relative=0;
    if(sound.lane==='sfx'){
      const found=matchSpokenWord(narrated.alignment?.words??[],sound.word??'',sound.occurrence??1);
      if(found===null)continue; // never guess positions for inaudible or unmatched cues
      relative=Math.max(0,found+(sound.offsetFrames??0));
    }
    if(relative>=segment.durationFrames)continue;
    const frames=Math.min(sound.frames,segment.durationFrames-relative);
    if(frames<=0)continue;
    const volumeKeyframes:Project['clips'][number]['volumeKeyframes']=[];
    if(sound.lane==='music'&&frames>=12){
      const quiet=sound.volume*(sound.ducking??.28),last=frames-1;
      volumeKeyframes.push({frame:0,value:quiet,easing:'linear'});
      const spokenEnd=Math.min(last,segment.narrationFrames);
      if(spokenEnd>=1&&spokenEnd<last-3){
        volumeKeyframes.push({frame:spokenEnd,value:quiet,easing:'ease-out'});
        volumeKeyframes.push({frame:Math.min(last-1,spokenEnd+3),value:sound.volume,easing:'linear'});
      }
      volumeKeyframes.push({frame:last,value:0,easing:'linear'});
    }
    clips.push({id:id(),assetId:sound.asset.id,lane:sound.lane,
      startFrame:segmentStart+relative,durationFrames:frames,trimStartFrames:0,
      volume:sound.volume,volumeKeyframes});
  }
  const skeleton=projectSchema.parse({...structuredClone(starterProject),
    id:id(),name:source.title,scenes,assets:[...audio.map(a=>a.asset),...sounds.map(s=>s.asset)],clips,captions,shots:[],
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
export function resyncProduction(current:Project,newAudio:NarratedAudio[],id:()=>string,newSource?:AIProduction,newSounds:ProducedSound[]=[]):Project{
  const plan=current.productionPlan?productionPlanSchema.parse(current.productionPlan):null;
  if(!plan)throw new Error('Este projeto não veio de produção JSON v0.18.');
  if(plan.segments.length!==newAudio.length||current.scenes.length!==newAudio.length)
    throw new Error('As cenas e falas do roteiro foram alteradas. Exporte uma cópia antes de regenerar.');
  const starts:number[]=[];let total=0;
  for(const seg of plan.segments){starts.push(total);total+=seg.durationFrames;}
  const newSeg=plan.segments.map((s,i)=>{
    const narrationFrames=newAudio[i].frames;
    const length=Math.max(15,narrationFrames+Math.round((newSource??plan.source).voice.pauseMs*.03));
    if(length>1800||narrationFrames<1)throw new Error('Narração excede o limite de 60 segundos por trecho.');
    return {...s,narrationFrames,durationFrames:length,wordAlignment:newAudio[i].alignment?.status??'unavailable' as const};
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
      endFrame:newStarts[i]+newSeg[i].narrationFrames,
      words:(newAudio[i].alignment?.words??[]).slice(0,120).map(w=>({
        ...w,startFrame:newStarts[i]+w.startFrame,endFrame:newStarts[i]+w.endFrame,
      }))};
    const begin=remap(c.startFrame),end=remap(c.endFrame);
    return {...c,startFrame:begin,endFrame:Math.max(begin+1,end),words:[]};
  });
  // Built-in soundtrack clips are regenerated from semantic word cues, not stretched.
  const proceduralAssets=new Set(current.assets.filter(a=>
    a.rights.licenseName==='Dark Studio Procedural Audio').map(a=>a.id));
  const clips=current.clips.filter(c=>!narrationClips.has(c.id)&&
    !proceduralAssets.has(c.assetId)).map(c=>{
    const begin=remap(c.startFrame);
    return {...c,startFrame:begin,durationFrames:Math.max(1,Math.min(c.durationFrames,cursor-begin))};
  });
  for(let i=0;i<newSeg.length;i++){
    clips.push({id:newSeg[i].clipId,assetId:newAudio[i].asset.id,lane:'narration',
      startFrame:newStarts[i],durationFrames:newSeg[i].narrationFrames,
      trimStartFrames:0,volume:1,volumeKeyframes:[]});
  }
  for(const sound of newSounds){
    const segment=newSeg[sound.beatIndex],narrated=newAudio[sound.beatIndex];
    if(!segment||!narrated)continue;
    const segmentStart=newStarts[sound.beatIndex];
    const cue=sound.lane==='sfx'?
      matchSpokenWord(narrated.alignment?.words??[],sound.word??'',sound.occurrence??1):0;
    if(cue===null)continue;
    const relative=Math.max(0,cue+(sound.offsetFrames??0));
    if(relative>=segment.durationFrames)continue;
    const frames=Math.min(sound.frames,segment.durationFrames-relative);
    const volumeKeyframes:Project['clips'][number]['volumeKeyframes']=[];
    if(sound.lane==='music'&&frames>=12){
      const quiet=sound.volume*(sound.ducking??.28),last=frames-1;
      volumeKeyframes.push({frame:0,value:quiet,easing:'linear'});
      const spokenEnd=Math.min(last,segment.narrationFrames);
      if(spokenEnd>=1&&spokenEnd<last-3){
        volumeKeyframes.push({frame:spokenEnd,value:quiet,easing:'ease-out'});
        volumeKeyframes.push({frame:Math.min(last-1,spokenEnd+3),value:sound.volume,easing:'linear'});
      }
      volumeKeyframes.push({frame:last,value:0,easing:'linear'});
    }
    clips.push({id:id(),assetId:sound.asset.id,lane:sound.lane,
      startFrame:segmentStart+relative,durationFrames:frames,
      trimStartFrames:0,volume:sound.volume,volumeKeyframes});
  }
  const assets=current.assets.filter(a=>!narrationAssets.has(a.id)&&
    !proceduralAssets.has(a.id)).concat([...newAudio.map(a=>a.asset),...newSounds.map(s=>s.asset)]);
  return projectSchema.parse({...current,scenes,shots,captions,clips,assets,
    productionPlan:{...plan,source:newSource??plan.source,segments:newSeg}});
}
