# StockOS — Front-end v2

Interface original do StockOS restaurada: tema escuro, destaques verde-lima e roxo, menu lateral, tabela com barras de quantidade e filtros à direita. A tela inicial volta a ser Estoque; as funções novas continuam no menu Inteligência. Mantém HTML, CSS e JavaScript sem framework ou dependências de execução externas. As fontes web são opcionais: há fallback para fontes do sistema.

## Abrir a aplicação

Requer Node.js 20 ou superior. Na pasta deste projeto:

```powershell
npm start
```

Abra http://localhost:3000. Não é necessário executar npm install. Para desenvolvimento, npm run dev reinicia o servidor quando seu código muda; recarregue a página após editar os arquivos. Abrir index.html diretamente por file:// não é suportado por causa dos módulos JavaScript.

## O que está disponível

- Visão geral com saldo, valor a custo, demanda e alertas.
- Estoque com busca, filtros independentes de categoria e ABC, cadastro, edição e detalhes.
- Categoria Brinquedos nos produtos e filtros, com Hot Wheels reclassificado.
- Fornecedores com nome, telefone e segmento, busca, cadastro, edição e vínculo por ID aos produtos.
- Previsão consolidada ou por produto para sete dias, gráfico e saldo diário projetado.
- Curva ABC com participação no faturamento e ranking de produtos.
- Reposição com simulação de prazo e reserva, seleção de produtos e custo estimado.
- Pedidos com rascunho, confirmação, cancelamento e recebimento integral na demonstração.
- Vendas com faturamento e volume dos últimos 30 dias disponíveis.
- Exportação CSV nas telas de dados; tema claro/escuro, menu móvel e navegação por teclado.

## Limites desta entrega

A interface inicia em modo de demonstração claramente identificado. Catálogo e saldo inicial vêm do SQL enviado; histórico e projeções são sintéticos. O modelo Python não foi executado e a página não apresenta métricas fictícias de precisão.

Alterações da prévia ficam neste navegador até a restauração explícita da demonstração ou limpeza do armazenamento. Em Pedidos, Restaurar demonstração limpa os pedidos e restaura o catálogo inicial. Não existe gravação em MySQL, envio a fornecedores ou execução PHP neste servidor.

A leitura de uma API futura está preparada e documentada em INTEGRACAO.md. O modo API é somente consulta nesta etapa. O ZIP original foi preservado fora desta entrega; arquivos legados dentro do projeto continuam disponíveis, mas a nova página carrega apenas os módulos novos.

## Verificação

```powershell
npm test
```

Dez testes verificam ABC, planejamento, entradas pendentes, ausência de previsões, validação de dados e integridade da demonstração, migração e validação de fornecedores. O fluxo de pedidos e a edição com filtro foram verificados na interface do navegador.
