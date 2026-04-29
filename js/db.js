// ============================================================
// BASE DE DATOS — CONTABILIDAD CON CUENTAS T
// sql.js (SQLite sobre WebAssembly)
// ============================================================

'use strict';

let db   = null;   // instancia de la base de datos
let SQL  = null;   // clase sql.js

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function initDatabase() {
  try {
    // locateFile es OBLIGATORIO para que el navegador encuentre
    // sql-wasm.wasm en el CDN; sin esto la DB falla silenciosamente
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

    // Crear / migrar esquema (idempotente)
    _applySchema();

    // Si era una DB nueva, guardar el estado inicial
    if (!savedDb) _persist();

    console.log('✅ Base de datos lista');
    return true;
  } catch (err) {
    console.error('❌ initDatabase:', err);
    return false;
  }
}

// ============================================================
// ESQUEMA  (solo CREATE IF NOT EXISTS + migraciones seguras)
// ============================================================

function _applySchema() {
  // Tabla de cuentas
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

  // Tabla de transacciones
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL,
      description TEXT    NOT NULL,
      accountId   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      accountName TEXT    NOT NULL,
      movement    TEXT    NOT NULL CHECK(movement IN ('Entrada','Salida')),
      amount      REAL    NOT NULL CHECK(amount > 0),
      currency    TEXT    NOT NULL DEFAULT 'MXN',
      createdAt   TEXT    NOT NULL
    )
  `);

  // Migración: columna currency en transactions si es una DB antigua
  try { db.run(`ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'MXN'`); }
  catch (_) { /* ya existe */ }

  // Tabla de auditoría
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
// PERSISTENCIA  (se llama UNA vez al final de cada acción)
// ============================================================

function _persist() {
  if (!db) return;
  try {
    const bytes = db.export();
    localStorage.setItem('sqliteDb', Array.from(bytes).join(','));
  } catch (err) {
    // QuotaExceededError u otro problema de almacenamiento
    console.error('❌ localStorage:', err);
    alert(
      '⚠️ No se pudo guardar en el almacenamiento local (cuota excedida).\n' +
      'Descarga una copia de seguridad con el botón 💾 antes de cerrar.'
    );
  }
}

// ============================================================
// AUDITORÍA  (interna, nunca persiste por sí sola)
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

/**
 * Agrega una cuenta y persiste.
 * Retorna { ok, error }
 */
function addAccount(name, type, balance, costType, currency) {
  const now = new Date().toISOString();
  try {
    db.run('BEGIN');
    db.run(
      `INSERT INTO accounts (name, type, balance, costType, currency, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, type, Number(balance) || 0, costType || null, currency || 'MXN', now, now]
    );
    _audit('INSERT', 'accounts', null, `Cuenta creada: ${name}`);
    db.run('COMMIT');
    _persist();
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ addAccount:', err);
    return { ok: false, error: err.message };
  }
}

/** Devuelve todas las cuentas ordenadas por nombre. */
function getAccounts() {
  try {
    return _rows(db.exec(`SELECT * FROM accounts ORDER BY name COLLATE NOCASE`));
  } catch (err) {
    console.error('❌ getAccounts:', err);
    return [];
  }
}

/** Devuelve una cuenta por ID, o null. */
function getAccountById(id) {
  try {
    const rows = _rows(db.exec(`SELECT * FROM accounts WHERE id = ?`, [id]));
    return rows[0] ?? null;
  } catch (err) {
    console.error('❌ getAccountById:', err);
    return null;
  }
}

/**
 * Elimina la cuenta y en cascada sus transacciones.
 * Retorna { ok, error }
 */
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
// TRANSACCIONES
// ============================================================

/**
 * Registra una transacción Y actualiza el saldo de la cuenta
 * en una sola transacción SQLite atómica.
 * Si cualquier paso falla, se hace ROLLBACK completo.
 * Retorna { ok, error }
 */
function registerTransaction(date, description, accountId, movement, amount, currency) {
  const account = getAccountById(accountId);
  if (!account) return { ok: false, error: 'Cuenta no encontrada' };

  const delta      = movement === 'Entrada' ? amount : -amount;
  const newBalance = account.balance + delta;
  const now        = new Date().toISOString();

  try {
    db.run('BEGIN');

    // 1. Actualizar saldo
    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, accountId]
    );

    // 2. Insertar transacción
    db.run(
      `INSERT INTO transactions
         (date, description, accountId, accountName, movement, amount, currency, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, description, accountId, account.name, movement, amount, currency || account.currency, now]
    );

    _audit('INSERT', 'transactions', null,
      `${movement} ${amount} ${currency} — ${description}`);

    db.run('COMMIT');
    _persist();                 // ← UN SOLO SAVE por acción completa
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ registerTransaction:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Elimina una transacción Y revierte el saldo de la cuenta
 * en una sola transacción SQLite atómica.
 * Retorna { ok, error }
 */
function removeTransaction(transactionId) {
  // Obtener la transacción antes de borrarla
  let txRows;
  try {
    txRows = _rows(db.exec(`SELECT * FROM transactions WHERE id = ?`, [transactionId]));
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const tx = txRows[0];
  if (!tx) return { ok: false, error: 'Transacción no encontrada' };

  const account = getAccountById(tx.accountId);
  if (!account) return { ok: false, error: 'Cuenta de la transacción no encontrada' };

  // Revertir: si fue Entrada la quitamos, si fue Salida la devolvemos
  const delta      = tx.movement === 'Entrada' ? -tx.amount : tx.amount;
  const newBalance = account.balance + delta;
  const now        = new Date().toISOString();

  try {
    db.run('BEGIN');

    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, account.id]
    );

    db.run(`DELETE FROM transactions WHERE id = ?`, [transactionId]);

    _audit('DELETE', 'transactions', transactionId,
      `Transacción eliminada, saldo revertido en cuenta ${account.name}`);

    db.run('COMMIT');
    _persist();                 // ← UN SOLO SAVE
    return { ok: true };
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ removeTransaction:', err);
    return { ok: false, error: err.message };
  }
}

/** Devuelve todas las transacciones más recientes primero. */
function getTransactions() {
  try {
    return _rows(db.exec(`SELECT * FROM transactions ORDER BY date DESC, id DESC`));
  } catch (err) {
    console.error('❌ getTransactions:', err);
    return [];
  }
}

// ============================================================
// GESTIÓN DE LA BASE DE DATOS (export / import / clear)
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

        // Migración: asegura que el esquema esté actualizado
        _applySchema();

        // Guardar DESPUÉS de migrar (importante: no antes)
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
  if (!confirm(
    '⚠️ ¿Eliminar TODA la base de datos?\n' +
    'Esta acción no se puede deshacer.'
  )) return false;

  try {
    db.run('BEGIN');
    db.run('DELETE FROM transactions');
    db.run('DELETE FROM accounts');
    db.run('DELETE FROM audit_log');
    // Resetear contadores AUTOINCREMENT para que los IDs vuelvan a 1
    try { db.run(`DELETE FROM sqlite_sequence`); } catch (_) {}
    db.run('COMMIT');
    _persist();
    return true;
  } catch (err) {
    try { db.run('ROLLBACK'); } catch (_) {}
    console.error('❌ clearDatabase:', err);
    return false;
  }
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

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
    console.error('❌ getDatabaseStats:', err);
    return { accounts: 0, transactions: 0, totalAmount: 0 };
  }
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

/**
 * Convierte el resultado de db.exec() en un array de objetos planos.
 * Si el resultado está vacío devuelve [].
 */
function _rows(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}
