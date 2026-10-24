/** Offline, rights-safe procedural underscore + semantic sound effects.
 * Every event anchored to a real SAPI word, not a guessed word timestamp.
 */
import {makeSfxWave,type SfxType} from './sfx';
import {importGeneratedWave,rollbackArchiveMedia} from './media';
import {matchSpokenWord} from '../../../src/model/speech-alignment';
import {type AIProduction,type NarratedAudio,type ProducedSound} from '../../../src/model/ai-production';

type Mood='documentary'|'tension'|'hope'|'calm';
const RATE=16000;
const palette:Record<Mood,readonly number[]>={
  documentary:[110,164.81,220,261.63],
  tension:[82.41,123.47,164.81,185],
  hope:[130.81,164.81,196,261.63],
  calm:[98,146.83,196,246.94],
};
/** PCM bed with chord progression, equal-power fades and slow harmonic variations. */
export function makeMusicWave(frames:number,mood:Mood):Buffer{
  if(!Number.isInteger(frames)||frames<1||frames>1800)throw Error('Duração musical inválida.');
  const samples=Math.ceil(frames*RATE/30);
  const pcm=Buffer.alloc(samples*2),tones=palette[mood];
  for(let n=0;n<samples;n++){
    const time=n/RATE,progress=n/Math.max(1,samples-1);
    const fade=Math.min(1,time/.6,Math.max(0,(samples/RATE-time)/.7));
    const chord=tones[Math.floor(time/4)%tones.length],other=tones[(Math.floor(time/4)+2)%tones.length];
    const shimmer=Math.sin(Math.PI*2*time*.12)*.025;
    const wave=(Math.sin(2*Math.PI*chord*time)*.44+
      Math.sin(2*Math.PI*(chord/2)*time)*.26+
      Math.sin(2*Math.PI*other*time)*.22+
      Math.sin(2*Math.PI*(other*2)*time)*.08);
    pcm.writeInt16LE(Math.round(32767*Math.max(-1,Math.min(1,wave*(.30+shimmer)*fade))),n*2);
  }
  const wav=Buffer.alloc(pcm.length+44);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(RATE,24);wav.writeUInt32LE(RATE*2,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
  return wav;
}
const semantic:Record<string,SfxType>={
  dinheiro:'document-click',salario:'notification-soft',preco:'impact-low',
  precos:'impact-low',contas:'page-turn',divida:'impact-low',
  dividas:'impact-low',mudanca:'transition-sweep',alerta:'notification-soft',
  conquista:'positive-chime',trabalho:'keyboard-tap',documento:'page-turn',
};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]/g,'');
function inferMood(text:string):Mood{
  if(/\b(alerta|divida|crise|risco|inflacao|problema|perda)\b/.test(normalize(text).replace(/\W+/g,' ')))
    return 'tension';
  if(/\b(conquista|esperanca|solucao|crescimento|melhora)\b/.test(normalize(text).replace(/\W+/g,' ')))
    return 'hope';
  return 'documentary';
}
export interface SoundtrackResult{sounds:ProducedSound[];warnings:string[]}
export async function synthesizeSoundtrack(source:AIProduction,
  narrated:NarratedAudio[]):Promise<SoundtrackResult>{
  const sounds:ProducedSound[]=[],warnings:string[]=[];
  const ids:string[]=[];
  try{
    for(let i=0;i<source.beats.length;i++){
      const beat=source.beats[i],audio=narrated[i];
      if(!audio)throw Error('Narração não foi gerada para o bloco '+(i+1));
      if(source.soundDesign==='off')continue;
      const music=beat.music??(source.soundDesign==='auto'?{
        mood:inferMood(beat.narration),volume:.18,ducking:.24,
      }:null);
      const fullFrames=Math.max(15,audio.frames+Math.round(source.voice.pauseMs*.03));
      if(music){
        const wav=makeMusicWave(fullFrames,music.mood);
        const asset=await importGeneratedWave(wav,{name:'trilha-procedural-'+(i+1)+'.wav',
          durationFrames:fullFrames});
        ids.push(asset.id);
        sounds.push({beatIndex:i,asset:{...asset,rights:{
          status:'cleared',sourceUrl:'',creator:'Dark Studio',licenseName:'Dark Studio Procedural Audio',
          notes:'Música sintetizada localmente por osciladores (sem gravações externas).',
          attribution:'Trilha procedural: Dark Studio',redistributionAllowed:true,
        }},frames:fullFrames,lane:'music',volume:music.volume,ducking:music.ducking});
      }
      const requested=beat.soundEffects.length?beat.soundEffects:
        source.soundDesign==='auto'?
          (audio.alignment?.words??[]).flatMap(w=>{
            const sound=semantic[normalize(w.text)];
            return sound?[{sound,word:normalize(w.text),occurrence:1,offsetFrames:0,volume:.27}]:[];
          }).slice(0,2):[];
      for(const cue of requested){
        const pos=matchSpokenWord(audio.alignment?.words??[],cue.word,cue.occurrence);
        if(pos===null){
          warnings.push('Fala '+(i+1)+': efeito '+cue.sound+
            ' não aplicado — palavra "'+cue.word+'" não foi alinhada acusticamente.');
          continue;
        }
        const effect=makeSfxWave(cue.sound);
        const asset=await importGeneratedWave(effect.wav,{name:'sfx-'+cue.sound+'-'+i+'-'+ids.length+'.wav',
          durationFrames:effect.durationFrames});
        ids.push(asset.id);
        sounds.push({beatIndex:i,asset:{...asset,rights:{
          status:'cleared',sourceUrl:'',creator:'Dark Studio',licenseName:'Dark Studio Procedural Audio',
          notes:'Efeito criado por síntese local; cue obtida de timestamp acústico.',
          attribution:'Efeito procedural: Dark Studio',redistributionAllowed:true,
        }},frames:effect.durationFrames,lane:'sfx',word:cue.word,
          occurrence:cue.occurrence,offsetFrames:cue.offsetFrames,volume:cue.volume});
      }
    }
    return {sounds,warnings};
  }catch(e){
    for(const id of ids)await rollbackArchiveMedia(id).catch(()=>{});
    throw e;
  }
}
export async function rollbackSoundtrack(sounds:readonly ProducedSound[]){
  for(const sound of sounds)await rollbackArchiveMedia(sound.asset.id).catch(()=>{});
}
