import type { ListRenderProps } from '@/types/renderers';

export interface ListProgressContext {
  record: Record<string, unknown>;
  pageData: Record<string, unknown>[];
  allData: Record<string, unknown>[];
}

export function formatListNumber(value: unknown, props: ListRenderProps = {}): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '');

  const {
    format = 'plain',
    prefix = '',
    suffix = '',
    decimals = 0,
    compactThreshold = 10000,
    compactDivisor = 10000,
    locale = 'zh-CN',
  } = props;

  switch (format) {
    case 'thousands':
      return `${prefix}${num.toLocaleString(locale)}${suffix}`;
    case 'compact':
      if (Math.abs(num) >= compactThreshold) {
        const compactValue = (num / compactDivisor).toFixed(decimals);
        return `${prefix}${compactValue}${suffix || 'w'}`;
      }
      return `${prefix}${num.toLocaleString(locale)}${suffix}`;
    case 'currency': {
      if (prefix || suffix) {
        const formatted =
          decimals > 0 ? num.toFixed(decimals) : num.toLocaleString(locale);
        return `${prefix}${formatted}${suffix}`;
      }
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
        .format(num)
        .replace('CN¥', '¥');
    }
    case 'percent':
      return `${num.toFixed(decimals)}${suffix || '%'}`;
    default:
      return `${prefix}${
        decimals > 0 ? num.toFixed(decimals) : String(num)
      }${suffix}`;
  }
}

export function calcProgressValue(
  raw: unknown,
  props: ListRenderProps = {},
  context?: ListProgressContext
): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;

  const { relativeTo = 'none', relativeField, max = 100 } = props;
  if (relativeTo === 'none') {
    return Math.min(max, Math.max(0, num));
  }

  const source =
    relativeTo === 'dataMax'
      ? context?.allData ?? context?.pageData ?? []
      : context?.pageData ?? [];

  const field = relativeField ?? (context?.record
    ? Object.keys(context.record)[0]
    : undefined);

  if (!field || source.length === 0) {
    return Math.min(max, Math.max(0, num));
  }

  const maxVal = Math.max(...source.map((row) => Number(row[field]) || 0), 0);
  if (maxVal <= 0) return 0;
  return Math.min(100, (num / maxVal) * 100);
}

export function resolveListRank(
  props: ListRenderProps,
  context: { index: number; record: Record<string, unknown> }
): number {
  const { rankSource = 'index', rankField, rankOffset = 0 } = props;
  if (rankSource === 'field' && rankField) {
    const fromField = Number(context.record[rankField]);
    if (Number.isFinite(fromField)) return fromField;
  }
  return context.index + 1 + rankOffset;
}
