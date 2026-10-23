import { z } from 'zod';

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
}).strict();
export const projectSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  fps: z.literal(30),
  width: z.literal(1920),
  height: z.literal(1080),
  scenes: z.array(sceneSchema).min(1).max(200),
}).strict().refine(p => new Set(p.scenes.map(s => s.id)).size === p.scenes.length, 'IDs de cenas duplicados');
export type Scene = z.infer<typeof sceneSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SceneKind = Scene['kind'];

export const starterProject: Project = {
  version: 1, id: 'dark-studio-demo', name: 'Investigação sem rosto', fps: 30, width: 1920, height: 1080,
  scenes: [
    {id: 'scene-1', kind: 'title', title: 'QUEM CONTROLA A INFORMAÇÃO?', subtitle: 'Uma investigação sobre dados, poder e influência', kicker: 'CAPÍTULO 01', durationFrames: 180, accentColor: '#f1bd67', backgroundColor: '#0a111e', imageUrl: ''},
    {id: 'scene-2', kind: 'stat', title: '247%', subtitle: 'Exemplo de estatística visual — substitua por dados verificados', kicker: 'DADOS & CONTEXTO', durationFrames: 150, accentColor: '#f1bd67', backgroundColor: '#141e30', imageUrl: ''},
    {id: 'scene-3', kind: 'quote', title: 'OS FATOS IMPORTAM.', subtitle: 'Associe cada afirmação às evidências antes de publicar.', kicker: 'DOCUMENTOS • EVIDÊNCIAS', durationFrames: 165, accentColor: '#89b7d9', backgroundColor: '#11151e', imageUrl: ''},
  ],
};

export const projectDuration = (p: Project) => p.scenes.reduce((sum, s) => sum + s.durationFrames, 0);
export const sceneStart = (p: Project, index: number) => p.scenes.slice(0, index).reduce((sum,s) => sum + s.durationFrames, 0);
