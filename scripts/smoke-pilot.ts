/**
 * Teste AV real do primeiro corte vNext, executado em Windows CI.
 * Gera fala via SAPI do próprio Windows, renders 900f usando a mesma
 * composição Documentary do desktop e confirma mudança visual + áudio.
 * Não envia documentos do usuário nem salva WAV/MP4 no repositório Git.
 */
import {createHash,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir,totalmem} from 'node:os';
import {join,resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill,renderMedia,selectComposition} from '@remotion/renderer';
import {synthesizePilotVoice} from '../apps/agent/src/pilot-audio';
import {buildPilotProject,pilotBeats,PILOT_FRAMES} from '../src/model/pilot';
import {projectSchema} from '../src/model/project';
import {compileDirection} from '../src/model/direction';

async function main(){
  if(process.platform!=='win32')throw new Error('Smoke audiovisual completo requer voz Windows SAPI.');
  const started=Date.now();
  const directory=await mkdtemp(join(tmpdir(),'dark-studio-pilot-test-'));
  const voice=await synthesizePilotVoice();
  const assetId=randomUUID();
  const asset={id:assetId,kind:'audio' as const,mime:'audio/wav',name:'narracao-piloto.wav',
    url:'http://127.0.0.1:4317/media/'+assetId,durationFrames:PILOT_FRAMES};
  const syntheticSourceId=randomUUID();
  const project=projectSchema.parse({
    ...buildPilotProject({newId:randomUUID,voiceAsset:asset,speechFrames:voice.speechFrames}),
    evidence:[{id:syntheticSourceId,claim:'Valores sintéticos para testar barras negativas',
      sourceTitle:'Amostra sintética de laboratório — não publicar',
      sourceUrl:'',notes:'Exemplo técnico, não é dado factual',reviewStatus:'pending'}],
  });
  if(project.shots.length!==8||project.clips.length!==1||project.captions.length!==8)
    throw new Error('Piloto incompleto: esperado 8 planos, 8 legendas e 1 narração.');
  // Segunda gramática visual: arquivo investigativo, documentos ilustrativos,
  // gráficos sem dados inventados, comparação e esquema. O áudio/legenda são idênticos.
  const templates=['dossier','document','chart','comparison','map','evidence','lower-third','chapter'] as const;
  const purposes=['hook','proof','data','contrast','location','proof','transition','conclusion'] as const;
  const director=compileDirection(project,{version:1,title:'Piloto visual investigativo',
    beats:pilotBeats.map((beat,i)=>({
      startFrame:beat.start,durationFrames:beat.end-beat.start,
      purpose:purposes[i],style:templates[i],title:beat.title,
      subtitle:beat.subtitle,motionPreset:'subtle-zoom',
      investigation:{representation:'illustration',
        excerpt:'Exemplo ilustrativo — nenhum documento real é simulado como prova.',
        highlight:'Exemplo ilustrativo',
        locationLabels:['ORIGEM','REVISÃO','PUBLICAÇÃO'],
        ...(i===2?{sourceEvidenceId:syntheticSourceId,unit:'un. de teste',
          points:[{label:'Cenário ilustrativo A',value:-2},{label:'Cenário ilustrativo B',value:3}]}:{})},
    })),
  },randomUUID);
  const directed=director.preview;
  if(directed.clips.length!==project.clips.length||directed.captions.length!==project.captions.length)
    throw new Error('Direção visual alterou a sincronização audiovisual.');
  const server=createServer((req,res)=>{
    if(req.url!=='/media/'+assetId){res.writeHead(404);res.end();return;}
    const size=voice.wav.length;
    const range=req.headers.range;
    let start=0,end=size-1,status=200;
    if(range){
      const parsed=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!parsed){res.writeHead(416);res.end();return;}
      start=parsed[1]?Number(parsed[1]):0;
      end=parsed[2]?Math.min(size-1,Number(parsed[2])):size-1;
      if(start> end||start>=size){res.writeHead(416);res.end();return;}
      status=206;
      res.setHeader('Content-Range','bytes '+start+'-'+end+'/'+size);
    }
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Accept-Ranges','bytes');
    res.setHeader('Access-Control-Allow-Origin','*');
    res.writeHead(status,{'Content-Length':end-start+1});
    if(req.method==='HEAD'){res.end();return;}
    res.end(voice.wav.subarray(start,end+1));
  });
  try{
    await new Promise<void>((done,fail)=>{
      server.once('error',fail);
      server.listen(4317,'127.0.0.1',()=>done());
    });
    const serveUrl=await bundle({entryPoint:resolve('src/video/index.ts')});
    const composition=await selectComposition({serveUrl,id:'DarkStudio',inputProps:{project:directed}});
    if(composition.durationInFrames!==900)throw Error('Composição não tem exatamente 900 frames.');
    const hashes:string[]=[];
    for(const beat of pilotBeats){
      const file=join(directory,'frame-'+beat.start+'.png');
      await renderStill({
        serveUrl,composition,inputProps:{project:directed},
        frame:beat.start+Math.floor((beat.end-beat.start)/2),
        output:file,scale:1/3,logLevel:'error',
      });
      hashes.push(createHash('sha256').update(await readFile(file)).digest('hex'));
    }
    const different=new Set(hashes).size;
    if(different<6)throw new Error('Planos pouco distintos: só '+different+' frames diferentes de 8.');
    const file=join(directory,'piloto-30s.mp4');
    await renderMedia({serveUrl,composition,inputProps:{project:directed},
      codec:'h264',outputLocation:file,scale:1/3,
      concurrency:2,logLevel:'error'});
    const mp4=await readFile(file);
    if(mp4.length<30000||!mp4.subarray(0,48).toString('latin1').includes('ftyp'))
      throw new Error('MP4 do piloto vazio ou inválido.');
    if(!mp4.includes(Buffer.from('soun'))||!mp4.includes(Buffer.from('vide')))
      throw new Error('MP4 precisa conter faixas de áudio e vídeo.');
    console.log(JSON.stringify({
      ok:true,mode:'investigation',durationSeconds:30,frames:900,shots:directed.shots.length,
      narrationWavBytes:voice.wav.length,captionCount:project.captions.length,
      distinctFrameSamples:different,directionWarnings:director.report.issues.length,mp4Bytes:(await stat(file)).size,
      wallSeconds:Math.round((Date.now()-started)/1000),
      runnerMemoryGiB:Math.round(totalmem()/1024**3*10)/10,
      note:'Resultado de CI, não é benchmark Ryzen 5 4600G/RX 7600 nem teste de janela Tauri.',
    },null,2));
  }finally{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await rm(directory,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
