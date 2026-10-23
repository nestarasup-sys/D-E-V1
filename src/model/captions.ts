import {captionSchema,type Caption} from './project';

const MAX_SRT_BYTES=500_000;
function toMilliseconds(time:string){
  const match=/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(time.trim());
  if(!match)throw new Error('Timestamp SRT inválido: '+time);
  const values=match.slice(1).map(Number);
  const [h,m,s,ms]=values;
  if(m>59||s>59)throw new Error('Minutos/segundos inválidos no SRT.');
  return ((h*60+m)*60+s)*1000+ms;
}
/** Importa legendas com timestamps; NÃO faz reconhecimento automático da voz. */
export function parseSrt(text:string,fps:number,maxFrames:number,makeId:()=>string):Caption[]{
  if(new TextEncoder().encode(text).length>MAX_SRT_BYTES)throw new Error('Arquivo SRT acima de 500 KB.');
  const blocks=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/);
  if(blocks.length>3000)throw new Error('Máximo de 3000 legendas.');
  if(!text.trim())throw new Error('SRT vazio.');
  const captions:Caption[]=[];
  for(const block of blocks){
    const lines=block.trim().split('\n');
    if(/^\d+$/.test(lines[0].trim()))lines.shift();
    const timing=lines.shift();
    const match=timing?.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})(?:\s+.*)?$/);
    if(!match||!lines.length)throw new Error('Bloco SRT inválido, verifique tempo e texto.');
    const startFrame=Math.round(toMilliseconds(match[1])*fps/1000);
    const endFrame=Math.round(toMilliseconds(match[2])*fps/1000);
    if(endFrame<=startFrame||startFrame<0||endFrame>maxFrames)throw new Error('Legenda ultrapassa a duração do projeto.');
    const previous=captions[captions.length-1];
    if(previous&&startFrame<previous.endFrame)throw new Error('SRT com legendas sobrepostas ou fora de ordem.');
    captions.push(captionSchema.parse({id:makeId(),startFrame,endFrame,text:lines.join('\n').trim()}));
  }
  return captions;
}
export function exportSrt(captions:readonly Caption[],fps:number):string{
  function format(frame:number){
    const ms=Math.round(frame*1000/fps);
    const hours=Math.floor(ms/3600000);
    const mins=Math.floor(ms/60000)%60;
    const secs=Math.floor(ms/1000)%60;
    return [hours,mins,secs].map(v=>String(v).padStart(2,'0')).join(':')+','+String(ms%1000).padStart(3,'0');
  }
  return [...captions].sort((a,b)=>a.startFrame-b.startFrame)
    .map((c,i)=>String(i+1)+'\n'+format(c.startFrame)+' --> '+format(c.endFrame)+'\n'+c.text+'\n').join('\n');
}
