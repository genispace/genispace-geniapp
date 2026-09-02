function dateToCalendarYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalize API/DB date values to YYYY-MM-DD for HTML date inputs and AppDatePicker.
 * Uses local calendar components (not UTC) so PG DATE / node-pg values stay correct in all timezones.
 */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : dateToCalendarYmd(value);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO datetimes must use local calendar parts — never slice the UTC date prefix.
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return dateToCalendarYmd(d);
  return '';
}
