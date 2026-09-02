/**
 * Currency symbol mapping -- the single site-wide definition point (finalized 2026-07-08).
 * The data layer (ds_store_dim.currency / the `currency` field emitted by datasources) always
 * stores currency CODES (CNY/HKD/...); symbol conversion is a presentation-layer concern and is
 * maintained here only: to change the mapping, edit this one table.
 * Unknown codes pass through as-is (e.g. 'USD2,300' -> just add it to the map) -- no blanket
 * fallback to ¥, so mistakes stay visible and debuggable.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  HKD: 'HK$',
  USD: '$',
  EUR: '€',
};

export const currencySymbol = (code: unknown): string => {
  const c = String(code ?? '').trim();
  return CURRENCY_SYMBOLS[c] ?? c;
};
