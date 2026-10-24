/** Disk-backed, resumable portable .darkstudio transfers; legacy v1 importer remains available. */
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,rename,rm,stat,writeFile,open,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {projectSchema,type Project} from '../../../src/model/project';
import {decodePortableArchive} from './portable';
import {buildStreamingArchive,unpackStreamingArchive,withTempArchive,MAX_ZIP_BYTES} from './portable-stream';
import {importArchiveMedia,importArchiveMediaFile,rollbackArchiveMedia} from './media';
import {ProjectRepository} from './project-store';
import {json,readJson} from './http';

const repository=new ProjectRepository();
const archiveDataRoot=process.env.DARK_STUDIO_DATA_ROOT?
  resolve(process.env.DARK_STUDIO_DATA_ROOT):join(homedir(),'DarkStudio');
const root=join(archiveDataRoot,'uploads');
const exportRoot=join(archiveDataRoot,'portable-exports');
const uuid=/^[0-9a-f-]{36}$/i;
const active=new Set<string>();
const chunkMax=16*1024*1024;
type Session={id:string;size:number;name:string;created:number};
const sessionPath=(id:string)=>join(root,id+'.json');
const bodyPath=(id:string)=>join(root,id+'.part');
async function getSession(id:string):Promise<Session>{
  if(!uuid.test(id))throw new Error('ID de upload inválido.');
  const data=JSON.parse(await readFile(sessionPath(id),'utf8')) as Session;
  if(data.id!==id||!Number.isSafeInteger(data.size)||data.size<1||data.size>MAX_ZIP_BYTES||
    Date.now()-data.created>7*86400_000)throw new Error('Upload expirado ou inválido.');
  return data;
}
async function cleanStale(){
  await mkdir(root,{recursive:true});
  for(const file of await readdir(root)){
    if(!file.endsWith('.json'))continue;
    const id=file.slice(0,-5);if(!uuid.test(id)||active.has(id))continue;
    try{const meta=await getSession(id);void meta;}
    catch{
      await rm(sessionPath(id),{force:true}).catch(()=>{});
      await rm(bodyPath(id),{force:true}).catch(()=>{});
    }
  }
}
async function receive(req:IncomingMessage,path:string,limit:number,append=false){
  let n=0;
  const limiter=new Transform({transform(chunk:Buffer,_encoding,done){
    n+=chunk.length;
    if(n>limit)done(new Error('Trecho acima do limite permitido.'));
    else done(null,chunk);
  }});
  await pipeline(req,limiter,createWriteStream(path,{flags:append?'a':'wx'}));
  return n;
}
async function commitArchive(path:string){
  const inserted:string[]=[];
  try{
    return await withTempArchive(async staging=>{
      let p:Project;const map=new Map<string,{id:string;url:string}>();
      try{
        const decoded=await unpackStreamingArchive(path,staging);
        p=decoded.project;
        for(const entry of decoded.assets){
          const file=decoded.paths.get(entry.assetId);
          if(!file)throw new Error('Mídia temporária não encontrada.');
          const record=await importArchiveMediaFile({
            name:entry.name,kind:entry.kind,mime:entry.mime,ext:entry.ext,
            sourcePath:file,bytes:entry.bytes,
          });
          inserted.push(record.id);map.set(entry.assetId,{id:record.id,url:record.url});
        }
      }catch(error){
        // v0.16 packages were ZIP v1 in memory. Keep their import working.
        if((await stat(path)).size>512*1024*1024)throw error;
        let decoded:ReturnType<typeof decodePortableArchive>;
        try{decoded=decodePortableArchive(await readFile(path));}catch{throw error;}
        p=decoded.project;
        for(const {entry,bytes} of decoded.assets){
          const record=await importArchiveMedia({...entry,bytes});
          inserted.push(record.id);map.set(entry.assetId,{id:record.id,url:record.url});
        }
      }
      const remap=(id:string)=>{const match=map.get(id);
        if(!match)throw new Error('Referência a mídia ausente: '+id);
        return match.id;
      };
      const localUrl=(value:string)=>value.replace(
        /^http:\/\/127\.0\.0\.1:4317\/media\/([0-9a-f-]{36})$/,(_all,id:string)=>{
          const match=map.get(id);if(!match)throw new Error('Imagem sem mídia importada.');
          return match.url;
        });
      const candidate=projectSchema.parse({...p,
        assets:p.assets.map(a=>({...a,id:remap(a.id),url:map.get(a.id)!.url})),
        clips:p.clips.map(c=>({...c,assetId:remap(c.assetId)})),
        scenes:p.scenes.map(s=>({...s,imageUrl:s.imageUrl?localUrl(s.imageUrl):s.imageUrl})),
        shots:p.shots.map(s=>({...s,assetId:s.assetId?remap(s.assetId):undefined,
          layers:s.layers.map(l=>({...l,assetId:l.assetId?remap(l.assetId):undefined,
            fontFamily:l.fontFamily.startsWith('DSFont-')?
              'DSFont-'+remap(l.fontFamily.slice(7)):l.fontFamily}))})),
      });
      return repository.import(candidate);
    });
  }catch(e){
    for(const id of inserted.reverse())await rollbackArchiveMedia(id).catch(()=>{});
    throw e;
  }
}
async function purgeExpiredExports(){
  await mkdir(exportRoot,{recursive:true});
  for(const entry of await readdir(exportRoot)){
    if(!/^[0-9a-f-]{36}\.darkstudio$/.test(entry))continue;
    const path=join(exportRoot,entry);
    if(Date.now()-(await stat(path)).mtimeMs>7*86400_000)
      await rm(path,{force:true}).catch(()=>{});
  }
}
export async function handleArchive(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname==='/v1/archive/prepare'&&req.method==='POST'){
    try{
      const project=projectSchema.parse(await readJson(req,12_000_000));
      await purgeExpiredExports();
      const id=randomUUID(),path=join(exportRoot,id+'.darkstudio');
      try{
        const details=await buildStreamingArchive(project,path);
        json(res,201,{id,size:details.bytes,assets:details.assets,
          url:'http://127.0.0.1:4317/v1/archive/download/'+id});
      }catch(e){await rm(path,{force:true}).catch(()=>{});throw e;}
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha ao preparar pacote'});}
    return true;
  }
  const download=/^\/v1\/archive\/download\/([0-9a-f-]{36})$/.exec(url.pathname);
  if(download&&req.method==='GET'){
    try{
      const path=join(exportRoot,download[1]+'.darkstudio');
      const size=(await stat(path)).size,range=req.headers.range;
      let start=0,end=size-1,status=200;
      if(range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!m||(!m[1]&&!m[2]))throw new Error('Range inválido');
        if(!m[1])start=Math.max(0,size-Number(m[2]));
        else {start=Number(m[1]);end=m[2]?Math.min(size-1,Number(m[2])):size-1;}
        if(start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return true;}
        status=206;
      }
      const h:Record<string,string|number>={
        'Content-Type':'application/vnd.darkstudio+zip',
        'Content-Disposition':'attachment; filename="projeto.darkstudio"',
        'Content-Length':end-start+1,'Accept-Ranges':'bytes',
        'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
      };
      if(status===206)h['Content-Range']='bytes '+start+'-'+end+'/'+size;
      res.writeHead(status,h);
      await pipeline(createReadStream(path,{start,end}),res);
    }catch(e){
      if(!res.headersSent)json(res,404,{error:'Pacote não encontrado ou indisponível.'});
      else res.destroy();
    }
    return true;
  }

  if(url.pathname==='/v1/archive/export'&&req.method==='POST'){
    try{
      const project=projectSchema.parse(await readJson(req,12_000_000));
      await withTempArchive(async staging=>{
        const output=join(staging,'export.darkstudio');
        const details=await buildStreamingArchive(project,output);
        res.writeHead(200,{'Content-Type':'application/vnd.darkstudio+zip',
          'Content-Length':details.bytes,'Content-Disposition':'attachment; filename="projeto.darkstudio"',
          'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        await pipeline(createReadStream(output),res);
      });
    }catch(e){
      if(!res.headersSent)json(res,400,{error:e instanceof Error?e.message:'Erro no ZIP'});
      else res.destroy();
    }
    return true;
  }
  if(url.pathname==='/v1/archive/import'&&req.method==='POST'){
    try{
      await withTempArchive(async staging=>{
        const path=join(staging,'entrada.darkstudio');
        await receive(req,path,MAX_ZIP_BYTES);
        json(res,201,await commitArchive(path));
      });
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha ao importar arquivo'});}
    return true;
  }
  if(url.pathname==='/v1/archive/uploads'&&req.method==='POST'){
    try{
      const input=await readJson(req,3000) as {name?:string;size?:number};
      const size=input.size;
      if(typeof size!=='number'||!Number.isSafeInteger(size)||size<1||size>MAX_ZIP_BYTES||
        typeof input.name!=='string'||input.name.length>240||
        !/^[^\\/\x00-\x1f]+\.darkstudio$/i.test(input.name))throw new Error('Nome/tamanho de pacote inválido.');
      await cleanStale();const id=randomUUID(),session:Session={id,name:input.name,size,created:Date.now()};
      await writeFile(sessionPath(id),JSON.stringify(session),{flag:'wx'});
      await writeFile(bodyPath(id),'',{flag:'wx'});
      json(res,201,{id,offset:0,size});
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha ao iniciar upload'});}
    return true;
  }
  const transfer=/^\/v1\/archive\/uploads\/([0-9a-f-]{36})(?:\/(complete))?$/.exec(url.pathname);
  if(transfer){
    const id=transfer[1];
    try{
      const meta=await getSession(id);
      if(req.method==='GET'&&!transfer[2]){
        const size=(await stat(bodyPath(id))).size;
        json(res,200,{id,offset:size,size:meta.size});return true;
      }
      if(req.method==='PUT'&&!transfer[2]){
        if(active.has(id)){json(res,409,{error:'Upload ocupado.'});return true;}
        active.add(id);
        try{
          const offset=Number(req.headers['x-upload-offset']);
          const previous=(await stat(bodyPath(id))).size;
          if(!Number.isSafeInteger(offset)||offset!==previous)
            {json(res,409,{error:'Offset divergente; consulte o tamanho recebido.',offset:previous});return true;}
          if(meta.size-previous<=0){json(res,409,{error:'Arquivo já completo.'});return true;}
          const n=await receive(req,bodyPath(id),Math.min(chunkMax,meta.size-previous),true);
          json(res,200,{id,offset:previous+n,size:meta.size});
        }finally{active.delete(id);}
        return true;
      }
      if(req.method==='POST'&&transfer[2]){
        if(active.has(id)){json(res,409,{error:'Upload ocupado.'});return true;}
        active.add(id);
        try{
          if((await stat(bodyPath(id))).size!==meta.size)
            {json(res,409,{error:'Envie todos os bytes antes de concluir.'});return true;}
          const result=await commitArchive(bodyPath(id));
          await rm(sessionPath(id),{force:true});await rm(bodyPath(id),{force:true});
          json(res,201,result);
        }finally{active.delete(id);}
        return true;
      }
      if(req.method==='DELETE'&&!transfer[2]){
        if(active.has(id)){json(res,409,{error:'Upload ocupado.'});return true;}
        await rm(sessionPath(id),{force:true});await rm(bodyPath(id),{force:true});
        json(res,200,{deleted:true});return true;
      }
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha no upload'});return true;}
  }
  return false;
}
