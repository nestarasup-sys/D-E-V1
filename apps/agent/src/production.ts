import {randomUUID} from 'node:crypto';
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {compileDirection,makeAutomaticDirection} from '../../../src/model/direction';
import {describeProduction,nextProductionAction,type ProductionOverview} from '../../../src/model/production';
import {diagnoseProject} from './diagnostics';
import {mediaExistsFor} from './media';
import {listJobs,type JobStatus} from './job-registry';
import {ProjectRepository,ProjectError} from './project-store';
import {ProposalRepository} from './proposals';

export class ProductionCoordinator {
  constructor(
    private readonly projects:ProjectRepository,
    private readonly proposals:ProposalRepository,
    private readonly hasMedia:(id:string)=>Promise<boolean>=mediaExistsFor,
    private readonly jobs:(id:string)=>Promise<JobStatus[]>=listJobs,
  ){}
  async assess(projectId:string):Promise<ProductionOverview>{
    const saved=await this.projects.read(projectId);
    const [proposals,diagnostic,jobs]=await Promise.all([
      this.proposals.list(projectId),
      diagnoseProject(saved.project,this.hasMedia),
      this.jobs(projectId),
    ]);
    const voiceClips=saved.project.clips.filter(c=>c.lane==='narration');
    const availableNarration=voiceClips.length>0&&
      (await Promise.all(voiceClips.map(c=>this.hasMedia(c.assetId)))).every(Boolean);
    const steps=describeProduction({
      project:saved.project,availableNarration,
      pendingProposals:proposals.filter(p=>!p.stale).length,
      diagnosticErrors:diagnostic.counts.errors,
      diagnosticWarnings:diagnostic.counts.warnings,
      completedRenders:jobs.filter(job=>job.state==='completed').length,
      interruptedRenders:jobs.filter(job=>job.state==='interrupted').length,
    });
    return {
      projectId,revision:saved.revision,updatedAt:new Date().toISOString(),
      steps,nextAction:nextProductionAction(steps),
      pendingProposals:proposals.filter(p=>!p.stale).length,
      completedRenders:jobs.filter(job=>job.state==='completed').length,
      interruptedRenders:jobs.filter(job=>job.state==='interrupted').length,
    };
  }
  private path(id:string){
    // Repository.read validates that this ID is a valid UUID and in the local root.
    return join(this.projects.root,id,'production','checkpoint.json');
  }
  async checkpoint(projectId:string):Promise<ProductionOverview>{
    const state=await this.assess(projectId);
    const folder=join(this.projects.root,projectId,'production');
    const file=this.path(projectId);
    const tmp=join(folder,'.checkpoint-'+randomUUID()+'.tmp');
    await mkdir(folder,{recursive:true});
    try{
      await writeFile(tmp,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
      await rename(tmp,file);
    }finally{await rm(tmp,{force:true}).catch(()=>{});}
    return state;
  }
  async readCheckpoint(projectId:string):Promise<ProductionOverview|null>{
    await this.projects.read(projectId);
    try{return JSON.parse(await readFile(this.path(projectId),'utf8')) as ProductionOverview;}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
  }
  async continue(projectId:string):Promise<ProductionOverview>{
    const current=await this.projects.read(projectId);
    const currentProposals=await this.proposals.list(projectId);
    if(currentProposals.some(item=>!item.stale)){
      const state=await this.checkpoint(projectId);
      return {...state,nextAction:'Já existe uma proposta pendente. Use Revisar Codex; nenhuma foi duplicada.'};
    }
    if(current.project.visualMode==='shots'&&current.project.shots.length){
      const state=await this.checkpoint(projectId);
      return {...state,nextAction:'Planos já estão no projeto salvo. Revise e execute o diagnóstico.'};
    }
    const narration=current.project.clips.filter(c=>c.lane==='narration');
    if(narration.length===0||current.project.captions.length===0||
      !(await Promise.all(narration.map(c=>this.hasMedia(c.assetId)))).every(Boolean)){
      const state=await this.checkpoint(projectId);
      return {...state,nextAction:'Faltam narração local e/ou legendas reais. O sistema não fabrica timestamps.'};
    }
    const hasNarrative=current.project.scenes.some(s=>s.title.trim()!=='NOVO DOCUMENTÁRIO');
    if(!hasNarrative)throw new ProjectError('Preencha o roteiro antes de automatizar a direção visual.',422);
    const direction=makeAutomaticDirection(current.project);
    const compiled=compileDirection(current.project,direction,randomUUID);
    if(!compiled.report.readyForEditorialReview)
      throw new ProjectError('A direção tem buracos; ajuste o storyboard antes de gerar proposta.',422);
    const proposal=await this.proposals.create(projectId,compiled.operations,current.revision);
    const state=await this.checkpoint(projectId);
    return {...state,proposedId:proposal.id,
      nextAction:'Proposta ilustrativa preparada. Abra Revisar Codex e confira cenas, dados e fontes.'};
  }
}
