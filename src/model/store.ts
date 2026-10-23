import { create } from 'zustand';
import { applyOperations, type Operation } from './operations';
import { projectSchema, starterProject, type Project } from './project';

const STORE_KEY = 'dark-studio:project:v1';
function loadProject(): Project {
  try {
    const data = localStorage.getItem(STORE_KEY);
    return data ? projectSchema.parse(JSON.parse(data)) : structuredClone(starterProject);
  } catch { return structuredClone(starterProject); }
}
function persist(project: Project) { try {localStorage.setItem(STORE_KEY, JSON.stringify(project));} catch { /* storage may be disabled */ } }

type EditorState = {
  project: Project;
  selectedSceneId: string;
  past: Project[];
  future: Project[];
  apply: (operations: Operation[]) => void;
  replace: (project: Project) => void;
  select: (id: string) => void;
  undo: () => void;
  redo: () => void;
};
const initial = loadProject();
export const useEditor = create<EditorState>((set, get) => ({
  project: initial, selectedSceneId: initial.scenes[0].id, past: [], future: [],
  apply: operations => {
    const current = get();
    const next = applyOperations(current.project, operations);
    persist(next);
    set({project:next, past:[...current.past.slice(-49), current.project], future: [], selectedSceneId: next.scenes.some(s => s.id === current.selectedSceneId) ? current.selectedSceneId : next.scenes[0].id});
  },
  replace: incoming => {
    const next = projectSchema.parse(incoming);
    const current = get(); persist(next);
    set({project:next, selectedSceneId:next.scenes[0].id, past:[...current.past.slice(-49), current.project], future:[]});
  },
  select: id => {if (get().project.scenes.some(s => s.id === id)) set({selectedSceneId:id});},
  undo: () => {
    const {past, project, future} = get(); if (!past.length) return;
    const next = past[past.length - 1]; persist(next);
    set({project:next,past:past.slice(0,-1),future:[project,...future].slice(0,50), selectedSceneId: next.scenes[0].id});
  },
  redo: () => {
    const {past, project, future} = get(); if (!future.length) return;
    const next = future[0]; persist(next);
    set({project:next,past:[...past,project].slice(-50),future:future.slice(1),selectedSceneId:next.scenes[0].id});
  },
}));
