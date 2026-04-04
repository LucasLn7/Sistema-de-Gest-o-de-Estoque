// ---- DATA ----
let estoque = [
  { cod: 'EL-001', nome: 'Smart TV 55"',       qty: 12,  classe: 'Eletrônicos', fornecedor: 'Samsung'   },
  { cod: 'EL-002', nome: 'Geladeira Frost Free', qty: 5,  classe: 'Eletrônicos', fornecedor: 'Electrolux' },
  { cod: 'AL-001', nome: 'Café Torrado 500g',   qty: 0,   classe: 'Alimentos',   fornecedor: 'Pilão'     },
  { cod: 'AL-002', nome: 'Arroz Tipo 1 5kg',    qty: 47,  classe: 'Alimentos',   fornecedor: 'Tio João'  },
  { cod: 'IN-001', nome: 'Notebook i5 16GB',    qty: 3,   classe: 'Informática', fornecedor: 'Dell'      },
  { cod: 'IN-002', nome: 'Mouse Sem Fio',        qty: 88,  classe: 'Informática', fornecedor: 'Logitech'  },
  { cod: 'LM-001', nome: 'Detergente 500ml',    qty: 124, classe: 'Limpeza',     fornecedor: 'Ypê'       },
  { cod: 'LM-002', nome: 'Desinfetante 1L',     qty: 9,   classe: 'Limpeza',     fornecedor: 'Pinho Sol' },
];

let pedidos = [
  { id: 'PED-001', titulo: 'Reposição Café',    items: 3, data: '22/03/2026', valor: 'R$ 420,00',    status: 'pending'   },
  { id: 'PED-002', titulo: 'Notebooks Dell',    items: 2, data: '18/03/2026', valor: 'R$ 8.900,00',  status: 'confirmed' },
  { id: 'PED-003', titulo: 'Estoque Limpeza',   items: 8, data: '15/03/2026', valor: 'R$ 1.230,00',  status: 'confirmed' },
  { id: 'PED-004', titulo: 'Eletrônicos Mix',   items: 5, data: '10/03/2026', valor: 'R$ 12.500,00', status: 'cancelled' },
];

let activeFilters = { fornecedor: null, classe: null };
let sortAsc = true;

const classeMap = {
  'Eletrônicos': 'badge-eletro',
  'Alimentos':   'badge-alim',
  'Informática': 'badge-info',
  'Limpeza':     'badge-limpeza',
};

const statusMap = {
  pending:   { label: 'Pendente',   cls: 'pill-pend' },
  confirmed: { label: 'Confirmado', cls: 'pill-conf' },
  cancelled: { label: 'Cancelado',  cls: 'pill-canc' },
};

// ---- RENDER TABLE ----
function renderTable() {
  const search = document.getElementById('search').value.toLowerCase();
  const minQty = parseInt(document.getElementById('qty-filter').value);

  let data = estoque.filter(item => {
    const matchSearch = !search ||
      item.nome.toLowerCase().includes(search) ||
      item.cod.toLowerCase().includes(search) ||
      item.fornecedor.toLowerCase().includes(search);
    const matchFornecedor = !activeFilters.fornecedor || item.fornecedor === activeFilters.fornecedor;
    const matchClasse     = !activeFilters.classe     || item.classe     === activeFilters.classe;
    const matchQty        = item.qty >= minQty;
    return matchSearch && matchFornecedor && matchClasse && matchQty;
  });

  if (sortAsc) data.sort((a, b) => a.nome.localeCompare(b.nome));
  else         data.sort((a, b) => b.qty - a.qty);

  const maxQty = Math.max(...estoque.map(i => i.qty), 1);

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = data.map((item, idx) => {
    const pct       = Math.round((item.qty / maxQty) * 100);
    const fillClass = item.qty === 0 ? 'danger' : item.qty < 10 ? 'warn' : '';
    return `
      <tr>
        <td><span class="cod-tag">${item.cod}</span></td>
        <td style="font-weight:500">${item.nome}</td>
        <td>
          <div class="qty-bar">
            <span style="font-family:'Space Mono',monospace;font-size:12px;min-width:28px">${item.qty}</span>
            <div class="qty-track"><div class="qty-fill ${fillClass}" style="width:${pct}%"></div></div>
          </div>
        </td>
        <td><span class="classe-badge ${classeMap[item.classe] || ''}">${item.classe}</span></td>
        <td style="color:var(--text2)">${item.fornecedor}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn"     title="Editar"  onclick="editItem(${idx})">✏️</button>
            <button class="icon-btn del" title="Remover" onclick="removeItem(${idx})">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  updateStats();
  renderMiniChart();
  updateFilters();
}

function updateStats() {
  document.getElementById('total-itens').textContent        = estoque.length;
  document.getElementById('total-em-estoque').textContent   = estoque.filter(i => i.qty >= 10).length;
  document.getElementById('total-baixo').textContent        = estoque.filter(i => i.qty > 0 && i.qty < 10).length;
  document.getElementById('total-zerado').textContent       = estoque.filter(i => i.qty === 0).length;
}

function updateFilters() {
  // Fornecedores
  const fornecedores = [...new Set(estoque.map(i => i.fornecedor))];
  document.getElementById('filter-fornecedores').innerHTML = fornecedores.map(f =>
    `<span class="filter-chip ${activeFilters.fornecedor === f ? 'active' : ''}"
           onclick="toggleFilter('fornecedor','${f}')">${f}</span>`
  ).join('');

  // Classes
  const classes = [...new Set(estoque.map(i => i.classe))];
  document.getElementById('filter-classes').innerHTML = classes.map(c =>
    `<span class="filter-chip ${activeFilters.classe === c ? 'active' : ''}"
           onclick="toggleFilter('classe','${c}')">${c}</span>`
  ).join('');
}

function renderMiniChart() {
  const classes  = [...new Set(estoque.map(i => i.classe))];
  const maxCount = Math.max(...classes.map(c => estoque.filter(i => i.classe === c).length), 1);
  document.getElementById('mini-chart').innerHTML = classes.map(c => {
    const count = estoque.filter(i => i.classe === c).length;
    const pct   = Math.round((count / maxCount) * 100);
    return `<div class="chart-row">
      <span>${c.substring(0, 7)}</span>
      <div class="chart-bar-wrap"><div class="chart-bar" style="width:${pct}%"></div></div>
      <span class="count">${count}</span>
    </div>`;
  }).join('');
}

function toggleFilter(type, val) {
  activeFilters[type] = activeFilters[type] === val ? null : val;
  renderTable();
}

function filterClasse(classe) {
  activeFilters.classe = classe;
  renderTable();
}

function toggleSort() {
  sortAsc = !sortAsc;
  renderTable();
}

function updateQtyLabel() {
  document.getElementById('qty-label').textContent = document.getElementById('qty-filter').value;
}

// ---- PEDIDOS ----
function renderPedidos() {
  document.getElementById('badge-pedidos').textContent = pedidos.filter(p => p.status === 'pending').length;
  document.getElementById('pedidos-list').innerHTML = pedidos.map(p => {
    const s = statusMap[p.status];
    return `<div class="pedido-card">
      <div class="pedido-icon">🛒</div>
      <div class="pedido-info">
        <strong>${p.titulo}</strong>
        <small>${p.id} · ${p.items} itens · ${p.data}</small>
      </div>
      <div class="pedido-meta">
        <div class="valor">${p.valor}</div>
        <span class="status-pill ${s.cls}">${s.label}</span>
      </div>
    </div>`;
  }).join('');
}

// ---- VENDAS ----
function renderVendas() {
  const meses = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'];
  const vals  = [32, 41, 55, 38, 44, 48];
  const maxV  = Math.max(...vals);

  document.getElementById('bar-chart').innerHTML = meses.map((m, i) => {
    const h      = Math.round((vals[i] / maxV) * 120);
    const isLast = i === meses.length - 1;
    return `<div class="bar-col">
      <div class="bar-body${isLast ? ' accent' : ''}" style="height:${h}px"></div>
      <span class="bar-lbl">${m}</span>
    </div>`;
  }).join('');

  const tops = [
    { nome: 'Smart TV 55"',    pct: 82 },
    { nome: 'Notebook i5',     pct: 67 },
    { nome: 'Mouse Logitech',  pct: 54 },
    { nome: 'Arroz 5kg',       pct: 41 },
    { nome: 'Café Pilão',      pct: 28 },
  ];
  document.getElementById('top-produtos').innerHTML = tops.map(t => `
    <div class="chart-row" style="margin-bottom:10px">
      <span style="width:120px;color:var(--text);text-align:left">${t.nome}</span>
      <div class="chart-bar-wrap"><div class="chart-bar" style="width:${t.pct}%;background:var(--accent)"></div></div>
      <span class="count" style="width:36px">${t.pct}%</span>
    </div>`).join('');
}

// ---- TABS ----
function showTab(name, el) {
  document.querySelectorAll('.tab-page').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('page-title').textContent = name.toUpperCase();
  if (name === 'pedidos') renderPedidos();
  if (name === 'vendas')  renderVendas();
}

// ---- MODAL ----
function openModal() {
  document.getElementById('modal').classList.add('open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  ['m-cod', 'm-nome', 'm-qty', 'm-fornecedor'].forEach(id => {
    document.getElementById(id).value = '';
  });
}
function addItem() {
  const cod        = document.getElementById('m-cod').value.trim();
  const nome       = document.getElementById('m-nome').value.trim();
  const qty        = parseInt(document.getElementById('m-qty').value) || 0;
  const classe     = document.getElementById('m-classe').value;
  const fornecedor = document.getElementById('m-fornecedor').value.trim();

  if (!cod || !nome || !fornecedor) {
    alert('Preencha os campos obrigatórios.');
    return;
  }
  estoque.push({ cod, nome, qty, classe, fornecedor });
  renderTable();
  closeModal();
}
function removeItem(idx) {
  if (confirm('Remover este item?')) {
    estoque.splice(idx, 1);
    renderTable();
  }
}
function editItem(idx) {
  const item = estoque[idx];
  document.getElementById('m-cod').value        = item.cod;
  document.getElementById('m-nome').value       = item.nome;
  document.getElementById('m-qty').value        = item.qty;
  document.getElementById('m-classe').value     = item.classe;
  document.getElementById('m-fornecedor').value = item.fornecedor;
  openModal();
}

// ---- INICIAR PEDIDO ----
function iniciarPedido() {
  const falta = estoque.filter(i => i.qty < 10);
  if (falta.length === 0) {
    alert('Nenhum item com estoque baixo!');
    return;
  }
  const nomes = falta.map(i => `• ${i.nome} (${i.qty} un.)`).join('\n');
  if (confirm(`Iniciar pedido para os seguintes itens com estoque baixo?\n\n${nomes}`)) {
    pedidos.unshift({
      id:     'PED-' + String(pedidos.length + 1).padStart(3, '0'),
      titulo: 'Reposição Automática',
      items:  falta.length,
      data:   new Date().toLocaleDateString('pt-BR'),
      valor:  'Calculando...',
      status: 'pending',
    });
    showTab('pedidos', null);
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-item')[1].classList.add('active');
  }
}

// ---- INIT ----
document.getElementById('modal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
renderTable();
