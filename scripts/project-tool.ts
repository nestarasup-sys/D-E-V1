/**
 * Ferramenta de troca de arquivos com Codex EXTERNO.
 * Exemplos: npm run project -- list
 *           npm run project -- create "Meu documentário"
 *           npm run project -- apply <id> propostas.json
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {ProjectRepository} from '../apps/agent/src/project-store';
import {applyOperations} from '../src/model/operations';

const repo=new ProjectRepository();
const [command,...args]=process.argv.slice(2);
async function run(){
  if(command==='list'){
    const all=await repo.list();
    console.log('Pasta: '+repo.root);
    for(const p of all)console.log(p.id+'  | '+p.name+' | '+p.sceneCount+' cenas');
    return;
  }
  if(command==='create'){
    const name=args.join(' ').trim();
    if(!name)throw new Error('Informe o nome do documentário.');
    const project=await repo.create(name);
    console.log('Projeto criado: '+project.path);
    return;
  }
  if(command==='show'){
    const project=await repo.read(args[0]||'');
    console.log(JSON.stringify(project.project,null,2));
    console.error('Arquivo: '+project.path);
    return;
  }
  if(command==='validate'){
    const project=await repo.read(args[0]||'');
    console.log('Projeto válido: '+project.project.name+' ('+project.project.scenes.length+' cenas)');
    return;
  }
  if(command==='apply'){
    const id=args[0],file=args[1];
    if(!id||!file)throw new Error('Uso: npm run project -- apply <UUID> <arquivo-de-operações.json>');
    const project=await repo.read(id);
    const ops=JSON.parse(await readFile(resolve(file),'utf8')) as unknown;
    const next=applyOperations(project.project,ops);
    const saved=await repo.save(id,next,project.revision);
    console.log('Edição aplicada com backup em '+saved.path);
    return;
  }
  if(command==='import'){
    const file=args[0];
    if(!file)throw new Error('Uso: npm run project -- import <projeto.json>');
    const raw=JSON.parse(await readFile(resolve(file),'utf8')) as unknown;
    const imported=await repo.import(raw);
    console.log('Projeto importado: '+imported.path);
    return;
  }
  throw new Error('Comandos: list, create "Título", show <id>, validate <id>, apply <id> <ops.json>, import <projeto.json>');
}
run().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
