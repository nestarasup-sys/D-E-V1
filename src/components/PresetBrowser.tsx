import {useState} from 'react';
import {PRESET_CATALOG,PRESET_CATEGORIES,instantiatePreset,
  type PresetCategory} from '../model/presets';
import type {Shot} from '../model/shots';

export function PresetBrowser({shot,onEdit,onSelected}:{
  shot:Shot;onEdit:(changes:Partial<Omit<Shot,'id'>>)=>void;
  onSelected:(id:string)=>void;
}){
  const [category,setCategory]=useState<PresetCategory|'Todas'>('Todas');
  const [filter,setFilter]=useState('');
  const choices=PRESET_CATALOG.filter(p=>
    (category==='Todas'||p.category===category)&&
    (p.title+' '+p.description+' '+p.id).toLocaleLowerCase('pt-BR')
      .includes(filter.toLocaleLowerCase('pt-BR')));
  function apply(id:string){
    if(shot.layers.length>0&&!window.confirm(
      'Substituir a composição deste plano? As camadas atuais serão trocadas, mas o histórico do projeto poderá recuperá-las.')){
      return;
    }
    const layers=instantiatePreset(id,{
      title:shot.title||'NOVA COMPOSIÇÃO',subtitle:shot.subtitle,
      durationFrames:shot.durationFrames,accentColor:shot.accentColor,
    },()=>crypto.randomUUID());
    onEdit({presetId:id,layers,kind:'graphic'});
    onSelected(layers.find(l=>l.kind==='character')?.id??layers[0]?.id??'');
  }
  return <details className="presetBrowser">
    <summary className="panelTitle">50 COMPOSIÇÕES · GALERIA</summary>
    <p className="help">Modelos em camadas editáveis, não imagens estáticas. O Codex também pode construir uma composição do zero.</p>
    <select aria-label="Categoria de composição" value={category}
      onChange={e=>setCategory(e.target.value as PresetCategory|'Todas')}>
      <option value="Todas">Todas as bibliotecas</option>
      {PRESET_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
    <input aria-label="Pesquisar composições" placeholder="Pesquisar personagem, cidade, gráfico..."
      value={filter} onChange={e=>setFilter(e.target.value)}/>
    <div className="presetResults" role="list">
      {choices.map(p=><button type="button" role="listitem" key={p.id} className="presetChoice"
        onClick={()=>apply(p.id)}>
        <strong>{p.title}</strong><span>{p.category}</span>
        <small>{p.description}</small>
        {shot.presetId===p.id&&<em>Aplicada neste plano</em>}
      </button>)}
      {!choices.length&&<p className="help">Nenhuma composição corresponde à busca.</p>}
    </div>
  </details>;
}
