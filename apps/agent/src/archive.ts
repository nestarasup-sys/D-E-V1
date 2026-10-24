import type {IncomingMessage,ServerResponse} from 'node:http';
import {projectSchema} from '../../../src/model/project';
import {buildPortableArchive,decodePortableArchive} from './portable';
import {readRegisteredMedia,importArchiveMedia,rollbackArchiveMedia} from './media';
import {ProjectRepository} from './project-store';
import {json,readJson} from './http';

const MAX=512*1024*1024;
const repository=new ProjectRepository();
async function readBinary(req:IncomingMessage):Promise<Uint8Array>{
  if(Number(req.headers['content-length'])>MAX)throw new Error('Pacote acima de 512 MB.');
  let length=0;const chunks:Buffer[]=[];
  for await(const chunk of req){
    const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    length+=part.length;
    if(length>MAX)throw new Error('Pacote acima de 512 MB.');
    chunks.push(part);
  }
  return Buffer.concat(chunks);
}
export async function handleArchive(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
  if(url.pathname==='/v1/archive/export'&&req.method==='POST'){
    try{
      const input=await readJson(req,2_000_000);
      const project=projectSchema.parse(input);
      const zipped=await buildPortableArchive(project,readRegisteredMedia);
      res.writeHead(200,{
        'Content-Type':'application/vnd.darkstudio+zip','Content-Length':zipped.length,
        'Content-Disposition':'attachment; filename="projeto.darkstudio"',
        'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      });
      res.end(Buffer.from(zipped));
    }catch(e){json(res,400,{error:e instanceof Error?e.message:'Falha ao criar pacote'});}
    return true;
  }
  if(url.pathname==='/v1/archive/import'&&req.method==='POST'){
    const inserted:string[]=[];
    try{
      const {project,assets}=decodePortableArchive(await readBinary(req));
      const map=new Map<string,{id:string,url:string}>();
      for(const {entry,bytes} of assets){
        const media=await importArchiveMedia({...entry,bytes});
        inserted.push(media.id);
        map.set(entry.assetId,{id:media.id,url:media.url});
      }
      const remap=(id:string)=>{const item=map.get(id);
        if(!item)throw new Error('Mídia do pacote sem correspondência: '+id);
        return item.id;
      };
      const remapUrl=(url:string)=>url.replace(
        /^http:\/\/127\.0\.0\.1:4317\/media\/([0-9a-f-]{36})$/,(_match,id:string)=>{
          const item=map.get(id);if(!item)throw new Error('Imagem de cena sem mídia no pacote.');
          return item.url;
        });
      const imported=projectSchema.parse({
        ...project,
        assets:project.assets.map(a=>({...a,id:remap(a.id),url:map.get(a.id)!.url})),
        clips:project.clips.map(c=>({...c,assetId:remap(c.assetId)})),
        scenes:project.scenes.map(s=>({...s,imageUrl:s.imageUrl?remapUrl(s.imageUrl):s.imageUrl})),
        shots:project.shots.map(shot=>({...shot,
          assetId:shot.assetId?remap(shot.assetId):undefined,
          layers:shot.layers.map(layer=>({...layer,
            assetId:layer.assetId?remap(layer.assetId):undefined}))})),
      });
      const record=await repository.import(imported);
      json(res,201,record);
    }catch(e){
      for(const id of inserted.reverse())await rollbackArchiveMedia(id).catch(()=>{});
      json(res,400,{error:e instanceof Error?e.message:'Não foi possível importar .darkstudio'});
    }
    return true;
  }
  return false;
}
