# Integração do front-end StockOS

O front-end de apresentação utiliza dados demonstrativos. O servidor Node serve arquivos estáticos; não executa PHP, consultas SQL ou treinamento Python.

## Fonte dos dados

`public/config.js` inicia com `mode: 'demo'`. O catálogo contém 50 produtos da base de referência, com saldo inicial igual a lotes menos vendas daquele arquivo. O histórico sintético tem 180 dias por produto, gerado em JavaScript com a regra da simulação SQL. As 350 projeções ilustrativas são médias dos últimos 28 dias, não saídas do modelo Python. Métricas de avaliação ficam ausentes.

No modo de demonstração, edições e pedidos ficam no localStorage deste navegador. Os dados locais são preservados ao mudar o dia, inclusive fornecedores, produtos editados e pedidos. As datas do histórico permanecem as do cenário salvo; a restauração explícita gera um cenário novo. A tela Pedidos contém uma ação explícita para restaurar o estado inicial. Preferência de tema é armazenada separadamente.

## Ativar leitura da API

Depois de implementar o endpoint, alterar `public/config.js`:

```js
window.STOCKOS_CONFIG = {
  mode: 'api',
  snapshotUrl: '/api/painel.php'
};
```

Servir `public/` e `/api/` pela mesma origem, usando servidor com PHP ou proxy apropriado. O servidor Node desta entrega não atende ao endpoint. Caso a API falhe, a interface exibe erro e permite nova tentativa; não substitui dados reais por demonstração silenciosamente. As operações de escrita ficam desabilitadas em modo API até sua implementação.

`GET /api/painel.php` deve retornar JSON com números como números, IDs inteiros estáveis, datas diárias no formato YYYY-MM-DD e timestamps ISO 8601:

```json
{
  "referenceDate": "2026-11-07",
  "generatedAt": "2026-11-07T12:00:00Z",
  "forecastMethod": "HistGradientBoostingRegressor",
  "products": [
    {"id": 1, "name": "Produto exemplo", "category": "Publicações", "supplier": "Fornecedor", "barcode": "7890000000001", "cost": 3, "price": 6, "minimum": 5, "stock": 48}
  ],
  "history": [
    {"productId": 1, "date": "2026-11-06", "quantity": 2, "price": 6}
  ],
  "predictions": [
    {"productId": 1, "date": "2026-11-07", "quantity": 2.5}
  ],
  "orders": [],
  "metrics": null
}
```

O exemplo mostra uma linha por série apenas para explicar o formato. Enviar até 180 dias de histórico diário contínuo por produto, incluindo dias sem vendas com quantidade zero, e até sete datas futuras, sem duplicatas de produto/data. Todas as previsões devem ser posteriores ao histórico. Não misturar lotes de previsões antigos e novos. Stock deve ser saldo não negativo e considerar a mesma operação que fornece o histórico.

Mapeamento previsto:

| Campo | Fonte futura |
| --- | --- |
| products | PRODUTOS + CATEGORIAS + FORNECEDORES + saldo validado |
| history | VENDAS_HISTORICO ou agregação diária de VENDAS |
| predictions | PREVISAO_DEMANDA, gerada pelo Python |
| orders | Novas tabelas de pedidos e itens, ainda não existentes no SQL enviado |
| metrics | Resultado persistido da avaliação Python, ainda não exposto pelo script |

A classe ABC é calculada nesta prévia pelo faturamento bruto do histórico disponibilizado (quantidade × preço). Para produção, unificar com `vw_curva_abc`, inclusive tratamento de descontos, período e limites. A categoria é independente da classe ABC. Produtos sem vendas ficam sem classificação.

Métricas opcionais:

```json
{
  "modelMae": 1.23,
  "baselineMae": 1.80,
  "modelRmse": 1.65,
  "baselineRmse": 2.10,
  "testPeriod": "Últimos 30 dias disponíveis"
}
```

Preencher `metrics` somente com resultados efetivamente obtidos. A interface não gera métricas de precisão.

Pedidos:

```json
{
  "id": "PED-001",
  "createdAt": "2026-11-07T12:00:00Z",
  "status": "draft",
  "items": [
    {"productId": 1, "name": "Produto exemplo", "quantity": 10, "unitCost": 3}
  ]
}
```

Estados: `draft`, `pending`, `received`, `cancelled`. Somente `pending` conta como entrada em aberto. Na prévia, recebimento é integral e soma as quantidades ao saldo local uma única vez; pedidos nunca são enviados a fornecedores. Produção precisa de autorização no servidor, transações, auditoria, concorrência e recebimento parcial antes de habilitar essas ações.

## Regras visíveis de reposição

- Horizonte disponível: sete dias; média diária calculada sobre as previsões recebidas.
- Compra sugerida = máximo de zero e [máximo entre mínimo do produto e teto da média × (prazo + 7 + reserva)] − estoque − pedidos abertos.
- Prazo inicial: cinco dias; reserva inicial: dois dias. Ambos ajustáveis de 0 a 90.
- Reserva em dias é uma simplificação da interface e difere do estoque de segurança estatístico da view SQL. Validar a política definitiva antes da integração.
- Cobertura = estoque ÷ média prevista; sem previsão ou média zero, não exibir cobertura numérica.
- Situação: Ruptura para saldo zero, Crítico para cobertura menor que prazo, Abaixo do mínimo para saldo menor que mínimo, Atenção para cobertura menor que sete dias, Regular nos demais casos.
- Pedidos abertos não aumentam cobertura nem reduzem os alertas de ruptura, porque ainda não possuem data de chegada confirmada.
- Produtos sem previsões não recebem sugestão automática.
- Ordenação de prioridade: classe ABC e depois cobertura. Os cenários não representam ordens automáticas de compra.

## Arquivos ativos

- `public/index.html`: estrutura e navegação.
- `public/styles/app.css`: estilos estruturais e layout responsivo.
- `public/styles/original.css`: identidade visual da primeira versão, tema escuro inicial e organização original do estoque.
- `public/javascripts/app.mjs`: telas e interações.
- `public/javascripts/domain.mjs`: cálculos e validação do contrato.
- `public/javascripts/data-service.mjs`: carregamento e persistência da demonstração.
- `public/javascripts/demo-data.mjs`: catálogo e geração dos dados sintéticos.

Os arquivos CSS e JavaScript antigos do ZIP permanecem preservados, mas não são carregados pela nova página.

## Fornecedores e Brinquedos

O snapshot aceita a coleção `suppliers`, com `{id, name, phone, segment}` e `products[].supplierId` referenciando o cadastro. `products[].supplier` continua sendo o nome exibido por compatibilidade. Nome e segmento são textos; telefone é texto, preservando DDD e formatação. Os novos cadastros exigem todos os campos, telefone com 10 a 15 dígitos e nome único sem diferenciar caixa ou acentos.

Bases antigas que têm somente o nome do fornecedor são migradas mantendo esse nome e seus vínculos. Telefones ausentes ficam vazios, exibidos como Não informado; o segmento inicial é sugerido pelas categorias já associadas. Esses cadastros ficam sinalizados para completar. A criação de fornecedor dentro do formulário de produto preserva os dados do formulário. Renomear um fornecedor mantém os vínculos por ID.

`Brinquedos` integra a lista de categorias mesmo sem produtos. Na migração inicial, somente o produto Hot Wheels da categoria Papelaria e variedades é reclassificado. A migração não é repetida sobre edições posteriores do usuário.

O SQL original não possui os campos de nome e segmento de fornecedor solicitados. A implementação futura no MySQL deve acrescentá-los e manter os IDs do banco, além de inserir a categoria Brinquedos e atualizar o produto correspondente. Esta entrega permanece no front-end; nenhum SQL foi executado.

### E-mail de fornecedores

`suppliers[].email` é texto opcional (até 254 caracteres). Cadastros antigos recebem string vazia sem apagar os demais campos. Quando informado, o e-mail é validado, persistido, pesquisável e exibido como link mailto na listagem. O MySQL original já possui FORNECEDORES.email; mapear esse campo ao contrato na integração futura.
