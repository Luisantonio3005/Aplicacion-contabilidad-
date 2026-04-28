// State management
let accounts = [];
let transactions = [];
let isDarkMode = false;

// Utility functions
const formatCurrency = (value) => {
  return Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getNormalBalanceType = (account) => {
  if (account.type === 'Activo' || account.type === 'Gasto') return 'Debit';
  return 'Credit';
};

const computeBalance = (account) => {
  const debits = account.debits.reduce((sum, item) => sum + item.amount, 0) +
    (getNormalBalanceType(account) === 'Debit' ? account.initialBalance : 0);
  const credits = account.credits.reduce((sum, item) => sum + item.amount, 0) +
    (getNormalBalanceType(account) === 'Credit' ? account.initialBalance : 0);
  return debits - credits;
};

// Theme management
const toggleTheme = () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = isDarkMode ? '☀️' : '🌙';
};

const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    document.getElementById('themeToggle').textContent = '🌙';
  }
};

// UI update functions
const updateAccountOptions = () => {
  const select = document.getElementById('transactionAccountSelect');
  select.innerHTML = '<option value="">Seleccione cuenta</option>' +
    accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
};

const refreshUI = () => {
  // Accounts table
  const accountsBody = document.querySelector('#accountsTable tbody');
  if (accounts.length === 0) {
    accountsBody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay cuentas registradas</td></tr>';
  } else {
    accountsBody.innerHTML = accounts.map(acc => `
      <tr>
        <td>${acc.name}</td>
        <td>${acc.type}</td>
        <td>${acc.costType}</td>
        <td>${formatCurrency(Math.abs(computeBalance(acc)))} ${acc.currency}</td>
      </tr>
    `).join('');
  }

  // Transactions table
  const transactionsBody = document.querySelector('#transactionsTable tbody');
  if (transactions.length === 0) {
    transactionsBody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay transacciones registradas</td></tr>';
  } else {
    transactionsBody.innerHTML = transactions.map(tx => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.description}</td>
        <td>${tx.accountName}</td>
        <td>${tx.movement}</td>
        <td>${formatCurrency(tx.amount)}</td>
        <td><button class="btn-danger" onclick="removeTransaction('${tx.id}')">Eliminar</button></td>
      </tr>
    `).join('');
  }

  // Accounts grid
  const grid = document.getElementById('accountsGrid');
  if (accounts.length === 0) {
    grid.innerHTML = '<div class="empty-state">Agrega cuentas para verlas aquí</div>';
  } else {
    grid.innerHTML = accounts.map(acc => `
      <div class="account-card">
        <h3>${acc.name} <span class="small">(${acc.type})</span></h3>
        <p><strong>Saldo:</strong> ${formatCurrency(Math.abs(computeBalance(acc)))}</p>
        <p><strong>Clasificación:</strong> ${acc.costType}</p>
      </div>
    `).join('');
  }

  // Totals
  const totalDebits = transactions.filter(t => t.movement === 'Entrada').reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter(t => t.movement === 'Salida').reduce((s, t) => s + t.amount, 0);
  document.getElementById('totalDebit').textContent = formatCurrency(totalDebits);
  document.getElementById('totalCredit').textContent = formatCurrency(totalCredits);

  // Financial statements
  const income = accounts.filter(a => a.type === 'Ingreso').reduce((s, a) => s + computeBalance(a) * -1, 0);
  const expenses = accounts.filter(a => a.type === 'Gasto').reduce((s, a) => s + computeBalance(a), 0);
  const netIncome = income - expenses;

  document.getElementById('income').textContent = formatCurrency(income);
  document.getElementById('expenses').textContent = formatCurrency(expenses);
  document.getElementById('netIncome').textContent = formatCurrency(netIncome);

  const assets = accounts.filter(a => a.type === 'Activo').reduce((s, a) => s + computeBalance(a), 0);
  const liabilities = accounts.filter(a => a.type === 'Pasivo').reduce((s, a) => s + computeBalance(a) * -1, 0);
  const equity = accounts.filter(a => a.type === 'Patrimonio').reduce((s, a) => s + computeBalance(a) * -1, 0) + netIncome;

  document.getElementById('assets').textContent = formatCurrency(assets);
  document.getElementById('liabilities').textContent = formatCurrency(liabilities);
  document.getElementById('equity').textContent = formatCurrency(equity);
  document.getElementById('totalLiabilitiesEquity').textContent = formatCurrency(liabilities + equity);

  // Save to localStorage
  localStorage.setItem('accounts', JSON.stringify(accounts));
  localStorage.setItem('transactions', JSON.stringify(transactions));
};

// Transaction management
const removeTransaction = (id) => {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  transactions = transactions.filter(t => t.id !== id);
  const account = accounts.find(a => a.id === transaction.accountId);
  if (account) {
    if (transaction.movement === 'Entrada') {
      account.debits.pop();
    } else {
      account.credits.pop();
    }
  }
  refreshUI();
};

// Event listeners
document.getElementById('accountForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const newAccount = {
    id: Math.random().toString(36).substr(2, 9),
    name: formData.get('account-name').trim(),
    type: formData.get('account-type'),
    costType: formData.get('account-cost-type'),
    initialBalance: Number(formData.get('account-balance')) || 0,
    currency: formData.get('account-currency'),
    debits: [],
    credits: []
  };

  if (!newAccount.name) {
    alert('Por favor ingresa un nombre para la cuenta');
    return;
  }

  accounts.push(newAccount);
  e.target.reset();
  updateAccountOptions();
  refreshUI();
});

document.getElementById('transactionForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const accountId = formData.get('transaction-account');
  const account = accounts.find(a => a.id === accountId);
  
  if (!account) {
    alert('Por favor selecciona una cuenta válida');
    return;
  }

  const amount = Number(formData.get('transaction-amount'));
  if (amount <= 0) {
    alert('El monto debe ser mayor a 0');
    return;
  }

  const movement = formData.get('transaction-movement');
  const newTransaction = {
    id: Math.random().toString(36).substr(2, 9),
    date: formData.get('transaction-date'),
    description: formData.get('transaction-description').trim(),
    accountId,
    accountName: account.name,
    movement,
    amount
  };

  transactions.push(newTransaction);

  if (movement === 'Entrada') {
    account.debits.push({ amount });
  } else {
    account.credits.push({ amount });
  }

  e.target.reset();
  refreshUI();
});

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Initialize
const loadData = () => {
  const savedAccounts = localStorage.getItem('accounts');
  const savedTransactions = localStorage.getItem('transactions');
  
  if (savedAccounts) {
    accounts = JSON.parse(savedAccounts);
  }
  if (savedTransactions) {
    transactions = JSON.parse(savedTransactions);
  }
};

// Set today's date as default
const today = new Date().toISOString().split('T')[0];
document.getElementById('transactionDate').value = today;

// Start app
initializeTheme();
loadData();
updateAccountOptions();
refreshUI();
