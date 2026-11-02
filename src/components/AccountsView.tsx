import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  Banknote,
  X,
  Landmark,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Account, AccountType, OtherAsset, OtherLiability } from '../types';
import { formatINR } from '../utils/currency';
import { parseAmount, roundMoney } from '../utils/amount';

interface AccountsViewProps {
  accounts: Account[];
  onSaveAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onOpenTransfer: () => void;
  onOpenEditBalance?: () => void;
  otherAssets?: OtherAsset[];
  otherLiabilities?: OtherLiability[];
  onOpenEditNetWorth?: () => void;
}

const ACCOUNT_TYPES: AccountType[] = [
  'Savings',
  'Bank Account',
  'Current',
  'Cash',
  'Credit Card',
  'UPI Wallet',
];

export function AccountsView({
  accounts,
  onSaveAccount,
  onDeleteAccount,
  onOpenTransfer,
  onOpenEditBalance,
  otherAssets = [],
  otherLiabilities = [],
  onOpenEditNetWorth,
}: AccountsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Savings');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const totalBankCash = accounts.reduce(
    (sum, a) => (a.type !== 'Credit Card' ? sum + (Number(a.balance) || 0) : sum),
    0
  );
  const totalOtherAssets = otherAssets.reduce(
    (sum, a) => sum + (Number(a.value) || 0),
    0
  );
  const grandTotalAssets = totalBankCash + totalOtherAssets;

  const totalCreditDebt = accounts.reduce(
    (sum, a) => (a.type === 'Credit Card' ? sum + Math.abs(Number(a.balance) || 0) : sum),
    0
  );
  const totalOtherDebt = otherLiabilities.reduce(
    (sum, l) => sum + (Number(l.amount) || 0),
    0
  );
  const grandTotalLiabilities = totalCreditDebt + totalOtherDebt;

  const netWorth = grandTotalAssets - grandTotalLiabilities;

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('Savings');
    setBalance('0');
    setAccountNumber('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Account) => {
    setEditingAccount(a);
    setName(a.name);
    setType(a.type);
    setBalance(String(roundMoney(a.balance)));
    setAccountNumber(a.accountNumber || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBalRaw = parseAmount(balance.replace(/^-/, ''));
    if (parsedBalRaw === null) {
      alert('Please enter a valid balance, e.g. 25000 or 25,000.50.');
      return;
    }
    // Credit-card style negative balances are allowed with a leading minus sign.
    const parsedBal = roundMoney(balance.trim().startsWith('-') ? -parsedBalRaw : parsedBalRaw);
    if (!name.trim()) {
      alert('Please enter an account name.');
      return;
    }

    const newAccount: Account = {
      // Keep fields this form does not edit (currency, color, notes...) instead of dropping them.
      ...(editingAccount || {}),
      id: editingAccount?.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      type,
      balance: parsedBal,
      accountNumber: accountNumber.trim() || undefined,
      isDefault: editingAccount ? editingAccount.isDefault : accounts.length === 0,
    };

    onSaveAccount(newAccount);
    setIsModalOpen(false);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Accounts, Cards & Wallets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track bank balances, cash, credit cards, and transfer funds without affecting income/expense
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenEditBalance && (
            <button
              onClick={onOpenEditBalance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-sky-500" />
              <span>Adjust Available Balance</span>
            </button>
          )}

          <button
            onClick={onOpenTransfer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Net Worth Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Liquid Bank & Cash */}
        <div
          onClick={onOpenEditBalance}
          className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs ${
            onOpenEditBalance
              ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition group'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Bank & Cash Balances</span>
            {onOpenEditBalance && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold group-hover:underline flex items-center gap-0.5">
                <Pencil className="w-2.5 h-2.5" />
                <span>Adjust</span>
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(totalBankCash)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {accounts.filter((a) => a.type !== 'Credit Card').length} active accounts
          </div>
        </div>

        {/* Other Assets */}
        <div
          onClick={onOpenEditNetWorth}
          className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs ${
            onOpenEditNetWorth
              ? 'cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition group'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Other Assets (FD, Stocks)</span>
            {onOpenEditNetWorth && (
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold group-hover:underline flex items-center gap-0.5">
                <Pencil className="w-2.5 h-2.5" />
                <span>Manage</span>
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
            {formatINR(totalOtherAssets)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {otherAssets.length} asset holdings registered
          </div>
        </div>

        {/* Total Liabilities */}
        <div
          onClick={onOpenEditNetWorth}
          className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs ${
            onOpenEditNetWorth
              ? 'cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition group'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Total Liabilities</span>
            {onOpenEditNetWorth && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold group-hover:underline flex items-center gap-0.5">
                <Pencil className="w-2.5 h-2.5" />
                <span>Loans</span>
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatINR(grandTotalLiabilities)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cards: {formatINR(totalCreditDebt)} • Loans: {formatINR(totalOtherDebt)}
          </div>
        </div>

        {/* Calculated Net Worth */}
        <div
          onClick={onOpenEditNetWorth}
          className={`p-4 rounded-xl bg-linear-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300/80 dark:border-emerald-700/80 shadow-xs ${
            onOpenEditNetWorth
              ? 'cursor-pointer hover:shadow-md transition group'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <span>Total Net Worth</span>
            {onOpenEditNetWorth && (
              <span className="text-[10px] font-semibold group-hover:underline flex items-center gap-0.5">
                <Pencil className="w-2.5 h-2.5" />
                <span>Edit</span>
              </span>
            )}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatINR(netWorth)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
            Formula: Assets − Liabilities
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {acc.name}
                    </h3>
                    <div className="text-[10px] text-slate-400">
                      {acc.type} {acc.accountNumber ? `· **${acc.accountNumber}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1 text-slate-400 hover:text-emerald-600"
                    title="Edit account"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete account "${acc.name}"?`)) {
                          onDeleteAccount(acc.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="my-3">
                <div className="text-[11px] text-slate-400">
                  {acc.type === 'Credit Card' ? 'Outstanding Balance' : 'Current Balance'}
                </div>
                <div
                  className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${
                    acc.type === 'Credit Card'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {formatINR(acc.balance)}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{acc.isDefault ? 'Default Account' : 'Active Account'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create/Edit Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Account Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HDFC Salary, SBI Credit Card, Cash"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Account Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Starting Balance (₹)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value.replace(/[^\d.,-]/g, ''))}
                    placeholder="e.g. 25000"
                    required
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Last 4 Digits / Identifier (Optional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 4821"
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-white text-xs font-mono"
                />
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
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
