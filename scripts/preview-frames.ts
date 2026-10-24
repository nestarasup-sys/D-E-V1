/**
 * Codex local can inspect representative scene frames without rendering 5 minutes.
 * Cached by SHA-256 project revision; all generated files stay in the user's home.
 *
 * npm run preview:frames -- <project-uuid> 0,75,150,225
 * Scale 1/3 = 640x360; concurrency one for 16 GiB memory Windows machines.
 */
import {mkdir,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import {ProjectRepository} from '../apps/agent/src/project-store';
import {projectDuration} from '../src/model/project';
import {assertServiceCompatibility} from '../src/model/service-contract';

async function main(){
  const id=process.argv[2],range=process.argv[3]||'';
  if(!id)throw new Error('Informe o UUID do projeto.');
  const {project,revision}=await new ProjectRepository().read(id);
  let service:Response;
  try{service=await fetch('http://127.0.0.1:4317/health',{signal:AbortSignal.timeout(3000)});}
  catch{throw new Error('Inicie o serviço local pelo BAT atualizado antes de gerar frames com mídia.');}
  if(!service.ok)throw new Error('Serviço local incompatível ou desligado.');
  assertServiceCompatibility(await service.json() as unknown);
  const duration=projectDuration(project);
  let frames:number[];
  if(range.trim()){
    frames=range.split(',').map(x=>Number(x.trim()));
    if(frames.some(n=>!Number.isInteger(n)||n<0||n>=duration))
      throw new Error('Cada frame deve ser um inteiro de 0 a '+(duration-1));
  }else{
    frames=Array.from({length:Math.min(10,Math.ceil(duration/90))},(_,i)=>
      Math.min(duration-1,Math.floor((i+.5)*duration/Math.min(10,Math.ceil(duration/90)))));
  }
  frames=[...new Set(frames)];
  if(frames.length>24)throw new Error('No máximo 24 frames por operação para proteger memória.');
  const outputDir=join(homedir(),'DarkStudio','previews',id,revision);
  await mkdir(outputDir,{recursive:true});
  let toDo=frames;
  const cached=await Promise.all(frames.map(async frame=>{
    try{return (await stat(join(outputDir,'frame-'+frame+'.png'))).size>1000;}
    catch{return false;}
  }));
  toDo=frames.filter((_,i)=>!cached[i]);
  if(toDo.length){
    const serveUrl=await bundle({entryPoint:resolve('src/video/index.ts')});
    const composition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:{project}});
    for(const frame of toDo){
      await renderStill({serveUrl,composition,inputProps:{project},frame,
        output:join(outputDir,'frame-'+frame+'.png'),scale:1/3,logLevel:'error'});
    }
  }
  console.log(JSON.stringify({
    projectId:id,revision,frames,generated:toDo.length,cached:frames.length-toDo.length,
    localDirectory:outputDir,outputResolution:'640x360',
    note:'Somente amostras de quadros. Não comprova áudio nem fluidez do episódio.',
  },null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
