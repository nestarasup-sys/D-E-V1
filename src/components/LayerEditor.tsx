import {useState} from 'react';
import type {Caption,Asset,Evidence} from '../model/project';
import {emptyLayerMotion,layerSchema,layerBehaviors,layerKinds,
  type SceneLayer,type LayerMotion,type LayerKeyframe} from '../model/layers';
import type {Shot} from '../model/shots';

const labels:Record<keyof LayerMotion,string>={
  x:'Posição X',y:'Posição Y',scale:'Escala',rotation:'Rotação',opacity:'Opacidade',
};
const types:Record<SceneLayer['kind'],string>={
  text:'Texto',character:'Personagem',object:'Objeto',building:'Construção',
  scene:'Cenário',chart:'Gráfico',shape:'Forma',connector:'Linha/seta',
  particles:'Partículas',image:'Imagem importada',
};
const time=(n:number)=>(n/30).toFixed(2);
const limits:{[K in keyof LayerMotion]:[number,number]}={
  x:[-1920,1920],y:[-1080,1080],scale:[.1,5],rotation:[-360,360],opacity:[0,1],
};
const create=(kind:SceneLayer['kind'],duration:number,assetId?:string):SceneLayer=>layerSchema.parse({
  id:crypto.randomUUID(),kind,name:'Novo '+types[kind],
  x:kind==='scene'?0:480,y:kind==='scene'?0:400,
  zIndex:kind==='scene'?-5:1,
  width:kind==='text'?900:kind==='scene'?1920:330,
  height:kind==='text'?170:kind==='scene'?1080:330,
  startFrame:0,durationFrames:duration,text:kind==='text'?'TEXTO EDITÁVEL':'',
  motion:emptyLayerMotion(),...(assetId?{assetId}:{}),
});
export function LayerEditor({shot,selectedId,onSelected,assets,captions,evidence,onEdit}:{
  shot:Shot;selectedId:string|null;onSelected:(id:string|null)=>void;
  assets:Asset[];captions:Caption[];evidence:Evidence[];
  onEdit:(changes:Partial<Omit<Shot,'id'>>)=>void;
}){
  const [property,setProperty]=useState<keyof LayerMotion>('x');
  const layers=shot.layers;
  const selected=layers.find(l=>l.id===selectedId)??null;
  const [addKind,setAddKind]=useState<SceneLayer['kind']>('text');
  function patch(layerId:string,changes:Partial<SceneLayer>){
    onEdit({layers:layers.map(l=>l.id===layerId?{...l,...changes}:l)});
  }
  function modify(keyframes:LayerKeyframe[]){
    if(!selected)return;
    patch(selected.id,{motion:{...selected.motion,[property]:keyframes.sort((a,b)=>a.frame-b.frame)}});
  }
  function insert(){
    if(layers.length>=48)return;
    if(addKind==='image'&&!assets.some(a=>a.kind==='image'))return;
    const next=create(addKind,shot.durationFrames,
      addKind==='image'?assets.find(a=>a.kind==='image')?.id:undefined);
    onEdit({layers:[...layers,next],kind:'graphic'});
    onSelected(next.id);
  }
  function copy(){
    if(!selected||layers.length>=48)return;
    const cloned:SceneLayer={...structuredClone(selected),id:crypto.randomUUID(),
      name:selected.name+' (cópia)',x:selected.x+45,y:selected.y+30,zIndex:selected.zIndex+1};
    onEdit({layers:[...layers,cloned]});
    onSelected(cloned.id);
  }
  const scopedCaptions=captions.filter(c=>
    c.startFrame<shot.startFrame+shot.durationFrames&&c.endFrame>shot.startFrame);
  return <section className="layerEditor">
    <div className="panelTitle">OBJETOS E CAMADAS <span>{layers.length}/48</span></div>
    <p className="help">Cada camada tem intervalo, posição, cor, gesto, animação e keyframes independentes. Tudo também pode ser criado pelo Codex em JSON validado.</p>
    <div className="layerAdd">
      <select aria-label="Novo tipo de camada" value={addKind} onChange={e=>setAddKind(e.target.value as SceneLayer['kind'])}>
        {layerKinds.map(kind=><option key={kind} value={kind}>{types[kind]}</option>)}
      </select>
      <button disabled={layers.length>=48||(addKind==='image'&&!assets.some(a=>a.kind==='image'))}
        onClick={insert}>+ Adicionar</button>
    </div>
    <div className="layerEntries">
      {[...layers].sort((a,b)=>b.zIndex-a.zIndex).map(l=><button key={l.id}
        className={'layerEntry '+(l.id===selected?.id?'layerEntrySelected':'')}
        onClick={()=>onSelected(l.id)}>
        <span>{types[l.kind]} · {l.name}</span>
        <small>{time(l.startFrame)}s → {time(l.startFrame+l.durationFrames)}s</small>
      </button>)}
    </div>
    {selected&&<>
      <div className="panelTitle">ELEMENTO SELECIONADO</div>
      <div className="field"><label>Nome</label>
        <input maxLength={90} value={selected.name} onChange={e=>patch(selected.id,{name:e.target.value})}/></div>
      {(selected.kind==='text')&&<div className="field"><label>Texto</label>
        <textarea rows={3} maxLength={400} value={selected.text}
          onChange={e=>patch(selected.id,{text:e.target.value})}/></div>}
      {selected.kind==='text'&&<div className="field"><label>Tamanho da letra</label>
        <input type="number" min={12} max={260} value={selected.fontSize}
          onChange={e=>patch(selected.id,{fontSize:Math.round(Number(e.target.value))})}/></div>}
      {selected.kind==='character'&&<>
        <div className="field"><label>Personagem</label>
          <select value={selected.characterType}
            onChange={e=>patch(selected.id,{characterType:e.target.value as SceneLayer['characterType']})}>
            {(['worker','parent','child','banker','presenter','scientist','builder','student','silhouette'] as const)
              .map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div className="field"><label>Expressão</label>
          <select value={selected.expression}
            onChange={e=>patch(selected.id,{expression:e.target.value as SceneLayer['expression']})}>
            {(['neutral','happy','sad','curious','surprised','worried','thinking'] as const)
              .map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      </>}
      {(selected.kind==='object'||selected.kind==='building')&&<div className="field"><label>Objeto</label>
        <select value={selected.objectType}
          onChange={e=>patch(selected.id,{objectType:e.target.value as SceneLayer['objectType']})}>
          {(['home','key','car','phone','coin','wallet','contract','clock','bank','cart',
            'computer','truck','document','tree','heart','lightbulb','calendar','magnifier',
            'book','gear','factory','rocket','pin'] as const).map(v=>
              <option key={v} value={v}>{v}</option>)}</select>
      </div>}
      {selected.kind==='scene'&&<div className="field"><label>Ambiente</label>
        <select value={selected.sceneType}
          onChange={e=>patch(selected.id,{sceneType:e.target.value as SceneLayer['sceneType']})}>
          {(['city','home','bank','office','supermarket','construction','street','studio'] as const)
            .map(v=><option key={v} value={v}>{v}</option>)}</select>
      </div>}
      {selected.kind==='shape'&&<div className="field"><label>Forma</label>
        <select value={selected.shapeType}
          onChange={e=>patch(selected.id,{shapeType:e.target.value as SceneLayer['shapeType']})}>
          {(['rectangle','circle','triangle','line','ring','pill'] as const)
            .map(v=><option key={v} value={v}>{v}</option>)}</select>
      </div>}
      {selected.kind==='image'&&<div className="field"><label>Imagem local</label>
        <select value={selected.assetId||''}
          onChange={e=>patch(selected.id,{assetId:e.target.value})}>
          {assets.filter(a=>a.kind==='image').map(a=>
            <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </div>}
      {selected.kind==='chart'&&<>
        <div className="field"><label>Formato de gráfico</label>
          <select value={selected.chartType}
            onChange={e=>patch(selected.id,{chartType:e.target.value as SceneLayer['chartType']})}>
            {(['bar','line','donut','ranking','area'] as const)
              .map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div className="field"><label>Fonte da informação (obrigatória para números)</label>
          <select value={selected.sourceEvidenceId||''} onChange={e=>patch(selected.id,{
            sourceEvidenceId:e.target.value||undefined,
            values:e.target.value?selected.values:[],
          })}>
            <option value="">Sem fonte — somente visual ilustrativo</option>
            {evidence.map(source=><option value={source.id} key={source.id}>
              {source.sourceTitle} · {source.reviewStatus}</option>)}
          </select>
        </div>
        <div className="field"><label>Categorias separadas por ponto-e-vírgula</label>
          <textarea rows={2} value={selected.labels.join('; ')}
            onChange={e=>patch(selected.id,{labels:e.target.value.split(';').slice(0,12).map(s=>s.trim())})}/>
        </div>
        <div className="field"><label>Valores separados por ponto-e-vírgula</label>
          <input disabled={!selected.sourceEvidenceId} value={selected.values.join('; ')}
            placeholder="Cadastre e vincule primeiro uma evidência"
            onChange={e=>{
              const raw=e.target.value.trim();
              if(raw===''){patch(selected.id,{values:[]});return;}
              const arr=raw.split(';').map(s=>Number(s.trim()));
              if(arr.length<=12&&arr.every(Number.isFinite))patch(selected.id,{values:arr});
            }}/>
        </div>
      </>}
      <div className="twoCols">
        {(['x','y','width','height'] as const).map(key=><div className="field" key={key}>
          <label>{key==='x'?'Posição X (px)':key==='y'?'Posição Y (px)':key==='width'?'Largura (px)':'Altura (px)'}</label>
          <input type="number" step="1" value={Math.round(selected[key])}
            onChange={e=>patch(selected.id,{[key]:Number(e.target.value)})}/>
        </div>)}
      </div>
      <div className="twoCols">
        <div className="field"><label>Início (segundos relativos ao plano)</label>
          <input type="number" step=".1" min={0} disabled={!!selected.cueCaptionId}
            value={time(selected.startFrame)} onChange={e=>{
              const start=Math.round(Number(e.target.value)*30);
              if(start>=0&&start<shot.durationFrames)
                patch(selected.id,{startFrame:start,durationFrames:Math.min(selected.durationFrames,shot.durationFrames-start)});
            }}/></div>
        <div className="field"><label>Duração (segundos)</label>
          <input type="number" step=".1" min={1/30} value={time(selected.durationFrames)}
            onChange={e=>{
              const duration=Math.round(Number(e.target.value)*30);
              if(duration>0&&selected.startFrame+duration<=shot.durationFrames)
                patch(selected.id,{durationFrames:duration,motion:emptyLayerMotion()});
            }}/></div>
      </div>
      <div className="field"><label>Sincronizar entrada com legenda</label>
        <select value={selected.cueCaptionId||''} onChange={e=>patch(selected.id,{cueCaptionId:e.target.value||undefined})}>
          <option value="">Tempo livre do plano</option>
          {scopedCaptions.map(c=><option key={c.id} value={c.id}>
            {time(c.startFrame-shot.startFrame)} s · {c.text.slice(0,55)}
          </option>)}
        </select>
      </div>
      <div className="field"><label>Comportamento animado</label>
        <select value={selected.behavior}
          onChange={e=>patch(selected.id,{behavior:e.target.value as SceneLayer['behavior']})}>
          {layerBehaviors.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      <div className="twoCols">
        <div className="field"><label>Cor principal</label>
          <input type="color" value={selected.color} onChange={e=>patch(selected.id,{color:e.target.value})}/></div>
        <div className="field"><label>Intensidade (0–3)</label>
          <input type="number" step=".1" min={0} max={3} value={selected.behaviorIntensity}
            onChange={e=>patch(selected.id,{behaviorIntensity:Number(e.target.value)})}/></div>
      </div>
      <div className="field"><label>Propriedade de keyframes</label>
        <select value={property} onChange={e=>setProperty(e.target.value as keyof LayerMotion)}>
          {(Object.keys(labels) as (keyof LayerMotion)[]).map(key=>
            <option key={key} value={key}>{labels[key]}</option>)}</select></div>
      {selected.motion[property].map((keyframe,i)=><div className="kfRow" key={i}>
        <label>Frame<input type="number" min={0} max={selected.durationFrames-1}
          value={keyframe.frame} onChange={e=>{
            modify(selected.motion[property].map((f,j)=>j===i?
              {...f,frame:Math.round(Number(e.target.value))}:f));
          }}/></label>
        <label>Valor<input type="number" step=".05" min={limits[property][0]} max={limits[property][1]}
          value={keyframe.value} onChange={e=>{
            modify(selected.motion[property].map((f,j)=>j===i?
              {...f,value:Number(e.target.value)}:f));
          }}/></label>
        <label>Curva<select value={keyframe.easing} onChange={e=>{
          modify(selected.motion[property].map((f,j)=>j===i?
            {...f,easing:e.target.value as LayerKeyframe['easing']}:f));
        }}>
          <option value="linear">Linear</option>
          <option value="ease-in">Acelera</option>
          <option value="ease-out">Desacelera</option>
          <option value="ease-in-out">Suave</option>
        </select></label>
        <button title="Remover quadro-chave" onClick={()=>modify(selected.motion[property].filter((_,j)=>j!==i))}>×</button>
      </div>)}
      <div className="projectActions">
        <button disabled={selected.motion[property].length>=40}
          onClick={()=>{
            const current=selected.motion[property];
            const occupied=new Set(current.map(f=>f.frame));
            const target=Array.from({length:selected.durationFrames},(_,i)=>i)
              .find(i=>!occupied.has(i));
            if(target===undefined)return;
            modify([...current,{frame:target,value:property==='scale'||property==='opacity'?1:0,easing:'ease-in-out'}]);
          }}>+ Quadro-chave</button>
        <button disabled={layers.length>=48} onClick={copy}>Duplicar objeto</button>
        <button onClick={()=>{
          if(!window.confirm('Remover somente este elemento deste plano?'))return;
          onEdit({layers:layers.filter(l=>l.id!==selected.id)});onSelected(null);
        }}>Excluir objeto</button>
      </div>
    </>}
  </section>;
}
