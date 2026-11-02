/**
 * Money input helpers.
 *
 * Why this exists: <input type="number"> rejects thousands separators ("2,000"),
 * applies a `step` relative to `min` (so min="0.01" + step="0.01" can reject
 * valid values like 2000 because of floating-point error), and silently yields
 * an empty string for anything it considers invalid. Money fields therefore use
 * a text input with inputMode="decimal" and these helpers.
 */

/** Keep only characters that can be part of a money amount while typing. */
export function sanitizeAmountInput(raw: string): string {
  // Allow digits, commas, and a single dot.
  let cleaned = raw.replace(/[^\d.,]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

/**
 * Parse a user-typed amount such as "2000", "2,000", "₹20,000.50", " 1,00,000 ".
 * Returns null when the text is not a finite, non-negative number.
 * The result is NOT rounded; use roundMoney() for storage.
 */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;

  const cleaned = raw.replace(/[₹$€£\s,]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return null;

  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Round to a fixed number of decimals without floating-point drift
 * (e.g. 1.005 -> 1.01, 0.1 + 0.2 -> 0.3). Uses exponent-shifting.
 */
export function roundMoney(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  // Exponent notation (very large/small numbers) can't be string-shifted safely.
  if (String(Math.abs(value)).includes('e')) {
    const f = Math.pow(10, decimals);
    return Math.round(value * f) / f;
  }
  const shifted = Number(`${Math.abs(value)}e${decimals}`);
  const rounded = Number(`${Math.round(shifted)}e-${decimals}`);
  return value < 0 ? -rounded : rounded;
}

/** Add two money values safely (balances, contributions, deltas). */
export function addMoney(a: number, b: number, decimals = 2): number {
  return roundMoney(a + b, decimals);
}

/**
 * Like parseAmount() but returns NaN for invalid input (drop-in replacement for
 * parseFloat() in existing `isNaN(x) || x <= 0` guards) and rounds valid input.
 */
export function parseMoney(raw: string | number | null | undefined, decimals = 2): number {
  const v = parseAmount(raw);
  return v === null ? NaN : roundMoney(v, decimals);
}
