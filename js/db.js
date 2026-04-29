// ============================================================
// BASE DE DATOS — CONTABILIDAD SIMPLIFICADA
// sql.js (SQLite sobre WebAssembly)
// ============================================================

'use strict';

let db  = null;
let SQL = null;

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function initDatabase() {
  try {
    SQL = await initSqlJs({
      locateFile: filename => `https://sql.js.org/dist/${filename}`
    });

    const savedDb = localStorage.getItem('sqliteDb');

    if (savedDb) {
      const bytes = new Uint8Array(savedDb.split(',').map(Number));
      db = new SQL.Database(bytes);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON;');
    _applySchema();
    if (!savedDb) _persist();

    console.log('✅ Base de datos lista');
    return true;
  } catch (err) {
    console.error('❌ initDatabase:', err);
    return false;
  }
}

// ============================================================
// ESQUEMA
// ============================================================

function _applySchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL UNIQUE,
      category       TEXT    NOT NULL DEFAULT 'Activo',
      type           TEXT    NOT NULL,
      balance        REAL    NOT NULL DEFAULT 0,
      initialBalance REAL    NOT NULL DEFAULT 0,
      costType       TEXT,
      currency       TEXT    NOT NULL DEFAULT 'MXN',
      createdAt      TEXT    NOT NULL,
      updatedAt      TEXT    NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      description TEXT    NOT NULL,
      accountId   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      accountName TEXT    NOT NULL,
      accountType TEXT    NOT NULL DEFAULT 'Activo',
      movement    TEXT    NOT NULL CHECK(movement IN ('Entrada','Salida')),
      amount      REAL    NOT NULL CHECK(amount > 0),
      balanceDelta REAL   NOT NULL DEFAULT 0,
      currency    TEXT    NOT NULL DEFAULT 'MXN',
      createdAt   TEXT    NOT NULL
    )
  `);

  // Migraciones seguras
  const migraciones = [
    `ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'MXN'`,
    `ALTER TABLE transactions ADD COLUMN accountType TEXT NOT NULL DEFAULT 'Activo'`,
    `ALTER TABLE transactions ADD COLUMN balanceDelta REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE accounts ADD COLUMN category TEXT NOT NULL DEFAULT 'Activo'`,
    `ALTER TABLE accounts ADD COLUMN initialBalance REAL NOT NULL DEFAULT 0`,
  ];
  for (const sql of migraciones) {
    try { db.run(sql); } catch (_) { }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      action     TEXT    NOT NULL,
      tableName  TEXT    NOT NULL,
      recordId   INTEGER,
      details    TEXT,
      ts         TEXT    NOT NULL
    )
  `);
}

// ============================================================
// PERSISTENCIA
// ============================================================

function _persist() {
  if (!db) return;
  try {
    const bytes = db.export();
    localStorage.setItem('sqliteDb', Array.from(bytes).join(','));
  } catch (err) {
    console.error('❌ localStorage:', err);
    alert('⚠️ No se pudo guardar en el almacenamiento local.\nDescarga una copia de seguridad con el botón 💾 antes de cerrar.');
  }
}

// ============================================================
// AUDITORÍA
// ============================================================

function _audit(action, tableName, recordId, details) {
  try {
    db.run(
      `INSERT INTO audit_log (action, tableName, recordId, details, ts) VALUES (?, ?, ?, ?, ?)`,
      [action, tableName, recordId ?? null, details, new Date().toISOString()]
    );
  } catch (err) {
    console.error('❌ _audit:', err);
  }
}

// ============================================================
// CUENTAS
// ============================================================

function addAccount(name, category, type, balance, costType, currency) {
  const now = new Date().toISOString();
  const initialBal = Number(balance) || 0;
  try {
    db.run('BEGIN');
    db.run(
      `INSERT INTO accounts (name, category, type, balance, initialBalance, costType, currency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || 'Activo', type, initialBal, initialBal, costType || null, currency || 'MXN', now, now]
    );
    _audit('INSERT', 'accounts', null, `Cuenta creada: ${name} (${category} - ${type})`);
    db.run('COMMIT');
    _persist();
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ addAccount:', err);
    return { ok: false, error: err.message };
  }
}

function getAccounts() {
  try {
    return _rows(db.exec(`SELECT * FROM accounts ORDER BY name COLLATE NOCASE`));
  } catch (err) {
    console.error('❌ getAccounts:', err);
    return [];
  }
}

function getAccountById(id) {
  try {
    const rows = _rows(db.exec(`SELECT * FROM accounts WHERE id = ?`, [id]));
    return rows[0] ?? null;
  } catch (err) {
    console.error('❌ getAccountById:', err);
    return null;
  }
}

function deleteAccount(accountId) {
  try {
    db.run('BEGIN');
    db.run(`DELETE FROM accounts WHERE id = ?`, [accountId]);
    _audit('DELETE', 'accounts', accountId, 'Cuenta eliminada');
    db.run('COMMIT');
    _persist();
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ deleteAccount:', err);
    return { ok: false, error: err.message };
  }
}

// ============================================================
// TRANSACCIONES — SIMPLIFICADO: Entrada suma, Salida resta
// ============================================================

function registerTransaction(date, description, accountId, movement, amount, currency) {
  const account = getAccountById(accountId);
  if (!account) return { ok: false, error: 'Cuenta no encontrada' };

  // SIMPLIFICADO: Entrada = +amount, Salida = -amount
  const delta = movement === 'Entrada' ? amount : -amount;
  const newBalance = account.balance + delta;
  const now = new Date().toISOString();

  try {
    db.run('BEGIN');

    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, accountId]
    );

    db.run(
      `INSERT INTO transactions (date, description, accountId, accountName, accountType, movement, amount, balanceDelta, currency, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, description, accountId, account.name, account.category, movement, amount, delta, currency || account.currency, now]
    );

    _audit('INSERT', 'transactions', null, `${movement} $${amount} en "${account.name}" → saldo: ${account.balance} → ${newBalance}`);

    db.run('COMMIT');
    _persist();
    return { ok: true, newBalance, delta };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ registerTransaction:', err);
    return { ok: false, error: err.message };
  }
}

function removeTransaction(transactionId) {
  let tx;
  try {
    const rows = _rows(db.exec(`SELECT * FROM transactions WHERE id = ?`, [transactionId]));
    tx = rows[0];
  } catch (err) {
    return { ok: false, error: err.message };
  }

  if (!tx) return { ok: false, error: 'Transacción no encontrada' };

  const account = getAccountById(tx.accountId);
  if (!account) return { ok: false, error: 'La cuenta de esta transacción ya no existe' };

  const revertDelta = -(tx.balanceDelta ?? (tx.movement === 'Entrada' ? tx.amount : -tx.amount));
  const newBalance = account.balance + revertDelta;
  const now = new Date().toISOString();

  try {
    db.run('BEGIN');
    db.run(`UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`, [newBalance, now, account.id]);
    db.run(`DELETE FROM transactions WHERE id = ?`, [transactionId]);
    _audit('DELETE', 'transactions', transactionId, `TX eliminada de "${account.name}" → saldo revertido: ${account.balance} → ${newBalance}`);
    db.run('COMMIT');
    _persist();
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ removeTransaction:', err);
    return { ok: false, error: err.message };
  }
}

function getTransactions() {
  try {
    return _rows(db.exec(`SELECT * FROM transactions ORDER BY date DESC, id DESC`));
  } catch (err) {
    console.error('❌ GetTransactions:', err);
    return [];
  }
}

// ============================================================
// GESTIÓN DE LA BASE DE DATOS
// ============================================================

function exportDatabase() {
  try {
    const bytes = db.export();
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `contabilidad-${new Date().toISOString().slice(0,10)}.db`
    });
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('❌ exportDatabase:', err);
    return false;
  }
}

function importDatabase(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onerror = () => resolve(false);
    reader.onload = e => {
      try {
        const bytes = new Uint8Array(e.target.result);
        db = new SQL.Database(bytes);
        db.run('PRAGMA foreign_keys = ON;');
        _applySchema();
        _persist();
        console.log('✅ Base de datos importada');
        resolve(true);
      } catch (err) {
        console.error('❌ importDatabase:', err);
        resolve(false);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function clearDatabase() {
  if (!confirm('⚠️ ¿Eliminar TODA la base de datos?\nEsta acción no se puede deshacer.'))
    return false;

  try {
    db.run('BEGIN');
    db.run('DELETE FROM transactions');
    db.run('DELETE FROM accounts');
    db.run('DELETE FROM audit_log');
    try { db.run('DELETE FROM sqlite_sequence'); } catch (_) {}
    db.run('COMMIT');
    _persist();
    return true;
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ clearDatabase:', err);
    return false;
  }
}

function getDatabaseStats() {
  try {
    const r = _rows(db.exec(`
      SELECT
        (SELECT COUNT(*) FROM accounts) AS accounts,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COALESCE(SUM(amount),0) FROM transactions) AS totalAmount
    `))[0];
    return r ?? { accounts: 0, transactions: 0, totalAmount: 0 };
  } catch (err) {
    return { accounts: 0, transactions: 0, totalAmount: 0 };
  }
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

function _rows(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}
