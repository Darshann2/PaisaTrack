import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Globe,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, Account, CategoryItem, ExchangeRateData } from '../types';
import { PAYMENT_METHODS, toISODate } from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';
import { parseAmount, roundMoney, sanitizeAmountInput } from '../utils/amount';
import { CurrencySelect } from './CurrencySelect';
import { getCurrencyInfo } from '../data/currencies';
import { convertCurrency, calculateRate } from '../services/exchangeRate';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: Omit<Transaction, 'id'>, editId?: string) => Promise<void> | void;
  editingTransaction?: Transaction | null;
  defaultType?: TransactionType;
  accounts: Account[];
  categories: CategoryItem[];
  reportingCurrency?: string;
  defaultCurrency?: string;
  ratesData?: ExchangeRateData | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultType = 'Expense',
  accounts,
  categories,
  reportingCurrency = 'INR',
  defaultCurrency = 'INR',
  ratesData = null,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [customRate, setCustomRate] = useState<string>('');
  const [isRateLocked, setIsRateLocked] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [transferFee, setTransferFee] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);
  const destAccount = useMemo(() => accounts.find((a) => a.id === toAccountId), [accounts, toAccountId]);

  const currencyInfo = useMemo(() => getCurrencyInfo(currency), [currency]);
  const reportingCurrencyInfo = useMemo(() => getCurrencyInfo(reportingCurrency), [reportingCurrency]);

  const isCrossCurrencyTransfer = useMemo(() => {
    if (type !== 'Transfer' || !selectedAccount || !destAccount) return false;
    const fromCur = selectedAccount.currency || defaultCurrency;
    const toCur = destAccount.currency || defaultCurrency;
    return fromCur !== toCur;
  }, [type, selectedAccount, destAccount, defaultCurrency]);

  // Determine effective exchange rate
  const liveRateInfo = useMemo(() => {
    return calculateRate(currency, reportingCurrency, ratesData);
  }, [currency, reportingCurrency, ratesData]);

  const effectiveRate = useMemo(() => {
    if (currency === reportingCurrency) return 1.0;
    if (isRateLocked && customRate && !isNaN(parseFloat(customRate))) {
      return parseFloat(customRate);
    }
    return liveRateInfo?.rate ?? null;
  }, [currency, reportingCurrency, isRateLocked, customRate, liveRateInfo]);

  // Calculate reporting amount
  const calculatedReportingAmount = useMemo(() => {
    const num = parseAmount(amount);
    if (num === null || num <= 0) return 0;
    if (currency === reportingCurrency) return roundMoney(num, reportingCurrencyInfo.decimals);
    if (effectiveRate !== null) {
      const converted = num * effectiveRate;
      const factor = Math.pow(10, reportingCurrencyInfo.decimals);
      return Math.round(converted * factor) / factor;
    }
    return num;
  }, [amount, currency, reportingCurrency, effectiveRate, reportingCurrencyInfo.decimals]);

  // ROOT-CAUSE FIX: `accounts` and `categories` get a new array identity on every Firestore
  // snapshot. They used to be effect dependencies, so each snapshot re-ran the "reset form"
  // branch below and wiped the amount/description while the user was typing (which then
  // failed validation with "enter a valid amount"). The form is now initialised only when the
  // modal opens or the transaction being edited changes; the latest props are read via a ref.
  const latestProps = useRef({ accounts, categories, defaultCurrency });
  latestProps.current = { accounts, categories, defaultCurrency };

  useEffect(() => {
    if (!isOpen) return;
    const { accounts, categories, defaultCurrency } = latestProps.current;
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(roundMoney(editingTransaction.amount)));
      setCurrency(editingTransaction.currency || defaultCurrency);
      if (editingTransaction.exchangeRate) {
        setCustomRate(editingTransaction.exchangeRate.toString());
      }
      setIsRateLocked(Boolean(editingTransaction.isHistoricalRateLocked));
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setSubcategory(editingTransaction.subcategory || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || '');
      setPaymentMethod(editingTransaction.paymentMethod || 'UPI');
      setAccountId(editingTransaction.accountId || accounts[0]?.id || '');
      setToAccountId(editingTransaction.toAccountId || accounts[1]?.id || '');
      if (editingTransaction.toAmount) {
        setToAmount(editingTransaction.toAmount.toString());
      }
      if (editingTransaction.transferFee) {
        setTransferFee(editingTransaction.transferFee.toString());
      }
      setMerchant(editingTransaction.merchant || '');
      setNotes(editingTransaction.notes || '');
      setTagInput((editingTransaction.tags || []).join(', '));
    } else {
      setType(defaultType);
      setAmount('');
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      const initialAccId = defaultAcc?.id || 'acc_primary';
      setAccountId(initialAccId);
      const accCurrency = defaultAcc?.currency || defaultCurrency;
      setCurrency(accCurrency);

      const otherAcc = accounts.find((a) => a.id !== initialAccId) || accounts[0];
      setToAccountId(otherAcc?.id || 'acc_secondary');

      setCustomRate('');
      setIsRateLocked(false);
      setDescription('');
      setDate(toISODate(new Date()));
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      setPaymentMethod('UPI');
      setToAmount('');
      setTransferFee('');
      setMerchant('');
      setNotes('');
      setTagInput('');

      // Auto-set category based on type
      const matchingCats = categories.filter((c) => c.type === defaultType || c.type === 'Both');
      setCategory(matchingCats[0]?.name || (defaultType === 'Income' ? 'Salary' : 'Groceries & Provisions'));
    }
    setErrorMsg(null);
  }, [editingTransaction, defaultType, isOpen]);

  // When account changes in non-edit mode, sync currency to account's denomination
  const handleAccountChange = (newAccId: string) => {
    setAccountId(newAccId);
    if (!editingTransaction) {
      const acc = accounts.find((a) => a.id === newAccId);
      if (acc && acc.currency) {
        setCurrency(acc.currency);
      }
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type || c.type === 'Both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedAmountRaw = parseAmount(amount);
    if (parsedAmountRaw === null || parsedAmountRaw <= 0) {
      setErrorMsg(
        amount.trim() === ''
          ? `Please enter an amount greater than ${currencyInfo.symbol}0.`
          : `"${amount}" is not a valid amount. Use digits only, e.g. 2000 or 20,000.50.`
      );
      return;
    }
    // Store money at the currency's precision (2 decimals for INR) - no floating-point noise.
    const parsedAmount = roundMoney(parsedAmountRaw, currencyInfo.decimals);
    if (parsedAmount <= 0) {
      setErrorMsg(`Amount is too small for ${currencyInfo.code}.`);
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description for the transaction.');
      return;
    }
    if (type === 'Transfer' && accountId === toAccountId) {
      setErrorMsg('Transfer source and destination account cannot be the same.');
      return;
    }

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const parsedToAmountRaw = parseAmount(toAmount);
    const parsedToAmount = parsedToAmountRaw === null ? NaN : roundMoney(parsedToAmountRaw);
    const parsedFeeRaw = parseAmount(transferFee);
    const parsedFee = parsedFeeRaw === null ? NaN : roundMoney(parsedFeeRaw);

    const rateApplied = currency === reportingCurrency ? 1.0 : (effectiveRate ?? 1.0);
    const rateSource =
      currency === reportingCurrency
        ? 'Base'
        : isRateLocked
        ? 'Manual User Rate'
        : liveRateInfo?.source || 'ExchangeRate-API';

    try {
      setIsSaving(true);
      await onSave(
        {
          type,
          amount: parsedAmount,
          currency,
          reportingAmount: calculatedReportingAmount,
          exchangeRate: rateApplied,
          exchangeRateSource: rateSource,
          exchangeRateDate: toISODate(new Date()),
          isHistoricalRateLocked: isRateLocked,
          description: description.trim(),
          category: type === 'Transfer' ? 'Account Transfer' : category,
          subcategory: subcategory.trim() || undefined,
          date,
          time: time || undefined,
          paymentMethod,
          accountId,
          toAccountId: type === 'Transfer' ? toAccountId : undefined,
          fromAmount: type === 'Transfer' ? parsedAmount : undefined,
          toAmount: type === 'Transfer' ? (isNaN(parsedToAmount) ? parsedAmount : parsedToAmount) : undefined,
          fromCurrency: type === 'Transfer' ? (selectedAccount?.currency || currency) : undefined,
          toCurrency: type === 'Transfer' ? (destAccount?.currency || currency) : undefined,
          transferExchangeRate: type === 'Transfer' && isCrossCurrencyTransfer && !isNaN(parsedToAmount) && parsedAmount > 0
            ? parsedToAmount / parsedAmount
            : undefined,
          transferFee: !isNaN(parsedFee) && parsedFee > 0 ? parsedFee : undefined,
          transferFeeCurrency: currency,
          merchant: merchant.trim() || undefined,
          notes: notes.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
        editingTransaction?.id
      );
      onClose();
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setErrorMsg(err?.message || 'Failed to save transaction. Please check your network and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                type === 'Expense'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                  : type === 'Income'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400'
              }`}
            >
              {type === 'Expense' ? (
                <TrendingDown className="w-4 h-4 stroke-[2.5]" />
              ) : type === 'Income' ? (
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingTransaction ? 'Edit Transaction' : `Record ${type}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Type Segmented Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('Expense')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'Expense'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('Income')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'Income'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Income
              </button>
              <button
                type="button"
                onClick={() => setType('Transfer')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'Transfer'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                Transfer
              </button>
            </div>
          </div>

          {/* Amount & Currency Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Amount ({currencyInfo.disambiguatedSymbol})
              </label>
              <div className="relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500 font-bold text-sm">{currencyInfo.symbol}</span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Amount"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                  placeholder="0.00"
                  required
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-8 pr-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-base font-semibold font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <CurrencySelect
                label="Currency"
                value={currency}
                onChange={(code) => setCurrency(code)}
              />
            </div>
          </div>

          {/* Multi-Currency Conversion Info Bar (When Currency !== Reporting Currency) */}
          {currency !== reportingCurrency && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Reporting Equivalent ({reportingCurrency}):</span>
                </div>
                <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                  ≈ {formatCurrency(calculatedReportingAmount, reportingCurrency)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>
                  Rate: 1 {currency} = {effectiveRate?.toFixed(4) || '—'} {reportingCurrency}
                </span>

                <button
                  type="button"
                  onClick={() => setIsRateLocked(!isRateLocked)}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer font-medium"
                >
                  {isRateLocked ? (
                    <>
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>Custom Rate Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-slate-400" />
                      <span>Lock Custom Rate</span>
                    </>
                  )}
                </button>
              </div>

              {isRateLocked && (
                <div className="pt-2">
                  <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Custom Exchange Rate (1 {currency} in {reportingCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customRate || (effectiveRate ? effectiveRate.toString() : '')}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="e.g. 83.2500"
                    className="w-full text-xs font-mono py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'Transfer'
                  ? 'e.g. Wire transfer between accounts'
                  : type === 'Income'
                  ? 'e.g. Monthly Salary or Client payment'
                  : 'e.g. Grocery shopping, Fuel, Flight ticket'
              }
              required
              className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none text-sm"
            />
          </div>

          {/* Category (if not transfer) */}
          {type !== 'Transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Merchant / Payee (Optional)
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Amazon, DMart, Apple Store"
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Accounts & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {type === 'Transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.length === 0 && (
                  <option value="acc_primary">Cash / Primary Account (Auto-created)</option>
                )}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency || 'INR'})
                  </option>
                ))}
              </select>
            </div>

            {type === 'Transfer' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  To Account
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {accounts.length === 0 && (
                    <option value="acc_secondary">Secondary Bank Account (Auto-created)</option>
                  )}
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency || 'INR'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cross-Currency Transfer specific inputs */}
          {type === 'Transfer' && isCrossCurrencyTransfer && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-3">
              <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span>Cross-Currency Transfer ({selectedAccount?.currency} → {destAccount?.currency})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Amount Received in {destAccount?.currency}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={toAmount}
                    onChange={(e) => setToAmount(sanitizeAmountInput(e.target.value))}
                    placeholder="e.g. Credited amount"
                    className="w-full text-xs font-mono py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Wire / Transfer Fee (Optional)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={transferFee}
                    onChange={(e) => setTransferFee(sanitizeAmountInput(e.target.value))}
                    placeholder={`0.00 ${selectedAccount?.currency}`}
                    className="w-full text-xs font-mono py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. vacation, client, project-alpha"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or memo"
                className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 px-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {editingTransaction ? 'Save Changes' : isSaving ? 'Saving...' : `Add ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
