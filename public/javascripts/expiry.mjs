/** Retorna a data civil de São Paulo sem depender do fuso configurado no computador. */
export function localDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Converte somente datas ISO reais em dias UTC, evitando erros por horário de verão. */
export function dateDay(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1000-01-01')throw new Error('Informe uma data de validade válida.');
  const stamp=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==value)throw new Error('Informe uma data de validade válida.');
  return stamp/86400000;
}

/** Resume só lotes com saldo: vencido tem prioridade, mas pendências nunca recebem verde. */
export function expirySummary(product,lots=[],today=localDay()) {
  const active=lots.filter(l=>l.productId===product.id&&l.quantity>0).sort((a,b)=>a.expiresOn.localeCompare(b.expiresOn)||a.id-b.id);
  const allocated=active.reduce((sum,l)=>sum+l.quantity,0);
  const unallocated=Math.max(0,product.stock-allocated);
  const date=active[0]?.expiresOn||null;
  const days=date?dateDay(date)-dateDay(today):null;
  const alert=product.expiryAlertDays??30;
  let key,label;
  if(product.expiryMode==='not_applicable'){key='not_applicable';label='Não se aplica';}
  else if(product.stock===0){key='empty';label='Sem saldo';}
  else if(days!==null&&days<0){key='expired';label='Vencido';}
  else if(days!==null&&days<=alert){key='soon';label=days===0?'Vence hoje':'Próximo do vencimento';}
  else if(!date||unallocated>0){key='unknown';label='Validade pendente';}
  else {key='healthy';label='Dentro do prazo';}
  const expired=active.filter(l=>l.expiresOn<today).reduce((sum,l)=>sum+l.quantity,0);
  return {key,label,date,days,unallocated,allocated,active,expired,saleable:product.expiryMode==='tracked'?Math.max(0,allocated-expired):product.stock};
}

/** Valida referências e saldo dos lotes antes da exibição ou persistência da demonstração. */
export function validateLots(data) {
  if(!Array.isArray(data.lots))throw new Error('Resposta inválida: lotes devem ser uma lista.');
  const ids=new Set(),codes=new Set(),quantities=new Map();
  for(const lot of data.lots){
    const product=data.products.find(p=>p.id===lot.productId);
    if(!product||!Number.isInteger(lot.id)||lot.id<1||ids.has(lot.id)||typeof lot.code!=='string'||!lot.code.trim()||lot.code.length>60||!Number.isInteger(lot.quantity)||lot.quantity<0)throw new Error('Lote inválido na resposta.');
    dateDay(lot.expiresOn);ids.add(lot.id);
    const code=`${lot.productId}/${lot.code.trim().toLocaleLowerCase('pt-BR')}`;
    if(codes.has(code))throw new Error('Código de lote duplicado no produto.');codes.add(code);
    quantities.set(product.id,(quantities.get(product.id)||0)+lot.quantity);
  }
  for(const p of data.products){
    if(!['unknown','tracked','not_applicable'].includes(p.expiryMode??'unknown')||!Number.isInteger(p.expiryAlertDays??30)||(p.expiryAlertDays??30)<0||(p.expiryAlertDays??30)>365)throw new Error('Parâmetros de validade inválidos.');
    if((quantities.get(p.id)||0)>p.stock||(p.expiryMode!=='tracked'&&(quantities.get(p.id)||0)>0))throw new Error('Saldo dos lotes incompatível com o produto.');
  }
  return data;
}

/** Cadastra ou corrige lote somente na demonstração; saldo existente nunca aumenta o estoque. */
export function saveDemoLot(data,input,id=0,today=localDay()) {
  const p=data.products.find(p=>p.id===Number(input.productId));
  if(!p||p.expiryMode==='not_applicable')throw new Error('Ative o controle de validade no produto.');
  const code=String(input.code||'').trim();dateDay(input.expiresOn);
  if(!code||code.length>60)throw new Error('Informe o código do lote (até 60 caracteres).');
  if(data.lots.some(l=>l.id!==id&&l.productId===p.id&&l.code.toLocaleLowerCase('pt-BR')===code.toLocaleLowerCase('pt-BR')))throw new Error('Este código de lote já existe no produto.');
  if(id){const lot=data.lots.find(l=>l.id===id&&l.productId===p.id);if(!lot)throw new Error('Lote não encontrado.');Object.assign(lot,{code,expiresOn:input.expiresOn});return lot;}
  const quantity=Number(input.quantity);
  if(!Number.isInteger(quantity)||quantity<1||quantity>1000000)throw new Error('Informe uma quantidade inteira positiva.');
  if(input.operation==='existing'){
    if(quantity>expirySummary(p,data.lots,today).unallocated)throw new Error('Quantidade maior que o saldo sem lote.');
  }else if(input.operation==='entry'){
    if(input.expiresOn<today)throw new Error('Não é permitido receber mercadoria já vencida.');
  }else throw new Error('Escolha a operação do lote.');
  const lot={id:Math.max(0,...data.lots.map(l=>l.id))+1,productId:p.id,code,expiresOn:input.expiresOn,quantity};
  data.lots.push(lot);p.expiryMode='tracked';if(input.operation==='entry')p.stock+=quantity;
  return lot;
}

/** Retira somente unidades vencidas do lote escolhido na demonstração; exige uma justificativa. */
export function discardDemoLot(data,input,today=localDay()) {
  const lot=data.lots.find(l=>l.id===Number(input.lotId)&&l.productId===Number(input.productId));
  const quantity=Number(input.quantity);
  if(!lot||lot.expiresOn>=today||!Number.isInteger(quantity)||quantity<1||quantity>lot.quantity||!String(input.reason||'').trim())throw new Error('Revise o lote vencido, a quantidade e o motivo.');
  lot.quantity-=quantity;data.products.find(p=>p.id===lot.productId).stock-=quantity;
}
