import { z } from 'zod';
import { projectSchema, sceneSchema, type Project } from './project';

const editableSceneSchema = sceneSchema.omit({id:true}).partial().strict();
export const operationSchema = z.discriminatedUnion('type', [
  z.object({type:z.literal('updateScene'), sceneId:z.string(), changes:editableSceneSchema}).strict(),
  z.object({type:z.literal('addScene'), scene:sceneSchema, afterId:z.string().nullable()}).strict(),
  z.object({type:z.literal('removeScene'), sceneId:z.string()}).strict(),
  z.object({type:z.literal('moveScene'), sceneId:z.string(), direction:z.enum(['left','right'])}).strict(),
]);
export type Operation = z.infer<typeof operationSchema>;

export function applyOperations(project: Project, input: unknown): Project {
  const operations = z.array(operationSchema).min(1).max(20).parse(input);
  const draft: Project = structuredClone(project);
  for (const op of operations) {
    const index = 'sceneId' in op ? draft.scenes.findIndex(s => s.id === op.sceneId) : -1;
    if ('sceneId' in op && index < 0) throw new Error(`Cena não encontrada: ${op.sceneId}`);
    switch (op.type) {
      case 'updateScene': draft.scenes[index] = sceneSchema.parse({...draft.scenes[index], ...op.changes}); break;
      case 'addScene': {
        if (draft.scenes.some(s => s.id === op.scene.id)) throw new Error('Já existe uma cena com esse ID.');
        const afterIndex = op.afterId === null ? -1 : draft.scenes.findIndex(s => s.id === op.afterId);
        if (op.afterId !== null && afterIndex < 0) throw new Error('Posição de inserção inválida.');
        draft.scenes.splice(afterIndex + 1, 0, op.scene); break;
      }
      case 'removeScene': if (draft.scenes.length === 1) throw new Error('O projeto precisa ter ao menos uma cena.'); draft.scenes.splice(index,1); break;
      case 'moveScene': {
        const next = index + (op.direction === 'left' ? -1 : 1);
        if (next >= 0 && next < draft.scenes.length) {
          const [scene] = draft.scenes.splice(index,1);
          draft.scenes.splice(next,0,scene);
        }
        break;
      }
    }
  }
  return projectSchema.parse(draft);
}
