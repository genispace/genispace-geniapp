/**
 * IANA time zone helpers using Intl (supportedValuesOf, DisplayNames).
 * Labels follow the given BCP 47 locale (e.g. en-US, zh-CN).
 */

/** Used only when Intl.supportedValuesOf('timeZone') is missing (legacy runtimes). */
const FALLBACK_IANA_IDS: readonly string[] = [
  'UTC',
  'Etc/UTC',
  // Asia / Oceania
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Australia/Melbourne',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  // Europe
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/Dublin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Zurich',
  // Africa
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  // Americas
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Chicago',
  'America/Denver',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
];

function trySupportedTimeZones(): string[] | null {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    if (typeof intl.supportedValuesOf === 'function') {
      return intl.supportedValuesOf('timeZone');
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** All IANA zone IDs available in the runtime, sorted lexicographically. */
export function getAllIanaTimeZoneIds(): string[] {
  const fromIntl = trySupportedTimeZones();
  if (fromIntl?.length) {
    return [...fromIntl].sort((a, b) => a.localeCompare(b));
  }
  return [...FALLBACK_IANA_IDS].sort((a, b) => a.localeCompare(b));
}

function getGmtOffsetShort(timeZone: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

function getTimeZoneDisplayName(timeZoneId: string, locale: string): string {
  try {
    const dn = new Intl.DisplayNames([locale], {
      type: 'timeZone' as Intl.DisplayNamesOptions['type'],
    });
    const name = dn.of(timeZoneId);
    if (name) return name;
  } catch {
    /* ignore */
  }
  return timeZoneId;
}

export type TimeZoneSelectOption = { value: string; label: string };

/**
 * Build sorted options for a select: localized name + GMT offset (winter reference date).
 */
export function buildTimeZoneSelectOptions(locale: string, refDate = new Date()): TimeZoneSelectOption[] {
  const ids = getAllIanaTimeZoneIds();
  const options: TimeZoneSelectOption[] = ids.map((id) => {
    const display = getTimeZoneDisplayName(id, locale);
    const off = getGmtOffsetShort(id, refDate);
    const label = off ? `${display} (${off})` : display;
    return { value: id, label };
  });
  options.sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' }));
  return options;
}
