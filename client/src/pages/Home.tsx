import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
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
    <div
      className={`min-h-screen transition-all duration-300 ${
        isDarkMode ? 'dark-bg' : 'light-bg'
      }`}
    >
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 100%;
          height: 100%;
        }

        .light-bg {
          background-color: #f8fafc;
          color: #1f2937;
        }

        .dark-bg {
          background-color: #0f172a;
          color: #f1f5f9;
        }

        .light-bg h1, .light-bg h2, .light-bg h3 {
          color: #1f2937;
        }

        .dark-bg h1, .dark-bg h2, .dark-bg h3 {
          color: #f1f5f9;
        }

        .light-bg p {
          color: #4b5563;
        }

        .dark-bg p {
          color: #cbd5e1;
        }

        .light-card {
          background-color: #ffffff;
          border-color: #e5e7eb;
          color: #1f2937;
        }

        .dark-card {
          background-color: #1e293b;
          border-color: #334155;
          color: #f1f5f9;
        }

        .light-input {
          background-color: #ffffff;
          border-color: #d1d5db;
          color: #1f2937;
        }

        .light-input::placeholder {
          color: #9ca3af;
        }

        .dark-input {
          background-color: #0f172a;
          border-color: #475569;
          color: #f1f5f9;
        }

        .dark-input::placeholder {
          color: #64748b;
        }

        .light-table {
          background-color: #ffffff;
          border-color: #e5e7eb;
        }

        .light-table th {
          background-color: #f3f4f6;
          color: #1f2937;
        }

        .light-table td {
          color: #1f2937;
          border-color: #e5e7eb;
        }

        .dark-table {
          background-color: #1e293b;
          border-color: #334155;
        }

        .dark-table th {
          background-color: #0f172a;
          color: #f1f5f9;
        }

        .dark-table td {
          color: #f1f5f9;
          border-color: #334155;
        }

        .light-btn {
          background-color: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .light-btn:hover {
          background-color: #1d4ed8;
        }

        .dark-btn {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .dark-btn:hover {
          background-color: #2563eb;
        }

        .light-summary {
          background-color: #f0f9ff;
          border-color: #bfdbfe;
          color: #1e40af;
        }

        .dark-summary {
          background-color: #0c2340;
          border-color: #1e3a8a;
          color: #93c5fd;
        }

        .light-income {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        .dark-income {
          background-color: #0c2818;
          border-color: #166534;
          color: #86efac;
        }

        .light-balance {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        }

        .dark-balance {
          background-color: #0c2818;
          border-color: #166534;
          color: #86efac;
        }

        input, select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid;
          border-radius: 8px;
          font-size: 14px;
        }

        button {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border: 1px solid;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Contabilidad con Cuentas T</h1>
            <p>
              Registra cuentas, transacciones de débito y crédito, y observa los saldos en formato Cuenta T.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode
                ? 'border-slate-600 hover:bg-slate-800 text-yellow-400'
                : 'border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        {/* Add Account Section */}
        <Card className={`p-6 mb-6 border rounded-lg ${
          isDarkMode ? 'dark-card' : 'light-card'
        }`}>
          <h2 className="text-xl font-semibold mb-4">1. Agregar cuenta</h2>
          <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la cuenta</label>
              <input
                type="text"
                name="account-name"
                required
                placeholder="Caja, Ventas, Compras..."
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de cuenta</label>
              <select
                name="account-type"
                required
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              >
                <option value="">Selecciona un tipo</option>
                <option value="Activo">Activo</option>
                <option value="Pasivo">Pasivo</option>
                <option value="Patrimonio">Patrimonio</option>
                <option value="Ingreso">Ingreso</option>
                <option value="Gasto">Gasto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Saldo inicial</label>
              <input
                type="number"
                name="account-balance"
                min="0"
                step="0.01"
                defaultValue="0"
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Clasificación</label>
              <select
                name="account-cost-type"
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              >
                <option value="Fijo">Fijo</option>
                <option value="Variable">Variable</option>
                <option value="Pasivo">Pasivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Moneda</label>
              <select
                name="account-currency"
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className={`w-full ${isDarkMode ? 'dark-btn' : 'light-btn'}`}>
                Agregar cuenta
              </button>
            </div>
          </form>
        </Card>

        {/* Accounts List */}
        <Card className={`p-6 mb-6 border rounded-lg ${
          isDarkMode ? 'dark-card' : 'light-card'
        }`}>
          <h2 className="text-xl font-semibold mb-4">2. Lista de cuentas</h2>
          <div className="overflow-x-auto">
            <table className={isDarkMode ? 'dark-table' : 'light-table'}>
              <thead>
                <tr>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Clasificación</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, idx) => (
                  <tr key={acc.id}>
                    <td>{acc.name}</td>
                    <td>{acc.type}</td>
                    <td>{acc.costType}</td>
                    <td>
                      {formatCurrency(Math.abs(computeBalance(acc)))} {acc.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Transaction */}
        <Card className={`p-6 mb-6 border rounded-lg ${
          isDarkMode ? 'dark-card' : 'light-card'
        }`}>
          <h2 className="text-xl font-semibold mb-4">3. Registrar transacción</h2>
          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                name="transaction-date"
                required
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <input
                type="text"
                name="transaction-description"
                required
                placeholder="Venta de productos"
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cuenta</label>
              <select
                name="transaction-account"
                required
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              >
                <option value="">Seleccione cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Movimiento</label>
              <select
                name="transaction-movement"
                required
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              >
                <option value="">Selecciona movimiento</option>
                <option value="Entrada">Entrada (Débito)</option>
                <option value="Salida">Salida (Crédito)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Monto</label>
              <input
                type="number"
                name="transaction-amount"
                min="0.01"
                step="0.01"
                required
                defaultValue="0.00"
                className={`${isDarkMode ? 'dark-input' : 'light-input'}`}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className={`w-full ${isDarkMode ? 'dark-btn' : 'light-btn'}`}>
                Registrar transacción
              </button>
            </div>
          </form>
        </Card>

        {/* Transactions List */}
        <Card className={`p-6 mb-6 border rounded-lg ${
          isDarkMode ? 'dark-card' : 'light-card'
        }`}>
          <h2 className="text-xl font-semibold mb-4">4. Transacciones registradas</h2>
          <div className="overflow-x-auto">
            <table className={isDarkMode ? 'dark-table' : 'light-table'}>
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
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary */}
        <Card className={`p-6 mb-6 border rounded-lg ${
          isDarkMode ? 'dark-card' : 'light-card'
        }`}>
          <h2 className="text-xl font-semibold mb-4">5. Resumen de Cuentas T</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`p-4 border rounded-lg ${
                  isDarkMode ? 'dark-card' : 'light-card'
                }`}
              >
                <div className="font-semibold mb-2">
                  {acc.name} <span className="text-sm font-normal">({acc.type})</span>
                </div>
                <div className="text-sm">
                  <div>Saldo: {formatCurrency(Math.abs(computeBalance(acc)))}</div>
                  <div>Clasificación: {acc.costType}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={`p-4 rounded-lg border ${
            isDarkMode ? 'dark-summary' : 'light-summary'
          }`}>
            <div className="flex justify-between mb-2">
              <strong>Total Débito:</strong>
              <span>{formatCurrency(totalDebits)}</span>
            </div>
            <div className="flex justify-between">
              <strong>Total Crédito:</strong>
              <span>{formatCurrency(totalCredits)}</span>
            </div>
          </div>
        </Card>

        {/* Financial Statements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Statement */}
          <Card className={`p-6 border rounded-lg ${
            isDarkMode ? 'dark-income' : 'light-income'
          }`}>
            <h2 className="text-xl font-semibold mb-4">
              Estado de Resultados
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ingresos:</span>
                <span>{formatCurrency(income)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gastos:</span>
                <span>{formatCurrency(expenses)}</span>
              </div>
              <div className={`border-t pt-2 mt-2 flex justify-between font-semibold ${
                isDarkMode ? 'border-green-700' : 'border-green-300'
              }`}>
                <span>Utilidad / Pérdida:</span>
                <span>{formatCurrency(netIncome)}</span>
              </div>
            </div>
          </Card>

          {/* Balance Sheet */}
          <Card className={`p-6 border rounded-lg ${
            isDarkMode ? 'dark-balance' : 'light-balance'
          }`}>
            <h2 className="text-xl font-semibold mb-4">
              Balance General
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Activos:</span>
                <span>{formatCurrency(assets)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pasivos:</span>
                <span>{formatCurrency(liabilities)}</span>
              </div>
              <div className="flex justify-between">
                <span>Patrimonio:</span>
                <span>{formatCurrency(equity)}</span>
              </div>
              <div className={`border-t pt-2 mt-2 flex justify-between font-semibold ${
                isDarkMode ? 'border-green-700' : 'border-green-300'
              }`}>
                <span>Pasivos + Patrimonio:</span>
                <span>{formatCurrency(liabilities + equity)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
