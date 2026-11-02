import React, { useState, useMemo } from 'react';
import { parseMoney } from '../utils/amount';
import { Target, Plus, Pencil, Trash2, AlertTriangle, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { Budget, Transaction, CategoryItem } from '../types';
import { toISODate, getWeekRange } from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: CategoryItem[];
  reportingCurrency?: string;
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

export function BudgetsView({
  budgets,
  transactions,
  categories,
  reportingCurrency = 'INR',
  onSaveBudget,
  onDeleteBudget,
}: BudgetsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form State
  const [category, setCategory] = useState('Overall');
  const [period, setPeriod] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [amount, setAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [allowRollover, setAllowRollover] = useState(false);

  // Calculate Start & End Date for Monthly vs Weekly
  const now = new Date();
  const currentMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const currentMonthEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const { startStr: currentWeekStart, endStr: currentWeekEnd } = getWeekRange(now);

  // Compute spent amount for each budget using converted reporting amounts
  const budgetAnalytics = useMemo(() => {
    return budgets.map((b) => {
      const startDate = b.period === 'Weekly' ? currentWeekStart : currentMonthStart;
      const endDate = b.period === 'Weekly' ? currentWeekEnd : currentMonthEnd;

      let spent = 0;
      for (const t of transactions) {
        if (t.type === 'Expense' && t.date >= startDate && t.date <= endDate) {
          if (b.category === 'Overall' || t.category === b.category) {
            spent += (t.reportingAmount ?? t.amount);
          }
        }
      }

      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const remaining = Math.max(0, b.amount - spent);
      const isExceeded = spent > b.amount;
      const isWarning = pct >= b.alertThreshold && !isExceeded;

      return {
        ...b,
        currency: b.currency || reportingCurrency,
        spent,
        pct: Math.min(100, pct),
        actualPct: pct,
        remaining,
        isExceeded,
        isWarning,
      };
    });
  }, [budgets, transactions, currentMonthStart, currentMonthEnd, currentWeekStart, currentWeekEnd, reportingCurrency]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setCategory('Overall');
    setPeriod('Monthly');
    setAmount('');
    setAlertThreshold('80');
    setAllowRollover(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setCategory(b.category);
    setPeriod(b.period);
    setAmount(b.amount.toString());
    setAlertThreshold(b.alertThreshold.toString());
    setAllowRollover(b.allowRollover || false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoney(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid budget amount.');
      return;
    }

    const newBudget: Budget = {
      id: editingBudget?.id || `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      period,
      amount: parsedAmount,
      currency: reportingCurrency,
      alertThreshold: parseInt(alertThreshold, 10) || 80,
      allowRollover,
    };

    onSaveBudget(newBudget);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Budget Management & Spending Limits
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set weekly or monthly spending caps in {reportingCurrency} with automated alert thresholds
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Budget</span>
        </button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgetAnalytics.map((b) => (
          <div
            key={b.id}
            className={`rounded-2xl p-5 border bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between transition ${
              b.isExceeded
                ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                : b.isWarning
                ? 'border-amber-300 dark:border-amber-900/60 ring-1 ring-amber-500/20'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {b.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.period}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Alert threshold at {b.alertThreshold}% · {b.currency}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1 rounded text-slate-400 hover:text-emerald-600"
                    title="Edit budget"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete budget for "${b.category}"?`)) {
                        onDeleteBudget(b.id);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                    title="Delete budget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Amount Figures */}
              <div className="my-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Spent</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(b.spent, b.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Limit</div>
                  <div className="text-sm font-semibold font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {formatCurrency(b.amount, b.currency)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    b.isExceeded
                      ? 'bg-rose-600'
                      : b.isWarning
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${b.pct}%` }}
                />
              </div>

              {/* Footer status text */}
              <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span
                  className={`font-semibold ${
                    b.isExceeded
                      ? 'text-rose-600 dark:text-rose-400'
                      : b.isWarning
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {b.isExceeded
                    ? `Over by ${formatCurrency(b.spent - b.amount, b.currency)}`
                    : `${formatCurrency(b.remaining, b.currency)} remaining`}
                </span>
                <span className="font-mono text-slate-400 text-[11px]">
                  {b.actualPct.toFixed(1)}% used
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create/Edit Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBudget ? 'Edit Budget Limit' : 'Create Budget Limit'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                >
                  <option value="Overall">Overall (All Expenses)</option>
                  {categories
                    .filter((c) => c.type === 'Expense' || c.type === 'Both')
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Budget Period
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as 'Monthly' | 'Weekly')}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly (Mon–Sun)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Spending Limit Amount ({reportingCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Warning Alert Threshold (%)
                </label>
                <select
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                >
                  <option value="75">75% of budget</option>
                  <option value="80">80% of budget</option>
                  <option value="85">85% of budget</option>
                  <option value="90">90% of budget</option>
                  <option value="100">100% (Strict Limit)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
