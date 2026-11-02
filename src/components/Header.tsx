import React from 'react';
import { Menu, Plus, ArrowLeftRight, Calendar } from 'lucide-react';
import { TimeRangeFilter } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  timeFilter: TimeRangeFilter;
  setTimeFilter: (val: TimeRangeFilter) => void;
  onOpenMobileMenu: () => void;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onOpenTransfer: () => void;
  showPeriodSelector?: boolean;
}

export function Header({
  title,
  subtitle,
  timeFilter,
  setTimeFilter,
  onOpenMobileMenu,
  onOpenAddExpense,
  onOpenAddIncome,
  onOpenTransfer,
  showPeriodSelector = true,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Title/Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="truncate">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Period selector + Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {showPeriodSelector && (
            <div className="relative hidden md:flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeRangeFilter)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="this_week">This Week (Mon–Sun)</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">Calendar Year</option>
                <option value="fiscal_year">Financial Year (Apr–Mar)</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          )}

          <button
            onClick={onOpenTransfer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Transfer money between accounts"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Transfer</span>
          </button>

          <button
            onClick={onOpenAddIncome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
        </div>
      </div>
    </header>
  );
}
