/**
 * Transporte GitHub PRIVADO via GitHub CLI (gh auth login).
 * Nunca recebe/guarda tokens no Dark Studio e nunca acessa repositórios públicos.
 */
import {spawn} from 'node:child_process';
import {projectSchema, type Project} from '../../../src/model/project';
import type {PrivateRemote,RemoteProject,RemoteEntry} from './sync-core';

export const GITHUB_REPO_RE=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37})\/[A-Za-z0-9_.-]{1,100}$/;
const PROJECT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class GitHubTransportError extends Error {
  constructor(message:string,public readonly status:number|null=null) {super(message);}
}
type GhJson=Record<string,unknown>|unknown[];
async function gh(args:string[],input?:string):Promise<GhJson> {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.platform==='win32'?'gh.exe':'gh', ['api','-H','Accept: application/vnd.github+json',...args],
      {windowsHide:true,stdio:['pipe','pipe','pipe'],shell:false});
    let stdout='',stderr='';
    let timedOut=false,overflow=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill();},30000);
    child.on('error',error=>{
      clearTimeout(timer);
      reject(new GitHubTransportError('GitHub CLI indisponível: instale "gh" e execute "gh auth login". '+error.message));
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data',(chunk:string)=>{
      stdout+=chunk;
      if(stdout.length>6_000_000){overflow=true;child.kill();}
    });
    child.stderr.on('data',(chunk:string)=>{
      stderr+=chunk;
      if(stderr.length>4000)stderr=stderr.slice(-4000);
    });
    child.on('close',code=>{
      clearTimeout(timer);
      if(timedOut){reject(new GitHubTransportError('GitHub demorou demais (30 segundos).'));return;}
      if(overflow){reject(new GitHubTransportError('Resposta GitHub acima do limite.'));return;}
      if(code!==0){
        const statusMatch=/HTTP\s+(401|403|404|409|422)/i.exec(stderr);
        const status=statusMatch?Number(statusMatch[1]):null;
        reject(new GitHubTransportError(status===404?'Recurso privado não encontrado ou sem permissão.':
          status===401||status===403?'Sem acesso ao repositório privado. Confira gh auth login e permissões.':
          status===409||status===422?'O arquivo remoto mudou. Sincronização cancelada para evitar sobrescrita.':
          'Falha no GitHub CLI. Verifique conexão, gh auth status e acesso ao repositório.',status));
        return;
      }
      try{resolve(JSON.parse(stdout) as GhJson);}
      catch{reject(new GitHubTransportError('Resposta inválida da API GitHub.'));}
    });
    child.stdin.on('error',()=>{ /* processo já encerrou */ });
    child.stdin.end(input);
  });
}
function asObject(input:GhJson):Record<string,unknown> {
  if(!input||Array.isArray(input)||typeof input!=='object')throw new GitHubTransportError('Resposta GitHub malformada.');
  return input;
}
export class GitHubPrivateRemote implements PrivateRemote {
  constructor(readonly repository:string) {
    if(!GITHUB_REPO_RE.test(repository)||repository.includes('..'))throw new GitHubTransportError('Formato de repositório inválido: usuário/repositorio.');
  }
  private route(path:string){return 'repos/'+this.repository+'/'+path;}
  async verifyPrivate():Promise<void>{
    const metadata=asObject(await gh([this.route('') .replace(/\/$/,'')]));
    if(metadata.private!==true)throw new GitHubTransportError(
      'RECUSADO: repositório público. Crie um repositório PRIVADO separado para os roteiros.');
    if(metadata.archived===true||metadata.disabled===true)throw new GitHubTransportError('Repositório indisponível para edição.');
    if(metadata.default_branch!=='main')throw new GitHubTransportError('O repositório privado precisa ter a branch principal "main".');
    if(metadata.permissions && typeof metadata.permissions==='object' && (metadata.permissions as Record<string,unknown>).push!==true){
      throw new GitHubTransportError('A conta GitHub não tem permissão para publicar no repositório privado.');
    }
  }
  async list():Promise<RemoteEntry[]>{
    let result:GhJson;
    try{result=await gh([this.route('contents/projects?ref=main')]);}
    catch(e){if(e instanceof GitHubTransportError&&e.status===404)return [];throw e;}
    if(!Array.isArray(result))throw new GitHubTransportError('A pasta remota projects deve ser um diretório.');
    if(result.length>200)throw new GitHubTransportError('Mais de 200 itens no diretório de projetos. Reduza antes de continuar.');
    const entries:RemoteEntry[]=[];
    for(const item of result){
      if(typeof item!=='object'||!item)continue;
      const entry=item as Record<string,unknown>;
      if(entry.type!=='file'||typeof entry.name!=='string'||typeof entry.sha!=='string')continue;
      if(!entry.name.endsWith('.json'))continue;
      const id=entry.name.slice(0,-5);
      if(!PROJECT_ID.test(id))continue;
      entries.push({id,sha:entry.sha});
    }
    return entries;
  }
  async read(id:string):Promise<RemoteProject>{
    if(!PROJECT_ID.test(id))throw new GitHubTransportError('ID remoto inválido.');
    const item=asObject(await gh([this.route('contents/projects/'+id+'.json?ref=main')]));
    if(item.encoding!=='base64'||typeof item.content!=='string'||typeof item.sha!=='string'){
      throw new GitHubTransportError('Projeto remoto não é JSON base64 compatível.');
    }
    const bytes=Buffer.from(item.content.replace(/\s+/g,''),'base64');
    if(bytes.length>900_000)throw new GitHubTransportError('Projeto remoto excede 900 KB; não é seguro sincronizar via Contents API.');
    const project=projectSchema.parse(JSON.parse(bytes.toString('utf8')) as unknown);
    if(project.id!==id)throw new GitHubTransportError('ID do JSON não corresponde ao nome do arquivo remoto.');
    return {project,sha:item.sha};
  }
  async write(project:Project,sha:string|null):Promise<string>{
    const valid=projectSchema.parse(project);
    if(!PROJECT_ID.test(valid.id))throw new GitHubTransportError('ID local inválido para GitHub.');
    const bytes=Buffer.from(JSON.stringify(valid,null,2)+'\n','utf8');
    if(bytes.length>900_000)throw new GitHubTransportError('Projeto acima de 900 KB: sincronização interrompida.');
    const payload:Record<string,unknown>={
      message:'sync: Dark Studio '+valid.id.slice(0,8),branch:'main',content:bytes.toString('base64'),
    };
    if(sha)payload.sha=sha;
    const response=asObject(await gh(['--method','PUT',this.route('contents/projects/'+valid.id+'.json'),'--input','-'],JSON.stringify(payload)));
    const content=response.content;
    if(!content||typeof content!=='object'||typeof (content as Record<string,unknown>).sha!=='string')
      throw new GitHubTransportError('GitHub não confirmou o SHA do arquivo publicado.');
    return String((content as Record<string,unknown>).sha);
  }
}
