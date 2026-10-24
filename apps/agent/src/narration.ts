/** Windows SAPI TTS for arbitrary audiovisual projects. Local WAV files; never fake narration. */
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {importGeneratedWave,rollbackArchiveMedia} from './media';
import {type NarratedAudio,type AIProduction} from '../../../src/model/production';

export interface LocalVoice {name:string;culture:string;gender:string}
async function invoke(args:string[],timeout=480000){
  if(process.platform!=='win32')throw new Error('TTS Windows SAPI só funciona no Windows. Nenhum áudio fictício foi gerado.');
  return new Promise<string>((ok,fail)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy',
      'Bypass','-File',resolve('scripts/tts-production.ps1'),...args],
      {windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';let done=false;
    const timer=setTimeout(()=>{
      if(done)return;done=true;child.kill();fail(new Error('TTS excedeu o tempo limite.'));
    },timeout);
    child.stdout.on('data',(d:Buffer)=>{stdout=(stdout+String(d)).slice(-15000);});
    child.stderr.on('data',(d:Buffer)=>{stderr=(stderr+String(d)).slice(-3000);});
    child.on('error',e=>{if(done)return;done=true;clearTimeout(timer);fail(e);});
    child.on('close',code=>{if(done)return;done=true;clearTimeout(timer);
      if(code===0)ok(stdout.trim());
      else fail(new Error('Falha no TTS do Windows: '+(stderr||stdout).slice(-650)));
    });
  });
}
export async function listLocalVoices():Promise<LocalVoice[]>{
  const result=JSON.parse(await invoke(['-Action','List'],20000)) as {voices:LocalVoice[]};
  return Array.isArray(result.voices)?result.voices:[];
}
export function wavFrames(wav:Buffer):number{
  if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
    throw new Error('TTS não produziu WAV RIFF válido.');
  let pos=12,format=0,channels=0,bits=0,rate=0,samples=-1;
  while(pos+8<=wav.length){
    const chunk=wav.toString('ascii',pos,pos+4);
    const size=wav.readUInt32LE(pos+4),start=pos+8;
    if(start+size>wav.length)throw new Error('WAV da narração incompleto.');
    if(chunk==='fmt '&&size>=16){
      format=wav.readUInt16LE(start);channels=wav.readUInt16LE(start+2);
      rate=wav.readUInt32LE(start+4);bits=wav.readUInt16LE(start+14);
    }
    if(chunk==='data')samples=size/2;
    pos=start+size+(size&1);
  }
  if(format!==1||channels!==1||bits!==16||rate!==16000||samples<1)
    throw new Error('A voz deve gerar WAV PCM mono, 16 kHz, 16 bits.');
  return Math.ceil(samples*30/rate);
}
export async function synthesizeNarration(source:AIProduction):Promise<NarratedAudio[]>{
  const folder=await mkdtemp(join(tmpdir(),'darkstudio-narration-'));
  const imported:string[]=[];
  try{
    await writeFile(join(folder,'lines.json'),
      JSON.stringify(source.beats.map(b=>b.narration)),'utf8');
    const voice=source.voice;
    await invoke(['-Action','Synthesize','-InputPath',join(folder,'lines.json'),
      '-OutputDirectory',folder,'-Rate',String(voice.rate),
      ...(voice.voice?['-VoiceName',voice.voice]:[])],Math.max(60000,source.beats.length*45000));
    const results:NarratedAudio[]=[];
    for(let i=0;i<source.beats.length;i++){
      const wav=await readFile(join(folder,'part-'+i+'.wav'));
      const frames=wavFrames(wav);
      if(frames>1799)throw new Error('Fala '+(i+1)+' excede 60s. Divida o texto em mais cenas.');
      const asset=await importGeneratedWave(wav,{
        name:'narracao-'+String(i+1).padStart(3,'0')+'-'+Date.now()+'.wav',durationFrames:frames,
      });
      imported.push(asset.id);
      results.push({asset,frames});
    }
    return results;
  }catch(e){
    for(const id of imported)await rollbackArchiveMedia(id).catch(()=>{});
    throw e;
  }finally{await rm(folder,{recursive:true,force:true}).catch(()=>{});}
}
export async function rollbackNarration(audio:readonly NarratedAudio[]){
  for(const item of audio)await rollbackArchiveMedia(item.asset.id).catch(()=>{});
}
