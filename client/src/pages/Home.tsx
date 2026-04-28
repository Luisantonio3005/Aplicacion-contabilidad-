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

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
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

    // Update account debits/credits
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

  // Calculations
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
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark-mode' : ''}`}>
      <style>{`
        :root {
          --bg-primary: #f8fafc;
          --bg-secondary: #ffffff;
          --text-primary: #1f2937;
          --text-secondary: #4b5563;
          --text-tertiary: #374151;
          --border-color: #e5e7eb;
          --table-header-bg: #f3f4f6;
          --table-row-even-bg: #f8fafc;
          --shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
          --button-bg: #2563eb;
          --button-hover: #1d4ed8;
        }

        body.dark-mode {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-tertiary: #94a3b8;
          --border-color: #334155;
          --table-header-bg: #1e293b;
          --table-row-even-bg: #0f172a;
          --shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
          --button-bg: #3b82f6;
          --button-hover: #2563eb;
        }

        html.dark-mode {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }

        body.dark-mode {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }

        .dark-mode h2 {
          color: var(--text-primary);
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Contabilidad con Cuentas T</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Registra cuentas, transacciones de débito y crédito, y observa los saldos en formato Cuenta T.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        {/* Add Account Section */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">1. Agregar cuenta</h2>
          <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre de la cuenta</label>
              <input
                type="text"
                name="account-name"
                required
                placeholder="Caja, Ventas, Compras..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de cuenta</label>
              <select
                name="account-type"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Clasificación</label>
              <select
                name="account-cost-type"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Agregar cuenta
              </Button>
            </div>
          </form>
        </Card>

        {/* Accounts List */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">2. Lista de cuentas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2 px-4 font-semibold">Cuenta</th>
                  <th className="text-left py-2 px-4 font-semibold">Tipo</th>
                  <th className="text-left py-2 px-4 font-semibold">Clasificación</th>
                  <th className="text-left py-2 px-4 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={`border-b border-gray-200 dark:border-gray-700 ${
                      idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : ''
                    }`}
                  >
                    <td className="py-2 px-4">{acc.name}</td>
                    <td className="py-2 px-4">{acc.type}</td>
                    <td className="py-2 px-4">{acc.costType}</td>
                    <td className="py-2 px-4">
                      {formatCurrency(Math.abs(computeBalance(acc)))} {acc.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Transaction */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">3. Registrar transacción</h2>
          <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <input
                type="date"
                name="transaction-date"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <input
                type="text"
                name="transaction-description"
                required
                placeholder="Venta de productos"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cuenta</label>
              <select
                name="transaction-account"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Registrar transacción
              </Button>
            </div>
          </form>
        </Card>

        {/* Transactions List */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">4. Transacciones registradas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2 px-4 font-semibold">Fecha</th>
                  <th className="text-left py-2 px-4 font-semibold">Descripción</th>
                  <th className="text-left py-2 px-4 font-semibold">Cuenta</th>
                  <th className="text-left py-2 px-4 font-semibold">Movimiento</th>
                  <th className="text-left py-2 px-4 font-semibold">Monto</th>
                  <th className="text-left py-2 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`border-b border-gray-200 dark:border-gray-700 ${
                      idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : ''
                    }`}
                  >
                    <td className="py-2 px-4">{tx.date}</td>
                    <td className="py-2 px-4">{tx.description}</td>
                    <td className="py-2 px-4">{tx.accountName}</td>
                    <td className="py-2 px-4">{tx.movement}</td>
                    <td className="py-2 px-4">{formatCurrency(tx.amount)}</td>
                    <td className="py-2 px-4">
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
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">5. Resumen de Cuentas T</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
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
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
          <Card className="p-6 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
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
              <div className="border-t border-blue-300 dark:border-blue-700 pt-2 mt-2 flex justify-between font-semibold">
                <span>Utilidad / Pérdida:</span>
                <span>{formatCurrency(netIncome)}</span>
              </div>
            </div>
          </Card>

          {/* Balance Sheet */}
          <Card className="p-6 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold mb-4 text-green-900 dark:text-green-100">
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
              <div className="border-t border-green-300 dark:border-green-700 pt-2 mt-2 flex justify-between font-semibold">
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
