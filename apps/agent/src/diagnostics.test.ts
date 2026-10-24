import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {starterProject, type Project} from '../../../src/model/project';
import {diagnoseProject} from './diagnostics';

describe('diagnóstico do projeto local',()=>{
  it('alerta sobre mídia ausente e fontes pendentes sem inventar resultados',async()=>{
    const audioId=randomUUID();
    const base:Project={...structuredClone(starterProject),
      assets:[{id:audioId,kind:'audio',name:'narração.wav',mime:'audio/wav',url:'http://127.0.0.1:4317/media/'+audioId,rights:{status:'unknown',sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}}],
      evidence:[{id:randomUUID(),sceneId:'scene-2',claim:'Verificar número',sourceTitle:'Fonte pública',
        sourceUrl:'',notes:'',reviewStatus:'pending'}],
    };
    const report=await diagnoseProject(base,async()=>false);
    expect(report.readyForRender).toBe(false);
    expect(report.issues.some(i=>i.code==='media-missing')).toBe(true);
    expect(report.issues.some(i=>i.code==='evidence-pending')).toBe(true);
  });
  it('sem mídia ausente, render estruturalmente possível mas informação ainda exige revisão',async()=>{
    const report=await diagnoseProject(starterProject,async()=>true);
    expect(report.readyForRender).toBe(true);
    expect(report.issues.some(i=>i.code==='evidence-missing')).toBe(true);
  });
});
