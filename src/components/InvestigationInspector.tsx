import type {Evidence} from '../model/project';
import type {Shot,InvestigationData} from '../model/shots';

export function InvestigationInspector({shot,evidence,onEdit}:{
  shot:Shot;evidence:Evidence[];onEdit:(changes:Partial<Omit<Shot,'id'>>)=>void;
}){
  const data=shot.investigation;
  function change(changes:Partial<InvestigationData>){
    onEdit({investigation:{...data,...changes}});
  }
  const record=evidence.find(item=>item.id===data.sourceEvidenceId);
  return <section className="investigationInspector">
    <div className="panelTitle">DIREÇÃO INVESTIGATIVA</div>
    <p className="help">Elementos visuais demonstrativos não substituem documentos reais. Apenas evidências verificadas por você recebem indicação de origem conferida.</p>
    <div className="field"><label>Finalidade do plano</label>
      <select value={shot.purpose||'context'}
        onChange={event=>onEdit({purpose:event.target.value as NonNullable<Shot['purpose']>})}>
        <option value="hook">Pergunta / gancho</option><option value="context">Contextualizar</option>
        <option value="proof">Apresentar evidência</option><option value="data">Explicar dados</option>
        <option value="contrast">Comparar</option><option value="location">Localização / relação</option>
        <option value="transition">Transição / respiro</option><option value="conclusion">Conclusão</option>
      </select>
    </div>
    <div className="field"><label>Natureza da representação</label>
      <select value={data.representation}
        onChange={event=>change({representation:event.target.value as InvestigationData['representation']})}>
        <option value="illustration">Ilustração / elemento editorial</option>
        <option value="reconstruction">Reconstrução editorial identificada</option>
        <option value="source-excerpt">Trecho de fonte — exige evidência vinculada</option>
      </select>
    </div>
    <div className="field"><label>Fonte vinculada</label>
      <select value={data.sourceEvidenceId||''} onChange={event=>change({
        sourceEvidenceId:event.target.value||undefined,
        representation:event.target.value?data.representation:'illustration',
      })}>
        <option value="">Sem fonte (ilustração)</option>
        {evidence.map(record=><option value={record.id} key={record.id}>
          {record.sourceTitle} · {record.reviewStatus==='verified'?'conferida':record.reviewStatus==='rejected'?'rejeitada':'pendente'}
        </option>)}
      </select>
    </div>
    <p className="help">{record?
      'Origem atual: '+record.sourceTitle+'. Estado: '+(record.reviewStatus==='verified'?'verificado por você':record.reviewStatus==='rejected'?'rejeitado':'aguardando revisão'):
      'Sem referência factual verificada. O vídeo exibirá claramente a indicação ilustrativa.'}</p>
    {(shot.style==='document'||shot.style==='dossier'||shot.style==='evidence')&&<>
      <div className="field"><label>Trecho ilustrado / transcrito</label>
        <textarea rows={4} value={data.excerpt} maxLength={600}
          onChange={event=>change({excerpt:event.target.value})}/></div>
      <div className="field"><label>Texto destacado</label>
        <input value={data.highlight} maxLength={140}
          onChange={event=>change({highlight:event.target.value})}/></div>
    </>}
    {shot.style==='chart'&&<div className="field">
      <label>Unidade de medida</label>
      <input value={data.unit} maxLength={24} onChange={event=>change({unit:event.target.value})}/>
      <p className="help">Gráficos com números precisam de fonte vinculada. Não invente valores para preencher o vídeo.</p>
      {data.points.map((point,index)=><div className="directorPoint" key={index}>
        <input aria-label={'Categoria '+(index+1)} maxLength={45} value={point.label}
          onChange={event=>change({points:data.points.map((item,i)=>i===index?{...item,label:event.target.value}:item)})}/>
        <input aria-label={'Valor '+(index+1)} type="number" value={point.value} step="any"
          onChange={event=>{
            const value=Number(event.target.value);
            if(Number.isFinite(value))change({points:data.points.map((item,i)=>i===index?{...item,value}:item)});
          }}/>
        <button aria-label={'Remover categoria '+(index+1)}
          onClick={()=>change({points:data.points.filter((_,i)=>i!==index)})}>×</button>
      </div>)}
      <button disabled={data.points.length>=8} onClick={()=>change({points:[...data.points,{label:'Categoria',value:0}]})}>+ Categoria</button>
    </div>}
    {shot.style==='comparison'&&<div className="twoCols">
      {(['leftLabel','leftValue','rightLabel','rightValue'] as const).map(key=>
        <div className="field" key={key}>
          <label>{key==='leftLabel'?'Rótulo esquerdo':key==='rightLabel'?'Rótulo direito':key==='leftValue'?'Valor esquerdo':'Valor direito'}</label>
          <input maxLength={80} value={data[key]} onChange={event=>change({[key]:event.target.value})}/>
        </div>)}
    </div>}
    {shot.style==='map'&&<div className="field">
      <label>Pontos do esquema (um por linha, até 4)</label>
      <textarea rows={4} value={data.locationLabels.join('\n')}
        onChange={event=>change({locationLabels:event.target.value.split('\n').slice(0,4).map(x=>x.trim()).filter(Boolean)})}/>
      <p className="help">O plano é um diagrama de relações, NÃO um mapa preciso. Para mapa geográfico, importe imagem ou vídeo com fonte legítima.</p>
    </div>}
  </section>;
}
