import { getLucideIcons } from './iconUtils';
import i18n from '@/locales/i18n';

const STATISTIC_ICON_ORDER: string[] = [
  'bar-chart',
  'bar-chart-2',
  'bar-chart-3',
  'bar-chart-horizontal',
  'line-chart',
  'area-chart',
  'pie-chart',
  'scatter-chart',
  'gantt-chart',
  'candlestick-chart',
  'trending-up',
  'trending-down',
  'activity',
  'users',
  'user',
  'wallet',
  'receipt',
  'dollar-sign',
  'calendar',
  'clock',
  'credit-card',
  'shopping-cart',
  'package',
  'target',
  'zap',
  'file',
  'message-circle',
  'heart',
  'star',
  'database',
  'calculator',
  'filter',
  'layers',
  'layout-dashboard',
  'briefcase',
  'warehouse',
];

export interface StatisticIconOption {
  value: string;
  label: string;
}

export function getStatisticIconOptions(): StatisticIconOption[] {
  const all = getLucideIcons();
  const byValue = new Map(all.map((o) => [o.value, o] as const));
  const out: StatisticIconOption[] = [];

  for (const value of STATISTIC_ICON_ORDER) {
    const row = byValue.get(value);
    if (row) {
      out.push({ value: row.value, label: row.label });
    }
  }

  const legacy: StatisticIconOption[] = [
    { value: 'dollar', label: i18n.t('common:icons.dollar_sign', 'Dollar') },
    { value: 'message', label: i18n.t('common:icons.message_square', 'Message') },
    { value: 'check-square', label: i18n.t('common:icons.check_square', 'Check square') },
  ];
  for (const row of legacy) {
    if (!out.some((o) => o.value === row.value)) {
      out.push(row);
    }
  }

  return out;
}
