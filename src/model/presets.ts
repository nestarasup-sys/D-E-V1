import {layerSchema,emptyLayerMotion,type SceneLayer,type LayerBehavior} from './layers';

export const PRESET_CATEGORIES=[
  'Personagens','Cenários','Economia e dados','Narrativa','Explicações','YouTube e identidade',
] as const;
export type PresetCategory=typeof PRESET_CATEGORIES[number];
type Recipe='character'|'dialogue'|'crowd'|'scene'|'chart'|'comparison'|'timeline'|
  'network'|'folder'|'flow'|'cycle'|'cutaway'|'gears'|'particles'|'scale'|'type'|'credits'|'lower-third';
interface Preset {
  id:string;title:string;category:PresetCategory;recipe:Recipe;description:string;
  actor?:SceneLayer['characterType'];world?:SceneLayer['sceneType'];object?:SceneLayer['objectType'];
  behavior?:LayerBehavior;theme?:number;
}
const P=(id:string,title:string,category:PresetCategory,recipe:Recipe,
  description:string,more:Partial<Preset>={}):Preset=>({id,title,category,recipe,description,...more});

/** Exactly 50 authored editorial compositions. Patterns share tested primitives,
 * but each ID has its own content, staging, object(s) and choreography. */
export const PRESET_CATALOG:readonly Preset[]=[
  P('person-worker','Trabalhador e objetivo','Personagens','character','Personagem, renda e objetivo de vida',{actor:'worker',object:'home',behavior:'walk',theme:0}),
  P('person-family','Família e orçamento','Personagens','dialogue','Duas gerações debatendo a conta',{actor:'parent',object:'wallet',theme:1}),
  P('person-banker','Analista bancário','Personagens','character','Financiamento explicado com um atendente',{actor:'banker',object:'bank',behavior:'point',theme:2}),
  P('person-builder','Construção em progresso','Personagens','character','Trabalhador diante de obra e ferramentas',{actor:'builder',object:'gear',behavior:'wave',theme:3}),
  P('person-teacher','Professor explicando','Personagens','character','Educador revela um conceito',{actor:'presenter',object:'book',behavior:'point',theme:4}),
  P('person-scientist','Cientista e hipótese','Personagens','character','Pesquisa e método, não uma prova visual real',{actor:'scientist',object:'lightbulb',behavior:'think',theme:5}),
  P('person-reporter','Repórter editorial','Personagens','character','Narrador estilizado com microfone ilustrativo',{actor:'presenter',object:'document',behavior:'nod',theme:6}),
  P('person-student','Estudante e futuro','Personagens','character','Jovem em busca de oportunidade',{actor:'student',object:'computer',behavior:'celebrate',theme:7}),
  P('person-crowd','Multidão e sociedade','Personagens','crowd','Diversas pessoas ilustradas diante de números',{actor:'worker',object:'home',theme:8}),
  P('person-dialogue','Dois pontos de vista','Personagens','dialogue','Personagens conversam por turnos',{actor:'worker',object:'key',theme:9}),

  P('world-city','Cidade que se constrói','Cenários','scene','Skyline e prédios em perspectiva',{world:'city',object:'home',theme:0}),
  P('world-apartment','Dentro do apartamento','Cenários','scene','Ambiente doméstico e móveis estilizados',{world:'home',object:'key',theme:1}),
  P('world-bank','Agência e crédito','Cenários','scene','Ambiente bancário em perspectiva',{world:'bank',object:'wallet',theme:2}),
  P('world-office','Rotina no escritório','Cenários','scene','Mesa, computador e documentos',{world:'office',object:'computer',theme:3}),
  P('world-market','Custo no supermercado','Cenários','scene','Carrinho e itens de consumo',{world:'supermarket',object:'cart',theme:4}),
  P('world-building','Canteiro de obras','Cenários','scene','Guindaste, construção e trabalhadores',{world:'construction',object:'gear',theme:5}),
  P('world-street','Rua e mobilidade','Cenários','scene','Veículos, árvores e passagens urbanas',{world:'street',object:'car',theme:6}),
  P('world-studio','Estúdio de explicações','Cenários','scene','Painéis e foco do apresentador',{world:'studio',object:'lightbulb',theme:7}),

  P('data-bars','Barras de comparação','Economia e dados','chart','Barras horizontais ou verticais com origem',{object:'coin',theme:0}),
  P('data-trend','Curva de tendência','Economia e dados','chart','Evolução temporal em linha editorial',{object:'calendar',theme:1}),
  P('data-ranking','Ranking explicado','Economia e dados','chart','Posições e escalas em destaque',{object:'document',theme:2}),
  P('data-donut','Partes de um todo','Economia e dados','chart','Anel segmentado, com rótulos claros',{object:'coin',theme:3}),
  P('data-budget','Orçamento doméstico','Economia e dados','flow','Despesas e renda por categorias',{object:'wallet',theme:4}),
  P('data-salary-home','Salário versus casa','Economia e dados','comparison','Dois valores confrontados com contexto',{object:'home',theme:5}),
  P('data-loan','Financiamento ilustrado','Economia e dados','timeline','Prazo, entrada e pagamento',{object:'bank',theme:6}),
  P('data-interest','Juros acumulados','Economia e dados','chart','Crescimento animado sem números fictícios',{object:'coin',theme:7}),
  P('data-prices','Linha histórica de preços','Economia e dados','timeline','Marcos de um período econômico',{object:'calendar',theme:8}),
  P('data-counter','Número em destaque','Economia e dados','type','Destaque cinético para uma métrica',{object:'coin',theme:9}),

  P('story-wall','Mural de pistas','Narrativa','network','Documentos e conexões editoriais',{object:'document',theme:0}),
  P('story-before-after','Antes e depois','Narrativa','comparison','Transformação entre dois estados',{object:'home',theme:1}),
  P('story-timeline','Linha do tempo','Narrativa','timeline','Eventos sucessivos documentados',{object:'calendar',theme:2}),
  P('story-headline','Manchete em foco','Narrativa','folder','Trecho visual com origem obrigatória',{object:'document',theme:3}),
  P('story-folder','Pasta do arquivo','Narrativa','folder','Folhas e fichas se revelam',{object:'book',theme:4}),
  P('story-causality','Causa e consequência','Narrativa','flow','Fatores e relações com setas',{object:'gear',theme:5}),
  P('story-chronology','Cronologia escalonada','Narrativa','timeline','Marcos em sequência com pausa',{object:'clock',theme:6}),
  P('story-relations','Rede de relações','Narrativa','network','Nós e conexões sem simular prova',{object:'magnifier',theme:7}),

  P('explain-flowchart','Fluxograma didático','Explicações','flow','Passos e decisões em cadeia',{object:'lightbulb',theme:0}),
  P('explain-cycle','Ciclo de processos','Explicações','cycle','Etapas em órbita regular',{object:'gear',theme:1}),
  P('explain-cutaway','Corte de objeto','Explicações','cutaway','Objeto em partes explicado visualmente',{object:'home',theme:2}),
  P('explain-layers','Camadas separadas','Explicações','cutaway','Camadas de um sistema afastadas',{object:'computer',theme:3}),
  P('explain-zoom','Lupa em detalhe','Explicações','folder','Ampliação controlada de um elemento',{object:'magnifier',theme:4}),
  P('explain-gears','Engrenagens e sistema','Explicações','gears','Várias peças em movimento coordenado',{object:'gear',theme:5}),
  P('explain-particles','Partículas e ligações','Explicações','particles','Elementos abstratos em trajetórias',{object:'lightbulb',theme:6}),
  P('explain-scales','Comparação de escalas','Explicações','scale','Escalas de referência legíveis',{object:'home',theme:7}),

  P('youtube-intro','Abertura cinematográfica','YouTube e identidade','type','Revelação da marca e gancho',{object:'lightbulb',theme:0}),
  P('youtube-identity','Identificação editorial','YouTube e identidade','lower-third','Nome e descrição de participante',{object:'document',theme:1}),
  P('youtube-quote','Citação animada','YouTube e identidade','folder','Frase editorial com atribuição',{object:'book',theme:2}),
  P('youtube-chapter','Cartão de capítulo','YouTube e identidade','type','Título de novo capítulo',{object:'clock',theme:3}),
  P('youtube-cta','Chamada para ação','YouTube e identidade','character','Apresentador e convite discreto',{actor:'presenter',object:'heart',behavior:'wave',theme:4}),
  P('youtube-credits','Créditos finais','YouTube e identidade','credits','Fontes, licença e créditos legíveis',{object:'document',theme:5}),
];
export const PRESET_COUNT=PRESET_CATALOG.length;
export type PresetId=(typeof PRESET_CATALOG)[number]['id'];
export function getPreset(id:string):Preset {
  const preset=PRESET_CATALOG.find(p=>p.id===id);
  if(!preset)throw new Error('Composição não encontrada: '+id);
  return preset;
}
export interface PresetOptions {
  title:string;subtitle?:string;durationFrames:number;accentColor?:string;
  sourceEvidenceId?:string;
  data?:{labels:string[];values:number[];unit?:string};
}
const backgrounds=['#0c1b2c','#101f33','#142033','#161d33','#142b31',
  '#211b2e','#112631','#192232','#1b2030','#141c2e'];
export function presetBackground(id:string):string{
  const p=getPreset(id);
  return backgrounds[(p.theme??0)%backgrounds.length];
}
export function instantiatePreset(id:string,options:PresetOptions,newId:()=>string):SceneLayer[]{
  const p=getPreset(id),duration=options.durationFrames;
  if(!Number.isInteger(duration)||duration<1||duration>18000)throw Error('Duração inválida.');
  const accent=options.accentColor??'#f0bb66';
  const layers:SceneLayer[]=[];
  const secondary=['#17364b','#153450','#243b51','#263049','#244954'][(p.theme??0)%5];
  const add=(kind:SceneLayer['kind'],name:string,x:number,y:number,width:number,height:number,
    props:Partial<SceneLayer>={})=>{
    const start=Math.min(duration-1,layers.length*7);
    layers.push(layerSchema.parse({
      id:newId(),kind,name,x,y,width,height,zIndex:layers.length,
      startFrame:start,durationFrames:duration-start,color:accent,secondaryColor:secondary,
      text:'',behavior:'slide-in',illustrative:true,
      motion:emptyLayerMotion(),...props,
    }));
  };
  const title=options.title.slice(0,100)||p.title;
  const sub=(options.subtitle||p.description).slice(0,160);
  const header=(top=90,width=1200)=>{
    add('text','Título',120,top,width,150,{text:title,fontSize:88,color:'#f6f5f1',behavior:'typewriter'});
    add('text','Explicação',124,top+157,width,110,{text:sub,fontSize:39,color:'#b9d3e4',behavior:'slide-in'});
  };
  const icon=(object:SceneLayer['objectType'],x:number,y:number,size=260,behavior:LayerBehavior='float')=>
    add('object','Objeto '+object,x,y,size,size,{objectType:object,behavior,color:accent});
  const actor=(person:SceneLayer['characterType'],x:number,y:number,behavior:LayerBehavior='wave',face:SceneLayer['expression']='neutral')=>
    add('character','Pessoa '+person,x,y,390,620,{characterType:person,behavior,expression:face});
  const world=(scene:SceneLayer['sceneType'])=>
    add('scene','Cenário '+scene,0,0,1920,1080,{sceneType:scene,behavior:'parallax',startFrame:0,durationFrames:duration,zIndex:-5});
  const textFoot=()=>add('text','Assinatura visual',128,852,1500,55,{
    text:'ILUSTRAÇÃO EDITORIAL • '+p.title.toUpperCase(),fontSize:25,color:'#e1bb7a',behavior:'none'});
  switch(p.recipe){
    case 'character':
      world(p.world??'studio');header(100,1030);
      actor(p.actor??'worker',p.id==='person-builder'?1070:1160,290,
        p.behavior??'wave',p.id==='person-scientist'?'thinking':'neutral');
      icon(p.object??'home',830,620,220,'float');break;
    case 'dialogue':
      world('home');header(75,1440);
      actor(p.actor??'worker',240,335,'point','curious');
      actor('banker',1160,335,'nod','thinking');
      add('shape','Balão da conversa',745,420,390,185,{shapeType:'pill',color:'#f1e8d5',behavior:'pulse'});
      add('text','Ideia central',788,471,300,95,{text:'E SE...?',fontSize:48,color:'#17283a'});
      break;
    case 'crowd':
      world('city');header(75,1530);
      ['worker','parent','student','banker','builder'].forEach((type,i)=>
        actor(type as SceneLayer['characterType'],70+i*350,430,i%2?'float':'wave'));
      break;
    case 'scene':
      world(p.world??'city');header(65,1250);
      icon(p.object??'home',1300,330,270,'pulse');
      actor('worker',490,470,'walk','curious');
      break;
    case 'chart':
      header(70,1510);
      add('chart','Gráfico '+p.title,200,420,1500,420,{
        chartType:p.id==='data-trend'?'line':p.id==='data-donut'?'donut':
          p.id==='data-interest'?'area':p.id==='data-ranking'?'ranking':'bar',
        labels:options.data?.labels??[],values:options.data?.values??[],
        unit:options.data?.unit??'',sourceEvidenceId:options.sourceEvidenceId,
        color:accent,behavior:p.id==='data-trend'?'draw':'grow'});
      icon(p.object??'coin',1510,80,185,'pulse');break;
    case 'comparison':
      header(70,1510);
      add('shape','Coluna esquerda',150,405,730,430,{shapeType:'rectangle',color:'#24384d',behavior:'slide-in'});
      add('shape','Coluna direita',1010,405,730,430,{shapeType:'rectangle',color:'#253f4a',behavior:'slide-in'});
      add('text','Valor esquerdo',205,530,600,150,{text:'CENÁRIO A',fontSize:65,color:'#f5e8d7'});
      add('text','Valor direito',1060,530,600,150,{text:'CENÁRIO B',fontSize:65,color:accent});
      icon(p.object??'home',840,585,160,'float');break;
    case 'timeline':
      header(68,1530);
      add('connector','Linha da história',200,575,1510,16,{behavior:'draw',color:accent});
      for(let i=0;i<4;i++){
        add('shape','Marco '+(i+1),240+i*420,546,65,65,{shapeType:'circle',behavior:'pulse'});
        add('text','Evento '+(i+1),190+i*420,660,340,100,{
          text:['INÍCIO','MUDANÇA','CONSEQUÊNCIA','AGORA'][i],fontSize:38,color:'#f5e8d7'});
      }
      break;
    case 'network':
      header(70,1440);
      for(let i=0;i<4;i++)icon(i%2?'document':'magnifier',270+i*410,450,175,i%2?'float':'pulse');
      for(let i=0;i<3;i++)add('connector','Ligação '+(i+1),450+i*410,545,240,8,{behavior:'draw'});
      break;
    case 'folder':
      header(70,1270);
      add('shape','Página editorial',1060,315,700,570,{
        shapeType:'rectangle',color:'#e9e0cb',behavior:'slide-in'});
      add('text','Cabeçalho do arquivo',1110,375,590,100,{text:'ARQUIVO / EXEMPLO',fontSize:48,color:'#24384b'});
      add('text','Legenda editorial',1120,520,580,200,{text:sub,fontSize:43,color:'#24384b'});
      icon(p.object??'document',250,505,320,'float');break;
    case 'flow':
      header(65,1500);
      ['ENTRADA','PROCESSO','RESULTADO'].forEach((label,i)=>{
        add('shape','Etapa '+i,150+i*605,505,440,230,{shapeType:'pill',
          color:i===2?accent:'#29425a',behavior:'slide-in'});
        add('text','Rótulo '+i,178+i*605,569,390,110,{text:label,fontSize:54,color:'#f6f3e9'});
        if(i<2)add('connector','Seta '+i,584+i*605,620,172,8,{behavior:'draw'});
      });break;
    case 'cycle':
      header(65,1530);
      for(let i=0;i<4;i++){
        const angle=i*Math.PI/2;
        const x=790+Math.round(Math.cos(angle)*430),y=560+Math.round(Math.sin(angle)*230);
        icon(i%2?'clock':'gear',x,y,160,'orbit');
      }
      add('shape','Centro do ciclo',815,485,240,200,{shapeType:'ring',behavior:'pulse'});
      break;
    case 'cutaway':
      header(65,1500);
      for(let i=0;i<4;i++)
        add('shape','Camada '+(i+1),350+i*220,470-i*48,670,340,{
          shapeType:'rectangle',color:['#39546c','#49617a','#ad9b72','#d7b672'][i],
          behavior:'float',behaviorIntensity:0.6+i*0.15});
      icon(p.object??'home',1330,465,230,'pulse');break;
    case 'gears':
      header(65,1400);
      for(let i=0;i<4;i++)icon('gear',230+i*420,440+i%2*145,310,'orbit');
      break;
    case 'particles':
      header(65,1500);
      add('particles','Partículas orbitais',150,405,1560,490,{
        behavior:'float',color:accent,behaviorIntensity:0.8});
      icon(p.object??'lightbulb',810,495,250,'pulse');break;
    case 'scale':
      header(65,1550);
      for(let i=0;i<4;i++){
        const size=130+i*92;
        icon(p.object??'home',230+i*390,780-size,size,'grow');
      }
      break;
    case 'type':
      add('shape','Placa de abertura',0,0,1920,1080,{shapeType:'rectangle',color:secondary,
        startFrame:0,durationFrames:duration,zIndex:-4,behavior:'none'});
      add('text','Headline cinético',145,320,1630,245,{
        text:title,fontSize:p.id==='data-counter'?162:128,color:'#f5f2eb',behavior:'typewriter'});
      add('connector','Risco editorial',160,675,1300,12,{behavior:'draw'});
      add('text','Subtítulo',158,760,1380,130,{text:sub,fontSize:44,color:accent});
      break;
    case 'credits':
      add('text','Créditos',160,85,1530,155,{text:title||'CRÉDITOS',fontSize:106,color:'#f5f2eb'});
      add('text','Texto de créditos',260,290,1400,520,{
        text:sub+'\nFontes e direitos: revisar antes de publicar.',
        fontSize:52,color:'#c8d6de',behavior:'slide-in'});
      break;
    case 'lower-third':
      world('studio');
      add('shape','Faixa de identificação',100,690,1400,238,{shapeType:'rectangle',color:'#153249'});
      add('text','Nome',155,711,1330,115,{text:title,fontSize:71,color:'#f6f2e9'});
      add('text','Cargo / contexto',158,832,1260,85,{text:sub,fontSize:36,color:accent});
      break;
  }
  // For all templates: preserve an explicit disclosure so procedural art is not
  // mistaken for footage or factual data. The text is a native editable layer.
  if(p.recipe!=='credits')textFoot();
  if(layers.length>32)throw new Error('Composição muito complexa para edição em tempo real.');
  return layers;
}
