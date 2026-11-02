import React, { useState } from 'react';
import { CalendarClock, Plus, Pencil, Trash2, CheckCircle2, PauseCircle, PlayCircle, AlertCircle, X } from 'lucide-react';
import { RecurringBill, PaymentMethod, Account, CategoryItem } from '../types';
import { PAYMENT_METHODS, toISODate } from '../utils/currency';
import { parseMoney } from '../utils/amount';
import { formatCurrency } from '../utils/currencyFormatter';

interface RecurringViewProps {
  recurring: RecurringBill[];
  accounts: Account[];
  categories: CategoryItem[];
  reportingCurrency?: string;
  onSaveRecurring: (bill: RecurringBill) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleActive: (id: string) => void;
  onLogPayment: (bill: RecurringBill) => void;
}

export function RecurringView({
  recurring,
  accounts,
  categories,
  reportingCurrency = 'INR',
  onSaveRecurring,
  onDeleteRecurring,
  onToggleActive,
  onLogPayment,
}: RecurringViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Expense' | 'Income'>('Expense');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');

  const todayStr = toISODate(new Date());

  const handleOpenAdd = () => {
    setEditingBill(null);
    setTitle('');
    setAmount('');
    setType('Expense');
    const firstCat = categories.find((c) => c.type === 'Expense')?.name || 'House Rent';
    setCategory(firstCat);
    setFrequency('Monthly');
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    setNextDueDate(toISODate(nextMonth));
    setPaymentMethod('UPI');
    setAccountId(accounts[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: RecurringBill) => {
    setEditingBill(b);
    setTitle(b.title);
    setAmount(b.amount.toString());
    setType(b.type);
    setCategory(b.category);
    setFrequency(b.frequency);
    setNextDueDate(b.nextDueDate);
    setPaymentMethod(b.paymentMethod);
    setAccountId(b.accountId);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoney(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }

    const newBill: RecurringBill = {
      id: editingBill?.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      amount: parsedAmount,
      currency: reportingCurrency,
      type,
      category,
      frequency,
      nextDueDate: nextDueDate || toISODate(new Date()),
      paymentMethod,
      accountId,
      isActive: editingBill ? editingBill.isActive : true,
    };

    onSaveRecurring(newBill);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recurring Bills & Automated Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep track of monthly rent, subscriptions, utility bills, investments, and salary in {reportingCurrency}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Recurring Item</span>
        </button>
      </div>

      {/* Recurring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recurring.map((bill) => {
          const isOverdue = bill.isActive && bill.nextDueDate < todayStr;
          const isDueToday = bill.isActive && bill.nextDueDate === todayStr;
          const billCur = bill.currency || reportingCurrency;

          return (
            <div
              key={bill.id}
              className={`rounded-2xl p-5 border bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between transition ${
                !bill.isActive
                  ? 'opacity-60 border-slate-200 dark:border-slate-800'
                  : isOverdue
                  ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                  : isDueToday
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{bill.title}</span>
                      {!bill.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Paused
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {bill.category} · {bill.frequency} · {bill.paymentMethod}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleActive(bill.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title={bill.isActive ? 'Pause recurring' : 'Resume recurring'}
                    >
                      {bill.isActive ? (
                        <PauseCircle className="w-4 h-4 text-slate-400" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(bill)}
                      className="p-1 text-slate-400 hover:text-emerald-600"
                      title="Edit recurring item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete recurring bill "${bill.title}"?`)) {
                          onDeleteRecurring(bill.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete recurring item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="my-3 flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">Scheduled Amount</div>
                    <div
                      className={`text-xl font-bold font-mono tabular-nums ${
                        bill.type === 'Income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {bill.type === 'Income' ? '+' : ''}
                      {formatCurrency(bill.amount, billCur)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Next Due Date</div>
                    <div
                      className={`text-xs font-bold font-mono ${
                        isOverdue
                          ? 'text-rose-600 dark:text-rose-400'
                          : isDueToday
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {bill.nextDueDate}
                    </div>
                  </div>
                </div>

                {isOverdue && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-semibold mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Payment overdue!</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {bill.lastLoggedDate ? `Last logged: ${bill.lastLoggedDate}` : 'Not logged yet'}
                </span>
                <button
                  onClick={() => onLogPayment(bill)}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                  Log Transaction Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create / Edit Recurring Bill */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBill ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. House Rent, Netflix, Salary"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Amount ({reportingCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 22000"
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  >
                    {categories
                      .filter((c) => c.type === type || c.type === 'Both')
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
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
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
