import { z } from 'zod';
import {shotSchema,chapterSchema,channelKitSchema,keyframeSchema,validateMotion,validateCamera} from './shots';
import {validateLayers} from './layers';

export const FPS = 30;
export const sceneKindSchema = z.enum(['title', 'stat', 'quote']);
export const sceneSchema = z.object({
  id: z.string().min(1).max(80),
  kind: sceneKindSchema,
  title: z.string().max(180),
  subtitle: z.string().max(400),
  kicker: z.string().max(100),
  durationFrames: z.number().int().min(15).max(1800),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  imageUrl: z.string().url().max(2048).optional().or(z.literal('')),
  productionNotes: z.string().max(500).optional(),
}).strict();

export const assetKindSchema = z.enum(['image', 'video', 'audio']);
export const assetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(240),
  kind: assetKindSchema,
  mime: z.string().min(3).max(100),
  url: z.string().max(512).url(),
  durationFrames: z.number().int().positive().max(30 * 60 * 60).optional(),
}).strict().refine(a => a.url === `http://127.0.0.1:4317/media/${a.id}`, 'URL de mídia inválida');
export const laneSchema = z.enum(['visual', 'narration', 'music', 'sfx']);
export const clipSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  lane: laneSchema,
  startFrame: z.number().int().min(0),
  durationFrames: z.number().int().positive(),
  trimStartFrames: z.number().int().min(0).default(0),
  volume: z.number().min(0).max(1).default(1),
  volumeKeyframes:z.array(keyframeSchema).max(40).default([]),
}).strict();

export const legacyProjectSchema = z.object({
  version: z.literal(1), id: z.string().min(1), name: z.string().min(1).max(120),
  fps: z.literal(30), width: z.literal(1920), height: z.literal(1080),
  scenes: z.array(sceneSchema).min(1).max(200),
}).strict();

/** Word timings are absolute project frames; never inferred from text alone. */
export const captionWordSchema=z.object({
  text:z.string().trim().min(1).max(80),
  startFrame:z.number().int().min(0),
  endFrame:z.number().int().positive(),
}).strict();
/** Legendas cronometradas (importadas de SRT ou geradas por ferramenta local). */
export const captionSchema=z.object({
  id:z.string().uuid(),
  startFrame:z.number().int().min(0),
  endFrame:z.number().int().positive(),
  text:z.string().trim().min(1).max(600),
  words:z.array(captionWordSchema).max(120).default([]),
}).strict();
export const evidenceSchema=z.object({
  id:z.string().uuid(),
  sceneId:z.string().min(1).max(80).optional(),
  claim:z.string().trim().min(1).max(500),
  sourceTitle:z.string().trim().min(1).max(200),
  sourceUrl:z.union([z.literal(''),z.string().url().max(2000).refine(s=>s.startsWith('https://'),'Fonte online precisa usar HTTPS')]).default(''),
  notes:z.string().max(600).default(''),
  sourceExcerpt:z.string().max(1000).optional(),
  publicationDate:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  accessedAt:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  region:z.string().max(120).optional(),
  unit:z.string().max(60).optional(),
  rights:z.string().max(160).optional(),
  reviewStatus:z.enum(['pending','verified','rejected']).default('pending'),
}).strict();

export const projectSchema = z.object({
  version: z.literal(2),
  id: z.string().min(1), name: z.string().min(1).max(120),
  fps: z.literal(30), width: z.literal(1920), height: z.literal(1080),
  scenes: z.array(sceneSchema).min(1).max(200),
  assets: z.array(assetSchema).max(2000),
  clips: z.array(clipSchema).max(4000),
  captions:z.array(captionSchema).max(3000).default([]),
  evidence:z.array(evidenceSchema).max(2000).default([]),
  visualMode:z.enum(['legacy','shots']).default('legacy'),
  chapters:z.array(chapterSchema).max(100).default([]),
  shots:z.array(shotSchema).max(4000).default([]),
  channelKit:channelKitSchema,
}).strict().superRefine((p, ctx) => {
  if (new Set(p.scenes.map(s => s.id)).size !== p.scenes.length) ctx.addIssue({code:'custom', message:'IDs de cenas duplicados'});
  if(new Set(p.shots.map(s=>s.id)).size!==p.shots.length)ctx.addIssue({code:'custom',message:'IDs de planos duplicados'});
  if (new Set(p.assets.map(a => a.id)).size !== p.assets.length) ctx.addIssue({code:'custom', message:'IDs de assets duplicados'});
  if (new Set(p.clips.map(c => c.id)).size !== p.clips.length) ctx.addIssue({code:'custom', message:'IDs de clipes duplicados'});
  if(new Set(p.captions.map(c=>c.id)).size!==p.captions.length)ctx.addIssue({code:'custom',message:'IDs de legendas duplicados'});
  if(new Set(p.evidence.map(e=>e.id)).size!==p.evidence.length)ctx.addIssue({code:'custom',message:'IDs de evidências duplicados'});
  const knownScenes=new Set(p.scenes.map(s=>s.id));
  p.evidence.forEach((e,i)=>{
    if(e.sceneId&&!knownScenes.has(e.sceneId))ctx.addIssue({code:'custom',path:['evidence',i,'sceneId'],message:'Evidência ligada a cena inexistente'});
  });
  const assetById = new Map(p.assets.map(a => [a.id, a]));
  if(new Set(p.chapters.map(c=>c.id)).size!==p.chapters.length)ctx.addIssue({code:'custom',message:'Capítulos duplicados'});
  let previousChapter=-1;
  p.chapters.forEach((chapter,i)=>{
    const sceneIdx=p.scenes.findIndex(s=>s.id===chapter.firstSceneId);
    if(sceneIdx<=previousChapter)ctx.addIssue({code:'custom',path:['chapters',i],message:'Capítulos precisam começar em cenas distintas e em ordem'});
    previousChapter=sceneIdx;
  });
  const total = p.scenes.reduce((n, s) => n + s.durationFrames, 0);
  p.shots.forEach((shot,i)=>{
    if(shot.startFrame+shot.durationFrames>total)ctx.addIssue({code:'custom',path:['shots',i],message:'Plano ultrapassa a duração do episódio'});
    validateMotion(shot.motion,shot.durationFrames,ctx,['shots',i,'motion']);
    validateCamera(shot.cameraPath,shot.durationFrames,ctx,['shots',i,'cameraPath']);
    if(shot.transitionIn.type!=='cut'&&shot.transitionIn.durationFrames>shot.durationFrames)
      ctx.addIssue({code:'custom',path:['shots',i,'transitionIn'],
        message:'Transição de entrada maior que a duração do plano'});
    for(const message of validateLayers(shot.layers,shot.durationFrames)){
      ctx.addIssue({code:'custom',path:['shots',i,'layers'],message});
    }
    shot.layers.forEach((layer,j)=>{
      const linked=layer.sourceEvidenceId?
        p.evidence.find(e=>e.id===layer.sourceEvidenceId):undefined;
      if(layer.sourceEvidenceId&&!linked)ctx.addIssue({code:'custom',
        path:['shots',i,'layers',j,'sourceEvidenceId'],message:'Elemento cita fonte não cadastrada'});
      if(layer.kind==='chart'&&layer.values.length&&!layer.sourceEvidenceId)
        ctx.addIssue({code:'custom',path:['shots',i,'layers',j],message:'Gráfico factual sem evidência'});
      if(layer.kind==='image'){
        const asset=layer.assetId?assetById.get(layer.assetId):undefined;
        if(asset?.kind!=='image')ctx.addIssue({code:'custom',path:['shots',i,'layers',j,'assetId'],
          message:'Imagem da camada precisa ser mídia local cadastrada'});
      }
      if(layer.cueCaptionId){
        const caption=p.captions.find(c=>c.id===layer.cueCaptionId);
        if(!caption)ctx.addIssue({code:'custom',path:['shots',i,'layers',j,'cueCaptionId'],message:'Legenda de sincronismo não existe'});
        else if(caption.startFrame>=shot.startFrame+shot.durationFrames||caption.endFrame<=shot.startFrame)
          ctx.addIssue({code:'custom',path:['shots',i,'layers',j,'cueCaptionId'],message:'Legenda fora do intervalo deste plano'});
      }
    });
    const evidenceId=shot.investigation.sourceEvidenceId;
    if(evidenceId&&!p.evidence.some(e=>e.id===evidenceId))
      ctx.addIssue({code:'custom',path:['shots',i,'investigation','sourceEvidenceId'],message:'Plano cita evidência inexistente'});
    if(shot.investigation.representation==='source-excerpt'&&!evidenceId)
      ctx.addIssue({code:'custom',path:['shots',i,'investigation'],message:'Trecho apresentado como fonte precisa do ID da evidência'});
    if(shot.style==='chart'&&shot.investigation.points.length&&!evidenceId)
      ctx.addIssue({code:'custom',path:['shots',i,'investigation','points'],
        message:'Gráfico com valores precisa de origem cadastrada; não invente estatísticas'});

    if(shot.kind!=='graphic'){
      const asset=shot.assetId?assetById.get(shot.assetId):undefined;
      if(!asset||asset.kind!==shot.kind)ctx.addIssue({code:'custom',path:['shots',i,'assetId'],message:'Plano exige imagem ou vídeo importado no computador'});
      if(asset?.durationFrames&&shot.kind==='video'&&shot.trimStartFrames+shot.durationFrames>asset.durationFrames)
        ctx.addIssue({code:'custom',path:['shots',i],message:'Plano ultrapassa a duração do arquivo de vídeo'});
    }
  });
  const ordered=[...p.captions].sort((a,b)=>a.startFrame-b.startFrame);
  ordered.forEach((c,i)=>{
    let last=c.startFrame-1;
    for(const word of c.words){
      if(word.startFrame< c.startFrame||word.startFrame<=last||
         word.endFrame<=word.startFrame||word.endFrame>c.endFrame){
        ctx.addIssue({code:'custom',path:['captions',i,'words'],
          message:'Palavra fora da legenda ou com tempos sobrepostos'});
      }
      last=word.endFrame-1;
    }
    if(c.endFrame<=c.startFrame || c.endFrame>total)ctx.addIssue({code:'custom',message:'Legenda fora do tempo do projeto'});
    if(i && c.startFrame<ordered[i-1].endFrame)ctx.addIssue({code:'custom',message:'Legendas não podem se sobrepor'});
  });
  p.clips.forEach((c, i) => {
    let previous=-1;
    c.volumeKeyframes.forEach((kf,k)=>{
      if(kf.frame<=previous||kf.frame>=c.durationFrames||kf.value<0||kf.value>1)ctx.addIssue({
        code:'custom',path:['clips',i,'volumeKeyframes',k],message:'Keyframe de volume fora da duração ou intervalo 0–1',
      });
      previous=kf.frame;
    });
    const a = assetById.get(c.assetId);
    if (!a) ctx.addIssue({code:'custom', path:['clips',i,'assetId'], message:'Arquivo de mídia não cadastrado'});
    else if ((c.lane === 'visual') !== (a.kind !== 'audio')) ctx.addIssue({code:'custom', path:['clips',i,'lane'], message:'Tipo de mídia incompatível com trilha'});
    if (c.startFrame + c.durationFrames > total) ctx.addIssue({code:'custom', path:['clips',i], message:'Clipe ultrapassa a duração do projeto'});
    if (a?.durationFrames && c.trimStartFrames + c.durationFrames > a.durationFrames && a.kind !== 'image') ctx.addIssue({code:'custom', path:['clips',i], message:'Clipe ultrapassa a duração do arquivo'});
  });
});

export type Caption=z.infer<typeof captionSchema>;
export type Evidence=z.infer<typeof evidenceSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type SceneKind = Scene['kind'];
export type Asset = z.infer<typeof assetSchema>;
export type MediaClip = z.infer<typeof clipSchema>;
export type Lane = MediaClip['lane'];
export type Project = z.infer<typeof projectSchema>;

export function parseProject(input: unknown): Project {
  const legacy = legacyProjectSchema.safeParse(input);
  if (legacy.success) return projectSchema.parse({...legacy.data, version:2, assets:[], clips:[]});
  return projectSchema.parse(input);
}

export const starterProject: Project = {
  version: 2, id: 'dark-studio-demo', name: 'Investigação sem rosto', fps: 30, width: 1920, height: 1080,
  assets: [], clips: [], captions: [], evidence: [], visualMode:'legacy',chapters:[],shots:[],
  channelKit:{brandName:'DARK STUDIO',font:'sans',accentColor:'#e2ad56',captionStyle:'boxed'},
  scenes: [
    {id:'scene-1',kind:'title',title:'QUEM CONTROLA A INFORMAÇÃO?',subtitle:'Uma investigação sobre dados, poder e influência',kicker:'CAPÍTULO 01',durationFrames:180,accentColor:'#f1bd67',backgroundColor:'#0a111e',imageUrl:''},
    {id:'scene-2',kind:'stat',title:'247%',subtitle:'Exemplo de estatística visual — substitua por dados verificados',kicker:'DADOS & CONTEXTO',durationFrames:150,accentColor:'#f1bd67',backgroundColor:'#141e30',imageUrl:''},
    {id:'scene-3',kind:'quote',title:'OS FATOS IMPORTAM.',subtitle:'Associe cada afirmação às evidências antes de publicar.',kicker:'DOCUMENTOS • EVIDÊNCIAS',durationFrames:165,accentColor:'#89b7d9',backgroundColor:'#11151e',imageUrl:''},
  ],
};
export const projectDuration = (p: Pick<Project,'scenes'>) => p.scenes.reduce((n,s) => n+s.durationFrames,0);
export const sceneStart = (p: Pick<Project,'scenes'>, index: number) => p.scenes.slice(0,index).reduce((n,s) => n+s.durationFrames,0);
