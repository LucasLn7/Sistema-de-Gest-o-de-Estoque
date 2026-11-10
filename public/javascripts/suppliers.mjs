/* Normaliza fornecedores e valida cadastros e vínculos com produtos. No modo demonstrativo, as alterações são feitas sobre o estado local. */
export const CATEGORIES = ['Publicações','Alimentos e bebidas','Tabacaria','Papelaria e variedades','Brinquedos'];
export const cleanName = value => String(value||'').trim().replace(/\s+/g,' ');
const nameKey = value => cleanName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
/** Migra a demonstração antiga e normaliza vínculos e e-mails; modifica o snapshot recebido. */
export function normalizeSuppliers(data) {
  if(!Array.isArray(data.suppliers)) data.suppliers=[];
  if(!data.supplierSchemaVersion){
    for(const p of data.products) if(p.name==='Hot Wheels'&&p.category==='Papelaria e variedades')p.category='Brinquedos';
    data.supplierSchemaVersion=1;
  }
  for(const p of data.products){
    let supplier=data.suppliers.find(s=>s.id===p.supplierId)||data.suppliers.find(s=>nameKey(s.name)===nameKey(p.supplier));
    if(!supplier){
      const categories=[...new Set(data.products.filter(row=>nameKey(row.supplier)===nameKey(p.supplier)).map(row=>row.category))];
      supplier={id:Math.max(0,...data.suppliers.map(s=>s.id))+1,name:cleanName(p.supplier),phone:'',segment:categories.join(' / ')};
      data.suppliers.push(supplier);
    }
    p.supplierId=supplier.id;p.supplier=supplier.name;
  }
  for(const supplier of data.suppliers)if(supplier.email===undefined||supplier.email===null)supplier.email='';
  return data;
}
/** Retorna a primeira mensagem de validação de fornecedor ou string vazia quando válido. */
export function supplierError(values,suppliers,id=0){
  if(!cleanName(values.name)||!cleanName(values.segment))return 'Informe nome e segmento do fornecedor.';
  const digits=String(values.phone||'').replace(/\D/g,'');
  if(!/^[+\d\s().-]+$/.test(values.phone)||digits.length<10||digits.length>15)return 'Informe um telefone válido com DDD (10 a 15 dígitos, incluindo o código do país quando houver).';
  const email=String(values.email||'').trim();
  if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return 'Informe um e-mail válido, como contato@empresa.com.br.';
  if(suppliers.some(s=>s.id!==id&&nameKey(s.name)===nameKey(values.name)))return 'Já existe um fornecedor com este nome.';
  return '';
}
/** Valida e altera fornecedor na demonstração, sincronizando os nomes dos produtos vinculados. */
export function upsertSupplier(data,values,id=0){
  const error=supplierError(values,data.suppliers,id);if(error)throw new Error(error);
  const record={id:id||Math.max(0,...data.suppliers.map(s=>s.id))+1,name:cleanName(values.name),phone:String(values.phone).trim(),email:String(values.email||'').trim(),segment:cleanName(values.segment)};
  if(id){const index=data.suppliers.findIndex(s=>s.id===id);if(index<0)throw new Error('Fornecedor não encontrado.');data.suppliers[index]=record;}
  else data.suppliers.push(record);
  for(const p of data.products)if(p.supplierId===record.id)p.supplier=record.name;
  return record;
}
