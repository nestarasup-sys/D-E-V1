import { z } from 'zod';

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
export const laneSchema = z.enum(['visual', 'narration', 'music']);
export const clipSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  lane: laneSchema,
  startFrame: z.number().int().min(0),
  durationFrames: z.number().int().positive(),
  trimStartFrames: z.number().int().min(0).default(0),
  volume: z.number().min(0).max(1).default(1),
}).strict();

export const legacyProjectSchema = z.object({
  version: z.literal(1), id: z.string().min(1), name: z.string().min(1).max(120),
  fps: z.literal(30), width: z.literal(1920), height: z.literal(1080),
  scenes: z.array(sceneSchema).min(1).max(200),
}).strict();

export const projectSchema = z.object({
  version: z.literal(2),
  id: z.string().min(1), name: z.string().min(1).max(120),
  fps: z.literal(30), width: z.literal(1920), height: z.literal(1080),
  scenes: z.array(sceneSchema).min(1).max(200),
  assets: z.array(assetSchema).max(2000),
  clips: z.array(clipSchema).max(4000),
}).strict().superRefine((p, ctx) => {
  if (new Set(p.scenes.map(s => s.id)).size !== p.scenes.length) ctx.addIssue({code:'custom', message:'IDs de cenas duplicados'});
  if (new Set(p.assets.map(a => a.id)).size !== p.assets.length) ctx.addIssue({code:'custom', message:'IDs de assets duplicados'});
  if (new Set(p.clips.map(c => c.id)).size !== p.clips.length) ctx.addIssue({code:'custom', message:'IDs de clipes duplicados'});
  const assetById = new Map(p.assets.map(a => [a.id, a]));
  const total = p.scenes.reduce((n, s) => n + s.durationFrames, 0);
  p.clips.forEach((c, i) => {
    const a = assetById.get(c.assetId);
    if (!a) ctx.addIssue({code:'custom', path:['clips',i,'assetId'], message:'Arquivo de mídia não cadastrado'});
    else if ((c.lane === 'visual') !== (a.kind !== 'audio')) ctx.addIssue({code:'custom', path:['clips',i,'lane'], message:'Tipo de mídia incompatível com trilha'});
    if (c.startFrame + c.durationFrames > total) ctx.addIssue({code:'custom', path:['clips',i], message:'Clipe ultrapassa a duração do projeto'});
    if (a?.durationFrames && c.trimStartFrames + c.durationFrames > a.durationFrames && a.kind !== 'image') ctx.addIssue({code:'custom', path:['clips',i], message:'Clipe ultrapassa a duração do arquivo'});
  });
});

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
  assets: [], clips: [],
  scenes: [
    {id:'scene-1',kind:'title',title:'QUEM CONTROLA A INFORMAÇÃO?',subtitle:'Uma investigação sobre dados, poder e influência',kicker:'CAPÍTULO 01',durationFrames:180,accentColor:'#f1bd67',backgroundColor:'#0a111e',imageUrl:''},
    {id:'scene-2',kind:'stat',title:'247%',subtitle:'Exemplo de estatística visual — substitua por dados verificados',kicker:'DADOS & CONTEXTO',durationFrames:150,accentColor:'#f1bd67',backgroundColor:'#141e30',imageUrl:''},
    {id:'scene-3',kind:'quote',title:'OS FATOS IMPORTAM.',subtitle:'Associe cada afirmação às evidências antes de publicar.',kicker:'DOCUMENTOS • EVIDÊNCIAS',durationFrames:165,accentColor:'#89b7d9',backgroundColor:'#11151e',imageUrl:''},
  ],
};
export const projectDuration = (p: Pick<Project,'scenes'>) => p.scenes.reduce((n,s) => n+s.durationFrames,0);
export const sceneStart = (p: Pick<Project,'scenes'>, index: number) => p.scenes.slice(0,index).reduce((n,s) => n+s.durationFrames,0);
