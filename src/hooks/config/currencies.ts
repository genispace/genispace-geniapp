export const ROUTE_NEW_PLACEHOLDER = 'new';

export const COMMON_CURRENCY_OPTIONS = [
  'USD',
  'CNY',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'AUD',
  'CAD',
  'SGD',
  'CHF',
] as const;

export type CurrencyCode = (typeof COMMON_CURRENCY_OPTIONS)[number];

const displayNamesCache = new Map<string, Intl.DisplayNames>();

function getDisplayNames(locale: string): Intl.DisplayNames {
  let dn = displayNamesCache.get(locale);
  if (!dn) {
    dn = new Intl.DisplayNames([locale], { type: 'currency' });
    displayNamesCache.set(locale, dn);
  }
  return dn;
}

export function currencyLabel(code: string, locale = 'en'): string {
  const upper = code.trim().toUpperCase();
  try {
    return getDisplayNames(locale).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function parseEnabledCurrenciesJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string').map((x) => x.trim().toUpperCase());
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseEnabledCurrenciesJson(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeEnabledCurrencies(
  codes: string[] | null | undefined,
  options: { minOne?: string } = {}
): string[] {
  const minOne = (options.minOne ?? 'USD').toUpperCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes ?? []) {
    const upper = code.trim().toUpperCase();
    if (!upper || seen.has(upper)) continue;
    seen.add(upper);
    out.push(upper);
  }
  if (out.length === 0) return [minOne];
  if (!seen.has(minOne)) out.unshift(minOne);
  return out;
}

export const DEFAULT_ENABLED_CURRENCIES = ['USD'] as const;
