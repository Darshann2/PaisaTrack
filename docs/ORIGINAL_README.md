# PaisaTrack – Professional Personal Finance & Expense Management 🇮🇳

A modern, full-featured personal finance management platform built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Chart.js**.

Formatted specifically for the **Indian Rupee (₹ / INR)**, utilizing native `Intl.NumberFormat('en-IN')` with support for Indian numbering conventions (lakhs & crores), Indian payment systems (UPI, Net Banking, IMPS/NEFT, Cards), Indian Financial Year reporting (April 1 – March 31), and comprehensive wealth tracking.

---

## 🌟 Upgraded Capabilities & Modules

### 1. Executive Fintech Dashboard
- **Real-Time KPIs**: Total Period Income, Period Expenses, Net Savings, Available Balance across all liquid accounts, and Savings Rate percentage.
- **Weekly Cashflow Comparison**: Interactive Chart.js bar chart displaying daily income vs. expense breakdown (Monday to Sunday) with responsive dark-mode styling.
- **Category Spending Distribution**: Dynamic donut chart showing proportion and percentages for top spending categories.
- **Automated Budget Alerts**: Live warning banner notifying users when overall spending reaches 75%, 80%, or 100%+ of monthly limits.
- **Upcoming Bills Calendar**: Highlights recurring bills due within the next 7 days with single-click payment recording.
- **Period Filter Engine**: Instantly recalculate the entire dashboard for:
  - *This Week (Mon–Sun)*
  - *Last Week*
  - *This Month*
  - *Last Month*
  - *Calendar Year*
  - *Indian Financial Year (Apr 1 – Mar 31)*
  - *Custom Date Range*

### 2. Comprehensive Transaction Ledger
- **Full Transaction Schema**:
  - Unique cryptographic ID (`tx_...`)
  - Type: **Expense**, **Income**, or **Account Transfer**
  - Amount in Indian Rupees (`₹`)
  - Description, Category & optional Subcategory
  - Date & Time
  - Payment Method (UPI, Cash, Debit Card, Credit Card, Net Banking, Bank Transfer)
  - Account (source account) & To-Account (for transfers)
  - Merchant / Payee
  - Notes & Custom Tags
- **Actions**:
  - Fast Add Expense & Fast Add Income
  - Record Transfer between accounts (automatically adjusts account balances without distorting income/expense totals)
  - Detailed inspection modal
  - In-place Edit
  - Duplicate transaction
  - Delete with safety confirmation
- **Search & Multi-Filters**: Filter simultaneously by keyword, type, category, account, payment method, and date range.
- **Sorting & Pagination**: Sort by Date or Amount (asc/desc), with customizable page sizes.

### 3. Spending Limits & Budgets
- Weekly and Monthly budget thresholds for **Overall Spending** and individual categories (e.g. Groceries, Dining Out, Fuel, Shopping).
- Visual progress bars with color-coded warning states (green $\rightarrow$ amber at 75-85% $\rightarrow$ rose red on overspend).
- Remaining budget calculation and percentage utilization.
- Real transaction linkage: strictly calculates actual expense outflows for that category and period.

### 4. Savings Targets & Goals
- Track multiple goals: Emergency Fund, Travel & Vacations, Vehicle Purchases, Home Down Payments, Education, and Wealth Creation.
- Displays target amount, current saved amount, deadline date, and visual progress bar.
- **Automated Monthly Savings Recommendation**:
  $$\text{Required Monthly Contribution} = \frac{\text{Target Amount} - \text{Current Saved}}{\text{Months Remaining until Deadline}}$$
- **Fund Contributions & Withdrawals**: Easily transfer money from bank accounts into savings goals, with automatic balance tracking.

### 5. Recurring Bills & Subscriptions
- Track monthly rent, BESCOM/electricity, high-speed broadband, mutual fund SIPs, OTT subscriptions (Netflix, Prime, Spotify), and monthly salary.
- Frequencies: Daily, Weekly, Monthly, and Yearly.
- Overdue indicators and upcoming due dates.
- Single-click **"Log Transaction Now"** action: records the transaction, adjusts account balances, and advances the next due date automatically without duplicate entries.
- Pause and resume recurrence anytime.

### 6. Accounts, Cards & Net Liquidity
- Track **Savings Accounts**, **Salary Accounts**, **Cash in Wallet**, **Credit Cards**, and **UPI Wallets**.
- Automatic double-entry accounting:
  - Expenses deduct from the source account.
  - Income credits to the destination account.
  - Transfers move money between accounts without altering income/expense metrics.
  - Credit card liabilities track outstanding balances separately.
- **Net Liquidity Summary**: Calculates Total Liquid Assets, Credit Card Outstandings, and Net Worth.

### 7. Financial Reports & Multi-Format Exports
- **Period Breakdown**: Daily, weekly, monthly, quarterly, yearly, and Indian Financial Year (April–March).
- **Vendor & Merchant Analysis**: Identifies top spending payees and vendors.
- **Export Options**:
  - **CSV Report**: Export filtered or complete transaction history with formatted headers.
  - **Native Excel (.xlsx)**: Export clean spreadsheets powered by SheetJS (`xlsx`).
  - **Print / PDF Financial Statement**: Optimized `@media print` layout providing clean, printable A4 financial statements.

### 8. Data Reliability, CSV Import & Backups
- **Backward-Compatible Migration**: Preserves existing `transactions_data` and `opening_balance_data` from earlier versions.
- **CSV Bank Statement Import**:
  - File upload with client-side parsing.
  - Smart column mapping (Date, Description, Amount, Type, Category).
  - Duplicate detection based on date, amount, and description.
  - Validation preview before import.
- **Full JSON Backup & Restore**: One-click download of all transactions, accounts, budgets, goals, and settings, plus instant restore.

### 9. Secure User Authentication & Cloud Synchronization 🔐
- **Real Authentication Backend**: Powered by official Firebase Authentication (`firebase/auth`).
  - **Email & Password**: Registration with live password strength evaluation (length, uppercase, lowercase, numbers, special characters), confirm password validation, terms consent, and login.
  - **Google One-Click Sign-In**: Instant Google OAuth authentication popup.
  - **Persistent Sessions**: Retains login across refreshes and browser sessions using Firebase secure storage.
  - **Password Reset Flow**: Self-service password recovery email delivery via Firebase.
  - **Email Verification**: Displays verification status with a one-click resend button.
  - **Protected Financial Routes**: All private financial ledgers, accounts, and reports are strictly gatekept behind authenticated sessions.
- **Strict Per-User Firestore Cloud Isolation**:
  - All financial data is mapped into isolated user namespaces: `/users/{userId}/{subcollection}/{docId}`.
  - Hardened with declarative `firestore.rules` adhering to the 8 security pillars: default deny, path ID validation, strict ownership validation (`request.auth.uid == userId`), and shape validators.
  - Real-time cloud sync across sessions and devices.
- **Local Data Migration Vault**:
  - When an existing user with offline records signs in or creates an account, PaisaTrack detects the offline records and displays a non-destructive migration prompt to safely upload existing records to their private cloud vault.
- **User Profile & Security Management**:
  - Update display name.
  - Change password with reauthentication checks.
  - Export personal financial archive (.json) before taking sensitive actions.
  - Danger zone: Delete account with confirmation modal and automatic ledger purge.

---

## 🇮🇳 Indian Rupee (INR) Numbering Conventions

The app natively formats currency using the official Indian numbering grouping (hundreds, thousands, lakhs, and crores):
- `₹1,000.00` (One Thousand)
- `₹25,500.00` (Twenty-Five Thousand Five Hundred)
- `₹1,00,000.00` (One Lakh)
- `₹10,00,000.00` (Ten Lakhs)
- `₹1,00,00,000.00` (One Crore)

---

## 🚀 Quick Start (Running on a Fresh Computer)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Firebase Project**: (Pre-configured via `firebase-applet-config.json` or custom project)

### Local Development
```bash
# 1. Clone repository
git clone https://github.com/<your-username>/expense-tracker-inr.git
cd expense-tracker-inr

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Production Build & Verification
```bash
# Type check and lint
npm run lint

# Production build
npm run build

# Preview build locally
npm run preview
```

---

## 📁 Project Architecture

```text
├── firebase-applet-config.json # Firebase connection credentials
├── firebase-blueprint.json     # Firestore entity and schema blueprints
├── firestore.rules             # Hardened per-user Firestore security rules
├── index.html                  # HTML5 entry point with INR title and meta
├── package.json                # Project dependencies (Firebase, React 19, Lucide, Chart.js, XLSX)
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite & Tailwind CSS bundler configuration
└── src/
    ├── App.tsx                 # Core app state, Auth guard, cloud sync orchestrator
    ├── index.css               # Global styling, Tailwind directives, dark mode & print styles
    ├── main.tsx                # React 19 mount point
    ├── context/
    │   └── AuthContext.tsx     # Firebase Auth context & session provider
    ├── services/
    │   └── firebase.ts         # Firebase SDK initialization & Firestore CRUD services
    ├── types/
    │   └── finance.ts          # Complete domain models (Transaction, Account, Budget, Goal, etc.)
    ├── components/
    │   ├── AuthView.tsx        # Login, Signup, Forgot Password & Google OAuth UI
    │   ├── ProfileView.tsx     # User profile, password change, email verification & account deletion
    │   ├── Sidebar.tsx         # Responsive navigation sidebar with User Profile access
    │   ├── Header.tsx          # Top bar with user avatar, period selector & action buttons
    │   ├── DashboardView.tsx   # Advanced executive dashboard with charts and alerts
    │   ├── TransactionsView.tsx# Transaction ledger with filters, search, and pagination
    │   ├── BudgetsView.tsx     # Weekly & monthly spending limits and progress tracking
    │   ├── GoalsView.tsx       # Savings goals with monthly required target estimator
    │   ├── RecurringView.tsx   # Recurring bills calendar with payment logger
    │   ├── AccountsView.tsx    # Bank accounts, credit cards, and net liquidity
    │   ├── ReportsView.tsx     # Financial analytics with CSV, XLSX, and PDF exports
    │   ├── SettingsView.tsx    # Category manager, themes, and full backup/restore
    │   ├── TransactionModal.tsx# Unified modal for Add Expense, Income, Transfer & Edit
    │   ├── ImportModal.tsx     # CSV import with column mapper and duplicate detector
    │   ├── WeeklyChart.tsx     # Responsive Chart.js weekly comparison bar chart
    │   └── CategoryDonutChart.tsx # Chart.js category breakdown donut chart
    └── utils/
        ├── currency.ts         # INR formatting, Indian financial years, CSV & XLSX export
        └── storage.ts          # LocalStorage persistence, migrations, and JSON backups
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
