import {z} from 'zod';
import {type Project,projectDuration} from './project';
import {type Operation,applyOperations} from './operations';
import {type Shot,shotSchema,channelKitObjectSchema,type Motion,investigationSchema} from './shots';

const duration=z.number().int().min(1).max(18000);
const purpose=z.enum(['hook','context','proof','data','contrast','location','transition','conclusion']);
const preset=z.enum(['subtle-zoom','pan-left','pan-right','emphasis','still']);
const beatSchema=z.object({
  startFrame:z.number().int().min(0),
  durationFrames:duration,
  purpose,
  style:shotSchema.shape.style.optional(),
  title:z.string().max(180),
  subtitle:z.string().max(400).default(''),
  kicker:z.string().max(100).default(''),
  assetId:z.string().uuid().optional(),
  zIndex:z.number().int().min(-20).max(20).default(0),
  accentColor:shotSchema.shape.accentColor.optional(),
  backgroundColor:shotSchema.shape.backgroundColor.optional(),
  investigation:investigationSchema.optional(),
  motionPreset:preset.default('subtle-zoom'),
}).strict();
export const directionSchema=z.object({
  version:z.literal(1),
  title:z.string().min(1).max(120),
  brand:channelKitObjectSchema.partial().strict().optional(),
  beats:z.array(beatSchema).min(1).max(1500),
}).strict();
export type Direction=z.infer<typeof directionSchema>;
export type DirectionBeat=z.infer<typeof beatSchema>;
export type DirectionPurpose=DirectionBeat['purpose'];
export interface DirectionIssue {severity:'error'|'warning'|'info';code:string;message:string;shotId?:string}
export interface DirectionReport{
  durationFrames:number;shots:number;coveredFrames:number;coveragePercent:number;
  longShots:number;shortShots:number;unverifiedVisuals:number;
  readyForEditorialReview:boolean;issues:DirectionIssue[];
}
const styles:Record<DirectionPurpose,Shot['style']>={
  hook:'dossier',context:'headline',proof:'document',data:'chart',contrast:'comparison',
  location:'map',transition:'lower-third',conclusion:'evidence',
};
const palette=['#0b1724','#132331','#182233','#141d2d','#172b33'];
function motionFor(preset:DirectionBeat['motionPreset'],length:number):Motion {
  const base:Motion={x:[],y:[],scale:[],rotation:[],opacity:[]};
  if(preset==='still')return base;
  const end=length-1;
  if(!end)return base;
  if(preset==='subtle-zoom')base.scale=[
    {frame:0,value:1,easing:'ease-in-out'},
    {frame:end,value:1.07,easing:'linear'},
  ];
  if(preset==='pan-left'||preset==='pan-right'){
    const side=preset==='pan-left'?1:-1;
    base.x=[
      {frame:0,value:-side*2,easing:'ease-in-out'},
      {frame:end,value:side*2,easing:'linear'},
    ];
  }
  if(preset==='emphasis')base.scale=[
    {frame:0,value:1.045,easing:'ease-out'},
    {frame:end,value:1,easing:'linear'},
  ];
  if(length>13)base.opacity=[
    {frame:0,value:0,easing:'ease-out'},
    {frame:12,value:1,easing:'linear'},
  ];
  return base;
}

/** Compila roteiro de direção em edições nativas. Não toca em narração, legendas nem fontes. */
export function compileDirection(project:Project,raw:unknown,newId:()=>string):{
  direction:Direction;operations:Operation[];preview:Project;report:DirectionReport;
}{
  const direction=directionSchema.parse(raw);
  const total=projectDuration(project);
  let cursor=0;
  const shots:Shot[]=direction.beats.map((beat,i)=>{
    if(beat.startFrame!==cursor)throw new Error(
      'Intervalos visuais devem ser contínuos. Esperado frame '+cursor+', recebido '+beat.startFrame+' (plano '+(i+1)+').');
    cursor+=beat.durationFrames;
    const asset=beat.assetId?project.assets.find(a=>a.id===beat.assetId):undefined;
    if(beat.assetId&&(!asset||asset.kind==='audio'))throw new Error('O plano '+(i+1)+' cita mídia visual não importada.');
    const investigation=beat.investigation??investigationSchema.parse({});
    if(investigation.representation==='source-excerpt'&&!investigation.sourceEvidenceId)
      throw new Error('Trecho apresentado como fonte exige evidenceId cadastrado.');
    if(investigation.points.length&&!investigation.sourceEvidenceId)
      throw new Error('Gráfico com valores reais exige sourceEvidenceId de uma evidência cadastrada.');
    if(investigation.sourceEvidenceId&&!project.evidence.some(e=>e.id===investigation.sourceEvidenceId))
      throw new Error('Plano '+(i+1)+' cita uma fonte não cadastrada no projeto.');
    return shotSchema.parse({
      id:newId(),kind:asset?asset.kind:'graphic',
      style:beat.style??styles[beat.purpose],
      purpose:beat.purpose,
      title:beat.title,subtitle:beat.subtitle,
      kicker:beat.kicker||'ARQUIVO / '+String(i+1).padStart(2,'0'),
      startFrame:beat.startFrame,durationFrames:beat.durationFrames,
      trimStartFrames:0,zIndex:beat.zIndex,
      accentColor:beat.accentColor??project.channelKit.accentColor,
      backgroundColor:beat.backgroundColor??palette[i%palette.length],
      investigation,
      motion:motionFor(beat.motionPreset,beat.durationFrames),
      ...(asset?{assetId:asset.id}:{}),
    });
  });
  if(cursor!==total)throw new Error('Montagem cobre '+cursor+' quadros, mas o projeto tem '+total+
    '. Ajuste a duração da narração/cenas primeiro; o diretor nunca desloca áudio silenciosamente.');
  const operations:Operation[]=[
    {type:'replaceShots',shots},
    {type:'setVisualMode',visualMode:'shots'},
  ];
  if(direction.brand)operations.push({type:'updateChannelKit',changes:direction.brand});
  const preview=applyOperations(project,operations);
  return {direction,operations,preview,report:reviewVisualDirection(preview)};
}

/** Fallback totalmente local e determinístico, baseado no texto que já está no projeto. */
function readableTitle(text:string):string {
  const cleaned=text.replace(/\s+/g,' ').trim();
  if(cleaned.length<=60)return cleaned;
  const fragment=cleaned.slice(0,57);
  const cut=fragment.lastIndexOf(' ');
  return fragment.slice(0,cut>26?cut:57).trim()+'…';
}
export function makeAutomaticDirection(project:Project):Direction{
  const beats:DirectionBeat[]=[];
  let frame=0,shotNumber=0;
  const rotation:DirectionPurpose[]=['hook','context','contrast','proof','transition','conclusion'];
  const basicStyle:Shot['style'][]=['dossier','headline','comparison','document','split','lower-third','evidence'];
  for(const scene of project.scenes){
    const pieces=Math.max(1,Math.ceil(scene.durationFrames/120));
    const base=Math.floor(scene.durationFrames/pieces),extra=scene.durationFrames%pieces;
    for(let i=0;i<pieces;i++){
      const length=base+(i<extra?1:0);
      const overlapping=project.captions.find(c=>c.startFrame<frame+length&&c.endFrame>frame);
      const text=overlapping?.text.trim()||scene.title;
      const title=readableTitle(text)||'INVESTIGAÇÃO';
      const style=basicStyle[shotNumber%basicStyle.length];
      beats.push({
        startFrame:frame,durationFrames:length,
        purpose:rotation[shotNumber%rotation.length],style,
        title,subtitle:overlapping?readableTitle(scene.title):'Visual editorial ilustrativo — confira fontes.',
        kicker:scene.kicker,
        motionPreset:shotNumber%4===0?'subtle-zoom':shotNumber%4===1?'pan-left':shotNumber%4===2?'pan-right':'still',
        zIndex:0,
        investigation:investigationSchema.parse({
          representation:'illustration',excerpt:text.slice(0,500),highlight:'',
        }),
      });
      frame+=length;shotNumber++;
    }
  }
  if(beats.length>1500)throw new Error('Episódio muito longo para direção automática única; divida em capítulos.');
  return directionSchema.parse({version:1,title:project.name,beats});
}
export function reviewVisualDirection(project:Project):DirectionReport{
  const total=projectDuration(project),issues:DirectionIssue[]=[];
  if(project.visualMode!=='shots'){
    return {durationFrames:total,shots:0,coveredFrames:0,coveragePercent:0,
      longShots:0,shortShots:0,unverifiedVisuals:0,readyForEditorialReview:true,issues:[]};
  }
  const shots=[...project.shots].sort((a,b)=>a.startFrame-b.startFrame);
  let covered=0,previousEnd=0,shortShots=0,longShots=0,unverified=0;
  for(let i=0;i<shots.length;i++){
    const shot=shots[i];
    if(shot.startFrame>previousEnd){
      issues.push({severity:'error',code:'visual-gap',message:'Buraco visual de '+(shot.startFrame-previousEnd)+' frames no frame '+previousEnd+'.'});
    }
    covered+=Math.max(0,shot.startFrame+shot.durationFrames-Math.max(previousEnd,shot.startFrame));
    previousEnd=Math.max(previousEnd,shot.startFrame+shot.durationFrames);
    if(shot.durationFrames>240){
      longShots++;issues.push({severity:'warning',code:'long-shot',shotId:shot.id,
        message:'Plano com '+(shot.durationFrames/30).toFixed(1)+' s. Avalie se a pausa longa é intencional.'});
    }
    if(shot.durationFrames<45){
      shortShots++;issues.push({severity:'info',code:'fast-shot',shotId:shot.id,
        message:'Plano muito rápido ('+(shot.durationFrames/30).toFixed(1)+' s). Confira a legibilidade.'});
    }
    const reference=shot.investigation.sourceEvidenceId?
      project.evidence.find(e=>e.id===shot.investigation.sourceEvidenceId):undefined;
    const data=shot.investigation.points.length>0;
    const factual=['document','chart','map','evidence'].includes(shot.style);
    if((data||shot.investigation.representation==='source-excerpt'||(factual&&shot.investigation.sourceEvidenceId))&&reference?.reviewStatus!=='verified'){
      unverified++;issues.push({severity:'warning',code:'source-unverified',shotId:shot.id,
        message:'Plano factual não tem fonte confirmada por você: '+shot.title.slice(0,90)});
    }
    if(shot.style==='chart'&&!data){
      issues.push({severity:'info',code:'chart-placeholder',shotId:shot.id,
        message:'Gráfico sem valores registrados; aparece como ilustração, não como dado real.'});
    }
    if(shot.style==='map')issues.push({severity:'info',code:'schematic-map',shotId:shot.id,
      message:'Mapa é um esquema ilustrativo. Para mapa geográfico real, importe arte com fonte verificável.'});
    if(i>=3&&shots.slice(i-3,i).every(s=>s.style===shot.style))
      issues.push({severity:'warning',code:'repetitive-style',shotId:shot.id,
        message:'Quatro planos consecutivos com a mesma composição visual.'});
  }
  if(previousEnd<total)issues.push({severity:'error',code:'visual-end-gap',
    message:'Sem plano visual nos últimos '+(total-previousEnd)+' frames do episódio.'});
  if(shots.length===0)issues.push({severity:'error',code:'no-shots',
    message:'Modo por planos ativado sem montagem visual.'});
  if(project.clips.filter(c=>c.lane==='narration').length===0)issues.push({
    severity:'warning',code:'voice-unassigned',message:'Nenhuma narração vinculada; direção visual não gera voz por conta própria.'});
  if(project.captions.length===0)issues.push({
    severity:'warning',code:'captions-unassigned',message:'Não há legendas com timestamps para revisão.'});
  return {durationFrames:total,shots:shots.length,coveredFrames:Math.min(total,covered),
    coveragePercent:total?Math.round(Math.min(total,covered)/total*100):0,
    shortShots,longShots,unverifiedVisuals:unverified,
    readyForEditorialReview:!issues.some(issue=>issue.severity==='error'),issues};
}
