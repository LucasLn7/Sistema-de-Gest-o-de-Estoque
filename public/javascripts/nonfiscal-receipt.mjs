/* Monta o comprovante usando os valores da compra salva. A impressão passa pelo navegador e pelo driver instalado; este documento não substitui nota fiscal. */
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decimal=value=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
/** Abre comprovante com os valores históricos da venda, sem usar preços atuais do catálogo. */
export function openNonfiscalReceipt(purchase){
  document.querySelector('#nonfiscal-receipt')?.remove();
  const modal=document.createElement('dialog');modal.id='nonfiscal-receipt';
  modal.setAttribute('aria-labelledby','receipt-title');
  let roll='80';try{if(localStorage.getItem('stockos-receipt-roll')==='58')roll='58';}catch{}
  modal.style.setProperty('--receipt-roll-width',roll+'mm');
  const gross=purchase.items.reduce((sum,i)=>sum+Math.round(i.price*100)*i.quantity,0);
  const discounts=purchase.items.reduce((sum,i)=>sum+Math.round(i.discount*100),0);
  const date=String(purchase.date),payment={PIX:'Pix',DINHEIRO:'Dinheiro',DEBITO:'Débito',CREDITO:'Crédito'}[purchase.payment]||purchase.payment;
  modal.innerHTML=`<div class="receipt-toolbar"><label class="field">Bobina<select id="receipt-roll"><option value="80" ${roll==='80'?'selected':''}>80 mm</option><option value="58" ${roll==='58'?'selected':''}>58 mm</option></select></label><button type="button" class="btn primary" data-receipt-print>Imprimir cupom</button><button type="button" class="btn" data-receipt-close>Fechar</button></div><p class="receipt-print-help">Na impressão, selecione a impressora térmica instalada no Windows, o mesmo tamanho de bobina, escala 100% e desative cabeçalhos e rodapés do navegador. A altura do papel é definida pelo driver.</p><article class="receipt-paper"><header><div class="receipt-brand">StockOS</div><h2 id="receipt-title">Comprovante de venda</h2><strong class="receipt-warning">DOCUMENTO NÃO FISCAL<br>NÃO SUBSTITUI NOTA FISCAL</strong></header><div class="receipt-meta"><p><strong>Compra:</strong> ${esc(purchase.id)}</p><p><strong>Data da venda:</strong> ${esc(date.slice(0,10).split('-').reverse().join('/')+' '+date.slice(11,19))}</p><p><strong>Pagamento:</strong> ${esc(payment)}${purchase.payment==='CREDITO'&&purchase.installments?` · ${purchase.installments}x`:''}</p></div><div class="receipt-products"><p class="receipt-currency">Valores em R$</p><div class="receipt-line-head"><span>Qtd.</span><span>Unitário</span><span>Desconto</span><span>Total</span></div>${purchase.items.map((i,index)=>`<div class="receipt-product"><strong>${String(index+1).padStart(3,'0')} ${esc(i.product)}</strong><div class="receipt-line-values"><span>${i.quantity}</span><span>${decimal(i.price)}</span><span>${decimal(i.discount)}</span><span>${decimal(i.total)}</span></div></div>`).join('')}</div><div class="receipt-totals"><p><span>Produtos / unidades</span><strong>${purchase.items.length} / ${purchase.units}</strong></p><p><span>Subtotal bruto</span><strong>${money(gross/100)}</strong></p><p><span>Descontos</span><strong>− ${money(discounts/100)}</strong></p><p class="receipt-final"><span>Total pago</span><strong>${money(purchase.total)}</strong></p></div><footer>Comprovante para conferência da compra.<br>Os descontos por produto incluem o rateio de eventual desconto geral.<br>Este documento não possui validade de nota fiscal.</footer></article>`;
  modal.onclick=event=>{
    if(event.target.closest('[data-receipt-close]'))modal.close();
    if(event.target.closest('[data-receipt-print]'))window.print();
  };
  modal.onchange=event=>{
    if(event.target.id!=='receipt-roll')return;
    const width=event.target.value==='58'?'58':'80';modal.style.setProperty('--receipt-roll-width',width+'mm');
    try{localStorage.setItem('stockos-receipt-roll',width);}catch{}
  };
  modal.addEventListener('close',()=>modal.remove());
  document.body.append(modal);modal.showModal();
}
