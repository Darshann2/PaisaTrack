import {
  Transaction,
  Account,
  Budget,
  SavingsGoal,
  RecurringBill,
  CategoryItem,
  AppSettings,
  AppBackupData,
} from '../types';
import { DEFAULT_CATEGORIES, SAMPLE_INR_TRANSACTIONS, toISODate } from './currency';

const STORAGE_KEYS = {
  TRANSACTIONS: 'finance_transactions',
  ACCOUNTS: 'finance_accounts',
  BUDGETS: 'finance_budgets',
  GOALS: 'finance_goals',
  RECURRING: 'finance_recurring',
  CATEGORIES: 'finance_categories',
  SETTINGS: 'finance_settings',
  LEGACY_TRANSACTIONS: 'transactions_data',
  LEGACY_OPENING_BALANCE: 'opening_balance_data',
};

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  reportingCurrency: 'INR',
  preferredDisplayCurrency: 'INR',
  locale: 'en-IN',
  theme: 'light',
  weekStartsOn: 'Monday',
  defaultPeriod: 'this_month',
  budgetWarningThreshold: 80,
  fiscalYearStartMonth: 4,
  favoriteCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'JPY'],
  recentCurrencies: ['INR', 'USD', 'EUR'],
  disambiguateSymbols: true,
  autoConvert: true,
  ratesLastUpdated: Date.now(),
};

// ==========================================
// DEMO / SANDBOX DATA (FOR TESTING ONLY)
// Never injected automatically for real user accounts!
// ==========================================
export const DEMO_SAMPLE_ACCOUNTS: Account[] = [
  {
    id: 'acc_savings',
    name: 'HDFC Savings Account',
    type: 'Savings',
    currency: 'INR',
    balance: 85000,
    accountNumber: '4821',
    color: '#0284c7',
    isDefault: true,
  },
  {
    id: 'acc_salary',
    name: 'ICICI Salary Account',
    type: 'Bank Account',
    currency: 'INR',
    balance: 145000,
    accountNumber: '9204',
    color: '#059669',
  },
  {
    id: 'acc_cash',
    name: 'Cash in Wallet',
    type: 'Cash',
    currency: 'INR',
    balance: 4500,
    color: '#d97706',
  },
  {
    id: 'acc_credit',
    name: 'SBI SimplyCLICK Credit Card',
    type: 'Credit Card',
    currency: 'INR',
    balance: -7500,
    accountNumber: '3310',
    color: '#e11d48',
  },
];

export const DEMO_SAMPLE_BUDGETS: Budget[] = [
  {
    id: 'bgt_overall',
    category: 'Overall',
    period: 'Monthly',
    amount: 65000,
    alertThreshold: 80,
    allowRollover: false,
  },
  {
    id: 'bgt_groceries',
    category: 'Groceries & Provisions',
    period: 'Monthly',
    amount: 15000,
    alertThreshold: 85,
  },
  {
    id: 'bgt_dining',
    category: 'Dining Out & Food Delivery',
    period: 'Monthly',
    amount: 6000,
    alertThreshold: 75,
  },
  {
    id: 'bgt_fuel',
    category: 'Fuel (Petrol / Diesel)',
    period: 'Monthly',
    amount: 5000,
    alertThreshold: 85,
  },
  {
    id: 'bgt_shopping',
    category: 'Shopping & Lifestyle',
    period: 'Monthly',
    amount: 8000,
    alertThreshold: 80,
  },
];

export const DEMO_SAMPLE_GOALS: SavingsGoal[] = [
  {
    id: 'goal_emergency',
    name: 'Emergency Fund (6 Months Expenses)',
    targetAmount: 300000,
    currentAmount: 195000,
    deadline: '2026-12-31',
    category: 'Emergency',
    color: '#0284c7',
    notes: 'Kept in high-yield auto-sweep fixed deposit',
  },
  {
    id: 'goal_vacation',
    name: 'Himachal & Kashmir Summer Trip',
    targetAmount: 75000,
    currentAmount: 48000,
    deadline: '2026-11-20',
    category: 'Travel',
    color: '#0d9488',
    notes: 'Flight bookings and homestays',
  },
  {
    id: 'goal_ev_scooter',
    name: 'Electric Scooter (Ather / Ola)',
    targetAmount: 140000,
    currentAmount: 65000,
    deadline: '2027-02-28',
    category: 'Vehicle',
    color: '#8b5cf6',
  },
];

export const DEMO_SAMPLE_RECURRING: RecurringBill[] = [
  {
    id: 'rec_rent',
    title: 'House Rent (Apartment)',
    amount: 22000,
    type: 'Expense',
    category: 'House Rent',
    frequency: 'Monthly',
    nextDueDate: toISODate(new Date(Date.now() + 6 * 86400000)),
    paymentMethod: 'UPI',
    accountId: 'acc_savings',
    isActive: true,
  },
  {
    id: 'rec_electricity',
    title: 'Electricity & Broadband Bill',
    amount: 2850,
    type: 'Expense',
    category: 'Electricity & Utility Bills',
    frequency: 'Monthly',
    nextDueDate: toISODate(new Date(Date.now() + 10 * 86400000)),
    paymentMethod: 'Net Banking',
    accountId: 'acc_savings',
    isActive: true,
  },
  {
    id: 'rec_sip',
    title: 'Mutual Fund SIP Investment',
    amount: 15000,
    type: 'Expense',
    category: 'Mutual Funds & SIPs',
    frequency: 'Monthly',
    nextDueDate: toISODate(new Date(Date.now() + 12 * 86400000)),
    paymentMethod: 'Net Banking',
    accountId: 'acc_salary',
    isActive: true,
  },
  {
    id: 'rec_netflix',
    title: 'Netflix & Spotify Family Subscriptions',
    amount: 1199,
    type: 'Expense',
    category: 'OTT & Subscriptions',
    frequency: 'Monthly',
    nextDueDate: toISODate(new Date(Date.now() + 15 * 86400000)),
    paymentMethod: 'Credit Card',
    accountId: 'acc_credit',
    isActive: true,
  },
  {
    id: 'rec_salary',
    title: 'Monthly Company Salary',
    amount: 125000,
    type: 'Income',
    category: 'Salary',
    frequency: 'Monthly',
    nextDueDate: toISODate(new Date(Date.now() + 5 * 86400000)),
    paymentMethod: 'Bank Transfer',
    accountId: 'acc_salary',
    isActive: true,
  },
];

// ==========================================
// CLEAN PRODUCTION DEFAULTS FOR REAL USERS
// New user accounts initialize strictly with ZERO balances & empty records
// ==========================================
export const DEFAULT_ACCOUNTS: Account[] = [];
export const DEFAULT_BUDGETS: Budget[] = [];
export const DEFAULT_GOALS: SavingsGoal[] = [];
export const DEFAULT_RECURRING: RecurringBill[] = [];

/**
 * Idempotent migration helper for individual transaction records
 */
export function migrateTransaction(t: any, defaultCurrency = 'INR'): Transaction {
  const currency = t.currency || defaultCurrency;
  const originalAmount = Number(t.amount) || 0;
  const isAmbiguous = isNaN(Number(t.amount)) || !t.date;

  return {
    id: t.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: t.type === 'Income' ? 'Income' : t.type === 'Transfer' ? 'Transfer' : 'Expense',
    amount: originalAmount,
    currency,
    reportingAmount: typeof t.reportingAmount === 'number' ? t.reportingAmount : originalAmount,
    exchangeRate: typeof t.exchangeRate === 'number' ? t.exchangeRate : 1.0,
    exchangeRateSource: t.exchangeRateSource || (t.currency ? 'User' : 'Historical INR Baseline'),
    exchangeRateDate: t.exchangeRateDate || t.date || toISODate(new Date()),
    isHistoricalRateLocked: t.isHistoricalRateLocked ?? true,
    needsReview: t.needsReview || isAmbiguous,
    fromAmount: t.fromAmount,
    toAmount: t.toAmount,
    fromCurrency: t.fromCurrency,
    toCurrency: t.toCurrency,
    transferExchangeRate: t.transferExchangeRate,
    transferFee: t.transferFee,
    transferFeeCurrency: t.transferFeeCurrency,
    description: t.description || 'Transaction',
    category: t.category || 'Miscellaneous',
    subcategory: t.subcategory,
    date: t.date || toISODate(new Date()),
    time: t.time || '',
    paymentMethod: t.paymentMethod || 'UPI',
    accountId: t.accountId || 'acc_savings',
    toAccountId: t.toAccountId,
    merchant: t.merchant,
    notes: t.notes,
    tags: Array.isArray(t.tags) ? t.tags : [],
    receiptUrl: t.receiptUrl,
  };
}

/**
 * Migration helper to preserve existing user data from previous versions
 */
export function loadInitialData(): {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  categories: CategoryItem[];
  settings: AppSettings;
} {
  // 1. Settings
  let settings: AppSettings = DEFAULT_SETTINGS;
  try {
    const rawSet = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSet) {
      const parsed = JSON.parse(rawSet);
      settings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        reportingCurrency: parsed.reportingCurrency || parsed.currency || 'INR',
        preferredDisplayCurrency: parsed.preferredDisplayCurrency || parsed.currency || 'INR',
        favoriteCurrencies: parsed.favoriteCurrencies || DEFAULT_SETTINGS.favoriteCurrencies,
        recentCurrencies: parsed.recentCurrencies || DEFAULT_SETTINGS.recentCurrencies,
      };
    }
  } catch (e) {}

  // 2. Transactions
  let migratedTransactions: Transaction[] = [];
  try {
    const rawTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (rawTx) {
      const parsed = JSON.parse(rawTx);
      if (Array.isArray(parsed) && parsed.length > 0) {
        migratedTransactions = parsed.map((t) => migrateTransaction(t, settings.currency));
      }
    } else {
      // Check legacy key
      const legacyTx = localStorage.getItem(STORAGE_KEYS.LEGACY_TRANSACTIONS);
      if (legacyTx) {
        const parsed = JSON.parse(legacyTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          migratedTransactions = parsed.map((t: any) => migrateTransaction(t, 'INR'));
        }
      }
    }
  } catch (e) {
    console.error('Error loading transactions', e);
  }

  // NOTE: For clean user isolation, empty storage returns empty arrays (0 transactions, 0 balances)
  // Demo transactions are strictly kept separate and not seeded for real accounts.

  // 3. Accounts
  let accounts: Account[] = [];
  try {
    const rawAcc = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (rawAcc) {
      const parsed = JSON.parse(rawAcc);
      if (Array.isArray(parsed) && parsed.length > 0) {
        accounts = parsed.map((a: any) => ({
          ...a,
          currency: a.currency || settings.currency || 'INR',
        }));
      }
    }
  } catch (e) {
    console.error('Error loading accounts', e);
  }

  // 4. Budgets
  let budgets: Budget[] = [];
  try {
    const rawBgt = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (rawBgt) {
      const parsed = JSON.parse(rawBgt);
      if (Array.isArray(parsed) && parsed.length > 0) {
        budgets = parsed.map((b: any) => ({
          ...b,
          currency: b.currency || settings.reportingCurrency || 'INR',
        }));
      }
    }
  } catch (e) {}

  // 5. Goals
  let goals: SavingsGoal[] = [];
  try {
    const rawGoals = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (rawGoals) {
      const parsed = JSON.parse(rawGoals);
      if (Array.isArray(parsed) && parsed.length > 0) {
        goals = parsed.map((g: any) => ({
          ...g,
          currency: g.currency || settings.reportingCurrency || 'INR',
        }));
      }
    }
  } catch (e) {}

  // 6. Recurring
  let recurring: RecurringBill[] = [];
  try {
    const rawRec = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (rawRec) {
      const parsed = JSON.parse(rawRec);
      if (Array.isArray(parsed) && parsed.length > 0) {
        recurring = parsed.map((r: any) => ({
          ...r,
          currency: r.currency || settings.currency || 'INR',
        }));
      }
    }
  } catch (e) {}

  // 7. Categories
  let categories: CategoryItem[] = DEFAULT_CATEGORIES;
  try {
    const rawCat = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (rawCat) {
      const parsed = JSON.parse(rawCat);
      if (Array.isArray(parsed) && parsed.length > 0) categories = parsed;
    }
  } catch (e) {}

  return {
    transactions: migratedTransactions,
    accounts,
    budgets,
    goals,
    recurring,
    categories,
    settings,
  };
}

/**
 * Save data to storage
 */
export function saveStorageData(
  transactions: Transaction[],
  accounts: Account[],
  budgets: Budget[],
  goals: SavingsGoal[],
  recurring: RecurringBill[],
  categories: CategoryItem[],
  settings: AppSettings
) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurring));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

    // Also mirror to legacy keys for compatibility
    localStorage.setItem(STORAGE_KEYS.LEGACY_TRANSACTIONS, JSON.stringify(transactions));
    const totalBalance = accounts.reduce((sum, a) => sum + (a.type === 'Credit Card' ? 0 : a.balance), 0);
    localStorage.setItem(STORAGE_KEYS.LEGACY_OPENING_BALANCE, totalBalance.toString());
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

/**
 * Creates full JSON backup file
 */
export function exportFullBackup(
  transactions: Transaction[],
  accounts: Account[],
  budgets: Budget[],
  goals: SavingsGoal[],
  recurring: RecurringBill[],
  categories: CategoryItem[],
  settings: AppSettings
): void {
  const backup: AppBackupData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    settings,
    accounts,
    transactions,
    budgets,
    goals,
    recurring,
    categories,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finance_backup_${toISODate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses JSON backup file
 */
export function parseFullBackup(jsonContent: string): AppBackupData {
  const parsed = JSON.parse(jsonContent);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file: content is not a JSON object.');
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('Invalid backup file: missing transactions array.');
  }

  return {
    version: parsed.version || '2.0.0',
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : DEFAULT_ACCOUNTS,
    transactions: parsed.transactions,
    budgets: Array.isArray(parsed.budgets) ? parsed.budgets : DEFAULT_BUDGETS,
    goals: Array.isArray(parsed.goals) ? parsed.goals : DEFAULT_GOALS,
    recurring: Array.isArray(parsed.recurring) ? parsed.recurring : DEFAULT_RECURRING,
    categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_CATEGORIES,
  };
}

/**
 * Explicit helper to retrieve demo seed fixtures for testing/development.
 * Kept completely isolated from real user accounts.
 */
export function getDemoSeedData() {
  return {
    accounts: DEMO_SAMPLE_ACCOUNTS,
    budgets: DEMO_SAMPLE_BUDGETS,
    goals: DEMO_SAMPLE_GOALS,
    recurring: DEMO_SAMPLE_RECURRING,
    transactions: SAMPLE_INR_TRANSACTIONS.map((t) => migrateTransaction(t, 'INR')),
  };
}
