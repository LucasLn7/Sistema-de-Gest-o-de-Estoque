/** Calcula desconto sobre o valor total do item (quantidade × preço), arredondado em centavos. */
export function itemPricing(item){
  const gross=Math.round(item.price*100)*item.quantity,type=item.discountType||'amount',value=Number(item.discountValue??0);
  if(!['amount','percent'].includes(type)||!Number.isFinite(value)||value<0||Math.abs(value*100-Math.round(value*100))>0.000001)throw new Error('Informe desconto válido com até duas casas decimais.');
  if(type==='percent'&&value>100)throw new Error('O desconto percentual deve ficar entre 0 e 100%.');
  const discount=type==='percent'?Math.round(gross*Math.round(value*100)/10000):Math.round(value*100);
  if(discount>gross)throw new Error('O desconto não pode superar o valor total do item.');
  return {gross,discount,net:gross-discount};
}
/** Aplica o desconto geral depois dos descontos individuais dos itens. */
export function purchasePricing(items,type='amount',value=0){
  const subtotal=items.reduce((sum,item)=>sum+itemPricing(item).net,0);
  const pricing=itemPricing({price:subtotal/100,quantity:1,discountType:type,discountValue:value});
  return {subtotal,discount:pricing.discount,total:pricing.net};
}
