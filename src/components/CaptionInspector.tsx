import type {Caption} from '../model/project';
export function CaptionInspector({caption,onEdit,onClose}:{
  caption:Caption;onEdit:(changes:Partial<Omit<Caption,'id'>>)=>void;onClose:()=>void;
}){
  return <section className="captionInspector">
    <p className="help">{caption.words.length?
      caption.words.length+' palavras com alinhamento temporal importado. Alterar o texto ou intervalo limpará esse alinhamento para evitar destaque falso.':
      'Sem tempos por palavra: exibição normal. O Codex pode importar alinhamento real do áudio em words[] (frames absolutos).'}</p>
    <div className="panelTitle">LEGENDA SELECIONADA</div>
    <div className="field"><label>Texto</label><textarea rows={3} maxLength={600} value={caption.text}
      onChange={e=>onEdit({text:e.target.value,words:[]})}/></div>
    <div className="twoCols"><div className="field"><label>Início (s)</label>
      <input type="number" step=".1" min={0} value={(caption.startFrame/30).toFixed(2)}
        onChange={e=>onEdit({startFrame:Math.max(0,Math.round(Number(e.target.value)*30)),words:[]})}/>
    </div><div className="field"><label>Fim (s)</label>
      <input type="number" step=".1" min={0} value={(caption.endFrame/30).toFixed(2)}
        onChange={e=>onEdit({endFrame:Math.max(1,Math.round(Number(e.target.value)*30)),words:[]})}/>
    </div></div>
    <button onClick={onClose}>Concluir edição de legenda</button>
  </section>;
}
