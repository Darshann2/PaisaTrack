import { Transaction, WeekRange, TimeRangeFilter, CategoryItem, PaymentMethod } from '../types';
import * as XLSX from 'xlsx';
import { formatCurrency, formatINR, CurrencyFormatOptions } from './currencyFormatter';

export { formatCurrency, formatINR };
export type FormatOptions = CurrencyFormatOptions;

/**
 * Formats a date into YYYY-MM-DD string
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates Monday-to-Sunday range for any given reference date
 */
export function getWeekRange(date: Date, weekStartsOn: 'Monday' | 'Sunday' = 'Monday'): WeekRange {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  
  let diffToStart = 0;
  if (weekStartsOn === 'Monday') {
    diffToStart = (day === 0 ? -6 : 1) - day;
  } else {
    diffToStart = -day;
  }

  const startDay = new Date(d);
  startDay.setDate(d.getDate() + diffToStart);
  startDay.setHours(0, 0, 0, 0);

  const endDay = new Date(startDay);
  endDay.setDate(startDay.getDate() + 6);
  endDay.setHours(23, 59, 59, 999);

  return {
    monday: startDay,
    sunday: endDay,
    startStr: toISODate(startDay),
    endStr: toISODate(endDay),
  };
}

/**
 * Formats week range for display: e.g. "20 Oct – 26 Oct 2026"
 */
export function formatWeekLabel(monday: Date, sunday: Date): string {
  const monStr = monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const sunStr = sunday.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${monStr} – ${sunStr}`;
}

/**
 * Get date range for specified time filter
 */
export function getDateRangeForFilter(
  filter: TimeRangeFilter,
  customStart?: string,
  customEnd?: string,
  weekStartsOn: 'Monday' | 'Sunday' = 'Monday',
  fiscalYearStartMonth = 4 // April
): { start: string; end: string; label: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  if (filter === 'this_week') {
    const { monday, sunday, startStr, endStr } = getWeekRange(now, weekStartsOn);
    return { start: startStr, end: endStr, label: `This Week (${formatWeekLabel(monday, sunday)})` };
  }

  if (filter === 'last_week') {
    const lastWeekDate = new Date(now);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const { monday, sunday, startStr, endStr } = getWeekRange(lastWeekDate, weekStartsOn);
    return { start: startStr, end: endStr, label: `Last Week (${formatWeekLabel(monday, sunday)})` };
  }

  if (filter === 'this_month') {
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }

  if (filter === 'last_month') {
    const start = new Date(currentYear, currentMonth - 1, 1);
    const end = new Date(currentYear, currentMonth, 0);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  }

  if (filter === 'this_year') {
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: `Calendar Year ${currentYear}`,
    };
  }

  if (filter === 'fiscal_year') {
    // Indian FY: April 1 to March 31
    let fyStartYear = currentYear;
    if (currentMonth < fiscalYearStartMonth - 1) {
      fyStartYear = currentYear - 1;
    }
    const fyEndYear = fyStartYear + 1;
    const start = new Date(fyStartYear, fiscalYearStartMonth - 1, 1);
    const end = new Date(fyEndYear, fiscalYearStartMonth - 1, 0);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)} (Apr–Mar)`,
    };
  }

  if (filter === 'custom' && customStart && customEnd) {
    return {
      start: customStart,
      end: customEnd,
      label: `${customStart} to ${customEnd}`,
    };
  }

  // Fallback to this month
  const start = new Date(currentYear, currentMonth, 1);
  const end = new Date(currentYear, currentMonth + 1, 0);
  return {
    start: toISODate(start),
    end: toISODate(end),
    label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

/**
 * Standard Indian payment methods
 */
export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Net Banking',
  'Bank Transfer',
];

/**
 * Default categories customized for Indian households and lifestyle
 */
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat_salary', name: 'Salary', type: 'Income', color: '#16a34a' },
  { id: 'cat_freelance', name: 'Freelance & Consulting', type: 'Income', color: '#059669' },
  { id: 'cat_invest_return', name: 'Investment Dividends & Returns', type: 'Income', color: '#0d9488' },
  { id: 'cat_rent_income', name: 'Rental Income', type: 'Income', color: '#10b981' },
  { id: 'cat_other_income', name: 'Other Income', type: 'Income', color: '#22c55e' },

  { id: 'cat_groceries', name: 'Groceries & Provisions', type: 'Expense', color: '#ea580c' },
  { id: 'cat_food_dining', name: 'Dining Out & Food Delivery', type: 'Expense', color: '#f97316' },
  { id: 'cat_rent_exp', name: 'House Rent', type: 'Expense', color: '#dc2626' },
  { id: 'cat_electricity', name: 'Electricity & Utility Bills', type: 'Expense', color: '#eab308' },
  { id: 'cat_transport', name: 'Transport & Metro/Cab', type: 'Expense', color: '#3b82f6' },
  { id: 'cat_petrol', name: 'Fuel (Petrol / Diesel)', type: 'Expense', color: '#6366f1' },
  { id: 'cat_shopping', name: 'Shopping & Lifestyle', type: 'Expense', color: '#ec4899' },
  { id: 'cat_education', name: 'Education & Tuition Fees', type: 'Expense', color: '#8b5cf6' },
  { id: 'cat_subscriptions', name: 'OTT & Subscriptions', type: 'Expense', color: '#a855f7' },
  { id: 'cat_healthcare', name: 'Healthcare & Medicines', type: 'Expense', color: '#ef4444' },
  { id: 'cat_investments', name: 'Mutual Funds & SIPs', type: 'Expense', color: '#14b8a6' },
  { id: 'cat_entertainment', name: 'Movies & Entertainment', type: 'Expense', color: '#f43f5e' },
  { id: 'cat_home_maint', name: 'Home & Society Maintenance', type: 'Expense', color: '#64748b' },
  { id: 'cat_misc', name: 'Miscellaneous', type: 'Expense', color: '#94a3b8' },
];

/**
 * Exports transactions as CSV with multi-currency fields
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  reportingCurrency = 'INR',
  filename?: string
): void {
  if (transactions.length === 0) return;

  const headers = [
    'ID',
    'Date',
    'Time',
    'Description',
    'Category',
    'Subcategory',
    'Type',
    'Currency',
    'Amount',
    'Exchange Rate',
    `Reporting Amount (${reportingCurrency})`,
    'Payment Method',
    'Account',
    'Merchant',
    'Notes',
    'Tags',
  ];

  const rows = transactions.map((t) => {
    const escapedDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
    const escapedCat = `"${(t.category || '').replace(/"/g, '""')}"`;
    const escapedSubCat = `"${(t.subcategory || '').replace(/"/g, '""')}"`;
    const escapedNotes = `"${(t.notes || '').replace(/"/g, '""')}"`;
    const escapedMerchant = `"${(t.merchant || '').replace(/"/g, '""')}"`;
    const escapedTags = `"${(t.tags || []).join('; ').replace(/"/g, '""')}"`;
    const currency = t.currency || 'INR';
    const reportingAmount = typeof t.reportingAmount === 'number' ? t.reportingAmount : t.amount;
    const rate = typeof t.exchangeRate === 'number' ? t.exchangeRate : 1.0;

    return [
      t.id,
      t.date,
      t.time || '',
      escapedDesc,
      escapedCat,
      escapedSubCat,
      t.type,
      currency,
      Number(t.amount).toFixed(2),
      rate.toFixed(4),
      Number(reportingAmount).toFixed(2),
      t.paymentMethod || 'UPI',
      t.accountId || 'Default Account',
      escapedMerchant,
      escapedNotes,
      escapedTags,
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename || `transactions_${reportingCurrency.toLowerCase()}_${toISODate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports transactions to native Excel (.xlsx) file using SheetJS with multi-currency fields
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  reportingCurrency = 'INR',
  filename?: string
): void {
  if (transactions.length === 0) return;

  const data = transactions.map((t) => {
    const currency = t.currency || 'INR';
    const reportingAmount = typeof t.reportingAmount === 'number' ? t.reportingAmount : t.amount;
    const rate = typeof t.exchangeRate === 'number' ? t.exchangeRate : 1.0;

    return {
      'Transaction ID': t.id,
      'Date': t.date,
      'Time': t.time || '',
      'Type': t.type,
      'Description': t.description,
      'Category': t.category,
      'Subcategory': t.subcategory || '',
      'Currency': currency,
      'Original Amount': Number(t.amount),
      'Exchange Rate': rate,
      [`Reporting Amount (${reportingCurrency})`]: Number(reportingAmount),
      'Payment Method': t.paymentMethod,
      'Account': t.accountId,
      'Merchant / Recipient': t.merchant || '',
      'Notes': t.notes || '',
      'Tags': (t.tags || []).join(', '),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  XLSX.writeFile(workbook, filename || `transactions_${reportingCurrency.toLowerCase()}_${toISODate(new Date())}.xlsx`);
}

/**
 * Standard initial sample transactions formatted for INR with Indian context
 */
export const SAMPLE_INR_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_sample_1',
    amount: 125000,
    type: 'Income',
    description: 'Monthly Salary Credit (Infosys/TCS)',
    category: 'Salary',
    date: toISODate(new Date()),
    time: '10:00',
    paymentMethod: 'Bank Transfer',
    accountId: 'acc_salary',
    merchant: 'Employer Payroll',
    notes: 'Base salary after tax deduction',
  },
  {
    id: 'tx_sample_2',
    amount: 28500,
    type: 'Income',
    description: 'Freelance Full-Stack API Integration',
    category: 'Freelance & Consulting',
    date: toISODate(new Date(Date.now() - 3 * 86400000)),
    time: '18:30',
    paymentMethod: 'UPI',
    accountId: 'acc_savings',
    merchant: 'Bangalore Fintech Client',
  },
  {
    id: 'tx_sample_3',
    amount: 22000,
    type: 'Expense',
    description: 'House Rent (2BHK Apartment)',
    category: 'House Rent',
    date: toISODate(new Date(Date.now() - 1 * 86400000)),
    time: '09:15',
    paymentMethod: 'UPI',
    accountId: 'acc_savings',
    merchant: 'Apartment Landlord',
    notes: 'GPay transfer to owner UPI ID',
  },
  {
    id: 'tx_sample_4',
    amount: 5400,
    type: 'Expense',
    description: 'DMart Monthly Supermarket Groceries',
    category: 'Groceries & Provisions',
    date: toISODate(new Date(Date.now() - 2 * 86400000)),
    time: '19:45',
    paymentMethod: 'Debit Card',
    accountId: 'acc_savings',
    merchant: 'DMart Wholesale',
  },
  {
    id: 'tx_sample_5',
    amount: 2850,
    type: 'Expense',
    description: 'BESCOM Electricity & ACT Fibernet Bill',
    category: 'Electricity & Utility Bills',
    date: toISODate(new Date(Date.now() - 4 * 86400000)),
    time: '14:20',
    paymentMethod: 'Net Banking',
    accountId: 'acc_savings',
    merchant: 'BESCOM / ACT Fibernet',
  },
  {
    id: 'tx_sample_6',
    amount: 2200,
    type: 'Expense',
    description: 'HP Petrol Pump Full Tank Fuel',
    category: 'Fuel (Petrol / Diesel)',
    date: toISODate(new Date(Date.now() - 2 * 86400000)),
    time: '11:10',
    paymentMethod: 'Credit Card',
    accountId: 'acc_credit',
    merchant: 'Hindustan Petroleum',
  },
  {
    id: 'tx_sample_7',
    amount: 15000,
    type: 'Expense',
    description: 'Parag Parikh Flexi Cap Mutual Fund SIP',
    category: 'Mutual Funds & SIPs',
    date: toISODate(new Date(Date.now() - 5 * 86400000)),
    time: '08:00',
    paymentMethod: 'Net Banking',
    accountId: 'acc_savings',
    merchant: 'Zerodha Coin / Groww',
  },
  {
    id: 'tx_sample_8',
    amount: 1199,
    type: 'Expense',
    description: 'Netflix Premium & Spotify Family Plan',
    category: 'OTT & Subscriptions',
    date: toISODate(new Date(Date.now() - 6 * 86400000)),
    time: '21:00',
    paymentMethod: 'Credit Card',
    accountId: 'acc_credit',
    merchant: 'Netflix Entertainment',
  },
  {
    id: 'tx_sample_9',
    amount: 1450,
    type: 'Expense',
    description: 'Dinner with Family at Barbeque Nation',
    category: 'Dining Out & Food Delivery',
    date: toISODate(new Date(Date.now() - 1 * 86400000)),
    time: '20:30',
    paymentMethod: 'UPI',
    accountId: 'acc_savings',
    merchant: 'Barbeque Nation Hospitality',
  },
];
