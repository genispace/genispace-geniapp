export type BusinessLocale = 'en-US' | 'zh-CN';

function selectedApplicationLanguage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('i18nextLng') || window.localStorage.getItem('language');
  } catch {
    return null;
  }
}

/**
 * Convert the language explicitly selected in GeniSpace into the locale used
 * for business dates, numbers and currencies. Browser locale is deliberately
 * ignored so a Chinese page cannot silently render US dates (or vice versa).
 */
export function resolveBusinessLocale(language?: string | null): BusinessLocale {
  const selectedLanguage = language || selectedApplicationLanguage();
  return selectedLanguage?.trim().toLowerCase().replaceAll('_', '-').startsWith('zh')
    ? 'zh-CN'
    : 'en-US';
}

export function formatBusinessTime(
  value: unknown,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
): string {
  return formatBusinessDate(value, language, options);
}

export function formatBusinessDate(
  value: unknown,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(resolveBusinessLocale(language), options).format(date);
}

export function formatBusinessDateTime(
  value: unknown,
  language?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return formatBusinessDate(value, language, options);
}

export function formatBusinessNumber(
  value: unknown,
  language?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat(resolveBusinessLocale(language), options).format(
    Number.isFinite(numericValue) ? numericValue : 0,
  );
}

export function formatBusinessCurrency(
  value: unknown,
  currency: unknown,
  language?: string | null,
): string {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat(resolveBusinessLocale(language), {
    style: 'currency',
    currency: String(currency || 'USD'),
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}
