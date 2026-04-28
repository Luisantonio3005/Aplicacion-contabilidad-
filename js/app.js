// ========================================
// APLICACIÓN DE CONTABILIDAD
// Almacenamiento local con localStorage
// ========================================

// Datos globales
let accounts = [];
let transactions = [];

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromLocalStorage();
  setupTheme();
  setupEventListeners();
  setDefaultDate();
  renderAccounts();
  renderTransactions();
  updateFinancialStatements();
});

// ========================================
// ALMACENAMIENTO LOCAL (localStorage)
// ========================================

function saveDataToLocalStorage() {
  localStorage.setItem('accounts', JSON.stringify(accounts));
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function loadDataFromLocalStorage() {
  const savedAccounts = localStorage.getItem('accounts');
  const savedTransactions = localStorage.getItem('transactions');
  
  accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
  transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
}

// ========================================
// TEMA OSCURO/CLARO
// ========================================

function setupTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
  });
}

function updateThemeButton(theme) {
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  document.getElementById('accountForm').addEventListener('submit', handleAddAccount);
  document.getElementById('transactionForm').addEventListener('submit', handleAddTransaction);
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('transactionDate').value = today;
}

// ========================================
// CUENTAS
// ========================================

function handleAddAccount(e) {
  e.preventDefault();
  
  const name = document.getElementById('accountName').value.trim();
  const type = document.getElementById('accountType').value;
  const balance = parseFloat(document.getElementById('accountBalance').value) || 0;
  const costType = document.getElementById('accountCostType').value;
  const currency = document.getElementById('accountCurrency').value;
  
  if (!name || !type) {
    alert('Por favor completa todos los campos');
    return;
  }
  
  const account = {
    id: Date.now(),
    name,
    type,
    balance,
    costType,
    currency,
    createdAt: new Date().toISOString()
  };
  
  accounts.push(account);
  saveDataToLocalStorage();
  
  document.getElementById('accountForm').reset();
  renderAccounts();
  updateFinancialStatements();
  
  alert('✅ Cuenta agregada exitosamente');
}

function renderAccounts() {
  const tbody = document.querySelector('#accountsTable tbody');
  
  if (accounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay cuentas registradas</td></tr>';
    updateTransactionSelect();
    return;
  }
  
  tbody.innerHTML = accounts.map(account => `
    <tr>
      <td><strong>${account.name}</strong></td>
      <td>${account.type}</td>
      <td>${account.costType}</td>
      <td>${formatCurrency(account.balance, account.currency)}</td>
    </tr>
  `).join('');
  
  updateTransactionSelect();
}

function updateTransactionSelect() {
  const select = document.getElementById('transactionAccountSelect');
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Seleccione cuenta</option>' + 
    accounts.map(account => `<option value="${account.id}">${account.name}</option>`).join('');
  
  select.value = currentValue;
}

// ========================================
// TRANSACCIONES
// ========================================

function handleAddTransaction(e) {
  e.preventDefault();
  
  const date = document.getElementById('transactionDate').value;
  const description = document.getElementById('transactionDescription').value.trim();
  const accountId = parseInt(document.getElementById('transactionAccountSelect').value);
  const movement = document.getElementById('transactionMovement').value;
  const amount = parseFloat(document.getElementById('transactionAmount').value) || 0;
  
  if (!date || !description || !accountId || !movement || amount <= 0) {
    alert('Por favor completa todos los campos correctamente');
    return;
  }
  
  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    alert('Cuenta no encontrada');
    return;
  }
  
  // Actualizar saldo de la cuenta
  if (movement === 'Entrada') {
    account.balance += amount;
  } else {
    account.balance -= amount;
  }
  
  const transaction = {
    id: Date.now(),
    date,
    description,
    accountId,
    accountName: account.name,
    movement,
    amount,
    createdAt: new Date().toISOString()
  };
  
  transactions.push(transaction);
  saveDataToLocalStorage();
  
  document.getElementById('transactionForm').reset();
  setDefaultDate();
  renderAccounts();
  renderTransactions();
  updateFinancialStatements();
  
  alert('✅ Transacción registrada exitosamente');
}

function renderTransactions() {
  const tbody = document.querySelector('#transactionsTable tbody');
  
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay transacciones registradas</td></tr>';
    return;
  }
  
  tbody.innerHTML = transactions.map(transaction => `
    <tr>
      <td>${transaction.date}</td>
      <td>${transaction.description}</td>
      <td>${transaction.accountName}</td>
      <td>${transaction.movement === 'Entrada' ? '📥 Débito' : '📤 Crédito'}</td>
      <td>${formatCurrency(transaction.amount, 'MXN')}</td>
      <td>
        <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function deleteTransaction(transactionId) {
  const transaction = transactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  const account = accounts.find(a => a.id === transaction.accountId);
  if (account) {
    if (transaction.movement === 'Entrada') {
      account.balance -= transaction.amount;
    } else {
      account.balance += transaction.amount;
    }
  }
  
  transactions = transactions.filter(t => t.id !== transactionId);
  saveDataToLocalStorage();
  
  renderAccounts();
  renderTransactions();
  updateFinancialStatements();
}

// ========================================
// ESTADOS FINANCIEROS
// ========================================

function updateFinancialStatements() {
  // Calcular totales por tipo de cuenta
  const assets = accounts
    .filter(a => a.type === 'Activo')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const liabilities = accounts
    .filter(a => a.type === 'Pasivo')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const equity = accounts
    .filter(a => a.type === 'Patrimonio')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const income = accounts
    .filter(a => a.type === 'Ingreso')
    .reduce((sum, a) => sum + a.balance, 0);
  
  const expenses = accounts
    .filter(a => a.type === 'Gasto')
    .reduce((sum, a) => sum + a.balance, 0);
  
  // Calcular totales de débito y crédito
  const totalDebit = transactions
    .filter(t => t.movement === 'Entrada')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredit = transactions
    .filter(t => t.movement === 'Salida')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Actualizar DOM
  document.getElementById('assets').textContent = formatCurrency(assets, 'MXN');
  document.getElementById('liabilities').textContent = formatCurrency(liabilities, 'MXN');
  document.getElementById('equity').textContent = formatCurrency(equity, 'MXN');
  document.getElementById('income').textContent = formatCurrency(income, 'MXN');
  document.getElementById('expenses').textContent = formatCurrency(expenses, 'MXN');
  document.getElementById('netIncome').textContent = formatCurrency(income - expenses, 'MXN');
  document.getElementById('totalDebit').textContent = formatCurrency(totalDebit, 'MXN');
  document.getElementById('totalCredit').textContent = formatCurrency(totalCredit, 'MXN');
  
  const totalLiabilitiesEquity = liabilities + equity;
  document.getElementById('totalLiabilitiesEquity').textContent = formatCurrency(totalLiabilitiesEquity, 'MXN');
  
  // Renderizar cuentas T
  renderTAccounts();
}

function renderTAccounts() {
  const container = document.getElementById('accountsGrid');
  
  if (accounts.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay cuentas para mostrar</p>';
    return;
  }
  
  container.innerHTML = accounts.map(account => {
    const debits = transactions
      .filter(t => t.accountId === account.id && t.movement === 'Entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const credits = transactions
      .filter(t => t.accountId === account.id && t.movement === 'Salida')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return `
      <div class="t-account">
        <div class="t-account-title">${account.name}</div>
        <div class="t-account-body">
          <div class="t-account-left">
            <div class="t-account-header">Débito</div>
            <div class="t-account-amount">${formatCurrency(debits, account.currency)}</div>
          </div>
          <div class="t-account-right">
            <div class="t-account-header">Crédito</div>
            <div class="t-account-amount">${formatCurrency(credits, account.currency)}</div>
          </div>
        </div>
        <div class="t-account-footer">
          Saldo: ${formatCurrency(account.balance, account.currency)}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// UTILIDADES
// ========================================

function formatCurrency(value, currency = 'MXN') {
  const symbols = {
    'MXN': '$',
    'USD': '$',
    'EUR': '€'
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol} ${value.toFixed(2)}`;
}
