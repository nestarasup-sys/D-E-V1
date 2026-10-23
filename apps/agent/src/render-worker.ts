import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {projectSchema} from '../../../src/model/project';
import {DATA_ROOT} from './media';
import type {JobStatus} from './export';

const id=process.argv[2];if(!/^[0-9a-f-]{36}$/.test(id||''))throw new Error('ID de exportação inválido');
const jobs=join(DATA_ROOT,'jobs');const statusPath=join(jobs,id+'.status.json');
const update=async(state:JobStatus['state'],progress:number,extra:Partial<JobStatus>={})=>{
  await writeFile(statusPath,JSON.stringify({id,state,progress,...extra} satisfies JobStatus),'utf8');
};
try{
  const project=projectSchema.parse(JSON.parse(await readFile(join(jobs,id+'.input.json'),'utf8')));
  await update('bundling',0);
  const serveUrl=await bundle({entryPoint:resolve(process.cwd(),'src/video/index.ts')});
  const props={project};
  const composition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:props});
  const outDir=join(homedir(),'Videos','DarkStudio');await mkdir(outDir,{recursive:true});
  const label=project.name.normalize('NFKD').replace(/[^\w-]+/g,'-').slice(0,50)||'documentario';
  const outputPath=join(outDir,`${label}-${id.slice(0,8)}.mp4`);
  await update('rendering',0);
  let last=-1;
  await renderMedia({composition,serveUrl,inputProps:props,codec:'h264',outputLocation:outputPath,concurrency:1,onProgress:({progress})=>{
    const percent=Math.floor(progress*100);
    if(percent>last&&percent%2===0){last=percent;void update('rendering',progress).catch(()=>{});}
  }});
  await update('completed',1,{outputPath});
}catch(e){await update('failed',0,{error:e instanceof Error?e.message:String(e)});process.exitCode=1;}
