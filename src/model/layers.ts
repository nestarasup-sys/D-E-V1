import {z} from 'zod';
import {matchSpokenWord} from './speech-alignment';

/**
 * Declarative 2D scene graph. No user JavaScript or arbitrary HTML is executed.
 * Coordinates use the fixed 1920x1080 project canvas; editor and MP4 share it.
 */
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const layerKinds=[
  'text','character','object','building','scene','chart','shape','connector','particles','image',
  'group','vector',
] as const;
export const layerBehaviors=[
  'none','float','pulse','walk','wave','point','nod','think','celebrate','orbit',
  'shake','parallax','draw','typewriter','count','grow','stagger','slide-in','bounce','word-reveal',
] as const;
export const layerEasing=z.enum(['linear','ease-in','ease-out','ease-in-out']);
const frame=z.object({
  frame:z.number().int().min(0),
  value:z.number().finite(),
  easing:layerEasing.default('ease-in-out'),
}).strict();
const curve=z.array(frame).max(40).default([]);
export const layerMotionSchema=z.object({
  x:curve,y:curve,scale:curve,rotation:curve,opacity:curve,
}).strict().default({x:[],y:[],scale:[],rotation:[],opacity:[]});
/** Safe visual styles: numeric ranges and hex colors, never executable CSS/HTML. */
export const layerEffectsSchema=z.object({
  blur:z.number().finite().min(0).max(40).default(0),
  radius:z.number().finite().min(0).max(300).default(0),
  shadowBlur:z.number().finite().min(0).max(80).default(0),
  shadowX:z.number().finite().min(-100).max(100).default(0),
  shadowY:z.number().finite().min(-100).max(100).default(0),
  shadowColor:color.default('#000000'),
  gradient:z.object({
    from:color,to:color,angle:z.number().finite().min(0).max(360).default(90),
  }).strict().optional(),
  mask:z.enum(['none','circle','ellipse']).default('none'),
}).strict().default({});
export type LayerEffects=z.infer<typeof layerEffectsSchema>;

/** Independently editable joints in degrees; evaluated per frame, no procedural JS from the director. */
export const rigPoseSchema=z.object({
  leftArm:z.number().finite().min(-150).max(150).default(0),
  rightArm:z.number().finite().min(-150).max(150).default(0),
  leftLeg:z.number().finite().min(-80).max(80).default(0),
  rightLeg:z.number().finite().min(-80).max(80).default(0),
  head:z.number().finite().min(-55).max(55).default(0),
  eyeX:z.number().finite().min(-15).max(15).default(0),
  eyeY:z.number().finite().min(-12).max(12).default(0),
  smile:z.number().finite().min(-1).max(1).default(0),
}).strict().default({});
export type RigPose=z.infer<typeof rigPoseSchema>;
export const rigKeySchema=z.object({
  frame:z.number().int().min(0),
  pose:rigPoseSchema,
  easing:layerEasing.default('ease-in-out'),
}).strict();
export const chartStageSchema=z.object({
  frame:z.number().int().min(0),
  values:z.array(z.number().finite().min(-1e9).max(1e9)).min(1).max(12),
  easing:layerEasing.default('ease-in-out'),
}).strict();
export const mediaFramingSchema=z.object({
  fit:z.enum(['cover','contain']).default('cover'),
  focusX:z.number().finite().min(0).max(100).default(50),
  focusY:z.number().finite().min(0).max(100).default(50),
  zoom:z.number().finite().min(1).max(4).default(1),
  trimStartFrames:z.number().int().min(0).max(54000).default(0),
}).strict().default({});
export const mediaPlanSchema=z.object({
  query:z.string().trim().min(1).max(180),
  intendedUse:z.string().trim().min(1).max(280),
  licenseNote:z.string().trim().min(1).max(300),
}).strict();
export const layerObjectSchema=z.object({
  id:z.string().uuid(),
  name:z.string().trim().min(1).max(90),
  kind:z.enum(layerKinds),
  parentId:z.string().uuid().optional(),
  chartType:z.enum(['bar','line','donut','ranking','area','waterfall','cashflow','counter']).default('bar'),
  chartStages:z.array(chartStageSchema).max(12).default([]),
  x:z.number().finite().min(-400).max(2400),
  y:z.number().finite().min(-400).max(1400),
  width:z.number().finite().min(8).max(2400),
  height:z.number().finite().min(8).max(1800),
  zIndex:z.number().int().min(-30).max(30).default(0),
  startFrame:z.number().int().min(0).default(0),
  durationFrames:z.number().int().min(1).max(18000),
  cueCaptionId:z.string().uuid().optional(),
  cueOffsetFrames:z.number().int().min(-1800).max(1800).default(0),
  cueWord:z.string().trim().min(1).max(80).optional(),
  cueOccurrence:z.number().int().min(1).max(20).default(1),
  color:color.default('#f0bb66'),
  secondaryColor:color.default('#15304a'),
  text:z.string().max(400).default(''),
  value:z.number().finite().min(-1000000000).max(1000000000).optional(),
  unit:z.string().max(24).default(''),
  labels:z.array(z.string().max(48)).max(12).default([]),
  values:z.array(z.number().finite().min(-1000000000).max(1000000000)).max(12).default([]),
  sourceEvidenceId:z.string().uuid().optional(),
  illustrative:z.boolean().default(true),
  objectType:z.enum(['home','key','car','phone','coin','wallet','contract','clock','bank',
    'cart','computer','truck','document','tree','heart','lightbulb','calendar',
    'magnifier','book','gear','factory','rocket','pin']).default('home'),
  characterType:z.enum(['worker','parent','child','banker','presenter','scientist',
    'builder','student','silhouette']).default('worker'),
  expression:z.enum(['neutral','happy','sad','curious','surprised','worried','thinking']).default('neutral'),
  rig:rigPoseSchema,
  rigKeys:z.array(rigKeySchema).max(40).default([]),
  sceneType:z.enum(['city','home','bank','office','supermarket','construction','street','studio']).default('city'),
  shapeType:z.enum(['rectangle','circle','triangle','line','ring','pill']).default('rectangle'),
  behavior:z.enum(layerBehaviors).default('none'),
  behaviorIntensity:z.number().finite().min(0).max(3).default(1),
  fontSize:z.number().int().min(12).max(260).default(70),
  fontFamily:z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N} ,_-]+$/u).default('Arial'),
  fontWeight:z.number().int().min(100).max(900).default(800),
  textAlign:z.enum(['left','center','right']).default('left'),
  letterSpacing:z.number().finite().min(-15).max(60).default(0),
  lineHeight:z.number().finite().min(.75).max(2.5).default(1.18),
  strokeColor:color.default('#000000'),
  strokeWidth:z.number().finite().min(0).max(12).default(0),
  vectorPath:z.string().max(2000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE .,\\+\\-]*$/).default(''),
  effects:layerEffectsSchema,
  motion:layerMotionSchema,
  assetId:z.string().uuid().optional(),
  framing:mediaFramingSchema,
  mediaPlan:mediaPlanSchema.optional(),
}).strict();
export const layerSchema=layerObjectSchema.superRefine((layer,ctx)=>{
  if(layer.kind==='vector'&&!layer.vectorPath.trim())
    ctx.addIssue({code:'custom',path:['vectorPath'],message:'Vetor precisa de um caminho SVG (d).'});
  if(layer.chartStages.some(stage=>stage.values.length!==layer.values.length))
    ctx.addIssue({code:'custom',path:['chartStages'],message:'Cada estágio deve ter a mesma quantidade de valores do gráfico.'});
  if(layer.kind!=='character'&&layer.rigKeys.length)
    ctx.addIssue({code:'custom',path:['rigKeys'],message:'Poses articuladas são exclusivas de personagens.'});
  if(layer.cueWord&&!layer.cueCaptionId)
    ctx.addIssue({code:'custom',path:['cueWord'],message:'Cue por palavra exige cueCaptionId válido.'});
  if(layer.parentId===layer.id)
    ctx.addIssue({code:'custom',path:['parentId'],message:'Uma camada não pode ser seu próprio grupo.'});
  if(layer.kind==='image'&&!layer.assetId)
    ctx.addIssue({code:'custom',path:['assetId'],message:'Camada de imagem exige mídia local importada.'});
  if((layer.values.length||layer.chartStages.length)&&layer.kind==='chart'&&!layer.sourceEvidenceId)
    ctx.addIssue({code:'custom',path:['sourceEvidenceId'],
      message:'Gráfico com números precisa de evidência vinculada. Para simulação use texto ilustrativo, não valores inventados.'});
});
export type SceneLayer=z.infer<typeof layerSchema>;
export type LayerMotion=z.infer<typeof layerMotionSchema>;
export type LayerKind=SceneLayer['kind'];
export type LayerBehavior=SceneLayer['behavior'];
export type LayerKeyframe=z.infer<typeof frame>;

const limits={x:[-1920,1920],y:[-1080,1080],scale:[0.1,5],rotation:[-360,360],opacity:[0,1]};
export function validateLayers(layers:SceneLayer[],durationFrames:number):string[]{
  const issues:string[]=[];
  if(new Set(layers.map(l=>l.id)).size!==layers.length)issues.push('IDs de elementos visuais duplicados.');
  const byId=new Map(layers.map(layer=>[layer.id,layer]));
  for(const layer of layers){
    if(layer.parentId){
      const parent=byId.get(layer.parentId);
      if(!parent||parent.kind!=='group')
        issues.push('Grupo pai de "'+layer.name+'" não existe ou não é do tipo group.');
      if(layer.cueCaptionId)issues.push('Camadas dentro de grupo usam tempo relativo, sem cueCaptionId.');
      if(parent&&layer.startFrame+layer.durationFrames>parent.durationFrames)
        issues.push('Camada "'+layer.name+'" ultrapassa o tempo do grupo.');
      const seen=new Set<string>([layer.id]);
      let node=parent;
      while(node){
        if(seen.has(node.id)){issues.push('Ciclo de grupos na camada "'+layer.name+'".');break;}
        seen.add(node.id);
        node=node.parentId?byId.get(node.parentId):undefined;
      }
    }
    for(const [key,items] of [['rigKeys',layer.rigKeys],['chartStages',layer.chartStages]] as const){
      let last=-1;
      for(const item of items){
        if(item.frame<=last||item.frame>=layer.durationFrames)
          issues.push(key+' fora de ordem ou duração em "'+layer.name+'".');
        last=item.frame;
      }
    }
    const start=layer.startFrame;
    if(!layer.parentId&&!layer.cueCaptionId && start+layer.durationFrames>durationFrames)
      issues.push('Elemento "'+layer.name+'" ultrapassa o final do plano.');
    for(const key of Object.keys(limits) as (keyof LayerMotion)[]){
      let last=-1;
      const [min,max]=limits[key];
      for(const kf of layer.motion[key]){
        if(kf.frame<=last||kf.frame>=layer.durationFrames)
          issues.push('Keyframe '+key+' inválido em "'+layer.name+'".');
        if(kf.value<min||kf.value>max)
          issues.push('Valor de animação '+key+' fora do intervalo em "'+layer.name+'".');
        last=kf.frame;
      }
    }
  }
  return issues;
}
export function emptyLayerMotion():LayerMotion {
  return {x:[],y:[],scale:[],rotation:[],opacity:[]};
}
export function retimeLayer(layer:SceneLayer,newDuration:number):SceneLayer{
  const out=structuredClone(layer);
  for(const key of Object.keys(out.motion) as (keyof LayerMotion)[]){
    const adjusted=new Map<number,LayerKeyframe>();
    for(const kf of layer.motion[key]){
      const frame=layer.durationFrames>1?
        Math.round(kf.frame*(newDuration-1)/(layer.durationFrames-1)):0;
      adjusted.set(frame,{...kf,frame});
    }
    out.motion[key]=[...adjusted.values()].sort((a,b)=>a.frame-b.frame);
  }
  const scaleFrame=(frame:number)=>layer.durationFrames>1?
    Math.round(frame*(newDuration-1)/(layer.durationFrames-1)):0;
  out.rigKeys=[...new Map(layer.rigKeys.map(key=>[scaleFrame(key.frame),
    {...key,frame:scaleFrame(key.frame)}])).values()].sort((a,b)=>a.frame-b.frame);
  out.chartStages=[...new Map(layer.chartStages.map(key=>[scaleFrame(key.frame),
    {...key,frame:scaleFrame(key.frame)}])).values()].sort((a,b)=>a.frame-b.frame);
  return {...out,durationFrames:newDuration};
}
export function layerAtCaption(layer:SceneLayer,shotStart:number,captions:readonly {
  id:string,startFrame:number,endFrame:number;
  words?:readonly {text:string;startFrame:number;endFrame:number}[];
}[]):number {
  if(!layer.cueCaptionId)return layer.startFrame;
  const caption=captions.find(c=>c.id===layer.cueCaptionId);
  if(!caption)return Number.POSITIVE_INFINITY;
  if(layer.cueWord){
    const frame=matchSpokenWord(caption.words??[],layer.cueWord,layer.cueOccurrence);
    // Never fabricate the acoustic cue; hide it if this word was not aligned.
    return frame===null?Number.POSITIVE_INFINITY:
      Math.max(0,frame-shotStart+layer.cueOffsetFrames);
  }
  return Math.max(0,caption.startFrame-shotStart+layer.cueOffsetFrames);
}
