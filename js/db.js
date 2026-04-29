// ============================================================
// BASE DE DATOS — CONTABILIDAD CON CUENTAS T
// sql.js (SQLite sobre WebAssembly)
// ============================================================

'use strict';

let db  = null;
let SQL = null;

// ============================================================
// REGLAS DE PARTIDA DOBLE
//
// Cuentas con saldo normal DÉBITO:
//   Débito (Entrada) → AUMENTA el saldo
//   Crédito (Salida) → DISMINUYE el saldo
//   Tipos: Activo, Activo Diferido, Gasto
//
// Cuentas con saldo normal CRÉDITO:
//   Crédito (Salida) → AUMENTA el saldo
//   Débito (Entrada) → DISMINUYE el saldo
//   Tipos: Pasivo, Patrimonio, Ingreso
// ============================================================

const TIPOS_SALDO_DEBITO  = ['Activo', 'Activo Diferido', 'Gasto'];
const TIPOS_SALDO_CREDITO = ['Pasivo', 'Patrimonio', 'Ingreso'];

/**
 * Calcula el delta real al saldo según el tipo de cuenta y el movimiento.
 * @param {string} accountType  - tipo de cuenta
 * @param {string} movement     - 'Entrada' (Débito) | 'Salida' (Crédito)
 * @param {number} amount       - monto positivo
 * @returns {number}            - delta a sumar al saldo (puede ser negativo)
 */
function _calcDelta(accountType, movement, amount) {
  const esDebito  = movement === 'Entrada';

  if (TIPOS_SALDO_DEBITO.includes(accountType)) {
    // Activo, Activo Diferido, Gasto
    // Débito → +   |   Crédito → −
    return esDebito ? amount : -amount;
  }

  if (TIPOS_SALDO_CREDITO.includes(accountType)) {
    // Pasivo, Patrimonio, Ingreso
    // Crédito → +   |   Débito → −
    return esDebito ? -amount : amount;
  }

  // Tipo desconocido → comportamiento neutro (Entrada suma, Salida resta)
  console.warn(`Tipo de cuenta desconocido: "${accountType}". Aplicando regla por defecto.`);
  return esDebito ? amount : -amount;
}

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

    // Las claves foráneas están DESACTIVADAS por defecto en SQLite;
    // hay que activarlas en cada conexión para que ON DELETE CASCADE funcione
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
// ESQUEMA (idempotente — CREATE IF NOT EXISTS + migraciones)
// ============================================================

function _applySchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      type       TEXT    NOT NULL,
      balance    REAL    NOT NULL DEFAULT 0,
      costType   TEXT,
      currency   TEXT    NOT NULL DEFAULT 'MXN',
      createdAt  TEXT    NOT NULL,
      updatedAt  TEXT    NOT NULL
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

  // Migraciones seguras para DBs antiguas
  const migraciones = [
    `ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'MXN'`,
    `ALTER TABLE transactions ADD COLUMN accountType TEXT NOT NULL DEFAULT 'Activo'`,
    `ALTER TABLE transactions ADD COLUMN balanceDelta REAL NOT NULL DEFAULT 0`,
  ];
  for (const sql of migraciones) {
    try { db.run(sql); } catch (_) { /* columna ya existe */ }
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
// PERSISTENCIA — UN solo save por acción
// ============================================================

function _persist() {
  if (!db) return;
  try {
    const bytes = db.export();
    localStorage.setItem('sqliteDb', Array.from(bytes).join(','));
  } catch (err) {
    console.error('❌ localStorage:', err);
    alert(
      '⚠️ No se pudo guardar en el almacenamiento local (cuota excedida).\n' +
      'Descarga una copia de seguridad con el botón 💾 antes de cerrar.'
    );
  }
}

// ============================================================
// AUDITORÍA
// ============================================================

function _audit(action, tableName, recordId, details) {
  try {
    db.run(
      `INSERT INTO audit_log (action, tableName, recordId, details, ts)
       VALUES (?, ?, ?, ?, ?)`,
      [action, tableName, recordId ?? null, details, new Date().toISOString()]
    );
  } catch (err) {
    console.error('❌ _audit:', err);
  }
}

// ============================================================
// CUENTAS
// ============================================================

function addAccount(name, type, balance, costType, currency) {
  const now = new Date().toISOString();
  try {
    db.run('BEGIN');
    db.run(
      `INSERT INTO accounts (name, type, balance, costType, currency, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, type, Number(balance) || 0, costType || null, currency || 'MXN', now, now]
    );
    _audit('INSERT', 'accounts', null, `Cuenta creada: ${name} (${type})`);
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
    return _rows(db.exec(`SELECT * FROM accounts ORDER BY
      CASE type
        WHEN 'Activo'          THEN 1
        WHEN 'Activo Diferido' THEN 2
        WHEN 'Pasivo'          THEN 3
        WHEN 'Patrimonio'      THEN 4
        WHEN 'Ingreso'         THEN 5
        WHEN 'Gasto'           THEN 6
        ELSE 7
      END, name COLLATE NOCASE`));
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
    _audit('DELETE', 'accounts', accountId, 'Cuenta eliminada (CASCADE transacciones)');
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
// TRANSACCIONES — lógica de partida doble correcta
// ============================================================

/**
 * Registra una transacción aplicando las reglas de partida doble:
 *   - Cuentas de saldo DÉBITO  (Activo, Activo Diferido, Gasto):
 *       Entrada (Débito) → saldo SUBE
 *       Salida (Crédito) → saldo BAJA
 *   - Cuentas de saldo CRÉDITO (Pasivo, Patrimonio, Ingreso):
 *       Salida  (Crédito) → saldo SUBE
 *       Entrada (Débito)  → saldo BAJA
 *
 * Todo ocurre en una sola transacción SQLite atómica.
 * Retorna { ok, newBalance, delta, error }
 */
function registerTransaction(date, description, accountId, movement, amount, currency) {
  const account = getAccountById(accountId);
  if (!account) return { ok: false, error: 'Cuenta no encontrada' };

  const delta      = _calcDelta(account.type, movement, amount);
  const newBalance = account.balance + delta;
  const now        = new Date().toISOString();

  try {
    db.run('BEGIN');

    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, accountId]
    );

    db.run(
      `INSERT INTO transactions
         (date, description, accountId, accountName, accountType, movement, amount, balanceDelta, currency, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, description, accountId, account.name, account.type,
       movement, amount, delta, currency || account.currency, now]
    );

    _audit('INSERT', 'transactions', null,
      `${movement} $${amount} en "${account.name}" (${account.type}) → saldo: ${account.balance} → ${newBalance}`);

    db.run('COMMIT');
    _persist();
    return { ok: true, newBalance, delta };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ registerTransaction:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Elimina una transacción y REVIERTE el delta original al saldo.
 * Usa el balanceDelta guardado, así el cálculo es siempre exacto.
 */
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

  // Revertir exactamente el delta que se aplicó originalmente
  const revertDelta = -(tx.balanceDelta ?? _calcDelta(account.type, tx.movement, tx.amount));
  const newBalance  = account.balance + revertDelta;
  const now         = new Date().toISOString();

  try {
    db.run('BEGIN');

    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, account.id]
    );

    db.run(`DELETE FROM transactions WHERE id = ?`, [transactionId]);

    _audit('DELETE', 'transactions', transactionId,
      `TX eliminada de "${account.name}" → saldo revertido: ${account.balance} → ${newBalance}`);

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
    console.error('❌ getTransactions:', err);
    return [];
  }
}

// ============================================================
// GESTIÓN DE LA BASE DE DATOS
// ============================================================

function exportDatabase() {
  try {
    const bytes = db.export();
    const blob  = new Blob([bytes], { type: 'application/octet-stream' });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement('a'), {
      href:     url,
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
    reader.onload  = e => {
      try {
        const bytes = new Uint8Array(e.target.result);
        db = new SQL.Database(bytes);
        db.run('PRAGMA foreign_keys = ON;');
        _applySchema();   // migración antes de guardar
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
        (SELECT COUNT(*) FROM accounts)     AS accounts,
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
