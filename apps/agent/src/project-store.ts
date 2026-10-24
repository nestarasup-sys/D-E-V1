/**
 * Projetos Dark Studio em disco. Arquivos editáveis externamente (Codex local).
 * Não faz sincronização automática com GitHub/ChatGPT.
 */
import {createHash, randomUUID} from 'node:crypto';
import {copyFile, mkdir, readFile, readdir, rename, stat, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {homedir} from 'node:os';
import {listHistory,readSnapshot,snapshotBeforeSave,type Snapshot} from './history';
import {parseProject, projectSchema, starterProject, type Project} from '../../../src/model/project';

export const DEFAULT_PROJECTS_ROOT = process.env.DARK_STUDIO_PROJECTS_DIR
  ? resolve(process.env.DARK_STUDIO_PROJECTS_DIR)
  : join(homedir(), 'DarkStudio', 'projects');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ProjectError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export interface ProjectRecord {
  project: Project;
  revision: string;
  path: string;
  modifiedAt: string;
}
export interface ProjectSummary {
  id: string;
  name: string;
  durationFrames: number;
  sceneCount: number;
  assetCount: number;
  modifiedAt: string;
  revision: string;
}
export class ProjectRepository {
  private readonly updating = new Set<string>();
  constructor(public readonly root = DEFAULT_PROJECTS_ROOT) {}

  private file(id: string) {
    if (!UUID.test(id)) throw new ProjectError('ID de projeto inválido.', 400);
    return join(this.root, id, 'project.json');
  }
  private async writeNew(project: Project) {
    const file = this.file(project.id);
    await mkdir(join(this.root, project.id), {recursive: false});
    await writeFile(file, JSON.stringify(project, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
    return this.read(project.id);
  }
  async create(name: string): Promise<ProjectRecord> {
    const title = name.trim();
    if (title.length < 1 || title.length > 120) throw new ProjectError('Nome entre 1 e 120 caracteres.', 400);
    await mkdir(this.root, {recursive: true});
    const project = projectSchema.parse({
      ...structuredClone(starterProject),
      id: randomUUID(),
      name: title,
      scenes: [{
        ...structuredClone(starterProject.scenes[0]),
        id: 'scene-' + randomUUID(),
        title: 'NOVO DOCUMENTÁRIO',
        subtitle: 'Prepare o roteiro e as evidências para começar.',
        kicker: 'DARK STUDIO',
      }],
      assets: [],
      clips: [],
    });
    return this.writeNew(project);
  }
  async import(input: unknown): Promise<ProjectRecord> {
    const candidate = parseProject(input);
    await mkdir(this.root, {recursive: true});
    const project = projectSchema.parse({...candidate, id:randomUUID()});
    return this.writeNew(project);
  }
  async adopt(input: unknown): Promise<ProjectRecord> {
    const project=projectSchema.parse(input);
    if(!UUID.test(project.id))throw new ProjectError('ID externo inválido.',400);
    await mkdir(this.root,{recursive:true});
    try{return await this.writeNew(project);}
    catch(e){
      if((e as NodeJS.ErrnoException).code==='EEXIST')throw new ProjectError('Projeto já existe no computador.',409);
      throw e;
    }
  }
  async read(id: string): Promise<ProjectRecord> {
    const file = this.file(id);
    try {
      const raw = await readFile(file, 'utf8');
      const project = parseProject(JSON.parse(raw));
      if (project.id !== id) throw new ProjectError('ID interno diverge da pasta do projeto.', 422);
      return {
        project, path: file,
        revision: createHash('sha256').update(raw).digest('hex'),
        modifiedAt: (await stat(file)).mtime.toISOString(),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ProjectError('Projeto não encontrado.', 404);
      if (error instanceof ProjectError) throw error;
      throw new ProjectError('Projeto inválido no disco: ' + (error instanceof Error ? error.message : String(error)), 422);
    }
  }
  /** Um único passe: lista os projetos válidos e expõe erros em vez de escondê-los. */
  async listDetailed():Promise<{
    projects:ProjectSummary[];
    invalidProjects:Array<{id:string;error:string}>;
  }>{
    await mkdir(this.root,{recursive:true});
    const entries=await readdir(this.root,{withFileTypes:true});
    const results=await Promise.all(entries.filter(e=>e.isDirectory()&&UUID.test(e.name)).map(async e=>{
      try{
        const record=await this.read(e.name);
        const summary:ProjectSummary={
          id:record.project.id,
          name:record.project.name,
          durationFrames:record.project.scenes.reduce((n,s)=>n+s.durationFrames,0),
          sceneCount:record.project.scenes.length,
          assetCount:record.project.assets.length,
          modifiedAt:record.modifiedAt,
          revision:record.revision,
        };
        return {summary,invalid:null};
      }catch(error){
        return {summary:null,invalid:{
          id:e.name,error:(error instanceof Error?error.message:String(error)).slice(0,320),
        }};
      }
    }));
    return {
      projects:results.map(x=>x.summary).filter((x):x is ProjectSummary=>x!==null)
        .sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt)),
      invalidProjects:results.map(x=>x.invalid).filter((x):x is {id:string;error:string}=>x!==null),
    };
  }
  async list():Promise<ProjectSummary[]>{
    return (await this.listDetailed()).projects;
  }
  async inspectInvalid():Promise<Array<{id:string;error:string}>>{
    return (await this.listDetailed()).invalidProjects;
  }
  async save(id: string, incoming: unknown, expectedRevision: string): Promise<ProjectRecord> {
    const file = this.file(id);
    if (!expectedRevision || !/^[0-9a-f]{64}$/.test(expectedRevision)) {
      throw new ProjectError('Revisão obrigatória para salvar.', 428);
    }
    if (this.updating.has(id)) throw new ProjectError('Projeto ocupado; tente novamente.', 409);
    const project = projectSchema.parse(incoming);
    if (project.id !== id) throw new ProjectError('Não é permitido trocar ID do projeto.', 400);
    this.updating.add(id);
    const temp = join(this.root,id,'.saving-' + randomUUID() + '.json');
    try {
      const current = await this.read(id);
      if (current.revision !== expectedRevision) throw new ProjectError('Conflito: o projeto mudou no disco. Recarregue antes de salvar.', 409);
      await writeFile(temp, JSON.stringify(project,null,2)+'\n', {encoding:'utf8',flag:'wx'});
      await snapshotBeforeSave(join(this.root,id),await readFile(file,'utf8'));
      await copyFile(file, join(this.root,id,'project.previous.json'));
      await rename(temp, file);
      return this.read(id);
    } finally {
      this.updating.delete(id);
      const {rm}=await import('node:fs/promises');
      await rm(temp,{force:true}).catch(()=>{});
    }
  }
  async history(id:string):Promise<Snapshot[]> {
    await this.read(id);
    return listHistory(join(this.root,id));
  }
  async restore(id:string,snapshotRevision:string,expectedRevision:string):Promise<ProjectRecord> {
    // save() cuida de garantir a revisão e de guardar também a versão atual.
    if(!/^[0-9a-f]{64}$/.test(expectedRevision))throw new ProjectError('Revisão atual obrigatória.',428);
    await this.read(id);
    let candidate:unknown;
    try{candidate=await readSnapshot(join(this.root,id),snapshotRevision);}
    catch(e){throw new ProjectError('Snapshot não encontrado ou inválido: '+(e instanceof Error?e.message:String(e)),400);}
    if(!candidate || (candidate as Project).id!==id)throw new ProjectError('ID do snapshot não corresponde ao projeto.',422);
    return this.save(id,candidate,expectedRevision);
  }
  async duplicate(id: string): Promise<ProjectRecord> {
    const record=await this.read(id);
    return this.import({...record.project,name:(record.project.name.slice(0,105)+' (cópia)')});
  }
  async archive(id: string): Promise<void> {
    this.file(id);
    if (this.updating.has(id)) throw new ProjectError('Projeto ocupado.',409);
    await this.read(id);
    await mkdir(join(this.root,'_archived'),{recursive:true});
    await rename(join(this.root,id),join(this.root,'_archived',id+'-'+Date.now()));
  }
}
