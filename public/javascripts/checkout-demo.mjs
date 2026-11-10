/* Registra vendas apenas na demonstração. Valida a lista inteira, calcula descontos em centavos e só troca o estado depois que o armazenamento local confirma a gravação. */
import {itemPricing,purchasePricing} from './checkout-pricing.mjs';
/** Valida e salva a compra completa antes de substituir o estado da demonstração. */
export function registerDemoPurchase(data,payload,key,save){
  const existing=data.recentPurchases?.find(p=>p.operationKey===key);
  if(existing)return {data:{units:existing.units,total:existing.total}};
  if(!Array.isArray(payload.items)||!payload.items.length||payload.items.length>100)throw new Error('Lista de compra inválida.');
  if(!['PIX','DINHEIRO','DEBITO','CREDITO'].includes(payload.payment)||!Number.isInteger(payload.installments)||payload.installments<1||payload.installments>12)throw new Error('Pagamento inválido.');
  const next=structuredClone(data),ids=new Set();
  const lines=payload.items.map(i=>{
    const p=next.products.find(p=>p.id===i.productId);
    if(!p||p.active===false||ids.has(i.productId)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>p.stock||i.price!==p.price)throw new Error('Revise os produtos, preços e quantidades da lista.');
    ids.add(i.productId);return {i,p,pricing:itemPricing(i)};
  });
  const pricing=purchasePricing(payload.items,payload.purchaseDiscountType,payload.purchaseDiscountValue);
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const day=`${parts.year}-${parts.month}-${parts.day}`,date=`${day}T${parts.hour}:${parts.minute}:${parts.second}`;let cumulative=0,allocated=0;
  const items=lines.map(({i,p,pricing:line})=>{
    cumulative+=line.net;
    const target=pricing.subtotal?Math.round(cumulative*pricing.discount/pricing.subtotal):0;
    const discount=line.discount+target-allocated;allocated=target;p.stock-=i.quantity;
    const row=next.history.find(h=>h.productId===p.id&&h.date===day);
    const net=(line.gross-discount)/100;
    if(row){row.price=(row.price*row.quantity+net)/(row.quantity+i.quantity);row.quantity+=i.quantity;}
    else next.history.push({productId:p.id,date:day,quantity:i.quantity,price:net/i.quantity,cost:p.cost});
    return {productId:p.id,product:p.name,quantity:i.quantity,price:p.price,discount:discount/100,total:net};
  });
  const purchase={id:'COMPRA-'+key,operationKey:key,date,payment:payload.payment,installments:payload.payment==='CREDITO'?payload.installments:1,grouped:true,items,units:items.reduce((s,i)=>s+i.quantity,0),total:pricing.total/100};
  next.recentPurchases=[purchase,...(next.recentPurchases||[])];
  if(!save(next))throw new Error('Não foi possível salvar a venda neste navegador. Libere espaço e tente novamente.');
  Object.assign(data,next);return {data:{units:purchase.units,total:purchase.total}};
}
