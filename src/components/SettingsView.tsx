import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Tag,
  Palette,
  Calendar,
  Globe,
  RefreshCw,
  Star,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  AppSettings,
  CategoryItem,
  Transaction,
  Account,
  Budget,
  SavingsGoal,
  RecurringBill,
  ExchangeRateData,
} from '../types';
import { exportFullBackup, parseFullBackup } from '../utils/storage';
import { getCurrencyInfo, MAJOR_CURRENCY_CODES } from '../data/currencies';
import { CurrencySelect } from './CurrencySelect';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  categories: CategoryItem[];
  onAddCategory: (category: CategoryItem) => void;
  onDeleteCategory: (id: string) => void;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  exchangeRates?: ExchangeRateData | null;
  onRefreshRates?: () => Promise<void>;
  isRefreshingRates?: boolean;
  onRestoreBackup: (data: any) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  categories,
  onAddCategory,
  onDeleteCategory,
  transactions,
  accounts,
  budgets,
  goals,
  recurring,
  exchangeRates = null,
  onRefreshRates,
  isRefreshingRates = false,
  onRestoreBackup,
  onResetSampleData,
  onClearAllData,
}: SettingsViewProps) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'Expense' | 'Income'>('Expense');
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  // Currency select modals
  const [isReportingCurrencyModalOpen, setIsReportingCurrencyModalOpen] = useState(false);
  const [isDefaultCurrencyModalOpen, setIsDefaultCurrencyModalOpen] = useState(false);
  const [isAddFavoriteModalOpen, setIsAddFavoriteModalOpen] = useState(false);

  const reportingCurInfo = getCurrencyInfo(settings.reportingCurrency || 'INR');
  const defaultCurInfo = getCurrencyInfo(settings.currency || 'INR');

  const favorites = settings.favoriteCurrencies || ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD'];

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists) {
      alert('A category with this name already exists.');
      return;
    }

    onAddCategory({
      id: `cat_custom_${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType,
      isCustom: true,
    });
    setNewCatName('');
  };

  const handleToggleFavorite = (code: string) => {
    const current = settings.favoriteCurrencies || ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD'];
    let next: string[];
    if (current.includes(code)) {
      if (current.length <= 1) {
        alert('You must keep at least one favorite currency.');
        return;
      }
      next = current.filter((c) => c !== code);
    } else {
      next = [...current, code];
    }
    onUpdateSettings({ ...settings, favoriteCurrencies: next });
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseFullBackup(text);
        if (
          window.confirm(
            `Restore backup containing ${parsed.transactions.length} transactions? Current cloud data will be updated.`
          )
        ) {
          onRestoreBackup(parsed);
          setRestoreMessage('Backup successfully restored to your private account!');
          setTimeout(() => setRestoreMessage(null), 4000);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Application Preferences & System Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize world currencies, exchange rates, themes, categories, and manage data backups
        </p>
      </div>

      {restoreMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{restoreMessage}</span>
        </div>
      )}

      {/* World Currencies & Localization */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Global Multi-Currency Preferences
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
            ISO 4217 Compliant
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every transaction and account preserves its native currency and original value. The reporting currency is used to aggregate your overall net worth, totals, and budget analytics.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Global Reporting Currency */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Consolidated Reporting Currency
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Used for overall portfolio net worth, dashboard KPIs, and charts.
            </p>
            <button
              type="button"
              onClick={() => setIsReportingCurrencyModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-semibold text-xs hover:border-emerald-500 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{reportingCurInfo.flag}</span>
                <span className="font-bold">{reportingCurInfo.code}</span>
                <span className="text-slate-400">· {reportingCurInfo.name}</span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {reportingCurInfo.symbol}
              </span>
            </button>
          </div>

          {/* Default Transaction Entry Currency */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Transaction Currency
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Initial currency selected when recording a new expense or income.
            </p>
            <button
              type="button"
              onClick={() => setIsDefaultCurrencyModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-semibold text-xs hover:border-emerald-500 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{defaultCurInfo.flag}</span>
                <span className="font-bold">{defaultCurInfo.code}</span>
                <span className="text-slate-400">· {defaultCurInfo.name}</span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {defaultCurInfo.symbol}
              </span>
            </button>
          </div>
        </div>

        {/* Currency Options & Toggles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Disambiguate Currency Symbols
              </span>
              <span className="text-slate-400 text-[11px]">
                Show specific country prefixes like US$, CA$, A$, HK$ instead of generic $ symbols.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  disambiguateSymbols: !settings.disambiguateSymbols,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                settings.disambiguateSymbols ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.disambiguateSymbols ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Live Auto-Conversion Preview
              </span>
              <span className="text-slate-400 text-[11px]">
                Automatically fetch live interbank rates and calculate reporting equivalent when entering transactions.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  autoConvert: settings.autoConvert === false ? true : false,
                })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                settings.autoConvert !== false ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.autoConvert !== false ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Exchange Rate Monitor & Refresh */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Real-Time Foreign Exchange Rates
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Verified Live
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Feed: <strong>open.er-api.com</strong> · Base: <strong>{settings.reportingCurrency}</strong> ·
                Updated: {exchangeRates ? new Date(exchangeRates.timestamp).toLocaleString() : 'Loading...'}
              </div>
            </div>

            {onRefreshRates && (
              <button
                onClick={onRefreshRates}
                disabled={isRefreshingRates}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                <span>{isRefreshingRates ? 'Refreshing...' : 'Refresh Rates Now'}</span>
              </button>
            )}
          </div>

          {/* Quick Rates Strip */}
          {exchangeRates && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
              {['USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CAD', 'AUD'].map((code) => {
                if (code === settings.reportingCurrency) return null;
                const r = exchangeRates.rates[code];
                const inverse = r ? (1 / r) : 0;
                return (
                  <div
                    key={code}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center"
                  >
                    <span className="text-slate-400 font-sans">1 {code} =</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {inverse > 0 ? inverse.toFixed(2) : '-'} {settings.reportingCurrency}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Favorite Currencies Quick Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Pinned Quick-Select Currencies
            </span>
            <button
              onClick={() => setIsAddFavoriteModalOpen(true)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pin Currency</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {favorites.map((code) => {
              const info = getCurrencyInfo(code);
              return (
                <div
                  key={code}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>{info.flag}</span>
                  <span>{code}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({info.symbol})</span>
                  <button
                    onClick={() => handleToggleFavorite(code)}
                    className="text-slate-400 hover:text-rose-600 ml-1 text-xs"
                    title="Unpin currency"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* General Preferences */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600" />
          <span>Interface & Calendar</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
              Theme Mode
            </label>
            <select
              value={settings.theme}
              onChange={(e) =>
                onUpdateSettings({ ...settings, theme: e.target.value as any })
              }
              className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
              Week Starts On
            </label>
            <select
              value={settings.weekStartsOn}
              onChange={(e) =>
                onUpdateSettings({ ...settings, weekStartsOn: e.target.value as any })
              }
              className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="Monday">Monday (Standard)</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          <span>Category Customization</span>
        </h3>

        {/* Add custom category form */}
        <form onSubmit={handleAddCategorySubmit} className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Add new custom category (e.g. Pet Care, Gym)"
            className="flex-1 min-w-[200px] py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as any)}
            className="py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
          <button
            type="submit"
            className="px-3.5 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </form>

        {/* Categories List */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300"
            >
              <span>{c.name}</span>
              <span className="text-[10px] text-slate-400">({c.type})</span>
              {c.isCustom && (
                <button
                  onClick={() => onDeleteCategory(c.id)}
                  className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                  title="Remove category"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Backup, Restore & Exports */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Data Backup, Restore & Migration</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Export complete encrypted snapshots of your transactions, accounts, and budgets in JSON format.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <button
            onClick={() =>
              exportFullBackup(
                transactions,
                accounts,
                budgets,
                goals,
                recurring,
                categories,
                settings
              )
            }
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download Full JSON Backup</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 font-semibold cursor-pointer transition">
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Restore from JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-rose-200 dark:border-rose-950/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reset to realistic sample data or permanently delete all transaction records.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => {
              if (window.confirm('Reset all transactions and accounts to default starter sample records?')) {
                onResetSampleData();
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
            Reset to Sample Data
          </button>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'WARNING: Are you sure you want to permanently erase ALL transactions and custom data? This cannot be undone.'
                )
              ) {
                onClearAllData();
              }
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
            Erase All Data
          </button>
        </div>
      </div>

      {/* Reporting Currency Selector Modal */}
      <CurrencySelect
        isOpen={isReportingCurrencyModalOpen}
        onClose={() => setIsReportingCurrencyModalOpen(false)}
        selectedCurrency={settings.reportingCurrency || 'INR'}
        onSelectCurrency={(code: string) => {
          const info = getCurrencyInfo(code);
          onUpdateSettings({
            ...settings,
            reportingCurrency: code,
            currencySymbol: info.symbol,
            locale: info.defaultLocale,
          });
        }}
        title="Select Consolidated Reporting Currency"
      />

      {/* Default Entry Currency Selector Modal */}
      <CurrencySelect
        isOpen={isDefaultCurrencyModalOpen}
        onClose={() => setIsDefaultCurrencyModalOpen(false)}
        selectedCurrency={settings.currency || 'INR'}
        onSelectCurrency={(code: string) => {
          onUpdateSettings({
            ...settings,
            currency: code,
          });
        }}
        title="Select Default Transaction Currency"
      />

      {/* Add Favorite Currency Modal */}
      <CurrencySelect
        isOpen={isAddFavoriteModalOpen}
        onClose={() => setIsAddFavoriteModalOpen(false)}
        selectedCurrency=""
        onSelectCurrency={(code: string) => {
          handleToggleFavorite(code);
        }}
        title="Pin Currency to Favorites"
      />
    </div>
  );
}
