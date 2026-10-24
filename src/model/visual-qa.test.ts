import {describe,it,expect} from 'vitest';
import {layerSchema} from './layers';
import {contrastRatio,examineLayer} from './visual-qa';
const id='00000000-0000-4000-8000-000000000001';
describe('primeiros alertas de QA visual',()=>{
  it('calcula contraste da mesma cor como 1, preto/branco como 21',()=>{
    expect(contrastRatio('#ffffff','#ffffff')).toBeCloseTo(1);
    expect(contrastRatio('#000000','#ffffff')).toBeCloseTo(21);
  });
  it('sinaliza texto com pouco contraste, pouca altura e perto da margem',()=>{
    const item=layerSchema.parse({id,name:'Teste ruim',kind:'text',x:0,y:0,
      width:270,height:34,durationFrames:90,text:'UMA FRASE EXTREMAMENTE GRANDE QUE NÃO CABE AQUI',
      fontSize:78,color:'#111827'});
    const codes=examineLayer(item,'#101827').map(x=>x.code);
    expect(codes).toContain('contrast-risk');
    expect(codes).toContain('text-overflow-risk');
    expect(codes).toContain('margin-risk');
  });
  it('ignora dados de outros elementos, sem afirmar que a imagem está legível',()=>{
    const item=layerSchema.parse({id,name:'Casa',kind:'object',x:100,y:100,
      width:300,height:300,durationFrames:90});
    expect(examineLayer(item,'#101827')).toEqual([]);
  });
});
