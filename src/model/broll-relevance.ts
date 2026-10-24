/** Conservative, explainable selection of stock footage — no hallucinated visual recognition.
 * Official search rank alone is insufficient to identify what the frames show.
 */
export interface BrollRankingInput{
  query:string;page:string;seconds:number;width:number;height:number;
  creator:string;source:'pexels';licenseUrl:string;
}
export interface BrollRanked{
  score:number;semanticOverlap:number;eligible:boolean;reasons:string[];
}
const translation:Record<string,string>={
  trabalhador:'worker',trabalhadores:'workers',cidade:'city',urbana:'urban',
  urbano:'urban',brasileiro:'brazil',brasileira:'brazil',
  caminhando:'walking',caminhar:'walking',andando:'walking',trabalho:'work',
  trabalhar:'work',mercado:'market',supermercado:'supermarket',
  dinheiro:'money',salario:'salary',salários:'salary',
  notas:'cash',contas:'bills',fatura:'invoice',
  compras:'shopping',precos:'prices',preco:'price',pessoa:'person',
  pessoas:'people',transporte:'transport',publico:'public',
  bancos:'banks',banco:'bank',divida:'debt',dividas:'debts',
};
const stop=new Set(['the','and','for','with','from','this','that','what','when','about',
  'um','uma','uns','umas','com','para','como','por','que','de','do','da','dos','das','em',
  'na','no','nas','nos','ao','aos','um','uma','isso','seu','sua','seus','suas','video',
  'pexels','footage','stock','clip','film','filme','filmagem']);
function canon(s:string){
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .split(/[^a-z0-9]+/).map(w=>translation[w]??w)
    .filter(w=>w.length>=3&&!stop.has(w));
}
export function scoreBroll(input:BrollRankingInput,plannedSeconds:number):BrollRanked{
  const reasons:string[]=[];
  let path='';
  try{const url=new URL(input.page);if(url.hostname==='www.pexels.com'&&
    url.pathname.startsWith('/video/'))path=url.pathname.split('/').slice(2).join(' ');}
  catch{reasons.push('Página original inválida');}
  const desired=new Set(canon(input.query)),actual=new Set(canon(path));
  const shared=[...desired].filter(w=>actual.has(w)).length;
  const overlap=desired.size?shared/desired.size:0;
  if(!desired.size||overlap<.45)reasons.push('Título da mídia não comprova correspondência ao roteiro');
  if(!input.creator.trim())reasons.push('Fornecedor não informa autor');
  if(input.source!=='pexels'||input.licenseUrl!=='https://www.pexels.com/license/')
    reasons.push('Licença do fornecedor não cadastrada');
  if(input.seconds<plannedSeconds||input.seconds>300)
    reasons.push('Filmagem não cobre a duração planejada ou excede cinco minutos');
  if(input.width<1280||input.height<720||input.width<input.height)
    reasons.push('Resolução ou orientação inadequada para 16:9');
  const durationFit=input.seconds>=plannedSeconds?Math.min(1,plannedSeconds/input.seconds+0.6):0;
  const resolutionFit=input.width>=1920&&input.height>=1080?1:input.width>=1280&&input.height>=720?.75:0;
  const score=Math.round((overlap*.70+durationFit*.20+resolutionFit*.10)*100)/100;
  if(score<.77)reasons.push('Confiança visual abaixo do limite conservador (0,77)');
  return {score,semanticOverlap:overlap,eligible:reasons.length===0,reasons};
}
