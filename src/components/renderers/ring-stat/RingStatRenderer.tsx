import React, { useMemo, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useTranslation } from 'react-i18next';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useBoundRows } from '../data/useBoundRows';
import { ViewToggleButton, type ViewType } from '../shared/ViewToggleButton';

type Bi = string | { zh?: string; en?: string };

interface RingSegment {
  key?: string;
  label?: Bi;
  color?: string;
  value?: number; // manual value (used when no datasource row matches)
}
interface RingTableCol {
  key: string;        // 'label' | 'value'
  label?: Bi;
  align?: 'left' | 'right';
}
interface CenterValueCfg { mode?: 'ratio' | 'field' | 'manual'; field?: string; value?: number }
interface TotalValueCfg { mode?: 'sum' | 'field' | 'manual'; field?: string; value?: number }

export interface RingStatRendererProps {
  id?: string;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];

  // —— data binding ——
  segments?: RingSegment[];
  valueField?: string;      // default 'value'
  matchField?: string;      // default 'key'  (row field matched against segment.key)
  labelField?: string;      // default 'label' (used when segments not supplied)
  primarySegmentKey?: string;

  // —— ring ——
  ringSize?: number;        // px, default 112
  ringThickness?: number;   // SVG viewBox=36 stroke width, default 3.5
  trackColor?: string;      // default '#f1f5f9'
  roundCap?: boolean;       // default true

  // —— center ——
  centerValue?: CenterValueCfg;   // default { mode: 'ratio' }
  centerSuffix?: string;          // default '%'
  centerPrecision?: number;       // default 0
  centerTitle?: Bi;               // sub-label under the big number
  centerValueFontSize?: number;   // default 20
  centerTitleFontSize?: number;   // default 10

  // —— legend + total ——
  showLegend?: boolean;           // default true
  legendValueFormat?: 'plain' | 'number'; // default 'plain'
  showTotal?: boolean;            // default true
  totalLabel?: Bi;
  totalValue?: TotalValueCfg;     // default { mode: 'sum' }

  // —— view toggle / table ——
  showDataView?: boolean;         // default true
  tableColumns?: RingTableCol[];

  // —— card ——
  title?: Bi;
  bordered?: boolean;             // default true
  bare?: boolean;
  defaultPalette?: string[];
}

const RING_R = 15.9155; // r so circumference ≈ 100 → strokeDasharray maps 1:1 to percent
const DEFAULT_PALETTE = ['#10b981', '#e2e8f0', '#6366f1', '#f59e0b', '#f43f5e', '#06b6d4'];
const num = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

const RingStatRenderer: React.FC<RingStatRendererProps> = ({
  id = 'ring-stat',
  databaseDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  rows: directRows,
  useMockData = false,
  mockData,
  segments,
  valueField = 'value',
  matchField = 'key',
  labelField = 'label',
  primarySegmentKey,
  ringSize = 112,
  ringThickness = 3.5,
  trackColor = '#f1f5f9',
  roundCap = true,
  centerValue,
  centerSuffix = '%',
  centerPrecision = 0,
  centerTitle,
  centerValueFontSize = 20,
  centerTitleFontSize = 10,
  showLegend = true,
  legendValueFormat = 'plain',
  showTotal = true,
  totalLabel,
  totalValue,
  showDataView = true,
  tableColumns,
  title,
  bordered = true,
  bare = false,
  defaultPalette = DEFAULT_PALETTE,
}) => {
  const { resolveBilingualText: bi, localizeRows } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const biText = (v: Bi | undefined): string => bi(v);
  const [view, setView] = useState<ViewType>('chart');
  const narrow = useMobileFlowLayout();
  // Narrow flow (real mobile or the studio phone frame): clamp an oversized configured ring so the
  // legend beside it keeps usable width. Wide layouts keep the configured size untouched.
  const effRingSize = narrow ? Math.min(ringSize, 128) : ringSize;

  const mockRows = useMockData && Array.isArray(mockData) ? mockData : null;
  const { rows: boundRows, loading } = useBoundRows(
    directRows || mockRows ? null : databaseDataSourceConfig,
    componentParameterConfig, pageParams, id, 'ring-stat',
  );
  // metadata.locales.labels glossary: runtime zh→en mapping for Chinese row labels emitted by the datasource (e.g. Completed / To-do) (audit decision §4.2 follow-up wiring)
  const rawRows = directRows ?? mockRows ?? boundRows;
  const rows = useMemo(() => localizeRows(rawRows), [rawRows, localizeRows]);

  const byKey = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    rows.forEach(r => m.set(String(r[matchField]), r));
    return m;
  }, [rows, matchField]);

  // segments with resolved values (config defines order/color/label; data supplies value)
  const segs = useMemo(() => {
    if (segments && segments.length) {
      return segments.map((s, i) => {
        const row = s.key != null ? byKey.get(String(s.key)) : undefined;
        const value = row ? num(row[valueField]) : num(s.value);
        const label = s.label ?? (row ? (row[labelField] as Bi) : undefined);
        return { key: String(s.key ?? i), label, color: s.color ?? defaultPalette[i % defaultPalette.length], value };
      });
    }
    return rows.map((r, i) => ({
      key: String(r[matchField] ?? i),
      label: (r[labelField] as Bi) ?? '',
      color: defaultPalette[i % defaultPalette.length],
      value: num(r[valueField]),
    }));
  }, [segments, rows, byKey, valueField, labelField, matchField, defaultPalette]);

  const total = useMemo(() => {
    const mode = totalValue?.mode ?? 'sum';
    if (mode === 'manual') return num(totalValue?.value);
    if (mode === 'field' && totalValue?.field && rows[0]) return num(rows[0][totalValue.field]);
    return segs.reduce((a, s) => a + s.value, 0);
  }, [totalValue, rows, segs]);

  const primary = useMemo(
    () => segs.find(s => String(s.key) === String(primarySegmentKey)) ?? segs[0],
    [segs, primarySegmentKey],
  );

  // ring arc always = primary segment's share of total
  const arcPct = total > 0 && primary ? Math.max(0, Math.min(100, (primary.value / total) * 100)) : 0;

  // center number: ratio (= arc %) | field | manual
  const centerNum = useMemo(() => {
    const mode = centerValue?.mode ?? 'ratio';
    if (mode === 'manual') return num(centerValue?.value);
    if (mode === 'field' && centerValue?.field && rows[0]) return num(rows[0][centerValue.field]);
    return total > 0 && primary ? (primary.value / total) * 100 : 0;
  }, [centerValue, rows, primary, total]);

  const fmtVal = (v: number): string =>
    legendValueFormat === 'number' ? v.toLocaleString() : String(v % 1 === 0 ? v : Number(v.toFixed(2)));
  const centerText = `${centerNum.toFixed(centerPrecision)}${centerSuffix}`;
  const primaryColor = primary?.color ?? defaultPalette[0];

  const cols: RingTableCol[] = tableColumns ?? [
    { key: 'label', align: 'left' },
    { key: 'value', align: 'right' },
  ];

  const chartView = (
    <div className="flex items-center gap-4">
      {/* ring */}
      <div className="relative flex-shrink-0" style={{ width: effRingSize, height: effRingSize }}>
        <svg viewBox="0 0 36 36" className="h-full w-full" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r={RING_R} fill="none" stroke={trackColor} strokeWidth={ringThickness} />
          <circle
            cx="18" cy="18" r={RING_R} fill="none" stroke={primaryColor} strokeWidth={ringThickness}
            strokeDasharray={`${arcPct} ${100 - arcPct}`} strokeLinecap={roundCap ? 'round' : 'butt'}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-slate-900 dark:text-neutral-100 tabular-nums" style={{ fontSize: centerValueFontSize, fontWeight: 700, lineHeight: 1.1 }}>
            {centerText}
          </div>
          {centerTitle != null && biText(centerTitle) !== '' && (
            <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: centerTitleFontSize }}>{biText(centerTitle)}</div>
          )}
        </div>
      </div>

      {/* legend + total */}
      {showLegend && (
        <div className="flex-1 space-y-2">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600 dark:text-neutral-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {biText(s.label)}
              </span>
              <span className="tabular-nums text-slate-800 dark:text-neutral-200">{fmtVal(s.value)}</span>
            </div>
          ))}
          {showTotal && (
            <div className="border-t border-slate-100 pt-1 text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
              {biText(totalLabel) || t('ring_stat.total', 'Total')}: {fmtVal(total)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const dataView = (
    <div className="-mx-1 max-h-72 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 dark:bg-neutral-800">
          <tr>
            {cols.map(c => (
              <th key={c.key} className={cn('px-2 py-2 font-normal text-slate-500 dark:text-neutral-400', c.align === 'right' ? 'text-right' : 'text-left')}>
                {biText(c.label) || (c.key === 'label' ? t('ring_stat.col_label', 'Item') : t('ring_stat.col_value', 'Value'))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {segs.map((s, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-neutral-800">
              {cols.map(c => (
                <td key={c.key} className={cn('px-2 py-2 text-slate-700 dark:text-neutral-200', c.align === 'right' ? 'text-right tabular-nums' : 'text-left')}>
                  {c.key === 'value' ? fmtVal(s.value) : biText(s.label)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const inner = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-slate-700 dark:text-neutral-300" style={{ fontWeight: 500 }}>{biText(title)}</div>
        {showDataView && (
          <ViewToggleButton viewType={view} onToggle={() => setView(view === 'chart' ? 'data' : 'chart')} />
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-neutral-800" style={{ width: effRingSize, height: effRingSize }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
          </div>
        </div>
      ) : segs.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400 dark:text-neutral-500">{t('ring_stat.no_data', 'No data')}</div>
      ) : view === 'chart' ? chartView : dataView}
    </>
  );

  if (bare) return <div>{inner}</div>;
  return (
    <div className={cn('p-4', bordered && 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900')}>
      {inner}
    </div>
  );
};

export default RingStatRenderer;
