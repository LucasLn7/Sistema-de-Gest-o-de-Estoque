import test from 'node:test';
import assert from 'node:assert/strict';
import { abcProducts, planProduct, validateSnapshot } from '../public/javascripts/domain.mjs';
import { createDemo } from '../public/javascripts/demo-data.mjs';
const product={id:1,name:'Água',category:'Bebidas',supplier:'Fornecedor',stock:10,minimum:5,cost:2,price:4};
const future=Array.from({length:7},(_,i)=>({productId:1,date:`2026-11-${String(i+7).padStart(2,'0')}`,quantity:2}));
test('ABC mantém o item que cruza o limiar na classe anterior e não classifica produto sem vendas',()=>{
  const ps=[1,2,3,4].map(id=>({...product,id}));
  const abc=abcProducts(ps,[{productId:1,quantity:80,price:1},{productId:2,quantity:15,price:1},{productId:3,quantity:5,price:1}]);
  assert.deepEqual(abc.map(p=>p.abc),['A','B','C',null]);
  assert.equal(abc.at(-1).cumulative,1);
});
test('compra cobre prazo, horizonte e reserva e desconta apenas pedidos em aberto',()=>{
  const orders=['draft','pending','received','cancelled'].map(status=>({status,items:[{productId:1,quantity:4}]}));
  const plan=planProduct(product,[],future,orders,5,7,2);
  assert.equal(plan.demand,14);
  assert.equal(plan.incoming,4);
  assert.equal(plan.suggested,14); // 2*(5+7+2)-10-4
  assert.equal(plan.coverage,5); // entradas sem data não aumentam cobertura
  assert.equal(plan.status,'Atenção');
});
test('sem previsão não inventa cobertura, compra nem classe ABC',()=>{
  const plan=planProduct(product,[],[],[],5,7,2);
  assert.equal(plan.coverage,null);assert.equal(plan.suggested,0);assert.equal(plan.hasForecast,false);
});
test('sem demanda futura evita divisão por zero e mantém compra mínima',()=>{
  const plan=planProduct({...product,stock:0},[],future.map(p=>({...p,quantity:0})),[],5,7,2);
  assert.equal(plan.coverage,null);assert.equal(plan.suggested,5);assert.equal(plan.status,'Ruptura');
});
test('API rejeita IDs duplicados, série inválida e pedido referenciando produto ausente',()=>{
  const valid={products:[product],history:[],predictions:future,orders:[]};
  assert.equal(validateSnapshot(valid),valid);
  assert.throws(()=>validateSnapshot({...valid,products:[product,product]}));
  assert.throws(()=>validateSnapshot({...valid,predictions:[{...future[0],quantity:-1}]}));
  assert.throws(()=>validateSnapshot({...valid,orders:[{id:'1',createdAt:'2026-11-07',status:'draft',items:[{productId:2,quantity:1,unitCost:2,name:'Ausente'}]}]}));
});
test('demonstração contém 50 produtos, 180 dias por produto e sete projeções sem métricas inventadas',()=>{
  const demo=createDemo();validateSnapshot(demo);
  assert.equal(demo.products.length,50);assert.equal(demo.history.length,9000);assert.equal(demo.predictions.length,350);assert.equal(demo.metrics,null);
  const classes=abcProducts(demo.products,demo.history);
  assert.ok(Math.abs(classes.reduce((n,p)=>n+p.share,0)-1)<1e-10);
});
