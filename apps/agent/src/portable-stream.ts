/**
 * Dark Studio portable ZIP v2: disk-backed ZIP64, streaming IO and bounded extraction.
 * No archive entry ever supplies a filesystem path. Staging is discarded on failure.
 * Requires yazl and yauzl. Kept separate from legacy v1 for compatibility.
 */
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import * as yazl from 'yazl';
import * as yauzl from 'yauzl';
import {z} from 'zod';
import {projectSchema,type Project} from '../../../src/model/project';
import {registeredMediaPath} from './media';

export const MAX_ZIP_BYTES=64*1024**3; // 64 GiB per archive
export const MAX_MEDIA_BYTES=16*1024**3;
export const MAX_ENTRIES=12002; // project + manifest + up to 12,000 assets
const UUID='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';
const allowed=new RegExp('^media/('+UUID+')\\.(png|jpg|jpeg|webp|mp4|webm|mov|mp3|wav|m4a|ogg|woff2|woff|ttf|otf)$');
const hex=/^[0-9a-f]{64}$/;
const entrySchema=z.object({
  assetId:z.string().uuid(),name:z.string().min(1).max(240),
  filename:z.string().max(110).regex(allowed),
  kind:z.enum(['image','video','audio','font']),
  mime:z.string().min(3).max(100),ext:z.string().regex(/^\.[a-z0-9]{2,5}$/),
  bytes:z.number().int().min(1).max(MAX_MEDIA_BYTES),
  sha256:z.string().regex(hex),
}).strict();
const manifestSchema=z.object({
  format:z.literal('darkstudio'),version:z.literal(2),
  projectSha256:z.string().regex(hex),assets:z.array(entrySchema).max(12000),
}).strict();
export type StreamManifest=z.infer<typeof manifestSchema>;
export type ExtractedArchive={project:Project;assets:StreamManifest['assets'];
  staging:string;paths:Map<string,string>};
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(path:string):Promise<string>{
  const h=createHash('sha256');
  for await(const part of createReadStream(path))h.update(part as Buffer);
  return h.digest('hex');
}
export function checkPortability(project:Project):void{
  const ids=new Set(project.assets.map(a=>a.id));
  for(const scene of project.scenes){
    if(!scene.imageUrl)continue;
    const match=/^http:\/\/127\.0\.0\.1:4317\/media\/([0-9a-f-]{36})$/.exec(scene.imageUrl);
    if(!match||!ids.has(match[1]))throw new Error(
      'Imagem de cena externa: importe o arquivo na biblioteca antes de exportar .darkstudio.');
  }
  for(const asset of project.assets){
    if(asset.kind==='font'&&(!asset.rights.redistributionAllowed||
      !asset.rights.licenseName.trim()))
      throw new Error('Fonte "'+asset.name+'" sem autorização de redistribuição e identificação da licença.');
  }
}
export async function buildStreamingArchive(projectInput:unknown,destination:string):Promise<{
  bytes:number;assets:number;
}>{
  const project=projectSchema.parse(projectInput);
  checkPortability(project);
  if(project.assets.length>12000)throw new Error('Máximo de 12.000 mídias por pacote.');
  const entries:StreamManifest['assets']=[];
  let total=0;
  const locations:Array<{path:string;name:string}>=[];
  for(const asset of project.assets){
    const file=await registeredMediaPath(asset.id);
    if(file.kind!==asset.kind||file.mime!==asset.mime)
      throw new Error('Mídia local não corresponde ao projeto: '+asset.name);
    if(file.bytes>MAX_MEDIA_BYTES)throw new Error('Uma mídia excede 16 GiB: '+asset.name);
    total+=file.bytes;
    if(total>MAX_ZIP_BYTES-20_000_000)throw new Error('Projeto excede o limite de 64 GiB.');
    const filename='media/'+asset.id+file.ext;
    entries.push({assetId:asset.id,name:asset.name,filename,ext:file.ext,
      kind:file.kind,mime:file.mime,bytes:file.bytes,sha256:await hashFile(file.path)});
    locations.push({path:file.path,name:filename});
  }
  const projectJson=Buffer.from(JSON.stringify(project,null,2)+'\n','utf8');
  if(projectJson.length>12_000_000)throw new Error('JSON do projeto acima de 12 MB.');
  const manifest:StreamManifest={format:'darkstudio',version:2,
    projectSha256:hash(projectJson),assets:entries};
  const zip=new yazl.ZipFile();
  zip.addBuffer(projectJson,'project.json',{compress:false});
  zip.addBuffer(Buffer.from(JSON.stringify(manifest,null,2)),'manifest.json',{compress:false});
  for(const file of locations)zip.addFile(file.path,file.name,{compress:false});
  // Stream to a new path; on failure the caller removes it. ZIP64 handles >4GB.
  const writing=pipeline(zip.outputStream,createWriteStream(destination,{flags:'wx'}));
  zip.end({forceZip64Format:true});
  try{
    await writing;
    const size=(await stat(destination)).size;
    if(size>MAX_ZIP_BYTES)throw new Error('Pacote excede 64 GiB.');
    return {bytes:size,assets:entries.length};
  }catch(e){await rm(destination,{force:true}).catch(()=>{});throw e;}
}
async function openZip(path:string):Promise<yauzl.ZipFile>{
  return new Promise((resolve,reject)=>yauzl.open(path,{
    lazyEntries:true,autoClose:false,validateEntrySizes:true,strictFileNames:true,
  },(error,zip)=>error?reject(error):zip?resolve(zip):reject(new Error('ZIP inválido'))));
}
async function nextZip(zip:yauzl.ZipFile):Promise<yauzl.Entry|null>{
  return new Promise((resolve,reject)=>{
    function clear(){
      zip.removeListener('entry',onEntry);zip.removeListener('end',onEnd);
      zip.removeListener('error',onError);
    }
    function onEntry(entry:yauzl.Entry){clear();resolve(entry);}
    function onEnd(){clear();resolve(null);}
    function onError(error:Error){clear();reject(error);}
    zip.once('entry',onEntry);zip.once('end',onEnd);zip.once('error',onError);
    zip.readEntry();
  });
}
function openEntry(zip:yauzl.ZipFile,entry:yauzl.Entry):Promise<NodeJS.ReadableStream>{
  return new Promise((resolve,reject)=>zip.openReadStream(entry,(error,stream)=>
    error?reject(error):stream?resolve(stream):reject(new Error('Entrada ZIP inválida'))));
}
export async function unpackStreamingArchive(archivePath:string,staging:string):Promise<ExtractedArchive>{
  const src=await stat(archivePath);
  if(!src.isFile()||src.size<30||src.size>MAX_ZIP_BYTES)
    throw new Error('Arquivo ZIP inválido ou acima de 64 GiB.');
  const zip=await openZip(archivePath);
  const files=new Map<string,{path:string;bytes:number;sha256:string}>();
  let count=0,total=0;
  try{
    while(true){
      const entry=await nextZip(zip);
      if(!entry)break;
      count++;total+=entry.uncompressedSize;
      const name=entry.fileName;
      if(count>MAX_ENTRIES||total>MAX_ZIP_BYTES||entry.uncompressedSize>MAX_MEDIA_BYTES||
        entry.uncompressedSize<1||entry.compressedSize<1||
        entry.uncompressedSize/entry.compressedSize>500)
        throw new Error('ZIP excede limites de tamanho/quantidade/compressão.');
      if((name!=='project.json'&&name!=='manifest.json'&&!allowed.test(name))||
        files.has(name)||name.includes('..')||name.includes('\\'))
        throw new Error('Nome duplicado ou caminho inválido no arquivo .darkstudio: '+name);
      if((name==='project.json'||name==='manifest.json')&&entry.uncompressedSize>12_000_000)
        throw new Error('Metadados JSON do pacote excessivos.');
      const dest=join(staging,'entry-'+count);
      const h=createHash('sha256');let bytes=0;
      const limiter=new Transform({transform(chunk:Buffer,_encoding,callback){
        bytes+=chunk.length;
        if(bytes>entry.uncompressedSize||bytes>MAX_MEDIA_BYTES)
          callback(new Error('Arquivo ZIP descompactado excede limite.'));
        else{h.update(chunk);callback(null,chunk);}
      }});
      await pipeline(await openEntry(zip,entry),limiter,createWriteStream(dest,{flags:'wx'}));
      if(bytes!==entry.uncompressedSize)throw new Error('Arquivo ZIP truncado.');
      files.set(name,{path:dest,bytes,sha256:h.digest('hex')});
    }
    const pj=files.get('project.json'),mf=files.get('manifest.json');
    if(!pj||!mf)throw new Error('O pacote precisa ter project.json e manifest.json.');
    const manifest=manifestSchema.parse(JSON.parse(await readFile(mf.path,'utf8')) as unknown);
    if(pj.sha256!==manifest.projectSha256)throw new Error('SHA-256 do projeto não confere.');
    const project=projectSchema.parse(JSON.parse(await readFile(pj.path,'utf8')) as unknown);
    if(manifest.assets.length!==project.assets.length||files.size!==manifest.assets.length+2)
      throw new Error('Quantidade de arquivos no pacote não confere.');
    const projectById=new Map(project.assets.map(a=>[a.id,a]));
    const seen=new Set<string>(),paths=new Map<string,string>();
    for(const entry of manifest.assets){
      const current=files.get(entry.filename),asset=projectById.get(entry.assetId);
      if(!current||!asset||seen.has(entry.filename)||!allowed.test(entry.filename)||
        entry.filename!=='media/'+entry.assetId+entry.ext||
        entry.bytes!==current.bytes||entry.sha256!==current.sha256||
        entry.name!==asset.name||entry.kind!==asset.kind||entry.mime!==asset.mime)
        throw new Error('Mídia ausente, adulterada ou divergente: '+entry.name);
      seen.add(entry.filename);paths.set(entry.assetId,current.path);
    }
    checkPortability(project); // font rights must be explicitly declared
    return {project,assets:manifest.assets,staging,paths};
  }finally{zip.close();}
}
export async function withTempArchive<T>(action:(root:string)=>Promise<T>):Promise<T>{
  const root=await mkdtemp(join(tmpdir(),'darkstudio-v2-'));
  try{return await action(root);}
  finally{await rm(root,{recursive:true,force:true}).catch(()=>{});}
}
