import {randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {operationSchema,applyOperations} from '../../../src/model/operations';
import type {Project} from '../../../src/model/project';
import {ProjectRepository,ProjectError} from './project-store';
import {reviewVisualDirection} from '../../../src/model/direction';

const UUID=z.string().uuid();
const operationList=z.array(operationSchema).min(1).max(40);
const storedProposal=z.object({
  id:UUID,projectId:UUID,createdAt:z.string(),baseRevision:z.string().regex(/^[0-9a-f]{64}$/),
  operations:operationList,
}).strict();
export type ProposedChange=z.infer<typeof storedProposal>;
export interface ChangePreview {
  beforeScenes:number;afterScenes:number;beforeClips:number;afterClips:number;
  beforeShots:number;afterShots:number;
  addedScenes:string[];removedScenes:string[];changedScenes:{before:string;after:string;id:string;changedFields:string[]}[];
  changedClips:{id:string;changedFields:string[]}[];addedClips:number;removedClips:number;
  addedAssets:number;removedAssets:number;addedCaptions:number;addedEvidence:number;
  addedShots:string[];removedShots:string[];changedShots:{id:string;changedFields:string[]}[];
  visualAudit?:{coveragePercent:number;warnings:number;errors:number;unverifiedVisuals:number};
}
export function describeChanges(before:Project,after:Project):ChangePreview {
  const a=new Map(before.scenes.map(s=>[s.id,s]));
  const b=new Map(after.scenes.map(s=>[s.id,s]));
  return {
    beforeScenes:before.scenes.length,afterScenes:after.scenes.length,
    beforeShots:before.shots.length,afterShots:after.shots.length,
    beforeClips:before.clips.length,afterClips:after.clips.length,
    addedScenes:after.scenes.filter(s=>!a.has(s.id)).map(s=>s.title),
    removedScenes:before.scenes.filter(s=>!b.has(s.id)).map(s=>s.title),
    changedScenes:after.scenes.filter(s=>{
      const old=a.get(s.id);return old&&JSON.stringify(old)!==JSON.stringify(s);
    }).map(s=>{
      const old=a.get(s.id)!;
      return {id:s.id,before:old.title,after:s.title,
        changedFields:Object.keys(s).filter(key=>JSON.stringify(s[key as keyof typeof s])!==JSON.stringify(old[key as keyof typeof s]))};
    }),
    changedClips:after.clips.filter(c=>{
      const old=before.clips.find(x=>x.id===c.id);return old&&JSON.stringify(old)!==JSON.stringify(c);
    }).map(c=>{
      const old=before.clips.find(x=>x.id===c.id)!;
      return {id:c.id,changedFields:Object.keys(c).filter(key=>JSON.stringify(c[key as keyof typeof c])!==JSON.stringify(old[key as keyof typeof c]))};
    }),
    addedClips:after.clips.filter(c=>!before.clips.some(x=>x.id===c.id)).length,
    removedClips:before.clips.filter(c=>!after.clips.some(x=>x.id===c.id)).length,
    addedShots:after.shots.filter(s=>!before.shots.some(x=>x.id===s.id)).map(s=>s.title),
    removedShots:before.shots.filter(s=>!after.shots.some(x=>x.id===s.id)).map(s=>s.title),
    changedShots:after.shots.flatMap(s=>{
      const old=before.shots.find(x=>x.id===s.id);
      if(!old||JSON.stringify(s)===JSON.stringify(old))return [];
      return [{id:s.id,changedFields:Object.keys(s).filter(key=>
        JSON.stringify(s[key as keyof typeof s])!==JSON.stringify(old[key as keyof typeof s]))}];
    }),
    addedAssets:after.assets.length-before.assets.length,
    removedAssets:Math.max(0,before.assets.length-after.assets.length),
    addedCaptions:after.captions.length-before.captions.length,
    addedEvidence:after.evidence.length-before.evidence.length,
    ...(after.visualMode==='shots'?(()=>{
      const review=reviewVisualDirection(after);
      return {visualAudit:{coveragePercent:review.coveragePercent,
        warnings:review.issues.filter(x=>x.severity==='warning').length,
        errors:review.issues.filter(x=>x.severity==='error').length,
        unverifiedVisuals:review.unverifiedVisuals}};
    })():{}),

  };
}
export interface ProposalView extends ProposedChange {preview:ChangePreview|null;stale?:boolean}
export class ProposalRepository {
  constructor(readonly projects:ProjectRepository){}
  private directory(projectId:string){
    UUID.parse(projectId);
    return join(this.projects.root,projectId,'proposals');
  }
  private path(projectId:string,id:string){
    UUID.parse(id);
    return join(this.directory(projectId),id+'.json');
  }
  async preview(projectId:string,operations:unknown,baseRevision:string):Promise<ChangePreview> {
    const original=await this.projects.read(projectId);
    if(original.revision!==baseRevision)throw new ProjectError('Projeto mudou desde a leitura do Codex. Releia a revisão.',409);
    const changed=applyOperations(original.project,operationList.parse(operations));
    return describeChanges(original.project,changed);
  }
  async create(projectId:string,operations:unknown,baseRevision:string):Promise<ProposalView>{
    const preview=await this.preview(projectId,operations,baseRevision);
    const saved=storedProposal.parse({
      id:randomUUID(),projectId,createdAt:new Date().toISOString(),baseRevision,
      operations:operationList.parse(operations),
    });
    const folder=this.directory(projectId);
    await mkdir(folder,{recursive:true});
    // Não deixar propostas automáticas crescerem indefinidamente.
    if((await readdir(folder)).length>=30)throw new ProjectError('Limite de 30 propostas pendentes; aprove ou rejeite uma.',409);
    await writeFile(this.path(projectId,saved.id),JSON.stringify(saved,null,2)+'\n',{flag:'wx',encoding:'utf8'});
    return {...saved,preview};
  }
  async get(projectId:string,proposalId:string):Promise<ProposalView>{
    let stored:ProposedChange;
    try{stored=storedProposal.parse(JSON.parse(await readFile(this.path(projectId,proposalId),'utf8')));}
    catch{throw new ProjectError('Proposta não encontrada ou inválida.',404);}
    if(stored.projectId!==projectId||stored.id!==proposalId)throw new ProjectError('ID da proposta inválido.',422);
    const original=await this.projects.read(projectId);
    // Descrever a mudança sobre a versão-base correta; propostas obsoletas aparecem com erro 409.
    if(original.revision!==stored.baseRevision)throw new ProjectError('Proposta obsoleta: projeto já foi alterado. Gere uma nova.',409);
    const next=applyOperations(original.project,stored.operations);
    return {...stored,preview:describeChanges(original.project,next)};
  }
  async list(projectId:string):Promise<ProposalView[]>{
    await this.projects.read(projectId);
    let items:string[];
    try{items=(await readdir(this.directory(projectId))).filter(name=>name.endsWith('.json'));}
    catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
    const results=await Promise.all(items.map(async name=>{
      try{return await this.get(projectId,name.slice(0,-5));}
      catch(e){if(e instanceof ProjectError&&e.status===409){
        // O usuário deve poder rejeitar propostas antigas.
        const p=storedProposal.parse(JSON.parse(await readFile(this.path(projectId,name.slice(0,-5)),'utf8')));
        return {...p,preview:null,stale:true};
      }return null;}
    }));
    return results.filter((x):x is ProposalView=>x!==null)
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  async accept(projectId:string,proposalId:string):Promise<Awaited<ReturnType<ProjectRepository['save']>>>{
    const proposal=await this.get(projectId,proposalId);
    const original=await this.projects.read(projectId);
    const changed=applyOperations(original.project,proposal.operations);
    const review=reviewVisualDirection(changed);
    if(!review.readyForEditorialReview)
      throw new ProjectError('Direção visual incompleta: cubra os espaços vazios e gere uma proposta corrigida.',422);
    const result=await this.projects.save(projectId,changed,proposal.baseRevision);
    await rm(this.path(projectId,proposalId),{force:true});
    return result;
  }
  async reject(projectId:string,proposalId:string):Promise<void>{
    await this.projects.read(projectId);
    await rm(this.path(projectId,proposalId),{force:true});
  }
}
