import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {layerSchema,validateLayers} from './layers';
import {projectSchema,starterProject} from './project';
import {compileDirection} from './direction';
import {applyOperations} from './operations';
import {evaluateRig} from '../video/elements/Character2D';
import {buildPortableArchive,decodePortableArchive} from '../../apps/agent/src/portable';
import {pixelChange,rasterMetrics,regionContrast} from './frame-pixels';
import {zipSync,strToU8} from 'fflate';

const id=()=>randomUUID();
function base(){
  return projectSchema.parse({...structuredClone(starterProject),id:id(),
    scenes:[{...starterProject.scenes[0],durationFrames:180}],
    shots:[],visualMode:'legacy',assets:[],clips:[],captions:[],evidence:[]});
}
describe('Dark Studio v0.16: cinco capacidades sem apagar a v0.15',()=>{
  it('articula braços, pernas, olhos, cabeça e sorriso ao longo da timeline',()=>{
    const layer=layerSchema.parse({id:id(),kind:'character',name:'Trabalhador',
      x:100,y:150,width:330,height:520,durationFrames:120,
      rigKeys:[{frame:0,pose:{leftArm:-70,rightArm:0,leftLeg:0,rightLeg:0,head:0,eyeX:0,eyeY:0,smile:0},easing:'linear'},
        {frame:100,pose:{leftArm:70,rightArm:-45,leftLeg:35,rightLeg:-30,head:20,
          eyeX:6,eyeY:4,smile:1},easing:'linear'}]});
    expect(evaluateRig(layer,50).leftArm).toBe(0);
    expect(evaluateRig(layer,50).rightLeg).toBe(-15);
    expect(evaluateRig(layer,50).smile).toBe(.5);
    expect(validateLayers([layer],120)).toEqual([]);
    expect(validateLayers([{...layer,rigKeys:[{...layer.rigKeys[0],frame:120}]}],120)
      .some(msg=>msg.includes('rigKeys'))).toBe(true);
  });
  it('gráficos de dados só usam valores com evidência, e estágios têm comprimentos coerentes',()=>{
    const ev=id(),p=base();
    p.evidence=[{id:ev,claim:'Fluxos de teste sintéticos',sourceTitle:'Amostra interna sintética',
      sourceUrl:'',notes:'Não publicar',reviewStatus:'pending'}];
    const direction={version:1,title:'Dinheiro em movimento',beats:[{
      startFrame:0,durationFrames:180,purpose:'data',title:'Orçamento',
      layers:[{kind:'chart',name:'Fluxo de dinheiro',x:60,y:100,width:1500,height:800,
        chartType:'cashflow',sourceEvidenceId:ev,labels:['Renda','Aluguel','Conta'],
        values:[100,-45,-20],chartStages:[
          {frame:0,values:[0,0,0],easing:'linear'},
          {frame:179,values:[100,-45,-20],easing:'linear'}]}]}]};
    const compiled=compileDirection(p,direction,id);
    expect(compiled.preview.shots[0].layers[0].chartType).toBe('cashflow');
    expect(compiled.preview.shots[0].layers[0].chartStages).toHaveLength(2);
    expect(()=>layerSchema.parse({id:id(),kind:'chart',name:'Factual',x:0,y:0,
      width:400,height:300,durationFrames:100,chartType:'waterfall',values:[15]})).toThrow();
    expect(()=>layerSchema.parse({id:id(),kind:'chart',name:'Inconsistente',x:0,y:0,
      width:400,height:300,durationFrames:100,sourceEvidenceId:ev,
      values:[1,2],chartStages:[{frame:0,values:[2]}]})).toThrow();
  });
  it('B-roll recebe enquadramento e origem, com licença cadastrada e revisável',()=>{
    const p=base(),mediaId=id();
    const asset={id:mediaId,name:'arquivo.png',kind:'image' as const,
      mime:'image/png',url:'http://127.0.0.1:4317/media/'+mediaId,
      rights:{status:'unknown' as const,sourceUrl:'',creator:'',licenseName:'',attribution:'',notes:''}};
    const ready=projectSchema.parse({...p,assets:[asset]});
    const plan={version:1,title:'B-roll',beats:[{
      startFrame:0,durationFrames:180,purpose:'context',title:'Arquivo',
      assetId:mediaId,framing:{fit:'cover',focusX:27,focusY:71,zoom:1.2},
      mediaPlan:{query:'arquivo de agência',intendedUse:'pan de abertura',licenseNote:'confirmar direitos de uso'}}]};
    const {preview,report}=compileDirection(ready,plan,id);
    expect(preview.shots[0].framing.focusX).toBe(27);
    expect(preview.shots[0].mediaPlan?.query).toBe('arquivo de agência');
    expect(report.issues.some(i=>i.code==='media-license-pending')).toBe(true);
    const edited=applyOperations(ready,[{type:'updateAsset',assetId:mediaId,changes:{
      rights:{...ready.assets[0].rights,status:'cleared',creator:'Autor autorizado',
        licenseName:'Uso autorizado'}}}]);
    expect(compileDirection(edited,plan,id).report.issues.some(i=>i.code==='media-license-pending')).toBe(false);
  });
  it('pacote .darkstudio preserva projeto, mídias e hashes sem acessar arquivos pessoais',async()=>{
    const p=base(),assetId=id();const binary=new Uint8Array([137,80,78,71,1,2,3,4,5]);
    const withMedia=projectSchema.parse({...p,assets:[{id:assetId,name:'local.png',
      kind:'image',mime:'image/png',url:'http://127.0.0.1:4317/media/'+assetId,
      rights:{status:'cleared',sourceUrl:'',creator:'Eu',licenseName:'Autoral',
        attribution:'',notes:''}}]});
    const zip=await buildPortableArchive(withMedia,async()=>({
      bytes:binary,ext:'.png',mime:'image/png',kind:'image',name:'local.png'}));
    const decoded=decodePortableArchive(zip);
    expect(decoded.project.assets[0].rights.status).toBe('cleared');
    expect([...decoded.assets[0].bytes]).toEqual([...binary]);
    expect(()=>decodePortableArchive(zipSync({'../segredo.txt':strToU8('não')}))).toThrow();
    const tampered=new Uint8Array(zip);tampered[0]=0;
    expect(()=>decodePortableArchive(tampered)).toThrow();
  });
  it('avalia pixels reais com métricas reproduzíveis e sem prometer OCR',()=>{
    const black={width:8,height:8,data:new Uint8Array(8*8*4)};
    const white={width:8,height:8,data:new Uint8Array(8*8*4).fill(255)};
    expect(pixelChange(black,white)).toBeCloseTo(1);
    expect(rasterMetrics(black).darkPercent).toBe(1);
    expect(regionContrast(black,{x:0,y:0,width:8,height:8})).toBe(0);
  });
});
