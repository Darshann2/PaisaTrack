import React, { useState, useMemo } from 'react';
import {
  X,
  Landmark,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Building2,
  Coins,
  ShieldCheck,
  CreditCard,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  Account,
  OtherAsset,
  OtherLiability,
  OtherAssetCategory,
  OtherLiabilityCategory,
} from '../types';
import { formatINR } from '../utils/currency';

interface EditNetWorthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  initialOtherAssets: OtherAsset[];
  initialOtherLiabilities: OtherLiability[];
  onSave: (
    updatedAssets: OtherAsset[],
    updatedLiabilities: OtherLiability[]
  ) => Promise<void>;
  onOpenEditAccounts?: () => void;
}

const ASSET_CATEGORIES: OtherAssetCategory[] = [
  'Mutual Funds & Stocks',
  'Fixed Deposit (FD/RD)',
  'Gold & Precious Metals',
  'Real Estate & Property',
  'Provident Fund (EPF/PPF)',
  'Cryptocurrency',
  'Bonds & Debentures',
  'Other',
];

const LIABILITY_CATEGORIES: OtherLiabilityCategory[] = [
  'Home Loan / Mortgage',
  'Personal Loan',
  'Vehicle / Car Loan',
  'Education Loan',
  'Business / Family Loan',
  'Line of Credit',
  'Other',
];

export function EditNetWorthModal({
  isOpen,
  onClose,
  accounts,
  initialOtherAssets,
  initialOtherLiabilities,
  onSave,
  onOpenEditAccounts,
}: EditNetWorthModalProps) {
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities' | 'overview'>('overview');
  const [otherAssets, setOtherAssets] = useState<OtherAsset[]>(() =>
    initialOtherAssets.length > 0
      ? initialOtherAssets.map((a) => ({ ...a }))
      : []
  );
  const [otherLiabilities, setOtherLiabilities] = useState<OtherLiability[]>(() =>
    initialOtherLiabilities.length > 0
      ? initialOtherLiabilities.map((l) => ({ ...l }))
      : []
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Synchronize when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setOtherAssets(initialOtherAssets.map((a) => ({ ...a })));
      setOtherLiabilities(initialOtherLiabilities.map((l) => ({ ...l })));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialOtherAssets, initialOtherLiabilities]);

  // Derived Account Balances (Strictly avoiding double counting)
  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'Credit Card' && a.type !== 'Cash'),
    [accounts]
  );
  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'Cash'),
    [accounts]
  );
  const creditCardAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'Credit Card'),
    [accounts]
  );

  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [bankAccounts]
  );

  const totalCashBalance = useMemo(
    () => cashAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [cashAccounts]
  );

  const totalCreditLiabilities = useMemo(
    () =>
      creditCardAccounts.reduce((sum, a) => {
        const bal = Number(a.balance) || 0;
        return sum + (bal < 0 ? Math.abs(bal) : 0);
      }, 0),
    [creditCardAccounts]
  );

  const totalOtherAssets = useMemo(
    () => otherAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0),
    [otherAssets]
  );

  const totalOtherLiabilities = useMemo(
    () => otherLiabilities.reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
    [otherLiabilities]
  );

  // Grand Totals
  const totalAssets = totalBankBalance + totalCashBalance + totalOtherAssets;
  const totalLiabilities = totalCreditLiabilities + totalOtherLiabilities;
  const calculatedNetWorth = totalAssets - totalLiabilities;

  // Asset Handlers
  const handleAddAsset = (presetCategory?: OtherAssetCategory) => {
    const newAsset: OtherAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: presetCategory ? `${presetCategory} Holdings` : 'New Asset',
      category: presetCategory || 'Mutual Funds & Stocks',
      value: 0,
      notes: '',
    };
    setOtherAssets((prev) => [...prev, newAsset]);
    setActiveTab('assets');
  };

  const handleUpdateAsset = (id: string, updates: Partial<OtherAsset>) => {
    setOtherAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleDeleteAsset = (id: string) => {
    setOtherAssets((prev) => prev.filter((a) => a.id !== id));
  };

  // Liability Handlers
  const handleAddLiability = (presetCategory?: OtherLiabilityCategory) => {
    const newLiability: OtherLiability = {
      id: `liab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: presetCategory ? `${presetCategory}` : 'New Loan',
      category: presetCategory || 'Personal Loan',
      amount: 0,
      notes: '',
    };
    setOtherLiabilities((prev) => [...prev, newLiability]);
    setActiveTab('liabilities');
  };

  const handleUpdateLiability = (id: string, updates: Partial<OtherLiability>) => {
    setOtherLiabilities((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleDeleteLiability = (id: string) => {
    setOtherLiabilities((prev) => prev.filter((l) => l.id !== id));
  };

  // Save Validation
  const handleSaveAll = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate Assets
    for (const a of otherAssets) {
      if (!a.name.trim()) {
        setErrorMsg('Every asset must have a valid name/title.');
        setActiveTab('assets');
        return;
      }
      if (isNaN(Number(a.value)) || Number(a.value) < 0) {
        setErrorMsg(`Asset "${a.name}" has an invalid amount. Amounts must be 0 or positive.`);
        setActiveTab('assets');
        return;
      }
    }

    // Validate Liabilities
    for (const l of otherLiabilities) {
      if (!l.name.trim()) {
        setErrorMsg('Every liability/loan must have a valid name.');
        setActiveTab('liabilities');
        return;
      }
      if (isNaN(Number(l.amount)) || Number(l.amount) < 0) {
        setErrorMsg(`Liability "${l.name}" has an invalid amount. Amounts must be 0 or positive.`);
        setActiveTab('liabilities');
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(otherAssets, otherLiabilities);
      setSuccessMsg('Total Net Worth configuration successfully saved to your cloud profile!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving net worth configuration:', err);
      setErrorMsg(err.message || 'Failed to save net worth configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Configure Total Net Worth</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Formula: Assets − Liabilities
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Derived bank & cash accounts + other assets (FD, gold, stocks) minus liabilities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Net Worth Calculation Bar */}
        <div className="p-6 bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Assets */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Total Assets</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Bank+Cash+Other
                </span>
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
                {formatINR(totalAssets)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Bank: {formatINR(totalBankBalance)}</span>
                <span>Other: {formatINR(totalOtherAssets)}</span>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span>Total Liabilities</span>
                </span>
                <span className="text-[10px] font-mono text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                  Cards+Loans
                </span>
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-2">
                {formatINR(totalLiabilities)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                <span>Cards: {formatINR(totalCreditLiabilities)}</span>
                <span>Loans: {formatINR(totalOtherLiabilities)}</span>
              </div>
            </div>

            {/* Calculated Net Worth */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-md">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-100 uppercase tracking-wider">
                <span>Calculated Net Worth</span>
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums mt-2">
                {formatINR(calculatedNetWorth)}
              </div>
              <div className="text-[11px] text-emerald-100/90 mt-1 font-medium">
                {calculatedNetWorth >= 0 ? 'Positive Wealth Surplus' : 'Net Debt Outstandings'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Overview & Bank Accounts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'assets'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>Other Assets</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
                {otherAssets.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('liabilities')}
              className={`pb-3 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'liabilities'
                  ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>Loans & Liabilities</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
                {otherLiabilities.length}
              </span>
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="pb-2 hidden sm:flex items-center gap-2">
            {activeTab === 'assets' && (
              <button
                type="button"
                onClick={() => handleAddAsset()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset</span>
              </button>
            )}
            {activeTab === 'liabilities' && (
              <button
                type="button"
                onClick={() => handleAddLiability()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Loan</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Account Isolation Notice */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-xs text-sky-800 dark:text-sky-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
                <div>
                  <span className="font-bold">No double-counting guarantee:</span> Bank accounts (
                  {bankAccounts.length}) and Cash balances ({cashAccounts.length}) are automatically
                  summed from your verified account ledger. To change account balances or opening
                  balances, click the button below.
                </div>
              </div>

              {/* Bank Accounts Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-500" />
                    <span>Bank & Savings Accounts ({bankAccounts.length})</span>
                  </div>
                  <span className="font-mono text-emerald-600">{formatINR(totalBankBalance)}</span>
                </div>
                {bankAccounts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No bank accounts configured yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {acc.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{acc.type}</div>
                        </div>
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatINR(acc.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cash & Wallet Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Cash in Hand & Wallets ({cashAccounts.length})</span>
                  </div>
                  <span className="font-mono text-emerald-600">{formatINR(totalCashBalance)}</span>
                </div>
                {cashAccounts.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No cash wallets configured.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cashAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                      >
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {acc.name}
                        </div>
                        <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatINR(acc.balance)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credit Card Outstandings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    <span>Credit Card Outstandings ({creditCardAccounts.length})</span>
                  </div>
                  <span className="font-mono text-rose-600">{formatINR(totalCreditLiabilities)}</span>
                </div>
                {creditCardAccounts.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    Zero credit card debt recorded.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {creditCardAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between"
                      >
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {acc.name}
                        </div>
                        <div className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          {formatINR(Math.abs(acc.balance))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shortcut to Edit Accounts */}
              {onOpenEditAccounts && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditAccounts();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950 transition cursor-pointer"
                  >
                    <span>Edit Bank & Cash Accounts</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OTHER ASSETS */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Add non-liquid holdings: Mutual Funds, Fixed Deposits, Gold, Real Estate, EPF.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddAsset('Mutual Funds & Stocks')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Mutual Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAsset('Fixed Deposit (FD/RD)')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Fixed Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAsset('Gold & Precious Metals')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    + Gold
                  </button>
                </div>
              </div>

              {otherAssets.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-slate-500">
                    No additional assets registered. Your net worth currently reflects only bank &
                    cash accounts.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddAsset()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Asset</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Name */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Asset Description / Name
                          </label>
                          <input
                            type="text"
                            value={asset.name}
                            onChange={(e) => handleUpdateAsset(asset.id, { name: e.target.value })}
                            placeholder="e.g. Parag Parikh Flexi Cap Fund"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Category */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Category
                          </label>
                          <select
                            value={asset.category}
                            onChange={(e) =>
                              handleUpdateAsset(asset.id, {
                                category: e.target.value as OtherAssetCategory,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          >
                            {ASSET_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Valuation */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Current Value (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={asset.value === 0 ? '' : asset.value}
                              onChange={(e) =>
                                handleUpdateAsset(asset.id, {
                                  value: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="sm:col-span-1 flex justify-end sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            title="Remove asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddAsset()}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Asset</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIABILITIES & LOANS */}
          {activeTab === 'liabilities' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Add outstanding loans, home mortgages, vehicle financing, or personal loans.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddLiability('Home Loan / Mortgage')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                  >
                    + Home Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLiability('Vehicle / Car Loan')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                  >
                    + Car Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLiability('Personal Loan')}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition cursor-pointer"
                  >
                    + Personal Loan
                  </button>
                </div>
              </div>

              {otherLiabilities.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-slate-500">
                    No active loans or debt lines recorded. Credit card outstandings are tracked
                    automatically.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddLiability()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Outstanding Loan</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherLiabilities.map((liab) => (
                    <div
                      key={liab.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Name */}
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Liability Name / Loan Account
                          </label>
                          <input
                            type="text"
                            value={liab.name}
                            onChange={(e) => handleUpdateLiability(liab.id, { name: e.target.value })}
                            placeholder="e.g. HDFC Apartment Home Loan"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Category */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Category
                          </label>
                          <select
                            value={liab.category}
                            onChange={(e) =>
                              handleUpdateLiability(liab.id, {
                                category: e.target.value as OtherLiabilityCategory,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                          >
                            {LIABILITY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Principal Outstanding */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Outstanding Debt (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={liab.amount === 0 ? '' : liab.amount}
                              onChange={(e) =>
                                handleUpdateLiability(liab.id, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                              className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Delete */}
                        <div className="sm:col-span-1 flex justify-end sm:pt-4">
                          <button
                            type="button"
                            onClick={() => handleDeleteLiability(liab.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                            title="Remove liability"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddLiability()}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-rose-400 hover:text-rose-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Loan</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="px-6 py-2 bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-t border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-400">
            Changes persist permanently to your Firebase user profile
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Net Worth</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
