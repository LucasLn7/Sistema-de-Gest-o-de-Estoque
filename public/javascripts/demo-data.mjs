import { abcProducts } from './domain.mjs';
const seed = [
  {
    "id": 1,
    "name": "Folha de S.Paulo",
    "category": "Publicações",
    "supplier": "Distribuidora 01",
    "barcode": "7891000000001",
    "cost": 3,
    "price": 6,
    "minimum": 5,
    "stock": 48
  },
  {
    "id": 2,
    "name": "O Globo",
    "category": "Publicações",
    "supplier": "Distribuidora 02",
    "barcode": "7891000000002",
    "cost": 2.5,
    "price": 5,
    "minimum": 5,
    "stock": 29
  },
  {
    "id": 3,
    "name": "Revista Veja",
    "category": "Publicações",
    "supplier": "Distribuidora 03",
    "barcode": "7891000000003",
    "cost": 10,
    "price": 19.9,
    "minimum": 3,
    "stock": 19
  },
  {
    "id": 4,
    "name": "Batman Mensal",
    "category": "Publicações",
    "supplier": "Distribuidora 04",
    "barcode": "7891000000004",
    "cost": 15,
    "price": 24.9,
    "minimum": 2,
    "stock": 14
  },
  {
    "id": 5,
    "name": "One Piece Vol. 100",
    "category": "Publicações",
    "supplier": "Distribuidora 05",
    "barcode": "7891000000005",
    "cost": 18,
    "price": 33.9,
    "minimum": 2,
    "stock": 9
  },
  {
    "id": 6,
    "name": "Álbum Copa do Mundo",
    "category": "Publicações",
    "supplier": "Distribuidora 06",
    "barcode": "7891000000006",
    "cost": 5,
    "price": 12,
    "minimum": 10,
    "stock": 39
  },
  {
    "id": 7,
    "name": "Envelope Figurinhas",
    "category": "Publicações",
    "supplier": "Distribuidora 07",
    "barcode": "7891000000007",
    "cost": 2,
    "price": 4,
    "minimum": 50,
    "stock": 490
  },
  {
    "id": 8,
    "name": "Turma da Mônica",
    "category": "Publicações",
    "supplier": "Distribuidora 08",
    "barcode": "7891000000008",
    "cost": 3.5,
    "price": 7.9,
    "minimum": 10,
    "stock": 28
  },
  {
    "id": 9,
    "name": "Revista Vogue",
    "category": "Publicações",
    "supplier": "Distribuidora 10",
    "barcode": "7891000000009",
    "cost": 15,
    "price": 29.9,
    "minimum": 2,
    "stock": 9
  },
  {
    "id": 10,
    "name": "Quatro Rodas",
    "category": "Publicações",
    "supplier": "Distribuidora 11",
    "barcode": "7891000000010",
    "cost": 12,
    "price": 22,
    "minimum": 3,
    "stock": 14
  },
  {
    "id": 11,
    "name": "Casa e Jardim",
    "category": "Publicações",
    "supplier": "Distribuidora 12",
    "barcode": "7891000000011",
    "cost": 11,
    "price": 21.9,
    "minimum": 2,
    "stock": 11
  },
  {
    "id": 12,
    "name": "Receitas de Vó",
    "category": "Publicações",
    "supplier": "Distribuidora 13",
    "barcode": "7891000000012",
    "cost": 5,
    "price": 9.9,
    "minimum": 3,
    "stock": 19
  },
  {
    "id": 13,
    "name": "Saúde Hoje",
    "category": "Publicações",
    "supplier": "Distribuidora 14",
    "barcode": "7891000000013",
    "cost": 8,
    "price": 15.9,
    "minimum": 2,
    "stock": 14
  },
  {
    "id": 14,
    "name": "InfoExame",
    "category": "Publicações",
    "supplier": "Distribuidora 15",
    "barcode": "7891000000014",
    "cost": 9,
    "price": 18.5,
    "minimum": 2,
    "stock": 9
  },
  {
    "id": 15,
    "name": "Superinteressante",
    "category": "Publicações",
    "supplier": "Distribuidora 16",
    "barcode": "7891000000015",
    "cost": 11.5,
    "price": 22.9,
    "minimum": 5,
    "stock": 23
  },
  {
    "id": 16,
    "name": "Coquetel Médio",
    "category": "Publicações",
    "supplier": "Distribuidora 17",
    "barcode": "7891000000016",
    "cost": 3,
    "price": 6.9,
    "minimum": 10,
    "stock": 37
  },
  {
    "id": 17,
    "name": "Sudoku Fácil",
    "category": "Publicações",
    "supplier": "Distribuidora 18",
    "barcode": "7891000000017",
    "cost": 2.5,
    "price": 5,
    "minimum": 10,
    "stock": 28
  },
  {
    "id": 18,
    "name": "Caça Palavras",
    "category": "Publicações",
    "supplier": "Distribuidora 20",
    "barcode": "7891000000018",
    "cost": 2.5,
    "price": 5.5,
    "minimum": 10,
    "stock": 34
  },
  {
    "id": 19,
    "name": "O Pequeno Príncipe",
    "category": "Publicações",
    "supplier": "Distribuidora 21",
    "barcode": "7891000000019",
    "cost": 8,
    "price": 19.9,
    "minimum": 2,
    "stock": 9
  },
  {
    "id": 20,
    "name": "Guia de Ruas SP",
    "category": "Publicações",
    "supplier": "Distribuidora 22",
    "barcode": "7891000000020",
    "cost": 15,
    "price": 35,
    "minimum": 1,
    "stock": 4
  },
  {
    "id": 21,
    "name": "Halls Preto",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 23",
    "barcode": "7891000000021",
    "cost": 1.2,
    "price": 2.5,
    "minimum": 20,
    "stock": 96
  },
  {
    "id": 22,
    "name": "Trident Menta",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 24",
    "barcode": "7891000000022",
    "cost": 1.5,
    "price": 3,
    "minimum": 20,
    "stock": 118
  },
  {
    "id": 23,
    "name": "Snickers",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 25",
    "barcode": "7891000000023",
    "cost": 2,
    "price": 4.5,
    "minimum": 15,
    "stock": 57
  },
  {
    "id": 24,
    "name": "Ruffles 50g",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 26",
    "barcode": "7891000000024",
    "cost": 3.5,
    "price": 7,
    "minimum": 10,
    "stock": 38
  },
  {
    "id": 25,
    "name": "Club Social",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 27",
    "barcode": "7891000000025",
    "cost": 1.5,
    "price": 3,
    "minimum": 15,
    "stock": 75
  },
  {
    "id": 26,
    "name": "Coca-Cola 350ml",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 28",
    "barcode": "7891000000026",
    "cost": 2.8,
    "price": 5.5,
    "minimum": 24,
    "stock": 118
  },
  {
    "id": 27,
    "name": "Guaraná 600ml",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 30",
    "barcode": "7891000000027",
    "cost": 3.5,
    "price": 7,
    "minimum": 12,
    "stock": 59
  },
  {
    "id": 28,
    "name": "Água Mineral",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 31",
    "barcode": "7891000000028",
    "cost": 1.5,
    "price": 3,
    "minimum": 24,
    "stock": 117
  },
  {
    "id": 29,
    "name": "Suco Del Valle",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 32",
    "barcode": "7891000000029",
    "cost": 1.8,
    "price": 3.5,
    "minimum": 15,
    "stock": 48
  },
  {
    "id": 30,
    "name": "Gatorade Limão",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 33",
    "barcode": "7891000000030",
    "cost": 3.8,
    "price": 7.5,
    "minimum": 10,
    "stock": 38
  },
  {
    "id": 31,
    "name": "Heineken 350ml",
    "category": "Alimentos e bebidas",
    "supplier": "Distribuidora 34",
    "barcode": "7891000000031",
    "cost": 4,
    "price": 7,
    "minimum": 24,
    "stock": 114
  },
  {
    "id": 32,
    "name": "Marlboro Red",
    "category": "Tabacaria",
    "supplier": "Distribuidora 35",
    "barcode": "7891000000032",
    "cost": 8.5,
    "price": 11.5,
    "minimum": 20,
    "stock": 49
  },
  {
    "id": 33,
    "name": "Camel Blue",
    "category": "Tabacaria",
    "supplier": "Distribuidora 36",
    "barcode": "7891000000033",
    "cost": 8,
    "price": 10.75,
    "minimum": 20,
    "stock": 48
  },
  {
    "id": 34,
    "name": "Isqueiro Bic",
    "category": "Tabacaria",
    "supplier": "Distribuidora 37",
    "barcode": "7891000000034",
    "cost": 4,
    "price": 8,
    "minimum": 12,
    "stock": 29
  },
  {
    "id": 35,
    "name": "Seda Bem Bolado",
    "category": "Tabacaria",
    "supplier": "Distribuidora 38",
    "barcode": "7891000000035",
    "cost": 3,
    "price": 6,
    "minimum": 10,
    "stock": 37
  },
  {
    "id": 36,
    "name": "Caneta Bic Azul",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 40",
    "barcode": "7891000000036",
    "cost": 1,
    "price": 2.5,
    "minimum": 30,
    "stock": 95
  },
  {
    "id": 37,
    "name": "Lápis nº 2",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 41",
    "barcode": "7891000000037",
    "cost": 0.8,
    "price": 2,
    "minimum": 30,
    "stock": 95
  },
  {
    "id": 38,
    "name": "Caderneta",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 42",
    "barcode": "7891000000038",
    "cost": 4,
    "price": 8.5,
    "minimum": 5,
    "stock": 19
  },
  {
    "id": 39,
    "name": "Pilha AA",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 43",
    "barcode": "7891000000039",
    "cost": 6,
    "price": 14,
    "minimum": 10,
    "stock": 28
  },
  {
    "id": 40,
    "name": "Pilha AAA",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 44",
    "barcode": "7891000000040",
    "cost": 8,
    "price": 16,
    "minimum": 5,
    "stock": 24
  },
  {
    "id": 41,
    "name": "Bateria CR2032",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 45",
    "barcode": "7891000000041",
    "cost": 3,
    "price": 10,
    "minimum": 10,
    "stock": 38
  },
  {
    "id": 42,
    "name": "Cartão Vivo",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 46",
    "barcode": "7891000000042",
    "cost": 5,
    "price": 5,
    "minimum": 5,
    "stock": 19
  },
  {
    "id": 43,
    "name": "Recarga Tim",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 47",
    "barcode": "7891000000043",
    "cost": 20,
    "price": 20,
    "minimum": 10,
    "stock": 49
  },
  {
    "id": 44,
    "name": "Adesivo",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 48",
    "barcode": "7891000000044",
    "cost": 2,
    "price": 5,
    "minimum": 10,
    "stock": 28
  },
  {
    "id": 45,
    "name": "Chaveiro",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 50",
    "barcode": "7891000000045",
    "cost": 3.5,
    "price": 10,
    "minimum": 5,
    "stock": 14
  },
  {
    "id": 46,
    "name": "Hot Wheels",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 01",
    "barcode": "7891000000046",
    "cost": 9,
    "price": 19.9,
    "minimum": 5,
    "stock": 19
  },
  {
    "id": 47,
    "name": "Capa de Chuva",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 02",
    "barcode": "7891000000047",
    "cost": 6,
    "price": 15,
    "minimum": 5,
    "stock": 9
  },
  {
    "id": 48,
    "name": "Guarda-chuva",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 03",
    "barcode": "7891000000048",
    "cost": 15,
    "price": 35,
    "minimum": 3,
    "stock": 9
  },
  {
    "id": 49,
    "name": "Envelope A4",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 04",
    "barcode": "7891000000049",
    "cost": 0.5,
    "price": 1.5,
    "minimum": 50,
    "stock": 190
  },
  {
    "id": 50,
    "name": "Máscara Cirúrgica",
    "category": "Papelaria e variedades",
    "supplier": "Distribuidora 05",
    "barcode": "7891000000050",
    "cost": 1.5,
    "price": 4,
    "minimum": 20,
    "stock": 48
  }
];
export function createDemo() {
 const referenceDate = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const today = new Date(referenceDate+'T12:00:00Z');
 const dateAt = n => {const d = new Date(today); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10);};
 const products = structuredClone(seed);
 const history = [], predictions = [];
 for (const p of products) {
   const base = Math.max(1,Math.round(p.minimum/4));
   for (let day=-180;day<0;day++) {
     const date = dateAt(day), weekday = new Date(date+'T12:00:00Z').getUTCDay();
     const quantity = Math.max(0,base+([5,6].includes(weekday)?Math.ceil(Math.max(1,p.minimum/4)*.5):0)+((p.id*31+(-day)*17)%3)-1);
     history.push({productId:p.id,date,quantity,price:p.price});
   }
   // A projeção demonstrativa usa média histórica; não representa a saída do modelo Python.
   const recent = history.filter(h=>h.productId===p.id).slice(-28);
   const average = recent.reduce((n,h)=>n+h.quantity,0)/recent.length;
   for(let day=0;day<7;day++) predictions.push({productId:p.id,date:dateAt(day),quantity:Math.round(average*100)/100});
 }
 return {referenceDate,generatedAt:new Date().toISOString(),products,history,predictions,orders:[],metrics:null,forecastMethod:'Média de 28 dias · demonstração'};
}
