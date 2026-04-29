// ========================================
// APLICACIÓN DE CONTABILIDAD CON SQLite
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  const dbReady = await initDatabase();

  if (!dbReady) {
    alert('❌ Error al inicializar la base de datos. Revisa la consola para más detalles.');
    return;
  }

  setupTheme();
  setupEventListeners();
  setupDatabaseMenu();
  setDefaultDate();
  renderUI();
});

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
// MENÚ DE BASE DE DATOS
// ========================================

function setupDatabaseMenu() {
  const dbMenu = document.getElementById('dbMenu');
  const dbMenuPanel = document.getElementById('dbMenuPanel');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const clearBtn = document.getElementById('clearBtn');
  const importFile = document.getElementById('importFile');

  dbMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dbMenuPanel.style.display = dbMenuPanel.style.display === 'none' ? 'block' : 'none';
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#dbMenu') && !e.target.closest('#dbMenuPanel')) {
      dbMenuPanel.style.display = 'none';
    }
  });

  exportBtn.addEventListener('click', () => {
    const success = exportDatabase();
    showDbStatus(success ? '✅ Base de datos descargada exitosamente' : '❌ Error al descargar base de datos', success);
  });

  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const success = await importDatabase(file);
    showDbStatus(
      success ? '✅ Base de datos cargada exitosamente' : '❌ Error al cargar base de datos',
      success
    );

    if (success) {
      setTimeout(() => {
        renderUI();
        dbMenuPanel.style.display = 'none';
      }, 1000);
    }

    importFile.value = '';
  });

  clearBtn.addEventListener('click', () => {
    const success = clearDatabase();
    if (success) {
      showDbStatus('✅ Base de datos limpiada', true);
      setTimeout(() => {
        renderUI();
        dbMenuPanel.style.display = 'none';
      }, 1000);
    }
  });
}

function showDbStatus(message, isSuccess) {
  const status = document.getElementById('dbStatus');
  status.textContent = message;
  status.style.color = isSuccess ? 'green' : 'red';
  setTimeout(() => { status.textContent = ''; }, 3000);
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
    alert('Por favor completa todos los campos obligatorios');
    return;
  }

  const accounts = getAccounts();
  if (accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    alert('❌ Esta cuenta ya existe');
    return;
  }

  const success = addAccount(name, type, balance, costType, currency);

  if (success) {
    document.getElementById('accountForm').reset();
    renderUI();
    alert('✅ Cuenta agregada exitosamente');
  } else {
    alert('❌ Error al agregar cuenta. Revisa la consola para más detalles.');
  }
}

// FIX #5: Función para eliminar cuentas desde la UI
function deleteAccountHandler(accountId) {
  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);

  if (!account) return;

  const transactions = getTransactions();
  const hasTransactions = transactions.some(t => t.accountId === accountId);

  const warning = hasTransactions
    ? `⚠️ La cuenta "${account.name}" tiene transacciones asociadas.\n¿Estás seguro? Se eliminarán también todas sus transacciones.`
    : `¿Estás seguro de que deseas eliminar la cuenta "${account.name}"?`;

  if (confirm(warning)) {
    // Eliminar transacciones manualmente ya que el CASCADE depende de PRAGMA
    transactions
      .filter(t => t.accountId === accountId)
      .forEach(t => deleteTransaction(t.id));

    deleteAccount(accountId);
    renderUI();
  }
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
  // FIX #8: Validación explícita del monto para evitar 0
  const amount = parseFloat(document.getElementById('transactionAmount').value);

  if (!date || !description || !accountId || !movement || isNaN(amount) || amount <= 0) {
    alert('Por favor completa todos los campos correctamente. El monto debe ser mayor a 0.');
    return;
  }

  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);

  if (!account) {
    alert('Cuenta no encontrada');
    return;
  }

  const newBalance = movement === 'Entrada'
    ? account.balance + amount
    : account.balance - amount;

  updateAccountBalance(accountId, newBalance);

  // FIX #7: Pasar la moneda de la cuenta a la transacción
  const success = addTransaction(date, description, accountId, account.name, movement, amount, account.currency);

  if (success) {
    document.getElementById('transactionForm').reset();
    setDefaultDate();
    renderUI();
    alert('✅ Transacción registrada exitosamente');
  } else {
    alert('❌ Error al registrar transacción');
  }
}

function deleteTransactionHandler(transactionId) {
  if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
    const transactions = getTransactions();
    const transaction = transactions.find(t => t.id === transactionId);

    if (transaction) {
      const accounts = getAccounts();
      const account = accounts.find(a => a.id === transaction.accountId);

      if (account) {
        const newBalance = transaction.movement === 'Entrada'
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        updateAccountBalance(transaction.accountId, newBalance);
      }
    }

    deleteTransaction(transactionId);
    renderUI();
  }
}

// ========================================
// RENDERIZADO DE UI
// ========================================

function renderUI() {
  renderAccounts();
  renderTransactions();
  updateFinancialStatements();
}

function renderAccounts() {
  const accounts = getAccounts();
  const tbody = document.querySelector('#accountsTable tbody');

  if (accounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay cuentas registradas</td></tr>';
    updateTransactionSelect();
    return;
  }

  // FIX #5: Se agrega columna y botón de eliminar cuenta
  tbody.innerHTML = accounts.map(account => `
    <tr>
      <td><strong>${escapeHtml(account.name)}</strong></td>
      <td>${escapeHtml(account.type)}</td>
      <td>${escapeHtml(account.costType || '-')}</td>
      <td>${formatCurrency(account.balance, account.currency)}</td>
      <td>
        <button class="btn-delete" onclick="deleteAccountHandler(${account.id})" title="Eliminar cuenta">🗑️</button>
      </td>
    </tr>
  `).join('');

  updateTransactionSelect();
}

function updateTransactionSelect() {
  const accounts = getAccounts();
  const select = document.getElementById('transactionAccountSelect');
  const currentValue = select.value;

  select.innerHTML = '<option value="">Seleccione cuenta</option>' +
    accounts.map(account =>
      `<option value="${account.id}">${escapeHtml(account.name)} (${account.currency})</option>`
    ).join('');

  select.value = currentValue;
}

function renderTransactions() {
  const transactions = getTransactions();
  const tbody = document.querySelector('#transactionsTable tbody');

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay transacciones registradas</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(transaction => `
    <tr>
      <td>${escapeHtml(transaction.date)}</td>
      <td>${escapeHtml(transaction.description)}</td>
      <td>${escapeHtml(transaction.accountName)}</td>
      <td>${transaction.movement === 'Entrada' ? '📥 Débito' : '📤 Crédito'}</td>
      <td>${formatCurrency(transaction.amount, transaction.currency || 'MXN')}</td>
      <td>
        <button class="btn-delete" onclick="deleteTransactionHandler(${transaction.id})" title="Eliminar transacción">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ========================================
// ESTADOS FINANCIEROS
// ========================================

function updateFinancialStatements() {
  const accounts = getAccounts();
  const transactions = getTransactions();

  const assets = accounts.filter(a => a.type === 'Activo').reduce((sum, a) => sum + (a.balance || 0), 0);
  const liabilities = accounts.filter(a => a.type === 'Pasivo').reduce((sum, a) => sum + (a.balance || 0), 0);
  const equity = accounts.filter(a => a.type === 'Patrimonio').reduce((sum, a) => sum + (a.balance || 0), 0);
  const income = accounts.filter(a => a.type === 'Ingreso').reduce((sum, a) => sum + (a.balance || 0), 0);
  const expenses = accounts.filter(a => a.type === 'Gasto').reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalDebit = transactions.filter(t => t.movement === 'Entrada').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCredit = transactions.filter(t => t.movement === 'Salida').reduce((sum, t) => sum + (t.amount || 0), 0);

  document.getElementById('assets').textContent = formatCurrency(assets, 'MXN');
  document.getElementById('liabilities').textContent = formatCurrency(liabilities, 'MXN');
  document.getElementById('equity').textContent = formatCurrency(equity, 'MXN');
  document.getElementById('income').textContent = formatCurrency(income, 'MXN');
  document.getElementById('expenses').textContent = formatCurrency(expenses, 'MXN');
  document.getElementById('netIncome').textContent = formatCurrency(income - expenses, 'MXN');
  document.getElementById('totalDebit').textContent = formatCurrency(totalDebit, 'MXN');
  document.getElementById('totalCredit').textContent = formatCurrency(totalCredit, 'MXN');
  document.getElementById('totalLiabilitiesEquity').textContent = formatCurrency(liabilities + equity, 'MXN');

  renderTAccounts();
}

function renderTAccounts() {
  const accounts = getAccounts();
  const transactions = getTransactions();
  const container = document.getElementById('accountsGrid');

  if (accounts.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay cuentas para mostrar</p>';
    return;
  }

  container.innerHTML = accounts.map(account => {
    const debits = transactions
      .filter(t => t.accountId === account.id && t.movement === 'Entrada')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const credits = transactions
      .filter(t => t.accountId === account.id && t.movement === 'Salida')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return `
      <div class="t-account">
        <div class="t-account-title">${escapeHtml(account.name)}</div>
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

// FIX #3: formatCurrency maneja null, undefined y NaN sin crash
function formatCurrency(value, currency = 'MXN') {
  const num = parseFloat(value);
  const amount = isNaN(num) ? 0 : num;

  const symbols = { 'MXN': '$', 'USD': 'US$', 'EUR': '€' };
  const symbol = symbols[currency] || currency;
  return `${symbol} ${amount.toFixed(2)}`;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
