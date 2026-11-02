import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
} from 'lucide-react';
import { Transaction, Budget, CategoryItem, TimeRangeFilter, ExchangeRateData } from '../types';
import {
  getDateRangeForFilter,
  exportTransactionsToCSV,
  exportTransactionsToExcel,
} from '../utils/currency';
import { formatCurrency } from '../utils/currencyFormatter';

interface ReportsViewProps {
  transactions: Transaction[];
  budgets: Budget[];
  categories: CategoryItem[];
  reportingCurrency?: string;
  exchangeRates?: ExchangeRateData | null;
}

export function ReportsView({
  transactions,
  budgets,
  categories,
  reportingCurrency = 'INR',
  exchangeRates = null,
}: ReportsViewProps) {
  const [reportPeriod, setReportPeriod] = useState<TimeRangeFilter>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { start, end, label } = useMemo(() => {
    return getDateRangeForFilter(reportPeriod, customStart, customEnd, 'Monday', 4);
  }, [reportPeriod, customStart, customEnd]);

  // Filtered transactions for the report
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.date < start || t.date > end) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      return true;
    });
  }, [transactions, start, end, selectedCategory]);

  // Financial aggregates converted into reporting currency
  const { totalIncome, totalExpenses, netSavings, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of periodTransactions) {
      const val = t.reportingAmount ?? t.amount;
      if (t.type === 'Income') inc += val;
      else if (t.type === 'Expense') exp += val;
    }
    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, (net / inc) * 100) : 0;
    return { totalIncome: inc, totalExpenses: exp, netSavings: net, savingsRate: rate };
  }, [periodTransactions]);

  // Category breakdown in reporting currency
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type === 'Expense') {
        const val = t.reportingAmount ?? t.amount;
        const cur = map.get(t.category) || 0;
        map.set(t.category, cur + val);
      }
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions]);

  // Top Merchants / Payees in reporting currency
  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type === 'Expense' && t.merchant) {
        const val = t.reportingAmount ?? t.amount;
        const cur = map.get(t.merchant) || 0;
        map.set(t.merchant, cur + val);
      }
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodTransactions]);

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Financial Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate and export period-over-period financial statements consolidated in {reportingCurrency}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportTransactionsToCSV(periodTransactions, `financial_report_${start}_${end}.csv`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Report</span>
          </button>

          <button
            onClick={() => exportTransactionsToExcel(periodTransactions, `financial_report_${start}_${end}.xlsx`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Period:</span>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as TimeRangeFilter)}
              className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_week">This Week (Mon–Sun)</option>
              <option value="last_week">Last Week</option>
              <option value="this_year">Calendar Year</option>
              <option value="fiscal_year">Financial Year (Apr–Mar)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {reportPeriod === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-slate-400 font-medium flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            {label} · Expressed in <strong>{reportingCurrency}</strong>
          </span>
        </div>
      </div>

      {/* Summary KPI Cards for the Report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Revenue / Inflows
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalIncome, reportingCurrency)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Expenditures
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalExpenses, reportingCurrency)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Net Surplus / Deficit
          </div>
          <div
            className={`text-xl font-bold font-mono tabular-nums mt-1 ${
              netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(netSavings, reportingCurrency, { showSign: true })}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Savings Efficiency Rate
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Category Breakdown Table & Top Payees */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Table (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Category Spending Distribution ({reportingCurrency})
          </h3>
          {categorySummary.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No expense records found for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {categorySummary.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cat.amount, reportingCurrency)}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Payees & Merchants (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Top Merchants & Vendors
          </h3>
          {topMerchants.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No merchant data recorded for this period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topMerchants.map((m) => (
                <div key={m.name} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {m.name}
                  </span>
                  <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(m.amount, reportingCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
