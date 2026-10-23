import { z } from 'zod';
import { sceneKindSchema, sceneSchema, type Project, type Scene } from './project';
import type { Operation } from './operations';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const storyboardBeatSchema = z.object({
  kind: sceneKindSchema,
  title: z.string().min(1).max(180),
  subtitle: z.string().max(400),
  kicker: z.string().max(100),
  durationFrames: z.number().int().min(30).max(900),
  accentColor: hex,
  backgroundColor: hex,
  visualDirection: z.string().min(1).max(220),
  evidenceNeeded: z.string().max(220),
}).strict();

export const storyboardProposalSchema = z.object({
  summary: z.string().min(1).max(1000),
  scenes: z.array(storyboardBeatSchema).min(1).max(10),
}).strict();

export const batchSceneChangeSchema = sceneSchema.omit({
  id: true,
  imageUrl: true,
  productionNotes: true,
}).strict();

export const batchProposalSchema = z.object({
  summary: z.string().min(1).max(1000),
  updates: z.array(z.object({
    sceneId: z.string().min(1),
    changes: batchSceneChangeSchema,
    reason: z.string().min(1).max(250),
  }).strict()).min(1).max(8),
}).strict().refine(
  proposal => new Set(proposal.updates.map(item => item.sceneId)).size === proposal.updates.length,
  'Uma mesma cena não pode aparecer duas vezes.',
);

export type StoryboardProposal = z.infer<typeof storyboardProposalSchema>;
export type BatchProposal = z.infer<typeof batchProposalSchema>;

/** Constrói operações que APENAS acrescentam cenas ao final; nada existente é apagado. */
export function storyboardAppendOperations(
  project: Project,
  input: unknown,
  chosenIndices: readonly number[],
  makeId: () => string,
): Operation[] {
  const proposal = storyboardProposalSchema.parse(input);
  const indices = [...new Set(chosenIndices)];
  if (!indices.length) throw new Error('Escolha pelo menos uma cena.');
  if (indices.some(i => !Number.isInteger(i) || i < 0 || i >= proposal.scenes.length)) {
    throw new Error('Seleção de cenas inválida.');
  }
  if (project.scenes.length + indices.length > 200) throw new Error('Limite de 200 cenas por projeto.');
  let previous = project.scenes[project.scenes.length - 1].id;
  const usedIds = new Set(project.scenes.map(scene => scene.id));
  return indices.sort((a, b) => a - b).map(i => {
    const beat = proposal.scenes[i];
    const id = 'scene-' + makeId();
    if (usedIds.has(id)) throw new Error('ID de cena gerado já existe no projeto.');
    usedIds.add(id);
    const scene: Scene = {
      id,
      kind: beat.kind,
      title: beat.title,
      subtitle: beat.subtitle,
      kicker: beat.kicker,
      durationFrames: beat.durationFrames,
      accentColor: beat.accentColor,
      backgroundColor: beat.backgroundColor,
      imageUrl: '',
      productionNotes: 'DIREÇÃO VISUAL: ' + beat.visualDirection +
        (beat.evidenceNeeded ? '\nEVIDÊNCIAS A VERIFICAR: ' + beat.evidenceNeeded : ''),
    };
    const op: Operation = { type: 'addScene', scene, afterId: previous };
    previous = scene.id;
    return op;
  });
}

/** Uma transação atômica para alterar apenas as cenas escolhidas do projeto original. */
export function batchUpdateOperations(
  project: Project,
  input: unknown,
  chosenSceneIds: readonly string[],
): Operation[] {
  const proposal = batchProposalSchema.parse(input);
  const known = new Set(project.scenes.map(s => s.id));
  const chosen = new Set(chosenSceneIds);
  if (chosen.size === 0) throw new Error('Escolha pelo menos uma alteração.');
  for (const id of chosen) {
    if (!known.has(id) || !proposal.updates.some(update => update.sceneId === id)) {
      throw new Error('Alteração para cena inexistente ou não proposta.');
    }
  }
  return proposal.updates.filter(update => chosen.has(update.sceneId)).map(update => ({
    type: 'updateScene' as const,
    sceneId: update.sceneId,
    changes: update.changes,
  }));
}
