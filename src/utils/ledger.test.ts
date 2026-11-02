import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBalanceLedger, nextDueDate, recurringTransactionId } from './ledger.js';

const acc = (id: string, balance: number) => ({ id, name: id, type: 'Savings' as const, balance });
const tx = (o: any) => ({ amount: 0, accountId: 'a', ...o });

test('income then expense: 2000 in, 500 out => 1500', () => {
  const l = createBalanceLedger([acc('a', 0)]);
  l.apply(tx({ type: 'Income', amount: 2000 }), 1);
  l.apply(tx({ type: 'Expense', amount: 500 }), 1);
  assert.equal(l.get('a')!.balance, 1500);
  assert.deepEqual(l.changedAccounts().map((a) => a.id), ['a']);
});

test('edit = revert old + apply new', () => {
  const l = createBalanceLedger([acc('a', 1500)]);
  l.apply(tx({ type: 'Expense', amount: 500 }), -1);
  l.apply(tx({ type: 'Expense', amount: 750.25 }), 1);
  assert.equal(l.get('a')!.balance, 1249.75);
});

test('delete reverses exactly', () => {
  const l = createBalanceLedger([acc('a', 1500)]);
  l.apply(tx({ type: 'Income', amount: 2000 }), -1);
  assert.equal(l.get('a')!.balance, -500);
});

test('transfer with fee and cross-currency toAmount; reversal restores both', () => {
  const l = createBalanceLedger([acc('a', 10000), acc('b', 0)]);
  const t = tx({ type: 'Transfer', amount: 1000, toAccountId: 'b', toAmount: 12, transferFee: 25 });
  l.apply(t, 1);
  assert.equal(l.get('a')!.balance, 8975);
  assert.equal(l.get('b')!.balance, 12);
  l.apply(t, -1);
  assert.equal(l.get('a')!.balance, 10000);
  assert.equal(l.get('b')!.balance, 0);
});

test('untouched accounts are not reported as changed', () => {
  const l = createBalanceLedger([acc('a', 1), acc('z', 9)]);
  l.apply(tx({ type: 'Income', amount: 1 }), 1);
  assert.deepEqual(l.changedAccounts().map((a) => a.id), ['a']);
});

test('ensure creates a missing account once', () => {
  const l = createBalanceLedger([]);
  l.ensure('acc_primary', { name: 'Primary Bank Account', type: 'Savings', isDefault: true });
  l.ensure('acc_primary', { name: 'IGNORED', type: 'Cash' });
  l.apply(tx({ type: 'Income', amount: 2000, accountId: 'acc_primary' }), 1);
  assert.equal(l.get('acc_primary')!.name, 'Primary Bank Account');
  assert.equal(l.get('acc_primary')!.balance, 2000);
});

test('nextDueDate handles month ends, leap years, year rollover', () => {
  assert.equal(nextDueDate('2026-01-31', 'Monthly'), '2026-02-28');
  assert.equal(nextDueDate('2028-01-31', 'Monthly'), '2028-02-29');
  assert.equal(nextDueDate('2026-12-15', 'Monthly'), '2027-01-15');
  assert.equal(nextDueDate('2026-12-31', 'Daily'), '2027-01-01');
  assert.equal(nextDueDate('2026-02-25', 'Weekly'), '2026-03-04');
  assert.equal(nextDueDate('2028-02-29', 'Yearly'), '2029-02-28');
});

test('recurring tx id is deterministic and rules-safe', () => {
  assert.equal(recurringTransactionId('rec_1', '2026-11-05'), recurringTransactionId('rec_1', '2026-11-05'));
  assert.match(recurringTransactionId('rec 1/x', '2026-11-05'), /^[a-zA-Z0-9_-]+$/);
});
