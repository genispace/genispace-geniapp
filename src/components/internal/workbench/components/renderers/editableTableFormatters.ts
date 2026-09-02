import type { EditableTableColumnConfig } from './EditableTable.types';

export type DateRenderFormat = 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss';

export function getDateInputMode(
  column: EditableTableColumnConfig
): 'date' | 'datetime' {
  if (column.render?.type === 'yyyy-MM-dd HH:mm:ss') return 'datetime';
  return 'date';
}

export function getDateRenderFormat(
  column: EditableTableColumnConfig
): DateRenderFormat {
  if (column.render?.type === 'yyyy-MM-dd HH:mm:ss') {
    return 'yyyy-MM-dd HH:mm:ss';
  }
  if (column.render?.type === 'yyyy-MM-dd') {
    return 'yyyy-MM-dd';
  }
  return 'yyyy-MM-dd';
}

function parseToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const n = parseInt(value, 10);
      return new Date(n < 1e10 ? n * 1000 : n);
    }
    const s = value.replace(' ', 'T');
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    return new Date(value < 1e10 ? value * 1000 : value);
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateForEditableTable(
  value: unknown,
  format: DateRenderFormat
): string {
  if (value === null || value === undefined || value === '') return '-';
  const date = parseToDate(value);
  if (!date) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (format === 'yyyy-MM-dd') {
    return `${y}-${m}-${d}`;
  }
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export function toNativeDateInputValue(
  value: unknown,
  mode: 'date' | 'datetime'
): string {
  const date = parseToDate(value);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (mode === 'date') {
    return `${y}-${m}-${d}`;
  }
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

export function fromNativeDateInputString(
  input: string,
  mode: 'date' | 'datetime'
): string {
  if (!input || !input.trim()) return '';
  if (mode === 'date') {
    return input.trim();
  }
  const t = input.includes('T') ? input.replace('T', ' ') : input;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t)) {
    return `${t}:00`;
  }
  return t;
}

export function getSwitchChecked(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }
  return false;
}

export function normalizeColorDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '#e5e5e5';
  const s = String(value).trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s)) return s;
  return '#e5e5e5';
}

export function formatNumberDisplay(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (value === '') return '-';
  return String(value);
}
