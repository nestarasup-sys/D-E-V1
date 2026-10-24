import {z} from 'zod';

/**
 * Declarative 2D scene graph. No user JavaScript or arbitrary HTML is executed.
 * Coordinates use the fixed 1920x1080 project canvas; editor and MP4 share it.
 */
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const layerKinds=[
  'text','character','object','building','scene','chart','shape','connector','particles','image',
] as const;
export const layerBehaviors=[
  'none','float','pulse','walk','wave','point','nod','think','celebrate','orbit',
  'shake','parallax','draw','typewriter','count','grow','stagger','slide-in','bounce',
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
export const layerObjectSchema=z.object({
  id:z.string().uuid(),
  name:z.string().trim().min(1).max(90),
  kind:z.enum(layerKinds),
  chartType:z.enum(['bar','line','donut','ranking','area']).default('bar'),
  x:z.number().finite().min(-400).max(2400),
  y:z.number().finite().min(-400).max(1400),
  width:z.number().finite().min(8).max(2400),
  height:z.number().finite().min(8).max(1800),
  zIndex:z.number().int().min(-30).max(30).default(0),
  startFrame:z.number().int().min(0).default(0),
  durationFrames:z.number().int().min(1).max(18000),
  cueCaptionId:z.string().uuid().optional(),
  cueOffsetFrames:z.number().int().min(-1800).max(1800).default(0),
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
  sceneType:z.enum(['city','home','bank','office','supermarket','construction','street','studio']).default('city'),
  shapeType:z.enum(['rectangle','circle','triangle','line','ring','pill']).default('rectangle'),
  behavior:z.enum(layerBehaviors).default('none'),
  behaviorIntensity:z.number().finite().min(0).max(3).default(1),
  fontSize:z.number().int().min(12).max(260).default(70),
  motion:layerMotionSchema,
  assetId:z.string().uuid().optional(),
}).strict();
export const layerSchema=layerObjectSchema.superRefine((layer,ctx)=>{
  if(layer.kind==='image'&&!layer.assetId)
    ctx.addIssue({code:'custom',path:['assetId'],message:'Camada de imagem exige mídia local importada.'});
  if(layer.values.length&&layer.kind==='chart'&&!layer.sourceEvidenceId)
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
  for(const layer of layers){
    const start=layer.startFrame;
    if(!layer.cueCaptionId && start+layer.durationFrames>durationFrames)
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
  return {...out,durationFrames:newDuration};
}
export function layerAtCaption(layer:SceneLayer,shotStart:number,captions:readonly {
  id:string,startFrame:number,endFrame:number
}[]):number {
  if(!layer.cueCaptionId)return layer.startFrame;
  const caption=captions.find(c=>c.id===layer.cueCaptionId);
  if(!caption)return layer.startFrame;
  return Math.max(0,caption.startFrame-shotStart+layer.cueOffsetFrames);
}
