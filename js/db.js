// ========================================
// MÓDULO DE BASE DE DATOS SQLite
// Usando sql.js (SQLite en WebAssembly)
// ========================================

let db = null;
let SQL = null;

// Inicializar SQLite
async function initDatabase() {
  try {
    SQL = await initSqlJs();
    
    // Intentar cargar base de datos guardada
    const savedDb = localStorage.getItem('sqliteDb');
    
    if (savedDb) {
      // Cargar base de datos existente
      const data = new Uint8Array(savedDb.split(',').map(x => parseInt(x)));
      db = new SQL.Database(data);
    } else {
      // Crear nueva base de datos
      db = new SQL.Database();
      createSchema();
      saveDatabase();
    }
    
    console.log('✅ Base de datos SQLite inicializada');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    return false;
  }
}

// Crear esquema de tablas
function createSchema() {
  try {
    // Tabla de cuentas
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        balance REAL DEFAULT 0,
        costType TEXT,
        currency TEXT DEFAULT 'MXN',
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
    
    // Tabla de transacciones
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        accountId INTEGER NOT NULL,
        accountName TEXT NOT NULL,
        movement TEXT NOT NULL,
        amount REAL NOT NULL,
        createdAt TEXT,
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `);
    
    // Tabla de auditoría
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        details TEXT,
        timestamp TEXT
      )
    `);
    
    console.log('✅ Esquema de base de datos creado');
  } catch (error) {
    console.error('❌ Error al crear esquema:', error);
  }
}

// ========================================
// OPERACIONES CON CUENTAS
// ========================================

function addAccount(name, type, balance, costType, currency) {
  try {
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO accounts (name, type, balance, costType, currency, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, type, balance, costType, currency, now, now]
    );
    
    logAudit('INSERT', 'accounts', null, `Cuenta agregada: ${name}`);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('❌ Error al agregar cuenta:', error);
    return false;
  }
}

function getAccounts() {
  try {
    const result = db.exec(`SELECT * FROM accounts ORDER BY id DESC`);
    
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } catch (error) {
    console.error('❌ Error al obtener cuentas:', error);
    return [];
  }
}

function updateAccountBalance(accountId, newBalance) {
  try {
    const now = new Date().toISOString();
    
    db.run(
      `UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?`,
      [newBalance, now, accountId]
    );
    
    logAudit('UPDATE', 'accounts', accountId, `Saldo actualizado a ${newBalance}`);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar saldo:', error);
    return false;
  }
}

function deleteAccount(accountId) {
  try {
    db.run(`DELETE FROM accounts WHERE id = ?`, [accountId]);
    logAudit('DELETE', 'accounts', accountId, 'Cuenta eliminada');
    saveDatabase();
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar cuenta:', error);
    return false;
  }
}

// ========================================
// OPERACIONES CON TRANSACCIONES
// ========================================

function addTransaction(date, description, accountId, accountName, movement, amount) {
  try {
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO transactions (date, description, accountId, accountName, movement, amount, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, description, accountId, accountName, movement, amount, now]
    );
    
    logAudit('INSERT', 'transactions', null, `Transacción: ${description} - ${amount}`);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('❌ Error al agregar transacción:', error);
    return false;
  }
}

function getTransactions() {
  try {
    const result = db.exec(`SELECT * FROM transactions ORDER BY date DESC, id DESC`);
    
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error);
    return [];
  }
}

function deleteTransaction(transactionId) {
  try {
    db.run(`DELETE FROM transactions WHERE id = ?`, [transactionId]);
    logAudit('DELETE', 'transactions', transactionId, 'Transacción eliminada');
    saveDatabase();
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar transacción:', error);
    return false;
  }
}

// ========================================
// AUDITORÍA
// ========================================

function logAudit(action, tableName, recordId, details) {
  try {
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO audit_log (action, table_name, record_id, details, timestamp) 
       VALUES (?, ?, ?, ?, ?)`,
      [action, tableName, recordId, details, now]
    );
  } catch (error) {
    console.error('❌ Error al registrar auditoría:', error);
  }
}

function getAuditLog() {
  try {
    const result = db.exec(`SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100`);
    
    if (result.length === 0) return [];
    
    const columns = result[0].columns;
    const values = result[0].values;
    
    return values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } catch (error) {
    console.error('❌ Error al obtener auditoría:', error);
    return [];
  }
}

// ========================================
// ALMACENAMIENTO
// ========================================

function saveDatabase() {
  try {
    if (!db) return;
    
    const data = db.export();
    const arr = Array.from(data);
    localStorage.setItem('sqliteDb', arr.join(','));
    
    console.log('💾 Base de datos guardada');
  } catch (error) {
    console.error('❌ Error al guardar base de datos:', error);
  }
}

function exportDatabase() {
  try {
    if (!db) return null;
    
    const data = db.export();
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contabilidad-${new Date().toISOString().split('T')[0]}.db`;
    link.click();
    URL.revokeObjectURL(url);
    
    console.log('📥 Base de datos exportada');
    return true;
  } catch (error) {
    console.error('❌ Error al exportar base de datos:', error);
    return false;
  }
}

function importDatabase(file) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          db = new SQL.Database(data);
          
          // Guardar en localStorage
          const arr = Array.from(data);
          localStorage.setItem('sqliteDb', arr.join(','));
          
          console.log('📤 Base de datos importada');
          resolve(true);
        } catch (error) {
          console.error('❌ Error al procesar archivo:', error);
          resolve(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('❌ Error al importar base de datos:', error);
      resolve(false);
    }
  });
}

function clearDatabase() {
  try {
    if (confirm('⚠️ ¿Estás seguro de que deseas eliminar TODA la base de datos? Esta acción no se puede deshacer.')) {
      db.run(`DELETE FROM transactions`);
      db.run(`DELETE FROM accounts`);
      db.run(`DELETE FROM audit_log`);
      saveDatabase();
      
      console.log('🗑️ Base de datos limpiada');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
    return false;
  }
}

// ========================================
// ESTADÍSTICAS
// ========================================

function getDatabaseStats() {
  try {
    const accountsCount = db.exec(`SELECT COUNT(*) as count FROM accounts`)[0].values[0][0];
    const transactionsCount = db.exec(`SELECT COUNT(*) as count FROM transactions`)[0].values[0][0];
    const totalAmount = db.exec(`SELECT SUM(amount) as total FROM transactions`)[0].values[0][0] || 0;
    
    return {
      accounts: accountsCount,
      transactions: transactionsCount,
      totalAmount: totalAmount
    };
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return { accounts: 0, transactions: 0, totalAmount: 0 };
  }
}
