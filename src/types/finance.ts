export type TransactionType = 'Income' | 'Expense' | 'Transfer';

export type PaymentMethod =
  | 'UPI'
  | 'Cash'
  | 'Debit Card'
  | 'Credit Card'
  | 'Net Banking'
  | 'Bank Transfer';

export type AccountType =
  | 'Bank Account'
  | 'Savings'
  | 'Current'
  | 'Cash'
  | 'Credit Card'
  | 'UPI Wallet';

export interface CurrencyInfo {
  code: string; // ISO 4217, e.g. 'USD', 'INR', 'EUR'
  name: string; // e.g. 'US Dollar', 'Indian Rupee'
  symbol: string; // e.g. '$', '₹', '€'
  disambiguatedSymbol: string; // e.g. 'US$', '₹', '€', 'CA$', 'A$'
  decimals: number; // 0, 2, or 3
  defaultLocale: string; // e.g. 'en-US', 'en-IN'
  country: string; // Primary country or region
  flag?: string; // Emoji flag representation
  isMajor?: boolean;
}

export interface ExchangeRateData {
  base: string;
  date: string;
  timestamp: number;
  rates: Record<string, number>;
  source: string;
  lastFetched: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency?: string; // ISO 4217 code, defaults to user's default currency
  accountNumber?: string; // e.g. last 4 digits
  color?: string;
  icon?: string;
  isDefault?: boolean;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Original transaction amount in original currency
  currency?: string; // ISO 4217 currency code (e.g. 'INR', 'USD')
  reportingAmount?: number; // Converted equivalent in user's reporting currency
  exchangeRate?: number; // Exchange rate applied (reportingAmount / amount)
  exchangeRateSource?: string; // Source attribution (e.g. 'open.er-api.com', 'Manual')
  exchangeRateDate?: string; // Timestamp/date of the rate applied
  isHistoricalRateLocked?: boolean; // When true, does not recompute on market rate fluctuation
  needsReview?: boolean; // Flag for ambiguous historical records
  fromAmount?: number; // For Transfers: amount deducted from source account
  toAmount?: number; // For Transfers: amount credited to destination account
  fromCurrency?: string; // For Transfers: currency of source account
  toCurrency?: string; // For Transfers: currency of destination account
  transferExchangeRate?: number; // Rate used for cross-currency transfer
  transferFee?: number; // Cross-border or wire fee if any
  transferFeeCurrency?: string;
  description: string;
  category: string;
  subcategory?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  paymentMethod: PaymentMethod;
  accountId: string;
  toAccountId?: string; // for Transfers
  merchant?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string; // base64 or reference
}

export interface Budget {
  id: string;
  category: string; // 'Overall' or specific category
  period: 'Weekly' | 'Monthly';
  amount: number;
  currency?: string; // Defaults to reporting currency
  alertThreshold: number; // e.g. 80 for 80%
  allowRollover?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency?: string; // Currency in which goal is denominated
  deadline: string; // YYYY-MM-DD
  category?: string;
  color?: string;
  isArchived?: boolean;
  notes?: string;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  type: 'Expense' | 'Income';
  category: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  nextDueDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  accountId: string;
  isActive: boolean;
  autoLog?: boolean;
  lastLoggedDate?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'Expense' | 'Income' | 'Both';
  icon?: string;
  color?: string;
  isCustom?: boolean;
}

export type TimeRangeFilter =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'fiscal_year'
  | 'custom';

export interface AppSettings {
  currency: string; // Default account/entry currency (e.g. 'INR')
  currencySymbol: string; // '₹'
  reportingCurrency: string; // Global consolidated reporting currency (e.g. 'INR' or 'USD')
  preferredDisplayCurrency?: string;
  locale: string; // 'en-IN'
  theme: 'light' | 'dark' | 'system';
  weekStartsOn: 'Monday' | 'Sunday';
  defaultPeriod: TimeRangeFilter;
  budgetWarningThreshold: number; // default 80%
  fiscalYearStartMonth: number; // 4 for April (1-indexed)
  favoriteCurrencies?: string[];
  recentCurrencies?: string[];
  disambiguateSymbols?: boolean; // When true, displays 'US$' instead of '$'
  autoConvert?: boolean; // Automatically calculate reporting equivalent using live rates
  ratesLastUpdated?: number;
}

export interface AppBackupData {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  recurring: RecurringBill[];
  categories: CategoryItem[];
}

export type OtherAssetCategory =
  | 'Mutual Funds & Stocks'
  | 'Fixed Deposit (FD/RD)'
  | 'Gold & Precious Metals'
  | 'Real Estate & Property'
  | 'Provident Fund (EPF/PPF)'
  | 'Cryptocurrency'
  | 'Bonds & Debentures'
  | 'Other';

export interface OtherAsset {
  id: string;
  name: string;
  category: OtherAssetCategory;
  value: number;
  notes?: string;
  updatedAt?: string;
}

export type OtherLiabilityCategory =
  | 'Home Loan / Mortgage'
  | 'Personal Loan'
  | 'Vehicle / Car Loan'
  | 'Education Loan'
  | 'Business / Family Loan'
  | 'Line of Credit'
  | 'Other';

export interface OtherLiability {
  id: string;
  name: string;
  category: OtherLiabilityCategory;
  amount: number;
  notes?: string;
  updatedAt?: string;
}

export interface NetWorthProfile {
  otherAssets: OtherAsset[];
  otherLiabilities: OtherLiability[];
  updatedAt?: string;
}

