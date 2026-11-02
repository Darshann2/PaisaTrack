import React, { useState, useEffect, useId } from 'react';
import {
  Wallet,
  X,
  Check,
  Building2,
  Banknote,
  CreditCard,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Layers,
  IndianRupee,
  Plus,
} from 'lucide-react';
import { Account, AccountType } from '../types';
import { formatINR } from '../utils/currency';

interface EditBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSaveAccounts: (updatedAccounts: Account[]) => Promise<void> | void;
  onNavigateToAccounts?: () => void;
}

export function EditBalanceModal({
  isOpen,
  onClose,
  accounts,
  onSaveAccounts,
  onNavigateToAccounts,
}: EditBalanceModalProps) {
  const targetInputId = useId();
  const applyAccountId = useId();

  const [localAccounts, setLocalAccounts] = useState<Account[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('Savings');
  const [newAccBalance, setNewAccBalance] = useState('0');

  // Filter only liquid / non-credit accounts that contribute to Available Balance
  const liquidAccounts = localAccounts.filter((a) => a.type !== 'Credit Card');
  const defaultAccount =
    liquidAccounts.find((a) => a.isDefault) || liquidAccounts[0] || localAccounts[0];

  const currentTotal = liquidAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // Tab: 'quick' (single total) vs 'by_account' (breakdown)
  const [activeTab, setActiveTab] = useState<'quick' | 'by_account'>('quick');

  // Quick total adjustment state
  const [targetTotal, setTargetTotal] = useState<string>(currentTotal.toString());
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    defaultAccount?.id || ''
  );

  // Itemized breakdown state
  const [accountBalances, setAccountBalances] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setLocalAccounts(accounts.map((a) => ({ ...a })));
      const initialLiquid = accounts.filter((a) => a.type !== 'Credit Card');
      const initTotal = initialLiquid.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
      setTargetTotal(initTotal.toString());
      const defAcc = initialLiquid.find((a) => a.isDefault) || initialLiquid[0] || accounts[0];
      if (defAcc) {
        setSelectedAccountId(defAcc.id);
      }
      const initialMap: Record<string, string> = {};
      accounts.forEach((a) => {
        initialMap[a.id] = (a.balance ?? 0).toString();
      });
      setAccountBalances(initialMap);
      setErrorMsg(null);
      setIsSaving(false);
      setIsAddingAccount(false);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  // Calculated itemized total
  const itemizedTotal = liquidAccounts.reduce((sum, a) => {
    const val = parseFloat(accountBalances[a.id] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const parsedTarget = parseFloat(targetTotal);
  const quickDifference = isNaN(parsedTarget) ? 0 : parsedTarget - currentTotal;

  const handleApplyShortcut = (amount: number) => {
    const current = parseFloat(targetTotal) || currentTotal;
    setTargetTotal(Math.max(0, current + amount).toString());
  };

  const handleAddNewAccountInline = () => {
    if (!newAccName.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }
    const balNum = parseFloat(newAccBalance);
    if (isNaN(balNum)) {
      setErrorMsg('Please enter a valid numeric opening balance.');
      return;
    }
    const newId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAcc: Account = {
      id: newId,
      name: newAccName.trim(),
      type: newAccType,
      balance: balNum,
      currency: 'INR',
      isDefault: localAccounts.length === 0,
    };
    const updated = [...localAccounts, newAcc];
    setLocalAccounts(updated);
    setAccountBalances((prev) => ({ ...prev, [newId]: balNum.toString() }));
    if (!selectedAccountId) {
      setSelectedAccountId(newId);
    }
    setNewAccName('');
    setNewAccBalance('0');
    setIsAddingAccount(false);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      if (activeTab === 'quick') {
        const newTotal = parseFloat(targetTotal);
        if (isNaN(newTotal) || newTotal < 0) {
          setErrorMsg('Please enter a valid non-negative numeric balance.');
          setIsSaving(false);
          return;
        }

        if (liquidAccounts.length === 0) {
          // Genuinely new user with no accounts configuring their opening balance
          const newAcc: Account = {
            id: `acc_${Date.now()}`,
            name: 'Primary Bank Account',
            type: 'Savings',
            balance: newTotal,
            currency: 'INR',
            isDefault: true,
          };
          await onSaveAccounts([newAcc]);
          onClose();
          return;
        }

        const targetAccount = localAccounts.find((a) => a.id === selectedAccountId);
        if (!targetAccount) {
          setErrorMsg('Please select an account to apply the balance adjustment to.');
          setIsSaving(false);
          return;
        }

        // Adjust the selected account so that the new total matches targetTotal
        const newAccountBalance = targetAccount.balance + quickDifference;
        const updated = localAccounts.map((a) =>
          a.id === selectedAccountId ? { ...a, balance: newAccountBalance } : a
        );

        await onSaveAccounts(updated);
      } else {
        // By-account itemized saving
        const updated = localAccounts.map((a) => {
          if (accountBalances[a.id] !== undefined) {
            const parsed = parseFloat(accountBalances[a.id]);
            return {
              ...a,
              balance: isNaN(parsed) ? a.balance : parsed,
            };
          }
          return a;
        });

        await onSaveAccounts(updated);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving balances:', err);
      setErrorMsg(err.message || 'Failed to update available balance.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'Credit Card':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'Cash':
        return <Banknote className="w-4 h-4 text-amber-500" />;
      case 'UPI Wallet':
        return <Wallet className="w-4 h-4 text-sky-500" />;
      default:
        return <Building2 className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Available Balance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adjust your cash and bank balance in Indian Rupees (₹)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Available Balance Callout */}
        <div className="px-6 pt-4 pb-2">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Current Available Balance
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {formatINR(currentTotal)}
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
              {liquidAccounts.length} liquid account{liquidAccounts.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'quick'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Set Total Balance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('by_account')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'by_account'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>Adjust by Account ({liquidAccounts.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="px-6 py-3 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {activeTab === 'quick' ? (
            /* Mode 1: Quick Total Adjustment */
            <div className="space-y-4">
              <div>
                <label htmlFor={targetInputId} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  New Total Available Balance (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    id={targetInputId}
                    type="number"
                    step="any"
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(e.target.value)}
                    placeholder="e.g. 50000"
                    required
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-8 pr-3 text-base font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Adjustments:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 5000, 10000, 25000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleApplyShortcut(amt)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      +₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                  {[1000, 5000].map((amt) => (
                    <button
                      key={`neg_${amt}`}
                      type="button"
                      onClick={() => handleApplyShortcut(-amt)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                    >
                      -₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Account Selection */}
              {liquidAccounts.length > 1 && (
                <div>
                  <label htmlFor={applyAccountId} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Apply Difference To Account:
                  </label>
                  <select
                    id={applyAccountId}
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {liquidAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatINR(a.balance)}) {a.isDefault ? '• Default' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Difference Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between">
                <span className="text-slate-500">Net Difference:</span>
                <span
                  className={`font-mono font-bold ${
                    quickDifference > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : quickDifference < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {quickDifference > 0 ? '+' : ''}
                  {formatINR(quickDifference)}
                </span>
              </div>
            </div>
          ) : (
            /* Mode 2: By Account Itemized Adjustment */
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update individual balances for each of your bank and cash accounts:
              </p>

              {liquidAccounts.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 mb-2">
                    No bank or cash accounts found. Add your first account to configure opening balances.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingAccount(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bank or Cash Account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {liquidAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          {getAccountIcon(acc.type)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {acc.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {acc.type} {acc.accountNumber ? `(•• ${acc.accountNumber})` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="w-36 shrink-0 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={accountBalances[acc.id] ?? acc.balance.toString()}
                          onChange={(e) =>
                            setAccountBalances({
                              ...accountBalances,
                              [acc.id]: e.target.value,
                            })
                          }
                          className="w-full text-right font-mono font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 py-1.5 pl-6 pr-2.5 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Add Account Form */}
              {isAddingAccount ? (
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Add New Account
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        placeholder="e.g. HDFC Bank, Cash"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        Type
                      </label>
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value as AccountType)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      >
                        <option value="Savings">Savings</option>
                        <option value="Bank Account">Bank Account</option>
                        <option value="Current">Current</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI Wallet">UPI Wallet</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newAccBalance}
                      onChange={(e) => setNewAccBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddNewAccountInline}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Account
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Bank or Cash Account</span>
                </button>
              )}

              {/* Total Summary */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  New Total Available Balance:
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  {formatINR(itemizedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            {onNavigateToAccounts ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAccounts();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                Manage All Accounts &rarr;
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Update Balance'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
