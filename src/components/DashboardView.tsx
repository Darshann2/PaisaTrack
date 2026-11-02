import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  Receipt,
  IndianRupee,
  Pencil,
  Landmark,
} from 'lucide-react';
import {
  Transaction,
  Account,
  Budget,
  SavingsGoal,
  RecurringBill,
  TimeRangeFilter,
  DaySummary,
  OtherAsset,
  OtherLiability,
} from '../types';
import { formatINR, getWeekRange, toISODate } from '../utils/currency';
import { WeeklyChart } from './WeeklyChart';
import { CategoryDonutChart } from './CategoryDonutChart';

interface DashboardViewProps {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  timeFilter: TimeRangeFilter;
  filterStartDate: string;
  filterEndDate: string;
  filterLabel: string;
  isDark?: boolean;
  otherAssets?: OtherAsset[];
  otherLiabilities?: OtherLiability[];
  onNavigateToTransactions: () => void;
  onNavigateToBudgets: () => void;
  onNavigateToGoals: () => void;
  onNavigateToRecurring: () => void;
  onQuickLogRecurring: (bill: RecurringBill) => void;
  onOpenEditBalance?: () => void;
  onOpenEditNetWorth?: () => void;
  onNavigateToAccounts?: () => void;
}

export function DashboardView({
  transactions,
  accounts,
  budgets,
  goals,
  recurring,
  timeFilter,
  filterStartDate,
  filterEndDate,
  filterLabel,
  isDark = false,
  otherAssets = [],
  otherLiabilities = [],
  onNavigateToTransactions,
  onNavigateToBudgets,
  onNavigateToGoals,
  onNavigateToRecurring,
  onQuickLogRecurring,
  onOpenEditBalance,
  onOpenEditNetWorth,
  onNavigateToAccounts,
}: DashboardViewProps) {
  // 1. Transactions within active period
  const periodTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.date >= filterStartDate && t.date <= filterEndDate
    );
  }, [transactions, filterStartDate, filterEndDate]);

  // 2. Financial Metrics
  const { totalIncome, totalExpenses, netSavings, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    for (const t of periodTransactions) {
      if (t.type === 'Income') inc += t.amount;
      else if (t.type === 'Expense') exp += t.amount;
      // Transfers are not counted as income or expenses!
    }

    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, (net / inc) * 100) : 0;

    return {
      totalIncome: inc,
      totalExpenses: exp,
      netSavings: net,
      savingsRate: rate,
    };
  }, [periodTransactions]);

  // 3. Current Available Balance across all non-credit accounts
  const totalAvailableBalance = useMemo(() => {
    return accounts.reduce((acc, a) => {
      if (a.type === 'Credit Card') return acc;
      return acc + (Number(a.balance) || 0);
    }, 0);
  }, [accounts]);

  // 3b. Total Net Worth Calculation: Total Assets - Total Liabilities
  const { totalNetWorth, grandTotalAssets, grandTotalLiabilities } = useMemo(() => {
    // Liquid assets: Bank + Cash accounts (no double counting)
    const liquidAssets = totalAvailableBalance;

    // Other Assets: Mutual Funds, FD, Gold, Real Estate, PF, etc.
    const otherAssetsVal = (otherAssets || []).reduce(
      (sum, a) => sum + (Number(a.value) || 0),
      0
    );
    const totalAssets = liquidAssets + otherAssetsVal;

    // Credit Card Liabilities
    const creditLiab = accounts.reduce((sum, a) => {
      if (a.type === 'Credit Card') {
        const bal = Number(a.balance) || 0;
        return sum + (bal < 0 ? Math.abs(bal) : 0);
      }
      return sum;
    }, 0);

    // Other Liabilities: Mortgages, Auto Loans, Personal Loans, etc.
    const otherLiabVal = (otherLiabilities || []).reduce(
      (sum, l) => sum + (Number(l.amount) || 0),
      0
    );
    const totalLiabilities = creditLiab + otherLiabVal;

    return {
      totalNetWorth: totalAssets - totalLiabilities,
      grandTotalAssets: totalAssets,
      grandTotalLiabilities: totalLiabilities,
    };
  }, [totalAvailableBalance, accounts, otherAssets, otherLiabilities]);

  // 4. Category-wise Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of periodTransactions) {
      if (t.type === 'Expense') {
        const current = map.get(t.category) || 0;
        map.set(t.category, current + t.amount);
      }
    }

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    const list = Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return list;
  }, [periodTransactions]);

  // 5. Weekly Monday-to-Sunday data (for the chart)
  const weekDays = useMemo(() => {
    const { monday, startStr, endStr } = getWeekRange(new Date());
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayFullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayStr = toISODate(new Date());

    const days: DaySummary[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = toISODate(d);
      days.push({
        name: dayNames[i],
        fullName: dayFullNames[i],
        dateStr: dStr,
        displayDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        income: 0,
        expense: 0,
        isToday: dStr === todayStr,
      });
    }

    for (const t of transactions) {
      if (t.date >= startStr && t.date <= endStr) {
        const parts = t.date.split('-').map(Number);
        const txDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayIdx = (txDate.getDay() + 6) % 7;
        if (dayIdx >= 0 && dayIdx < 7) {
          if (t.type === 'Income') days[dayIdx].income += t.amount;
          else if (t.type === 'Expense') days[dayIdx].expense += t.amount;
        }
      }
    }
    return days;
  }, [transactions]);

  // 6. Overall Monthly Budget Progress
  const overallBudget = useMemo(() => {
    const b = budgets.find((item) => item.category === 'Overall');
    if (!b) return null;
    const spent = totalExpenses;
    const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
    const remaining = Math.max(0, b.amount - spent);
    return {
      limit: b.amount,
      spent,
      pct,
      remaining,
      isExceeded: spent > b.amount,
      isWarning: pct >= b.alertThreshold,
    };
  }, [budgets, totalExpenses]);

  // 7. Upcoming recurring bills within next 7 days
  const upcomingBills = useMemo(() => {
    const today = toISODate(new Date());
    const in7Days = toISODate(new Date(Date.now() + 7 * 86400000));
    return recurring.filter(
      (b) => b.isActive && b.nextDueDate >= today && b.nextDueDate <= in7Days
    );
  }, [recurring]);

  // 8. Recent 5 Transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Time Range Active Subtitle Banner */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing financial performance for: <strong className="text-slate-800 dark:text-slate-200">{filterLabel}</strong>
        </div>
        <div className="hidden sm:block">
          {periodTransactions.length} transaction{periodTransactions.length === 1 ? '' : 's'} recorded in this period
        </div>
      </div>

      {/* Hero Financial KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Net Worth (Interactive & Editable) */}
        <div
          onClick={onOpenEditNetWorth}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition group ${
            onOpenEditNetWorth
              ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:shadow-md'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span>Total Net Worth</span>
            <div className="flex items-center gap-1.5">
              {onOpenEditNetWorth && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditNetWorth();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60"
                  title="Edit Total Net Worth"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {formatINR(totalNetWorth)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <span title={`Assets: ${formatINR(grandTotalAssets)} • Debt: ${formatINR(grandTotalLiabilities)}`}>
              Assets − Liabilities
            </span>
            {onOpenEditNetWorth && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Configure</span>
                <span>&rarr;</span>
              </span>
            )}
          </div>
        </div>

        {/* Available Balance (Interactive & Editable) */}
        <div
          onClick={onOpenEditBalance}
          className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition group ${
            onOpenEditBalance
              ? 'cursor-pointer hover:border-sky-300 dark:hover:border-sky-600/60 hover:shadow-md'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span>Available Balance</span>
            <div className="flex items-center gap-1.5">
              {onOpenEditBalance && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditBalance();
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition cursor-pointer border border-sky-200/60 dark:border-sky-800/60"
                  title="Edit Available Balance"
                >
                  <Pencil className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            {formatINR(totalAvailableBalance)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <span>Across bank & cash accounts</span>
            {onOpenEditBalance && (
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Adjust</span>
                <span>&rarr;</span>
              </span>
            )}
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span>Period Income</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatINR(totalIncome)}
          </div>
          <div className="text-xs text-slate-400 mt-1">All inflows in period</div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span>Period Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {formatINR(totalExpenses)}
          </div>
          <div className="text-xs text-slate-400 mt-1">All spendings in period</div>
        </div>

        {/* Net Savings & Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            <span>Net Savings</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatINR(netSavings, { showSign: true })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Savings rate: <strong className="text-slate-700 dark:text-slate-300">{savingsRate.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* Budget & Insights Warning Bar (if overall budget exists) */}
      {overallBudget && (
        <div
          className={`rounded-2xl p-4 border transition ${
            overallBudget.isExceeded
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
              : overallBudget.isWarning
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {overallBudget.isExceeded ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Monthly Spending Limit: {formatINR(overallBudget.limit)}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              Spent {formatINR(overallBudget.spent)} of {formatINR(overallBudget.limit)} ({overallBudget.pct.toFixed(0)}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallBudget.isExceeded
                  ? 'bg-rose-600'
                  : overallBudget.isWarning
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${overallBudget.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Charts & Analytics Split (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Weekly Mon-Sun Inflow vs Outflow (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Weekly Cashflow Comparison
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily breakdown of Income vs Expenses (Mon – Sun)
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">Values in ₹</span>
          </div>

          <WeeklyChart days={weekDays} isDark={isDark} />
        </div>

        {/* Right: Category Breakdown Donut (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Top Spending Categories
              </h2>
              <button
                onClick={onNavigateToBudgets}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Budgets</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <CategoryDonutChart categories={categoryBreakdown.slice(0, 5)} isDark={isDark} />
          </div>

          {/* Top 3 Category list */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            {categoryBreakdown.slice(0, 3).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[60%]">
                  {cat.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatINR(cat.amount)}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">
                    ({cat.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions + Upcoming Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h2>
            <button
              onClick={onNavigateToTransactions}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx) => {
                const isInc = tx.type === 'Income';
                const isTransfer = tx.type === 'Transfer';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                          isInc
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                            : isTransfer
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                        }`}
                      >
                        {isInc ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : isTransfer ? (
                          <Wallet className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          {tx.date} · {tx.category} · {tx.paymentMethod}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-bold font-mono tabular-nums shrink-0 ${
                        isInc
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isTransfer
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isInc ? '+' : isTransfer ? '' : '-'}
                      {formatINR(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Bills & Recurring (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Upcoming Recurring Bills
              </h2>
            </div>
            <button
              onClick={onNavigateToRecurring}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingBills.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No bills due within the next 7 days.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{bill.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Due: <strong>{bill.nextDueDate}</strong> · {bill.paymentMethod}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatINR(bill.amount)}
                    </div>
                    <button
                      onClick={() => onQuickLogRecurring(bill)}
                      className="mt-1 px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition"
                    >
                      Log Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
