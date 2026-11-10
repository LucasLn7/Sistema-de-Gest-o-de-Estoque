import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerDemoPurchase} from '../public/javascripts/checkout-demo.mjs';
const state=()=>({products:[{id:1,name:'Água',stock:10,price:5,cost:2},{id:2,name:'Revista',stock:3,price:10,cost:4}],history:[],recentPurchases:[]});
const payload=()=>({items:[{productId:1,quantity:2,price:5,discountType:'percent',discountValue:10},{productId:2,quantity:1,price:10}],payment:'CREDITO',installments:3,purchaseDiscountType:'amount',purchaseDiscountValue:4});
test('venda aplica descontos, parcelas e baixa de estoque sem duplicar reenvios',()=>{
  const data=state();let saved;
  const result=registerDemoPurchase(data,payload(),'same-key',next=>(saved=structuredClone(next),true));
  assert.equal(result.data.total,15);assert.equal(result.data.units,3);
  assert.equal(data.products[0].stock,8);assert.equal(saved.products[1].stock,2);
  const p=data.recentPurchases[0];assert.equal(p.installments,3);assert.equal(p.items.reduce((s,i)=>s+Math.round(i.discount*100),0),500);
  assert.equal(p.items.reduce((s,i)=>s+Math.round(i.total*100),0),1500);
  registerDemoPurchase(data,payload(),'same-key',()=>{throw Error('não deve salvar');});
  assert.equal(data.products[0].stock,8);assert.equal(data.recentPurchases.length,1);
});
test('saldo insuficiente e falha de armazenamento preservam a compra inteira',()=>{
  const data=state(),before=structuredClone(data),p=payload();p.items[1].quantity=4;
  assert.throws(()=>registerDemoPurchase(data,p,'key',()=>true));assert.deepEqual(data,before);
  assert.throws(()=>registerDemoPurchase(data,payload(),'key',()=>false),/salvar/);assert.deepEqual(data,before);
});
test('vendas no mesmo dia agregam receita líquida sem duplicar a série diária',()=>{
  const data=state();registerDemoPurchase(data,payload(),'one',()=>true);registerDemoPurchase(data,payload(),'two',()=>true);
  assert.equal(data.history.length,2);assert.equal(data.history.reduce((s,h)=>s+h.quantity*h.price,0),30);
  assert.equal(data.recentPurchases.length,2);
});
