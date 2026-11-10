/* Testes de regressão deste módulo. Os cenários descrevem os contratos esperados; mudanças de regra precisam atualizar também os resultados verificados. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { itemPricing, purchasePricing } from '../public/javascripts/checkout-pricing.mjs';
test('desconto de 15 reais em produto de 70 resulta em 55',()=>assert.deepEqual(itemPricing({price:70,quantity:1,discountType:'amount',discountValue:15}),{gross:7000,discount:1500,net:5500}));
test('percentual incide no total das unidades e arredonda em centavos',()=>{
  assert.deepEqual(itemPricing({price:70,quantity:2,discountType:'percent',discountValue:10}),{gross:14000,discount:1400,net:12600});
  assert.equal(itemPricing({price:19.9,quantity:1,discountType:'percent',discountValue:15}).discount,299);
});
test('valor em reais é o desconto total da linha, não por unidade',()=>assert.equal(itemPricing({price:70,quantity:2,discountType:'amount',discountValue:15}).net,12500));
test('descontos inválidos são rejeitados e 100 por cento é permitido',()=>{
  for(const [discountType,discountValue] of [['amount',71],['percent',101],['amount',-1],['percent',0.001],['amount',NaN]])assert.throws(()=>itemPricing({price:70,quantity:1,discountType,discountValue}));
  assert.equal(itemPricing({price:70,quantity:1,discountType:'percent',discountValue:100}).net,0);
});
test('desconto geral em reais incide após os descontos dos produtos',()=>{
  const items=[{price:70,quantity:1,discountType:'amount',discountValue:15},{price:30,quantity:1}];
  assert.deepEqual(purchasePricing(items,'amount',20),{subtotal:8500,discount:2000,total:6500});
  assert.deepEqual(purchasePricing(items,'percent',10),{subtotal:8500,discount:850,total:7650});
});
test('desconto geral respeita total zero e rejeita valores excessivos',()=>{
  assert.deepEqual(purchasePricing([{price:70,quantity:1}],'percent',100),{subtotal:7000,discount:7000,total:0});
  assert.throws(()=>purchasePricing([{price:70,quantity:1}],'amount',71));
  assert.throws(()=>purchasePricing([],'amount',1));
  assert.deepEqual(purchasePricing([],'percent',100),{subtotal:0,discount:0,total:0});
});
