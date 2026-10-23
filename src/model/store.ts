import { create } from 'zustand';
import { applyOperations, type Operation } from './operations';
import { parseProject, starterProject, type Project } from './project';

const STORE_KEY='dark-studio:project:v2';
function loadProject():Project {
  try {
    const raw=localStorage.getItem(STORE_KEY) ?? localStorage.getItem('dark-studio:project:v1');
    return raw?parseProject(JSON.parse(raw)):structuredClone(starterProject);
  } catch {return structuredClone(starterProject);}
}
function persist(p:Project){try{localStorage.setItem(STORE_KEY,JSON.stringify(p));}catch{/* Mídia fica no disco; JSON pode exceder quota. */}}
type EditorState={
  project:Project;selectedSceneId:string;selectedClipId:string|null;past:Project[];future:Project[];
  apply:(ops:Operation[])=>void;replace:(p:Project)=>void;openProject:(p:Project)=>void;select:(id:string)=>void;selectClip:(id:string|null)=>void;undo:()=>void;redo:()=>void;
};
const initial=loadProject();
export const useEditor=create<EditorState>((set,get)=>({
  project:initial,selectedSceneId:initial.scenes[0].id,selectedClipId:null,past:[],future:[],
  apply:ops=>{const s=get();const next=applyOperations(s.project,ops);persist(next);set({project:next,past:[...s.past.slice(-49),s.project],future:[],selectedSceneId:next.scenes.some(x=>x.id===s.selectedSceneId)?s.selectedSceneId:next.scenes[0].id,selectedClipId:next.clips.some(c=>c.id===s.selectedClipId)?s.selectedClipId:null});},
  replace:p=>{const next=parseProject(p);const s=get();persist(next);set({project:next,selectedSceneId:next.scenes[0].id,selectedClipId:null,past:[...s.past.slice(-49),s.project],future:[]});},
  openProject:p=>{const next=parseProject(p);persist(next);set({project:next,selectedSceneId:next.scenes[0].id,selectedClipId:null,past:[],future:[]});},
  select:id=>{if(get().project.scenes.some(s=>s.id===id))set({selectedSceneId:id,selectedClipId:null});},
  selectClip:id=>{if(id===null||get().project.clips.some(c=>c.id===id))set({selectedClipId:id});},
  undo:()=>{const{past,project,future}=get();if(!past.length)return;const next=past[past.length-1];persist(next);set({project:next,past:past.slice(0,-1),future:[project,...future].slice(0,50),selectedSceneId:next.scenes[0].id,selectedClipId:null});},
  redo:()=>{const{past,project,future}=get();if(!future.length)return;const next=future[0];persist(next);set({project:next,past:[...past,project].slice(-50),future:future.slice(1),selectedSceneId:next.scenes[0].id,selectedClipId:null});},
}));
