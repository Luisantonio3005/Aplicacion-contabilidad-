// ============================================================
// APLICACIÓN — CONTABILIDAD SIMPLIFICADA
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
    showStatus(exportDatabase() ? '✅ Descarga iniciada' : '❌ Error al exportar', exportDatabase());
  });

  btnExcel.addEventListener('click', () => {
    const ok = exportToExcel();
    if (ok !== false) showStatus('📊 Excel descargado correctamente', true);
    panel.style.display = 'none';
  });

  btnImp.addEventListener('click', () => fileIn.click());

  fileIn.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = await importDatabase(file);
    showStatus(ok ? '✅ base de datos cargada' : '❌ Archivo inválido o dañado', ok);
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
  const name      = document.getElementById('accountName').value.trim();
  const category  = document.getElementById('accountCategory').value;
  const type      = document.getElementById('accountType').value;
  const balance   = parseFloat(document.getElementById('accountBalance').value) || 0;
  const currency  = document.getElementById('accountCurrency').value;

  if (!name)     { showFormError('El nombre de la cuenta es obligatorio.'); return; }
  if (!category) { showFormError('Selecciona una categoría de cuenta.');     return; }
  if (!type)     { showFormError('Selecciona un tipo de cuenta.');           return; }

  const { ok, error } = addAccount(name, category, type, balance, null, currency);
  if (ok) {
    e.target.reset();
    renderAll();
  } else {
    const msg = (error || '').includes('UNIQUE')
      ? `❌ Ya existe una cuenta con el nombre "${name}".`
      : `❌ Error al agregar la cuenta:\n${error}`;
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

  if (!date)                               { showFormError('Selecciona una fecha.');                  return; }
  if (!description)                        { showFormError('La descripción es obligatoria.');         return; }
  if (!accountId)                          { showFormError('Selecciona una cuenta.');                 return; }
  if (!movement)                           { showFormError('Selecciona Entrada o Salida.');           return; }
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
    const signo  = delta > 0 ? '+' : '';
    const efecto = delta > 0 ? 'aumentó' : 'disminuyó';
    showStatus(`${account.name} ${efecto} ${signo}${fmtCurrency(Math.abs(delta), account.currency)} → saldo: ${fmtCurrency(newBalance, account.currency)}`, true);
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
  const accounts      = getAccounts();
  const transactions  = getTransactions();

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
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay cuentas registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = accounts.map(a => {
    const tipoClase = _tipoClase(a.category);
    return `
    <tr>
      <td><strong>${esc(a.name)}</strong></td>
      <td><span class="badge badge-${tipoClase}">${esc(a.category)}</span></td>
      <td>${esc(a.type)}</td>
      <td class="amount">${dmtCurrency(a.initialBalance ?? 0, a.currency)}</td>
      <td class="amount ${a.balance < 0 ? 'amount-negative' : ''}">${dmtCurrency(a.balance, a.currency)}</td>
      <td>${esc(a.currency || 'MXN')}</td>
      <td>
        <button class="btn-delete" onclick="onDeleteAccount(${a.id})" title="Eliminar cuenta">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// ---- Select de cuentas en transacción ----------------------

function renderAccountSelect(accounts) {
  const sel  = document.getElementById("transactionAccountSelect");
  const prev = sel.value;

  const grupos = {};
  for (const a of accounts) {
    if (!grupos[a.category]) grupos[a.category] = [];
    grupos[a.category].push(a);
  }

  sel.innerHTML = `<option value="">— Selecciona una cuenta —</option>` +
    Object.entries(grupos).map(([categoria, lista]) =>
      `<optgroup label="${esc(categoria)}">` +
      lista.map(a =>
        `<option value="${a.id}">${esc(a.name)} (${esc(a.currency)}) — saldo: ${dmtCurrency(a.balance, a.currency)}</option>`
      ).join('') +
      `</optgroup>`
    ).join('');

  if (prev) sel.value = prev;
}

// ---- Tabla de transacciones --------------------------------

function renderTransactionsTable(transactions) {
  const tbody = document.querySelector('#transactionsTable tbody');
  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No hay movimientos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const delta = t.balanceDelta ?? 0;
    const deltaSign = delta > 0 ? '+' : '';
    const deltaClass = delta >= 0 ? 'delta-positive' : 'delta-negative';
    return `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(t.description)}</td>
      <td>${esc(t.accountName)}<br><small class="account-type-label">${esc(t.accountType || '')}</small></td>
      <td>${esc(t.accountType || t.accountName)}</td>
      <td class="${t.movement === 'Entrada' ? 'entrada' : 'salida'}">
        ${t.movement === 'Entrada' ? '📥 Entrada' : '📤 Salida'}
      </td>
      <td class="amount">${fmtCurrency(t.amount, t.currency || 'MXN')}</td>
      <td class="${deltaClass}">${deltaSign}${fmtCurrency(Math.abs(delta), t.currency || 'MXN')}</td>
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

  const totals = {};
  for (const t of transactions) {
    if (!totals[t.accountId]) totals[t.accountId] = { entrada: 0, salida: 0 };
    if (t.movement === 'Entrada') totals[t.accountId].entrada += t.amount;
    else                          totals[t.accountId].salida  += t.amount;
  }

  container.innerHTML = accounts.map(a => {
    const { entrada = 0, salida = 0 } = totals[a.id] || {};
    const tipoClase = _tipoClase(a.category);

    return `
      <div class="t-account t-account-${tipoClase}">
        <div class="t-account-title">
          ${esc(a.name)}
          <span class="t-account-type">${esc(a.category)}</span>
        </div>
        <div class="t-account-body">
          <div class="t-account-left">
            <div class="t-account-header">Entradas</div>
            <div class="t-account-amount">${fmtCurrency(entrada, a.currency)}</div>
          </div>
          <div class="t-account-divider"></div>
          <div class="t-account-right">
            <div class="t-account-header">Salidas</div>
            <div class="t-account-amount">${fmtCurrency(salida, a.currency)}</div>
          </div>
        </div>
        <div class="t-account-footer">
          Saldo: <strong class="${a.balance < 0 ? 'amount-negative' : ''}">${dmtCurrency(a.balance, a.currency)}</strong>
        </div>
      </div>`;
  }).join('');

  const totalEntrada = transactions.filter(t => t.movement === 'Entrada').reduce((s,t) => s + t.amount, 0);
  const totalSalida  = transactions.filter(t => t.movement === 'Salida' ).reduce((s,t) => s + t.amount, 0);
  setText('totalEntrada', fmtCurrency(totalEntrada, 'MXN'));
  setText('totalSalida',  fmtCurrency(totalSalida,  'MXN'));
}

// ---- Estados financieros -----------------------------------

function renderFinancials(accounts, transactions) {
  // Categorías reales guardadas en DB
  const sum = (...categorias) => accounts
    .filter(a => categorias.includes(a.category))
    .reduce((s, a) => s + (a.balance || 0), 0);

  // Activos
  const currentAssets    = sum('Activo Circulante');
  const nonCurrentAssets = sum('Activo No Circulante');
  const deferredAssets   = sum('Activo Diferido');
  const totalAssets      = currentAssets + nonCurrentAssets + deferredAssets;

  // Pasivos
  const currentLiab    = sum('Pasivo Circulante');
  const nonCurrentLiab = sum('Pasivo No Circulante');
  const deferredLiab   = sum('Pasivo Diferido');
  const totalLiab      = currentLiab + nonCurrentLiab + deferredLiab;

  // Patrimonio
  const capitalStock     = sum('Capital Social');
  const retained         = sum('Utilidades');
  const totalEquity      = capitalStock + retained;

  // Ingresos
  const operIncome    = sum('Ingresos Operacionales');
  const nonOperIncome = sum('Ingresos No Operacionales');

  // Gastos
  const operExp    = sum('Gastos Operacionales');
  const nonOperExp = sum('Gastos No Operacionales');

  const netIncome = (operIncome + nonOperIncome) - (operExp + nonOperExp);

  // Estado de Resultados
  setText('operIncome',    fmtCurrency(operIncome,    'MXN'));
  setText('nonOperIncome', fmtCurrency(nonOperIncome, 'MXN'));
  setText('operExpenses',  fmtCurrency(operExp,       'MXN'));
  setText('nonOperExpenses', fmtCurrency(nonOperExp,  'MXN'));
  setText('netIncome',     fmtCurrency(netIncome,     'MXN'));

  // Balance General
  setText('currentAssets',    fmtCurrency(currentAssets,    'MXN'));
  setText('nonCurrentAssets', fmtCurrency(nonCurrentAssets, 'MXN'));
  setText('deferredAssets',   fmtCurrency(deferredAssets,   'MXN'));
  setText('totalAssets',      fmtCurrency(totalAssets,      'MXN'));

  setText('currentLiabilities',    fmtCurrency(currentLiab,    'MXN'));
  setText('nonCurrentLiabilities', fmtCurrency(nonCurrentLiab, 'MXN'));
  setText('totalLiabilities',      fmtCurrency(totalLiab,      'MXN'));

  setText('capitalStock',    fmtCurrency(capitalStock, 'MXN'));
  setText('retainedEarnings', fmtCurrency(retained,    'MXN'));
  setText('totalEquity',     fmtCurrency(totalEquity,  'MXN'));

  setText('totalLiabilitiesEquity', fmtCurrency(totalLiab + totalEquity, 'MXN'));

  // Color utilidad/pérdida
  const netEl = document.getElementById('netIncome');
  if (netEl) {
    netEl.style.color = netIncome >= 0
      ? 'var(--color-success, #16a34a)'
      : 'var(--color-error,   #dc2626)';
  }

  // Verificación ecuación contable
  const balances = document.getElementById('balanceCheck');
  if (balances) {
    const diff = Math.abs(totalAssets - (totalLiab + totalEquity));
    balances.textContent = diff < 0.01
      ? '✅ Ecuación contable: Activos = Pasivos + Patrimonio'
      : `⚠️ Diferencia: ${dmtCurrency(diff, 'MXN')} (revisa tus registros)`;
    balances.className = diff < 0.01 ? 'balance-ok' : 'balance-warn';
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================================
// UTILIDADES
// ============================================================

function _tipoClase(tipo) {
  const map = {
    'Activo Circulante':        'activo',
    'Activo No Circulante':     'activo',
    'Activo Diferido':          'activo-diferido',
    'Pasivo Circulante':        'pasivo',
    'Pasivo No Circulante':     'pasivo',
    'Pasivo Diferido':          'pasivo',
    'Capital Social':           'patrimonio',
    'Utilidades':               'patrimonio',
    'Ingresos Operacionales':   'ingreso',
    'Ingresos No Operacionales':'ingreso',
    'Gastos Operacionales':     'gasto',
    'Gastos No Operacionales':  'gasto',
  };
  return map[tipo] || 'otro';
}

function fmtCurrency(value, currency) {
  const n   = parseFloat(value);
  const amt = isNaN(n) ? 0 : n;
  const sym = { MXN: '$', USD: 'US$', EUR: '€' }[currency] ?? (currency ?? '$');
  return `${sym}${Math.abs(amt).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dmtCurrency(value, currency) {
  const n = parseFloat(value);
  const amt = isNaN(n) ? 0 : n;
  const sym = { MXN: '$', USD: 'US$', EUR: '€' }[currency] ?? (currency ?? '$');
  const sign = amt < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(amt).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
