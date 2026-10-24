import type {SceneLayer} from './layers';
import type {Shot} from './shots';

/** Conservative geometry heuristics. Does NOT inspect actual rasterized text
 * or prove accessibility; app should label each finding a warning, not verdict. */
export type VisualFinding={code:'contrast-risk'|'text-overflow-risk'|'margin-risk';
  message:string;layerId:string;severity:'warning'|'info'};
function luminance(hex:string):number{
  const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>
    c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}
export function contrastRatio(a:string,b:string):number{
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function examineLayer(layer:SceneLayer,background:string):VisualFinding[]{
  if(layer.kind!=='text')return [];
  const issues:VisualFinding[]=[];
  // A color block behind the text may override this estimate.
  const ratio=contrastRatio(layer.color,background);
  if(ratio<(layer.fontSize>=50?3:4.5))
    issues.push({code:'contrast-risk',layerId:layer.id,severity:'warning',
      message:'Possível baixo contraste: '+layer.name+' ('+ratio.toFixed(1)+':1 no fundo do plano)'});
  // Native font rendering is complex: this flags only probable errors.
  const effectiveText=layer.behavior==='count'?String(layer.value??layer.text):layer.text;
  const charsPerLine=Math.max(1,Math.floor(layer.width/(layer.fontSize*.54)));
  const lineCount=Math.max(1,Math.floor(layer.height/(layer.fontSize*1.17)));
  const expectedLines=effectiveText.split('\n').reduce((sum,s)=>
    sum+Math.max(1,Math.ceil(s.length/charsPerLine)),0);
  if(expectedLines>lineCount+1)
    issues.push({code:'text-overflow-risk',layerId:layer.id,severity:'warning',
      message:'A caixa de texto pode cortar linhas: '+layer.name+
        ' (estimativa '+expectedLines+' linhas, cabem '+lineCount+')'});
  if(layer.x<64||layer.y<48||layer.x+layer.width>1856||layer.y+layer.height>970)
    issues.push({code:'margin-risk',layerId:layer.id,severity:'info',
      message:'Texto pode tocar áreas de corte/legendas: '+layer.name});
  return issues;
}
export function examineShot(shot:Shot):VisualFinding[]{
  return shot.layers.flatMap(layer=>examineLayer(layer,shot.backgroundColor));
}
