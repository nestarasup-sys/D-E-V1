import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {PILOT_FRAMES,pilotBeats} from '../../../src/model/pilot';

const SAMPLE_RATE=16000;
const SAMPLES=PILOT_FRAMES*SAMPLE_RATE/30;
const AUDIO_BYTES=SAMPLES*2;
function pcmFromWave(wav:Buffer):Buffer {
  if(wav.length<44||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')
    throw new Error('A voz do Windows não gerou arquivo WAV válido.');
  let offset=12,format=0,channels=0,sampleRate=0,bits=0,payload:Buffer|undefined;
  while(offset+8<=wav.length){
    const name=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);
    const start=offset+8;
    if(start+size>wav.length)throw new Error('Arquivo WAV incompleto.');
    if(name==='fmt '){
      format=wav.readUInt16LE(start);channels=wav.readUInt16LE(start+2);
      sampleRate=wav.readUInt32LE(start+4);bits=wav.readUInt16LE(start+14);
    }
    if(name==='data')payload=wav.subarray(start,start+size);
    offset=start+size+(size%2);
  }
  if(format!==1||channels!==1||sampleRate!==SAMPLE_RATE||bits!==16||!payload)
    throw new Error('O Windows deve produzir WAV PCM mono, 16 kHz, 16 bits.');
  return payload;
}
function makeWave(data:Buffer):Buffer {
  const header=Buffer.alloc(44);
  header.write('RIFF',0);header.writeUInt32LE(data.length+36,4);
  header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);
  header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
  header.writeUInt32LE(SAMPLE_RATE,24);header.writeUInt32LE(SAMPLE_RATE*2,28);
  header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
  header.write('data',36);header.writeUInt32LE(data.length,40);
  return Buffer.concat([header,data]);
}
async function runPowerShell(folder:string,rate:number):Promise<void>{
  const script=resolve(process.cwd(),'scripts','pilot-voice.ps1');
  await new Promise<void>((done,fail)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
      '-File',script,'-InputPath',join(folder,'lines.json'),'-OutputDirectory',folder,'-Rate',String(rate)],
      {windowsHide:true,stdio:['ignore','pipe','pipe']});
    let error='',output='';
    const timer=setTimeout(()=>{child.kill();fail(new Error('A voz do Windows não respondeu em 60 segundos.'));},60000);
    child.stdout.on('data',(chunk:Buffer)=>{output+=String(chunk).slice(0,300);});
    child.stderr.on('data',(chunk:Buffer)=>{error+=String(chunk).slice(0,600);});
    child.on('error',e=>{clearTimeout(timer);fail(new Error('PowerShell indisponível: '+e.message));});
    child.on('close',code=>{
      clearTimeout(timer);
      if(code!==0)fail(new Error('Falha na voz local do Windows: '+error.trim().slice(0,400)));
      else{console.log(output.trim());done();}
    });
  });
}
export async function synthesizePilotVoice():Promise<{wav:Buffer,speechFrames:number[]}>{
  if(process.platform!=='win32')throw new Error('A narração de demonstração exige Windows com voz SAPI instalada.');
  const directory=await mkdtemp(join(tmpdir(),'dark-pilot-tts-'));
  try{
    await writeFile(join(directory,'lines.json'),JSON.stringify(pilotBeats.map(x=>x.voice)),'utf8');
    for(const rate of [2,4]){
      await runPowerShell(directory,rate);
      const merged=Buffer.alloc(AUDIO_BYTES);
      const frames:number[]=[];
      let fits=true;
      for(let i=0;i<pilotBeats.length;i++){
        const beat=pilotBeats[i];
        const pcm=pcmFromWave(await readFile(join(directory,'part-'+i+'.wav')));
        const capSamples=Math.round((beat.end-beat.start)*SAMPLE_RATE/30)-1600; // silêncio respirável de 100 ms
        if(pcm.length/2>capSamples){fits=false;break;}
        const offset=Math.round(beat.start*SAMPLE_RATE/30)*2;
        pcm.copy(merged,offset);
        frames.push(Math.max(1,Math.ceil(pcm.length/2*30/SAMPLE_RATE)));
      }
      if(fits&&frames.length===pilotBeats.length)return {wav:makeWave(merged),speechFrames:frames};
    }
    throw new Error('A narração sintetizada excede os tempos de alguns planos. Escolha uma voz mais rápida ou reescreva a locução.');
  }finally{await rm(directory,{force:true,recursive:true}).catch(()=>{});}
}
