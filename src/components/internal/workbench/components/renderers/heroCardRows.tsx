import React from 'react';
import { cn } from '@genispace/shared-utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ListProgressBar } from './list/ListProgressBar';
import {
  readRowField,
  formatHeroRowValue,
  formatCompactK,
  normalizeProgressValue,
  type HeroRow,
  type HeroKpiItem,
  type HeroCardAppearance,
} from './heroCardUtils';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import { currencySymbol } from '@/utils/currencySymbol';

export interface HeroFontSizes {
  /** title-bar product/section name */
  title: number;
  /** the big metric (hero) number */
  value: number;
  /** muted labels, captions, LY, price labels, descriptive text */
  label: number;
  /** secondary inline numbers: key-value / kpi / price values, deltas */
  number: number;
  /** status / trend badges */
  badge: number;
}

export const DEFAULT_HERO_FONT_SIZES: HeroFontSizes = { title: 18, value: 22, label: 13, number: 14, badge: 13 };

interface Ctx {
  row: Record<string, unknown> | null;
  ap: HeroCardAppearance;
  onDark: boolean;
  currency: unknown;
  lang: string;
  fs: HeroFontSizes;
  /** Narrow-flow layout (mobile / studio phone frame): rows may wrap/truncate.
      When false the markup must stay byte-identical to the original desktop rendering. */
  narrow: boolean;
}


function bi(v: unknown, lang: string): string {
  return resolveBilingualText(v, lang);
}

function diffParts(item: HeroKpiItem, row: Record<string, unknown> | null): { text: string; positive: boolean; neutral?: boolean } | null {
  if (!item.lyField) return null;
  const rawV = readRowField(row, item.field);
  const rawLy = readRowField(row, item.lyField);
  // No data on either side (the value cell already renders '—'): skip the YoY so an absent value
  // doesn't read as -100% / +0.0%. Mirrors formatHeroRowValue / TrendBadge, which dash out missing
  // values. A genuine 0 is NOT missing, so a real zero still computes its comparison.
  const missing = (x: unknown) => x === null || x === undefined || x === '';
  if (missing(rawV) || missing(rawLy)) return null;
  const v = Number(rawV);
  const ly = Number(rawLy);
  if (!Number.isFinite(v) || !Number.isFinite(ly)) return null;
  if (item.diff === 'absolute') {
    const d = v - ly;
    return { text: `${d >= 0 ? '+' : ''}${formatCompactK(d)}`, positive: d >= 0 };
  }
  if (item.diff === 'pp') {
    const d = v - ly;
    return { text: `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`, positive: d >= 0 };
  }
  // Zero denominator (no LY) makes the YoY meaningless → render a neutral grey '—' instead of a
  // misleading +0.0% (2026-07-30 global change).
  if (ly === 0) return { text: '—', positive: true, neutral: true };
  const d = (v / ly - 1) * 100;
  return { text: `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, positive: d >= 0 };
}

function TrendBadge({ value, suffix = '%', onDark, fontSize }: { value: unknown; suffix?: string; onDark: boolean; fontSize: number }) {
  if (value === null || value === undefined || value === '') {
    return <span className={onDark ? 'text-white/50' : 'text-muted-foreground'} style={{ fontSize }}>—</span>;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return <span style={{ fontSize }}>—</span>;
  const up = num >= 0;
  const color = up
    ? onDark ? 'text-emerald-300' : 'text-emerald-600'
    : onDark ? 'text-rose-300' : 'text-rose-600';
  const Icon = up ? TrendingUp : TrendingDown;
  // Icon tracks the (possibly autoFit-scaled) font size instead of a fixed h-3 w-3, so a shrunken
  // trend strip keeps its proportions. At the default 12px this is pixel-identical to h-3 w-3.
  const iconSize = Math.max(9, fontSize);
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium', color)} style={{ fontSize }}>
      <Icon style={{ width: iconSize, height: iconSize }} />
      {up ? '+' : ''}{num.toFixed(1)}{suffix}
    </span>
  );
}

/**
 * AutoFitBox — measures its single child at the natural (scale=1) font sizes and hands back a scale
 * factor (≤1) so the caller can shrink every font size proportionally until the content fits the
 * container on ONE line (row-level "auto-fit content" toggle, metric / trend-badges rows only).
 *
 * - One-shot ratio math (no binary search): text width is ~linear in font size; a 0.98 safety factor
 *   absorbs letter-spacing/rounding noise and the fixed-px gaps (ml-1 / gap-x) that don't scale.
 * - useLayoutEffect: the shrink is applied before paint, so there is no big→small flash.
 * - ResizeObserver watches the CONTAINER only (never the content) — scale changes can't retrigger it,
 *   so no measure loop. scaleRef de-natures the measured width (scrollWidth is post-scale).
 * - Floor 0.45 keeps the smallest text ≈9px; below that we accept the shrink rather than wrap/overflow.
 * - The inner `width: max-content` wrapper is essential: without it the child's scrollWidth CLAMPS at
 *   the container width as soon as the shrunk content fits, making natural = clientWidth/scaleRef an
 *   overestimate that ratchets the scale to the floor with no way back up.
 */
const AUTOFIT_MIN_SCALE = 0.45;
function AutoFitBox({ deps, fill, children }: { deps: unknown[]; fill?: boolean; children: (scale: number) => React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef(1);
  const [scale, setScale] = React.useState(1);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const content = el.firstElementChild as HTMLElement | null;
      if (!content) return;
      let natural: number;
      if (fill) {
        // fill mode: the child keeps its full-width spread layout (justify-between), so its
        // scrollWidth clamps at the container width once content fits — de-naturing from it
        // would ratchet the scale down with no way back. Measure the REAL content width from
        // the grandchildren (nowrap spans report true text width) plus the fixed-px gaps.
        const kids = Array.from(content.children) as HTMLElement[];
        const gapPx = parseFloat(getComputedStyle(content).columnGap || '0') || 0;
        const textW = kids.reduce((a, k) => a + k.scrollWidth, 0);
        natural = textW / scaleRef.current + gapPx * Math.max(0, kids.length - 1);
      } else {
        natural = content.scrollWidth / scaleRef.current;
      }
      const cw = el.clientWidth;
      if (cw <= 0 || natural <= 0) return;
      const next = Math.max(AUTOFIT_MIN_SCALE, Math.min(1, (cw / natural) * 0.98));
      if (Math.abs(next - scaleRef.current) > 0.005) {
        scaleRef.current = next;
        setScale(next);
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, deps);
  // fill mode: the child keeps its own full-width layout (e.g. justify-between spread); measurement
  // relies on its content overflowing (nowrap, no shrink) instead of a max-content wrapper — so the
  // row's original spread look survives scaling.
  return (
    <div ref={ref} className="overflow-hidden">
      {fill ? children(scale) : <div style={{ width: 'max-content' }}>{children(scale)}</div>}
    </div>
  );
}

function diffColor(positive: boolean, onDark: boolean): string {
  return positive
    ? onDark ? 'text-emerald-300' : 'text-emerald-600'
    : onDark ? 'text-rose-300' : 'text-rose-600';
}

export function renderHeroRow(rowCfg: HeroRow, idx: number, ctx: Ctx): React.ReactNode {
  const { row, ap, onDark, currency, fs, narrow } = ctx;
  const muted = ap.mutedTextClass;
  const strong = ap.strongTextClass;

  switch (rowCfg.type) {
    case 'spacer':
      return <div key={idx} style={{ height: rowCfg.size ?? 8 }} />;

    case 'divider':
      return <div key={idx} className={cn('mt-2.5 border-t', onDark ? 'border-white/20' : 'border-border')} />;

    case 'text': {
      const raw = rowCfg.field
        ? (() => {
            const zhField = rowCfg.field;
            if (ctx.lang === 'en' && zhField.endsWith('_zh')) {
              const enVal = readRowField(row, zhField.replace(/_zh$/, '_en'));
              if (enVal != null && enVal !== '') return enVal;
            }
            return readRowField(row, zhField);
          })()
        : rowCfg.text;
      const txt = rowCfg.field ? formatHeroRowValue(raw, rowCfg.format, currency) : bi(raw, ctx.lang);
      const szPx = rowCfg.size === 'base' ? Math.max(16, fs.label) : rowCfg.size === 'sm' ? Math.max(14, fs.label) : fs.label;
      return <p key={idx} className={cn(rowCfg.muted === false ? strong : muted)} style={{ fontSize: szPx }}>{txt}</p>;
    }

    case 'metric': {
      const cur = rowCfg.currency ?? currency;
      const val = formatHeroRowValue(readRowField(row, rowCfg.field), rowCfg.format, cur, rowCfg.prefix, rowCfg.suffix);
      const ly = rowCfg.lyField
        ? formatHeroRowValue(readRowField(row, rowCfg.lyField), rowCfg.lyFormat ?? rowCfg.format, cur)
        : null;
      const lyLabel = bi(rowCfg.lyLabel, ctx.lang) || 'LY';
      // autoFit (row-level "auto-fit content"): value + inline LY always on one line — AutoFitBox measures
      // the natural width and scales all font sizes down proportionally (including the LY sub-value),
      // replacing narrow-screen wrapping. When off, the original narrow/desktop dual paths are unchanged.
      if (rowCfg.autoFit && ly && rowCfg.lyInline) {
        return (
          <div key={idx} className="mt-0.5">
            {rowCfg.label && <p className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.label, ctx.lang)}</p>}
            <AutoFitBox deps={[val, ly, lyLabel, fs.value, fs.label]}>
              {(s) => (
                <p className={cn('font-bold tabular-nums tracking-tight whitespace-nowrap', strong)} style={{ fontSize: fs.value * s, lineHeight: 1.1 }}>
                  {val}
                  <span className={cn('font-normal ml-1', muted)} style={{ fontSize: Math.max(9, Math.max(10, fs.label - 2) * s) }}>{lyLabel} {ly}</span>
                </p>
              )}
            </AutoFitBox>
          </div>
        );
      }
      return (
        <div key={idx} className="mt-0.5">
          {rowCfg.label && <p className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.label, ctx.lang)}</p>}
          {/* lyInline: value + LY on ONE line (e.g. Y3.6K LY Y323.1K); the inline LY sits 2px under
              the label role so wide HK$ millions still fit. Narrow flow only: each part is unbreakable
              on its own, but the zero-width space between them is a wrap point so a narrow card drops
              LY to the next line instead of overflowing (invisible when both fit).
              When lyInline is off, LY renders on the line below instead. */}
          {narrow ? (
            <p className={cn('font-bold tabular-nums tracking-tight', strong)} style={{ fontSize: fs.value, lineHeight: 1.1 }}>
              <span className="whitespace-nowrap">{val}</span>
              {ly && rowCfg.lyInline && (
                <>
                  {'\u200B'}
                  <span className={cn('font-normal ml-1 whitespace-nowrap', muted)} style={{ fontSize: Math.max(10, fs.label - 2) }}>{lyLabel} {ly}</span>
                </>
              )}
            </p>
          ) : (
            <p className={cn('font-bold tabular-nums tracking-tight whitespace-nowrap', strong)} style={{ fontSize: fs.value, lineHeight: 1.1 }}>
              {val}
              {ly && rowCfg.lyInline && (
                <span className={cn('font-normal ml-1', muted)} style={{ fontSize: Math.max(10, fs.label - 2) }}>{lyLabel} {ly}</span>
              )}
            </p>
          )}
          {ly && !rowCfg.lyInline && <p className={muted} style={{ fontSize: fs.label }}>{lyLabel} {ly}</p>}
        </div>
      );
    }

    case 'dual-key-value': {
      const cur = rowCfg.currency ?? currency;
      const v1 = formatHeroRowValue(readRowField(row, rowCfg.field), rowCfg.format, cur);
      const n2 = Number(readRowField(row, rowCfg.field2));
      const f2 = formatHeroRowValue(readRowField(row, rowCfg.field2), rowCfg.format2 ?? rowCfg.format, cur);
      const v2 = rowCfg.signed2 && Number.isFinite(n2) && n2 > 0 ? `+${f2}` : f2;
      const v2Color = rowCfg.signedColor2 && Number.isFinite(n2) ? diffColor(n2 >= 0, onDark) : strong;
      // autoFit: scale fonts so label + both values stay on ONE line; the justify-between spread is
      // kept (fill mode) so the row still stretches value-to-edge like the non-autoFit original.
      if (rowCfg.autoFit) {
        return (
          <AutoFitBox key={idx} fill deps={[v1, v2, rowCfg.label, rowCfg.label2, fs.label, fs.number, ctx.lang]}>
            {(s) => (
              <div className="mt-1.5 flex items-center justify-between gap-2 whitespace-nowrap">
                <span className={muted} style={{ fontSize: fs.label * s }}>{bi(rowCfg.label, ctx.lang)} {bi(rowCfg.label2, ctx.lang)}</span>
                <span className="tabular-nums" style={{ fontSize: fs.number * s }}>
                  <span className={cn('font-semibold', strong)}>{v1}</span>
                  <span className={cn('font-semibold ml-1.5', v2Color)}>{v2}</span>
                </span>
              </div>
            )}
          </AutoFitBox>
        );
      }
      return (
        <div key={idx} className="flex items-center justify-between gap-2 mt-1.5">
          <span className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.label, ctx.lang)} {bi(rowCfg.label2, ctx.lang)}</span>
          <span className="tabular-nums" style={{ fontSize: fs.number }}>
            <span className={cn('font-semibold', strong)}>{v1}</span>
            <span className={cn('font-semibold ml-1.5', v2Color)}>{v2}</span>
          </span>
        </div>
      );
    }

    case 'trend-badges': {
      // Each caption + its trend value is one tight group (inner gap-x-1); captions sit 2px under the
      // general label role, trend values 1px under the badge role so the whole strip stays compact.
      // Wide: everything stays on ONE line (whitespace-nowrap), items separated by the '|' divider with
      // outer gap-x-1. Narrow flow only: the strip wraps BETWEEN groups (flex-wrap + gap-y-1) and the
      // divider lives inside the FOLLOWING group (inner gap-x-1 = the outer gap-x-1) so it
      // can never orphan at a line start.
      const trendLabelSize = Math.max(10, fs.label - 2);
      const trendValueSize = Math.max(11, fs.badge - 1);
      // autoFit (row-level "auto-fit content"): the whole badge strip always on one line — AutoFitBox measures
      // the natural width and scales label/value/divider/icon font sizes down proportionally, replacing
      // narrow-screen flex-wrap. When off, the original narrow/desktop dual paths are unchanged.
      if (rowCfg.autoFit) {
        return (
          <AutoFitBox key={idx} deps={[row, trendLabelSize, trendValueSize, ctx.lang]}>
            {(s) => (
              <div className="mt-1.5 flex items-center gap-x-1 whitespace-nowrap">
                {rowCfg.items.map((it, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className={onDark ? 'text-white/30' : 'text-border'} style={{ fontSize: trendLabelSize * s }}>|</span>}
                    <span className="inline-flex items-center gap-x-1">
                      <span className={muted} style={{ fontSize: trendLabelSize * s }}>{bi(it.label, ctx.lang)}</span>
                      <TrendBadge value={readRowField(row, it.field)} suffix={it.suffix} onDark={onDark} fontSize={trendValueSize * s} />
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </AutoFitBox>
        );
      }
      if (narrow) {
        return (
          <div key={idx} className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1">
            {rowCfg.items.map((it, i) => (
              <span key={i} className="inline-flex items-center gap-x-1 whitespace-nowrap">
                {i > 0 && <span className={cn(onDark ? 'text-white/30' : 'text-border')} style={{ fontSize: trendLabelSize }}>|</span>}
                <span className={muted} style={{ fontSize: trendLabelSize }}>{bi(it.label, ctx.lang)}</span>
                <TrendBadge value={readRowField(row, it.field)} suffix={it.suffix} onDark={onDark} fontSize={trendValueSize} />
              </span>
            ))}
          </div>
        );
      }
      return (
        <div key={idx} className="mt-1.5 flex items-center gap-x-1 whitespace-nowrap">
          {rowCfg.items.map((it, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className={onDark ? 'text-white/30' : 'text-border'} style={{ fontSize: trendLabelSize }}>|</span>}
              <span className="inline-flex items-center gap-x-1">
                <span className={muted} style={{ fontSize: trendLabelSize }}>{bi(it.label, ctx.lang)}</span>
                <TrendBadge value={readRowField(row, it.field)} suffix={it.suffix} onDark={onDark} fontSize={trendValueSize} />
              </span>
            </React.Fragment>
          ))}
        </div>
      );
    }

    case 'key-value': {
      const n = Number(readRowField(row, rowCfg.field));
      const formatted = formatHeroRowValue(readRowField(row, rowCfg.field), rowCfg.format, rowCfg.currency ?? currency, rowCfg.prefix, rowCfg.suffix);
      // signed: positive values get an explicit leading '+' (e.g. Gap +Y12.3K); negatives already carry '-'.
      const val = rowCfg.signed && Number.isFinite(n) && n > 0 ? `+${formatted}` : formatted;
      const colorCls = rowCfg.signedColor && Number.isFinite(n) ? diffColor(n >= 0, onDark) : strong;
      // autoFit: scale fonts so label + value stay on ONE line, keeping the justify-between spread.
      if (rowCfg.autoFit) {
        return (
          <AutoFitBox key={idx} fill deps={[val, rowCfg.label, fs.label, fs.number, ctx.lang]}>
            {(s) => (
              <div className="mt-1.5 flex items-center justify-between gap-2 whitespace-nowrap">
                <span className={muted} style={{ fontSize: fs.label * s }}>{bi(rowCfg.label, ctx.lang)}</span>
                <span className={cn('font-semibold tabular-nums', colorCls)} style={{ fontSize: fs.number * s }}>{val}</span>
              </div>
            )}
          </AutoFitBox>
        );
      }
      return (
        <div key={idx} className="flex items-center justify-between gap-2 mt-1.5">
          <span className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.label, ctx.lang)}</span>
          <span className={cn('font-semibold tabular-nums', colorCls)} style={{ fontSize: fs.number }}>{val}</span>
        </div>
      );
    }

    case 'progress': {
      const pct = normalizeProgressValue(readRowField(row, rowCfg.field));
      return (
        <div key={idx} className="mt-1.5">
          <ListProgressBar value={pct} max={rowCfg.max ?? 100} fullWidth size="sm" barColor={ap.progressBarColor} trackColor={ap.progressTrackColor} />
        </div>
      );
    }

    case 'kpi-list': {
      // 'left': labels and values are flat grid cells with per-column max-content label tracks, so
      // values stay column-aligned while every label→value gap is the identical gap-x (a global
      // label min-width left wider whitespace after short labels like CR/AT than after Traffic/AUR).
      const leftAlign = rowCfg.valueAlign === 'left';
      const two = rowCfg.columns === 2;
      const cols = leftAlign && !narrow
        ? two ? 'grid-cols-[max-content_1fr_max-content_1fr] gap-x-2' : 'grid-cols-[max-content_1fr] gap-x-2'
        : two ? 'grid-cols-2 gap-x-4' : 'grid-cols-1';
      return (
        <div key={idx} className={cn('mt-1.5 grid items-center gap-y-1', cols)}>
          {rowCfg.items.map((it, i) => {
            const val = formatHeroRowValue(readRowField(row, it.field), it.format, it.currency ?? currency);
            const d = diffParts(it, row);
            const label = (
              <span
                className={narrow ? cn('min-w-0 truncate', muted) : muted}
                style={{ fontSize: fs.label, ...(narrow && leftAlign ? { minWidth: '3em' } : {}) }}
              >
                {bi(it.label, ctx.lang)}
              </span>
            );
            const value = (
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn('font-medium tabular-nums', strong)} style={{ fontSize: fs.number }}>{val}</span>
                {d && <span className={cn('tabular-nums', d.neutral ? muted : diffColor(d.positive, onDark))} style={{ fontSize: fs.number }}>{d.text}</span>}
              </span>
            );
            // autoFit: scale each item row's fonts so label + value + delta stay on ONE line,
            // keeping the justify-between spread (fill mode). LeftAlign grid cells are unaffected.
            if (rowCfg.autoFit && !leftAlign) {
              return (
                <AutoFitBox key={i} fill deps={[val, d?.text, it.label, fs.label, fs.number, ctx.lang]}>
                  {(s) => (
                    <div className={cn('flex items-center gap-2 justify-between whitespace-nowrap', narrow && 'min-w-0')}>
                      <span className={narrow ? cn('min-w-0 truncate', muted) : muted} style={{ fontSize: fs.label * s }}>{bi(it.label, ctx.lang)}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className={cn('font-medium tabular-nums', strong)} style={{ fontSize: fs.number * s }}>{val}</span>
                        {d && <span className={cn('tabular-nums', d.neutral ? muted : diffColor(d.positive, onDark))} style={{ fontSize: fs.number * s }}>{d.text}</span>}
                      </span>
                    </div>
                  )}
                </AutoFitBox>
              );
            }
            return leftAlign && !narrow ? (
              <React.Fragment key={i}>{label}{value}</React.Fragment>
            ) : (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2',
                  narrow && 'min-w-0',
                  leftAlign ? 'justify-start' : 'justify-between'
                )}
              >
                {label}{value}
              </div>
            );
          })}
        </div>
      );
    }

    case 'title-bar': {
      const name = String(readRowField(row, rowCfg.titleField) ?? '');
      const statusVal = rowCfg.statusField ? String(readRowField(row, rowCfg.statusField) ?? '') : '';
      const st = rowCfg.statusMap?.[statusVal];
      return (
        <div key={idx} className="flex items-start justify-between gap-2">
          <div className={cn('leading-tight', strong)} style={{ fontWeight: 600, fontSize: fs.title }}>{name}</div>
          {st && (
            <span className={cn('flex-shrink-0 rounded-lg px-2 py-1', st.class || 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400')} style={{ fontSize: fs.badge }}>
              {bi(st.label, ctx.lang)}
            </span>
          )}
        </div>
      );
    }

    case 'price-row': {
      // Currency prefix = the row field bound via currencyField, mapped through the single site-wide symbol table (CNY->Y / HKD->HK$, utils/currencySymbol).
      const sym = currencySymbol(readRowField(row, rowCfg.currencyField || 'currency') ?? currency);
      // 2026-08-24: after the detail SQL switched to LEFT JOIN, products with no sales in the window
      //   return NULL selling_price/discount_rate — Number(null)=0 would render a misleading ¥0 / "100% off";
      //   missing values now show '—' and the discount block is not rendered.
      const sellingRaw = readRowField(row, rowCfg.sellingField);
      const sellingMissing = sellingRaw == null || sellingRaw === '';
      const retail = Math.round(Number(readRowField(row, rowCfg.retailField)) || 0).toLocaleString();
      const selling = sellingMissing ? '' : Math.round(Number(sellingRaw) || 0).toLocaleString();
      // Pre-formatted discount string supplied by the datasource (e.g. "37.0% off") — shown verbatim, the front-end does no computation.
      const discText = rowCfg.discountTextField ? readRowField(row, rowCfg.discountTextField) : undefined;
      const hasDiscText = discText != null && String(discText).trim() !== '';
      // Legacy numeric path: compute from a 0..1 ratio field only when no pre-formatted string is provided.
      const discRaw = rowCfg.discountField !== undefined ? readRowField(row, rowCfg.discountField) : undefined;
      const disc = discRaw == null || discRaw === '' ? NaN : Number(discRaw);
      // The threshold must be configured explicitly (no code-level fallback): unset → the discount badge stays neutral and no warning check is applied.
      const thr = typeof rowCfg.discountThreshold === 'number' ? rowCfg.discountThreshold : undefined;
      const showDisc = hasDiscText || Number.isFinite(disc);
      const discValue = hasDiscText ? String(discText) : (rowCfg.discountOff ? `${((1 - disc) * 100).toFixed(0)}%off` : `${(disc * 100).toFixed(0)}%`);
      return (
        <div key={idx} className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-neutral-800">
          <div className="flex-1">
            <div className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.retailLabel, ctx.lang)}</div>
            <div className={cn('mt-0.5', onDark ? strong : 'text-slate-600 dark:text-neutral-400')} style={{ fontSize: fs.number }}>{sym}{retail}</div>
          </div>
          <div className="text-slate-300 dark:text-neutral-600">›</div>
          <div className="flex-1">
            <div className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.sellingLabel, ctx.lang)}</div>
            <div className={cn('mt-0.5', strong)} style={{ fontWeight: 600, fontSize: fs.number }}>{sellingMissing ? '—' : `${sym}${selling}`}</div>
          </div>
          {showDisc && (rowCfg.discountLabel ? (
            // Labeled block like retail/selling (title on top, value below; neutral text, no colored badge).
            <div className="flex-1">
              <div className={muted} style={{ fontSize: fs.label }}>{bi(rowCfg.discountLabel, ctx.lang)}</div>
              <div className={cn('mt-0.5', onDark ? strong : 'text-slate-600 dark:text-neutral-400')} style={{ fontSize: fs.number }}>{discValue}</div>
            </div>
          ) : (
            <div className={cn('rounded-xl px-3 py-2',
              thr === undefined ? 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400'
                : disc < thr ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400')} style={{ fontWeight: 700, fontSize: fs.number }}>
              {discValue}
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

export function renderHeroRows(rows: HeroRow[], ctx: Ctx): React.ReactNode {
  return rows.map((r, i) => renderHeroRow(r, i, ctx));
}
