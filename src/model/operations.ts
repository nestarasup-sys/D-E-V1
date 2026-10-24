import { z } from 'zod';
import {shotSchema,chapterSchema,channelKitSchema,channelKitObjectSchema} from './shots';
import { assetSchema, clipSchema, captionSchema, evidenceSchema, projectSchema, sceneSchema, type Project } from './project';

const editableSceneSchema = sceneSchema.omit({id:true}).partial().strict();
export const operationSchema = z.discriminatedUnion('type', [
  z.object({type:z.literal('updateScene'), sceneId:z.string(), changes:editableSceneSchema}).strict(),
  z.object({type:z.literal('addScene'), scene:sceneSchema, afterId:z.string().nullable()}).strict(),
  z.object({type:z.literal('removeScene'), sceneId:z.string()}).strict(),
  z.object({type:z.literal('moveScene'), sceneId:z.string(), direction:z.enum(['left','right'])}).strict(),
  z.object({type:z.literal('addAsset'), asset:assetSchema}).strict(),
  z.object({type:z.literal('addClip'), clip:clipSchema}).strict(),
  z.object({type:z.literal('updateClip'), clipId:z.string(), changes:clipSchema.omit({id:true,assetId:true}).partial().strict()}).strict(),
  z.object({type:z.literal('removeClip'), clipId:z.string()}).strict(),
  z.object({type:z.literal('addShot'),shot:shotSchema}).strict(),
  z.object({type:z.literal('updateShot'),shotId:z.string().uuid(),changes:shotSchema.omit({id:true}).partial().strict()}).strict(),
  z.object({type:z.literal('removeShot'),shotId:z.string().uuid()}).strict(),
  z.object({type:z.literal('replaceChapters'),chapters:z.array(chapterSchema).max(100)}).strict(),
  z.object({type:z.literal('setVisualMode'),visualMode:z.enum(['legacy','shots'])}).strict(),
  z.object({type:z.literal('updateChannelKit'),changes:channelKitObjectSchema.partial().strict()}).strict(),
  z.object({type:z.literal('replaceCaptions'), captions:z.array(captionSchema).max(3000)}).strict(),
  z.object({type:z.literal('updateCaption'),captionId:z.string().uuid(),
    changes:captionSchema.omit({id:true}).partial().strict()}).strict(),
  z.object({type:z.literal('addEvidence'), evidence:evidenceSchema}).strict(),
  z.object({type:z.literal('updateEvidence'), evidenceId:z.string().uuid(), changes:evidenceSchema.omit({id:true}).partial().strict()}).strict(),
  z.object({type:z.literal('removeEvidence'), evidenceId:z.string().uuid()}).strict(),
]);
export type Operation = z.infer<typeof operationSchema>;

export function applyOperations(project:Project, input:unknown):Project {
  const ops = z.array(operationSchema).min(1).max(40).parse(input);
  const draft:Project = structuredClone(project);
  for (const op of ops) {
    switch(op.type) {
      case 'updateScene': {
        const i = draft.scenes.findIndex(s=>s.id===op.sceneId);
        if(i<0) throw new Error('Cena não encontrada');
        draft.scenes[i] = sceneSchema.parse({...draft.scenes[i],...op.changes}); break;
      }
      case 'addScene': {
        if (draft.scenes.some(s=>s.id===op.scene.id)) throw new Error('Cena duplicada');
        const i = op.afterId === null ? -1 : draft.scenes.findIndex(s=>s.id===op.afterId);
        if (op.afterId!==null && i<0) throw new Error('Cena anterior não encontrada');
        draft.scenes.splice(i+1,0,op.scene); break;
      }
      case 'removeScene': {
        if(draft.shots.length)throw new Error('Remover uma cena com planos editáveis exige ripple-edit explícito; operação bloqueada.');
        const i = draft.scenes.findIndex(s=>s.id===op.sceneId);
        if (i<0 || draft.scenes.length===1) throw new Error('Não é possível remover essa cena');
        const start = draft.scenes.slice(0,i).reduce((n,s)=>n+s.durationFrames,0);
        const end = start+draft.scenes[i].durationFrames;
        draft.clips = draft.clips.flatMap(c => {
          const cEnd = c.startFrame + c.durationFrames;
          if (cEnd<=start) return [c];
          if (c.startFrame>=end) return [{...c,startFrame:c.startFrame-(end-start)}];
          // Clipes atravessando a cena removida são cortados ao trecho anterior.
          if (c.startFrame<start) return [{...c,durationFrames:start-c.startFrame}];
          return [];
        });
        draft.captions=draft.captions.flatMap(c=>{
          if(c.endFrame<=start)return [c];
          if(c.startFrame>=end)return [{...c,startFrame:c.startFrame-(end-start),endFrame:c.endFrame-(end-start)}];
          // Evita perder legendas não relacionadas à cena eliminada.
          if(c.startFrame<start)return [{...c,endFrame:start}];
          return [];
        });
        draft.evidence=draft.evidence.map(e=>e.sceneId===op.sceneId?{...e,sceneId:undefined}:e);
        draft.scenes.splice(i,1); break;
      }
      case 'moveScene': {
        const i = draft.scenes.findIndex(s=>s.id===op.sceneId);
        if(i<0) throw new Error('Cena não encontrada');
        // Mover cenas com clipes destruiria a sincronização absoluta; é bloqueado até o ripple-edit.
        if(draft.clips.length || draft.captions.length || draft.shots.length) throw new Error('Reordenação de cenas com mídia ou legendas ainda não suportada; remova a sincronização antes.');
        const j=i+(op.direction==='left'?-1:1);
        if(j>=0&&j<draft.scenes.length){const [s]=draft.scenes.splice(i,1);draft.scenes.splice(j,0,s);} break;
      }
      case 'addAsset': if(draft.assets.some(a=>a.id===op.asset.id)) throw new Error('Asset duplicado');draft.assets.push(op.asset);break;
      case 'addClip': if(draft.clips.some(c=>c.id===op.clip.id)) throw new Error('Clipe duplicado'); draft.clips.push(op.clip);break;
      case 'updateClip': {
        const i=draft.clips.findIndex(c=>c.id===op.clipId);
        if(i<0) throw new Error('Clipe não encontrado');
        draft.clips[i]=clipSchema.parse({...draft.clips[i],...op.changes});break;
      }
      case 'removeClip': {
        const i=draft.clips.findIndex(c=>c.id===op.clipId);
        if(i<0) throw new Error('Clipe não encontrado'); draft.clips.splice(i,1);break;
      }
      case 'addShot': {
        if(draft.shots.some(s=>s.id===op.shot.id))throw new Error('Plano duplicado');
        draft.shots.push(op.shot);break;
      }
      case 'updateShot': {
        const i=draft.shots.findIndex(s=>s.id===op.shotId);
        if(i<0)throw new Error('Plano não encontrado');
        draft.shots[i]=shotSchema.parse({...draft.shots[i],...op.changes});break;
      }
      case 'removeShot': {
        const i=draft.shots.findIndex(s=>s.id===op.shotId);
        if(i<0)throw new Error('Plano não encontrado');
        draft.shots.splice(i,1);break;
      }
      case 'replaceChapters': draft.chapters=op.chapters;break;
      case 'setVisualMode': draft.visualMode=op.visualMode;break;
      case 'updateChannelKit': draft.channelKit=channelKitSchema.parse({...draft.channelKit,...op.changes});break;
      case 'replaceCaptions': draft.captions=op.captions;break;
      case 'updateCaption': {
        const idx=draft.captions.findIndex(c=>c.id===op.captionId);
        if(idx<0)throw new Error('Legenda não encontrada');
        draft.captions[idx]=captionSchema.parse({...draft.captions[idx],...op.changes});
        break;
      }
      case 'addEvidence':
        if(draft.evidence.some(e=>e.id===op.evidence.id))throw new Error('Evidência duplicada');
        draft.evidence.push(op.evidence);break;
      case 'updateEvidence': {
        const index=draft.evidence.findIndex(e=>e.id===op.evidenceId);
        if(index<0)throw new Error('Evidência não encontrada');
        draft.evidence[index]=evidenceSchema.parse({...draft.evidence[index],...op.changes});break;
      }
      case 'removeEvidence':{
        const index=draft.evidence.findIndex(e=>e.id===op.evidenceId);
        if(index<0)throw new Error('Evidência não encontrada');
        draft.evidence.splice(index,1);break;
      }
    }
  }
  return projectSchema.parse(draft);
}
