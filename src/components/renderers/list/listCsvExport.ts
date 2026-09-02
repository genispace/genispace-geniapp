import type { ListColumn } from '@/types/renderers';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateListCsv(
  rows: Record<string, unknown>[],
  columns: ListColumn[]
): string {
  const exportColumns = columns.filter((c) => c.dataIndex && !c.hidden);
  const cols =
    exportColumns.length > 0
      ? exportColumns
      : rows[0]
        ? Object.keys(rows[0]).map((key) => ({
            dataIndex: key,
            title: key,
            slotType: 'custom' as const,
          }))
        : [];

  const header = cols.map((c) => escapeCsv(c.title ?? c.dataIndex)).join(',');
  const body = rows
    .map((row) => cols.map((c) => escapeCsv(row[c.dataIndex])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadListCsv(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
