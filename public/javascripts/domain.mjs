export const sum = (rows, fn = x => x) => rows.reduce((total, row) => total + fn(row), 0);
export const mean = rows => rows.length ? sum(rows) / rows.length : 0;
export function abcProducts(products, history) {
  const totals = new Map();
  for (const h of history) totals.set(h.productId, (totals.get(h.productId) || 0) + h.quantity * h.price);
  const total = sum([...totals.values()]);
  let cumulative = 0;
  return products.map(p => ({ ...p, revenue: totals.get(p.id) || 0 })).sort((a,b) => b.revenue-a.revenue || a.id-b.id).map((p,index) => {
    const abc = !p.revenue ? null : cumulative < .8 ? 'A' : cumulative < .95 ? 'B' : 'C';
    const share = total ? p.revenue / total : 0;
    cumulative += share;
    return {...p, abc, share, cumulative, rank:index+1};
  });
}
export function planProduct(p, history, predictions, orders, leadTime = 5, horizon = 7, safetyDays = 2) {
  const series = history.filter(h => h.productId === p.id).sort((a,b) => a.date.localeCompare(b.date));
  const past = series.slice(-28).map(h => h.quantity);
  const future = predictions.filter(h => h.productId === p.id).sort((a,b) => a.date.localeCompare(b.date)).slice(0,horizon);
  const daily = mean(future.map(h => h.quantity));
  const demand = sum(future, h => h.quantity);
  const incoming = sum(orders.filter(o => o.status === 'pending').flatMap(o => o.items), i => i.productId === p.id ? i.quantity : 0);
  // Incoming orders have no confirmed delivery date: show them, but never assume arrival before a rupture.
  const coverage = daily > 0 ? p.stock / daily : null;
  const target = Math.max(p.minimum, Math.ceil(daily * (leadTime + horizon + safetyDays)));
  const suggested = future.length ? Math.max(0, target - p.stock - incoming) : 0;
  const status = p.stock <= 0 ? 'Ruptura' : coverage !== null && coverage < leadTime ? 'Crítico' : p.stock < p.minimum ? 'Abaixo do mínimo' : coverage !== null && coverage < horizon ? 'Atenção' : 'Regular';
  return {...p, past, future, daily, demand, incoming, coverage, suggested, status, hasForecast:future.length > 0};
}
export function validateSnapshot(data) {
  if (!data || !['products','history','predictions','orders'].every(k => Array.isArray(data[k]))) throw new Error('Resposta incompleta: produtos, histórico, previsões e pedidos são obrigatórios.');
  const finiteNonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  if(data.suppliers!==undefined){
    if(!Array.isArray(data.suppliers))throw new Error('Cadastro de fornecedores inválido.');
    const supplierIds=new Set();
    for(const s of data.suppliers){
      if(!Number.isInteger(s.id)||s.id<=0||supplierIds.has(s.id)||typeof s.name!=='string'||!s.name.trim()||typeof s.phone!=='string'||typeof s.segment!=='string')throw new Error('Fornecedor inválido.');
      supplierIds.add(s.id);
      if(s.email!==undefined&&(typeof s.email!=='string'||(s.email!==''&&(s.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)))))throw new Error('E-mail de fornecedor inválido.');
    }
    if(data.products.some(p=>!supplierIds.has(p.supplierId)))throw new Error('Produto vinculado a fornecedor inexistente.');
  }
  const ids = new Set();
  for (const p of data.products) {
    if (!Number.isInteger(p.id) || ids.has(p.id) || !p.name || !p.category || !p.supplier || !Number.isInteger(p.stock) || p.stock < 0 || !Number.isInteger(p.minimum) || p.minimum < 0 || !finiteNonnegative(p.price) || !finiteNonnegative(p.cost)) throw new Error('Produto inválido na resposta.');
    ids.add(p.id);
  }
  for (const key of ['history','predictions']) {
    const unique = new Set();
    for (const row of data[key]) {
      const pair = `${row.productId}/${row.date}`;
      if (!ids.has(row.productId) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || unique.has(pair) || !finiteNonnegative(row.quantity) || (key === 'history' && !finiteNonnegative(row.price))) throw new Error(`Série inválida: ${key}.`);
      unique.add(pair);
    }
  }
  const orderIds = new Set();
  for (const o of data.orders) {
    if (!o.id || orderIds.has(o.id) || !['draft','pending','received','cancelled'].includes(o.status) || !Array.isArray(o.items) || !o.items.length || !o.createdAt) throw new Error('Pedido inválido.');
    orderIds.add(o.id);
    if (o.items.some(i => !ids.has(i.productId) || !Number.isInteger(i.quantity) || i.quantity <= 0 || !finiteNonnegative(i.unitCost) || typeof i.name !== 'string')) throw new Error('Item do pedido inválido.');
  }
  return data;
}
