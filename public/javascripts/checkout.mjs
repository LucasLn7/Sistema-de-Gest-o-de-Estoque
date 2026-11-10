import { registerDemoPurchase } from './checkout-demo.mjs';
import { saveData } from './data-service.mjs';
import { openNonfiscalReceipt } from './nonfiscal-receipt.mjs?v=20261108-product-id-1';
import { itemPricing, purchasePricing } from './checkout-pricing.mjs?v=20261108-total-discount-1';
import { expirySummary } from './expiry.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
const key='stockos-presentation-checkout-v1';
let installments=1;
let cart=[],payment='PIX',pending=null,busy=false,purchaseDiscountType='amount',purchaseDiscountValue=0,purchaseDiscountEnabled=false;
try{const saved=JSON.parse(sessionStorage.getItem(key));if(saved&&Array.isArray(saved.cart)){cart=saved.cart;payment=saved.payment||'PIX';installments=Number.isInteger(saved.installments)&&saved.installments>=1&&saved.installments<=12?saved.installments:1;pending=saved.pending||null;purchaseDiscountType=saved.purchaseDiscountType||'amount';purchaseDiscountValue=saved.purchaseDiscountValue??0;purchaseDiscountEnabled=saved.purchaseDiscountEnabled??(purchaseDiscountValue>0);}}catch{}
/** Preserva o rascunho e a chave de confirmação na aba para permitir reenvio seguro após falha de rede. */
function persist(){try{sessionStorage.setItem(key,JSON.stringify({cart,payment,installments,pending,purchaseDiscountType,purchaseDiscountValue,purchaseDiscountEnabled}));}catch{}}
/** Monta a tela de venda no balcão e o histórico agrupado por compra. */
export function checkoutPage(data,isDemo){
  return `<div class="page-heading"><div><h1>Saída rápida</h1><p>Monte a lista do cliente e finalize a venda para baixar o estoque.</p></div><div class="actions"><button class="btn" id="checkout-refresh">Atualizar catálogo</button><a class="btn" href="#sales">Análise de vendas</a></div></div>${isDemo?'<div class="banner">Demonstração: vendas e estoque são salvos somente neste navegador.</div>':''}<div class="checkout-grid"><section class="panel"><div class="panel-body"><label class="field">Buscar produto por nome ou ID<input id="checkout-search" type="search" autocomplete="off" placeholder="Nome ou ID, ex.: PR-028…"></label><p class="subtext">Digite o nome ou o ID do produto. Pressione Enter para adicionar o ID exato ou o único resultado.</p><div id="checkout-results"></div></div></section><section class="panel"><div class="panel-head"><h2>Lista do cliente</h2></div><div class="panel-body"><div id="checkout-cart"></div><label class="field">Pagamento<select id="checkout-payment"><option value="PIX">Pix</option><option value="DINHEIRO">Dinheiro</option><option value="DEBITO">Débito</option><option value="CREDITO">Crédito</option></select></label><label class="field credit-installments" id="checkout-installments-field" hidden>Número de parcelas<select id="checkout-installments" aria-label="Número de parcelas no crédito">${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}x${i===0?' (uma parcela)':''}</option>`).join('')}</select></label><p id="checkout-message" role="status" aria-live="polite"></p><button id="checkout-submit" class="btn primary" ${!isDemo?'disabled':''}>Finalizar venda e registrar saída</button><button id="checkout-clear" class="btn">Limpar lista</button></div></section></div><section class="panel checkout-history"><div class="panel-head"><h2>Histórico de compras completas</h2><p>Cada lista finalizada aparece como uma compra. Abra para consultar os produtos.</p></div><div class="panel-body">${data.recentPurchases?.length?data.recentPurchases.map(p=>`<details class="checkout-purchase"><summary><div><strong>${esc(p.id)}</strong><small>${esc(p.date.slice(0,10).split('-').reverse().join('/')+' '+p.date.slice(11,16))} · ${esc({PIX:'Pix',DINHEIRO:'Dinheiro',DEBITO:'Débito',CREDITO:'Crédito'}[p.payment]||p.payment)}${p.payment==='CREDITO'&&p.installments?` · ${p.installments}x`:''}</small><small>${p.items.length} ${p.items.length===1?'produto':'produtos'} · ${p.units} unidades${p.grouped?'':' · Registro avulso'}</small></div><strong>${money(p.total)}</strong><button type="button" class="btn receipt-open" data-print-purchase="${esc(p.id)}" aria-label="Abrir comprovante não fiscal da compra ${esc(p.id)}">Comprovante</button><span class="purchase-expand"><span class="purchase-closed-label">Ver itens ▾</span><span class="purchase-open-label">Compra aberta · Fechar ▴</span></span></summary><div class="table-wrap"><table><thead><tr><th>Produto</th><th>Quantidade</th><th>Preço unitário</th><th>Desconto total</th><th>Subtotal</th></tr></thead><tbody>${p.items.map(i=>`<tr><td>${esc(i.product)}</td><td>${i.quantity}</td><td>${money(i.price)}</td><td>${money(i.discount)}</td><td>${money(i.total)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="4">Total da compra</td><td><strong>${money(p.total)}</strong></td></tr></tfoot></table></div></details>`).join(''):'<p class="subtext">Nenhuma compra disponível no histórico.</p>'}</div></section>`;
}
/** Associa busca e carrinho; a API confirma todos os itens na mesma transação. */
export function mountCheckout(root,data,{reload,isDemo}){
  if(!pending)cart=cart.map(item=>{const p=data.products.find(p=>p.id===item.productId);return p?{...item,name:p.name,price:p.price}:item;});
  const search=root.querySelector('#checkout-search'),results=root.querySelector('#checkout-results'),target=root.querySelector('#checkout-cart'),message=root.querySelector('#checkout-message'),submit=root.querySelector('#checkout-submit'),clear=root.querySelector('#checkout-clear'),pay=root.querySelector('#checkout-payment');
  // O comprovante usa apenas os itens e valores já registrados no histórico.
  root.querySelector('.checkout-history').onclick=event=>{
    const button=event.target.closest('[data-print-purchase]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const purchase=data.recentPurchases?.find(p=>p.id===button.dataset.printPurchase);
    if(purchase)openNonfiscalReceipt(purchase);
  };
  const available=p=>expirySummary(p,data.lots).saleable;
  const say=text=>message.textContent=text;
  const locked=()=>busy||Boolean(pending);
  // Mantém o valor final consistente após mudar produtos, quantidades ou qualquer desconto.
  function updateCheckoutTotal(){
    const input=target.querySelector('#purchase-discount-value');if(!input)return;
    input.setCustomValidity('');
    try{
      const pricing=purchasePricing(cart,purchaseDiscountEnabled?purchaseDiscountType:'amount',purchaseDiscountEnabled?purchaseDiscountValue:0);
      target.querySelector('.checkout-total strong').textContent=money(pricing.total/100);
      target.querySelector('#purchase-discount-summary').textContent=`Subtotal após descontos dos produtos: ${money(pricing.subtotal/100)} · Desconto geral: ${money(pricing.discount/100)}`;
      submit.disabled=!isDemo||busy||!cart.length||[...target.querySelectorAll('input')].some(el=>!el.validity.valid);
    }catch(error){input.setCustomValidity(error.message);target.querySelector('.checkout-total strong').textContent='—';submit.disabled=true;say(error.message);}
  }
  function draw(){
    target.innerHTML=cart.length?cart.map(item=>`<div class="checkout-item"><div><strong>${esc(item.name)}</strong><small>PR-${String(item.productId).padStart(3,'0')} · ${money(item.price)} por unidade</small></div><div class="checkout-quantity"><label for="checkout-qty-${item.productId}">Quantidade</label><div class="checkout-quantity-controls"><input id="checkout-qty-${item.productId}" aria-label="Quantidade de ${esc(item.name)}" data-quantity="${item.productId}" type="number" min="1" max="1000000" step="1" value="${item.quantity}" ${locked()?'disabled':''}><div class="checkout-quantity-arrows"><button type="button" aria-label="Aumentar quantidade de ${esc(item.name)}" data-step="1" data-product="${item.productId}" ${locked()?'disabled':''}>▲</button><button type="button" aria-label="Diminuir quantidade de ${esc(item.name)}" data-step="-1" data-product="${item.productId}" ${locked()||item.quantity<=1?'disabled':''}>▼</button></div></div></div><div class="checkout-discount"><label for="discount-type-${item.productId}">Desconto no total deste item</label><div class="checkout-discount-fields"><select id="discount-type-${item.productId}" data-discount-type="${item.productId}" aria-label="Tipo de desconto de ${esc(item.name)}" ${locked()?'disabled':''}><option value="amount" ${(item.discountType||'amount')==='amount'?'selected':''}>Reais (R$)</option><option value="percent" ${item.discountType==='percent'?'selected':''}>Porcentagem (%)</option></select><input type="number" data-discount="${item.productId}" aria-label="Desconto de ${esc(item.name)}" min="0" step="0.01" value="${item.discountValue||0}" ${locked()?'disabled':''}></div><small data-discount-summary="${item.productId}">${money(itemPricing(item).gross/100)} − ${money(itemPricing(item).discount/100)} de desconto</small></div><strong>${money(itemPricing(item).net/100)}</strong><button type="button" class="checkout-remove" title="Remover item da lista" aria-label="Remover ${esc(item.name)}" data-remove="${item.productId}" ${locked()?'disabled':''}>× Remover</button></div>`).join(''):'<p class="subtext">Busque um produto para começar.</p>';
    target.innerHTML+=`<label class="purchase-discount-toggle"><input type="checkbox" id="purchase-discount-enabled" ${purchaseDiscountEnabled?'checked':''} ${locked()?'disabled':''}><span>Aplicar desconto na compra</span></label><div class="purchase-discount-box" ${purchaseDiscountEnabled?'':'hidden'}><label for="purchase-discount-type">Desconto no total da compra</label><div class="checkout-discount-fields"><select id="purchase-discount-type" aria-label="Tipo de desconto da compra" ${locked()?'disabled':''}><option value="amount" ${purchaseDiscountType==='amount'?'selected':''}>Reais (R$)</option><option value="percent" ${purchaseDiscountType==='percent'?'selected':''}>Porcentagem (%)</option></select><input id="purchase-discount-value" aria-label="Desconto da compra" type="number" min="0" step="0.01" value="${purchaseDiscountValue}" ${locked()?'disabled':''}></div><small id="purchase-discount-summary"></small><small>Aplicado após os descontos individuais e distribuído entre os produtos no histórico.</small></div><div class="checkout-total">Total <strong>${money(cart.reduce((total,i)=>total+itemPricing(i).net,0)/100)}</strong></div>`;
    submit.disabled=!isDemo||busy||!cart.length;submit.textContent=pending?'Confirmar novamente com segurança':'Finalizar venda e registrar saída';clear.disabled=locked();pay.disabled=locked();pay.value=payment;search.disabled=locked();
    root.querySelector('#checkout-installments-field').hidden=payment!=='CREDITO';
    const parcelSelect=root.querySelector('#checkout-installments');parcelSelect.value=String(installments);parcelSelect.disabled=locked()||payment!=='CREDITO';
    updateCheckoutTotal();
    if(pending)say('Confirmação pendente. Reenvie a mesma lista para verificar o resultado sem duplicar a saída.');
    persist();
  }
  // Nomes são comparados sem acentos e sem diferença entre maiúsculas e minúsculas.
  const searchKey=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
  const productIdFromSearch=()=>{const match=searchKey(search.value).match(/^(?:pr[- ]?)?(\d+)$/);return match?Number(match[1]):null;};
  function matches(){const value=searchKey(search.value),id=productIdFromSearch();return value?data.products.filter(p=>p.active!==false).filter(p=>searchKey(p.name).includes(value)||p.id===id).sort((a,b)=>Number(b.id===id)-Number(a.id===id)).slice(0,12):[];}
  function show(){results.innerHTML=matches().map(p=>`<button class="checkout-result" data-add="${p.id}" ${available(p)<=0?'disabled':''}><span>${esc(p.name)}<small>PR-${String(p.id).padStart(3,'0')} · ${available(p)} disponíveis para venda</small></span><strong>${money(p.price)} ＋</strong></button>`).join('')||(search.value?'<p class="subtext">Nenhum produto encontrado.</p>':'');}
  function add(id){
    if(locked())return;const p=data.products.find(p=>p.id===id);if(!p||p.active===false){say('Produto desativado. Remova-o da lista.');return;}
    const item=cart.find(i=>i.productId===id),quantity=(item?.quantity||0)+1;
    if(quantity>available(p)){say('Quantidade superior ao saldo disponível para venda.');return;}
    if(item)item.quantity=quantity;else if(cart.length<100)cart.push({productId:id,name:p.name,price:p.price,quantity:1});else{say('Limite de 100 produtos por lista.');return;}
    say('');draw();search.value='';show();search.focus();
  }
  search.addEventListener('input',show);
  search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const list=matches(),exact=list.find(p=>p.id===productIdFromSearch());if(exact||list.length===1)add((exact||list[0]).id);}});
  results.addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(button)add(Number(button.dataset.add));});
  // As setas alteram somente a quantidade; a remoção permanece em um controle separado.
  target.addEventListener('click',event=>{
    const button=event.target.closest('[data-step]');if(!button||locked())return;
    const item=cart.find(i=>i.productId===Number(button.dataset.product)),product=data.products.find(p=>p.id===item.productId);
    const quantity=item.quantity+Number(button.dataset.step);
    if(quantity<1)return;
    if(quantity>Math.min(1000000,available(product))){say('Quantidade superior ao saldo disponível para venda.');return;}
    try{itemPricing({...item,quantity});}catch(error){say(error.message);return;}item.quantity=quantity;say('');draw();
  });
  target.addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(button&&!locked()){cart=cart.filter(i=>i.productId!==Number(button.dataset.remove));draw();}});
  target.addEventListener('change',event=>{
    const input=event.target;if(input.id==='purchase-discount-enabled'&&!locked()){purchaseDiscountEnabled=input.checked;if(!purchaseDiscountEnabled){purchaseDiscountType='amount';purchaseDiscountValue=0;}say('');draw();return;}if(input.id==='purchase-discount-type'&&!locked()){purchaseDiscountType=input.value;purchaseDiscountValue=0;say('');draw();return;}if(!input.matches('[data-discount-type]')||locked())return;
    const item=cart.find(i=>i.productId===Number(input.dataset.discountType));item.discountType=input.value;item.discountValue=0;say('');draw();
  });
  target.addEventListener('input',event=>{
    const input=event.target;if(input.id==='purchase-discount-value'&&!locked()){purchaseDiscountValue=input.value===''?0:Number(input.value);say('');updateCheckoutTotal();persist();return;}if(!input.matches('[data-discount]')||locked())return;
    const item=cart.find(i=>i.productId===Number(input.dataset.discount));input.setCustomValidity('');
    try{
      const value=input.value===''?0:Number(input.value),pricing=itemPricing({...item,discountValue:value});
      item.discountValue=value;
      input.closest('.checkout-item').querySelector(':scope > strong').textContent=money(pricing.net/100);
      target.querySelector(`[data-discount-summary="${item.productId}"]`).textContent=`${money(pricing.gross/100)} − ${money(pricing.discount/100)} de desconto`;
      target.querySelector('.checkout-total strong').textContent=money(cart.reduce((sum,i)=>sum+itemPricing(i).net,0)/100);
      say('');updateCheckoutTotal();persist();
    }catch(error){input.setCustomValidity(error.message);submit.disabled=true;say(error.message);}
  });
  // Atualiza valores durante a digitação sem recriar o campo ou perder o foco.
  target.addEventListener('input',event=>{
    const input=event.target;if(!input.matches('[data-quantity]')||locked())return;
    const item=cart.find(i=>i.productId===Number(input.dataset.quantity)),product=data.products.find(p=>p.id===item.productId),quantity=Number(input.value);
    input.setCustomValidity('');
    if(!Number.isInteger(quantity)||quantity<1||quantity>Math.min(1000000,available(product))){input.setCustomValidity('Quantidade inválida.');submit.disabled=true;say('Revise a quantidade antes de finalizar.');return;}
    try{itemPricing({...item,quantity});}catch(error){input.setCustomValidity(error.message);submit.disabled=true;say(error.message);return;}
    item.quantity=quantity;input.closest('.checkout-item').querySelector(':scope > strong').textContent=money(itemPricing(item).net/100);
    const pricing=itemPricing(item);target.querySelector(`[data-discount-summary="${item.productId}"]`).textContent=`${money(pricing.gross/100)} − ${money(pricing.discount/100)} de desconto`;
    target.querySelector('.checkout-total strong').textContent=money(cart.reduce((total,i)=>total+itemPricing(i).net,0)/100);
    say('');updateCheckoutTotal();persist();
  });
  target.addEventListener('change',event=>{if(!event.target.matches('[data-quantity]')||locked())return;const input=event.target,item=cart.find(i=>i.productId===Number(input.dataset.quantity)),p=data.products.find(p=>p.id===item.productId),quantity=Number(input.value);if(!Number.isInteger(quantity)||quantity<1||quantity>Math.min(1000000,available(p))){say('Informe uma quantidade inteira dentro do saldo disponível.');draw();return;}try{itemPricing({...item,quantity});}catch(error){say(error.message);return;}item.quantity=quantity;say('');draw();});
  root.querySelector('#checkout-installments').addEventListener('change',event=>{installments=Number(event.target.value);persist();});
  pay.addEventListener('change',()=>{payment=pay.value;installments=1;draw();});clear.addEventListener('click',()=>{if(!locked()){cart=[];installments=1;purchaseDiscountValue=0;purchaseDiscountType='amount';purchaseDiscountEnabled=false;say('');draw();search.focus();}});
  submit.addEventListener('click',async()=>{
    if(busy||!isDemo||!cart.length||(!pending&&[...target.querySelectorAll('input')].some(el=>!el.validity.valid)))return;busy=true;
    pending??={key:crypto.randomUUID(),payload:{items:cart.map(i=>({productId:i.productId,quantity:i.quantity,price:i.price,discountType:i.discountType||'amount',discountValue:i.discountValue||0})),payment,installments:payment==='CREDITO'?installments:1,purchaseDiscountType:purchaseDiscountEnabled?purchaseDiscountType:'amount',purchaseDiscountValue:purchaseDiscountEnabled?purchaseDiscountValue:0}};draw();
    let confirmed=false;
    try{
      const result=registerDemoPurchase(data,pending.payload,pending.key,saveData);
      confirmed=true;cart=[];installments=1;pending=null;busy=false;purchaseDiscountType='amount';purchaseDiscountValue=0;purchaseDiscountEnabled=false;persist();
      await reload();const status=root.querySelector('#checkout-message');if(status)status.textContent=`Venda registrada: ${result.data.units} unidades · ${money(result.data.total)}. Estoque e histórico atualizados.`;
    }catch(error){say(confirmed?'Venda registrada. Atualize a tela para consultar o saldo e o histórico.':error.message);}
    finally{busy=false;if(!confirmed)draw();}
  });
  root.querySelector('#checkout-refresh').addEventListener('click',async()=>{if(busy)return;try{await reload();}catch(error){say(error.message);}});
  draw();
}
