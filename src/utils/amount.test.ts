import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, roundMoney, addMoney, sanitizeAmountInput } from './amount.ts';

test('parses the amounts required by the spec', () => {
  assert.equal(parseAmount('1'), 1);
  assert.equal(parseAmount('100'), 100);
  assert.equal(parseAmount('500'), 500);
  assert.equal(parseAmount('2000'), 2000);
  assert.equal(parseAmount('2,000'), 2000);
  assert.equal(parseAmount('₹2,000'), 2000);
  assert.equal(parseAmount('20000'), 20000);
  assert.equal(parseAmount('20,000'), 20000);
  assert.equal(parseAmount('20,000.50'), 20000.5);
  assert.equal(parseAmount('1,00,000.75'), 100000.75);
  assert.equal(parseAmount('.5'), 0.5);
});

test('rejects invalid input', () => {
  for (const bad of ['', ' ', '.', 'abc', '1.2.3', '-5', '1e5', '--', null, undefined]) {
    assert.equal(parseAmount(bad as any), null, `should reject ${String(bad)}`);
  }
});

test('roundMoney avoids floating point drift', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(20000.5), 20000.5);
  assert.equal(roundMoney(2000), 2000);
  assert.equal(roundMoney(-2.345), -2.35);
  assert.equal(roundMoney(1e-7), 0);
  assert.equal(roundMoney(1234.5678, 0), 1235);
  assert.equal(roundMoney(NaN), 0);
});

test('addMoney keeps balances exact', () => {
  let bal = 0;
  for (let i = 0; i < 10; i++) bal = addMoney(bal, 0.1);
  assert.equal(bal, 1);
  assert.equal(addMoney(2000, -500), 1500);
});

test('sanitizeAmountInput strips junk and extra dots', () => {
  assert.equal(sanitizeAmountInput('₹2,000'), '2,000');
  assert.equal(sanitizeAmountInput('12.3.4'), '12.34');
  assert.equal(sanitizeAmountInput('abc'), '');
});
