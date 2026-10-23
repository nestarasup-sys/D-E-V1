import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,rename,stat,unlink,writeFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {json} from './http';

export const DATA_ROOT=join(homedir(),'DarkStudio');
const MEDIA_DIR=join(DATA_ROOT,'media');
const INDEX=join(DATA_ROOT,'media-index.json');
const MAX_FILE=512*1024*1024;
const allowed:Record<string,{mime:string,kind:'image'|'video'|'audio'}>={
  '.png':{mime:'image/png',kind:'image'},'.jpg':{mime:'image/jpeg',kind:'image'},'.jpeg':{mime:'image/jpeg',kind:'image'},'.webp':{mime:'image/webp',kind:'image'},
  '.mp4':{mime:'video/mp4',kind:'video'},'.webm':{mime:'video/webm',kind:'video'},'.mov':{mime:'video/quicktime',kind:'video'},
  '.mp3':{mime:'audio/mpeg',kind:'audio'},'.wav':{mime:'audio/wav',kind:'audio'},'.m4a':{mime:'audio/mp4',kind:'audio'},'.ogg':{mime:'audio/ogg',kind:'audio'},
};
type Stored={id:string,name:string,kind:'image'|'video'|'audio',mime:string,ext:string,bytes:number,url:string};
let mediaIndex:Record<string,Stored>|null=null;
async function index(){if(mediaIndex)return mediaIndex;await mkdir(MEDIA_DIR,{recursive:true});try{mediaIndex=JSON.parse(await readFile(INDEX,'utf8')) as Record<string,Stored>;}catch{mediaIndex={};}return mediaIndex;}
async function persist(){const tmp=INDEX+'.tmp';await writeFile(tmp,JSON.stringify(mediaIndex,null,2),'utf8');await rename(tmp,INDEX);}
function nameFromHeader(v:string|undefined){if(!v)return null;try{return decodeURIComponent(v);}catch{return null;}}
/** Mídia sintetizada LOCALMENTE pelo Dark Studio; a voz não é publicada em GitHub. */
export async function importGeneratedWave(wav:Buffer):Promise<{id:string,name:string,kind:'audio',mime:string,url:string,durationFrames:number}>{
  if(wav.length<44||wav.length>30*1024*1024)throw new Error('WAV sintetizado inválido.');
  const id=randomUUID(),name='piloto-narracao-local.wav';
  const entry:Stored={id,name,kind:'audio',mime:'audio/wav',ext:'.wav',bytes:wav.length,
    url:'http://127.0.0.1:4317/media/'+id};
  await mkdir(MEDIA_DIR,{recursive:true});
  const path=join(MEDIA_DIR,id+'.wav');
  try{
    await writeFile(path,wav,{flag:'wx'});
    (await index())[id]=entry;
    await persist();
  }catch(e){
    delete (await index())[id];
    await unlink(path).catch(()=>{});
    throw e;
  }
  return {id,name,kind:'audio',mime:entry.mime,url:entry.url,durationFrames:900};
}
export async function mediaExistsFor(id:string):Promise<boolean>{
  const entry=(await index())[id];
  if(!entry)return false;
  try{const details=await stat(join(MEDIA_DIR,entry.id+entry.ext));return details.isFile()&&details.size>0;}
  catch{return false;}
}
export async function handleMedia(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(req.method==='GET'&&url.pathname==='/v1/media'){json(res,200,{assets:Object.values(await index()).map(({ext:_,bytes:__,...a})=>a)});return true;}
  if(req.method==='POST'&&url.pathname==='/v1/media/import'){
    const name=nameFromHeader(req.headers['x-file-name'] as string|undefined);
    if(!name||name.length>240||/[\\/\u0000-\u001f]/.test(name)){json(res,400,{error:'Nome de arquivo inválido'});return true;}
    const ext=extname(name).toLowerCase();const spec=allowed[ext];
    if(!spec){json(res,415,{error:'Formato não suportado; use PNG/JPG/WebP, MP4/WebM/MOV, MP3/WAV/M4A/OGG.'});return true;}
    const declared=(req.headers['content-type']||'').split(';')[0].toLowerCase();
    if(declared!==spec.mime&&!(ext==='.wav'&&declared==='audio/x-wav')&&!(ext==='.mov'&&declared==='video/mp4')){json(res,415,{error:'Tipo de arquivo incompatível com extensão'});return true;}
    if(Number(req.headers['content-length'])>MAX_FILE){json(res,413,{error:'Arquivo acima do limite de 512 MB'});return true;}
    const id=randomUUID();const path=join(MEDIA_DIR,id+ext);let bytes=0;
    try{
      const limit=new Transform({transform(chunk:Buffer,_enc,cb){bytes+=chunk.length;if(bytes>MAX_FILE)cb(new Error('Arquivo acima de 512 MB'));else cb(null,chunk);}});
      await pipeline(req,limit,createWriteStream(path,{flags:'wx'}));
      if(bytes===0)throw new Error('Arquivo vazio');
      // Evita arquivos disfarçados mais comuns; decodificação final é feita pelo Remotion.
      const record:Stored={id,name,kind:spec.kind,mime:spec.mime,ext,bytes,url:`http://127.0.0.1:4317/media/${id}`};
      (await index())[id]=record;await persist();
      json(res,201,{asset:{id,name,kind:record.kind,mime:record.mime,url:record.url}});
    }catch(e){await unlink(path).catch(()=>{});json(res,400,{error:e instanceof Error?e.message:'Falha ao importar'});}
    return true;
  }
  const match=/^\/media\/([0-9a-f-]{36})$/.exec(url.pathname);
  if(req.method==='GET'&&match){
    const record=(await index())[match[1]];if(!record){json(res,404,{error:'Mídia não encontrada'});return true;}
    const file=join(MEDIA_DIR,record.id+record.ext);
    try{
      const size=(await stat(file)).size;const range=req.headers.range;
      res.setHeader('Content-Type',record.mime);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','private, max-age=60');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
      let start=0,end=size-1,status=200;
      if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return true;}
        if(!m[1]){const last=Number(m[2]);start=Math.max(0,size-last);}else{start=Number(m[1]);end=m[2]?Math.min(size-1,Number(m[2])):size-1;}
        if(start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return true;}
        status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
      }
      res.writeHead(status,{'Content-Length':end-start+1});createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
    }catch{json(res,404,{error:'Arquivo não encontrado no disco'});}
    return true;
  }
  return false;
}
