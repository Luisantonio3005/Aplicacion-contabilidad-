// ============================================================
// APLICACIÓN — CONTABILIDAD CON CUENTAS T
// ============================================================

'use strict';

// ============================================================
// ARRANQUE
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await initDatabase();

  if (!ok) {
    document.body.innerHTML =
      '<div style="padding:2rem;color:red;font-family:sans-serif">' +
      '<h2>❌ Error al iniciar la base de datos</h2>' +
      '<p>Abre la consola del navegador (F12) para más detalles.</p>' +
      '</div>';
    return;
  }

  setupTheme();
  setupDatabaseMenu();
  setupForms();
  setDefaultDate();
  renderAll();
});

// ============================================================
// TEMA
// ============================================================

function setupTheme() {
  const btn   = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'light' ? '🌙' : '☀️';
}

// ============================================================
// MENÚ DE BASE DE DATOS
// ============================================================

function setupDatabaseMenu() {
  const btnDB    = document.getElementById('dbMenu');
  const panel    = document.getElementById('dbMenuPanel');
  const btnExp   = document.getElementById('exportBtn');
  const btnImp   = document.getElementById('importBtn');
  const btnExcel = document.getElementById('excelBtn');
  const btnClear = document.getElementById('clearBtn');
  const fileIn   = document.getElementById('importFile');

  btnDB.addEventListener('click', e => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#dbMenu') && !e.target.closest('#dbMenuPanel'))
      panel.style.display = 'none';
  });

  btnExp.addEventListener('click', () => {
    showStatus(exportDatabase() ? '✅ Descarga iniciada' : '❌ Error al exportar',
               exportDatabase());
  });

  btnExcel.addEventListener('click', () => {
    const ok = exportToExcel();
    if (ok !== false) showStatus('✅ Excel descargado correctamente', true);
    panel.style.display = 'none';
  });

  btnImp.addEventListener('click', () => fileIn.click());

  fileIn.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await importDatabase(file);
    showStatus(ok ? '✅ Base de datos cargada' : '❌ Archivo inválido o dañado', ok);
    fileIn.value = '';
    if (ok) setTimeout(() => { renderAll(); panel.style.display = 'none'; }, 800);
  });

  btnClear.addEventListener('click', () => {
    const ok = clearDatabase();
    if (ok) {
      showStatus('✅ Base de datos limpiada', true);
      setTimeout(() => { renderAll(); panel.style.display = 'none'; }, 800);
    }
  });
}

function showStatus(msg, ok) {
  const el = document.getElementById('dbStatus');
  el.textContent = msg;
  el.style.color = ok ? 'var(--color-success, green)' : 'var(--color-error, red)';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.textContent = ''; }, 3500);
}

// ============================================================
// FORMULARIOS
// ============================================================

function setupForms() {
  document.getElementById('accountForm').addEventListener('submit', onAddAccount);
  document.getElementById('transactionForm').addEventListener('submit', onAddTransaction);
}

function setDefaultDate() {
  const el = document.getElementById('transactionDate');
  if (el && !el.value) el.value = new Date().toISOString().slice(0, 10);
}

// ---- Cuentas -----------------------------------------------

function onAddAccount(e) {
  e.preventDefault();
  const name     = document.getElementById('accountName').value.trim();
  const type     = document.getElementById('accountType').value;
  const balance  = parseFloat(document.getElementById('accountBalance').value) || 0;
  const costType = document.getElementById('accountCostType').value;
  const currency = document.getElementById('accountCurrency').value;

  if (!name) { showFormError('El nombre de la cuenta es obligatorio.'); return; }
  if (!type) { showFormError('Selecciona un tipo de cuenta.');          return; }

  const { ok, error } = addAccount(name, type, balance, costType, currency);
  if (ok) {
    e.target.reset();
    renderAll();
  } else {
    const msg = (error || '').includes('UNIQUE')
      ? `❌ Ya existe una cuenta con el nombre "${name}".`
      : `❌ No se pudo agregar la cuenta:\n${error}`;
    alert(msg);
  }
}

function onDeleteAccount(accountId) {
  const account = getAccountById(accountId);
  if (!account) return;
  const txCount = getTransactions().filter(t => t.accountId === accountId).length;
  const extra   = txCount > 0 ? `\nEsta cuenta tiene ${txCount} transacción(es) que también se eliminarán.` : '';
  if (!confirm(`¿Eliminar la cuenta "${account.name}"?${extra}`)) return;
  const { ok, error } = deleteAccount(accountId);
  if (ok) renderAll();
  else alert(`❌ Error al eliminar:\n${error}`);
}

// ---- Transacciones -----------------------------------------

function onAddTransaction(e) {
  e.preventDefault();

  const date        = document.getElementById('transactionDate').value;
  const description = document.getElementById('transactionDescription').value.trim();
  const accountId   = parseInt(document.getElementById('transactionAccountSelect').value, 10);
  const movement    = document.getElementById('transactionMovement').value;
  const amountRaw   = document.getElementById('transactionAmount').value;
  const amount      = parseFloat(amountRaw);

  if (!date)                                { showFormError('Selecciona una fecha.');                  return; }
  if (!description)                         { showFormError('La descripción es obligatoria.');         return; }
  if (!accountId)                           { showFormError('Selecciona una cuenta.');                 return; }
  if (!movement)                            { showFormError('Selecciona Débito o Crédito.');           return; }
  if (!amountRaw || isNaN(amount) || amount <= 0) { showFormError('El monto debe ser mayor a 0.');    return; }

  const account = getAccountById(accountId);
  if (!account) { alert('Cuenta no encontrada.'); return; }

  const { ok, error, newBalance, delta } = registerTransaction(
    date, description, accountId, movement, amount, account.currency
  );

  if (ok) {
    e.target.reset();
    setDefaultDate();
    renderAll();
    // Mostrar el efecto real en el saldo
    const signo  = delta > 0 ? '+' : '';
    const efecto = delta > 0 ? 'aumentó' : 'disminuyó';
    showStatus(`✅ ${account.name} ${efecto} ${signo}${fmtCurrency(Math.abs(delta), account.currency)} → saldo: ${fmtCurrency(newBalance, account.currency)}`, true);
  } else {
    alert(`❌ Error al registrar:\n${error}`);
  }
}

function onDeleteTransaction(transactionId) {
  if (!confirm('¿Eliminar esta transacción?\nEl saldo de la cuenta se revertirá automáticamente.')) return;
  const { ok, error } = removeTransaction(transactionId);
  if (ok) renderAll();
  else alert(`❌ Error al eliminar:\n${error}`);
}

function showFormError(msg) {
  alert(`⚠️ ${msg}`);
}

// ============================================================
// RENDERIZADO
// ============================================================

function renderAll() {
  const accounts     = getAccounts();
  const transactions = getTransactions();

  renderAccountsTable(accounts);
  renderAccountSelect(accounts);
  renderTransactionsTable(transactions);
  renderTAccounts(accounts, transactions);
  renderFinancials(accounts, transactions);
}

// ---- Tabla de cuentas --------------------------------------

function renderAccountsTable(accounts) {
  const tbody = document.querySelector('#accountsTable tbody');
  if (accounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No hay cuentas registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = accounts.map(a => {
    const tipoClass = _tipoClass(a.type);
    const saldoNormal = TIPOS_SALDO_DEBITO_JS.includes(a.type) ? 'Débito' : 'Crédito';
    return `
    <tr>
      <td><strong>${esc(a.name)}</strong></td>
      <td><span class="badge badge-${tipoClass}">${esc(a.type)}</span></td>
      <td><small class="saldo-normal">${saldoNormal} normal</small></td>
      <td>${esc(a.costType || '—')}</td>
      <td class="amount ${a.balance < 0 ? 'amount-negative' : ''}">${fmtCurrency(a.balance, a.currency)}</td>
      <td>
        <button class="btn-delete" onclick="onDeleteAccount(${a.id})" title="Eliminar cuenta">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ---- Select de cuentas en transacción ----------------------

function renderAccountSelect(accounts) {
  const sel  = document.getElementById('transactionAccountSelect');
  const prev = sel.value;

  // Agrupar por tipo para el optgroup
  const grupos = {};
  for (const a of accounts) {
    if (!grupos[a.type]) grupos[a.type] = [];
    grupos[a.type].push(a);
  }

  sel.innerHTML = `<option value="">— Selecciona una cuenta —</option>` +
    Object.entries(grupos).map(([tipo, lista]) =>
      `<optgroup label="${esc(tipo)}">` +
      lista.map(a =>
        `<option value="${a.id}">${esc(a.name)} (${esc(a.currency)}) — saldo: ${fmtCurrency(a.balance, a.currency)}</option>`
      ).join('') +
      `</optgroup>`
    ).join('');

  if (prev) sel.value = prev;
}

// ---- Tabla de transacciones --------------------------------

function renderTransactionsTable(transactions) {
  const tbody = document.querySelector('#transactionsTable tbody');
  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay transacciones registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const delta     = t.balanceDelta ?? 0;
    const deltaSign = delta > 0 ? '+' : '';
    const deltaClass = delta >= 0 ? 'delta-positive' : 'delta-negative';
    return `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(t.description)}</td>
      <td>${esc(t.accountName)}<br><small class="account-type-label">${esc(t.accountType || '')}</small></td>
      <td class="${t.movement === 'Entrada' ? 'debit' : 'credit'}">
        ${t.movement === 'Entrada' ? '📥 Débito' : '📤 Crédito'}
      </td>
      <td class="amount">${fmtCurrency(t.amount, t.currency || 'MXN')}</td>
      <td class="${deltaClass}" title="Efecto real en el saldo">${deltaSign}${fmtCurrency(Math.abs(delta), t.currency || 'MXN')}</td>
      <td>
        <button class="btn-delete" onclick="onDeleteTransaction(${t.id})" title="Eliminar transacción">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ---- Cuentas T ---------------------------------------------

function renderTAccounts(accounts, transactions) {
  const container = document.getElementById('accountsGrid');
  if (accounts.length === 0) {
    container.innerHTML = `<p class="empty-state">No hay cuentas para mostrar</p>`;
    return;
  }

  // Totales de débito/crédito por cuenta en una pasada
  const totals = {};
  for (const t of transactions) {
    if (!totals[t.accountId]) totals[t.accountId] = { debit: 0, credit: 0 };
    if (t.movement === 'Entrada') totals[t.accountId].debit  += t.amount;
    else                          totals[t.accountId].credit += t.amount;
  }

  container.innerHTML = accounts.map(a => {
    const { debit = 0, credit = 0 } = totals[a.id] || {};
    const tipoClass  = _tipoClass(a.type);
    const isDebitNormal = TIPOS_SALDO_DEBITO_JS.includes(a.type);
    // La columna del saldo normal va marcada en verde
    const debitHighlight  = isDebitNormal  ? 'side-normal' : '';
    const creditHighlight = !isDebitNormal ? 'side-normal' : '';

    return `
      <div class="t-account t-account-${tipoClass}">
        <div class="t-account-title">
          ${esc(a.name)}
          <span class="t-account-type">${esc(a.type)}</span>
        </div>
        <div class="t-account-body">
          <div class="t-account-left ${debitHighlight}">
            <div class="t-account-header">Débito</div>
            <div class="t-account-amount">${fmtCurrency(debit, a.currency)}</div>
            ${isDebitNormal ? '<div class="side-label">← aumenta</div>' : '<div class="side-label">← disminuye</div>'}
          </div>
          <div class="t-account-divider"></div>
          <div class="t-account-right ${creditHighlight}">
            <div class="t-account-header">Crédito</div>
            <div class="t-account-amount">${fmtCurrency(credit, a.currency)}</div>
            ${!isDebitNormal ? '<div class="side-label">aumenta →</div>' : '<div class="side-label">disminuye →</div>'}
          </div>
        </div>
        <div class="t-account-footer">
          Saldo: <strong class="${a.balance < 0 ? 'amount-negative' : ''}">${fmtCurrency(a.balance, a.currency)}</strong>
        </div>
      </div>`;
  }).join('');

  const totalDebit  = transactions.filter(t => t.movement === 'Entrada').reduce((s,t) => s + t.amount, 0);
  const totalCredit = transactions.filter(t => t.movement === 'Salida' ).reduce((s,t) => s + t.amount, 0);
  setText('totalDebit',  fmtCurrency(totalDebit,  'MXN'));
  setText('totalCredit', fmtCurrency(totalCredit, 'MXN'));
}

// ---- Estados financieros -----------------------------------

function renderFinancials(accounts, transactions) {
  // Activo + Activo Diferido van juntos en el Balance General
  const sum = (...tipos) => accounts
    .filter(a => tipos.includes(a.type))
    .reduce((s, a) => s + (a.balance || 0), 0);

  const assets      = sum('Activo', 'Activo Diferido');
  const liabilities = sum('Pasivo');
  const equity      = sum('Patrimonio');
  const income      = sum('Ingreso');
  const expenses    = sum('Gasto');
  const netIncome   = income - expenses;

  setText('assets',                 fmtCurrency(assets,               'MXN'));
  setText('liabilities',            fmtCurrency(liabilities,          'MXN'));
  setText('equity',                 fmtCurrency(equity,               'MXN'));
  setText('income',                 fmtCurrency(income,               'MXN'));
  setText('expenses',               fmtCurrency(expenses,             'MXN'));
  setText('netIncome',              fmtCurrency(netIncome,            'MXN'));
  setText('totalLiabilitiesEquity', fmtCurrency(liabilities + equity, 'MXN'));

  // Color condicional en utilidad/pérdida
  const netEl = document.getElementById('netIncome');
  if (netEl) {
    netEl.style.color = netIncome >= 0
      ? 'var(--color-success, #16a34a)'
      : 'var(--color-error,   #dc2626)';
  }

  // Ecuación contable: Activos = Pasivos + Patrimonio
  const balances = document.getElementById('balanceCheck');
  if (balances) {
    const diff = Math.abs(assets - (liabilities + equity));
    balances.textContent = diff < 0.01
      ? '✅ La ecuación contable cuadra'
      : `⚠️ Diferencia: ${fmtCurrency(diff, 'MXN')} (revisa tus registros)`;
    balances.className = diff < 0.01 ? 'balance-ok' : 'balance-warn';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
// CONSTANTES JS (espejo de db.js para uso en renderizado)
// ============================================================

const TIPOS_SALDO_DEBITO_JS  = ['Activo', 'Activo Diferido', 'Gasto'];
const TIPOS_SALDO_CREDITO_JS = ['Pasivo', 'Patrimonio', 'Ingreso'];

function _tipoClass(type) {
  const map = {
    'Activo':          'activo',
    'Activo Diferido': 'activo-diferido',
    'Pasivo':          'pasivo',
    'Patrimonio':      'patrimonio',
    'Ingreso':         'ingreso',
    'Gasto':           'gasto',
  };
  return map[type] || 'otro';
}

// ============================================================
// UTILIDADES
// ============================================================

function fmtCurrency(value, currency) {
  const n   = parseFloat(value);
  const amt = isNaN(n) ? 0 : n;
  const sym = { MXN: '$', USD: 'US$', EUR: '€' }[currency] ?? (currency ?? '$');
  return `${sym}\u00A0${Math.abs(amt).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
