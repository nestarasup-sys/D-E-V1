import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { Codex } from '@openai/codex-sdk';
import { z } from 'zod';
import { projectSchema, sceneSchema } from '../../../src/model/project';

const HOST = '127.0.0.1';
const PORT = 4317;
const origins = new Set(['http://127.0.0.1:1420','http://localhost:1420','tauri://localhost','http://tauri.localhost','https://tauri.localhost']);
const inputSchema = z.object({
  instruction: z.string().trim().min(3).max(1200),
  selectedSceneId: z.string(),
  project: projectSchema,
}).strict();
const aiResultSchema = z.object({
  summary: z.string().min(1).max(1000),
  sceneId: z.string(),
  changes: sceneSchema.omit({id:true,imageUrl:true}).strict(),
}).strict();
const outputSchema = {
  type:'object', additionalProperties:false,
  properties:{
    summary:{type:'string'},sceneId:{type:'string'},
    changes:{type:'object',additionalProperties:false,properties:{
      kind:{type:'string',enum:['title','stat','quote']},title:{type:'string'},subtitle:{type:'string'},kicker:{type:'string'},
      durationFrames:{type:'integer',minimum:15,maximum:1800},accentColor:{type:'string'},backgroundColor:{type:'string'},
    },required:['kind','title','subtitle','kicker','durationFrames','accentColor','backgroundColor']},
  },required:['summary','sceneId','changes'],
} as const;
const codex = new Codex();
let busy = false;
function json(res:ServerResponse,status:number,data:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function readJson(req:IncomingMessage):Promise<unknown>{
  let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>180_000)throw new Error('O projeto ultrapassa o limite de 180 KB por requisição.');}
  return JSON.parse(body);
}
const server=createServer(async(req,res)=>{
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)){json(res,403,{error:'Origem não autorizada.'});return;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS') {res.writeHead(204,{'Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
  if(req.method==='GET' && req.url==='/health'){json(res,200,{status:'ready',mode:'external-codex'});return;}
  if(req.method!=='POST'||req.url!=='/v1/propose'){json(res,404,{error:'Rota não encontrada.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'Envie JSON.'});return;}
  if(busy){json(res,429,{error:'O agente já está processando um pedido.'});return;}
  try{
    const input=inputSchema.parse(await readJson(req));
    const selected=input.project.scenes.find(s=>s.id===input.selectedSceneId);
    if(!selected){json(res,400,{error:'Cena não encontrada.'});return;}
    busy=true;
    try{
      const thread=codex.startThread({workingDirectory:tmpdir(),skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled'});
      const prompt = [
        'Você é um assistente de edição de documentários. Produza APENAS um objeto JSON conforme o esquema de saída.',
        'Você NÃO pode editar arquivos, navegar na web, solicitar credenciais, criar fontes nem inventar dados.',
        'Edite APENAS a cena indicada. Preserve os fatos fornecidos pelo usuário. Se a instrução implicar dados não fornecidos, mantenha a informação e explique na summary.',
        'Retorne TODAS as propriedades de changes; as cores devem ser hexadecimais #RRGGBB; duração em frames a 30 FPS entre 15 e 1800.',
        `ID da cena: ${selected.id}`,
        `Cena original: ${JSON.stringify(selected)}`,
        `Pedido: ${input.instruction}`,
      ].join('\n\n');
      const turn=await thread.run(prompt,{outputSchema});
      if(!turn.finalResponse)throw new Error('O Codex não retornou uma proposta.');
      const result=aiResultSchema.parse(JSON.parse(turn.finalResponse));
      if(result.sceneId!==selected.id)throw new Error('O Codex selecionou outra cena.');
      json(res,200,result);
    }finally{busy=false;}
  }catch(e){console.error('Erro ao propor edição:',e);json(res,e instanceof z.ZodError?400:500,{error:e instanceof z.ZodError?'Dados inválidos: '+e.issues[0]?.message:e instanceof Error?e.message:'Falha ao executar Codex.'});}
});
server.listen(PORT,HOST,()=>console.log(`Dark Studio Agent disponível em http://${HOST}:${PORT}\nAutentique o Codex antes de solicitar propostas.`));
