import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {compileDirection} from './direction';
import {starterProject,projectSchema} from './project';
import {layerSchema,validateLayers} from './layers';
import {cameraPointSchema,evaluateCamera,retimeCamera,shotSchema} from './shots';

const uuid=()=>randomUUID();
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const sample=JSON.parse(read('docs/examples/MOTION_ENGINE_015.direction.example.json')) as unknown;
function fixture(){
  return projectSchema.parse({...structuredClone(starterProject),
    scenes:[{...starterProject.scenes[0],durationFrames:360}],shots:[],visualMode:'legacy'});
}

describe('Motion Engine v0.15 · composição autoral por JSON',()=>{
  it('compila grupos com chaves simbólicas, tipografia, SVG, câmera e transição sem tocar áudio ou evidências',()=>{
    const before=fixture(),original=JSON.stringify(before);
    const {preview,report,operations}=compileDirection(before,sample,uuid);
    expect(report.coveragePercent).toBe(100);
    expect(preview.visualMode).toBe('shots');
    expect(preview.shots).toHaveLength(2);
    const [first,second]=preview.shots;
    expect(first.layers.map(l=>l.kind)).toEqual(['group','object','text','vector']);
    const group=first.layers[0],child=first.layers[1],title=first.layers[2];
    expect(child.parentId).toBe(group.id);
    expect(title.parentId).toBe(group.id);
    expect(title.fontWeight).toBe(900);
    expect(title.behavior).toBe('word-reveal');
    expect(title.effects.gradient?.from).toBe('#ffe3a3');
    expect(first.cameraPath).toHaveLength(2);
    expect(second.transitionIn).toEqual({type:'fade',durationFrames:18});
    expect(validateLayers(first.layers,first.durationFrames)).toEqual([]);
    expect(preview.clips).toEqual(before.clips);
    expect(preview.captions).toEqual(before.captions);
    expect(preview.assets).toEqual(before.assets);
    expect(preview.evidence).toEqual(before.evidence);
    expect(operations[0].type).toBe('replaceShots');
    expect(JSON.stringify(before)).toBe(original);
  });
  it('interpola pontos de câmera deterministicamente e redimensiona a trajetória',()=>{
    const points=[
      cameraPointSchema.parse({frame:0,x:0,y:0,zoom:1,rotation:0,easing:'linear'}),
      cameraPointSchema.parse({frame:100,x:200,y:80,zoom:1.5,rotation:10,easing:'linear'}),
    ];
    expect(evaluateCamera(points,50)).toMatchObject({x:100,y:40,zoom:1.25,rotation:5});
    expect(evaluateCamera([],50)).toEqual({x:0,y:0,zoom:1,rotation:0});
    expect(retimeCamera(points,101,51).map(p=>p.frame)).toEqual([0,50]);
  });
  it('mantém planos v0.14 sem caminho ou efeitos adicionais',()=>{
    const old=shotSchema.parse({id:uuid(),kind:'graphic',startFrame:0,durationFrames:120,
      layers:[{id:uuid(),name:'Texto antigo',kind:'text',x:100,y:100,width:500,height:150,durationFrames:120}]});
    const raw=structuredClone(old) as unknown as Record<string,unknown>;
    delete raw.cameraPath;delete raw.transitionIn;
    const oldLayer=(raw.layers as Record<string,unknown>[])[0];
    delete oldLayer.effects;delete oldLayer.fontFamily;delete oldLayer.fontWeight;
    delete oldLayer.vectorPath;delete oldLayer.parentId;
    const parsed=shotSchema.parse(raw);
    expect(parsed.cameraPath).toEqual([]);
    expect(parsed.transitionIn.type).toBe('cut');
    expect(parsed.layers[0].fontFamily).toBe('Arial');
    expect(parsed.layers[0].effects.blur).toBe(0);
  });
  it('rejeita HTML/CSS/JS arbitrário e hierarquia inválida',()=>{
    const base={id:uuid(),name:'Seguro',kind:'text',x:0,y:0,width:200,height:100,durationFrames:120};
    expect(()=>layerSchema.parse({...base,fontFamily:'Arial; url(https://example.com)'})).toThrow();
    expect(()=>layerSchema.parse({...base,kind:'vector',vectorPath:'<script>alert(1)</script>'})).toThrow();
    expect(()=>layerSchema.parse({...base,effects:{blur:999}})).toThrow();
    const group=layerSchema.parse({...base,id:uuid(),kind:'group'});
    const orphan=layerSchema.parse({...base,id:uuid(),parentId:uuid()});
    expect(validateLayers([group,orphan],120).some(x=>x.includes('Grupo pai'))).toBe(true);
    const a=layerSchema.parse({...base,id:uuid(),kind:'group'}),b=layerSchema.parse({...base,id:uuid(),kind:'group'});
    expect(validateLayers([{...a,parentId:b.id},{...b,parentId:a.id}],120).some(x=>x.includes('Ciclo'))).toBe(true);
  });
  it('o render e o editor realmente consomem os novos campos, não só o schema',()=>{
    const renderer=read('src/video/elements/AnimatedLayer.tsx');
    const shotRenderer=read('src/video/ShotVisual.tsx');
    const timeline=read('src/video/Documentary.tsx');
    const layerUI=read('src/components/LayerEditor.tsx');
    const shotUI=read('src/components/ShotInspector.tsx');
    for(const key of ['fontFamily','fontWeight','letterSpacing','strokeWidth','word-reveal',
      'fx.blur','fx.mask','allLayers','vectorPath'])
      expect(renderer,'renderizador não usa '+key).toContain(key);
    for(const key of ['evaluateCamera','cameraTransform','allLayers'])
      expect(shotRenderer).toContain(key);
    for(const key of ['ShotEntrance','transitionIn','previous.durationFrames'])
      expect(timeline).toContain(key);
    for(const key of ['Grupo pai','EFEITOS VISUAIS','Espaçamento entre letras','Caminho SVG'])
      expect(layerUI).toContain(key);
    for(const key of ['MOTION ENGINE','cameraPath','transitionIn'])
      expect(shotUI).toContain(key);
  });
});
