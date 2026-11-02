/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, UploadCloud, X, User } from 'lucide-react';
import {
  Transaction,
  Account,
  Budget,
  SavingsGoal,
  RecurringBill,
  CategoryItem,
  AppSettings,
  TimeRangeFilter,
  TransactionType,
  NetWorthProfile,
  ExchangeRateData,
  OtherAsset,
  OtherLiability,
} from './types';
import {
  loadInitialData,
  DEFAULT_ACCOUNTS,
  DEFAULT_BUDGETS,
  DEFAULT_GOALS,
  DEFAULT_RECURRING,
  DEFAULT_SETTINGS,
} from './utils/storage';
import {
  getDateRangeForFilter,
  DEFAULT_CATEGORIES,
  SAMPLE_INR_TRANSACTIONS,
  toISODate,
  formatINR,
} from './utils/currency';

// Firebase Services & Auth Context
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeToUserData,
  saveUserDoc,
  deleteUserDoc,
  saveUserSettingsDoc,
  saveUserNetWorthDoc,
  batchImportUserFirestoreData,
  deleteAllUserFirestoreData,
  testFirestoreConnection,
  commitUserWrites,
  type UserWriteOp,
} from './services/firebase';
import { addMoney, roundMoney } from './utils/amount';
import { fetchExchangeRates, getCachedRates } from './services/exchangeRate';
import { createBalanceLedger, nextDueDate, recurringTransactionId } from './utils/ledger';

// Component Views
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
import { RecurringView } from './components/RecurringView';
import { AccountsView } from './components/AccountsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { TransactionModal } from './components/TransactionModal';
import { ImportModal } from './components/ImportModal';
import { EditBalanceModal } from './components/EditBalanceModal';
import { EditNetWorthModal } from './components/EditNetWorthModal';
import { AuthView } from './components/AuthView';

function AuthenticatedApp() {
  const { user, loading: authLoading, logout } = useAuth();

  // Financial Data State (Scoped to Authenticated User)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [budgets, setBudgets] = useState<Budget[]>(DEFAULT_BUDGETS);
  const [goals, setGoals] = useState<SavingsGoal[]>(DEFAULT_GOALS);
  const [recurring, setRecurring] = useState<RecurringBill[]>(DEFAULT_RECURRING);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [netWorth, setNetWorth] = useState<NetWorthProfile>({
    otherAssets: [],
    otherLiabilities: [],
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [ratesData, setRatesData] = useState<ExchangeRateData | null>(() => getCachedRates());
  // Guards against double-clicks creating duplicate scheduled-payment transactions.
  const loggingRecurringRef = useRef<Set<string>>(new Set());
  const [migrationPrompt, setMigrationPrompt] = useState<{
    count: number;
    localData: any;
  } | null>(null);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('this_month');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalDefaultType, setTxModalDefaultType] = useState<TransactionType>('Expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState(false);
  const [isEditNetWorthModalOpen, setIsEditNetWorthModalOpen] = useState(false);

  // Check connection on mount
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Live exchange rates (cached; falls back to cached data when offline) for currency conversion
  useEffect(() => {
    let cancelled = false;
    fetchExchangeRates('USD')
      .then((data) => {
        if (!cancelled) setRatesData(data);
      })
      .catch((err) => console.warn('Exchange rates unavailable:', err?.message || err));
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<ExchangeRateData>).detail;
      if (detail) setRatesData(detail);
    };
    window.addEventListener('exchange_rates_updated', onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('exchange_rates_updated', onUpdated);
    };
  }, []);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Toast timer
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: nextTheme as 'light' | 'dark' };
    setSettings(updated);
    if (user) {
      saveUserSettingsDoc(user.uid, updated);
    }
  };

  // --- Real-Time Firestore Sync for Authenticated User ---
  useEffect(() => {
    if (!user) {
      // Clear in-memory state on sign out to prevent data leaks between sessions
      setTransactions([]);
      setAccounts(DEFAULT_ACCOUNTS);
      setBudgets(DEFAULT_BUDGETS);
      setGoals(DEFAULT_GOALS);
      setRecurring(DEFAULT_RECURRING);
      setCategories(DEFAULT_CATEGORIES);
      setSettings(DEFAULT_SETTINGS);
      setNetWorth({ otherAssets: [], otherLiabilities: [] });
      setIsDataLoaded(false);
      return;
    }

    setIsDataLoaded(false);
    setSyncError(null);

    const unsubscribe = subscribeToUserData(
      user.uid,
      ({
        transactions: txs,
        accounts: accs,
        budgets: bgts,
        goals: gls,
        recurring: recs,
        categories: cats,
        settings: sets,
        netWorth: nw,
        isInitialLoadComplete,
      }) => {
        // Mirror Firestore exactly (including empty results) so deletes show up immediately.
        setTransactions(txs);
        setAccounts(accs);
        setBudgets(bgts);
        setGoals(gls);
        setRecurring(recs);
        // Built-in categories stay available until the user stores their own.
        setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
        if (sets) setSettings({ ...DEFAULT_SETTINGS, ...sets });
        if (nw) {
          setNetWorth({
            otherAssets: nw.otherAssets || [],
            otherLiabilities: nw.otherLiabilities || [],
          });
        } else {
          setNetWorth({ otherAssets: [], otherLiabilities: [] });
        }

        if (isInitialLoadComplete) {
          setIsDataLoaded(true);

          // Check for existing local data to migrate if new account is empty
          if (txs.length === 0) {
            try {
              const localInitial = loadInitialData();
              if (localInitial.transactions.length > 0 && !localStorage.getItem(`migrated_${user.uid}`)) {
                setMigrationPrompt({
                  count: localInitial.transactions.length,
                  localData: localInitial,
                });
              }
            } catch (e) {
              console.warn('Could not check local data for migration:', e);
            }
          }
        }
      },
      (message) => {
        setSyncError(message);
        setIsDataLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Local Data Migration
  const handleConfirmMigration = async () => {
    if (!user || !migrationPrompt) return;
    try {
      await batchImportUserFirestoreData(user.uid, {
        transactions: migrationPrompt.localData.transactions,
        accounts: migrationPrompt.localData.accounts,
        budgets: migrationPrompt.localData.budgets,
        goals: migrationPrompt.localData.goals,
        recurring: migrationPrompt.localData.recurring,
        categories: migrationPrompt.localData.categories,
        settings: migrationPrompt.localData.settings,
      });
      localStorage.setItem(`migrated_${user.uid}`, 'true');
      setMigrationPrompt(null);
      showToast(`Migrated ${migrationPrompt.count} local transactions to your cloud account!`);
    } catch (err: any) {
      alert('Migration error: ' + (err.message || 'Failed to import data'));
    }
  };

  const handleDismissMigration = async () => {
    if (!user) return;
    localStorage.setItem(`migrated_${user.uid}`, 'true');
    setMigrationPrompt(null);
    showToast('Clean zero-balance financial profile initialized.');
  };

  // Date Range calculation for active period filter
  const { start: filterStart, end: filterEnd, label: filterLabel } = useMemo(() => {
    return getDateRangeForFilter(
      timeFilter,
      undefined,
      undefined,
      settings.weekStartsOn,
      settings.fiscalYearStartMonth
    );
  }, [timeFilter, settings.weekStartsOn, settings.fiscalYearStartMonth]);

  // Total Net Liquidity
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => {
      if (a.type === 'Credit Card') return sum - Math.abs(a.balance);
      return sum + a.balance;
    }, 0);
  }, [accounts]);

  // --- Transactions Handlers (Cloud Synchronized) ---
  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id'>,
    editId?: string
  ) => {
    if (!user) return;

    // Round every stored amount to 2 decimals so floating-point noise never reaches Firestore.
    const cleanTx: Omit<Transaction, 'id'> = {
      ...txData,
      amount: roundMoney(txData.amount),
      reportingAmount:
        txData.reportingAmount !== undefined ? roundMoney(txData.reportingAmount) : undefined,
      fromAmount: txData.fromAmount !== undefined ? roundMoney(txData.fromAmount) : undefined,
      toAmount: txData.toAmount !== undefined ? roundMoney(txData.toAmount) : undefined,
      transferFee: txData.transferFee !== undefined ? roundMoney(txData.transferFee) : undefined,
    };

    const ledger = createBalanceLedger(accounts);
    ledger.ensure(cleanTx.accountId, {
      name: 'Primary Bank Account',
      type: 'Savings',
      currency: cleanTx.currency || 'INR',
      isDefault: accounts.length === 0,
    });
    if (cleanTx.type === 'Transfer') {
      ledger.ensure(cleanTx.toAccountId, {
        name: 'Secondary Account',
        type: 'Bank Account',
        currency: cleanTx.toCurrency || cleanTx.currency || 'INR',
      });
    }

    const id = editId ?? `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const oldTx = editId ? transactions.find((t) => t.id === editId) : undefined;
    if (oldTx) ledger.apply(oldTx, -1);
    ledger.apply(cleanTx, 1);

    // One atomic batch: the transaction and every affected account balance succeed or fail together.
    const ops: UserWriteOp[] = [
      { kind: 'set', subcollection: 'transactions', data: { ...cleanTx, id } },
      ...ledger
        .changedAccounts()
        .map((acc): UserWriteOp => ({ kind: 'set', subcollection: 'accounts', data: acc })),
    ];
    await commitUserWrites(user.uid, ops);

    showToast(
      editId
        ? 'Transaction updated.'
        : `Recorded ${cleanTx.type} of ₹${cleanTx.amount.toLocaleString('en-IN')}`
    );
  };

  const handleSaveNetWorth = async (
    updatedAssets: OtherAsset[],
    updatedLiabilities: OtherLiability[]
  ) => {
    if (!user) return;
    const profile: NetWorthProfile = {
      otherAssets: updatedAssets,
      otherLiabilities: updatedLiabilities,
      updatedAt: new Date().toISOString(),
    };
    await saveUserNetWorthDoc(user.uid, profile);
    setNetWorth(profile);
    showToast('Total Net Worth updated successfully!');
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    // Reverse this transaction's effect on account balances, atomically with the delete.
    const ledger = createBalanceLedger(accounts);
    ledger.apply(target, -1);

    await commitUserWrites(user.uid, [
      ...ledger
        .changedAccounts()
        .map((acc): UserWriteOp => ({ kind: 'set', subcollection: 'accounts', data: acc })),
      { kind: 'delete', subcollection: 'transactions', id },
    ]);
    showToast('Transaction deleted.');
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    setEditingTransaction(null);
    setTxModalDefaultType(tx.type);
    setIsTxModalOpen(true);
  };

  // --- Budgets Handlers ---
  const handleSaveBudget = async (budget: Budget) => {
    if (!user) return;
    await saveUserDoc(user.uid, 'budgets', budget);
    showToast('Budget saved.');
  };

  const handleDeleteBudget = async (id: string) => {
    if (!user) return;
    await deleteUserDoc(user.uid, 'budgets', id);
    showToast('Budget deleted.');
  };

  // --- Savings Goals Handlers ---
  const handleSaveGoal = async (goal: SavingsGoal) => {
    if (!user) return;
    await saveUserDoc(user.uid, 'goals', goal);
    showToast('Savings goal saved.');
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    await deleteUserDoc(user.uid, 'goals', id);
    showToast('Savings goal deleted.');
  };

  const handleGoalContribute = async (
    goalId: string,
    amount: number,
    accountId: string,
    isWithdrawal = false
  ) => {
    if (!user) return;
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const requested = roundMoney(amount);
    if (!(requested > 0)) return;
    // A withdrawal can never take out more than the goal holds (otherwise money is created).
    const moved = isWithdrawal ? Math.min(requested, goal.currentAmount) : requested;
    const updatedAmt = addMoney(goal.currentAmount, isWithdrawal ? -moved : moved);

    const ledger = createBalanceLedger(accounts);
    ledger.adjust(accountId, isWithdrawal ? moved : -moved);

    await commitUserWrites(user.uid, [
      { kind: 'set', subcollection: 'goals', data: { ...goal, currentAmount: updatedAmt } },
      ...ledger
        .changedAccounts()
        .map((acc): UserWriteOp => ({ kind: 'set', subcollection: 'accounts', data: acc })),
    ]);

    showToast(
      isWithdrawal
        ? `Withdrew ₹${moved.toLocaleString('en-IN')} to account.`
        : `Added ₹${moved.toLocaleString('en-IN')} to goal!`
    );
  };

  // --- Recurring Handlers ---
  const handleSaveRecurring = async (bill: RecurringBill) => {
    if (!user) return;
    await saveUserDoc(user.uid, 'recurring', bill);
    showToast('Recurring schedule saved.');
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!user) return;
    await deleteUserDoc(user.uid, 'recurring', id);
    showToast('Recurring item deleted.');
  };

  const handleToggleRecurringActive = async (id: string) => {
    if (!user) return;
    const bill = recurring.find((r) => r.id === id);
    if (!bill) return;
    await saveUserDoc(user.uid, 'recurring', { ...bill, isActive: !bill.isActive });
  };

  const handleLogRecurringPayment = async (bill: RecurringBill) => {
    if (!user) return;

    // Deterministic id per bill + due date: logging the same occurrence twice is impossible.
    const txId = recurringTransactionId(bill.id, bill.nextDueDate);
    if (loggingRecurringRef.current.has(txId)) return; // double-click while in flight
    if (transactions.some((t) => t.id === txId)) {
      showToast(`${bill.title} for ${bill.nextDueDate} is already logged.`);
      return;
    }
    loggingRecurringRef.current.add(txId);

    try {
      const amount = roundMoney(bill.amount);
      const newTx: Transaction = {
        id: txId,
        type: bill.type,
        amount,
        currency: bill.currency,
        description: `${bill.title} (Scheduled Payment)`,
        category: bill.category,
        date: toISODate(new Date()),
        paymentMethod: bill.paymentMethod,
        accountId: bill.accountId,
      };

      const ledger = createBalanceLedger(accounts);
      ledger.apply(newTx, 1);

      await commitUserWrites(user.uid, [
        { kind: 'set', subcollection: 'transactions', data: newTx },
        ...ledger
          .changedAccounts()
          .map((acc): UserWriteOp => ({ kind: 'set', subcollection: 'accounts', data: acc })),
        {
          kind: 'set',
          subcollection: 'recurring',
          data: {
            ...bill,
            nextDueDate: nextDueDate(bill.nextDueDate, bill.frequency),
            lastLoggedDate: toISODate(new Date()),
          },
        },
      ]);

      showToast(`Logged ₹${amount.toLocaleString('en-IN')} for ${bill.title}`);
    } finally {
      loggingRecurringRef.current.delete(txId);
    }
  };

  // --- Accounts Handlers ---
  const handleSaveAccount = async (account: Account) => {
    if (!user) return;
    await saveUserDoc(user.uid, 'accounts', {
      ...account,
      balance: roundMoney(Number(account.balance) || 0),
    });
    showToast('Account saved.');
  };

  const handleSaveAccounts = async (updatedAccounts: Account[]) => {
    updatedAccounts = updatedAccounts.map((a) => ({ ...a, balance: roundMoney(Number(a.balance) || 0) }));
    setAccounts(updatedAccounts);
    if (user) {
      await commitUserWrites(
        user.uid,
        updatedAccounts.map((acc): UserWriteOp => ({ kind: 'set', subcollection: 'accounts', data: acc }))
      );
    }
    const newTotal = updatedAccounts
      .filter((a) => a.type !== 'Credit Card')
      .reduce((sum, a) => sum + a.balance, 0);
    showToast(`Available balance updated to ${formatINR(newTotal)}`);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!user) return;
    if (accounts.length <= 1) {
      alert('You must keep at least one active account.');
      return;
    }
    await deleteUserDoc(user.uid, 'accounts', id);
    showToast('Account deleted.');
  };

  // --- Categories Handlers ---
  const handleAddCategory = async (category: CategoryItem) => {
    if (!user) return;
    await saveUserDoc(user.uid, 'categories', category);
    showToast(`Added category "${category.name}"`);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    await deleteUserDoc(user.uid, 'categories', id);
    showToast('Category deleted.');
  };

  // --- Import Handlers ---
  const handleImportTransactions = async (newTxs: Transaction[]) => {
    if (!user || newTxs.length === 0) return;
    const CHUNK = 400;
    for (let i = 0; i < newTxs.length; i += CHUNK) {
      await commitUserWrites(
        user.uid,
        newTxs
          .slice(i, i + CHUNK)
          .map((t): UserWriteOp => ({ kind: 'set', subcollection: 'transactions', data: t }))
      );
    }
    showToast(`Imported ${newTxs.length} transactions to your private vault!`);
  };

  // --- Reset & Erase Handlers ---
  const handleResetSampleData = async () => {
    if (!user) return;
    await batchImportUserFirestoreData(user.uid, {
      transactions: SAMPLE_INR_TRANSACTIONS,
      accounts: DEFAULT_ACCOUNTS,
      budgets: DEFAULT_BUDGETS,
      goals: DEFAULT_GOALS,
      recurring: DEFAULT_RECURRING,
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    });
    showToast('Restored standard INR sample data.');
  };

  const handleClearAllData = async () => {
    if (!user) return;
    await deleteAllUserFirestoreData(user.uid);
    showToast('All transaction records erased from cloud.');
  };

  // Loading Screen while Auth initializes
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Securing your financial vault...
        </h2>
        <p className="text-xs text-slate-400 mt-1">Verifying encrypted identity</p>
      </div>
    );
  }

  // Not Logged In: Show Auth Screen
  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Migration Prompt Banner */}
      {migrationPrompt && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] bg-emerald-900/95 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <UploadCloud className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">
                  Existing Local Records Detected ({migrationPrompt.count} items)
                </h4>
                <p className="text-[11px] text-emerald-200 mt-0.5">
                  We found transactions saved in your browser prior to signing in. Would you like to upload them to your private, encrypted cloud account?
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleConfirmMigration}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                  >
                    Import to My Account
                  </button>
                  <button
                    onClick={handleDismissMigration}
                    className="px-3 py-1.5 rounded-lg border border-emerald-400/50 hover:bg-emerald-800 text-emerald-100 text-xs font-medium transition cursor-pointer"
                  >
                    Start with Sample Data
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMigrationPrompt(null)}
              className="text-emerald-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        totalBalance={totalBalance}
        theme={settings.theme}
        toggleTheme={toggleTheme}
        onOpenImport={() => setIsImportModalOpen(true)}
        userName={user.displayName || 'User'}
        userEmail={user.email || ''}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          title={
            activeTab === 'dashboard'
              ? 'Executive Financial Dashboard'
              : activeTab === 'transactions'
              ? 'Transaction Ledger'
              : activeTab === 'budgets'
              ? 'Spending Limits & Budgets'
              : activeTab === 'goals'
              ? 'Savings Targets & Goals'
              : activeTab === 'recurring'
              ? 'Recurring Payments & Bills'
              : activeTab === 'reports'
              ? 'Analytics & Financial Statements'
              : activeTab === 'accounts'
              ? 'Accounts, Cards & Wallets'
              : activeTab === 'profile'
              ? 'User Profile & Security'
              : 'System Settings & Preferences'
          }
          subtitle={
            activeTab === 'dashboard'
              ? `Logged in as ${user.email} · Real-time encrypted vault`
              : undefined
          }
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          onOpenAddExpense={() => {
            setEditingTransaction(null);
            setTxModalDefaultType('Expense');
            setIsTxModalOpen(true);
          }}
          onOpenAddIncome={() => {
            setEditingTransaction(null);
            setTxModalDefaultType('Income');
            setIsTxModalOpen(true);
          }}
          onOpenTransfer={() => {
            setEditingTransaction(null);
            setTxModalDefaultType('Transfer');
            setIsTxModalOpen(true);
          }}
          showPeriodSelector={activeTab === 'dashboard'}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {syncError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">
                Your data could not be loaded from Firestore. {syncError}
              </span>
              <button
                onClick={() => setSyncError(null)}
                className="cursor-pointer text-rose-500 hover:text-rose-700"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!isDataLoaded ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading your private financial records...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  accounts={accounts}
                  budgets={budgets}
                  goals={goals}
                  recurring={recurring}
                  timeFilter={timeFilter}
                  filterStartDate={filterStart}
                  filterEndDate={filterEnd}
                  filterLabel={filterLabel}
                  isDark={settings.theme === 'dark'}
                  otherAssets={netWorth.otherAssets}
                  otherLiabilities={netWorth.otherLiabilities}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToBudgets={() => setActiveTab('budgets')}
                  onNavigateToGoals={() => setActiveTab('goals')}
                  onNavigateToRecurring={() => setActiveTab('recurring')}
                  onQuickLogRecurring={handleLogRecurringPayment}
                  onOpenEditBalance={() => setIsEditBalanceModalOpen(true)}
                  onOpenEditNetWorth={() => setIsEditNetWorthModalOpen(true)}
                  onNavigateToAccounts={() => setActiveTab('accounts')}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  accounts={accounts}
                  categories={categories}
                  onOpenAddExpense={() => {
                    setEditingTransaction(null);
                    setTxModalDefaultType('Expense');
                    setIsTxModalOpen(true);
                  }}
                  onOpenAddIncome={() => {
                    setEditingTransaction(null);
                    setTxModalDefaultType('Income');
                    setIsTxModalOpen(true);
                  }}
                  onOpenTransfer={() => {
                    setEditingTransaction(null);
                    setTxModalDefaultType('Transfer');
                    setIsTxModalOpen(true);
                  }}
                  onEditTransaction={(tx) => {
                    setEditingTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onDuplicateTransaction={handleDuplicateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeTab === 'budgets' && (
                <BudgetsView
                  budgets={budgets}
                  transactions={transactions}
                  categories={categories}
                  onSaveBudget={handleSaveBudget}
                  onDeleteBudget={handleDeleteBudget}
                />
              )}

              {activeTab === 'goals' && (
                <GoalsView
                  goals={goals}
                  accounts={accounts}
                  onSaveGoal={handleSaveGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onContribute={handleGoalContribute}
                />
              )}

              {activeTab === 'recurring' && (
                <RecurringView
                  recurring={recurring}
                  accounts={accounts}
                  categories={categories}
                  onSaveRecurring={handleSaveRecurring}
                  onDeleteRecurring={handleDeleteRecurring}
                  onToggleActive={handleToggleRecurringActive}
                  onLogPayment={handleLogRecurringPayment}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  budgets={budgets}
                  categories={categories}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  accounts={accounts}
                  onSaveAccount={handleSaveAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onOpenTransfer={() => {
                    setEditingTransaction(null);
                    setTxModalDefaultType('Transfer');
                    setIsTxModalOpen(true);
                  }}
                  onOpenEditBalance={() => setIsEditBalanceModalOpen(true)}
                  otherAssets={netWorth.otherAssets}
                  otherLiabilities={netWorth.otherLiabilities}
                  onOpenEditNetWorth={() => setIsEditNetWorthModalOpen(true)}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  transactions={transactions}
                  accounts={accounts}
                  budgets={budgets}
                  goals={goals}
                  recurring={recurring}
                  categories={categories}
                  settings={settings}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={(s) => {
                    setSettings(s);
                    if (user) saveUserSettingsDoc(user.uid, s);
                  }}
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                  transactions={transactions}
                  accounts={accounts}
                  budgets={budgets}
                  goals={goals}
                  recurring={recurring}
                  onRestoreBackup={async (data) => {
                    if (user) {
                      await batchImportUserFirestoreData(user.uid, data);
                      showToast('Cloud backup restored successfully!');
                    }
                  }}
                  onResetSampleData={handleResetSampleData}
                  onClearAllData={handleClearAllData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Transaction Modal (Add / Edit / Transfer) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultType={txModalDefaultType}
        accounts={accounts}
        categories={categories}
        reportingCurrency={settings.reportingCurrency || settings.currency || 'INR'}
        defaultCurrency={settings.currency || 'INR'}
        ratesData={ratesData}
      />

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTransactions}
        existingTransactions={transactions}
        defaultAccountId={accounts[0]?.id || 'acc_savings'}
      />

      {/* Edit Available Balance Modal */}
      <EditBalanceModal
        isOpen={isEditBalanceModalOpen}
        onClose={() => setIsEditBalanceModalOpen(false)}
        accounts={accounts}
        onSaveAccounts={handleSaveAccounts}
        onNavigateToAccounts={() => {
          setActiveTab('accounts');
          setIsEditBalanceModalOpen(false);
        }}
      />

      {/* Edit Total Net Worth Modal */}
      <EditNetWorthModal
        isOpen={isEditNetWorthModalOpen}
        onClose={() => setIsEditNetWorthModalOpen(false)}
        accounts={accounts}
        initialOtherAssets={netWorth.otherAssets}
        initialOtherLiabilities={netWorth.otherLiabilities}
        onSave={handleSaveNetWorth}
        onOpenEditAccounts={() => {
          setIsEditNetWorthModalOpen(false);
          setIsEditBalanceModalOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
