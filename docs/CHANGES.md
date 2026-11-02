# Changes made to the AI Studio export

## Root causes
1. **Form wiped while typing (the "invalid amount" error).** `TransactionModal`'s reset effect depended on `accounts` and
   `categories`. Every Firestore snapshot gave those props a new array identity, re-running the reset branch
   (`setAmount('')`, `setDescription('')`...). Submitting then failed validation. Fixed: the form initialises only when the
   modal opens or the edited transaction changes.
2. **Records not appearing / silent failures.** Snapshot error callbacks threw inside the listener (unhandled), the
   "initial load complete" counter counted snapshots instead of collections, and `length > 0` guards meant deletes/empty
   results never reached the UI. Fixed: errors are reported in a banner, loading is tracked per collection, state mirrors Firestore.
3. **Inconsistent data.** Transaction and account writes were separate (and un-awaited in the edit path); a rejected second
   write left a saved transaction with a stale balance, and a retry duplicated it. Fixed: atomic batches.

## Other fixes
- Money inputs: text + `inputMode="decimal"`, accept `2,000` / `₹20,000.50`, round to 2 dp (`src/utils/amount.ts`).
- Edit/delete of transfers now reverses `toAmount` (cross-currency) and includes the transfer fee.
- Goal withdrawals can no longer exceed the goal's saved amount.
- Recurring "Log": deterministic id per bill + due date prevents duplicates; month-end-safe next due date.
- Editing an account no longer drops `currency`, `color`, `notes`.
- Settings currency / reporting currency / live exchange rates are now passed to the transaction modal.
- Firebase config via `VITE_FIREBASE_*` with fallback to `firebase-applet-config.json`.
- `npm run clean` works on Windows; dev server binds to localhost; unused server deps removed (express, dotenv, @google/genai).
- `firestore.rules` unchanged (not weakened).

## Not changed / worth knowing
- Settings > "Reset sample data" (existing, user-initiated) writes demo transactions to your account on purpose.
- CSV import does not alter account balances (treated as historical statement data).
