import {categoryChoices,installCategoryCreation,categoryFilterLinks,matchesCategories} from './categories.mjs?v=20261111-category-links-1';
import { formatPhone } from './suppliers.mjs?v=20261111-phone-1';
/* Coordena as telas, os filtros e os eventos da interface. As regras de cálculo ficam nos módulos de domínio; a leitura e a gravação passam pelo serviço de dados. */
import { checkoutPage, mountCheckout } from './checkout.mjs?v=20261110-demo-checkout-1';
import { CATEGORIES, supplierError, upsertSupplier } from './suppliers.mjs';
import { paretoChart } from './pareto.mjs';
import { loadData, saveData, resetDemo, isDemo } from './data-service.mjs';
import { sum, mean, abcProducts, planProduct } from './domain.mjs';

const paths = {
 empty:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M6 6l12 12',
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 box:'m12 3 9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9 M7 5l9 5',
 cart:'M2 3h3l3 12h11l3-9H6 M9 20h.01 M18 20h.01',
 chart:'M4 3v17h17 M8 15v-4 M13 15V7 M18 15V4',
 spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
 layers:'m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
 refresh:'M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M21 21v-5h-5',
 sun:'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 menu:'M4 6h16 M4 12h16 M4 18h16', search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 arrow:'M4 12h16 M14 6l6 6-6 6',download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
 plus:'M12 4v16 M4 12h16',clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 alert:'m12 3 10 18H2z M12 9v5 M12 17h.01',check:'m5 12 4 4L20 5',
 edit:'m15 4 5 5 M3 21l5-1L21 7l-5-5L3 15z',close:'m6 6 12 12 M6 18 18 6',
 money:'M3 5h18v14H3z M7 12h.01 M17 12h.01 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15'
};
const icon = name => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.box}"/></svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num = (v, decimals = 0) => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(v);
const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(v);
const shortDate = value => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(value.length === 10 ? value+'T12:00:00Z' : value));
const labels = {checkout:'Saída rápida',overview:'Visão geral', inventory:'Estoque',orders:'Pedidos',sales:'Vendas',forecast:'Previsão de demanda',abc:'Curva ABC',replenishment:'Reposição',suppliers:'Fornecedores'};
const state = {page:'inventory',search:'',selectedCategories:[],category:'',abc:'',status:'',supplier:'',minStock:0,sort:'priority',productId:0,leadTime:5,safetyDays:2,selected:new Set()};
let data, rows = [], toastTimer, productDraft = null;
const root = document.querySelector('#content');
const dialog = document.querySelector('#editor');
const fillIcons = () => document.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML=icon(el.dataset.icon);});
/** Exibe uma mensagem temporária e substitui o temporizador da mensagem anterior. */
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),4200); }
/** Persiste alterações da demonstração e avisa quando o navegador não permite armazenamento. */
function persist() { if (!saveData(data)) toast('Alterações mantidas nesta sessão. O armazenamento do navegador está indisponível.'); }
/** Recalcula a classificação ABC e a reposição a partir dos dados e parâmetros atuais. */
function rebuild() { rows = abcProducts(data.products,data.history).map(p=>planProduct(p,data.history,data.predictions,data.orders,state.leadTime,7,state.safetyDays)); }
const risk = p => ['Ruptura','Crítico','Abaixo do mínimo','Atenção'].includes(p.status);
const priority = (a,b) => (a.abc || 'Z').localeCompare(b.abc || 'Z') || (a.coverage ?? Infinity)-(b.coverage ?? Infinity) || a.id-b.id;
const badge = p => p.abc ? `<span class="badge ${p.abc}">${p.abc}</span>` : '<span class="muted">—</span>';
const status = p => `<span class="status ${['Ruptura','Crítico'].includes(p.status)?'red':p.status==='Regular'?'':'amber'}">${p.status}</span>`;
const product = p => `<div class="product-cell"><span class="product-icon">${icon(p.category==='Publicações'?'book':'box')}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.category)} · #${String(p.id).padStart(3,'0')}</small></span></div>`;
const stat = (title,value,foot,glyph='box',color='') => `<article class="stat"><div class="stat-top">${title}<span class="stat-icon ${color}">${icon(glyph)}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></article>`;
const heading = (title,subtitle,buttons='') => `<div class="page-heading"><div><div class="eyebrow">${['forecast','abc','replenishment'].includes(state.page)?'INTELIGÊNCIA PARA COMPRAR MELHOR':'SUA OPERAÇÃO, CONECTADA'}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${buttons}</div></div>`;
const exportButton = () => `<button class="btn" data-action="export">${icon('download')}Exportar CSV</button>`;
const banner = () => isDemo ? `<div class="banner">${icon('spark')}<span>Modo demonstração · Histórico sintético e projeções ilustrativas. Nenhuma previsão do modelo Python foi executada.</span><a href="#forecast">Explorar previsões →</a></div>` : `<div class="banner">${icon('refresh')}<span>Dados recebidos da API · Atualizado em ${esc(data.generatedAt ? shortDate(data.generatedAt) : 'data não informada')} · Operação em modo de consulta.</span></div>`;
const empty = (title,message) => `<div class="empty">${icon('search')}<h3>${title}</h3><p>${message}</p></div>`;
const table = (headers,body) => `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
const orderStatus = o => ({draft:['Rascunho','neutral'],pending:['Em aberto','amber'],received:['Recebido',''],cancelled:['Cancelado','red']}[o.status]);
/** Agrupa os indicadores de faturamento por classe ABC para os painéis. */
function abcSummary() {
  return ['A','B','C'].map(abc=>({abc,items:rows.filter(p=>p.abc===abc),share:sum(rows.filter(p=>p.abc===abc),p=>p.share)}));
}
/** Monta o painel resumido de participação das classes ABC. */
function abcPanel() {
  const classes=abcSummary();
  return `<section class="panel"><div class="panel-head"><div><h2>O peso de cada produto</h2><p>Participação no faturamento · ${isDemo?'180 dias':'histórico disponível'}</p></div><a class="btn text" href="#abc" aria-label="Ver curva ABC">${icon('arrow')}</a></div><div class="panel-body"><div class="abc-stacked" role="img" aria-label="Participação das classes A, B e C no faturamento">${classes.map(c=>`<span style="width:${c.share*100}%"></span>`).join('')}</div>${classes.map(c=>`<div class="abc-line"><span class="badge ${c.abc}">${c.abc}</span><div class="detail"><strong>Classe ${c.abc}</strong><small>${c.items.length} produtos ${c.abc==='A'?'· Maior participação':''}</small></div><span class="percent">${num(c.share*100,1)}%</span></div>`).join('')}<div class="abc-note">${icon('layers')} A curva ABC considera faturamento, não margem de lucro.</div></div></section>`;
}
/** Agrega quantidades por data para os produtos selecionados na origem informada. */
function seriesFor(ids, source) {
  const dates = new Map();
  for(const h of source) if(ids.has(h.productId)) dates.set(h.date,(dates.get(h.date)||0)+h.quantity);
  return [...dates].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,quantity])=>({date,quantity}));
}
/** Gera o gráfico SVG de histórico e previsão com rótulo acessível. */
function lineChart(historical, predicted, chartLabel = 'Demanda histórica e prevista') {
  const past=historical.slice(-14), future=predicted.slice(0,7), values=[...past,...future];
  if (!values.length) return empty('Sem dados para o gráfico','Registre vendas para acompanhar a demanda.');
  const width=650,height=216,left=38,right=16,top=17,bottom=30;
  const max=Math.max(1,...values.map(h=>h.quantity))*1.15;
  const x=i=>left+i*(width-left-right)/Math.max(1,values.length-1);
  const y=v=>height-bottom-v/max*(height-bottom-top);
  const path=(list,offset)=>list.map((h,i)=>`${i?'L':'M'}${x(i+offset).toFixed(1)},${y(h.quantity).toFixed(1)}`).join(' ');
  const boundary=Math.max(0,past.length-1);
  const predictionPoints = past.length && future.length ? [past.at(-1),...future] : future;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(chartLabel)}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9981dc" stop-opacity=".16"/><stop offset="100%" stop-color="#9981dc" stop-opacity="0"/></linearGradient></defs>${future.length?`<rect x="${x(boundary)}" y="${top}" width="${width-right-x(boundary)}" height="${height-bottom-top}" fill="url(#chart-fill)"/>`:''}${[0,.25,.5,.75,1].map(f=>`<line class="grid" x1="${left}" x2="${width-right}" y1="${y(max*f)}" y2="${y(max*f)}"/><text x="${left-9}" y="${y(max*f)+3}" text-anchor="end">${num(max*f,max<10?1:0)}</text>`).join('')}${future.length?`<line x1="${x(boundary)}" x2="${x(boundary)}" y1="${top}" y2="${height-bottom}" stroke="#aa98d0" stroke-dasharray="3 4"/><text x="${x(boundary)+8}" y="${top+5}" style="fill:var(--accent)">Projeção</text>`:''}<path class="actual" d="${path(past,0)}"/><path class="predicted" d="${path(predictionPoints,past.length?boundary:0)}"/>${values.map((v,i)=> i%3===0||i===values.length-1?`<text x="${x(i)}" y="${height-8}" text-anchor="middle">${shortDate(v.date)}</text>`:'').join('')}</svg>`;
}
/** Monta a visão geral com indicadores, riscos e sugestões calculadas. */
function overview() {
  const atRisk=rows.filter(risk).sort(priority), ids=new Set(rows.map(p=>p.id));
  const units=sum(rows,p=>p.stock), future=sum(rows,p=>p.demand), budget=sum(rows,p=>p.suggested*p.cost);
  return heading('Visão geral','Um olhar sobre o estoque de hoje. Um passo à frente na próxima compra.',`<button class="btn" data-action="refresh">${icon('refresh')}Atualizar</button><a class="btn primary" href="#replenishment">${icon('cart')}Planejar reposição</a>`)+banner()+`<div class="stats-grid">${stat('Produtos no catálogo',num(rows.length),`${num(units)} unidades disponíveis`,'box')}${stat('Valor em estoque',money(sum(rows,p=>p.stock*p.cost)),'Valor calculado pelo custo atual','money','green')}${stat('Demanda · próximos 7 dias',num(future),`${isDemo?'Projeção demonstrativa':'Demanda prevista'} · unidades`,'spark')}${stat('Produtos em atenção',num(atRisk.length),`<span class="red-text">${atRisk.filter(p=>p.abc==='A').length} da classe A</span> · prioridade de acompanhamento`,'alert','amber')}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Antecipe o movimento</h2><p>Vendas recentes e demanda dos próximos 7 dias</p></div><span class="chip">Todos os produtos</span></div><div class="panel-body"><div class="legend"><span><i></i>Histórico de vendas</span><span><i class="purple"></i>${isDemo?'Projeção ilustrativa':'Previsão'}</span></div>${lineChart(seriesFor(ids,data.history),seriesFor(ids,data.predictions))}<div class="chart-caption">Unidades por dia · ${isDemo?'Projeção pela média dos últimos 28 dias, sem execução do modelo.':esc(data.forecastMethod||'Previsões recebidas da API.')}</div></div></section>${abcPanel()}</div><section class="panel"><div class="panel-head"><div><div class="panel-title"><h2>Produtos que merecem atenção</h2><span class="count-pill">${atRisk.length}</span></div><p>Prioridade por classe ABC e dias de cobertura</p></div><a class="btn text" href="#replenishment">Ver planejamento ${icon('arrow')}</a></div>${atRisk.length?riskTable(atRisk.slice(0,5)):empty('Estoque em dia','Nenhum produto precisa de atenção no cenário atual.')}<div class="table-footer"><span>${Math.min(5,atRisk.length)} de ${atRisk.length} produtos em atenção</span><span>Compra sugerida total: <strong>${money(budget)}</strong></span></div></section>`;
}
/** Monta a tabela dos produtos que exigem atenção, sem modificar os dados. */
function riskTable(list) {
  return table(['Produto','ABC','Estoque','Demanda · 7 dias','Cobertura','Situação',''],list.map(p=>`<tr><td>${product(p)}</td><td>${badge(p)}</td><td class="mono">${num(p.stock)} un.</td><td class="mono">${p.hasForecast?num(p.demand,1)+' un.':'—'}</td><td class="mono">${p.coverage===null?'—':num(p.coverage,1)+' dias'}</td><td>${status(p)}</td><td><button class="icon-button" data-action="detail" data-id="${p.id}" aria-label="Detalhes de ${esc(p.name)}">${icon('arrow')}</button></td></tr>`).join(''));
}
/** Monta os filtros de busca, categoria e classe usando o estado atual. */
function filterToolbar() {
  const categories=categoryChoices(data,CATEGORIES);
  const options=(list,current,all)=>`<option value="">${all}</option>`+list.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
  return `<div class="toolbar"><label class="search"><span>${icon('search')}</span><input id="search" aria-label="Buscar produto, código ou fornecedor" placeholder="Buscar produto, código, fornecedor…" value="${esc(state.search)}"></label><select id="category-filter" aria-label="Filtrar categoria">${options(categories,state.category,'Todas as categorias')}</select><select id="abc-filter" aria-label="Filtrar classe ABC">${options(['A','B','C'],state.abc,'Todas as classes')}</select><select id="status-filter" aria-label="Filtrar situação">${options(['Ruptura','Crítico','Abaixo do mínimo','Atenção','Regular'],state.status,'Todas as situações')}</select><span class="result-count" id="result-count"></span></div>`;
}
/** Aplica os filtros ativos à lista calculada de produtos, sem alterar a lista original. */
function filtered() {
  let list=rows.filter(p=> (!state.search||`${p.name} ${p.barcode} ${p.supplier} ${p.id}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(state.search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())) && (state.page==='inventory'?matchesCategories(p.category,state.selectedCategories.length?state.selectedCategories:state.category?[state.category]:[]):(!state.category||p.category===state.category)) && (!state.abc||p.abc===state.abc) && (!state.status||p.status===state.status) && (!state.supplier||p.supplier===state.supplier) && p.stock>=state.minStock);
  if(state.page==='replenishment') list=list.filter(p=>p.suggested>0);
  return list.sort(state.page==='abc'?(a,b)=>a.rank-b.rank:state.page==='inventory'?(state.sort==='quantity'?(a,b)=>b.stock-a.stock:(a,b)=>a.name.localeCompare(b.name,'pt-BR')):priority);
}
/** Estiliza os indicadores de estoque usando as cores semânticas do tema da apresentação. */
function stockStat(group,title,count,foot,glyph,color=''){
  return stat(title,num(count),foot,glyph,color).replace('<article class="stat">',`<article class="stat inventory-stat" data-stock-group="${group}">`);
}
/** Monta a página de estoque com filtros e espaço para a tabela de produtos. */
function inventory() {
  const categories=categoryChoices(data,CATEGORIES);
  const suppliers=[...new Set(rows.map(p=>p.supplier))].sort();
  const maxQty=Math.max(1,...rows.map(p=>p.stock));
  return `<div class="inventory-layout"><div class="inventory-main">`+banner()+`<div class="stats-grid">${stockStat('all','Produtos cadastrados',rows.length,'Catálogo ativo','box')}${stockStat('available','Estoque regular',rows.filter(p=>p.stock>0&&p.stock>=p.minimum).length,'No mínimo definido ou acima','check','green')}${stockStat('low','Estoque baixo',rows.filter(p=>p.stock>0&&p.stock<p.minimum).length,'Abaixo do mínimo definido','alert','amber')}${stockStat('empty','Sem estoque',rows.filter(p=>p.stock===0).length,'Sem disponibilidade','empty','red')}</div><section class="inventory-table"><div class="toolbar"><label class="search"><span>${icon('search')}</span><input id="search" aria-label="Buscar produto, código ou fornecedor" placeholder="Buscar por nome, código, fornecedor..." value="${esc(state.search)}"></label><button class="btn" data-action="toggle-sort">↕ Ordenar</button>${exportButton()}<span class="result-count" id="result-count"></span></div><div id="data-table"></div></section></div><aside class="filter-sidebar" aria-label="Filtros de estoque"><h3>Filtros</h3><label class="field">Fornecedor<select id="supplier-filter"><option value="">Todos os fornecedores</option>${suppliers.map(s=>`<option value="${esc(s)}" ${s===state.supplier?'selected':''}>${esc(s)}</option>`).join('')}</select></label>${categoryFilterLinks(categories,state.selectedCategories.length?state.selectedCategories:state.category?[state.category]:[])}<label class="field">Classe ABC<select id="abc-filter" aria-label="Filtrar classe ABC"><option value="">Todas as classes</option>${['A','B','C'].map(c=>`<option ${state.abc===c?'selected':''}>${c}</option>`).join('')}</select></label><label class="field">Situação<select id="status-filter" aria-label="Filtrar situação"><option value="">Todas as situações</option>${['Ruptura','Crítico','Abaixo do mínimo','Atenção','Regular'].map(s=>`<option ${state.status===s?'selected':''}>${s}</option>`).join('')}</select></label><div class="filter-group"><label for="qty-filter">Quantidade mín.</label><input id="qty-filter" type="range" min="0" max="${maxQty}" value="${state.minStock}"><div class="range-labels"><span>0</span><span id="qty-label">${state.minStock}</span></div></div><div class="filter-group"><label>Distribuição por categoria</label>${categories.map(c=>`<div class="category-chart"><span>${esc(c.split(' ')[0])}</span><div><i style="width:${rows.filter(p=>p.category===c).length/Math.max(1,rows.length)*100}%"></i></div><b>${rows.filter(p=>p.category===c).length}</b></div>`).join('')}</div><a class="btn primary rail-order" href="#replenishment">🛒 Iniciar Pedido</a></aside></div>`;
}

/** Monta a análise ABC e o gráfico de Pareto por faturamento. */
function abcPage() {
  const classes=abcSummary();
  return heading('Curva ABC','Entenda quais produtos concentram o faturamento e direcione sua atenção.',exportButton())+banner()+`<div class="stats-grid">${stat('Faturamento do histórico',money(sum(rows,p=>p.revenue)),isDemo?'180 dias de vendas sintéticas':'Histórico recebido da API','money','green')}${classes.map(c=>stat(`Classe ${c.abc}`,`${c.items.length} produtos`,`${num(c.share*100,1)}% do faturamento`,'layers')).join('')}</div>${paretoChart(rows)}<div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Onde está o faturamento?</h2><p>Os 6 produtos com maior participação no histórico</p></div></div><div class="panel-body">${rows.slice().sort((a,b)=>b.revenue-a.revenue).slice(0,6).map((p,i)=>`<div class="bar-item"><span><span class="rank">${i+1}</span>${esc(p.name)}</span><div class="bar-track"><span style="width:${p.revenue/Math.max(1,...rows.map(r=>r.revenue))*100}%"></span></div><span>${num(p.share*100,1)}%</span></div>`).join('')}</div></section>${abcPanel()}</div><section class="panel">${filterToolbar()}<div id="data-table"></div></section>`;
}
/** Monta a página de fornecedores e as ações permitidas pelo modo atual. */
function suppliersPage(){
  const incomplete=data.suppliers.filter(s=>!s.phone||!s.segment).length;
  return heading('Fornecedores','Contatos e segmentos dos parceiros que abastecem sua operação.',`<button class="btn primary" data-action="add-supplier" ${!isDemo?'disabled':''}>${icon('plus')}Novo fornecedor</button>`)+banner()+`<div class="stats-grid">${stat('Fornecedores',num(data.suppliers.length),'Cadastros disponíveis','box')}${stat('Cadastros completos',num(data.suppliers.length-incomplete),'Nome, telefone e segmento','check','green')}${stat('Dados pendentes',num(incomplete),'Complete os contatos não informados','alert','amber')}${stat('Segmentos',num(new Set(data.suppliers.map(s=>s.segment).filter(Boolean)).size),'Áreas de fornecimento cadastradas','layers')}</div>${incomplete?'<div class="callout">Os fornecedores da base original não possuem telefone informado. Use “Completar cadastro” para registrar os contatos corretos.</div>':''}<section class="panel"><div class="toolbar supplier-toolbar"><label class="search"><span>${icon('search')}</span><input id="supplier-search" aria-label="Buscar fornecedor" placeholder="Buscar por nome, telefone, e-mail ou segmento…"></label><span class="result-count" id="suppliers-count"></span></div><div id="suppliers-table"></div></section>`;
}
/** Atualiza no DOM a lista de fornecedores conforme o texto de busca. */
function renderSuppliers(search=''){
  const target=document.querySelector('#suppliers-table');if(!target)return;
  const normalize=t=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const list=data.suppliers.filter(s=>normalize(s.name+' '+s.phone+' '+(s.email||'')+' '+s.segment).includes(normalize(search))).sort((a,b)=>a.name.localeCompare(b.name));
  document.querySelector('#suppliers-count').textContent=list.length+' fornecedores';
  target.innerHTML=list.length?table(['Nome','Telefone','E-mail','Segmento','Produtos vinculados','Cadastro','Ações'],list.map(s=>`<tr><td><strong>${esc(s.name)}</strong><small>FOR-${String(s.id).padStart(3,'0')}</small></td><td>${s.phone?`<a class="supplier-phone" href="tel:${s.phone.replace(/[^+\d]/g,'')}">${esc(s.phone)}</a>`:'<span class="muted">Não informado</span>'}</td><td>${s.email?`<a class="supplier-phone" href="mailto:${encodeURIComponent(s.email)}">${esc(s.email)}</a>`:'<span class="muted">Não informado</span>'}</td><td>${s.segment?esc(s.segment):'<span class="muted">Não informado</span>'}</td><td class="mono">${data.products.filter(p=>p.supplierId===s.id).length}</td><td><span class="status ${s.phone&&s.segment?'':'amber'}">${s.phone&&s.segment?'Completo':'Dados pendentes'}</span></td><td><button class="btn ${s.phone&&s.segment?'':'text'}" data-action="edit-supplier" data-id="${s.id}" ${!isDemo?'disabled':''}>${icon('edit')}${s.phone&&s.segment?'Editar':'Completar cadastro'}</button></td></tr>`).join('')):empty('Nenhum fornecedor encontrado','Ajuste sua busca ou cadastre um novo fornecedor.');
}
/** Abre o formulário de inclusão ou edição; zero identifica um novo fornecedor. */
function editSupplier(id=0){
  const s=data.suppliers.find(s=>s.id===id)||{name:'',phone:'',email:'',segment:''};
  openDialog(id?'Editar fornecedor':'Novo fornecedor',`<form id="supplier-form" data-id="${id}"><div class="dialog-body"><div class="form-grid"><label class="field full">Nome do fornecedor<input name="name" value="${esc(s.name)}" required maxlength="100" autocomplete="organization" autofocus></label><label class="field">Telefone com DDD<input name="phone" type="tel" value="${esc(formatPhone(s.phone))}" required minlength="13" maxlength="14" inputmode="tel" placeholder="(11)95897-1010" autocomplete="tel"></label><label class="field full">E-mail (opcional)<input name="email" type="email" value="${esc(s.email)}" maxlength="254" placeholder="contato@empresa.com.br" autocomplete="email"></label><label class="field">Segmento<input name="segment" value="${esc(s.segment)}" list="supplier-segments" required maxlength="150" placeholder="Ex.: Brinquedos"><datalist id="supplier-segments">${CATEGORIES.map(c=>`<option value="${esc(c)}"></option>`).join('')}</datalist></label></div><div class="chart-caption">Nome, telefone e segmento são obrigatórios; o e-mail é opcional. O fornecedor ficará disponível no cadastro de produtos.</div></div><p class="form-error" id="supplier-error" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancelar</button><button type="submit" class="btn primary">Salvar fornecedor</button></div></form>`);
}
/** Reabre o rascunho de produto após cadastrar um fornecedor, preservando os campos preenchidos. */
function restoreProductDraft(supplier=null){
  const draft=productDraft;productDraft=null;dialog.close();
  if(draft)editProduct(draft.id,{...draft.values,...(supplier?{supplierId:supplier.id,supplier:supplier.name}:{})});
}

/** Monta o painel de demanda prevista, histórico e métricas de avaliação. */
function forecast() {
  const chosen=state.productId?rows.find(p=>p.id===state.productId):null;
  const ids=new Set(chosen?[chosen.id]:rows.map(p=>p.id));
  const past=seriesFor(ids,data.history), future=seriesFor(ids,data.predictions).slice(0,7);
  const stock=chosen?chosen.stock:sum(rows,p=>p.stock), total=sum(future,h=>h.quantity);
  return heading('Previsão de demanda','Transforme o histórico de vendas em contexto para a próxima semana.',exportButton()+`<button class="btn" data-action="refresh">${icon('refresh')}Atualizar dados</button>`)+banner()+`<div class="filters"><label class="field wide">Produto<select id="forecast-product"><option value="0">Todos os produtos</option>${rows.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}" ${state.productId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="field">Horizonte<select aria-label="Horizonte de previsão"><option>Próximos 7 dias</option></select></label><span class="chip">${esc(data.forecastMethod||'HistGradientBoostingRegressor')}</span></div><div class="stats-grid">${stat('Demanda estimada',num(total,1),'Unidades · horizonte disponível','spark')}${stat('Média diária',num(mean(future.map(h=>h.quantity)),1),'Unidades por dia previsto','chart')}${stat('Estoque disponível',num(stock),'Unidades no saldo atual','box','green')}${stat('Saldo após a demanda',num(stock-total,1),'Sem entradas futuras de fornecedores','alert',stock<total?'red':'green')}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>${chosen?esc(chosen.name):'Demanda consolidada'}</h2><p>14 dias de histórico + 7 dias de projeção</p></div></div><div class="panel-body"><div class="legend"><span><i></i>Vendas observadas</span><span><i class="purple"></i>${isDemo?'Projeção demonstrativa':'Previsão de demanda'}</span></div>${lineChart(past,future)}<div class="chart-caption">As estimativas orientam o planejamento e não garantem o volume de vendas.</div></div></section><section class="panel"><div class="panel-head"><div><h2>Avaliação do modelo</h2><p>Comparação com a média móvel de 7 dias</p></div></div><div class="panel-body">${data.metrics?`<div class="detail-grid"><div><small>MAE · modelo</small><strong>${num(data.metrics.modelMae,3)}</strong></div><div><small>MAE · referência</small><strong>${num(data.metrics.baselineMae,3)}</strong></div><div><small>RMSE · modelo</small><strong>${num(data.metrics.modelRmse,3)}</strong></div><div><small>RMSE · referência</small><strong>${num(data.metrics.baselineRmse,3)}</strong></div></div><p class="subtext">Período de teste: ${esc(data.metrics.testPeriod||'não informado')}</p>`:`<div class="metrics-note">${icon('clock')}<h3>Métricas ainda não disponíveis</h3><p>Os valores de MAE e RMSE aparecerão após a execução e integração do modelo Python.</p></div>`}<div class="chart-caption">${isDemo?'Esta prévia usa uma média histórica para ilustrar a interface. Não mede a precisão do modelo.':'Resultados de teste precisam ser interpretados considerando o período e os dados utilizados.'}</div></div></section></div><section class="panel"><div class="panel-head"><div><h2>Dia a dia da próxima semana</h2><p>Valores estimados em unidades</p></div>${chosen?`<button class="btn text" data-action="detail" data-id="${chosen.id}">Ver produto ${icon('arrow')}</button>`:''}</div>${future.length?table(['Data','Dia da semana','Demanda estimada','Saldo projetado¹'],future.map((h,i)=>`<tr><td class="mono">${shortDate(h.date)}</td><td>${new Intl.DateTimeFormat('pt-BR',{weekday:'long',timeZone:'America/Sao_Paulo'}).format(new Date(h.date+'T12:00:00Z'))}</td><td class="mono">${num(h.quantity,1)} un.</td><td class="mono" style="color:${stock-sum(future.slice(0,i+1),v=>v.quantity)<0?'var(--red)':'var(--text)'}">${num(stock-sum(future.slice(0,i+1),v=>v.quantity),1)} un.</td></tr>`).join('')):empty('Sem previsões disponíveis','As previsões aparecerão após a integração do processo preditivo.')}<div class="table-footer">¹ Saldo atual menos demanda acumulada. Não considera recebimentos futuros.</div></section>`;
}
/** Monta as sugestões de compra a partir de demanda, cobertura e estoque mínimo. */
function replenishment() {
  return heading('Planejamento de reposição','Combine demanda, disponibilidade e prioridade antes de comprar.',exportButton())+banner()+`<section class="panel" style="margin-bottom:22px"><div class="panel-head"><div><h2>Seu cenário de planejamento</h2><p>Simule os parâmetros para calcular uma sugestão de compra</p></div><span class="chip">Horizonte: 7 dias</span></div><div class="panel-body"><div class="replenishment-controls"><label class="field">Prazo de entrega (dias)<input id="lead-time" type="number" min="0" max="90" step="1" value="${state.leadTime}"></label><label class="field">Reserva de segurança (dias)<input id="safety-days" type="number" min="0" max="90" step="1" value="${state.safetyDays}"></label><p class="subtext">A reserva em dias é uma regra simplificada desta prévia.</p></div><div class="chart-caption">Compra = maior entre estoque mínimo e demanda média × (prazo + 7 dias + reserva), menos estoque e pedidos em aberto. Sem geração automática de compras.</div></div></section><section class="panel">${filterToolbar()}<div id="data-table"></div></section><div class="selection-bar"><p id="selection-summary"></p><button class="btn primary" data-action="create-order" id="create-order" ${!isDemo?'disabled':''}>${icon('cart')}Criar rascunho de pedido</button></div><div class="callout">${icon('clock')} Pedidos em aberto reduzem a compra sugerida, mas não os alertas de ruptura: o prazo real de recebimento ainda precisa ser confirmado.</div>`;
}
/** Atualiza a tabela da página atual e associa os controles às linhas exibidas. */
function renderTable() {
  const list=filtered();
  const target=document.querySelector('#data-table');
  if(!target)return;
  document.querySelector('#result-count').textContent=`${list.length} ${list.length===1?'produto':'produtos'}`;
  let html;
  if(!list.length) html=empty('Nenhum produto encontrado','Ajuste a busca ou os filtros para visualizar outros produtos.');
  else if(state.page==='abc') html=table(['Posição','Produto','Classe ABC','Faturamento','Participação','Acumulado',''],list.map(p=>`<tr><td class="mono">${String(p.rank).padStart(2,'0')}</td><td>${product(p)}</td><td>${badge(p)}</td><td class="mono">${money(p.revenue)}</td><td class="mono">${num(p.share*100,1)}%</td><td class="mono">${num(p.cumulative*100,1)}%</td><td><button class="icon-button" data-action="detail" data-id="${p.id}" aria-label="Detalhes de ${esc(p.name)}">${icon('arrow')}</button></td></tr>`).join(''));
  else if(state.page==='replenishment') html=table([`<input type="checkbox" id="select-all" aria-label="Selecionar todos os produtos filtrados" ${list.every(p=>state.selected.has(p.id))?'checked':''}>`,'Produto','ABC','Estoque','Em aberto','Sugestão','Custo estimado','Situação'],list.map(p=>`<tr><td><input type="checkbox" data-select="${p.id}" aria-label="Selecionar ${esc(p.name)}" ${state.selected.has(p.id)?'checked':''}></td><td>${product(p)}</td><td>${badge(p)}</td><td class="mono">${num(p.stock)}</td><td class="mono">${num(p.incoming)}</td><td class="mono" style="color:var(--accent)">${num(p.suggested)} un.</td><td class="mono">${money(p.suggested*p.cost)}</td><td>${status(p)}</td></tr>`).join(''));
  else html=table(['Código','Nome','Quantidade','Categoria / ABC','Fornecedor','Ações'],list.map(p=>`<tr><td><span class="cod-tag">PR-${String(p.id).padStart(3,'0')}</span></td><td class="inventory-name" title="${esc(p.name)}"><strong>${esc(p.name)}</strong></td><td><div class="stock-quantity" data-stock-level="${p.stock===0?'empty':p.stock<p.minimum?'low':'regular'}"><span class="mono" title="${p.stock===0?'Sem estoque':p.stock<p.minimum?'Estoque baixo':'Estoque regular'}">${num(p.stock)}</span><div class="quantity-track" aria-hidden="true"><span class="${p.stock<p.minimum?'low':''}" style="width:${p.stock/Math.max(1,...rows.map(r=>r.stock))*100}%"></span></div></div></td><td><div class="category-and-abc"><span class="category-badge category-${p.category==='Publicações'?'publications':p.category==='Alimentos e bebidas'?'food':p.category==='Tabacaria'?'tobacco':'other'}" title="${esc(p.category)}">${esc(p.category==='Alimentos e bebidas'?'Alimentos':p.category==='Papelaria e variedades'?'Papelaria':p.category)}</span>${badge(p)}</div></td><td>${esc(p.supplier)}</td><td><div class="actions"><button class="icon-button" data-action="detail" data-id="${p.id}" aria-label="Detalhes de ${esc(p.name)}">${icon('arrow')}</button><button class="icon-button" data-action="edit" data-id="${p.id}" aria-label="Editar ${esc(p.name)}" ${!isDemo?'disabled':''}>${icon('edit')}</button></div></td></tr>`).join(''));

  target.innerHTML=html+`<div class="table-footer"><span>${list.length} de ${rows.length} produtos no catálogo</span><button class="btn text" data-action="clear-filters">Limpar filtros</button></div>`;
  const all=document.querySelector('#select-all');
  if(all)all.indeterminate=list.some(p=>state.selected.has(p.id))&&!list.every(p=>state.selected.has(p.id));
  updateSelection();
}
/** Atualiza seleção, totalizadores e ações em lote a partir dos IDs selecionados. */
function updateSelection() {
  const selected=rows.filter(p=>state.selected.has(p.id)&&p.suggested>0);
  const summary=document.querySelector('#selection-summary');
  if(summary) summary.innerHTML=`<strong>${selected.length}</strong> produtos selecionados · ${num(sum(selected,p=>p.suggested))} unidades · <strong>${money(sum(selected,p=>p.suggested*p.cost))}</strong>`;
  const button=document.querySelector('#create-order');
  if(button)button.disabled=!selected.length||!isDemo;
}
/** Monta a lista de pedidos; operações de demonstração permanecem restritas a esse modo. */
function orders() {
  return heading('Pedidos de compra','Da sugestão ao recebimento: acompanhe cada reposição.',`${isDemo?'<button class="btn" data-action="reset-demo">Restaurar demonstração</button>':''}<a class="btn primary" href="#replenishment">${icon('plus')}Planejar novo pedido</a>`)+banner()+`<div class="stats-grid">${stat('Rascunhos',num(data.orders.filter(o=>o.status==='draft').length),'Planejamentos ainda não confirmados','edit')}${stat('Em aberto',num(data.orders.filter(o=>o.status==='pending').length),'Aguardando recebimento','clock','amber')}${stat('Recebidos',num(data.orders.filter(o=>o.status==='received').length),'Saldo atualizado na demonstração','check','green')}${stat('Valor em aberto',money(sum(data.orders.filter(o=>o.status==='pending'),o=>sum(o.items,i=>i.quantity*i.unitCost))),'Custo estimado dos pedidos','money')}</div><section class="panel"><div class="panel-head" style="padding-bottom:20px"><div><h2>Histórico de pedidos</h2><p>${isDemo?'Os pedidos desta prévia ficam salvos apenas neste navegador.':'Pedidos recebidos da API.'}</p></div></div>${data.orders.length?data.orders.slice().reverse().map(o=>{const [label,color]=orderStatus(o); return `<article class="order-card"><span class="product-icon">${icon('cart')}</span><div class="order-info"><h3>${esc(o.id)}</h3><p>${shortDate(o.createdAt)} · ${o.items.length} ${o.items.length===1?'produto':'produtos'} · ${num(sum(o.items,i=>i.quantity))} unidades</p><span class="status ${color}">${label}</span><details><summary>Ver itens do pedido</summary><ul>${o.items.map(i=>`<li>${esc(i.name)} · ${i.quantity} un. × ${money(i.unitCost)}</li>`).join('')}</ul></details></div><div class="price"><strong>${money(sum(o.items,i=>i.quantity*i.unitCost))}</strong><small class="muted">Custo estimado</small></div><div class="actions">${isDemo&&o.status==='draft'?`<button class="btn primary" data-action="confirm-order" data-order="${esc(o.id)}">Confirmar na prévia</button>`:''}${isDemo&&o.status==='pending'?`<button class="btn primary" data-action="receive-order" data-order="${esc(o.id)}">Registrar recebimento</button>`:''}${isDemo&&['draft','pending'].includes(o.status)?`<button class="btn" data-action="cancel-order" data-order="${esc(o.id)}">Cancelar</button>`:''}</div></article>`;}).join(''):empty('Seu próximo pedido começa no planejamento','Selecione produtos na tela de reposição para criar um rascunho de compra.')}</section>`;
}
/** Monta a análise de vendas e margem com base no histórico disponível. */
function sales() {
  const lastDate=data.history.map(h=>h.date).sort().at(-1);
  const dates=[...new Set(data.history.map(h=>h.date))].sort().slice(-30);
  const recent=data.history.filter(h=>dates.includes(h.date));
  const ranked=data.products.map(p=>({...p,revenue:sum(recent.filter(h=>h.productId===p.id),h=>h.quantity*h.price)})).sort((a,b)=>b.revenue-a.revenue);
  const daily=new Map(dates.map(d=>[d,0]));
  for(const h of recent)daily.set(h.date,daily.get(h.date)+h.quantity*h.price);
  const maximum=Math.max(1,...daily.values());
  return heading('Vendas','Acompanhe o movimento que alimenta suas próximas decisões.',exportButton())+banner()+`<div class="stats-grid">${stat('Faturamento · 30 dias',money(sum(recent,h=>h.quantity*h.price)),'Receita bruta do período','money','green')}${stat('Unidades vendidas',num(sum(recent,h=>h.quantity)),'Volume acumulado no período','box')}${stat('Produtos com vendas',num(ranked.filter(p=>p.revenue>0).length),'Produtos distintos no período','layers')}${stat('Média diária',money(mean([...daily.values()])),`${dates.length} dias disponíveis`,'chart')}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Faturamento diário</h2><p>Últimos 30 dias disponíveis${lastDate?' · até '+shortDate(lastDate):''}</p></div><span class="chip">R$ / dia</span></div><div class="panel-body">${dates.length?`<svg class="chart" viewBox="0 0 650 230" role="img" aria-label="Faturamento diário dos últimos trinta dias">${[0,.5,1].map(f=>`<line class="grid" x1="48" x2="638" y1="${190-160*f}" y2="${190-160*f}"/><text x="42" y="${193-160*f}" text-anchor="end">${num(maximum*f)}</text>`).join('')}${[...daily].map(([date,value],i)=>`<rect x="${51+i*19.3}" y="${190-value/maximum*160}" width="12" height="${value/maximum*160}" rx="3" fill="${i===dates.length-1?'var(--accent)':'#c6b6e8'}"><title>${shortDate(date)}: ${money(value)}</title></rect>${i%6===0?`<text x="${57+i*19.3}" y="213" text-anchor="middle">${shortDate(date)}</text>`:''}`).join('')}</svg>`:empty('Sem vendas no período','O histórico aparecerá quando houver dados disponíveis.')}<div class="chart-caption">Histórico agregado por produto e dia. Quantidade de transações e ticket médio exigem registros de vendas individuais.</div></div></section><section class="panel"><div class="panel-head"><div><h2>Produtos com maior receita</h2><p>Participação no faturamento dos últimos 30 dias</p></div></div><div class="panel-body">${ranked.slice(0,6).map((p,i)=>`<div class="bar-item" style="grid-template-columns:120px 1fr 65px"><span><span class="rank">${i+1}</span>${esc(p.name)}</span><div class="bar-track"><span style="width:${p.revenue/Math.max(1,ranked[0]?.revenue)*100}%"></span></div><span>${num(p.revenue/Math.max(1,sum(recent,h=>h.quantity*h.price))*100,1)}%</span></div>`).join('')}</div></section></div>`;
}
/** Renderiza a rota atual, atualiza navegação e recompõe os controles da página. */
function render() {
  rebuild();
  state.page=Object.hasOwn(labels,location.hash.slice(1))?location.hash.slice(1):'inventory';
  document.body.dataset.page=state.page;
  document.querySelector('#header-add').disabled=!isDemo;
  document.querySelector('#breadcrumb').textContent=labels[state.page];
  document.title=`${labels[state.page]} — StockOS`;
  document.querySelectorAll('[data-page]').forEach(a=>{const active=a.dataset.page===state.page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelector('#order-count').textContent=data.orders.filter(o=>['draft','pending'].includes(o.status)).length;
  document.querySelector('#source-label').innerHTML=`<span></span>${isDemo?'Demonstração':'Dados da API'}`;
  root.innerHTML=({checkout:()=>checkoutPage(data,isDemo),overview,inventory,orders,sales,forecast,abc:abcPage,replenishment,suppliers:suppliersPage})[state.page]();
  if(state.page==='checkout')mountCheckout(root,data,{reload:async()=>{data=await loadData();render();},isDemo});
  renderTable();renderSuppliers();fillIcons();
}
/** Preenche e abre o diálogo compartilhado; recebe HTML previamente preparado. */
function openDialog(title,body,actions='') {
  dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="Fechar janela">${icon('close')}</button></div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
  dialog.showModal();
}
/** Abre o detalhamento do produto identificado pelo ID na lista calculada. */
function detail(id) {
  const p=rows.find(p=>p.id===id);if(!p)return;
  openDialog(esc(p.name),`<div class="dialog-body"><div class="detail-grid"><div><small>Categoria</small><strong>${esc(p.category)}</strong></div><div><small>Classe ABC</small><strong>${p.abc||'Sem histórico'}</strong></div><div><small>Estoque / mínimo</small><strong>${num(p.stock)} / ${num(p.minimum)} un.</strong></div><div><small>Demanda · 7 dias</small><strong>${p.hasForecast?num(p.demand,1)+' un.':'Indisponível'}</strong></div><div><small>Cobertura estimada</small><strong>${p.coverage===null?'Sem demanda prevista':num(p.coverage,1)+' dias'}</strong></div><div><small>Sugestão de compra</small><strong>${num(p.suggested)} un.</strong></div><div><small>Preço de venda</small><strong>${money(p.price)}</strong></div><div><small>Fornecedor</small><strong>${esc(p.supplier)}</strong></div></div>${status(p)}<div class="chart-caption">${p.incoming} unidades em pedidos abertos. O risco não considera uma entrada sem data confirmada.</div></div>`,`<button class="btn" data-action="close-dialog">Fechar</button><button class="btn primary" data-action="forecast-product" data-id="${p.id}">${icon('spark')}Ver previsão</button>`);
}
/** Abre o cadastro de produto, reutilizando um rascunho quando disponível. */
function editProduct(id=0,draft=null) {
  if(!isDemo)return;
  const p={...(data.products.find(p=>p.id===id)||{name:'',category:'Publicações',supplier:'',supplierId:'',barcode:'',stock:0,minimum:0,cost:0,price:0}),...(draft||{})};
  const field=(label,name,type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${esc(p[name])}" ${extra}></label>`;
  openDialog(id?'Editar produto':'Novo produto',`<form id="product-form" data-id="${id}"><div class="dialog-body"><div class="form-grid"><label class="field full">Nome do produto<input name="name" value="${esc(p.name)}" required maxlength="100" autofocus></label><label class="field">Categoria<select name="category" data-current="${esc(p.category)}" required>${categoryChoices(data,CATEGORIES).map(c=>`<option value="${esc(c)}" ${p.category===c?'selected':''}>${esc(c)}</option>`).join('')}<option value="__new_category__">＋ Cadastrar nova categoria</option></select></label><label class="field">Fornecedor<select name="supplierId" required><option value="">Selecione um fornecedor</option>${data.suppliers.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${s.id}" ${Number(p.supplierId)===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><button type="button" class="btn text inline-supplier" data-action="add-supplier-from-product">＋ Cadastrar novo fornecedor</button></label>${field('Código de barras','barcode','text','maxlength="20"')}${field('Estoque atual','stock','number','required min="0" max="1000000" step="1"')}${field('Estoque mínimo','minimum','number','required min="0" max="1000000" step="1"')}${field('Custo unitário (R$)','cost','number','required min="0" max="1000000" step="0.01"')}${field('Preço de venda (R$)','price','number','required min="0" max="1000000" step="0.01"')}</div><div class="chart-caption">Alterações locais da demonstração. Produtos novos ficam sem ABC e previsão até terem histórico de vendas.</div></div><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancelar</button><button type="submit" class="btn primary">Salvar produto</button></div></form>`);
}
/** Solicita confirmação visual antes de alterar o estado de um pedido de demonstração. */
function orderConfirmation(id,action) {
  const o=data.orders.find(o=>o.id===id); if(!o)return;
  const titles={'confirm-order':'Confirmar pedido na demonstração','receive-order':'Registrar recebimento','cancel-order':'Cancelar pedido'};
  const message={'confirm-order':'O pedido ficará em aberto e suas quantidades serão descontadas das próximas sugestões de compra. Nenhum pedido será enviado ao fornecedor.','receive-order':'Todos os itens serão recebidos integralmente e adicionados ao estoque local da demonstração.','cancel-order':'O pedido ficará no histórico como cancelado e deixará de contar nas compras em aberto.'};
  openDialog(titles[action],`<div class="dialog-body"><p>${esc(o.id)} · ${money(sum(o.items,i=>i.quantity*i.unitCost))}</p><p class="subtext">${message[action]}</p></div>`,`<button class="btn" data-action="close-dialog">Voltar</button><button class="btn primary" data-action="apply-order" data-order="${esc(id)}" data-operation="${action}">Confirmar</button>`);
}
/** Exporta os dados exibidos em CSV e neutraliza células que poderiam ser fórmulas. */
function downloadCSV() {
  let headers,body;
  if(state.page==='forecast') {
    const ids=new Set(state.productId?[state.productId]:rows.map(p=>p.id));
    headers=['ID produto','Produto','Data','Demanda estimada','Origem'];
    body=data.predictions.filter(p=>ids.has(p.productId)).map(p=>[p.productId,rows.find(r=>r.id===p.productId)?.name,p.date,p.quantity,isDemo?'Demonstracao - media de 28 dias':'API']);
  } else if(state.page==='sales') {
    headers=['ID produto','Produto','Data','Quantidade','Preco unitario','Receita bruta'];
    const last30=[...new Set(data.history.map(h=>h.date))].sort().slice(-30);
    body=data.history.filter(h=>last30.includes(h.date)).map(h=>[h.productId,rows.find(p=>p.id===h.productId)?.name,h.date,h.quantity,h.price,h.quantity*h.price]);
  } else {
    headers=['ID','Produto','Categoria','Fornecedor','ABC','Estoque','Minimo','Faturamento historico','Participacao %','Demanda 7 dias','Em aberto','Sugestao compra','Custo estimado','Situacao','Origem'];
    const list=['inventory','abc','replenishment'].includes(state.page)?filtered():rows;
    body=list.map(p=>[p.id,p.name,p.category,p.supplier,p.abc||'',p.stock,p.minimum,p.revenue,(p.share*100).toFixed(2),p.demand.toFixed(2),p.incoming,p.suggested,(p.suggested*p.cost).toFixed(2),p.status,isDemo?'Demonstracao':'API']);
  }
  const cell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const csv='\uFEFF'+[headers,...body].map(row=>row.map(cell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`stockos-${state.page}${isDemo?'-demonstracao':''}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Arquivo CSV exportado.');
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,id=Number(button.dataset.id);
  try {
    if(action==='close-dialog'){if(productDraft&&document.querySelector('#supplier-form'))restoreProductDraft();else dialog.close();}
    if(action==='add-supplier'&&isDemo)editSupplier();
    if(action==='edit-supplier'&&isDemo)editSupplier(id);
    if(action==='add-supplier-from-product'&&isDemo){const form=document.querySelector('#product-form');productDraft={id:Number(form.dataset.id),values:Object.fromEntries(new FormData(form))};dialog.close();editSupplier();}
    if(action==='toggle-sort'){state.sort=state.sort==='quantity'?'name':'quantity';renderTable();}
    if(action==='all-categories'){state.selectedCategories=[];state.category='';render();return;}
    if(action==='category-filter'){const selected=state.selectedCategories.length?state.selectedCategories:state.category?[state.category]:[];const category=button.dataset.category;state.selectedCategories=selected.includes(category)?selected.filter(c=>c!==category):[...selected,category];state.category='';render();return;}

    if(action==='reset-demo')openDialog('Restaurar demonstração',`<div class="dialog-body"><p>Restaurar o catálogo inicial e limpar os pedidos locais desta demonstração?</p><p class="subtext">Esta ação afeta somente os dados da prévia neste navegador.</p></div>`,`<button class="btn" data-action="close-dialog">Voltar</button><button class="btn primary" data-action="apply-reset">Restaurar dados iniciais</button>`);
    if(action==='apply-reset'&&isDemo){data=resetDemo();state.selected.clear();dialog.close();render();toast('Demonstração restaurada.');}
    if(action==='detail')detail(id);
    if(action==='add')editProduct();
    if(action==='edit')editProduct(id);
    if(action==='forecast-product'){state.productId=id;dialog.close();if(location.hash==='#forecast')render();else location.hash='forecast';}
    if(action==='export')downloadCSV();
    if(action==='clear-filters'){state.search='';state.selectedCategories=[];state.category='';state.abc='';state.status='';state.supplier='';state.minStock=0;render();}
    if(action==='refresh'){
      button.disabled=true;button.textContent='Atualizando…';
      try { data=await loadData();render();toast(isDemo?'Dados locais atualizados. O modelo Python não foi executado.':'Dados atualizados da API.'); }
      catch(error){render();toast(error.message);}
    }
    if(action==='create-order'&&isDemo){
      const items=rows.filter(p=>state.selected.has(p.id)&&p.suggested>0).map(p=>({productId:p.id,name:p.name,quantity:p.suggested,unitCost:p.cost}));
      if(!items.length)return;
      data.orders.push({id:`PED-${String(data.orders.length+1).padStart(3,'0')}`,createdAt:new Date().toISOString(),status:'draft',items});
      persist();state.selected.clear();location.hash='orders';toast('Rascunho criado. Revise os itens antes de confirmar.');
    }
    if(['confirm-order','receive-order','cancel-order'].includes(action)&&isDemo)orderConfirmation(button.dataset.order,action);
    if(action==='apply-order'&&isDemo){
      const o=data.orders.find(o=>o.id===button.dataset.order),operation=button.dataset.operation;
      if(!o)return;
      if(operation==='confirm-order'&&o.status==='draft')o.status='pending';
      else if(operation==='receive-order'&&o.status==='pending'){
        for(const item of o.items){const p=data.products.find(p=>p.id===item.productId);p.stock+=item.quantity;}o.status='received';
      } else if(operation==='cancel-order'&&['draft','pending'].includes(o.status))o.status='cancelled';
      else return;
      persist();dialog.close();render();toast(operation==='receive-order'?'Recebimento registrado e estoque atualizado na demonstração.':'Pedido atualizado na demonstração.');
    }
  } catch(error){toast(error.message);}
});
document.addEventListener('input',event=>{
  if(event.target.id==='supplier-search')renderSuppliers(event.target.value);
  if(event.target.id==='search'){state.search=event.target.value;renderTable();}
  if(event.target.id==='qty-filter'){state.minStock=Number(event.target.value);document.querySelector('#qty-label').textContent=state.minStock;renderTable();}
});
document.addEventListener('change',event=>{
  const el=event.target;
  const fields={'category-filter':'category','abc-filter':'abc','status-filter':'status','supplier-filter':'supplier'};
  if(fields[el.id]){state[fields[el.id]]=el.value;renderTable();}
  if(el.id==='forecast-product'){state.productId=Number(el.value);render();}
  if(['lead-time','safety-days'].includes(el.id)){
    const value=Number(el.value);if(!el.value||!Number.isInteger(value)||value<0||value>90){el.value=state[el.id==='lead-time'?'leadTime':'safetyDays'];toast('Informe um número inteiro entre 0 e 90 dias.');return;}
    state[el.id==='lead-time'?'leadTime':'safetyDays']=value;render();
  }
  if(el.dataset.select){const id=Number(el.dataset.select);el.checked?state.selected.add(id):state.selected.delete(id);renderTable();}
  if(el.id==='select-all'){for(const p of filtered())el.checked?state.selected.add(p.id):state.selected.delete(p.id);renderTable();}
});
document.addEventListener('submit',event=>{
  if(event.target.id==='supplier-form'){
    event.preventDefault();if(!isDemo)return;
    const values=Object.fromEntries(new FormData(event.target)),id=Number(event.target.dataset.id);
    const error=supplierError(values,data.suppliers,id);
    if(error){document.querySelector('#supplier-error').textContent=error;return;}
    const supplier=upsertSupplier(data,values,id);persist();render();
    if(productDraft)restoreProductDraft(supplier);else dialog.close();
    toast(id?'Fornecedor atualizado.':'Fornecedor cadastrado e disponível nos produtos.');return;
  }
  if(event.target.id!=='product-form')return;event.preventDefault();if(!isDemo)return;
  const form=event.target, values=Object.fromEntries(new FormData(form)),id=Number(form.dataset.id);
  const error=document.querySelector('#form-error');
  values.name=values.name.trim();values.supplierId=Number(values.supplierId);const supplier=data.suppliers.find(s=>s.id===values.supplierId);values.supplier=supplier?.name||'';values.barcode=values.barcode.trim();
  for(const key of ['stock','minimum','cost','price'])values[key]=Number(values[key]);
  if(!values.name||!values.supplier){error.textContent='Informe o nome e o fornecedor.';return;}
  if(values.barcode&&data.products.some(p=>p.id!==id&&p.barcode===values.barcode)){error.textContent='Este código de barras já está em uso.';return;}
  if(Object.values({stock:values.stock,minimum:values.minimum,cost:values.cost,price:values.price}).some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(values.stock)||!Number.isInteger(values.minimum)){error.textContent='Revise as quantidades e os preços.';return;}
  if(id){const p=data.products.find(p=>p.id===id);Object.assign(p,values);}else data.products.push({id:Math.max(0,...data.products.map(p=>p.id))+1,...values});
  persist();dialog.close();render();toast(id?'Produto atualizado na demonstração.':'Produto cadastrado. Previsões exigem histórico de vendas.');
});
dialog.addEventListener('cancel',event=>{if(productDraft&&document.querySelector('#supplier-form')){event.preventDefault();restoreProductDraft();}});
document.querySelector('#menu-toggle').addEventListener('click',()=>{const open=document.querySelector('#sidebar').classList.toggle('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();root.focus();root.scrollIntoView();});
document.addEventListener('keydown',e=>{if(e.target.matches?.('.pareto-bar')&&['Enter',' '].includes(e.key)){e.preventDefault();detail(Number(e.target.dataset.id));return;}if(e.key==='Escape'){document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}});
document.querySelector('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('light');try{localStorage.setItem('stockos-original-theme',document.body.classList.contains('light')?'light':'dark');}catch{}});
try{document.body.classList.toggle('light',localStorage.getItem('stockos-original-theme')==='light');}catch{}
window.addEventListener('hashchange',()=>{state.search='';state.selectedCategories=[];state.category=state.nextCategory||'';delete state.nextCategory;state.abc='';state.status='';state.supplier='';state.minStock=0;document.querySelector('#sidebar').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');render();window.scrollTo(0,0);root.focus({preventScroll:true});});
document.querySelector('#today').textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date());
fillIcons();
/** Carrega e valida os dados iniciais; falhas são exibidas sem substituir a API por dados fictícios. */
async function start(){
  try{data=await loadData();render();}
  catch(error){root.innerHTML=heading('Não foi possível carregar a operação','Verifique a disponibilidade da fonte de dados.')+`<section class="panel"><div class="panel-body"><p>${esc(error.message)}</p><button class="btn primary" id="retry-load">Tentar novamente</button></div></section>`;document.querySelector('#retry-load').addEventListener('click',start);}
}
start();

// A máscara é aplicada também ao colar; o backend valida o limite novamente.
document.addEventListener('input',event=>{const field=event.target;if(!field.matches('input[type=tel]'))return;const end=field.selectionStart,old=field.value;field.value=formatPhone(old);if(end!==null&&end<old.length)field.setSelectionRange(Math.min(end,field.value.length),Math.min(end,field.value.length));});

installCategoryCreation(async name=>{
  const key=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  if(categoryChoices(data,CATEGORIES).some(c=>key(c)===key(name)))throw Error('Categoria já cadastrada. Selecione-a na lista.');
  let record;
  if(isDemo){record={id:Math.max(0,...(data.categories||[]).map(c=>Number(c.id)||0))+1,name};const next={...data,categories:[...(data.categories||[]),record]};if(!saveData(next))throw Error('Não foi possível salvar no navegador.');data.categories=next.categories;}
  else {throw Error('Cadastro disponível somente na demonstração.');}
  return record;
});

