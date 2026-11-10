/* Desenha a participação dos produtos e a curva acumulada da classificação ABC. Recebe os resultados calculados pelo domínio, sem gravar dados. */
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = (value,digits=0) => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:digits}).format(value);
const currency = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);

/** Gera o Pareto com barras de faturamento e linha acumulada; trata ausência de receita. */
export function paretoChart(products) {
  const sorted=products.filter(p=>p.revenue>0).slice().sort((a,b)=>b.revenue-a.revenue||a.id-b.id);
  const total=sorted.reduce((n,p)=>n+p.revenue,0);
  if(!sorted.length)return '<section class="panel pareto-panel"><div class="empty"><h2>Curva ABC · Pareto</h2><p>O gráfico aparecerá quando houver produtos com faturamento no histórico.</p></div></section>';
  const width=1060,height=330,left=80,right=63,top=34,bottom=53;
  const plotWidth=width-left-right,plotHeight=height-top-bottom;
  const max=sorted[0].revenue*1.15,step=plotWidth/sorted.length,barWidth=Math.min(46,step*.65);
  const x=i=>left+step*(i+.5), yMoney=v=>top+plotHeight*(1-v/max),yPercent=v=>top+plotHeight*(1-v);
  const colors={A:'var(--accent2)',B:'var(--accent)',C:'var(--amber)'};
  let running=0;
  const points=sorted.map((p,i)=>{const before=running;running+=p.revenue;return {...p,share:p.revenue/total,cumulative:running/total,abc:before/total<.8?'A':before/total<.95?'B':'C',x:x(i)};});
  const labelEvery=Math.max(1,Math.ceil(points.length/12));
  const grids=[0,.25,.5,.75,1].map(f=>`<line class="pareto-grid" x1="${left}" x2="${width-right}" y1="${yMoney(max*f)}" y2="${yMoney(max*f)}"/><text x="${left-12}" y="${yMoney(max*f)+4}" text-anchor="end">${number(max*f)}</text><text x="${width-right+12}" y="${yPercent(f)+4}">${number(f*100)}%</text>`).join('');
  const thresholds=[.8,.95].map(f=>`<line class="pareto-threshold" x1="${left}" x2="${width-right}" y1="${yPercent(f)}" y2="${yPercent(f)}"/><text class="pareto-threshold-label" x="${left+8}" y="${yPercent(f)+(f===.95?13:-6)}">Limite ${number(f*100)}%</text>`).join('');
  const bars=points.map((p,i)=>{
    const label=`${i+1}º · ${p.name} · Classe ${p.abc} · Faturamento ${currency(p.revenue)} · Acumulado ${number(p.cumulative*100,1)}%. Abrir detalhes.`;
    return `<rect class="pareto-bar" x="${p.x-barWidth/2}" y="${yMoney(p.revenue)}" width="${barWidth}" height="${top+plotHeight-yMoney(p.revenue)}" rx="2" fill="${colors[p.abc]}" role="button" tabindex="0" aria-label="${escape(label)}" data-action="detail" data-id="${p.id}"><title>${escape(label)}</title></rect>${i%labelEvery===0||i===points.length-1?`<text x="${p.x}" y="${height-bottom+21}" text-anchor="middle">${i+1}º</text>`:''}`;
  }).join('');
  const curve=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)},${yPercent(p.cumulative).toFixed(2)}`).join(' ');
  const firstB=points.findIndex(p=>p.abc==='B'), firstC=points.findIndex(p=>p.abc==='C');
  const describeClass=(abc,start,end)=>`Classe ${abc}: ${start+1}º ao ${end}º produto`;
  const descriptions=[describeClass('A',0,firstB<0?points.length:firstB),firstB<0?'':describeClass('B',firstB,firstC<0?points.length:firstC),firstC<0?'':describeClass('C',firstC,points.length)].filter(Boolean);
  return `<section class="panel pareto-panel" aria-labelledby="pareto-heading"><div class="panel-head"><div><h2 id="pareto-heading">Curva ABC · Gráfico de Pareto</h2><p>Faturamento por produto, do maior para o menor, e participação acumulada</p></div><span class="chip">${points.length} produtos com vendas</span></div><div class="panel-body"><div class="pareto-legend"><span><i style="background:var(--accent2)"></i>Classe A</span><span><i style="background:var(--accent)"></i>Classe B</span><span><i style="background:var(--amber)"></i>Classe C</span><span><i class="pareto-line-key"></i>Faturamento acumulado</span><span><i class="pareto-dash-key"></i>Limites de 80% e 95%</span></div><div class="pareto-scroll" tabindex="0" role="region" aria-label="Gráfico de Pareto; barras abrem os detalhes dos produtos"><svg class="pareto-svg" viewBox="0 0 ${width} ${height}" role="group" aria-labelledby="pareto-title pareto-description"><title id="pareto-title">Gráfico de Pareto da classificação ABC</title><desc id="pareto-description">Barras representam o faturamento em reais de ${points.length} produtos. A linha representa a porcentagem acumulada, chegando a 100%. ${escape(descriptions.join('. '))}. Consulte o nome e o valor de cada produto nas barras ou na tabela abaixo.</desc><text x="${left}" y="16">Faturamento (R$)</text><text x="${width-right}" y="16" text-anchor="end">Acumulado (%)</text>${grids}${thresholds}${bars}<path class="pareto-curve" d="${curve}"/><circle class="pareto-end" cx="${points.at(-1).x}" cy="${yPercent(1)}" r="3"/><text x="${left+plotWidth/2}" y="${height-4}" text-anchor="middle">Produtos ordenados por faturamento</text></svg></div><div class="pareto-ranges">${descriptions.map(t=>`<span>${escape(t)}</span>`).join('')}</div><div class="chart-caption">Passe o cursor ou selecione uma barra para consultar o produto. A: até cruzar 80% do faturamento; B: até cruzar 95%; C: restante. O gráfico considera todo o histórico disponível; os filtros abaixo se aplicam à tabela.</div></div></section>`;
}
