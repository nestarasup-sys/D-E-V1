import type {ProjectRecord} from './projects';
const ROOT='http://127.0.0.1:4317';
export interface ChangePreview {
  beforeScenes:number;afterScenes:number;beforeClips:number;afterClips:number;
  addedScenes:string[];removedScenes:string[];changedScenes:{id:string;before:string;after:string;changedFields:string[]}[];
  changedClips:{id:string;changedFields:string[]}[];addedClips:number;removedClips:number;
  addedAssets:number;removedAssets:number;addedCaptions:number;addedEvidence:number;
  addedShots:string[];removedShots:string[];changedShots:{id:string;changedFields:string[]}[];
  visualAudit?:{coveragePercent:number;warnings:number;errors:number;unverifiedVisuals:number};
}
export interface ProposalView {
  id:string;projectId:string;createdAt:string;baseRevision:string;
  preview:ChangePreview|null;stale?:boolean;
}
async function request(url:string,options?:RequestInit):Promise<unknown>{
  const response=await fetch(ROOT+url,options);
  const data:unknown=await response.json();
  if(!response.ok)throw new Error(typeof data==='object'&&data!==null&&'error'in data?String(data.error):'HTTP '+response.status);
  return data;
}
export async function listProposals(projectId:string):Promise<ProposalView[]>{
  const data=await request('/v1/projects/'+encodeURIComponent(projectId)+'/proposals');
  if(!data||typeof data!=='object'||!('proposals'in data)||!Array.isArray(data.proposals))throw Error('Resposta inválida.');
  return data.proposals as ProposalView[];
}
export async function decideProposal(projectId:string,proposalId:string,action:'accept'|'reject'):Promise<ProjectRecord|void>{
  return await request('/v1/projects/'+encodeURIComponent(projectId)+'/proposals/'+encodeURIComponent(proposalId)+'/'+action,
    {method:'POST'}) as ProjectRecord;
}
