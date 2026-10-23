import {freemem,totalmem,platform} from 'node:os';
import type {Project} from '../../../src/model/project';

export type Severity='error'|'warning'|'info';
export interface DiagnosticIssue {severity:Severity;code:string;message:string;sceneId?:string}
export interface ProjectDiagnostics {
  projectId:string;checkedAt:string;issues:DiagnosticIssue[];
  counts:{errors:number;warnings:number;info:number};
  readyForRender:boolean;
}
export async function diagnoseProject(project:Project,hasMedia:(id:string)=>Promise<boolean>):Promise<ProjectDiagnostics>{
  const issues:DiagnosticIssue[]=[];
  const add=(severity:Severity,code:string,message:string,sceneId?:string)=>{
    issues.push({severity,code,message,...(sceneId?{sceneId}:{})});
  };
  for(const asset of project.assets){
    if(!await hasMedia(asset.id))add('error','media-missing','Mídia não encontrada no computador: '+asset.name);
  }
  for(const scene of project.scenes){
    const refs=project.evidence.filter(e=>e.sceneId===scene.id);
    if((scene.kind==='stat'||scene.kind==='quote')&&refs.length===0){
      add('warning','evidence-missing','Cena factual sem fonte cadastrada: '+scene.title,scene.id);
    }
  }
  for(const evidence of project.evidence){
    if(evidence.reviewStatus==='pending')add('warning','evidence-pending','Fonte ainda não verificada: '+evidence.sourceTitle,evidence.sceneId);
    if(evidence.reviewStatus==='rejected')add('warning','evidence-rejected','Fonte rejeitada usada no projeto: '+evidence.sourceTitle,evidence.sceneId);
  }
  if(!project.clips.some(c=>c.lane==='narration')){
    add('info','narration-missing','Nenhuma trilha de narração adicionada. Isto é permitido, mas confirme antes de publicar.');
  }
  if(project.captions.length===0)add('info','captions-missing','Nenhum SRT/legenda vinculada ao projeto.');
  const count=(severity:Severity)=>issues.filter(issue=>issue.severity===severity).length;
  return {projectId:project.id,checkedAt:new Date().toISOString(),issues,
    counts:{errors:count('error'),warnings:count('warning'),info:count('info')},
    readyForRender:count('error')===0};
}
export function runtimeDiagnostics() {
  return {
    platform:platform(),node:process.versions.node,
    ramTotalGiB:Math.round(totalmem()/1024**3*10)/10,
    ramFreeGiB:Math.round(freemem()/1024**3*10)/10,
    cpuConcurrency:process.env.REMOTION_CONCURRENCY||'1 (padrão)',
    localService:true,
    remarks:[
      'Verificação do serviço Node; não substitui cargo check nem teste manual do desktop.',
      'Codex permanece externo ao editor; arquivos de projetos continuam locais.',
    ],
  };
}
