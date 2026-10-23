import {describe,expect,it} from 'vitest';
import {applyOperations} from './operations';
import {starterProject,projectSchema} from './project';

describe('operações de edição',()=>{
  it('altera uma única cena sem mudar as demais',()=>{
    const next=applyOperations(starterProject,[{type:'updateScene',sceneId:'scene-2',changes:{title:'NOVO DADO'}}]);
    expect(next.scenes[1].title).toBe('NOVO DADO');
    expect(starterProject.scenes[1].title).toBe('247%');
  });
  it('impede remoção da última cena',()=>{
    const only=projectSchema.parse({...starterProject,scenes:[starterProject.scenes[0]]});
    expect(()=>applyOperations(only,[{type:'removeScene',sceneId:'scene-1'}])).toThrow();
  });
  it('recusa propriedades arbitrárias e cores inválidas',()=>{
    expect(()=>applyOperations(starterProject,[{type:'updateScene',sceneId:'scene-1',changes:{evil:true}}])).toThrow();
    expect(()=>applyOperations(starterProject,[{type:'updateScene',sceneId:'scene-1',changes:{accentColor:'red'}}])).toThrow();
  });
  it('não aceita IDs duplicados',()=>{
    expect(()=>applyOperations(starterProject,[{type:'addScene',scene:starterProject.scenes[0],afterId:null}])).toThrow();
  });
  it('reordena sem perder conteúdo',()=>{
    const next=applyOperations(starterProject,[{type:'moveScene',sceneId:'scene-1',direction:'right'}]);
    expect(next.scenes.map(s=>s.id)).toEqual(['scene-2','scene-1','scene-3']);
  });
});
