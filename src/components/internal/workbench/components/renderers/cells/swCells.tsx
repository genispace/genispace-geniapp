import React from 'react';
import { cn } from '@genispace/shared-utils';
import { formatCompactCurrency, formatCompactK, formatCurrencyK } from '../heroCardUtils';
import { currencySymbol } from '@/utils/currencySymbol';





export type SwCellFormat =
  | 'currency-compact'
  | 'currency-k'
  | 'compact-k'
  | 'percent1'
  | 'number2'
  | 'number'
  | 'plain';

export type SwCellType = 'Stacked' | 'Delta' | 'PctBar' | 'RankBadge' | 'Currency' | 'Number' | 'Badge';

/** Threshold rule → a class/token; first match wins. `eq` matches by string equality. */
export interface ColorRule {
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
  eq?: number | string;
  /** Result token: a tailwind text class for cells, or a tone key for Badge. */
  color: string;
}

/** First matching rule's color, else undefined. */
export function matchColorRule(value: unknown, rules?: ColorRule[]): string | undefined {
  if (!rules || rules.length === 0) return undefined;
  const num = Number(value);
  for (const r of rules) {
    if (r.eq !== undefined) { if (String(value) === String(r.eq)) return r.color; continue; }
    if (!Number.isFinite(num)) continue;
    if (r.gte !== undefined && !(num >= r.gte)) continue;
    if (r.gt !== undefined && !(num > r.gt)) continue;
    if (r.lte !== undefined && !(num <= r.lte)) continue;
    if (r.lt !== undefined && !(num < r.lt)) continue;
    return r.color;
  }
  return undefined;
}

/** Badge tone tokens → bg+text classes. */
export const BADGE_TONE: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300',
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400',
};

export interface SwCellProps {

  format?: SwCellFormat;
  
  mainField?: string;
  
  subField?: string;
  
  subFormat?: SwCellFormat;
  
  subPrefix?: string;
  
  subSuffix?: string;
  
  subKind?: 'value' | 'diffPct' | 'diffPP' | 'signed';
  
  baselineField?: string;
  
  emptyDash?: boolean;
  
  currency?: string;
  
  
  topHighlight?: number;
  
  highlightFrom?: string;
  
  highlightTo?: string;
  
  defaultFill?: string;
  
  rankStyle?: 'square' | 'circle';
  
  rankSize?: 'xs' | 'sm' | 'md';
  
  medalTop?: number;
  // ── Currency / Number ──
  
  currencyField?: string;

  compact?: boolean;

  decimals?: number;
  // ── Badge / threshold color ──
  /** Text prefix (e.g. '#'). */
  prefix?: string;
  /** Static badge tone key (see BADGE_TONE); overridden by colorRules match. */
  tone?: string;
  /** Threshold rules: text color for Number, tone for Badge. */
  colorRules?: ColorRule[];
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
};

export function formatSwValue(v: unknown, format: SwCellFormat = 'plain', currency = 'CNY'): string {
  switch (format) {
    case 'currency-compact':
      return formatCompactCurrency(v, currency);
    case 'currency-k':
      return formatCurrencyK(v, currency);
    case 'compact-k':
      return formatCompactK(v);
    case 'percent1':
      return Number.isFinite(n(v)) ? `${n(v).toFixed(1)}%` : '—';
    case 'number2':
      return Number.isFinite(n(v)) ? n(v).toFixed(2) : '—';
    case 'number':
      return Number.isFinite(n(v)) ? n(v).toLocaleString() : '—';
    default:
      return v == null ? '' : String(v);
  }
}

function diffPct(v: unknown, ly: unknown): { t: string; up: boolean } | null {
  if (!Number.isFinite(n(v)) || !Number.isFinite(n(ly)) || n(ly) === 0) return null;
  const d = (n(v) / n(ly) - 1) * 100;
  return { t: `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, up: d >= 0 };
}
function diffPP(v: unknown, ly: unknown): { t: string; up: boolean } | null {
  if (!Number.isFinite(n(v)) || !Number.isFinite(n(ly))) return null;
  const d = n(v) - n(ly);
  return { t: `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`, up: d >= 0 };
}
const diffCls = (up: boolean) => (up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400');

function resolveCurrency(row: Record<string, unknown>, cfg: SwCellProps): string {
  if (cfg.currency) return cfg.currency;
  return typeof row.currency === 'string' ? row.currency : 'CNY';
}

function StackedCell({
  row,
  cfg,
  columnField,
}: {
  row: Record<string, unknown>;
  cfg: SwCellProps;
  columnField: string;
}) {
  const currency = resolveCurrency(row, cfg);
  const mainField = cfg.mainField ?? columnField;
  const rawMain = row[mainField];
  
  if (cfg.emptyDash && (rawMain == null || !Number.isFinite(Number(rawMain)))) {
    return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  }
  const main = formatSwValue(rawMain, cfg.format ?? 'plain', currency);

  let subEl: React.ReactNode = null;
  if (cfg.subKind === 'diffPct' && cfg.baselineField) {
    const d = diffPct(rawMain, row[cfg.baselineField]);
    if (d) subEl = <span className={cn('text-[11px] tabular-nums', diffCls(d.up))}>{d.t}</span>;
  } else if (cfg.subKind === 'diffPP' && cfg.baselineField) {
    const d = diffPP(rawMain, row[cfg.baselineField]);
    if (d) subEl = <span className={cn('text-[11px] tabular-nums', diffCls(d.up))}>{d.t}</span>;
  } else if (cfg.subKind === 'signed' && cfg.subField) {
    const rawSub = row[cfg.subField];
    // YoY/MoM with a zero denominator arrives as SQL NULL → render '—'. The null check must run
    // before n(): n(null) is 0, which would mislead as +0.0%.
    if (rawSub === null || rawSub === undefined || rawSub === '') {
      subEl = <span className="text-[11px] text-slate-400 dark:text-neutral-500">—</span>;
    } else {
      const sv = n(rawSub);
      if (Number.isFinite(sv)) {
        const up = sv >= 0;
        subEl = (
          <span className={cn('text-[11px] tabular-nums', diffCls(up))}>
            {up ? '+' : ''}
            {sv.toFixed(1)}
            {cfg.subSuffix ?? ''}
          </span>
        );
      }
    }
  } else if (cfg.subField) {
    const subTxt = `${cfg.subPrefix ?? ''}${formatSwValue(row[cfg.subField], cfg.subFormat ?? cfg.format ?? 'plain', currency)}`;
    subEl = <span className="text-[11px] text-slate-400 dark:text-neutral-500 tabular-nums">{subTxt}</span>;
  }

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="tabular-nums text-slate-700 dark:text-neutral-300">{main}</span>
      {subEl}
    </div>
  );
}

function DeltaCell({
  row,
  cfg,
  columnField,
}: {
  row: Record<string, unknown>;
  cfg: SwCellProps;
  columnField: string;
}) {
  const field = cfg.mainField ?? columnField;
  const v = row[field];
  // Zero-denominator YoY (new store, no LY) arrives as SQL NULL → render '—'. The null check must
  // run before n(): n(null) is 0, which would mislead as +0.0%.
  if (v === null || v === undefined || v === '') return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  if (!Number.isFinite(n(v))) return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const up = n(v) >= 0;
  return (
    <span className={cn('tabular-nums', diffCls(up))}>
      {up ? '+' : ''}
      {n(v).toFixed(1)}%
    </span>
  );
}

function PctBarCell({
  row,
  cfg,
  columnField,
}: {
  row: Record<string, unknown>;
  cfg: SwCellProps;
  columnField: string;
}) {
  const field = cfg.mainField ?? columnField;
  // NULL/missing (e.g. SMI target not loaded -> smi_rate_pct=NULL) renders '—'; the null
  // check must run before n(), since n(null)=0 would be misrendered as 0.0% (same convention as DeltaCell above).
  const raw = row[field];
  if (raw === null || raw === undefined || raw === '') return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const val = n(raw);
  if (!Number.isFinite(val)) return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const color = val >= 100 ? 'bg-emerald-500' : val >= 80 ? 'bg-indigo-500' : 'bg-amber-500';
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-slate-700 dark:text-neutral-300">{val.toFixed(1)}%</span>
      <span className="h-1 w-10 rounded-full bg-slate-100 dark:bg-neutral-800">
        <span
          className={cn('block h-1 rounded-full', color)}
          style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
        />
      </span>
    </div>
  );
}



const RANK_SIZE: Record<NonNullable<SwCellProps['rankSize']>, string> = {
  xs: 'w-6 h-6 text-[11px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-[13px]',
};
function RankBadgeCell({
  row,
  cfg,
  columnField,
}: {
  row: Record<string, unknown>;
  cfg: SwCellProps;
  columnField: string;
}) {
  const field = cfg.mainField ?? columnField;
  const rank = n(row[field]);
  if (!Number.isFinite(rank)) return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const top = cfg.topHighlight ?? cfg.medalTop ?? 3;
  const isTop = rank <= top;
  const sizeCls = RANK_SIZE[cfg.rankSize ?? 'xs'];
  const shapeCls = cfg.rankStyle === 'circle' ? 'rounded-full' : 'rounded';
  // Implicit (non-top, no override) default routes through a class so dark mode applies;
  // the brand gradient and an explicit `defaultFill` stay inline (data/brand → theme-agnostic).
  const useDefaultClass = !isTop && !cfg.defaultFill;
  const style: React.CSSProperties | undefined = isTop
    ? { backgroundImage: `linear-gradient(to bottom right, ${cfg.highlightFrom ?? '#fbbf24'}, ${cfg.highlightTo ?? '#f97316'})` }
    : cfg.defaultFill
      ? { backgroundColor: cfg.defaultFill }
      : undefined;
  return (
    <span className={cn('inline-flex items-center justify-center text-white tabular-nums', sizeCls, shapeCls, useDefaultClass && 'bg-slate-300 dark:bg-neutral-600')} style={style}>
      {rank}
    </span>
  );
}

// Currency symbol: goes through the single site-wide mapping table (utils/currencySymbol, CNY→¥ / HKD→HK$; unknown codes pass through as-is instead of always falling back to ¥).

function CurrencyCell({ row, cfg, columnField }: { row: Record<string, unknown>; cfg: SwCellProps; columnField: string }) {
  const field = cfg.mainField ?? columnField;
  const raw = row[field];
  const v = n(raw);
  if (!Number.isFinite(v)) return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const cur = (cfg.currencyField && typeof row[cfg.currencyField] === 'string' ? row[cfg.currencyField] : resolveCurrency(row, cfg)) as string;
  const txt = cfg.compact === false
    ? `${currencySymbol(cur)}${v.toLocaleString(undefined, { minimumFractionDigits: cfg.decimals ?? 0, maximumFractionDigits: cfg.decimals ?? 0 })}`
    : formatCompactCurrency(v, cur);
  return <span className="tabular-nums text-slate-700 dark:text-neutral-300">{txt}</span>;
}

function NumberCell({ row, cfg, columnField }: { row: Record<string, unknown>; cfg: SwCellProps; columnField: string }) {
  const field = cfg.mainField ?? columnField;
  const raw = row[field];
  // null/empty = no data (e.g. store-level stock for Top10 stores has no source): show — instead of faking a 0.
  if (raw == null || raw === '') return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const v = n(raw);
  if (!Number.isFinite(v)) return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const d = cfg.decimals ?? 0;
  const ruleColor = matchColorRule(v, cfg.colorRules);
  return <span className={cn('tabular-nums', ruleColor ?? 'text-slate-700 dark:text-neutral-300')}>{cfg.prefix ?? ''}{v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}</span>;
}

function BadgeCell({ row, cfg, columnField }: { row: Record<string, unknown>; cfg: SwCellProps; columnField: string }) {
  const field = cfg.mainField ?? columnField;
  const raw = row[field];
  if (raw == null || raw === '') return <span className="text-slate-400 dark:text-neutral-500">—</span>;
  const tone = matchColorRule(raw, cfg.colorRules) ?? cfg.tone ?? 'amber';
  return (
    <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] tabular-nums', BADGE_TONE[tone] ?? BADGE_TONE.amber)}>
      {cfg.prefix ?? ''}{formatSwValue(raw, cfg.format ?? 'plain')}
    </span>
  );
}


export function renderSwCell(
  type: SwCellType,
  props: SwCellProps | undefined,
  row: Record<string, unknown>,
  columnField: string
): React.ReactNode {
  const cfg = props ?? {};
  switch (type) {
    case 'Stacked':
      return <StackedCell row={row} cfg={cfg} columnField={columnField} />;
    case 'Delta':
      return <DeltaCell row={row} cfg={cfg} columnField={columnField} />;
    case 'PctBar':
      return <PctBarCell row={row} cfg={cfg} columnField={columnField} />;
    case 'RankBadge':
      return <RankBadgeCell row={row} cfg={cfg} columnField={columnField} />;
    case 'Currency':
      return <CurrencyCell row={row} cfg={cfg} columnField={columnField} />;
    case 'Number':
      return <NumberCell row={row} cfg={cfg} columnField={columnField} />;
    case 'Badge':
      return <BadgeCell row={row} cfg={cfg} columnField={columnField} />;
    default:
      return null;
  }
}

export const SW_CELL_TYPES: readonly SwCellType[] = ['Stacked', 'Delta', 'PctBar', 'RankBadge', 'Currency', 'Number', 'Badge'];
