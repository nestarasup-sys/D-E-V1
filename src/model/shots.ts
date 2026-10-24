import {z} from 'zod';

const hex=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const easingSchema=z.enum(['linear','ease-in','ease-out','ease-in-out']);
export const motionPropertySchema=z.enum(['x','y','scale','rotation','opacity']);
export type MotionProperty=z.infer<typeof motionPropertySchema>;
export const motionBounds:Record<MotionProperty,[number,number]>={
  x:[-100,100],y:[-100,100],scale:[0.4,3],rotation:[-90,90],opacity:[0,1],
};
export const keyframeSchema=z.object({
  frame:z.number().int().min(0),
  value:z.number().finite(),
  easing:easingSchema.default('ease-in-out'),
}).strict();
const keyframes=z.array(keyframeSchema).max(40).default([]);
export const motionSchema=z.object({
  x:keyframes,y:keyframes,scale:keyframes,rotation:keyframes,opacity:keyframes,
}).strict().default({x:[],y:[],scale:[],rotation:[],opacity:[]});
/** Especificação visual não destrutiva: o texto é editável e não finge ser prova fotográfica. */
export const investigationSchema=z.object({
  representation:z.enum(['illustration','reconstruction','source-excerpt']).default('illustration'),
  sourceEvidenceId:z.string().uuid().optional(),
  excerpt:z.string().max(600).default(''),
  highlight:z.string().max(140).default(''),
  locationLabels:z.array(z.string().trim().min(1).max(60)).max(4).default([]),
  unit:z.string().max(24).default(''),
  points:z.array(z.object({
    label:z.string().trim().min(1).max(45),
    value:z.number().finite().min(-1000000000).max(1000000000),
  }).strict()).max(8).default([]),
  leftLabel:z.string().max(80).default(''),
  leftValue:z.string().max(80).default(''),
  rightLabel:z.string().max(80).default(''),
  rightValue:z.string().max(80).default(''),
}).strict().default({});
export type InvestigationData=z.infer<typeof investigationSchema>;
export const investigativeStyles=['dossier','document','evidence','chart','map','comparison','lower-third'] as const;
export const investigationPurposes=['hook','context','proof','data','contrast','location','transition','conclusion'] as const;

export const shotSchema=z.object({
  id:z.string().uuid(),
  kind:z.enum(['graphic','image','video']),
  style:z.enum(['headline','split','number','quote','chapter','timeline',...investigativeStyles]).default('headline'),
  purpose:z.enum(investigationPurposes).optional(),
  investigation:investigationSchema,
  title:z.string().max(180).default(''),
  subtitle:z.string().max(400).default(''),
  kicker:z.string().max(100).default(''),
  assetId:z.string().uuid().optional(),
  startFrame:z.number().int().min(0),
  durationFrames:z.number().int().min(1).max(18000),
  trimStartFrames:z.number().int().min(0).default(0),
  zIndex:z.number().int().min(-20).max(20).default(0),
  accentColor:hex.default('#e2ad56'),
  backgroundColor:hex.default('#101827'),
  motion:motionSchema,
}).strict();
export type Shot=z.infer<typeof shotSchema>;
export type Keyframe=z.infer<typeof keyframeSchema>;
export type Motion=z.infer<typeof motionSchema>;
export const chapterSchema=z.object({
  id:z.string().uuid(),
  title:z.string().trim().min(1).max(120),
  firstSceneId:z.string().min(1).max(80),
}).strict();
export type Chapter=z.infer<typeof chapterSchema>;
export const channelKitObjectSchema=z.object({
  brandName:z.string().max(90).default('DARK STUDIO'),
  font:z.enum(['sans','serif','mono']).default('sans'),
  accentColor:hex.default('#e2ad56'),
  captionStyle:z.enum(['boxed','minimal']).default('boxed'),
}).strict();
export const channelKitSchema=channelKitObjectSchema.default({brandName:'DARK STUDIO',font:'sans',accentColor:'#e2ad56',captionStyle:'boxed'});
export type ChannelKit=z.infer<typeof channelKitSchema>;

export function validateMotion(motion:Motion,durationFrames:number,ctx:z.RefinementCtx,path:(string|number)[]){
  for(const property of motionPropertySchema.options){
    const frames=motion[property];
    const [min,max]=motionBounds[property];
    let previous=-1;
    frames.forEach((key,i)=>{
      if(key.frame<=previous||key.frame>=durationFrames)ctx.addIssue({
        code:'custom',path:[...path,property,i,'frame'],message:'Quadros-chave devem estar em ordem estrita e dentro do plano',
      });
      if(key.value<min||key.value>max)ctx.addIssue({
        code:'custom',path:[...path,property,i,'value'],message:'Valor de '+property+' fora do intervalo '+min+' a '+max,
      });
      previous=key.frame;
    });
  }
}

export function ease(t:number,kind:z.infer<typeof easingSchema>):number {
  const k=Math.min(1,Math.max(0,t));
  if(kind==='ease-in')return k*k*k;
  if(kind==='ease-out')return 1-Math.pow(1-k,3);
  if(kind==='ease-in-out')return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
  return k;
}
export function evaluateKeyframes(frames:readonly Keyframe[],frame:number,defaultValue:number):number {
  if(!frames.length)return defaultValue;
  if(frame<=frames[0].frame)return frames[0].value;
  const last=frames[frames.length-1];
  if(frame>=last.frame)return last.value;
  for(let i=0;i<frames.length-1;i++){
    const a=frames[i],b=frames[i+1];
    if(frame<=b.frame){
      const progress=ease((frame-a.frame)/(b.frame-a.frame),a.easing);
      return a.value+(b.value-a.value)*progress;
    }
  }
  return last.value;
}
export function evaluateMotion(shot:Shot,frame:number){
  return {
    x:evaluateKeyframes(shot.motion.x,frame,0),
    y:evaluateKeyframes(shot.motion.y,frame,0),
    scale:evaluateKeyframes(shot.motion.scale,frame,1),
    rotation:evaluateKeyframes(shot.motion.rotation,frame,0),
    opacity:evaluateKeyframes(shot.motion.opacity,frame,1),
  };
}
export function frameAt(seconds:number,fps=30){return Math.round(seconds*fps);}

/** Preserva os quadros-chave quando um plano é redimensionado na timeline. */
export function retimeMotion(motion:Motion,oldDuration:number,newDuration:number):Motion {
  const result=structuredClone(motion);
  for(const property of motionPropertySchema.options){
    const byFrame=new Map<number,Keyframe>();
    for(const key of motion[property]){
      const next=oldDuration>1?
        Math.min(newDuration-1,Math.round(key.frame*(newDuration-1)/(oldDuration-1))):0;
      byFrame.set(next,{...key,frame:next});
    }
    result[property]=[...byFrame.values()].sort((a,b)=>a.frame-b.frame);
  }
  return result;
}
