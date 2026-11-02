import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  PiggyBank,
  CalendarClock,
  BarChart3,
  Building2,
  Settings,
  User,
  IndianRupee,
  Sun,
  Moon,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency } from '../utils/currencyFormatter';

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'goals'
  | 'recurring'
  | 'reports'
  | 'accounts'
  | 'settings'
  | 'profile';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  totalBalance: number;
  reportingCurrency?: string;
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  onOpenImport: () => void;
  userName?: string;
  userEmail?: string;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'goals', label: 'Savings Goals', icon: PiggyBank },
  { id: 'recurring', label: 'Recurring & Bills', icon: CalendarClock },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'accounts', label: 'Accounts & Cards', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'User Profile', icon: User },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
  totalBalance,
  reportingCurrency = 'INR',
  theme,
  toggleTheme,
  onOpenImport,
  userName,
  userEmail,
}: SidebarProps) {
  const isDark = theme === 'dark';

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
            <IndianRupee className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none block">
              PaisaTrack
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Personal Finance
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Total Balance Mini Banner */}
      <div className="px-5 pt-4 pb-2">
        <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Net Worth ({reportingCurrency})
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
            {formatCurrency(totalBalance, reportingCurrency)}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpenMobile(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap text-left ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls: User shortcut, Import CSV & Dark Mode Toggle */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
        {userEmail && (
          <button
            onClick={() => {
              setActiveTab('profile');
              setIsOpenMobile(false);
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                {userName || 'User Profile'}
              </div>
              <div className="text-[10px] text-slate-400 truncate leading-tight">
                {userEmail}
              </div>
            </div>
          </button>
        )}

        <button
          onClick={onOpenImport}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Import CSV Data</span>
        </button>

        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Appearance</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Light / Dark mode"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
