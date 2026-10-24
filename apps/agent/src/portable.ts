/** One-file, local and bounded ZIP interchange: JSON, captions, voice, music, SFX and visual media. */
import {createHash} from 'node:crypto';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {z} from 'zod';
import {projectSchema,type Project} from '../../../src/model/project';

const MAX_PACKAGE=512*1024*1024,MAX_FILES=250;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const entrySchema=z.object({
  assetId:z.string().uuid(),name:z.string().min(1).max(240),
  filename:z.string().regex(/^media\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp|mp4|webm|mov|mp3|wav|m4a|ogg)$/),
  kind:z.enum(['image','video','audio']),mime:z.string().min(3).max(100),
  ext:z.string().regex(/^\.(png|jpg|jpeg|webp|mp4|webm|mov|mp3|wav|m4a|ogg)$/),
  bytes:z.number().int().positive().max(MAX_PACKAGE),sha256:z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const manifestSchema=z.object({
  format:z.literal('darkstudio'),version:z.literal(1),
  projectSha256:z.string().regex(/^[0-9a-f]{64}$/),
  assets:z.array(entrySchema).max(MAX_FILES),
}).strict();
export type PortableMedia={bytes:Uint8Array;ext:string;mime:string;kind:'image'|'video'|'audio';name:string};
export type PortableEntry=z.infer<typeof entrySchema>;
export type PortableDocument={project:Project;assets:Array<{entry:PortableEntry;bytes:Uint8Array}>};
export async function buildPortableArchive(project:Project,
  lookup:(assetId:string)=>Promise<PortableMedia>):Promise<Uint8Array>{
  const parsed=projectSchema.parse(project);
  if(parsed.assets.length>MAX_FILES)throw new Error('Pacote excede 250 mídias; divida em projetos menores.');
  const projectAssetIds=new Set(parsed.assets.map(a=>a.id));
  for(const scene of parsed.scenes){
    if(!scene.imageUrl)continue;
    const found=/^http:\/\/127\.0\.0\.1:4317\/media\/([0-9a-f-]{36})$/.exec(scene.imageUrl);
    if(!found||!projectAssetIds.has(found[1]))
      throw new Error('Cena usa imagem externa ou sem asset cadastrado. Importe pela biblioteca antes de criar um pacote autossuficiente.');
  }
  const files:Record<string,Uint8Array>={};
  const projectBytes=strToU8(JSON.stringify(parsed,null,2)+'\n');
  files['project.json']=projectBytes;
  let size=projectBytes.length;
  const assets:PortableEntry[]=[];
  for(const asset of parsed.assets){
    const media=await lookup(asset.id);
    if(media.kind!==asset.kind||media.mime!==asset.mime)
      throw new Error('Mídia divergente da biblioteca: '+asset.name);
    const filename='media/'+asset.id+media.ext;
    if(files[filename])throw new Error('Mídia duplicada: '+asset.id);
    size+=media.bytes.length;
    if(size>MAX_PACKAGE)throw new Error('Pacote excede 512 MB; divida o material antes de exportar.');
    files[filename]=media.bytes;
    assets.push({assetId:asset.id,name:asset.name,filename,
      kind:asset.kind,mime:asset.mime,ext:media.ext,
      bytes:media.bytes.length,sha256:sha(media.bytes)});
  }
  files['manifest.json']=strToU8(JSON.stringify({
    format:'darkstudio',version:1,projectSha256:sha(projectBytes),assets,
  },null,2));
  const zip=zipSync(files,{level:0});
  if(zip.length>MAX_PACKAGE)throw new Error('Arquivo final excede 512 MB.');
  return zip;
}
export function decodePortableArchive(buffer:Uint8Array):PortableDocument{
  if(buffer.length<30||buffer.length>MAX_PACKAGE)throw new Error('Arquivo .darkstudio inválido ou acima de 512 MB.');
  if(buffer[0]!==0x50||buffer[1]!==0x4b||buffer[2]!==0x03||buffer[3]!==0x04)
    throw new Error('Assinatura ZIP inválida; .darkstudio precisa ser um pacote ZIP padrão.');
  let declared=0,count=0;
  const files=unzipSync(buffer,{filter:file=>{
    count++;declared+=file.originalSize;
    if(count>MAX_FILES+2||file.originalSize>MAX_PACKAGE||declared>MAX_PACKAGE)
      throw new Error('ZIP excede limites de segurança ou tem conteúdo descompactado excessivo.');
    if(!/^(project\.json|manifest\.json|media\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp|mp4|webm|mov|mp3|wav|m4a|ogg))$/.test(file.name))
      throw new Error('Entrada não permitida no ZIP: '+file.name);
    return true;
  }});
  const projectBytes=files['project.json'],manifestBytes=files['manifest.json'];
  if(!projectBytes||!manifestBytes)throw new Error('ZIP precisa conter project.json e manifest.json.');
  const manifest=manifestSchema.parse(JSON.parse(strFromU8(manifestBytes)) as unknown);
  if(sha(projectBytes)!==manifest.projectSha256)throw new Error('Project JSON modificado no pacote.');
  const project=projectSchema.parse(JSON.parse(strFromU8(projectBytes)) as unknown);
  if(project.assets.length!==manifest.assets.length)throw new Error('Manifesto não confere com a biblioteca.');
  const byId=new Map(project.assets.map(a=>[a.id,a]));
  const used=new Set<string>(['project.json','manifest.json']);
  const assets=manifest.assets.map(entry=>{
    const asset=byId.get(entry.assetId),bytes=files[entry.filename];
    if(!asset||asset.mime!==entry.mime||asset.kind!==entry.kind||asset.name!==entry.name||!bytes)
      throw new Error('Mídia referenciada não confere: '+entry.name);
    if(used.has(entry.filename)||bytes.length!==entry.bytes||sha(bytes)!==entry.sha256)
      throw new Error('Mídia duplicada, incompleta ou corrompida: '+entry.name);
    used.add(entry.filename);
    return {entry,bytes};
  });
  if(Object.keys(files).some(k=>!used.has(k)))throw new Error('ZIP contém arquivo inesperado.');
  return {project,assets};
}
