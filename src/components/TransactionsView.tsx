import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { Transaction, Account, CategoryItem, PaymentMethod, ExchangeRateData } from '../types';
import { PAYMENT_METHODS, exportTransactionsToCSV, exportTransactionsToExcel } from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: CategoryItem[];
  reportingCurrency?: string;
  exchangeRates?: ExchangeRateData | null;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenTransfer: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionsView({
  transactions,
  accounts,
  categories,
  reportingCurrency = 'INR',
  exchangeRates = null,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenTransfer,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
}: TransactionsViewProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense' | 'Transfer'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [accountFilter, setAccountFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Detail Modal
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);

  // Distinct currencies across all transactions
  const distinctCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.currency) set.add(t.currency);
    }
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'All' && t.type !== typeFilter) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (accountFilter !== 'All' && t.accountId !== accountFilter && t.toAccountId !== accountFilter)
          return false;
        if (paymentFilter !== 'All' && t.paymentMethod !== paymentFilter) return false;
        if (currencyFilter !== 'All' && (t.currency || reportingCurrency) !== currencyFilter) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(q);
          const matchCat = t.category.toLowerCase().includes(q);
          const matchMerchant = (t.merchant || '').toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchAmt = t.amount.toString().includes(q);
          const matchCur = (t.currency || '').toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchMerchant && !matchNotes && !matchAmt && !matchCur) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        } else {
          // Sort by effective reporting amount
          const amtA = a.reportingAmount ?? a.amount;
          const amtB = b.reportingAmount ?? b.amount;
          return sortOrder === 'desc' ? amtB - amtA : amtA - amtB;
        }
      });
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    accountFilter,
    paymentFilter,
    currencyFilter,
    startDate,
    endDate,
    searchQuery,
    sortBy,
    sortOrder,
    reportingCurrency,
  ]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a.name]));
  }, [accounts]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setCategoryFilter('All');
    setAccountFilter('All');
    setPaymentFilter('All');
    setCurrencyFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Action Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredTransactions.length} of {transactions.length} records · Consolidated in {reportingCurrency}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportTransactionsToCSV(filteredTransactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => exportTransactionsToExcel(filteredTransactions)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
            title="Export filtered records to Excel .xlsx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Keyword Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search description, payee, notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Types</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
            <option value="Transfer">Transfer</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
          >
            <option value="All">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency || reportingCurrency})
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="All">All Currencies</option>
            {distinctCurrencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSortBy(sortBy === 'date' ? 'amount' : 'date');
              }}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
            >
              Sort by: {sortBy === 'date' ? 'Date' : 'Amount'}
            </button>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-rose-600 transition underline ml-2"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                No matching transactions found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try clearing your search filters or record a new transaction.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account / Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedTransactions.map((tx) => {
                  const isInc = tx.type === 'Income';
                  const isTransfer = tx.type === 'Transfer';
                  const fromAcc = accountMap.get(tx.accountId) || 'Account';
                  const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
                  const txCur = tx.currency || reportingCurrency;
                  const isForeign = txCur !== reportingCurrency && tx.reportingAmount !== undefined;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                        {tx.date}
                        {tx.time && <span className="text-[10px] text-slate-400 ml-1">{tx.time}</span>}
                      </td>

                      {/* Description & Payee */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {tx.description}
                          {tx.needsReview && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                              Review
                            </span>
                          )}
                          {tx.isHistoricalRateLocked && (
                            <span title="Locked historical exchange rate">
                              <Lock className="w-3 h-3 text-emerald-600 inline" />
                            </span>
                          )}
                        </div>
                        {tx.merchant && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Payee: {tx.merchant}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {tx.category}
                        </span>
                      </td>

                      {/* Account & Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {isTransfer ? (
                          <span>
                            {fromAcc} → {toAcc}
                          </span>
                        ) : (
                          <span>
                            {fromAcc} · <span className="font-medium">{tx.paymentMethod}</span>
                          </span>
                        )}
                      </td>

                      {/* Amount: Original + Reporting Equivalent */}
                      <td
                        className={`py-3 px-4 text-right font-extrabold font-mono tabular-nums whitespace-nowrap ${
                          isInc
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isTransfer
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        <div>
                          {isInc ? '+' : isTransfer ? '' : '-'}
                          {formatCurrency(tx.amount, txCur)}
                        </div>

                        {isForeign && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            ≈ {formatCurrency(tx.reportingAmount!, reportingCurrency)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingTx(tx)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateTransaction(tx)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Duplicate transaction"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Edit transaction"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${tx.description}" (${formatCurrency(tx.amount, txCur)})?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredTransactions.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal with Multi-Currency Breakdown */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Transaction Audit Details
                </h3>
                {viewingTx.isHistoricalRateLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Rate Locked
                  </span>
                )}
              </div>
              <button onClick={() => setViewingTx(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Original Amount */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Original Amount:</span>
                <span className="font-bold text-sm font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(viewingTx.amount, viewingTx.currency || reportingCurrency)}
                </span>
              </div>

              {/* Reporting Currency Amount */}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Reporting Equivalent ({reportingCurrency}):</span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(viewingTx.reportingAmount ?? viewingTx.amount, reportingCurrency)}
                </span>
              </div>

              {/* Exchange Rate details if multi-currency */}
              {viewingTx.currency && viewingTx.currency !== reportingCurrency && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Historical Exchange Rate:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      1 {viewingTx.currency} = {viewingTx.exchangeRate?.toFixed(4) || '1.0000'} {reportingCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Source: {viewingTx.exchangeRateSource || 'open.er-api.com'}</span>
                    <span>Date: {viewingTx.exchangeRateDate || viewingTx.date}</span>
                  </div>
                </div>
              )}

              {/* Cross-Currency Transfer metadata */}
              {viewingTx.type === 'Transfer' && viewingTx.fromCurrency && viewingTx.toCurrency && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
                  <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300">
                    Cross-Currency Transfer
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-blue-700 dark:text-blue-300">Sent:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(viewingTx.fromAmount ?? viewingTx.amount, viewingTx.fromCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-blue-700 dark:text-blue-300">Received:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(viewingTx.toAmount ?? viewingTx.amount, viewingTx.toCurrency)}
                    </span>
                  </div>
                  {viewingTx.transferFee && viewingTx.transferFee > 0 && (
                    <div className="flex justify-between text-[11px] text-rose-600">
                      <span>Wire/Service Fee:</span>
                      <span className="font-mono">
                        {formatCurrency(viewingTx.transferFee, viewingTx.transferFeeCurrency || viewingTx.fromCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Type:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingTx.type}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Description:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingTx.description}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingTx.category}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingTx.date} {viewingTx.time || ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {viewingTx.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Account:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {accountMap.get(viewingTx.accountId) || viewingTx.accountId}
                </span>
              </div>
              {viewingTx.merchant && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Merchant / Payee:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingTx.merchant}
                  </span>
                </div>
              )}
              {viewingTx.notes && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-0.5">Notes:</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                    {viewingTx.notes}
                  </p>
                </div>
              )}
              {viewingTx.tags && viewingTx.tags.length > 0 && (
                <div className="py-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400">Tags:</span>
                  {viewingTx.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingTx(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
