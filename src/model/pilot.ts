import {projectSchema,type Asset,type Project} from './project';
import {type Shot,type Motion} from './shots';

export const PILOT_FPS=30;
export const PILOT_FRAMES=900;
export const pilotBeats=[
  {start:0,end:96,style:'chapter',title:'O QUE MUDA UMA HISTÓRIA?',subtitle:'Uma sequência-piloto sobre ritmo e informação.',voice:'Toda história começa com uma pergunta.'},
  {start:96,end:201,style:'split',title:'UMA IMAGEM',subtitle:'O olhar escolhe onde prestar atenção.',voice:'O primeiro plano apresenta uma ideia.'},
  {start:201,end:309,style:'headline',title:'UM DETALHE',subtitle:'O enquadramento muda a leitura.',voice:'Um detalhe pode mudar o sentido.'},
  {start:309,end:405,style:'number',title:'02—05s',subtitle:'Uma referência de ritmo, nunca uma regra.',voice:'Ritmo não é velocidade a qualquer custo.'},
  {start:405,end:513,style:'timeline',title:'TEMPO E CONTEXTO',subtitle:'Dados precisam ser mostrados com cuidado.',voice:'Informação precisa de contexto e tempo.'},
  {start:513,end:624,style:'quote',title:'QUEM CONFIRMA?',subtitle:'Fontes e evidências vêm antes da conclusão.',voice:'Cada afirmação pede uma fonte verificável.'},
  {start:624,end:750,style:'split',title:'A NARRATIVA RESPIRA',subtitle:'A pausa faz parte da montagem.',voice:'Uma pausa também pode contar a história.'},
  {start:750,end:900,style:'chapter',title:'PRÓXIMO CAPÍTULO',subtitle:'Do roteiro à edição, plano por plano.',voice:'Agora a próxima parte está pronta para começar.'},
] as const;
const backgrounds=['#0b1526','#172035','#131e2c','#1a172a','#101d30','#241926','#10272d','#0b1424'];
const colors=['#f0bb66','#82c7da','#efa878','#f0bb66','#78c7e0','#e4a1ad','#a8ddbf','#f0bb66'];
function easingMotion(duration:number,kind:number):Motion {
  const move:Motion={
    x:[],y:[],scale:[],rotation:[],opacity:[],
  };
  const end=duration-1;
  const fade=Math.min(12,Math.max(1,Math.round(duration*.12)));
  move.opacity=[
    {frame:0,value:0,easing:'ease-out'},
    {frame:fade,value:1,easing:'linear'},
    {frame:end,value:1,easing:'linear'},
  ];
  move.scale=[
    {frame:0,value:kind%3===0?1.06:1.0,easing:'ease-in-out'},
    {frame:end,value:kind%3===0?1.0:1.11,easing:'linear'},
  ];
  if(kind%3===1)move.x=[{frame:0,value:-2,easing:'ease-in-out'},{frame:end,value:2,easing:'linear'}];
  if(kind%3===2)move.y=[{frame:0,value:2,easing:'ease-out'},{frame:end,value:-2,easing:'linear'}];
  return move;
}
export function buildPilotProject(options:{
  newId:()=>string;
  voiceAsset?:Asset;
  speechFrames?:readonly number[];
}):Project {
  const uuid=options.newId;
  if(options.speechFrames && options.speechFrames.length!==pilotBeats.length)
    throw new Error('Piloto precisa de 8 durações de narração.');
  const scenes=[
    {id:'pilot-scene-'+uuid(),kind:'title' as const,title:'A pergunta',subtitle:'Abertura e enquadramento',kicker:'CAPÍTULO 01',durationFrames:309,accentColor:'#f0bb66',backgroundColor:'#101b2c',imageUrl:''},
    {id:'pilot-scene-'+uuid(),kind:'quote' as const,title:'Informação e ritmo',subtitle:'As fontes e a intenção',kicker:'CAPÍTULO 02',durationFrames:315,accentColor:'#82c7da',backgroundColor:'#101b2c',imageUrl:''},
    {id:'pilot-scene-'+uuid(),kind:'title' as const,title:'O próximo passo',subtitle:'Continuidade e conclusão',kicker:'CAPÍTULO 03',durationFrames:276,accentColor:'#f0bb66',backgroundColor:'#101b2c',imageUrl:''},
  ];
  const shots:Shot[]=pilotBeats.map((beat,i)=>({
    id:uuid(),kind:'graphic',style:beat.style,
    startFrame:beat.start,durationFrames:beat.end-beat.start,
    zIndex:0,title:beat.title,subtitle:beat.subtitle,kicker:'ARQUIVO ABERTO  /  '+String(i+1).padStart(2,'0'),
    backgroundColor:backgrounds[i],accentColor:colors[i],trimStartFrames:0,
    motion:easingMotion(beat.end-beat.start,i),
  }));
  const captions=pilotBeats.map((beat,i)=>{
    const length=options.speechFrames?.[i]??beat.end-beat.start-8;
    if(length<=0||length>beat.end-beat.start)throw new Error('Narração '+(i+1)+' não cabe no plano.');
    return {id:uuid(),startFrame:beat.start,endFrame:beat.start+length,text:beat.voice};
  });
  const voice=options.voiceAsset;
  return projectSchema.parse({
    version:2,id:uuid(),name:'Piloto visual — 30 segundos',
    fps:30,width:1920,height:1080,visualMode:'shots',
    chapters:[
      {id:uuid(),title:'A pergunta',firstSceneId:scenes[0].id},
      {id:uuid(),title:'Ritmo e informação',firstSceneId:scenes[1].id},
      {id:uuid(),title:'Próximo capítulo',firstSceneId:scenes[2].id},
    ],scenes,shots,assets:voice?[voice]:[],
    clips:voice?[{
      id:uuid(),assetId:voice.id,lane:'narration',startFrame:0,durationFrames:PILOT_FRAMES,
      trimStartFrames:0,volume:0.94,volumeKeyframes:[
        {frame:0,value:0.8,easing:'ease-in'},
        {frame:8,value:.94,easing:'linear'},
        {frame:888,value:.94,easing:'ease-out'},
        {frame:899,value:0.7,easing:'linear'},
      ],
    }]:[],
    captions,evidence:[],
    channelKit:{brandName:'ARQUIVO ABERTO',font:'sans',accentColor:'#f0bb66',captionStyle:'boxed'},
  });
}
