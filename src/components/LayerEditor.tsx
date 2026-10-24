import {useState} from 'react';
import type {Caption,Asset,Evidence} from '../model/project';
import {emptyLayerMotion,layerSchema,layerBehaviors,layerKinds,
  type SceneLayer,type LayerMotion,type LayerKeyframe,type RigPose} from '../model/layers';
import type {Shot} from '../model/shots';

const labels:Record<keyof LayerMotion,string>={
  x:'Posição X',y:'Posição Y',scale:'Escala',rotation:'Rotação',opacity:'Opacidade',
};
const types:Record<SceneLayer['kind'],string>={
  text:'Texto',character:'Personagem',object:'Objeto',building:'Construção',
  scene:'Cenário',chart:'Gráfico',shape:'Forma',connector:'Linha/seta',
  particles:'Partículas',image:'Imagem importada',group:'Grupo animado',vector:'Caminho vetorial',
};
const time=(n:number)=>(n/30).toFixed(2);
const limits:{[K in keyof LayerMotion]:[number,number]}={
  x:[-1920,1920],y:[-1080,1080],scale:[.1,5],rotation:[-360,360],opacity:[0,1],
};
const create=(kind:SceneLayer['kind'],duration:number,assetId?:string):SceneLayer=>layerSchema.parse({
  id:crypto.randomUUID(),kind,name:'Novo '+types[kind],
  x:kind==='scene'?0:kind==='group'?200:480,y:kind==='scene'?0:kind==='group'?140:400,
  zIndex:kind==='scene'?-5:1,
  width:kind==='text'?900:kind==='scene'?1920:kind==='group'?1200:330,
  height:kind==='text'?170:kind==='scene'?1080:kind==='group'?700:330,
  startFrame:0,durationFrames:duration,text:kind==='text'?'TEXTO EDITÁVEL':'',
  vectorPath:kind==='vector'?'M 10 10 L 300 140 L 20 290 Z':'',
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
    if(!selected)return;
    const descendants:SceneLayer[]=[];
    function collect(id:string){
      for(const child of layers.filter(l=>l.parentId===id)){
        descendants.push(child);collect(child.id);
      }
    }
    collect(selected.id);
    const originals=[selected,...descendants];
    if(layers.length+originals.length>48)return;
    const ids=new Map(originals.map(l=>[l.id,crypto.randomUUID()]));
    const cloned=originals.map((l,i)=>({
      ...structuredClone(l),id:ids.get(l.id)!,name:l.name+' (cópia)',
      parentId:l.parentId&&ids.has(l.parentId)?ids.get(l.parentId):l.parentId,
      x:l.x+(i===0?45:0),y:l.y+(i===0?30:0),zIndex:l.zIndex+(i===0?1:0),
    }));
    onEdit({layers:[...layers,...cloned]});
    onSelected(cloned[0].id);
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
      <div className="field"><label>Grupo pai (posição e tempo relativos ao grupo)</label>
        <select value={selected.parentId||''} onChange={e=>patch(selected.id,{parentId:e.target.value||undefined})}>
          <option value="">Sem grupo · elemento na tela</option>
          {layers.filter(l=>l.kind==='group'&&l.id!==selected.id&&
            !(() => {let next=l.parentId;const seen=new Set<string>();while(next&&!seen.has(next)){
              if(next===selected.id)return true;seen.add(next);
              next=layers.find(item=>item.id===next)?.parentId;
            }return false;})()).map(l=>
            <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {(selected.kind==='text')&&<div className="field"><label>Texto</label>
        <textarea rows={3} maxLength={400} value={selected.text}
          onChange={e=>patch(selected.id,{text:e.target.value})}/></div>}
      {selected.kind==='text'&&<div className="field"><label>Tamanho da letra</label>
        <input type="number" min={12} max={260} value={selected.fontSize}
          onChange={e=>patch(selected.id,{fontSize:Math.round(Number(e.target.value))})}/></div>}
      {selected.kind==='text'&&<>
        <div className="field"><label>Fonte portátil importada (mesma fonte na prévia e MP4)</label>
          <select value={selected.fontFamily.startsWith('DSFont-')?selected.fontFamily:''}
            onChange={e=>patch(selected.id,{fontFamily:e.target.value||'Arial'})}>
            <option value="">Fonte instalada no computador / Arial</option>
            {assets.filter(a=>a.kind==='font').map(a=><option key={a.id}
              value={'DSFont-'+a.id}>{a.name} · {a.rights.redistributionAllowed?'portátil':'somente local'}</option>)}
          </select></div>
        <div className="field"><label>Família tipográfica (fallback Arial)</label>
          <input maxLength={100} value={selected.fontFamily}
            onChange={e=>patch(selected.id,{fontFamily:e.target.value})}/></div>
        <div className="twoCols">
          <div className="field"><label>Peso da fonte (100–900)</label>
            <input type="number" min={100} max={900} step={100} value={selected.fontWeight}
              onChange={e=>patch(selected.id,{fontWeight:Math.round(Number(e.target.value))})}/></div>
          <div className="field"><label>Alinhamento</label>
            <select value={selected.textAlign}
              onChange={e=>patch(selected.id,{textAlign:e.target.value as SceneLayer['textAlign']})}>
              <option value="left">Esquerda</option><option value="center">Centro</option>
              <option value="right">Direita</option></select></div>
          <div className="field"><label>Espaçamento entre letras (px)</label>
            <input type="number" min={-15} max={60} step=".5" value={selected.letterSpacing}
              onChange={e=>patch(selected.id,{letterSpacing:Number(e.target.value)})}/></div>
          <div className="field"><label>Altura de linha</label>
            <input type="number" min={.75} max={2.5} step=".05" value={selected.lineHeight}
              onChange={e=>patch(selected.id,{lineHeight:Number(e.target.value)})}/></div>
          <div className="field"><label>Cor do contorno</label>
            <input type="color" value={selected.strokeColor}
              onChange={e=>patch(selected.id,{strokeColor:e.target.value})}/></div>
          <div className="field"><label>Contorno (px)</label>
            <input type="number" min={0} max={12} step=".5" value={selected.strokeWidth}
              onChange={e=>patch(selected.id,{strokeWidth:Number(e.target.value)})}/></div>
        </div>
        <p className="help">Para animar palavra por palavra, selecione word-reveal em Comportamento. Fontes importadas são carregadas igualmente no preview e no MP4; só serão incluídas no pacote com permissão de redistribuição.</p>
      </>}
      {selected.kind==='vector'&&<div className="field"><label>Caminho SVG (d) · coordenadas internas</label>
        <textarea rows={3} value={selected.vectorPath} maxLength={2000}
          onChange={e=>patch(selected.id,{vectorPath:e.target.value})}/></div>}
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
      {selected.kind==='character'&&<div className="shotMotion">
        <div className="panelTitle">PERSONAGEM ARTICULADO · POSES EDITÁVEIS</div>
        <p className="help">Braços, pernas, cabeça, olhos e expressão em graus/deslocamento. Quadros-chave animam cada articulação sem achatar o personagem.</p>
        <div className="twoCols">
          {(Object.keys(selected.rig) as (keyof RigPose)[]).map(key=>
            <div className="field" key={key}><label>{key}</label>
              <input type="number" step=".5" value={selected.rig[key]}
                onChange={e=>patch(selected.id,{rig:{...selected.rig,[key]:Number(e.target.value)}})}/>
            </div>)}
        </div>
        <div className="projectActions"><button disabled={selected.rigKeys.length>=40} onClick={()=>{
          const taken=new Set(selected.rigKeys.map(k=>k.frame));
          const frame=Array.from({length:selected.durationFrames},(_,i)=>i).find(i=>!taken.has(i));
          if(frame===undefined)return;
          patch(selected.id,{rigKeys:[...selected.rigKeys,{frame,pose:{...selected.rig},easing:'ease-in-out' as const}].sort((a,b)=>a.frame-b.frame)});
        }}>+ Pose no frame</button></div>
        {selected.rigKeys.map((key,i)=><div key={'pose-'+i}>
          <div className="kfRow"><label>Frame<input type="number" min={0} max={selected.durationFrames-1}
            value={key.frame} onChange={e=>patch(selected.id,{rigKeys:selected.rigKeys.map((k,j)=>i===j?
              {...k,frame:Math.round(Number(e.target.value))}:k).sort((a,b)=>a.frame-b.frame)})}/></label>
            <button onClick={()=>patch(selected.id,{rigKeys:selected.rigKeys.filter((_,j)=>j!==i)})}>Excluir pose</button></div>
          <div className="twoCols">{(Object.keys(key.pose) as (keyof RigPose)[]).map(joint=>
            <div className="field" key={joint}><label>{joint}</label>
              <input type="number" step=".5" value={key.pose[joint]}
                onChange={e=>patch(selected.id,{rigKeys:selected.rigKeys.map((k,j)=>i===j?
                  {...k,pose:{...k.pose,[joint]:Number(e.target.value)}}:k)})}/></div>)}</div>
        </div>)}
      </div>}
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
      {selected.kind==='image'&&<div className="shotMotion">
        <div className="panelTitle">ENQUADRAMENTO INTELIGENTE · B-ROLL</div>
        <div className="field"><label>Encaixe</label>
          <select value={selected.framing.fit} onChange={e=>patch(selected.id,{framing:{
            ...selected.framing,fit:e.target.value as 'cover'|'contain'}})}>
            <option value="cover">Preencher</option><option value="contain">Mostrar tudo</option>
          </select></div>
        <div className="twoCols">
          {(['focusX','focusY','zoom'] as const).map(k=><div className="field" key={k}>
            <label>{k}</label><input type="number" min={k==='zoom'?1:0} max={k==='zoom'?4:100}
              step={k==='zoom'?.05:1} value={selected.framing[k]}
              onChange={e=>patch(selected.id,{framing:{...selected.framing,[k]:Number(e.target.value)}})}/>
          </div>)}
        </div>
      </div>}
      {selected.kind==='chart'&&<>
        <div className="field"><label>Formato de gráfico</label>
          <select value={selected.chartType}
            onChange={e=>patch(selected.id,{chartType:e.target.value as SceneLayer['chartType']})}>
            {(['bar','line','donut','ranking','area','waterfall','cashflow','counter'] as const)
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
        <div className="panelTitle">ESTÁGIOS · MORPH DE DADOS</div>
        <p className="help">Valores animados por frame. A evidência vinculada continua obrigatória, inclusive para cascata e fluxo de dinheiro.</p>
        <button disabled={!selected.sourceEvidenceId||selected.chartStages.length>=12||!selected.values.length}
          onClick={()=>{
            const used=new Set(selected.chartStages.map(k=>k.frame));
            const frame=Array.from({length:selected.durationFrames},(_,i)=>i).find(i=>!used.has(i));
            if(frame===undefined)return;
            patch(selected.id,{chartStages:[...selected.chartStages,{
              frame,values:[...selected.values],easing:'ease-in-out' as const}].sort((a,b)=>a.frame-b.frame)});
          }}>+ Estágio animado</button>
        {selected.chartStages.map((stage,i)=><div className="kfRow" key={'chart-stage-'+i}>
          <label>Frame<input type="number" min={0} max={selected.durationFrames-1} value={stage.frame}
            onChange={e=>patch(selected.id,{chartStages:selected.chartStages.map((k,j)=>i===j?
              {...k,frame:Math.round(Number(e.target.value))}:k).sort((a,b)=>a.frame-b.frame)})}/></label>
          <label>Valores (;)<input value={stage.values.join('; ')} onChange={e=>{
            const v=e.target.value.split(';').map(x=>Number(x.trim()));
            if(v.length===selected.values.length&&v.every(Number.isFinite))
              patch(selected.id,{chartStages:selected.chartStages.map((k,j)=>i===j?{...k,values:v}:k)});
          }}/></label>
          <button onClick={()=>patch(selected.id,{chartStages:selected.chartStages.filter((_,j)=>j!==i)})}>×</button>
        </div>)}
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
        <select value={selected.cueCaptionId||''} onChange={e=>patch(selected.id,{cueCaptionId:e.target.value||undefined,
           cueWord:e.target.value?selected.cueWord:undefined})}>
          <option value="">Tempo livre do plano</option>
          {scopedCaptions.map(c=><option key={c.id} value={c.id}>
            {time(c.startFrame-shot.startFrame)} s · {c.text.slice(0,55)}
          </option>)}
        </select>
      </div>
      {selected.cueCaptionId&&<div className="shotMotion">
        <div className="panelTitle">EVENTO ACÚSTICO DE PALAVRA</div>
        <div className="field"><label>Palavra exata na legenda (opcional)</label>
          <input value={selected.cueWord||''} placeholder="Ex.: salário"
            maxLength={80} onChange={e=>patch(selected.id,{
              cueWord:e.target.value.trim()||undefined,
            })}/></div>
        <div className="twoCols">
          <div className="field"><label>Ocorrência da palavra</label>
            <input type="number" min={1} max={20} step={1} value={selected.cueOccurrence}
              onChange={e=>patch(selected.id,{
                cueOccurrence:Math.max(1,Math.min(20,Math.round(Number(e.target.value)))),
              })}/></div>
          <div className="field"><label>Ajuste fino de entrada (frames)</label>
            <input type="number" min={-120} max={120} step={1}
              value={selected.cueOffsetFrames} onChange={e=>patch(selected.id,{
                cueOffsetFrames:Math.round(Number(e.target.value)),
              })}/></div>
        </div>
        {selected.cueWord&&<small>
          A entrada usa o timestamp real do SAPI. Se a voz não fornecer o instante
          desta palavra, a animação é ocultada em vez de receber um tempo inventado.
        </small>}
      </div>}
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
      <div className="panelTitle">EFEITOS VISUAIS / MÁSCARA / DEGRADÊ</div>
      <div className="twoCols">
        <div className="field"><label>Desfoque (px)</label><input type="number" min={0} max={40}
          value={selected.effects.blur} onChange={e=>patch(selected.id,{effects:{
            ...selected.effects,blur:Number(e.target.value)}})}/></div>
        <div className="field"><label>Cantos arredondados (px)</label>
          <input type="number" min={0} max={300} value={selected.effects.radius}
            onChange={e=>patch(selected.id,{effects:{...selected.effects,radius:Number(e.target.value)}})}/></div>
        <div className="field"><label>Sombra · desfoque</label><input type="number" min={0} max={80}
          value={selected.effects.shadowBlur} onChange={e=>patch(selected.id,{effects:{
            ...selected.effects,shadowBlur:Number(e.target.value)}})}/></div>
        <div className="field"><label>Cor da sombra</label>
          <input type="color" value={selected.effects.shadowColor}
            onChange={e=>patch(selected.id,{effects:{
              ...selected.effects,shadowColor:e.target.value}})}/></div>
        <div className="field"><label>Deslocamento da sombra X</label>
          <input type="number" min={-100} max={100} value={selected.effects.shadowX}
            onChange={e=>patch(selected.id,{effects:{
              ...selected.effects,shadowX:Number(e.target.value)}})}/></div>
        <div className="field"><label>Deslocamento da sombra Y</label>
          <input type="number" min={-100} max={100} value={selected.effects.shadowY}
            onChange={e=>patch(selected.id,{effects:{
              ...selected.effects,shadowY:Number(e.target.value)}})}/></div>
      </div>
      <div className="field"><label>Máscara</label><select value={selected.effects.mask}
        onChange={e=>patch(selected.id,{effects:{...selected.effects,
          mask:e.target.value as SceneLayer['effects']['mask']}})}>
        <option value="none">Nenhuma</option><option value="circle">Círculo</option>
        <option value="ellipse">Elipse</option>
      </select></div>
      <div className="field"><label><input type="checkbox" checked={!!selected.effects.gradient}
        onChange={e=>patch(selected.id,{effects:{...selected.effects,
          gradient:e.target.checked?{from:selected.color,to:selected.secondaryColor,angle:90}:undefined}})}/>
        Degradê (forma, texto ou vetor)</label></div>
      {selected.effects.gradient&&<div className="twoCols">
        <div className="field"><label>Degradê inicial</label><input type="color"
          value={selected.effects.gradient.from}
          onChange={e=>patch(selected.id,{effects:{...selected.effects,gradient:{
            ...selected.effects.gradient!,from:e.target.value}}})}/></div>
        <div className="field"><label>Degradê final</label><input type="color"
          value={selected.effects.gradient.to}
          onChange={e=>patch(selected.id,{effects:{...selected.effects,gradient:{
            ...selected.effects.gradient!,to:e.target.value}}})}/></div>
        <div className="field"><label>Ângulo (0–360)</label><input type="number" min={0} max={360}
          value={selected.effects.gradient.angle}
          onChange={e=>patch(selected.id,{effects:{...selected.effects,gradient:{
            ...selected.effects.gradient!,angle:Number(e.target.value)}}})}/></div>
      </div>}
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
        <button disabled={layers.length>=48} onClick={copy}>Duplicar objeto/grupo</button>
        <button onClick={()=>{
          if(!window.confirm('Remover este elemento? Se for um grupo, os elementos internos tambem serao removidos.'))return;
          const ids=new Set<string>([selected.id]);
          let found=true;
          while(found){found=false;for(const layer of layers){
            if(layer.parentId&&ids.has(layer.parentId)&&!ids.has(layer.id)){
              ids.add(layer.id);found=true;
            }
          }}
          onEdit({layers:layers.filter(l=>!ids.has(l.id))});onSelected(null);
        }}>Excluir objeto</button>
      </div>
    </>}
  </section>;
}
