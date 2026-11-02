import React, { useState } from 'react';
import { PiggyBank, Plus, Pencil, Trash2, Calendar, ArrowUpRight, ArrowDownRight, X, Archive, Globe } from 'lucide-react';
import { SavingsGoal, Account } from '../types';
import { toISODate } from '../utils/currency';
import { parseMoney } from '../utils/amount';
import { formatCurrency } from '../utils/currencyFormatter';
import { CurrencySelect } from './CurrencySelect';
import { getCurrencyInfo } from '../data/currencies';

interface GoalsViewProps {
  goals: SavingsGoal[];
  accounts: Account[];
  reportingCurrency?: string;
  onSaveGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
  onContribute: (goalId: string, amount: number, accountId: string, isWithdrawal?: boolean) => void;
}

export function GoalsView({
  goals,
  accounts,
  reportingCurrency = 'INR',
  onSaveGoal,
  onDeleteGoal,
  onContribute,
}: GoalsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Contribute Modal
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
  const [isWithdrawal, setIsWithdrawal] = useState(false);

  // Goal Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [goalCurrency, setGoalCurrency] = useState(reportingCurrency);
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('Savings');
  const [notes, setNotes] = useState('');
  const [isCurrencySelectOpen, setIsCurrencySelectOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setGoalCurrency(reportingCurrency);
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setDeadline(toISODate(d));
    setCategory('General');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setGoalCurrency(g.currency || reportingCurrency);
    setDeadline(g.deadline);
    setCategory(g.category || 'General');
    setNotes(g.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseMoney(targetAmount);
    const current = parseMoney(currentAmount) || 0;
    if (isNaN(target) || target <= 0) {
      alert('Please enter a valid target amount.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a goal name.');
      return;
    }

    const newGoal: SavingsGoal = {
      id: editingGoal?.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      currency: goalCurrency,
      deadline: deadline || toISODate(new Date(Date.now() + 180 * 86400000)),
      category,
      notes: notes.trim() || undefined,
    };

    onSaveGoal(newGoal);
    setIsModalOpen(false);
  };

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const amt = parseMoney(contributeAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    onContribute(contributeGoal.id, amt, selectedAccount, isWithdrawal);
    setContributeGoal(null);
    setContributeAmount('');
  };

  // Helper to calculate monthly required savings
  const calculateRequiredMonthly = (goal: SavingsGoal) => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    if (remaining <= 0) return 0;

    const targetDate = new Date(goal.deadline);
    const today = new Date();
    const diffMonths =
      (targetDate.getFullYear() - today.getFullYear()) * 12 +
      (targetDate.getMonth() - today.getMonth());

    if (diffMonths <= 1) return remaining;
    return remaining / diffMonths;
  };

  const curInfo = getCurrencyInfo(goalCurrency);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Savings Goals & Targets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track emergency funds, vacations, education, and milestones in any world currency
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const gCur = goal.currency || reportingCurrency;
          const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const monthlyReq = calculateRequiredMonthly(goal);
          const isComplete = goal.currentAmount >= goal.targetAmount;

          return (
            <div
              key={goal.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {goal.name}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {gCur}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>Target: {goal.deadline}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1 text-slate-400 hover:text-emerald-600"
                      title="Edit goal"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete goal "${goal.name}"?`)) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress amount figures */}
                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Saved</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(goal.currentAmount, gCur)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Target</div>
                    <div className="text-sm font-semibold font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatCurrency(goal.targetAmount, gCur)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? 'bg-emerald-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span>{pct.toFixed(0)}% reached</span>
                  <span>{isComplete ? 'Goal Completed!' : `${formatCurrency(remaining, gCur)} remaining`}</span>
                </div>

                {/* Monthly recommendation */}
                {!isComplete && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                    Save ~<strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(monthlyReq, gCur)}</strong>/month to hit target on time.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => {
                    setContributeGoal(goal);
                    setIsWithdrawal(false);
                    setContributeAmount('');
                  }}
                  className="flex-1 py-1.5 px-3 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition text-center"
                >
                  + Add Funds
                </button>
                <button
                  onClick={() => {
                    setContributeGoal(goal);
                    setIsWithdrawal(true);
                    setContributeAmount('');
                  }}
                  className="py-1.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  title="Withdraw from goal"
                >
                  Withdraw
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create/Edit Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund, Japan Trip, Down Payment"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Currency
                </label>
                <button
                  type="button"
                  onClick={() => setIsCurrencySelectOpen(true)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-semibold text-xs"
                >
                  <span>
                    {curInfo.flag} {goalCurrency} · {curInfo.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{curInfo.symbol}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Target ({curInfo.symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 200000"
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Currently Saved ({curInfo.symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Target Deadline Date
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                >
                  <option value="Emergency">Emergency Fund</option>
                  <option value="Travel">Travel & Vacations</option>
                  <option value="Vehicle">Vehicle Purchase</option>
                  <option value="Home">Home & Property</option>
                  <option value="Education">Education & Learning</option>
                  <option value="Investments">Wealth Creation</option>
                  <option value="General">General Savings</option>
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
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Contribute / Withdraw Funds */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isWithdrawal ? 'Withdraw from Goal' : 'Add Funds to Goal'}
              </h3>
              <button onClick={() => setContributeGoal(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleContributeSubmit} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Goal: <strong className="text-slate-900 dark:text-white">{contributeGoal.name}</strong> ({contributeGoal.currency || reportingCurrency})
              </p>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-slate-900 dark:text-white font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {isWithdrawal ? 'Deposit into Account' : 'Deduct from Account'}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                >
                  {accounts
                    .filter((a) => a.type !== 'Credit Card')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, a.currency || reportingCurrency)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="px-4 py-2 font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirm {isWithdrawal ? 'Withdrawal' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency Selector Modal */}
      <CurrencySelect
        isOpen={isCurrencySelectOpen}
        onClose={() => setIsCurrencySelectOpen(false)}
        selectedCurrency={goalCurrency}
        onSelectCurrency={(code: string) => setGoalCurrency(code)}
        title="Select Goal Currency"
      />
    </div>
  );
}
