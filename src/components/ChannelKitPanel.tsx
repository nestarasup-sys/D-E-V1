import type {ChannelKit} from '../model/shots';

export function ChannelKitPanel({kit,onChange}:{kit:ChannelKit;onChange:(changes:Partial<ChannelKit>)=>void}){
  return <section className="channelKitPanel">
    <div className="panelTitle">IDENTIDADE DO CANAL</div>
    <p className="help">A marca, a tipografia e o estilo de legenda valem para o episódio. A cor do canal orienta novos planos; cores de planos existentes continuam ajustáveis individualmente.</p>
    <div className="field"><label>Nome / marca</label>
      <input maxLength={90} value={kit.brandName} onChange={e=>onChange({brandName:e.target.value})}/></div>
    <div className="twoCols">
      <div className="field"><label>Fonte de sistema</label>
        <select value={kit.font} onChange={e=>onChange({font:e.target.value as ChannelKit['font']})}>
          <option value="sans">Sem serifa</option><option value="serif">Serifa</option><option value="mono">Mono</option>
        </select></div>
      <div className="field"><label>Cor do canal</label>
        <input type="color" value={kit.accentColor} onChange={e=>onChange({accentColor:e.target.value})}/>
      </div>
    </div>
    <div className="field"><label>Estilo de legenda</label>
      <select value={kit.captionStyle} onChange={e=>onChange({captionStyle:e.target.value as ChannelKit['captionStyle']})}>
        <option value="boxed">Com fundo escuro</option><option value="minimal">Minimalista</option>
      </select>
    </div>
  </section>;
}
