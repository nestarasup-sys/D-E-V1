import {createServer} from 'node:http';
import {handleMedia} from './media';
import {handleExport} from './export';
import {handleProjects} from './projects';
import {json} from './http';
import {runtimeDiagnostics} from './diagnostics';
import {DEFAULT_PROJECTS_ROOT} from './project-store';
import {SERVICE_PROTOCOL,SERVICE_VERSION,SERVICE_BUILD,PROJECT_SCHEMA_VERSION,REQUIRED_CAPABILITIES} from '../../../src/model/service-contract';
import {resolve} from 'node:path';

const HOST='127.0.0.1';
const PORT=4317;
const startedAt=new Date().toISOString();
const origins=new Set([
  'http://127.0.0.1:1420',
  'http://localhost:1420',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]);

const server=createServer(async(req,res)=>{
  if(req.headers.host && !/^(127\.0\.0\.1|localhost):4317$/.test(req.headers.host)){
    json(res,403,{error:'Host não permitido'});return;
  }
  const origin=req.headers.origin;
  if(origin && !origins.has(origin)){json(res,403,{error:'Origem não autorizada'});return;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type,X-File-Name,If-Match'});
    res.end();
    return;
  }
  if(req.method==='GET' && (req.url==='/health'||req.url==='/v1/health')){
    json(res,200,{
      status:'ready',service:'dark-studio-local',apiProtocol:SERVICE_PROTOCOL,
      appVersion:SERVICE_VERSION,build:SERVICE_BUILD,
      projectSchemaVersion:PROJECT_SCHEMA_VERSION,capabilities:[...REQUIRED_CAPABILITIES],
      pid:process.pid,startedAt,workspace:resolve(process.cwd()),
      projectsDirectory:DEFAULT_PROJECTS_ROOT,
    });
    return;
  }
  try{
    const url=new URL(req.url||'/', 'http://127.0.0.1:4317');
    if(req.method==='GET'&&url.pathname==='/v1/diagnostics'){json(res,200,runtimeDiagnostics());return;}
    if(await handleProjects(req,res,url))return;
    if(await handleMedia(req,res,url))return;
    if(await handleExport(req,res,url))return;
    json(res,404,{error:'Rota não encontrada'});
  }catch(e){
    json(res,500,{error:e instanceof Error?e.message:'Erro do serviço local'});
  }
});
server.listen(PORT,HOST,()=>console.log(
  'Dark Studio Local Service: http://'+HOST+':'+PORT+
  '\nProjetos em disco, sem Codex incorporado. Execute o Codex separadamente.'
));
