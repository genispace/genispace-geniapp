import type { TableColumnType } from '@/types/renderers';
import { getIsMobileViewport } from '@/mobile/utils/getMobileViewportState';

export const MOBILE_ADAPTED_COMPONENT_TYPES = new Set([
  'Table',
  'Chart',
  'EChartsChart',
  'HeroCard',
  'NavTile',
  'List',
  'Form',
  'Tabs',
  'Card',
  'Statistic',
  'StatisticGroup',
]);

export function isMobileWorkbenchViewport(): boolean {
  return getIsMobileViewport();
}

export function isMobileAdaptedComponentType(type: string): boolean {
  return MOBILE_ADAPTED_COMPONENT_TYPES.has(type);
}

export function mapTableColumnsForMobile(columns: TableColumnType[] = []) {
  return columns.map((column) => ({
    key: String(column.dataIndex ?? column.key ?? column.title ?? ''),
    title: String(column.title ?? column.dataIndex ?? column.key ?? ''),
  }));
}

export function mapChartRowsForMobile(
  rows: Record<string, unknown>[] = [],
  xField?: string,
  yField?: string
) {
  const labelKey = xField || 'label';
  const valueKey = yField || 'value';

  return rows.map((row) => ({
    label: String(row[labelKey] ?? ''),
    value: Number(row[valueKey] ?? 0),
  }));
}

export type MobileChartDisplayType = 'line' | 'bar' | 'pie';

export interface MobileEChartsChartData {
  title?: string;
  displayType: MobileChartDisplayType;
  data: Array<{ label: string; value: number }>;
  gaugeValue?: number;
}

function readNumericField(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readLabelField(
  row: Record<string, unknown>,
  ...fields: string[]
): string {
  for (const field of fields) {
    const value = row[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '';
}

export function mapEChartsRowsForMobile(
  rows: Record<string, unknown>[] = [],
  options: {
    chartType?: string;
    nameField?: string;
    valueField?: string;
    categoryField?: string;
    multiLineValueFields?: string[];
    gaugeValue?: number;
    title?: string;
  } = {}
): MobileEChartsChartData {
  const chartType = options.chartType || 'bar';
  const nameField = options.nameField || 'name';
  const valueField = options.valueField || 'value';
  const categoryField = options.categoryField || 'category';

  if (chartType === 'gauge' || chartType === 'gaugeProgressRing') {
    const resolvedGaugeValue =
      options.gaugeValue ??
      (rows[0]
        ? readNumericField(rows[0], valueField) || readNumericField(rows[0], 'value')
        : 0);

    return {
      title: options.title,
      displayType: 'bar',
      data: [{ label: options.title || 'Value', value: resolvedGaugeValue }],
      gaugeValue: resolvedGaugeValue,
    };
  }

  if (chartType === 'pie') {
    return {
      title: options.title,
      displayType: 'pie',
      data: rows.map((row) => ({
        label: readLabelField(row, nameField, 'name'),
        value: readNumericField(row, valueField) || readNumericField(row, 'value'),
      })),
    };
  }

  if (chartType === 'funnel') {
    return {
      title: options.title,
      displayType: 'bar',
      data: rows.map((row) => ({
        label: readLabelField(row, nameField, 'name'),
        value: readNumericField(row, valueField) || readNumericField(row, 'value'),
      })),
    };
  }

  if (chartType === 'line') {
    return {
      title: options.title,
      displayType: 'line',
      data: rows.map((row) => ({
        label: readLabelField(row, nameField, categoryField, 'name'),
        value: readNumericField(row, valueField) || readNumericField(row, 'value'),
      })),
    };
  }

  if (chartType === 'multiLine') {
    const wideField = options.multiLineValueFields?.find(Boolean);
    if (wideField) {
      return {
        title: options.title,
        displayType: 'line',
        data: rows.map((row) => ({
          label: readLabelField(row, nameField, categoryField, 'name'),
          value: readNumericField(row, wideField),
        })),
      };
    }

    return {
      title: options.title,
      displayType: 'line',
      data: rows.map((row) => ({
        label: readLabelField(row, categoryField, nameField, 'name'),
        value: readNumericField(row, valueField) || readNumericField(row, 'value'),
      })),
    };
  }

  const isHorizontalBar = chartType === 'horizontalBar';
  const displayType: MobileChartDisplayType =
    chartType === 'line' || chartType === 'multiLine' ? 'line' : 'bar';

  return {
    title: options.title,
    displayType: isHorizontalBar || chartType === 'bar' ? 'bar' : displayType,
    data: rows.map((row) => ({
      label: readLabelField(row, nameField, categoryField, 'name'),
      value: readNumericField(row, valueField) || readNumericField(row, 'value'),
    })),
  };
}

export interface MobileStatisticItem {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
}

export function mapStatisticItemsForMobile(
  items: Array<Record<string, unknown>> = []
): MobileStatisticItem[] {
  return items.map((item) => {
    const trend = item.trend as { value?: number; description?: string } | undefined;
    return {
      title: String(item.title ?? ''),
      value: (item.value as string | number) ?? '',
      trend: typeof trend?.value === 'number' ? trend.value : undefined,
      trendLabel: trend?.description ? String(trend.description) : undefined,
    };
  });
}

export function sortGrid24ComponentsForMobileFlow<
  T extends { id?: string; rowStart?: number; colStart?: number }
>(components: T[], mobileOrder?: string[]): T[] {
  const gridSorted = [...components].sort((left, right) => {
    const rowDiff = (left.rowStart ?? 1) - (right.rowStart ?? 1);
    if (rowDiff !== 0) {
      return rowDiff;
    }
    return (left.colStart ?? 1) - (right.colStart ?? 1);
  });
  if (!mobileOrder || mobileOrder.length === 0) {
    return gridSorted;
  }
  // Explicit mobile order wins; ids missing from it (added later) keep their
  // grid reading order and append after the ordered ones.
  const rank = new Map(mobileOrder.map((id, index) => [id, index]));
  const ordered = gridSorted.filter((c) => c.id !== undefined && rank.has(c.id));
  const rest = gridSorted.filter((c) => c.id === undefined || !rank.has(c.id));
  ordered.sort((a, b) => rank.get(a.id as string)! - rank.get(b.id as string)!);
  return [...ordered, ...rest];
}
