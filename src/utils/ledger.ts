import type { Account, Transaction, RecurringBill } from '../types/finance';
import { addMoney } from './amount';

type EffectTx = Pick<
  Transaction,
  'type' | 'amount' | 'accountId' | 'toAccountId' | 'fromAmount' | 'toAmount' | 'transferFee'
>;

/**
 * In-memory view of account balances used to compute the balance changes caused by
 * creating / editing / deleting a transaction. Callers persist `changedAccounts()` in the
 * SAME atomic Firestore batch as the transaction itself.
 */
export function createBalanceLedger(accounts: Account[]) {
  const map = new Map<string, Account>(accounts.map((a) => [a.id, { ...a }]));
  const touched = new Set<string>();

  const bump = (id: string | undefined, delta: number) => {
    if (!id || delta === 0) return;
    const acc = map.get(id);
    if (!acc) return;
    map.set(id, { ...acc, balance: addMoney(acc.balance, delta) });
    touched.add(id);
  };

  return {
    /** Create a placeholder account when a transaction references one that does not exist yet. */
    ensure(id: string | undefined, defaults: Omit<Account, 'id' | 'balance'>) {
      if (!id || map.has(id)) return;
      map.set(id, { id, balance: 0, ...defaults });
      touched.add(id);
    },

    /** direction = 1 applies the transaction's effect, -1 reverses it. */
    apply(tx: EffectTx, direction: 1 | -1) {
      if (tx.type === 'Income') {
        bump(tx.accountId, direction * tx.amount);
      } else if (tx.type === 'Expense') {
        bump(tx.accountId, -direction * tx.amount);
      } else {
        // Transfer: source loses fromAmount (+ any fee), destination gains toAmount.
        bump(tx.accountId, -direction * (tx.fromAmount ?? tx.amount));
        if (tx.transferFee && tx.transferFee > 0) bump(tx.accountId, -direction * tx.transferFee);
        bump(tx.toAccountId, direction * (tx.toAmount ?? tx.fromAmount ?? tx.amount));
      }
    },

    /** Directly adjust one account (e.g. a goal contribution). */
    adjust(id: string | undefined, delta: number) {
      bump(id, delta);
    },

    get(id: string) {
      return map.get(id);
    },

    changedAccounts(): Account[] {
      return [...touched].map((id) => map.get(id)!).filter(Boolean);
    },
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Next due date for a recurring item, computed on calendar parts (no timezone drift) and
 * clamped to the end of shorter months (Jan 31 + 1 month = Feb 28/29, not Mar 3).
 */
export function nextDueDate(dateStr: string, frequency: RecurringBill['frequency']): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (frequency === 'Daily' || frequency === 'Weekly') {
    const dt = new Date(Date.UTC(y, m - 1, d + (frequency === 'Daily' ? 1 : 7)));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  const total = m - 1 + (frequency === 'Monthly' ? 1 : 12);
  const ny = y + Math.floor(total / 12);
  const nm = total % 12;
  const daysInMonth = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, daysInMonth))}`;
}

/** Deterministic id => logging the same bill for the same due date twice is detectable. */
export function recurringTransactionId(billId: string, dueDate: string): string {
  return `tx_rec_${billId}_${dueDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}
