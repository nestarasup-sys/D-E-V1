/** End-to-end Windows SAPI test: ChatGPT JSON -> real WAV -> frames -> editable project. */
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {assertServiceCompatibility} from '../src/model/service-contract';
import {projectSchema} from '../src/model/project';

const root=await mkdtemp(join(tmpdir(),'darkstudio-ai18-'));
const base='http://127.0.0.1:4317';
const worker=spawn(process.execPath,['--import','tsx','apps/agent/src/index.ts'],{
  cwd:resolve(process.cwd()),windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,DARK_STUDIO_PROJECTS_DIR:join(root,'projects'),
    DARK_STUDIO_DATA_ROOT:join(root,'data')},
});
let log='';
for(const stream of [worker.stdout,worker.stderr])stream.on('data',(b:Buffer)=>{
  log=(log+String(b)).slice(-4000);
});
async function call(path:string,init?:RequestInit){
  const response=await fetch(base+path,init);
  const data=await response.json() as Record<string,unknown>;
  if(!response.ok)throw new Error(path+' HTTP '+response.status+': '+String(data.error));
  return data;
}
const post=(value:unknown):RequestInit=>({method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{assertServiceCompatibility(await call('/health'));ready=true;break;}
    catch{if(worker.exitCode!==null)break;await new Promise(r=>setTimeout(r,200));}
  }
  if(!ready)throw new Error('Serviço não iniciou: '+log);
  const available=await call('/v1/productions/voices');
  const voices=available.voices as Array<{name:string}>|undefined;
  if(!voices?.length)throw new Error('Windows CI sem voz SAPI de teste');
  const plan={
    format:'darkstudio-production',version:1,title:'Teste audiovisual v0.18',
    soundDesign:'explicit',
    voice:{engine:'windows-sapi',voice:voices[0].name,rate:3,pauseMs:200},
    beats:[{
      title:'Salário',narration:'O salário chegou hoje.',plannedFrames:150,
      music:{mood:'documentary',volume:.2,ducking:.25},
      soundEffects:[{sound:'document-click',word:'salário'}],
      purpose:'hook',motionPreset:'still',
      layers:[{kind:'text',name:'Título',text:'SALÁRIO',x:150,y:200,width:1300,height:210,
        wordCue:{word:'salário'}}],
    },{
      title:'Resposta',narration:'Os fatos ajudam a compreender.',plannedFrames:120,
      purpose:'conclusion',motionPreset:'still',
      layers:[{kind:'character',name:'Apresentador',x:300,y:240,width:370,height:690}],
      broll:{query:'city people walking',description:'Trabalhadores na cidade',purpose:'Contexto',
        provider:'pexels',licenseNote:'requer análise de licença'},
    }],
  };
  const result=await call('/v1/productions/validate',post(plan));
  if(result.valid!==true)throw Error('JSON não passou na validação.');
  const imported=await call('/v1/productions/import',post(plan));
  const project=projectSchema.parse(imported.project);
  if(project.clips.filter(c=>c.lane==='narration').length!==2||
    project.captions.length!==2||project.shots.length!==2||
    project.scenes.length!==2||project.visualMode!=='shots')
    throw Error('Importação não criou produção audiovisual completa.');
  if(project.shots[0].layers[0].kind!=='text'||project.shots[1].mediaPlan?.query!=='city people walking')
    throw Error('O projeto não preservou as camadas ou o B-roll planejado.');
  if(project.scenes[0].durationFrames===150)
    throw Error('A cena manteve tempo fictício em vez de medir o áudio.');
  if(project.captions[0].words.length<3)
    throw Error('SAPI não retornou alinhamento acústico por palavra: '+JSON.stringify(
      project.productionPlan?.segments.map(s=>s.wordAlignment)));
  if(project.shots[0].layers[0].cueWord!=='salário')
    throw Error('Animação por palavra não foi montada.');
  if(!project.clips.some(c=>c.lane==='sfx')||!project.clips.some(c=>c.lane==='music'))
    throw Error('Trilha e SFX semânticos não foram criados na timeline.');
  const fx=project.clips.find(c=>c.lane==='sfx')!;
  const word=project.captions[0].words.find(w=>w.text.toLowerCase().includes('salário'))!;
  if(Math.abs(fx.startFrame-word.startFrame)>1)
    throw Error('Efeito sonoro não está no timestamp real da palavra.');
  for(const clip of project.clips.filter(c=>c.lane==='narration')){
    const asset=project.assets.find(a=>a.id===clip.assetId);
    if(!asset)throw Error('Clipe de voz sem WAV real.');
    const response=await fetch(asset.url);
    if(!response.ok)throw Error('WAV não existe na biblioteca.');
    const first=Buffer.from(await response.arrayBuffer());
    if(first.toString('ascii',0,4)!=='RIFF')throw Error('WAV não contém RIFF');
  }
  const updated=await call('/v1/productions/'+project.id+'/regenerate',{
    ...post({voice:{voice:voices[0].name,rate:0,pauseMs:350}}),
    headers:{'Content-Type':'application/json','If-Match':String(imported.revision)},
  });
  const regenerated=projectSchema.parse(updated.project);
  if(regenerated.shots[0].id!==project.shots[0].id||
    regenerated.shots[0].layers[0].id!==project.shots[0].layers[0].id)
    throw Error('Regeneração destruiu objetos editáveis.');
  if(regenerated.clips.some(c=>project.clips.some(old=>old.assetId===c.assetId)))
    throw Error('Regeneração manteve o WAV antigo na timeline.');
  console.log('AI PRODUCTION SMOKE OK: JSON, voz WAV real, sincronização, fallback B-roll e revoz.');
}finally{
  worker.kill();
  await new Promise<void>(resolveWait=>{
    if(worker.exitCode!==null){resolveWait();return;}
    worker.once('close',()=>resolveWait());
    setTimeout(()=>resolveWait(),3500).unref();
  });
  await rm(root,{recursive:true,force:true}).catch(()=>{});
}
