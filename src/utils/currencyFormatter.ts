import { getCurrencyInfo } from '../data/currencies';

export interface CurrencyFormatOptions {
  compact?: boolean;
  noDecimals?: boolean;
  showSign?: boolean;
  hideSymbol?: boolean;
  showCode?: boolean; // Append or show ISO code e.g. "USD 100.00"
  disambiguate?: boolean; // Use disambiguated symbol like "US$" instead of "$"
  localeOverride?: string;
}

// In-memory cache for Intl formatters to avoid expensive instantiation
const formatterCache = new Map<string, Intl.NumberFormat>();

function getIntlFormatter(
  locale: string,
  currencyCode: string,
  minDecimals: number,
  maxDecimals: number,
  compact = false
): Intl.NumberFormat {
  const cacheKey = `${locale}_${currencyCode}_${minDecimals}_${maxDecimals}_${compact}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
        notation: compact ? 'compact' : 'standard',
      });
      formatterCache.set(cacheKey, formatter);
    } catch (e) {
      // Fallback if specific currency is not supported by host's Intl implementation
      formatter = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
        notation: compact ? 'compact' : 'standard',
      });
      formatterCache.set(cacheKey, formatter);
    }
  }
  return formatter;
}

/**
 * Universal Currency Formatter
 * Supports ISO 4217 currencies, 0-decimal, 2-decimal, and 3-decimal precision,
 * Indian numbering system (en-IN), and disambiguated symbol display.
 */
export function formatCurrency(
  val: number,
  currencyCode = 'INR',
  options: CurrencyFormatOptions = {}
): string {
  const num = Number(val);
  if (isNaN(num)) return '0.00';

  const code = currencyCode.toUpperCase();
  const info = getCurrencyInfo(code);

  const decimals = options.noDecimals ? 0 : info.decimals;
  const locale = options.localeOverride || (code === 'INR' ? 'en-IN' : info.defaultLocale || 'en-US');

  const formatter = getIntlFormatter(
    locale,
    code,
    decimals,
    decimals,
    options.compact && Math.abs(num) >= 1000
  );

  let formatted = formatter.format(Math.abs(num));

  // If disambiguate symbol requested and currency uses a shared symbol like $
  if (options.disambiguate && info.disambiguatedSymbol !== info.symbol) {
    // Replace standard symbol with disambiguated symbol (e.g. $ -> US$ or CA$)
    formatted = formatted.replace(info.symbol, info.disambiguatedSymbol);
  }

  if (options.hideSymbol) {
    formatted = formatted
      .replace(info.disambiguatedSymbol, '')
      .replace(info.symbol, '')
      .replace(code, '')
      .trim();
  }

  if (options.showCode) {
    formatted = `${formatted} ${code}`;
  }

  if (options.showSign) {
    if (num > 0) return `+${formatted}`;
    if (num < 0) return `-${formatted}`;
  } else if (num < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

/**
 * Backward compatibility alias for existing INR components
 */
export function formatINR(val: number, options: CurrencyFormatOptions = {}): string {
  return formatCurrency(val, 'INR', options);
}
