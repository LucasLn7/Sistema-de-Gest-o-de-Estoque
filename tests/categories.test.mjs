import {test} from 'node:test';
import assert from 'node:assert/strict';
import {categoryChoices,categoryName,matchesCategories,categoryFilterLinks} from '../public/javascripts/categories.mjs';
test('lista inclui categoria cadastrada sem produto e mantém categorias antigas',()=>{
 const names=categoryChoices({categories:[{id:1,name:'Limpeza'}],products:[{category:'Legada'}]},['Brinquedos']);
 assert.deepEqual(names,['Brinquedos','Legada','Limpeza']);
});
test('nome normaliza espaços e recusa valores sem significado',()=>{
 assert.equal(categoryName('  Higiene   pessoal '),'Higiene pessoal');
 for(const value of ['',null,'null','undefined','123', 'x'.repeat(81)])assert.throws(()=>categoryName(value));
});
test('filtro aceita várias categorias e volta a todas com seleção vazia',()=>{
 assert.equal(matchesCategories('Brinquedos',['Brinquedos','Tabacaria']),true);
 assert.equal(matchesCategories('Tabacaria',['Brinquedos','Tabacaria']),true);
 assert.equal(matchesCategories('Publicações',['Brinquedos','Tabacaria']),false);
 assert.equal(matchesCategories('Publicações',[]),true);
 assert.equal((categoryFilterLinks(['Brinquedos','Tabacaria'],['Brinquedos','Tabacaria']).match(/aria-pressed="true"/g)||[]).length,2);
 assert.ok(!categoryFilterLinks(['Brinquedos'],[]).includes('checkbox'));
 assert.ok(categoryFilterLinks(['<categoria>'],[]).includes('&lt;categoria&gt;'));
});
