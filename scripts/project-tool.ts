/**
 * Interface LOCAL de automação para Codex no ChatGPT Desktop (modo Local).
 * Nenhuma operação acessa GitHub ou envia projetos à nuvem.
 *
 * npm run project -- path
 * npm run project -- list
 * npm run project -- info <id>
 * npm run project -- show <id>
 * npm run project -- create "Título"
 * npm run project -- import <projeto.json>
 * npm run project -- apply <id> <operacoes.json> [revisao]
 * npm run project -- replace <id> <projeto.json> <revisao>
 * npm run project -- render <id>
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ProjectRepository} from '../apps/agent/src/project-store';
import {applyOperations} from '../src/model/operations';
import {parseProject} from '../src/model/project';

const repository=new ProjectRepository();
const [command,...args]=process.argv.slice(2);
const api='http://127.0.0.1:4317';

function requireArgument(value:string|undefined,label:string):string {
  if (!value)throw new Error('Parâmetro obrigatório: '+label);
  return value;
}
async function readLocalJson(file:string):Promise<unknown> {
  const data=await readFile(resolve(file),'utf8');
  return JSON.parse(data) as unknown;
}
async function renderProject(id:string) {
  const {project}=await repository.read(id);
  let response:Response;
  try{
    response=await fetch(api+'/v1/export',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});
  }catch{
    throw new Error('O serviço de renderização local não está aberto. Execute npm run dev:service em outro terminal.');
  }
  const job=await response.json() as {id?:string,error?:string};
  if(!response.ok||!job.id)throw new Error(job.error||'Falha ao iniciar o render.');
  console.log('Render local iniciado: '+job.id);
  while(true){
    await new Promise(resolve=>setTimeout(resolve,1500));
    const check=await fetch(api+'/v1/export/'+job.id);
    if(!check.ok)throw new Error('Não foi possível consultar o andamento do render.');
    const status=await check.json() as {state:string,progress?:number,outputPath?:string,error?:string};
    if(status.state==='completed'){
      console.log('MP4 salvo em: '+status.outputPath);
      return;
    }
    if(status.state==='failed')throw new Error(status.error||'Falha no render MP4.');
    if(status.state==='rendering')console.log('Renderizando '+Math.round((status.progress||0)*100)+'%');
  }
}
async function main() {
  switch(command){
    case 'path': {
      console.log(repository.root);
      return;
    }
    case 'list': {
      console.log('Projetos no Windows: '+repository.root);
      for(const p of await repository.list()){
        console.log(p.id+' | '+p.name+' | '+p.sceneCount+' cenas');
      }
      return;
    }
    case 'create': {
      const name=args.join(' ').trim();
      if(!name)throw new Error('Informe um nome para o documentário.');
      const created=await repository.create(name);
      console.log('Criado: '+created.path);
      console.log('ID: '+created.project.id);
      return;
    }
    case 'info': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log('ID: '+record.project.id);
      console.log('Nome: '+record.project.name);
      console.log('Arquivo: '+record.path);
      console.log('Revisão: '+record.revision);
      console.log('Cenas: '+record.project.scenes.length);
      return;
    }
    case 'show': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log(JSON.stringify(record.project,null,2));
      console.error('Revisão: '+record.revision);
      return;
    }
    case 'validate': {
      const record=await repository.read(requireArgument(args[0],'UUID do projeto'));
      console.log('Projeto válido: '+record.project.name+' ('+record.project.scenes.length+' cenas)');
      return;
    }
    case 'import': {
      const input=await readLocalJson(requireArgument(args[0],'caminho do JSON'));
      const created=await repository.import(input);
      console.log('Projeto importado localmente: '+created.path);
      console.log('ID: '+created.project.id);
      return;
    }
    case 'apply': {
      const id=requireArgument(args[0],'UUID do projeto');
      const file=requireArgument(args[1],'operações JSON');
      const current=await repository.read(id);
      const expected=args[2];
      if(expected&&current.revision!==expected)throw new Error('Conflito: a revisão mudou antes de aplicar. Leia o projeto novamente.');
      const operations=await readLocalJson(file);
      const next=applyOperations(current.project,operations);
      const saved=await repository.save(id,next,current.revision);
      console.log('Edição aplicada (backup local): '+saved.path);
      console.log('Nova revisão: '+saved.revision);
      return;
    }
    case 'replace': {
      const id=requireArgument(args[0],'UUID do projeto');
      const file=requireArgument(args[1],'projeto JSON');
      const expected=requireArgument(args[2],'revisão obtida com info');
      const project=parseProject(await readLocalJson(file));
      const updated=await repository.save(id,project,expected);
      console.log('Projeto atualizado (com backup local): '+updated.path);
      console.log('Nova revisão: '+updated.revision);
      return;
    }
    case 'render': {
      await renderProject(requireArgument(args[0],'UUID do projeto'));
      return;
    }
    default:
      throw new Error('Comandos locais: path | list | create "Título" | info <id> | show <id> | validate <id> | import <json> | apply <id> <ops.json> [revisao] | replace <id> <json> <revisao> | render <id>');
  }
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
