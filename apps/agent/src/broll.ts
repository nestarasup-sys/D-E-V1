/** Optional official Pexels video catalog integration. No scraping, no silent licensing. */
import {randomUUID} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {z} from 'zod';
import {json,readJson} from './http';
import {importArchiveMediaFile} from './media';
import type {Asset} from '../../../src/model/project';

type VideoFile={id:number;quality?:string;file_type:string;width?:number;
  height?:number;link:string};
type CatalogVideo={id:number;url:string;image:string;duration:number;width:number;height:number;
  user?:{name?:string;url?:string};video_files:VideoFile[]};
export interface BrollCandidate {
  id:number;source:'pexels';page:string;thumbnail:string;creator:string;
  durationSeconds:number;width:number;height:number;
  creditsRequired:boolean;licenseUrl:string;
}
const licenseUrl='https://www.pexels.com/license/';
export function candidate(video:CatalogVideo):BrollCandidate{
  return {id:video.id,source:'pexels',page:video.url,
    thumbnail:video.image,creator:video.user?.name||'Autor não informado',
    durationSeconds:video.duration,width:video.width,height:video.height,
    creditsRequired:false,licenseUrl};
}
function keyFrom(req:IncomingMessage){
  const raw=req.headers['x-pexels-key'];
  const key=typeof raw==='string'?raw:process.env.PEXELS_API_KEY||'';
  if(!/^[A-Za-z0-9_-]{16,160}$/.test(key))
    throw new Error('Chave da API Pexels ausente. Informe a chave no painel de B-roll; ela não é salva no projeto.');
  return key;
}
const allowedVideoHosts=(host:string)=>
  host==='player.vimeo.com'||host==='videos.pexels.com'||
  host.endsWith('.vimeocdn.com')||host.endsWith('.akamaized.net')||
  host==='vod-progressive.akamaized.net';
export function safeVideoUrl(input:string):URL{
  const url=new URL(input);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!allowedVideoHosts(url.hostname))
    throw new Error('Servidor de vídeo não autorizado.');
  return url;
}
async function catalog(key:string,route:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),18000);
  try{
    const response=await fetch('https://api.pexels.com/v1/videos/'+route,{
      headers:{Authorization:key},signal:controller.signal,redirect:'error'});
    if(!response.ok)throw new Error(response.status===401?'Chave Pexels inválida':
      'Catálogo Pexels respondeu HTTP '+response.status);
    return await response.json() as unknown;
  }finally{clearTimeout(timer);}
}
const videoSchema=z.object({
  id:z.number().int().positive(),url:z.string().url(),image:z.string().url(),
  duration:z.number().positive(),width:z.number().positive(),height:z.number().positive(),
  user:z.object({name:z.string().optional(),url:z.string().optional()}).passthrough().optional(),
  video_files:z.array(z.object({
    id:z.number(),quality:z.string().optional(),file_type:z.string(),
    width:z.number().nullable().optional(),height:z.number().nullable().optional(),
    link:z.string().url(),
  }).passthrough()),
}).passthrough();
function playable(data:unknown):CatalogVideo{
  const v=videoSchema.parse(data);
  if(!/^https:\/\/www\.pexels\.com\/video\//.test(v.url))
    throw new Error('Referência do catálogo inesperada.');
  return v as CatalogVideo;
}
async function download(url:URL,output:string){
  let source=url;
  for(let step=0;step<5;step++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
    try{
      const response=await fetch(source,{signal:controller.signal,redirect:'manual'});
      if(response.status>=300&&response.status<400){
        const location=response.headers.get('location');
        if(!location)throw new Error('Redirecionamento de vídeo sem destino.');
        source=safeVideoUrl(new URL(location,source).href);continue;
      }
      if(!response.ok||!response.body)throw new Error('Download de vídeo indisponível (HTTP '+response.status+').');
      const declared=Number(response.headers.get('content-length')||'0');
      if(declared>256*1024*1024)throw new Error('B-roll maior que 256 MB; use download manual.');
      let bytes=0;
      const chunks=Readable.fromWeb(response.body as never);
      const limiter=async function* (input:AsyncIterable<Buffer>){
        for await(const chunk of input){
          bytes+=chunk.length;
          if(bytes>256*1024*1024)throw new Error('B-roll acima de 256 MB.');
          yield chunk;
        }
      };
      await pipeline(Readable.from(limiter(chunks)),createWriteStream(output,{flags:'wx'}));
      if(bytes<32)throw new Error('Download vazio/incompleto.');
      return bytes;
    }finally{clearTimeout(timer);}
  }
  throw new Error('Muitos redirecionamentos no download da filmagem.');
}
const busy=new Set<number>();
export async function handleBroll(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname==='/v1/broll/search'&&req.method==='GET'){
    try{
      const q=z.string().trim().min(2).max(180).parse(url.searchParams.get('query'));
      const data=await catalog(keyFrom(req),'search?'+new URLSearchParams({
        query:q,per_page:'9',locale:'pt-BR',orientation:'landscape',
      }));
      const r=z.object({videos:z.array(z.unknown())}).passthrough().parse(data);
      const options=r.videos.flatMap(v=>{
        try{return [candidate(playable(v))];}catch{return [];}
      });
      json(res,200,{source:'Pexels',providerUrl:'https://www.pexels.com',
        licenseUrl,query:q,candidates:options,advice:'Confira pertinência e direitos antes de importar.'});
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Pesquisa de filmagens indisponível'});}
    return true;
  }
  if(url.pathname==='/v1/broll/import'&&req.method==='POST'){
    const request=z.object({
      videoId:z.number().int().positive(),
      licenseConfirmed:z.literal(true),
    }).strict();
    let id=0;
    try{
      const input=request.parse(await readJson(req,1000));id=input.videoId;
      if(busy.has(id))throw new Error('Esta filmagem já está sendo importada.');
      busy.add(id);
      const info=playable(await catalog(keyFrom(req),'videos/'+id));
      if(info.id!==id)throw new Error('ID do vídeo não confere com o catálogo.');
      const files=info.video_files.filter(file=>file.file_type==='video/mp4'&&
        file.width&&file.height&&file.width>=960&&file.width<=1920&&file.height<=1080);
      const file=files.sort((a,b)=>(b.width||0)-(a.width||0))[0];
      if(!file)throw new Error('O fornecedor não oferece MP4 adequado (até 1080p).');
      const source=safeVideoUrl(file.link);
      const temp=await mkdtemp(join(tmpdir(),'darkstudio-broll-'));
      try{
        const target=join(temp,randomUUID()+'.mp4');
        const bytes=await download(source,target);
        if((await stat(target)).size!==bytes)throw new Error('Filmagem incompleta.');
        const media=await importArchiveMediaFile({
          name:'pexels-'+id+'.mp4',kind:'video',mime:'video/mp4',ext:'.mp4',
          sourcePath:target,bytes,
        });
        const asset:Asset={id:media.id,name:media.name,kind:'video',mime:'video/mp4',
          url:media.url,durationFrames:Math.floor(info.duration*30),
          rights:{status:'cleared',sourceUrl:info.url,creator:info.user?.name||'',
            licenseName:'Pexels License (verificada pelo usuário)',
            attribution:'Filmagem de '+(info.user?.name||'autor não identificado')+' / Pexels',
            notes:'Pexels vídeo '+info.id+'; usuário confirmou revisão da licença em '+new Date().toISOString(),
          }};
        json(res,201,{asset,candidate:candidate(info)});
      }finally{await rm(temp,{force:true,recursive:true}).catch(()=>{});}
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Importação de B-roll não concluída'});}
    finally{if(id)busy.delete(id);}
    return true;
  }
  return false;
}
