import type {IncomingMessage, ServerResponse} from 'node:http';
import {z} from 'zod';
import {ProjectError, ProjectRepository} from './project-store';
import {json,readJson} from './http';

export const projects = new ProjectRepository();
function failure(res: ServerResponse, error: unknown) {
  if (error instanceof ProjectError) { json(res,error.status,{error:error.message}); return; }
  if (error instanceof z.ZodError) {json(res,400,{error:'Projeto fora do esquema: '+error.issues[0]?.message});return;}
  json(res,500,{error:error instanceof Error?error.message:'Erro de projetos'});
}
export async function handleProjects(req: IncomingMessage,res: ServerResponse,url: URL): Promise<boolean> {
  if (url.pathname==='/v1/projects' && req.method==='GET') {
    try {json(res,200,{projects:await projects.list(),directory:projects.root});}
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
  if (url.pathname==='/v1/projects/import' && req.method==='POST') {
    try {const parsed=z.object({project:z.unknown()}).strict().parse(await readJson(req,2_000_000));json(res,201,await projects.import(parsed.project));}
    catch(e){failure(res,e);}
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
