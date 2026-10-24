import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProductionCoordinator} from './production';
import {ProjectRepository} from './project-store';
import {ProposalRepository} from './proposals';
import {buildPilotProject,pilotBeats} from '../../../src/model/pilot';

async function fixture(fn:(projects:ProjectRepository,proposals:ProposalRepository,
    flow:ProductionCoordinator)=>Promise<void>){
  const root=await mkdtemp(join(tmpdir(),'dark-production-'));
  const projects=new ProjectRepository(root),proposals=new ProposalRepository(projects);
  const flow=new ProductionCoordinator(projects,proposals,async()=>true,async()=>[]);
  try{await fn(projects,proposals,flow);}finally{await rm(root,{recursive:true,force:true});}
}
describe('produção retomável local',()=>{
  it('não cria propostas quando o usuário só tem um projeto vazio',()=>fixture(async(projects,proposals,flow)=>{
    const original=await projects.create('Sem áudio');
    const state=await flow.continue(original.project.id);
    expect(state.pendingProposals).toBe(0);
    expect(await proposals.count(original.project.id)).toBe(0);
    const persisted=await flow.readCheckpoint(original.project.id);
    expect(persisted?.projectId).toBe(original.project.id);
    expect(persisted?.steps.find(s=>s.id==='voice')?.status).toBe('pending');
  }));
  it('gera apenas uma proposta por revisão e volta do checkpoint',()=>fixture(async(projects,proposals,flow)=>{
    const audioId=randomUUID();
    const original=buildPilotProject({
      newId:randomUUID,
      voiceAsset:{id:audioId,kind:'audio',name:'voz.wav',mime:'audio/wav',
        url:'http://127.0.0.1:4317/media/'+audioId,durationFrames:900,rights:{status:'unknown',sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}},
      speechFrames:pilotBeats.map(x=>x.end-x.start-8),
    });
    const saved=await projects.adopt({...original,visualMode:'legacy',shots:[]});
    const first=await flow.continue(saved.project.id);
    expect(first.proposedId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await proposals.count(saved.project.id)).toBe(1);
    const second=await flow.continue(saved.project.id);
    expect(second.proposedId).toBeUndefined();
    expect(await proposals.count(saved.project.id)).toBe(1);
    expect(second.steps.find(s=>s.id==='visual')?.status).toBe('proposed');
    expect((await projects.read(saved.project.id)).project.visualMode).toBe('legacy');
    expect(await flow.readCheckpoint(saved.project.id)).not.toBeNull();
  }));
});
