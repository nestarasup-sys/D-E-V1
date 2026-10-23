import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,rename,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {z} from 'zod';
import {DATA_ROOT} from './media';
import {projects} from './projects';
import {json,readJson} from './http';
import {GitHubPrivateRemote,GITHUB_REPO_RE} from './sync-github';
import {syncProjects,type SyncState,type SyncResult,type SyncConflict} from './sync-core';

const CONFIG_FILE=join(DATA_ROOT,'private-sync.json');
const configSchema=z.object({
  enabled:z.boolean(),
  repository:z.string().refine(s=>s===''||(GITHUB_REPO_RE.test(s)&&!s.includes('..')),'Repositório no formato usuario/repositorio'),
  sharedProjectIds:z.array(z.string().uuid()).max(200).default([]),
}).strict();
type Config=z.infer<typeof configSchema>;
function errorText(error:unknown){return error instanceof Error?error.message:String(error);}
async function atomicJson(path:string,value:unknown){
  const tmp=path+'.'+randomUUID()+'.tmp';
  try{await writeFile(tmp,JSON.stringify(value,null,2)+'\n',{encoding:'utf8',flag:'wx'});await rename(tmp,path);}
  finally{await rm(tmp,{force:true}).catch(()=>{});}
}
export class PrivateSyncManager {
  private config:Config={enabled:false,repository:'',sharedProjectIds:[]};
  private inFlight=false;
  private lastRun:string|null=null;
  private lastError:string|null=null;
  private lastResult:SyncResult|null=null;
  private conflicts:SyncConflict[]=[];
  private timer:ReturnType<typeof setInterval>|null=null;
  constructor(private readonly root=DATA_ROOT){}

  private stateFile(repository:string){
    return join(this.root,'sync-state-'+createHash('sha256').update(repository).digest('hex').slice(0,16)+'.json');
  }
  async start(){
    await mkdir(this.root,{recursive:true});
    try{this.config=configSchema.parse(JSON.parse(await readFile(CONFIG_FILE,'utf8')));}
    catch{this.config={enabled:false,repository:'',sharedProjectIds:[]};}
    if(!this.timer){
      this.timer=setInterval(()=>{if(this.config.enabled&&!this.inFlight)void this.run().catch(()=>{});},45_000);
      this.timer.unref?.();
    }
    if(this.config.enabled)void this.run().catch(()=>{});
  }
  status(){
    return {enabled:this.config.enabled,repository:this.config.repository,busy:this.inFlight,
      lastRun:this.lastRun,lastError:this.lastError,lastResult:this.lastResult,conflicts:this.conflicts};
  }
  async configure(input:unknown){
    const parsed=configSchema.parse(input);
    if(this.inFlight)throw new Error('Sincronização em andamento. Não altere configuração durante uma transferência.');
    if(parsed.enabled){
      if(!parsed.repository)throw new Error('Informe o repositório GitHub PRIVADO.');
      await new GitHubPrivateRemote(parsed.repository).verifyPrivate();
    }
    await mkdir(this.root,{recursive:true});
    await atomicJson(CONFIG_FILE,parsed);
    this.config=parsed;this.lastError=null;this.lastResult=null;this.conflicts=[];
    return this.status();
  }
  async share(projectId:string,shared:boolean){
    if(this.inFlight)throw new Error('Sincronização em andamento.');
    if(!this.config.enabled)throw new Error('Configure o repositório privado antes de compartilhar projetos.');
    await projects.read(projectId);
    const ids=new Set(this.config.sharedProjectIds);
    if(shared)ids.add(projectId);else ids.delete(projectId);
    const next={...this.config,sharedProjectIds:[...ids]};
    await atomicJson(CONFIG_FILE,next);
    this.config=next;
    return this.status();
  }
  async run(){
    if(!this.config.enabled)throw new Error('Sincronização está desligada. Conecte um repositório privado.');
    if(this.inFlight)throw new Error('Sincronização já em andamento.');
    this.inFlight=true;
    this.lastError=null;
    try{
      const remote=new GitHubPrivateRemote(this.config.repository);
      const path=this.stateFile(this.config.repository);
      let state:SyncState={repository:this.config.repository,entries:{}};
      try{
        const data=JSON.parse(await readFile(path,'utf8')) as SyncState;
        if(data.repository===this.config.repository && data.entries && typeof data.entries==='object')state=data;
      }catch{/* primeiro uso */}
      const outcome=await syncProjects(projects,remote,state,async s=>atomicJson(path,s),new Set(this.config.sharedProjectIds));
      if(outcome.downloadedIds.length){
        const shared=[...new Set([...this.config.sharedProjectIds,...outcome.downloadedIds])];
        const next={...this.config,sharedProjectIds:shared};
        await atomicJson(CONFIG_FILE,next);
        this.config=next;
      }
      this.lastResult=outcome;
      this.conflicts=outcome.conflicts;
      this.lastRun=new Date().toISOString();
      return this.status();
    }catch(e){
      this.lastError=errorText(e);
      this.lastRun=new Date().toISOString();
      throw e;
    }finally{this.inFlight=false;}
  }
}
export const syncManager=new PrivateSyncManager();

function failure(res:ServerResponse,e:unknown){
  json(res,e instanceof z.ZodError?400: /já em andamento|em andamento/.test(errorText(e))?409:400,
    {error:e instanceof z.ZodError?'Configuração inválida: '+e.issues[0]?.message:errorText(e)});
}
function authorized(req:IncomingMessage){
  return req.headers['x-dark-studio-client']==='desktop' && !!req.headers.origin;
}
export async function handleSync(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname==='/v1/sync/status' && req.method==='GET'){
    json(res,200,syncManager.status());return true;
  }
  if(url.pathname==='/v1/sync/config'&&req.method==='POST'){
    if(!authorized(req)){json(res,403,{error:'Configuração permitida somente pela interface Dark Studio.'});return true;}
    if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'Envie JSON.'});return true;}
    try{json(res,200,await syncManager.configure(await readJson(req,2000)));}
    catch(e){failure(res,e);}
    return true;
  }
  if(url.pathname==='/v1/sync/share'&&req.method==='POST'){
    if(!authorized(req)){json(res,403,{error:'Somente o Dark Studio pode compartilhar projetos.'});return true;}
    if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'Envie JSON.'});return true;}
    try{
      const args=z.object({projectId:z.string().uuid(),shared:z.boolean()}).strict().parse(await readJson(req,2000));
      json(res,200,await syncManager.share(args.projectId,args.shared));
    }catch(e){failure(res,e);}
    return true;
  }
  if(url.pathname==='/v1/sync/run'&&req.method==='POST'){
    if(!authorized(req)){json(res,403,{error:'Sincronização permitida somente pela interface Dark Studio.'});return true;}
    try{json(res,200,await syncManager.run());}catch(e){failure(res,e);}
    return true;
  }
  return false;
}
