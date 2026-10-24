import {createReadStream,createWriteStream} from 'node:fs';
import {copyFile,mkdir,readFile,rename,stat,unlink,writeFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {json} from './http';
import type {Asset} from '../../../src/model/project';

export const DATA_ROOT=join(homedir(),'DarkStudio');
const MEDIA_DIR=join(DATA_ROOT,'media');
const INDEX=join(DATA_ROOT,'media-index.json');
export const MAX_FILE=16*1024*1024*1024;
const allowed:Record<string,{mime:string,kind:'image'|'video'|'audio'|'font'}>={
  '.png':{mime:'image/png',kind:'image'},'.jpg':{mime:'image/jpeg',kind:'image'},'.jpeg':{mime:'image/jpeg',kind:'image'},'.webp':{mime:'image/webp',kind:'image'},
  '.mp4':{mime:'video/mp4',kind:'video'},'.webm':{mime:'video/webm',kind:'video'},'.mov':{mime:'video/quicktime',kind:'video'},
  '.mp3':{mime:'audio/mpeg',kind:'audio'},'.wav':{mime:'audio/wav',kind:'audio'},'.m4a':{mime:'audio/mp4',kind:'audio'},'.ogg':{mime:'audio/ogg',kind:'audio'},
  '.woff2':{mime:'font/woff2',kind:'font'},'.woff':{mime:'font/woff',kind:'font'},
  '.ttf':{mime:'font/ttf',kind:'font'},'.otf':{mime:'font/otf',kind:'font'},
};
type Stored={id:string,name:string,kind:'image'|'video'|'audio'|'font',mime:string,ext:string,bytes:number,url:string};
let mediaIndex:Record<string,Stored>|null=null;
async function index(){if(mediaIndex)return mediaIndex;await mkdir(MEDIA_DIR,{recursive:true});try{mediaIndex=JSON.parse(await readFile(INDEX,'utf8')) as Record<string,Stored>;}catch{mediaIndex={};}return mediaIndex;}
async function persist(){const tmp=INDEX+'.tmp';await writeFile(tmp,JSON.stringify(mediaIndex,null,2),'utf8');await rename(tmp,INDEX);}
function nameFromHeader(v:string|undefined){if(!v)return null;try{return decodeURIComponent(v);}catch{return null;}}
/** Mídia sintetizada LOCALMENTE pelo Dark Studio; a voz não é publicada em GitHub. */
export async function importGeneratedWave(wav:Buffer,options?:{
  name?:string;durationFrames?:number;
}):Promise<Asset & {durationFrames:number}>{
  if(wav.length<44||wav.length>30*1024*1024)throw new Error('WAV sintetizado inválido.');
  const id=randomUUID(),name=options?.name??'piloto-narracao-local.wav';
  if(!/^[^\\/\u0000-\u001f]{1,200}\.wav$/i.test(name))throw new Error('Nome de WAV local inválido.');
  const durationFrames=options?.durationFrames??900;
  if(!Number.isInteger(durationFrames)||durationFrames<1||durationFrames>54000)
    throw new Error('Duração de mídia gerada inválida.');
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
  return {id,name,kind:'audio',mime:entry.mime,url:entry.url,durationFrames,
    rights:{status:'unknown',sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}};
}
/** Portable archives may only read registered media; never arbitrary user paths. */
export async function readRegisteredMedia(id:string):Promise<{bytes:Buffer;ext:string;mime:string;kind:'image'|'video'|'audio';name:string}>{
  const entry=(await index())[id];
  if(!entry)throw new Error('Mídia registrada não encontrada: '+id);
  const bytes=await readFile(join(MEDIA_DIR,entry.id+entry.ext));
  if(bytes.length!==entry.bytes||!bytes.length)throw new Error('Mídia ausente ou alterada: '+entry.name);
  return {bytes,ext:entry.ext,mime:entry.mime,kind:entry.kind,name:entry.name};
}
export async function registeredMediaPath(id:string):Promise<{
  path:string;name:string;kind:'image'|'video'|'audio'|'font';mime:string;ext:string;bytes:number;
}>{
  const entry=(await index())[id];
  if(!entry)throw new Error('Mídia não registrada: '+id);
  const path=join(MEDIA_DIR,entry.id+entry.ext),info=await stat(path);
  if(!info.isFile()||info.size!==entry.bytes)throw new Error('Arquivo de mídia ausente/alterado: '+entry.name);
  return {path,name:entry.name,kind:entry.kind,mime:entry.mime,ext:entry.ext,bytes:entry.bytes};
}
/** Font format magic is checked locally, not merely guessed from extension. */
export async function validateFontFile(path:string,ext:string):Promise<void>{
  if(!['.woff2','.woff','.ttf','.otf'].includes(ext))return;
  const {open}=await import('node:fs/promises');
  const handle=await open(path,'r');const b=Buffer.alloc(4);
  try{if((await handle.read(b,0,4,0)).bytesRead!==4)throw new Error('Fonte vazia');}
  finally{await handle.close();}
  const magic=ext==='.woff2'?'wOF2':ext==='.woff'?'wOFF':ext==='.otf'?'OTTO':null;
  if(magic?b.toString('latin1')!==magic:b.readUInt32BE(0)!==0x00010000)
    throw new Error('Assinatura de fonte inválida: '+ext);
}
/** Add a validated binary as a NEW ID, preventing overwrites on import. */
export async function importArchiveMedia(input:{
  name:string;kind:'image'|'video'|'audio';mime:string;ext:string;bytes:Uint8Array;
}):Promise<Stored>{
  const spec=allowed[input.ext];
  if(!spec||spec.kind!==input.kind||spec.mime!==input.mime)
    throw new Error('Formato de mídia do pacote incompatível.');
  if(input.bytes.length<1||input.bytes.length>MAX_FILE)
    throw new Error('Mídia de pacote vazia ou muito grande.');
  if(input.name.length>240||/[\\/\u0000-\u001f]/.test(input.name))
    throw new Error('Nome de mídia inválido no pacote.');
  const id=randomUUID(),record:Stored={id,name:input.name,kind:input.kind,mime:input.mime,
    ext:input.ext,bytes:input.bytes.length,url:'http://127.0.0.1:4317/media/'+id};
  await mkdir(MEDIA_DIR,{recursive:true});
  const path=join(MEDIA_DIR,id+input.ext);
  try{
    await writeFile(path,input.bytes,{flag:'wx'});
    (await index())[id]=record;await persist();
    return record;
  }catch(e){delete (await index())[id];await unlink(path).catch(()=>{});throw e;}
}
/** Streaming ZIP importer: commit one validated staged file without loading it in RAM. */
export async function importArchiveMediaFile(input:{
  name:string;kind:'image'|'video'|'audio'|'font';mime:string;ext:string;
  sourcePath:string;bytes:number;
}):Promise<Stored>{
  const spec=allowed[input.ext];
  if(!spec||spec.kind!==input.kind||spec.mime!==input.mime)
    throw new Error('Tipo de arquivo inconsistente no pacote.');
  if(!Number.isSafeInteger(input.bytes)||input.bytes<1||input.bytes>MAX_FILE)
    throw new Error('Tamanho de arquivo inválido.');
  if(input.name.length>240||/[\\/\u0000-\u001f]/.test(input.name))
    throw new Error('Nome de mídia inválido.');
  const source=await stat(input.sourcePath);
  if(!source.isFile()||source.size!==input.bytes)throw new Error('Mídia temporária incompleta.');
  if(input.kind==='font')await validateFontFile(input.sourcePath,input.ext);
  const id=randomUUID(),record:Stored={id,name:input.name,kind:input.kind,
    mime:input.mime,ext:input.ext,bytes:input.bytes,
    url:'http://127.0.0.1:4317/media/'+id};
  await mkdir(MEDIA_DIR,{recursive:true});
  const target=join(MEDIA_DIR,id+input.ext);
  try{
    await copyFile(input.sourcePath,target);
    (await index())[id]=record;await persist();
    return record;
  }catch(e){
    delete (await index())[id];await unlink(target).catch(()=>{});
    throw e;
  }
}
export async function rollbackArchiveMedia(id:string):Promise<void>{
  const entry=(await index())[id];
  if(!entry)return;
  delete (await index())[id];await persist();
  await unlink(join(MEDIA_DIR,entry.id+entry.ext)).catch(()=>{});
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
    if(!spec){json(res,415,{error:'Formato não suportado; use imagem, vídeo, áudio ou WOFF2/WOFF/TTF/OTF.'});return true;}
    const declared=(req.headers['content-type']||'').split(';')[0].toLowerCase();
    if(declared!==spec.mime&&!(ext==='.wav'&&declared==='audio/x-wav')&&!(ext==='.mov'&&declared==='video/mp4')){json(res,415,{error:'Tipo de arquivo incompatível com extensão'});return true;}
    if(Number(req.headers['content-length'])>MAX_FILE){json(res,413,{error:'Arquivo acima do limite de 16 GB'});return true;}
    const id=randomUUID();const path=join(MEDIA_DIR,id+ext);let bytes=0;
    try{
      const limit=new Transform({transform(chunk:Buffer,_enc,cb){bytes+=chunk.length;if(bytes>MAX_FILE)cb(new Error('Arquivo acima de 16 GB'));else cb(null,chunk);}});
      await pipeline(req,limit,createWriteStream(path,{flags:'wx'}));
      if(bytes===0)throw new Error('Arquivo vazio');
      if(spec.kind==='font')await validateFontFile(path,ext);
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
