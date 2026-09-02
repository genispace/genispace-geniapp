import React, { useEffect, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import { TrendingUp, TrendingDown, ChevronRight, ImageOff } from 'lucide-react';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import { formatCompactCurrency, formatCompactK } from '../hero-card/heroCardUtils';
import type {
  ReportColumn,
  ReportCellProps,
  ReportValueFormat,
  CardLayoutConfig,
  ReportCardRow,
  ReportMetricItem,
  HeroBanner,
} from '@/types/productReport';

type Row = Record<string, unknown>;

const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const intStr = (v: unknown): string => Math.round(num(v)).toLocaleString();

/** Resolve a locale-aware field: row[base_zh|base_en] → row[base]. */
export function resolveFieldByLang(row: Row, base: string, language: string): string {
  const zh = language.startsWith('zh');
  const v = (zh ? row[`${base}_zh`] : row[`${base}_en`]) ?? row[base];
  return v == null ? '' : String(v);
}

/** Shared value formatting (summary cards + table cells). */
export function formatReportValue(
  raw: unknown,
  format: ReportValueFormat | undefined,
  currency?: unknown
): string {
  switch (format) {
    case 'currency-compact':
      return formatCompactCurrency(raw, currency);
    case 'compact-k':
      return formatCompactK(raw);
    case 'percent1':
      return `${num(raw).toFixed(1)}%`;
    case 'number':
      return intStr(raw);
    case 'plain':
    default:
      return raw == null || raw === '' ? '—' : String(raw);
  }
}

/** Tailwind tone tokens shared by tags / status badges / dots. */
const TONE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400',
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
};
const toneClass = (tone?: string): string => TONE_CLASSES[tone ?? 'slate'] ?? TONE_CLASSES.slate;

// ── Thumbnail (image with neutral "no image" fallback) ────────────────────────
export function ProductThumb({
  url,
  light,
  className,
}: {
  url?: string;
  bg?: string;   // accepted for API compatibility; white-background product cutouts render on a white letterbox
  light?: boolean;
  className?: string;
}) {
  const [ok, setOk] = useState(!!url);
  // Re-sync when the URL changes: a row first rendered with no image (before supplier images loaded, or
  // reused across data refresh/pagination) must pick up the image once the URL arrives — useState alone
  // keeps the initial value and would leave it stuck on the placeholder forever.
  useEffect(() => { setOk(!!url); }, [url]);
  const border = light ? '1px solid #E5E7EB' : 'none';
  if (ok && url) {
    return (
      <img
        src={encodeURI(url)}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setOk(false)}
        className={cn('object-contain', className)}
        // Safari lifts <img> into a native drag ghost by default; WebkitUserDrag closes the
        // long-press path that draggable={false} alone leaves open on iOS.
        style={{ backgroundColor: '#fff', border, WebkitUserDrag: 'none' } as React.CSSProperties}
      />
    );
  }
  // Load failure / no image: neutral placeholder (gray bg + image-off icon), not product color + category emoji —
  // those would be mistaken for real hero/color. Icon scales with container (h-1/2 from large cards to table rows).
  return (
    <div
      className={cn('flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-slate-300 dark:text-neutral-600', className)}
      style={{ border: '1px solid #E5E7EB' }}
    >
      <ImageOff className="h-1/2 w-1/2" strokeWidth={1.5} />
    </div>
  );
}

function thumbColors(row: Row, p: ReportCellProps | HeroBanner) {
  const colorVal = p.colorField ? String(row[p.colorField] ?? '') : '';
  const bg = (p.colorMap?.[colorVal] as string) || p.fallbackColor || '#E0E0E0';
  const lightList = ('lightColors' in p ? p.lightColors : undefined) ?? [];
  const light = lightList.includes(colorVal) || lightList.includes(bg);
  return { bg, light };
}

// ── Small cell components ─────────────────────────────────────────────────────
function TrendValue({ value, decimals = 1 }: { value: unknown; decimals?: number }) {
  // YoY/MoM with a zero denominator arrives as SQL NULL → render '—'. The null check must run
  // before Number(): Number(null) is 0, which would mislead as an up-arrow 0.0%.
  if (value === null || value === undefined || value === '') return <span className="text-[11px] text-slate-400 dark:text-neutral-500">—</span>;
  const v = Number(value);
  if (!Number.isFinite(v)) return <span className="text-[11px] text-slate-400 dark:text-neutral-500">—</span>;
  const up = v >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px]', up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(v).toFixed(decimals)}%
    </span>
  );
}

function DiscBadge({ raw, props }: { raw: unknown; props: ReportCellProps }) {
  if (typeof props.warnBelow === 'number') {
    const v = num(raw);
    const warn = v < props.warnBelow;
    return (
      <span className={cn('tabular-nums', warn ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-neutral-400')}>
        {v.toFixed(0)}%{warn ? ' ⚠' : ''}
      </span>
    );
  }
  const ratio = num(raw);
  const threshold = props.discountThreshold ?? 0.8;
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px]', ratio < threshold ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400')}>
      {(ratio * 100).toFixed(0)}%
    </span>
  );
}

function ColorDot({ row, col, language }: { row: Row; col: ReportColumn; language: string }) {
  const p = col.render?.props ?? {};
  const colorVal = p.colorField ? String(row[p.colorField] ?? '') : '';
  const bg = (p.colorMap?.[colorVal] as string) || p.fallbackColor || '#E0E0E0';
  const light = (p.lightColors ?? []).includes(colorVal);
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: bg, border: light ? '1px solid #E5E7EB' : 'none' }} />
      <span className="text-[10px] text-slate-600 dark:text-neutral-400">{resolveFieldByLang(row, col.dataIndex, language)}</span>
    </div>
  );
}

function ThumbCell({ row, col, language }: { row: Row; col: ReportColumn; language: string }) {
  const p = col.render?.props ?? {};
  const { bg, light } = thumbColors(row, p);
  const url = p.imageField ? String(row[p.imageField] ?? '') : '';
  const title = p.titleField ? resolveFieldByLang(row, p.titleField, language) : '';
  const sub = p.subField ? String(row[p.subField] ?? '') : '';
  return (
    <div className="flex items-center gap-1.5">
      <ProductThumb url={url} bg={bg} light={light} className="h-6 w-6 flex-shrink-0 rounded" />
      <div className="min-w-0">
        {title && (
          <div className="text-[11px] text-slate-800 dark:text-neutral-200" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
            {title}
          </div>
        )}
        {sub && <div className="whitespace-nowrap text-[10px] text-slate-400 dark:text-neutral-500">{sub}</div>}
      </div>
    </div>
  );
}

function TagCell({ raw, props, language }: { raw: unknown; props: ReportCellProps; language: string }) {
  const value = String(raw ?? '');
  const label = props.textMap?.[value] ? resolveBilingualText(props.textMap[value], language) : value;
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px]', toneClass(props.toneMap?.[value]))}>{label}</span>;
}

/** Render a single table cell from its ReportColumn config + row. */
export function renderReportCell(col: ReportColumn, row: Row, language: string): React.ReactNode {
  const p = col.render?.props ?? {};
  const type = col.render?.type ?? 'text';
  const raw = row[col.dataIndex];
  switch (type) {
    case 'thumbnail':
      return <ThumbCell row={row} col={col} language={language} />;
    case 'colorDot':
      return <ColorDot row={row} col={col} language={language} />;
    case 'discBadge':
      return <DiscBadge raw={raw} props={p} />;
    case 'trend':
      return <TrendValue value={raw} decimals={p.decimals ?? 1} />;
    case 'currency':
      return <span className="tabular-nums">{formatReportValue(raw, p.format ?? 'currency-compact', row[p.currencyField ?? 'currency'])}</span>;
    case 'number': {
      // NULL (e.g. WoS while its upstream data is pending) renders as an em dash, not a fake 0.
      if (raw == null || raw === '') return <span className="tabular-nums">—</span>;
      const v = num(raw);
      const s = p.decimals ? v.toFixed(p.decimals) : Math.round(v).toLocaleString();
      return <span className="tabular-nums">{(p.prefix ?? '') + s + (p.suffix ?? '')}</span>;
    }
    case 'percent':
      // NULL (e.g. DR% for a dimension row with no current-period sales) renders as an em dash, not a fake 0.0%.
      if (raw == null || raw === '') return <span className="tabular-nums">—</span>;
      return <span className="tabular-nums">{`${num(raw).toFixed(p.decimals ?? 1)}%`}</span>;
    case 'tag':
      return <TagCell raw={raw} props={p} language={language} />;
    case 'text':
    default: {
      const v = resolveFieldByLang(row, col.dataIndex, language) || (raw == null ? '' : String(raw));
      return <span>{v}</span>;
    }
  }
}

// ── List-card pieces ──────────────────────────────────────────────────────────
function CardBanner({ banner, row, className }: { banner: HeroBanner; row: Row; className?: string }) {
  const { bg, light } = thumbColors(row, banner);
  const url = banner.imageField ? String(row[banner.imageField] ?? '') : '';
  return <ProductThumb url={url} bg={bg} light={light} className={className} />;
}

function MiniMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400 dark:text-neutral-500">{label}</div>
      <div className="mt-0.5 text-xs tabular-nums text-slate-700 dark:text-neutral-300">{children}</div>
    </div>
  );
}

function renderMetricValue(item: ReportMetricItem, row: Row): React.ReactNode {
  if (item.render === 'trend') return <TrendValue value={row[item.field]} decimals={item.decimals ?? 1} />;
  if (item.render === 'warnPercent') {
    const v = num(row[item.field]);
    const warn = typeof item.warnBelow === 'number' && v < item.warnBelow;
    return <span className={cn('tabular-nums', warn ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-neutral-300')}>{v.toFixed(0)}%{warn ? ' ⚠' : ''}</span>;
  }
  if (item.format) return formatReportValue(row[item.field], item.format, row[item.currencyField ?? 'currency']);
  if (row[item.field] == null || row[item.field] === '') return '—';
  const s = item.decimals ? num(row[item.field]).toFixed(item.decimals) : intStr(row[item.field]);
  return `${s}${item.suffix ?? ''}`;
}

function CardRow({ rowCfg, row, language, hiddenFields }: { rowCfg: ReportCardRow; row: Row; language: string; hiddenFields?: Set<string> }) {
  switch (rowCfg.type) {
    case 'title': {
      const title = resolveFieldByLang(row, rowCfg.titleField, language);
      const statusVal = rowCfg.statusField ? String(row[rowCfg.statusField] ?? '') : '';
      const status = rowCfg.statusMap?.[statusVal] ?? rowCfg.statusMap?.['*'];
      return (
        <div className="flex items-start justify-between gap-1">
          <div className="text-sm text-slate-800 dark:text-neutral-200" style={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {title}
          </div>
          {status && (
            <span className={cn('flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px]', toneClass(status.tone))}>
              {resolveBilingualText(status.label, language)}
            </span>
          )}
        </div>
      );
    }
    case 'text': {
      const parts = rowCfg.fields.map((f) => resolveFieldByLang(row, f, language)).filter(Boolean);
      const sizeCls = rowCfg.size === 'sm' ? 'text-xs' : rowCfg.size === 'base' ? 'text-sm' : 'text-[11px]';
      return <div className={cn('mt-0.5', sizeCls, rowCfg.muted !== false ? 'text-slate-400 dark:text-neutral-500' : 'text-slate-600 dark:text-neutral-400')}>{parts.join(rowCfg.separator ?? ' · ')}</div>;
    }
    case 'price-row': {
      const cur = row[rowCfg.currencyField ?? 'currency'];
      // Pre-formatted discount string supplied by the datasource (e.g. "37.0% off") — shown verbatim, the front-end does no computation.
      const discTextRaw = rowCfg.discountTextField ? row[rowCfg.discountTextField] : undefined;
      const hasDiscText = discTextRaw != null && String(discTextRaw).trim() !== '';
      // Legacy numeric path: compute from a 0..1 ratio field only when no pre-formatted string is provided.
      const ratio = rowCfg.discountField ? num(row[rowCfg.discountField]) : NaN;
      const threshold = rowCfg.discountThreshold ?? 0.8;
      const showDisc = hasDiscText || Number.isFinite(ratio);
      const discValue = hasDiscText ? String(discTextRaw) : (rowCfg.discountOff ? `${((1 - ratio) * 100).toFixed(0)}%off` : `${(ratio * 100).toFixed(0)}%`);
      return (
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          <span className="text-slate-400 dark:text-neutral-500">{resolveBilingualText(rowCfg.retailLabel, language)} {formatCompactCurrency(row[rowCfg.retailField], cur)}</span>
          <span className="text-slate-300 dark:text-neutral-600">›</span>
          <span className="text-slate-700 dark:text-neutral-300">{resolveBilingualText(rowCfg.sellingLabel, language)} {formatCompactCurrency(row[rowCfg.sellingField], cur)}</span>
          {showDisc && (rowCfg.discountLabel ? (
            // Labeled discount (title + datasource value); neutral chip, no threshold coloring.
            <span className="rounded px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">{resolveBilingualText(rowCfg.discountLabel, language)} {discValue}</span>
          ) : (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px]', Number.isFinite(ratio) && ratio < threshold ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400')}>{discValue}</span>
          ))}
        </div>
      );
    }
    case 'metric-grid': {
      const items = hiddenFields?.size ? rowCfg.items.filter((it) => !hiddenFields.has(it.field)) : rowCfg.items;
      if (!items.length) return null;
      const cols = Math.min(rowCfg.columns ?? items.length, items.length);
      return (
        <div className="mt-2 grid gap-2 text-xs" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((item, i) => (
            <MiniMetric key={i} label={resolveBilingualText(item.label, language)}>{renderMetricValue(item, row)}</MiniMetric>
          ))}
        </div>
      );
    }
    case 'trend-badges': {
      const badges = hiddenFields?.size ? rowCfg.items.filter((b) => !hiddenFields.has(b.field)) : rowCfg.items;
      if (!badges.length) return null;
      return (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-neutral-500">
          {badges.map((b, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span className="text-[9px] text-slate-300 dark:text-neutral-600">{resolveBilingualText(b.label, language)}</span>
              {b.trend === false ? <span>{`${num(row[b.field]).toFixed(1)}${b.suffix ?? ''}`}</span> : <TrendValue value={row[b.field]} />}
            </span>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

/** A configurable list-card: banner thumbnail + header rows beside it, body rows below. */
export function ReportCard({ layout, row, language, onClick, hiddenFields }: { layout: CardLayoutConfig; row: Row; language: string; onClick?: () => void; hiddenFields?: Set<string> }) {
  const headerTypes = new Set(['title', 'text', 'price-row']);
  const firstBodyIdx = layout.rows.findIndex((r) => !headerTypes.has(r.type));
  const headerRows = firstBodyIdx === -1 ? layout.rows : layout.rows.slice(0, firstBodyIdx);
  const bodyRows = firstBodyIdx === -1 ? [] : layout.rows.slice(firstBodyIdx);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full select-none overflow-hidden rounded-xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-left shadow-sm transition-colors active:bg-slate-50 dark:active:bg-neutral-800"
    >
      <div className="flex items-start gap-3 p-3.5">
        {layout.banner && <CardBanner banner={layout.banner} row={row} className="h-20 w-20 flex-shrink-0 rounded-xl" />}
        <div className="min-w-0 flex-1">
          {headerRows.map((r, i) => (
            <CardRow key={i} rowCfg={r} row={row} language={language} hiddenFields={hiddenFields} />
          ))}
        </div>
        {layout.banner && <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300 dark:text-neutral-600" />}
      </div>
      {bodyRows.length > 0 && (
        <div className="px-3.5 pb-2.5">
          {bodyRows.map((r, i) => (
            <CardRow key={i} rowCfg={r} row={row} language={language} hiddenFields={hiddenFields} />
          ))}
        </div>
      )}
    </button>
  );
}
