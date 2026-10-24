/**
 * Tiny offline Foley palette. These are procedural tones/noise, NOT borrowed
 * commercial recordings. Stored locally as WAV and never sent to GitHub.
 */
export const SFX_TYPES=[
  'soft-whoosh','page-turn','document-click','ambient-pulse','positive-chime',
  'keyboard-tap','transition-sweep','notification-soft','impact-low',
] as const;
export type SfxType=typeof SFX_TYPES[number];
const RATE=16000;
const duration:Record<SfxType,number>={
  'soft-whoosh':.48,'page-turn':.64,'document-click':.16,'ambient-pulse':.95,
  'positive-chime':.9,'keyboard-tap':.24,'transition-sweep':.78,
  'notification-soft':.6,'impact-low':.52,
};
export function makeSfxWave(kind:SfxType):{wav:Buffer;durationFrames:number}{
  if(!SFX_TYPES.includes(kind))throw new Error('Efeito sonoro desconhecido.');
  const samples=Math.round(duration[kind]*RATE);
  const pcm=Buffer.alloc(samples*2);
  let seed=kind.length*137+41;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967295*2-1;};
  const fade=(t:number,attack:number,release:number)=>
    Math.min(1,t/attack,Math.max(0,(1-t)/release));
  for(let i=0;i<samples;i++){
    const t=i/RATE,x=i/samples;
    const noise=random();
    let wave=0;
    switch(kind){
      case 'soft-whoosh':wave=noise*.22*Math.sin(Math.PI*x)*Math.sin(Math.PI*x);break;
      case 'page-turn':wave=noise*.18*fade(x,.12,.28)*(1+Math.sin(35*x)*.35);break;
      case 'document-click':wave=(Math.sin(2*Math.PI*t*510)+noise*.3)*.32*Math.exp(-t*39);break;
      case 'ambient-pulse':wave=Math.sin(2*Math.PI*t*(98+12*Math.sin(t*3)))*.18*
        Math.sin(Math.PI*x)*.76;break;
      case 'positive-chime':wave=(Math.sin(2*Math.PI*660*t)+.42*Math.sin(2*Math.PI*880*t))*
        .25*Math.exp(-t*5);break;
      case 'keyboard-tap':wave=(noise*.23+Math.sin(2*Math.PI*630*t)*.13)*
        Math.exp(-t*38);break;
      case 'transition-sweep':wave=(Math.sin(2*Math.PI*(240+590*x)*t)+noise*.09)*
        .25*fade(x,.1,.3);break;
      case 'notification-soft':wave=(Math.sin(2*Math.PI*520*t)+
        Math.sin(2*Math.PI*780*t)*.4)*.19*Math.exp(-t*8);break;
      case 'impact-low':wave=Math.sin(2*Math.PI*(135-95*x)*t)*.34*Math.exp(-t*9);
    }
    const v=Math.max(-1,Math.min(1,wave));
    pcm.writeInt16LE(Math.round(v*32767),i*2);
  }
  const wav=Buffer.alloc(44+pcm.length);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);
  wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(RATE,24);
  wav.writeUInt32LE(RATE*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(pcm.length,40);
  pcm.copy(wav,44);
  return {wav,durationFrames:Math.ceil(samples*30/RATE)};
}
