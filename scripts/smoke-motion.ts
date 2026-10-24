/**
 * CI proof of v0.14 composition engine using a synthetic episode:
 * six 2-second plans, one from each of the 50-preset families.
 * All media is generated from validated local JSON, never real evidence.
 */
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill,renderMedia,selectComposition} from '@remotion/renderer';
import {starterProject,projectSchema,projectDuration} from '../src/model/project';
import {compileDirection} from '../src/model/direction';
import {PRESET_CATALOG} from '../src/model/presets';

async function main(){
  const start=Date.now(),directory=await mkdtemp(join(tmpdir(),'dark-motion-studio-'));
  try{
    const base=projectSchema.parse({
      ...starterProject,id:randomUUID(),name:'Demonstração de cenas vetoriais',
      visualMode:'legacy',shots:[],assets:[],clips:[],captions:[],evidence:[],
      scenes:[{...starterProject.scenes[0],id:'scene-motion-test',durationFrames:360}],
    });
    const presets=[
      'person-worker','world-city','data-bars','story-wall','explain-cutaway','youtube-intro',
    ];
    for(const id of presets)if(!PRESET_CATALOG.some(p=>p.id===id))throw Error('Preset ausente: '+id);
    const planned=compileDirection(base,{
      version:1,title:'Motion Studio — 6 composições',
      beats:presets.map((presetId,i)=>({
        startFrame:i*60,durationFrames:60,purpose:i===0?'hook':i===2?'data':'context',
        title:['O SONHO','A CIDADE','OS DADOS','AS CONEXÕES','POR DENTRO','PRÓXIMO CAPÍTULO'][i],
        subtitle:'Arte editorial ilustrativa — componentes editáveis',
        presetId,motionPreset:'still',
      })),
    },randomUUID);
    const project=planned.preview;
    if(projectDuration(project)!==360)throw Error('Duração incorreta.');
    if(project.shots.length!==6||project.shots.some(s=>s.layers.length<2))
      throw Error('Composição sem elementos reais.');
    if(planned.report.coveragePercent!==100||!planned.report.readyForEditorialReview)
      throw Error('Storyboard inválido.');
    const serveUrl=await bundle({entryPoint:resolve('src/video/index.ts')});
    const composition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:{project}});
    const hashes:string[]=[];
    for(let i=0;i<6;i++){
      const f=join(directory,'family-'+i+'.png');
      await renderStill({serveUrl,composition,inputProps:{project},frame:i*60+32,
        output:f,scale:1/3,logLevel:'error'});
      hashes.push(createHash('sha256').update(await readFile(f)).digest('hex'));
    }
    if(new Set(hashes).size!==6)throw Error('Composições visualmente indistintas.');
    // v0.15: actually rasterize nested groups, gradients, word animation, SVG, camera and a fade.
    const authorialRaw=JSON.parse(await readFile(resolve(
      'docs/examples/MOTION_ENGINE_015.direction.example.json'),'utf8')) as unknown;
    const authorial=compileDirection(base,authorialRaw,randomUUID).preview;
    if(authorial.shots[0].layers[0].kind!=='group'||
       authorial.shots[0].layers[3].kind!=='vector'||
       authorial.shots[1].transitionIn.type!=='fade')
      throw Error('Exemplo autoral nao incluiu grupos, vetor e transicao real.');
    const authorialComposition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:{project:authorial}});
    const authorialHashes:string[]=[];
    for(const frame of [4,45,120,181,225,319]){
      const output=join(directory,'motion-engine-'+frame+'.png');
      await renderStill({serveUrl,composition:authorialComposition,
        inputProps:{project:authorial},frame,output,scale:1/3,logLevel:'error'});
      authorialHashes.push(createHash('sha256').update(await readFile(output)).digest('hex'));
    }
    if(new Set(authorialHashes).size<5)
      throw Error('Motion Engine v0.15 nao produziu variacao visual suficiente.');
    const file=join(directory,'motion-studio.mp4');
    await renderMedia({serveUrl,composition,inputProps:{project},codec:'h264',
      outputLocation:file,scale:1/3,concurrency:1,logLevel:'error'});
    const mp4=await readFile(file);
    if(mp4.length<15000||!mp4.subarray(0,50).toString('latin1').includes('ftyp')||
       !mp4.includes(Buffer.from('vide')))throw Error('Render H.264 inválido.');
    console.log(JSON.stringify({
      ok:true,version:'v0.15',frames:360,seconds:12,presetCatalog:PRESET_CATALOG.length,
      recipesRendered:presets,distinctFrames:new Set(hashes).size,authorialFrames:new Set(authorialHashes).size,
      authorialSceneKinds:authorial.shots[0].layers.map(l=>l.kind),
      totalLayers:project.shots.reduce((n,s)=>n+s.layers.length,0),
      mp4Bytes:(await stat(file)).size,renderWallSeconds:Math.round((Date.now()-start)/1000),
      note:'Runner CI a 640x360: 6 presets + 6 frames autorais. Não equivale à prévia interativa, áudio ou desempenho do PC do usuário.',
    },null,2));
  }finally{await rm(directory,{recursive:true,force:true}).catch(()=>{});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
