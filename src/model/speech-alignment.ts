/** Convert native SAPI SpeakProgress samples to true per-word frame ranges.
 * No proportional word-duration estimates. If native timing is incomplete,
 * keep the full phrase as a caption and report alignment unavailable.
 */
export type AcousticWord={text:string;startFrame:number;endFrame:number};
export type WordAlignment={status:'aligned'|'unavailable';words:AcousticWord[];coverage:number;reason:string};
const words=/\S+/gu;
function tokens(text:string){
  return [...text.matchAll(words)].map(m=>({text:m[0],from:m.index,to:m.index+m[0].length}));
}
export function alignSpeechProgress(text:string,tsv:string,audioFrames:number):WordAlignment{
  const all=tokens(text),failure=(reason:string,coverage=0):WordAlignment=>({
    status:'unavailable',words:[],coverage,reason,
  });
  if(!Number.isInteger(audioFrames)||audioFrames<1||!all.length)return failure('Áudio ou roteiro inválido.');
  const events=tsv.trim().split(/\r?\n/).filter(Boolean).map(line=>{
    const [from,length,ms]=line.split('\t').map(Number);
    return {from,length,ms};
  }).filter(e=>Number.isInteger(e.from)&&Number.isInteger(e.length)&&e.length>0&&
    Number.isFinite(e.ms)&&e.ms>=0&&e.ms<=(audioFrames/30+1)*1000)
    .sort((a,b)=>a.from-b.from||a.ms-b.ms);
  if(!events.length)return failure('A voz SAPI não emitiu eventos SpeakProgress.');
  // CharacterPosition uses UTF-16 indices, matching JS string offsets.
  const matched=new Map<number,number>();
  for(const e of events){
    const index=all.findIndex(t=>e.from>=t.from&&e.from<t.to);
    if(index<0||matched.has(index))continue;
    matched.set(index,Math.round(e.ms*30/1000));
  }
  const coverage=matched.size/all.length;
  if(coverage<.85)return failure(
    'Eventos acústicos insuficientes ('+Math.round(coverage*100)+'% das palavras).',coverage);
  // For complete word-by-word highlighting, do not silently invent missing word positions.
  if(matched.size!==all.length)return failure(
    'Algumas palavras não tiveram posição acústica; legenda mantida por frase.',coverage);
  const positions=all.map((_,i)=>matched.get(i)!);
  if(positions.every(p=>p===0))return failure('A voz SAPI retornou timestamps zerados.',coverage);
  const output:AcousticWord[]=[];
  for(let i=0;i<all.length;i++){
    const startFrame=Math.max(output.at(-1)?.endFrame??0,positions[i]);
    const next=Math.min(audioFrames,positions[i+1]??audioFrames);
    const endFrame=Math.max(startFrame+1,next);
    if(startFrame>=audioFrames||endFrame>audioFrames)
      return failure('As palavras são rápidas demais para quadros individuais a 30 FPS.',coverage);
    output.push({text:all[i].text.slice(0,80),startFrame,endFrame});
  }
  return {status:'aligned',words:output,coverage:1,reason:'Posições obtidas de eventos reais SpeakProgress da voz SAPI.'};
}
export function matchSpokenWord(words:readonly AcousticWord[],search:string,occurrence=1):number|null{
  const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
  const requested=normalize(search);
  if(!requested||occurrence<1)return null;
  let found=0;
  for(const word of words){
    if(normalize(word.text)===requested&&++found===occurrence)return word.startFrame;
  }
  return null;
}
