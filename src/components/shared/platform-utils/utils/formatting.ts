import { getTimeZone } from '../cookieSettings';
import { toDateInputValue } from './toDateInputValue';

function getLocale(locale?: string): string {
  if (locale) return locale;

  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en-US';
}

export function formatDate(date: string | Date, locale?: string) {
  if (!date) return '-';
  const d = new Date(date);
  const currentLocale = getLocale(locale);
  return d.toLocaleString(currentLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatNumber(num: number, locale?: string) {
  if (!num) return '0';
  const currentLocale = getLocale(locale);
  return num.toLocaleString(currentLocale);
}

export function formatBytes(bytes: number, decimals: number = 2, t?: (key: string, defaultValue: string) => string) {
  if (bytes === 0) {
    const unit = t ? t('common.formatting.bytes', 'Bytes') : 'Bytes';
    return `0 ${unit}`;
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  const unit = t ? t(`common.formatting.${sizes[i].toLowerCase()}`, sizes[i]) : sizes[i];
  return `${value} ${unit}`;
}

export function formatLargeNumber(num: number, precision: number = 1, locale?: string): string {
  if (!num || num === 0) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const currentLocale = getLocale(locale);

  if (absNum < 1000) {
    return sign + absNum.toLocaleString(currentLocale);
  }

  const units = [
    { value: 1e12, symbol: 'T' },  
    { value: 1e9, symbol: 'B' },   
    { value: 1e6, symbol: 'M' },   
    { value: 1e3, symbol: 'K' }    
  ];

  for (const unit of units) {
    if (absNum >= unit.value) {
      const formatted = (absNum / unit.value).toFixed(precision);

      const cleaned = formatted.replace(/\.?0+$/, '');
      return sign + cleaned + unit.symbol;
    }
  }

  return sign + absNum.toLocaleString(currentLocale);
}

export function formatTokens(tokens: number, showUnit: boolean = true, locale?: string): string {
  void showUnit;

  if (!tokens && tokens !== 0) return '0';

  const formatted = formatNumber(tokens, locale);

  return formatted;
}

export const formatDuration = (seconds: number, t?: (key: string, defaultValue: string) => string): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(2);
  const minuteUnit = t ? t('common.formatting.minute_short', 'm') : 'm';
  const secondUnit = t ? t('common.formatting.second_short', 's') : 's';
  return `${minutes}${minuteUnit} ${remainingSeconds}${secondUnit}`;
};

export const formatDurationFromMs = (ms: number, t?: (key: string, defaultValue: string) => string): string => {
  const seconds = Math.floor(ms / 1000);
  return formatDuration(seconds, t);
};

export const formatDateTime = (dateString: string | null, locale?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const currentLocale = getLocale(locale);
  return date.toLocaleString(currentLocale);
};

/**
 * Format a date-only value (YYYY-MM-DD or ISO datetime) in the platform timezone.
 * Uses noon-UTC to avoid day-boundary shifts for date-only strings.
 */
export function formatLocalDate(isoDate: string | null | undefined, locale?: string): string {
  const ymd = toDateInputValue(isoDate);
  if (!ymd) return '—';
  try {
    const tz = getTimeZone();
    const currentLocale = getLocale(locale);
    return new Intl.DateTimeFormat(currentLocale, {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(`${ymd}T12:00:00Z`));
  } catch {
    return ymd;
  }
}

/**
 * Format a datetime value (ISO 8601) in the platform timezone, showing date + time.
 */
export function formatLocalDateTime(isoDatetime: string | null | undefined, locale?: string): string {
  if (!isoDatetime) return '—';
  try {
    const tz = getTimeZone();
    const currentLocale = getLocale(locale);
    return new Intl.DateTimeFormat(currentLocale, {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDatetime));
  } catch {
    return isoDatetime.slice(0, 10);
  }
}

export const formatRelativeTime = (dateString: string, t?: (key: string, defaultValue: string, options?: unknown) => string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t ? t('common.time.just_now', 'Just now') : 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t 
        ? t('common.time.minutes_ago', '{{minutes}} minutes ago', { minutes })
        : `${minutes} minutes ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t 
        ? t('common.time.hours_ago', '{{hours}} hours ago', { hours })
        : `${hours} hours ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return t 
        ? t('common.time.days_ago', '{{days}} days ago', { days })
        : `${days} days ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return t 
        ? t('common.time.months_ago', '{{months}} months ago', { months })
        : `${months} months ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return t 
        ? t('common.time.years_ago', '{{years}} years ago', { years })
        : `${years} years ago`;
    }
  } catch (error) {
    console.warn('Time formatting failed:', error);
    return t ? t('common.time.unknown', 'Unknown time') : 'Unknown time';
  }
};

