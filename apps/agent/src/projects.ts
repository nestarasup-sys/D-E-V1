import type {IncomingMessage, ServerResponse} from 'node:http';
import {z} from 'zod';
import {ProjectError, ProjectRepository} from './project-store';
import {ProposalRepository} from './proposals';
import {json,readJson} from './http';
import {synthesizePilotVoice} from './pilot-audio';
import {importGeneratedWave} from './media';
import {buildPilotProject} from '../../../src/model/pilot';
import {randomUUID} from 'node:crypto';
import {mediaExistsFor} from './media';
import {diagnoseProject} from './diagnostics';
import {ProductionCoordinator} from './production';

export const projects = new ProjectRepository();
export const proposals = new ProposalRepository(projects);
export const production = new ProductionCoordinator(projects,proposals);
function failure(res: ServerResponse, error: unknown) {
  if (error instanceof ProjectError) { json(res,error.status,{error:error.message}); return; }
  if (error instanceof z.ZodError) {json(res,400,{error:'Projeto fora do esquema: '+error.issues[0]?.message});return;}
  json(res,500,{error:error instanceof Error?error.message:'Erro de projetos'});
}
export async function handleProjects(req: IncomingMessage,res: ServerResponse,url: URL): Promise<boolean> {
  if (url.pathname==='/v1/projects' && req.method==='GET') {
    try {
      const [listed,invalidProjects]=await Promise.all([projects.list(),projects.inspectInvalid()]);
      const enriched=await Promise.all(listed.map(async project=>({
        ...project,pendingProposals:await proposals.count(project.id).catch(()=>0),
      })));
      json(res,200,{projects:enriched,invalidProjects,directory:projects.root});
    }
    catch(e){failure(res,e);}
    return true;
  }
  if (url.pathname==='/v1/projects' && req.method==='POST') {
    try {
      const parsed=z.object({name:z.string().trim().min(1).max(120)}).strict().parse(await readJson(req,2000));
      json(res,201,await projects.create(parsed.name));
    } catch(e){failure(res,e);}
    return true;
  }
  if(url.pathname==='/v1/projects/pilot'&&req.method==='POST'){
    try{
      // Não cria um projeto silencioso: voz precisa funcionar antes de registrar o piloto.
      const voice=await synthesizePilotVoice();
      const asset=await importGeneratedWave(voice.wav);
      const draft=buildPilotProject({newId:randomUUID,voiceAsset:asset,speechFrames:voice.speechFrames});
      json(res,201,await projects.adopt(draft));
    }catch(e){failure(res,e);}
    return true;
  }
  if (url.pathname==='/v1/projects/import' && req.method==='POST') {
    try {const parsed=z.object({project:z.unknown()}).strict().parse(await readJson(req,2_000_000));json(res,201,await projects.import(parsed.project));}
    catch(e){failure(res,e);}
    return true;
  }
  const productionGet=/^\/v1\/projects\/([0-9a-f-]{36})\/production$/.exec(url.pathname);
  if(productionGet && req.method==='GET'){
    try{
      const state=await production.assess(productionGet[1]);
      json(res,200,{state,checkpoint:await production.readCheckpoint(productionGet[1])});
    }catch(e){failure(res,e);}
    return true;
  }
  const productionAction=/^\/v1\/projects\/([0-9a-f-]{36})\/production\/(continue|checkpoint)$/.exec(url.pathname);
  if(productionAction && req.method==='POST'){
    try{
      const state=productionAction[2]==='continue'?
        await production.continue(productionAction[1]):
        await production.checkpoint(productionAction[1]);
      json(res,200,{state});
    }catch(e){failure(res,e);}
    return true;
  }
  const diagnostics=/^\/v1\/projects\/([0-9a-f-]{36})\/diagnostics$/.exec(url.pathname);
  if(diagnostics && req.method==='GET'){
    try{
      const project=(await projects.read(diagnostics[1])).project;
      json(res,200,await diagnoseProject(project,mediaExistsFor));
    }catch(e){failure(res,e);}
    return true;
  }
  const proposalList=/^\/v1\/projects\/([0-9a-f-]{36})\/proposals$/.exec(url.pathname);
  if(proposalList){
    try{
      if(req.method==='GET'){json(res,200,{proposals:await proposals.list(proposalList[1])});return true;}
      if(req.method==='POST'){
        const payload=z.object({operations:z.unknown()}).strict().parse(await readJson(req,512000));
        json(res,201,await proposals.create(proposalList[1],payload.operations,String(req.headers['if-match']||'')));return true;
      }
    }catch(e){failure(res,e);return true;}
  }
  const proposalAction=/^\/v1\/projects\/([0-9a-f-]{36})\/proposals\/([0-9a-f-]{36})\/(accept|reject)$/.exec(url.pathname);
  if(proposalAction && req.method==='POST'){
    try{
      if(proposalAction[3]==='accept')json(res,200,await proposals.accept(proposalAction[1],proposalAction[2]));
      else {await proposals.reject(proposalAction[1],proposalAction[2]);json(res,200,{rejected:true});}
    }catch(e){failure(res,e);}
    return true;
  }
  const history=/^\/v1\/projects\/([0-9a-f-]{36})\/history$/.exec(url.pathname);
  if(history && req.method==='GET') {
    try{json(res,200,{snapshots:await projects.history(history[1])});}
    catch(e){failure(res,e);}
    return true;
  }
  const restore=/^\/v1\/projects\/([0-9a-f-]{36})\/restore$/.exec(url.pathname);
  if(restore && req.method==='POST'){
    try{
      const input=z.object({revision:z.string().regex(/^[0-9a-f]{64}$/)}).strict().parse(await readJson(req,2000));
      json(res,200,await projects.restore(restore[1],input.revision,String(req.headers['if-match']||'')));
    }catch(e){failure(res,e);}
    return true;
  }
  const duplicate=/^\/v1\/projects\/([0-9a-f-]{36})\/duplicate$/.exec(url.pathname);
  if (duplicate && req.method==='POST') {
    try {json(res,201,await projects.duplicate(duplicate[1]));}
    catch(e){failure(res,e);}
    return true;
  }
  const match=/^\/v1\/projects\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (!match) return false;
  const id=match[1];
  try {
    if (req.method==='GET') {json(res,200,await projects.read(id));return true;}
    if (req.method==='PUT') {
      const parsed=z.object({project:z.unknown()}).strict().parse(await readJson(req,2_000_000));
      json(res,200,await projects.save(id,parsed.project,String(req.headers['if-match']||'')));
      return true;
    }
    if (req.method==='DELETE') {await projects.archive(id);json(res,200,{archived:true});return true;}
  } catch(e){failure(res,e);return true;}
  return false;
}
