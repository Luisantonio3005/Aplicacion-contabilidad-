import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingreso' | 'Gasto';
  costType: 'Fijo' | 'Variable' | 'Pasivo';
  initialBalance: number;
  currency: string;
  debits: Array<{ amount: number }>;
  credits: Array<{ amount: number }>;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  accountId: string;
  accountName: string;
  movement: 'Entrada' | 'Salida';
  amount: number;
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
  };

  const formatCurrency = (value: number) => {
    return Number(value).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getNormalBalanceType = (account: Account) => {
    if (account.type === 'Activo' || account.type === 'Gasto') return 'Debit';
    return 'Credit';
  };

  const computeBalance = (account: Account) => {
    const debits = account.debits.reduce((sum, item) => sum + item.amount, 0) +
      (getNormalBalanceType(account) === 'Debit' ? account.initialBalance : 0);
    const credits = account.credits.reduce((sum, item) => sum + item.amount, 0) +
      (getNormalBalanceType(account) === 'Credit' ? account.initialBalance : 0);
    return debits - credits;
  };

  const handleAddAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAccount: Account = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('account-name') as string,
      type: formData.get('account-type') as Account['type'],
      costType: formData.get('account-cost-type') as Account['costType'],
      initialBalance: Number(formData.get('account-balance')) || 0,
      currency: formData.get('account-currency') as string,
      debits: [],
      credits: [],
    };
    setAccounts([...accounts, newAccount]);
    (e.target as HTMLFormElement).reset();
  };

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const accountId = formData.get('transaction-account') as string;
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const amount = Number(formData.get('transaction-amount'));
    const movement = formData.get('transaction-movement') as 'Entrada' | 'Salida';

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: formData.get('transaction-date') as string,
      description: formData.get('transaction-description') as string,
      accountId,
      accountName: account.name,
      movement,
      amount,
    };

    setTransactions([...transactions, newTransaction]);

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === accountId) {
        if (movement === 'Entrada') {
          return { ...acc, debits: [...acc.debits, { amount }] };
        } else {
          return { ...acc, credits: [...acc.credits, { amount }] };
        }
      }
      return acc;
    });
    setAccounts(updatedAccounts);
    (e.target as HTMLFormElement).reset();
  };

  const removeTransaction = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    setTransactions(transactions.filter(t => t.id !== id));

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === transaction.accountId) {
        if (transaction.movement === 'Entrada') {
          return { ...acc, debits: acc.debits.slice(0, -1) };
        } else {
          return { ...acc, credits: acc.credits.slice(0, -1) };
        }
      }
      return acc;
    });
    setAccounts(updatedAccounts);
  };

  const totalDebits = transactions
    .filter(t => t.movement === 'Entrada')
    .reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions
    .filter(t => t.movement === 'Salida')
    .reduce((s, t) => s + t.amount, 0);

  const income = accounts
    .filter(a => a.type === 'Ingreso')
    .reduce((s, a) => s + computeBalance(a) * -1, 0);
  const expenses = accounts
    .filter(a => a.type === 'Gasto')
    .reduce((s, a) => s + computeBalance(a), 0);
  const netIncome = income - expenses;

  const assets = accounts
    .filter(a => a.type === 'Activo')
    .reduce((s, a) => s + computeBalance(a), 0);
  const liabilities = accounts
    .filter(a => a.type === 'Pasivo')
    .reduce((s, a) => s + computeBalance(a) * -1, 0);
  const equity = accounts
    .filter(a => a.type === 'Patrimonio')
    .reduce((s, a) => s + computeBalance(a) * -1, 0) + netIncome;

  return (
    <>
      <style>{`
        :root {
          --bg-primary: #f8fafc;
          --bg-secondary: #ffffff;
          --text-primary: #1f2937;
          --text-secondary: #4b5563;
          --text-tertiary: #6b7280;
          --border-color: #e5e7eb;
          --table-header-bg: #f3f4f6;
          --table-row-even-bg: #f9fafb;
          --input-bg: #ffffff;
          --input-border: #d1d5db;
          --input-text: #1f2937;
          --input-placeholder: #9ca3af;
          --button-primary: #2563eb;
          --button-primary-hover: #1d4ed8;
          --button-danger: #ef4444;
          --button-danger-hover: #dc2626;
          --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          --summary-bg: #f0f9ff;
          --summary-border: #bfdbfe;
          --summary-text: #1e40af;
          --income-bg: #f0fdf4;
          --income-border: #bbf7d0;
          --income-text: #166534;
          --theme-btn-border: #d1d5db;
          --theme-btn-hover: #f3f4f6;
          --theme-btn-text: #4b5563;
        }

        html[data-theme="dark"] {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-tertiary: #94a3b8;
          --border-color: #334155;
          --table-header-bg: #0f172a;
          --table-row-even-bg: #1a2332;
          --input-bg: #0f172a;
          --input-border: #475569;
          --input-text: #f1f5f9;
          --input-placeholder: #64748b;
          --button-primary: #3b82f6;
          --button-primary-hover: #2563eb;
          --button-danger: #ef4444;
          --button-danger-hover: #dc2626;
          --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
          --summary-bg: #0c2340;
          --summary-border: #1e3a8a;
          --summary-text: #93c5fd;
          --income-bg: #0c2818;
          --income-border: #166534;
          --income-text: #86efac;
          --theme-btn-border: #475569;
          --theme-btn-hover: #1e293b;
          --theme-btn-text: #cbd5e1;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          width: 100%;
          height: 100%;
        }

        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        h1, h2, h3, h4, h5, h6 {
          color: var(--text-primary);
          transition: color 0.3s ease;
        }

        p {
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }

        .container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          transition: all 0.3s ease;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 1rem;
        }

        .header-content h1 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .header-content p {
          font-size: 1rem;
          line-height: 1.6;
        }

        .theme-toggle {
          padding: 0.75rem;
          border: 1px solid var(--theme-btn-border);
          background-color: var(--bg-secondary);
          color: var(--theme-btn-text);
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .theme-toggle:hover {
          background-color: var(--theme-btn-hover);
          border-color: var(--button-primary);
        }

        .card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--card-shadow);
          transition: all 0.3s ease;
        }

        .card h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-tertiary);
        }

        input, select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--input-border);
          background-color: var(--input-bg);
          color: var(--input-text);
          border-radius: 0.5rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        input::placeholder, select {
          color: var(--input-placeholder);
        }

        input:focus, select:focus {
          outline: none;
          border-color: var(--button-primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        html[data-theme="dark"] input:focus,
        html[data-theme="dark"] select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        button {
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background-color: var(--button-primary);
          color: white;
          width: 100%;
        }

        .btn-primary:hover {
          background-color: var(--button-primary-hover);
        }

        .btn-danger {
          background-color: var(--button-danger);
          color: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          width: auto;
        }

        .btn-danger:hover {
          background-color: var(--button-danger-hover);
        }

        .table-wrapper {
          overflow-x: auto;
          margin-top: 1rem;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }

        th {
          background-color: var(--table-header-bg);
          color: var(--text-primary);
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          border: 1px solid var(--border-color);
          transition: all 0.3s ease;
        }

        td {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          transition: all 0.3s ease;
        }

        tbody tr:nth-child(even) {
          background-color: var(--table-row-even-bg);
        }

        tbody tr:hover {
          background-color: var(--table-row-even-bg);
        }

        .summary-box {
          background-color: var(--summary-bg);
          border: 1px solid var(--summary-border);
          color: var(--summary-text);
          padding: 1rem;
          border-radius: 0.5rem;
          margin-top: 1rem;
          transition: all 0.3s ease;
        }

        .summary-box div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .summary-box div:last-child {
          margin-bottom: 0;
        }

        .account-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .account-card h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .account-card .small {
          font-size: 0.875rem;
          font-weight: 400;
        }

        .account-card p {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .income-card {
          background-color: var(--income-bg);
          border: 1px solid var(--income-border);
          color: var(--income-text);
          padding: 1.5rem;
          border-radius: 0.75rem;
          transition: all 0.3s ease;
        }

        .income-card h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--income-text);
        }

        .income-card .stat {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        .income-card .stat:last-child {
          margin-bottom: 0;
        }

        .income-card .divider {
          border-top: 1px solid var(--income-border);
          padding-top: 0.75rem;
          margin-top: 0.75rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }

          .header {
            flex-direction: column;
          }

          .header-content h1 {
            font-size: 1.875rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .grid-2 {
            grid-template-columns: 1fr;
          }

          table {
            font-size: 0.85rem;
          }

          th, td {
            padding: 0.5rem;
          }
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1>Contabilidad con Cuentas T</h1>
            <p>Registra cuentas, transacciones de débito y crédito, y observa los saldos en formato Cuenta T.</p>
          </div>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        {/* Add Account Section */}
        <div className="card">
          <h2>1. Agregar cuenta</h2>
          <form onSubmit={handleAddAccount}>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre de la cuenta</label>
                <input
                  type="text"
                  name="account-name"
                  required
                  placeholder="Caja, Ventas, Compras..."
                />
              </div>
              <div className="form-group">
                <label>Tipo de cuenta</label>
                <select name="account-type" required>
                  <option value="">Selecciona un tipo</option>
                  <option value="Activo">Activo</option>
                  <option value="Pasivo">Pasivo</option>
                  <option value="Patrimonio">Patrimonio</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>
              <div className="form-group">
                <label>Saldo inicial</label>
                <input
                  type="number"
                  name="account-balance"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                />
              </div>
              <div className="form-group">
                <label>Clasificación</label>
                <select name="account-cost-type">
                  <option value="Fijo">Fijo</option>
                  <option value="Variable">Variable</option>
                  <option value="Pasivo">Pasivo</option>
                </select>
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <select name="account-currency">
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">Agregar cuenta</button>
              </div>
            </div>
          </form>
        </div>

        {/* Accounts List */}
        <div className="card">
          <h2>2. Lista de cuentas</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Clasificación</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>{acc.name}</td>
                    <td>{acc.type}</td>
                    <td>{acc.costType}</td>
                    <td>{formatCurrency(Math.abs(computeBalance(acc)))} {acc.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Transaction */}
        <div className="card">
          <h2>3. Registrar transacción</h2>
          <form onSubmit={handleAddTransaction}>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" name="transaction-date" required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  name="transaction-description"
                  required
                  placeholder="Venta de productos"
                />
              </div>
              <div className="form-group">
                <label>Cuenta</label>
                <select name="transaction-account" required>
                  <option value="">Seleccione cuenta</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Movimiento</label>
                <select name="transaction-movement" required>
                  <option value="">Selecciona movimiento</option>
                  <option value="Entrada">Entrada (Débito)</option>
                  <option value="Salida">Salida (Crédito)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Monto</label>
                <input
                  type="number"
                  name="transaction-amount"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue="0.00"
                />
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">Registrar transacción</button>
              </div>
            </div>
          </form>
        </div>

        {/* Transactions List */}
        <div className="card">
          <h2>4. Transacciones registradas</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th>Movimiento</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.date}</td>
                    <td>{tx.description}</td>
                    <td>{tx.accountName}</td>
                    <td>{tx.movement}</td>
                    <td>{formatCurrency(tx.amount)}</td>
                    <td>
                      <button
                        onClick={() => removeTransaction(tx.id)}
                        className="btn-danger"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <h2>5. Resumen de Cuentas T</h2>
          <div className="grid-2">
            {accounts.map(acc => (
              <div key={acc.id} className="account-card">
                <h3>
                  {acc.name} <span className="small">({acc.type})</span>
                </h3>
                <p><strong>Saldo:</strong> {formatCurrency(Math.abs(computeBalance(acc)))}</p>
                <p><strong>Clasificación:</strong> {acc.costType}</p>
              </div>
            ))}
          </div>
          <div className="summary-box">
            <div>
              <strong>Total Débito:</strong>
              <span>{formatCurrency(totalDebits)}</span>
            </div>
            <div>
              <strong>Total Crédito:</strong>
              <span>{formatCurrency(totalCredits)}</span>
            </div>
          </div>
        </div>

        {/* Financial Statements */}
        <div className="grid-2">
          {/* Income Statement */}
          <div className="income-card">
            <h2>Estado de Resultados</h2>
            <div className="stat">
              <span>Ingresos:</span>
              <span>{formatCurrency(income)}</span>
            </div>
            <div className="stat">
              <span>Gastos:</span>
              <span>{formatCurrency(expenses)}</span>
            </div>
            <div className="stat divider">
              <span>Utilidad / Pérdida:</span>
              <span>{formatCurrency(netIncome)}</span>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="income-card">
            <h2>Balance General</h2>
            <div className="stat">
              <span>Activos:</span>
              <span>{formatCurrency(assets)}</span>
            </div>
            <div className="stat">
              <span>Pasivos:</span>
              <span>{formatCurrency(liabilities)}</span>
            </div>
            <div className="stat">
              <span>Patrimonio:</span>
              <span>{formatCurrency(equity)}</span>
            </div>
            <div className="stat divider">
              <span>Pasivos + Patrimonio:</span>
              <span>{formatCurrency(liabilities + equity)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
