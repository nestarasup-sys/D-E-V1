import {describe,expect,it} from 'vitest';
import {applyOperations} from './operations';
import {starterProject,parseProject,projectDuration,type Project} from './project';
const copy=()=>structuredClone(starterProject);
const asset={id:'de95201a-6d63-438e-94e5-b862bc77f61e',name:'voice.mp3',kind:'audio' as const,mime:'audio/mpeg',url:'http://127.0.0.1:4317/media/de95201a-6d63-438e-94e5-b862bc77f61e',durationFrames:400};
const clip={id:'737383e1-c605-49db-b9aa-3e312a390b61',assetId:asset.id,lane:'narration' as const,startFrame:30,durationFrames:300,trimStartFrames:0,volume:0.8};
describe('projeto multitrilha',()=>{
  it('migra projetos v1 preservando cenas',()=>{const {assets:_,clips:__,...base}=copy();const p=parseProject({...base,version:1});expect(p.version).toBe(2);expect(p.assets).toEqual([]);});
  it('permite importar mídia e colocar clipe em narração',()=>{const p=applyOperations(copy(),[{type:'addAsset',asset},{type:'addClip',clip}]);expect(p.clips).toHaveLength(1);expect(p.assets).toHaveLength(1);});
  it('impede clipes fora da duração',()=>{expect(()=>applyOperations(copy(),[{type:'addAsset',asset},{type:'addClip',clip:{...clip,startFrame:projectDuration(copy())-10}}])).toThrow();});
  it('impede áudio colocado na faixa visual',()=>{expect(()=>applyOperations(copy(),[{type:'addAsset',asset},{type:'addClip',clip:{...clip,lane:'visual'}}])).toThrow();});
  it('permite mover clipe com validação',()=>{const p=applyOperations(copy(),[{type:'addAsset',asset},{type:'addClip',clip}]);const q=applyOperations(p,[{type:'updateClip',clipId:clip.id,changes:{startFrame:40,volume:0.5}}]);expect(q.clips[0].startFrame).toBe(40);expect(q.clips[0].volume).toBe(.5);});
  it('corta clipes que atravessam uma cena removida',()=>{let p:Project=copy();p=applyOperations(p,[{type:'addAsset',asset},{type:'addClip',clip:{...clip,startFrame:150,durationFrames:200}}]);p=applyOperations(p,[{type:'removeScene',sceneId:'scene-2'}]);expect(p.clips[0].durationFrames).toBe(30);});
  it('rejeita reordenação sem ripple quando há mídia',()=>{const p=applyOperations(copy(),[{type:'addAsset',asset},{type:'addClip',clip}]);expect(()=>applyOperations(p,[{type:'moveScene',sceneId:'scene-1',direction:'right'}])).toThrow(/sincronização/);});
  it('impede media URL arbitrária',()=>{expect(()=>applyOperations(copy(),[{type:'addAsset',asset:{...asset,url:'http://evil.example/media/'+asset.id}}])).toThrow();});
});
