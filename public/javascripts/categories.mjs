/** Reúne categorias cadastradas e nomes já usados, inclusive cadastros antigos da demonstração. */
export function categoryChoices(data,defaults=[]){return [...new Set([...defaults,...(data.categories||[]).map(c=>typeof c==='string'?c:c.name),...data.products.map(p=>p.category)])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));}
/** Normaliza espaços; nomes vazios, marcadores nulos e textos sem letras não viram categorias. */
export function categoryName(value){const name=String(value??'').normalize('NFC').replace(/[\p{Z}\s]+/gu,' ').trim();if(!name||name.length>80||!/[\p{L}]/u.test(name)||/^(null|undefined)$/i.test(name))throw Error('Informe uma categoria com até 80 caracteres.');return name;}
/** Abre uma janela sobre o formulário atual sem perder os campos que já foram preenchidos. */
export function installCategoryCreation(save){
 document.addEventListener('change',event=>{
  const select=event.target;if(!select.matches('#product-form select[name=category]'))return;
  if(select.value!=='__new_category__'){select.dataset.current=select.value;return;}
  select.value=select.dataset.current||select.options[0].value;
  const modal=document.createElement('dialog');modal.className='category-editor';
  modal.setAttribute('aria-labelledby','category-dialog-title');
  modal.innerHTML='<div class="dialog-head"><h2 id="category-dialog-title">Nova categoria</h2><button type="button" class="icon-button" data-category-close aria-label="Fechar">×</button></div><form><div class="dialog-body"><label class="field">Nome da categoria<input name="name" required maxlength="80" autocomplete="off" autofocus placeholder="Ex.: Produtos de limpeza"></label><p class="subtext">A categoria ficará disponível para cadastrar e filtrar produtos.</p><p class="form-error" role="alert"></p></div><div class="dialog-actions"><button type="button" class="btn" data-category-close>Cancelar</button><button type="submit" class="btn primary">Salvar categoria</button></div></form>';
  let busy=false;
  modal.querySelectorAll('[data-category-close]').forEach(b=>b.onclick=()=>{if(!busy)modal.close();});
  modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  modal.addEventListener('close',()=>{modal.remove();select.focus();},{once:true});
  modal.querySelector('form').onsubmit=async e=>{
   e.preventDefault();if(busy)return;
   const button=modal.querySelector('[type=submit]');
   try{
    const name=categoryName(modal.querySelector('input').value);busy=true;button.disabled=true;
    const created=await save(name);const option=document.createElement('option');option.value=created.name;option.textContent=created.name;
    select.insertBefore(option,select.lastElementChild);select.value=created.name;select.dataset.current=created.name;modal.close();
   }catch(error){modal.querySelector('.form-error').textContent=error.message;}
   finally{busy=false;button.disabled=false;}
  };
  document.body.append(modal);modal.showModal();
 });
}
/** Uma seleção vazia representa todas as categorias; várias opções são combinadas por união. */
export function matchesCategories(category,selected=[]){return !selected.length||selected.includes(category);}
/** Nomes clicáveis alternam categorias sem controles de marcação ou caixas expansíveis. */
export function categoryFilterLinks(categories,selected=[]){
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="filter-group category-name-group"><span class="category-name-title">Categorias</span><div class="category-name-list" role="group" aria-label="Filtrar por categorias"><button type="button" class="category-name ${!selected.length?'is-active':''}" data-action="all-categories" aria-pressed="${!selected.length}">Todas as categorias</button>${categories.map(c=>`<button type="button" class="category-name ${selected.includes(c)?'is-active':''}" data-action="category-filter" data-category="${esc(c)}" aria-pressed="${selected.includes(c)}">${esc(c)}</button>`).join('')}</div></div>`;
}
