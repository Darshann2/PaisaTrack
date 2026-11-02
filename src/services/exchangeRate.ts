import { ExchangeRateData } from '../types/finance';
import { getCurrencyInfo } from '../data/currencies';

const CACHE_KEY = 'paisatrack_exchange_rates_v1';
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface RateResult {
  rate: number;
  from: string;
  to: string;
  source: string;
  date: string;
  timestamp: number;
  isDirect: boolean;
}

export interface ConvertResult {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;
  rateDate: string;
  source: string;
}

/**
 * Retrieve cached exchange rates from localStorage
 */
export function getCachedRates(): ExchangeRateData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: ExchangeRateData = JSON.parse(raw);
    if (data && data.rates && typeof data.rates === 'object') {
      return data;
    }
  } catch (e) {
    console.warn('Failed to parse cached exchange rates:', e);
  }
  return null;
}

/**
 * Persist rates to localStorage
 */
function saveRatesToCache(data: ExchangeRateData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    // Dispatch custom event for reactive UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('exchange_rates_updated', { detail: data }));
    }
  } catch (e) {
    console.warn('Failed to save exchange rates to cache:', e);
  }
}

/**
 * Fetch real live exchange rates from the open exchange rate API
 * Provider: open.er-api.com (official free endpoint powered by ExchangeRate-API)
 */
export async function fetchExchangeRates(
  baseCurrency = 'USD',
  forceRefresh = false
): Promise<ExchangeRateData> {
  const cached = getCachedRates();
  const now = Date.now();

  // Return cached data if valid and fresh unless forced
  if (
    !forceRefresh &&
    cached &&
    cached.base.toUpperCase() === baseCurrency.toUpperCase() &&
    now - (cached.lastFetched || 0) < CACHE_MAX_AGE_MS
  ) {
    return cached;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency.toUpperCase())}`);
    if (!response.ok) {
      throw new Error(`Exchange rate service HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.result !== 'success' || !data.rates) {
      throw new Error(data['error-type'] || 'Failed to retrieve rates from provider.');
    }

    const rateData: ExchangeRateData = {
      base: data.base_code || baseCurrency.toUpperCase(),
      date: data.time_last_update_utc || new Date().toUTCString(),
      timestamp: data.time_last_update_unix ? data.time_last_update_unix * 1000 : now,
      rates: data.rates,
      source: 'ExchangeRate-API (open.er-api.com)',
      lastFetched: now,
    };

    saveRatesToCache(rateData);
    return rateData;
  } catch (err: any) {
    console.warn('Failed to fetch live exchange rates from network:', err);
    // If cached rates exist, return them as fallback with warning
    if (cached && Object.keys(cached.rates || {}).length > 0) {
      return cached;
    }
    throw new Error(
      `Exchange rate service currently unavailable: ${err.message || 'Network request failed'}. Please check internet connection.`
    );
  }
}

/**
 * Calculate the exchange rate between any two currencies.
 * Uses cross-rates: Rate(A -> B) = Rate(BASE -> B) / Rate(BASE -> A)
 *
 * CRITICAL: Never returns 1.0 for missing rates. Throws or returns null.
 */
export function calculateRate(
  fromCurrency: string,
  toCurrency: string,
  rateData?: ExchangeRateData | null
): RateResult | null {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();

  // Identity rate
  if (from === to) {
    return {
      rate: 1.0,
      from,
      to,
      source: 'Identical Currency',
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      isDirect: true,
    };
  }

  const rates = rateData || getCachedRates();
  if (!rates || !rates.rates) {
    return null;
  }

  const base = rates.base.toUpperCase();
  const ratesTable = rates.rates;

  // Direct case: from is base
  if (from === base && typeof ratesTable[to] === 'number') {
    return {
      rate: ratesTable[to],
      from,
      to,
      source: rates.source || 'ExchangeRate-API',
      date: rates.date,
      timestamp: rates.timestamp,
      isDirect: true,
    };
  }

  // Direct case: to is base
  if (to === base && typeof ratesTable[from] === 'number') {
    const fromRate = ratesTable[from];
    if (fromRate <= 0) return null;
    return {
      rate: 1 / fromRate,
      from,
      to,
      source: rates.source || 'ExchangeRate-API',
      date: rates.date,
      timestamp: rates.timestamp,
      isDirect: true,
    };
  }

  // Cross-rate calculation via base
  const rateFrom = ratesTable[from];
  const rateTo = ratesTable[to];

  if (typeof rateFrom === 'number' && typeof rateTo === 'number' && rateFrom > 0) {
    const crossRate = rateTo / rateFrom;
    return {
      rate: crossRate,
      from,
      to,
      source: `${rates.source} (Cross-rate via ${base})`,
      date: rates.date,
      timestamp: rates.timestamp,
      isDirect: false,
    };
  }

  return null;
}

/**
 * Safely converts an amount with exact decimal precision for target currency.
 * Eliminates JavaScript floating point anomalies (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateData?: ExchangeRateData | null
): ConvertResult | null {
  const num = Number(amount);
  if (isNaN(num)) return null;

  const rateInfo = calculateRate(fromCurrency, toCurrency, rateData);
  if (!rateInfo) return null;

  const targetInfo = getCurrencyInfo(toCurrency);
  const rawConverted = num * rateInfo.rate;

  // Exact decimal quantization
  const factor = Math.pow(10, targetInfo.decimals);
  const quantized = Math.round(rawConverted * factor) / factor;

  return {
    amount: num,
    fromCurrency: rateInfo.from,
    toCurrency: rateInfo.to,
    convertedAmount: quantized,
    rate: rateInfo.rate,
    rateDate: rateInfo.date,
    source: rateInfo.source,
  };
}

/**
 * Safe integer minor unit representation (cents, paise, etc.)
 */
export function toMinorUnits(amount: number, currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  const factor = Math.pow(10, info.decimals);
  return Math.round(Number(amount) * factor);
}

export function fromMinorUnits(minorAmount: number, currencyCode: string): number {
  const info = getCurrencyInfo(currencyCode);
  const factor = Math.pow(10, info.decimals);
  return Number(minorAmount) / factor;
}
