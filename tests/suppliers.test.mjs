/* Testes de regressão deste módulo. Os cenários descrevem os contratos esperados; mudanças de regra precisam atualizar também os resultados verificados. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../public/javascripts/demo-data.mjs';
import {validateSnapshot} from '../public/javascripts/domain.mjs';
import {normalizeSuppliers,supplierError,upsertSupplier,CATEGORIES} from '../public/javascripts/suppliers.mjs';
test('migra cadastros existentes sem inventar telefones e classifica brinquedo',()=>{
  const data=normalizeSuppliers(createDemo());
  validateSnapshot(data);
  assert.ok(CATEGORIES.includes('Brinquedos'));
  assert.equal(data.products.find(p=>p.name==='Hot Wheels').category,'Brinquedos');
  assert.ok(data.suppliers.every(s=>s.phone===''));
  const count=data.suppliers.length;normalizeSuppliers(data);assert.equal(data.suppliers.length,count);
  assert.ok(data.products.every(p=>data.suppliers.some(s=>s.id===p.supplierId&&s.name===p.supplier)));
});
test('atualiza nome por ID sem perder vínculos nem sobrescrever contatos',()=>{
  const data=normalizeSuppliers(createDemo()),p=data.products[0],id=p.supplierId;
  upsertSupplier(data,{name:'Fornecedor Teste',phone:'(11) 99999-0000',segment:'Publicações'},id);
  assert.equal(p.supplier,'Fornecedor Teste');assert.equal(p.supplierId,id);
  normalizeSuppliers(data);assert.equal(data.suppliers.find(s=>s.id===id).phone,'(11) 99999-0000');
  validateSnapshot(data);
});
test('bloqueia telefone inválido e nomes duplicados sem diferenciar acentos',()=>{
  assert.ok(supplierError({name:'Teste',phone:'123',segment:'Brinquedos'},[]));
  const suppliers=[{id:1,name:'Comércio ABC',phone:'11999990000',segment:'Brinquedos'}];
  assert.ok(supplierError({name:'  COMERCIO   abc  ',phone:'11999990000',segment:'Brinquedos'},suppliers));
  assert.equal(supplierError({...suppliers[0]},suppliers,1),'');
});
test('novos fornecedores recebem IDs estáveis e vínculos inválidos são rejeitados',()=>{
  const data=normalizeSuppliers(createDemo());
  const s=upsertSupplier(data,{name:'Brinquedos Teste',phone:'11999990000',segment:'Brinquedos'});
  assert.equal(s.id,Math.max(...data.suppliers.map(s=>s.id)));
  assert.equal(data.suppliers.filter(row=>row.id===s.id).length,1);
  data.products[0].supplierId=999999;assert.throws(()=>validateSnapshot(data));
});
test('e-mail opcional é migrado sem apagar contatos e validado quando informado',()=>{
  const data=normalizeSuppliers(createDemo());
  assert.ok(data.suppliers.every(s=>s.email===''));
  const id=data.suppliers[0].id;
  upsertSupplier(data,{name:'Fornecedor Email',phone:'11999990000',segment:'Brinquedos',email:' contato@example.com '},id);
  normalizeSuppliers(data);validateSnapshot(data);
  assert.equal(data.suppliers[0].email,'contato@example.com');
  assert.ok(supplierError({name:'Outro',phone:'11999990000',segment:'Brinquedos',email:'email-invalido'},data.suppliers));
  assert.equal(supplierError({name:'Outro',phone:'11999990000',segment:'Brinquedos',email:''},data.suppliers),'');
});
