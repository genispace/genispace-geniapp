import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useId } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList,
  Customized, ComposedChart, ReferenceLine
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@genispace/shared-ui';
import { Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { ViewToggleButton } from '../shared/ViewToggleButton';
import { cn } from '@genispace/shared-utils';
import { applyCustomStyles } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { useTranslation } from 'react-i18next';
import { useDatabaseDataSource } from '../../hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '../../types/databaseDataSource';
import { getSystemParameterValue } from '@/utils/systemParameters';
import {
  extractFetchGateParamsFromDatasourceParameters,
  extractStrictWaitParameterKeysFromDatasourceParameters,
} from '@/utils/databaseDatasourceParams';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useParameters } from '@/contexts/ParameterContext';
import type { ComponentParameterConfig } from '@/types/parameters';
import { ChartAreaSkeleton, ChartEmptyState, Skeleton } from '../../skeleton';
import { resolveEchartsChartPalette, SEMANTIC_COLORS } from '@/utils/colors';
import {
  getLineAreaGradientStops,
  getTopToBottomGradientStops,
  type GradientStop
} from '@/utils/chartGradientStops';
import i18n from '@/locales/i18n';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import { formatCompactCurrency } from '../hero-card/heroCardUtils';
import { ChevronLeft } from 'lucide-react';

type RechartsGradientVariant = 'bar' | 'area';


function renderOverlapBarOverlay(
  cp: {
    xAxisMap?: Record<string, { scale?: ((v: unknown) => number | undefined) & { bandwidth?: () => number; domain?: () => unknown[] } }>;
    yAxisMap?: Record<string, { scale?: (v: number) => number }>;
  },
  opts: {
    data: Record<string, unknown>[];
    xField: string;
    valueKey: string;
    valueColor: string;
    valueLabel: boolean;
    compKey?: string;
    targets: Array<{ dataKey: string; color: string }>;
    /** Multi-store mode: one bar per store inside each bucket. Comp per store is read from
     * `__comp__<series key>` on the row; target overlay spans the whole store group once. */
    series?: Array<{ key: string; name: string; color: string }>;
    drillKeyField?: string;
    onBarClick?: (row: Record<string, unknown>) => void;
    formatValue: (v: unknown) => string;
    /** Formatter for the bar-top value label (plain number, no currency/unit), separate from tooltip/summary. */
    formatBarLabel: (v: unknown) => string;
    /** Color of the bar-top value label (sales value). */
    valueLabelColor: string;
    /** Font size (px) of the bar-top value label. */
    valueLabelFontSize: number;
    barWidth?: number;
  },
) {
  const xa = cp.xAxisMap ? Object.values(cp.xAxisMap)[0] : undefined;
  const ya = cp.yAxisMap ? Object.values(cp.yAxisMap)[0] : undefined;
  const xs = xa?.scale;
  const ys = ya?.scale;
  if (!xs || !ys) return null;
  const band = typeof xs.bandwidth === 'function' ? xs.bandwidth() : 24;
  // Bar width: use overlapBarWidth when set (capped by bandwidth); else ~66% of bandwidth, max 52
  // (roughly double the previous default so bars read as wide solid columns).
  const barW = opts.barWidth != null ? Math.min(opts.barWidth, band) : Math.min(band * 0.66, 52);
  const y0 = ys(0);
  // Recharts swaps the category band-scale domain to serial indices [0,1,…] (stashing the labels in
  // duplicateDomain) whenever the axis has duplicate labels and allowDuplicatedCategory is on (default).
  // Positioning each bar by its i-th domain entry keeps the overlay aligned with the internal <Bar>/
  // tooltip in both cases: with unique labels domain[i] === row[xField], and with duplicates domain[i]
  // is the index the scale actually expects. Looking up xs(row[xField]) directly would return undefined
  // for every row under the index domain and blank the whole plot (bars gone, tooltip still works).
  const bandDomain = typeof xs.domain === 'function' ? xs.domain() : undefined;
  const toNum = (v: unknown): number | undefined => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
  const seriesList = opts.series && opts.series.length > 0 ? opts.series : undefined;
  return (
    <g>
      {opts.data.map((row, i) => {
        const cx0 = xs(bandDomain ? bandDomain[i] : row[opts.xField]);
        if (cx0 == null) return null;
        const tv = opts.targets
          .map(t => ({ color: t.color, v: toNum(row[t.dataKey]) }))
          .filter((t): t is { color: string; v: number } => t.v != null);
        const els: React.ReactNode[] = [];
        const labelFs = opts.valueLabelFontSize;
        const compFs = Math.max(7, Math.round(labelFs * 0.8));
        if (seriesList) {
          // Multi-store mode: N bars side by side inside the bucket band, target overlay drawn once
          // per bucket spanning the whole store-group width (targets are per-bucket sums).
          const n = seriesList.length;
          const gap = 4;
          const maxBarW = Math.max(6, (band - gap * (n - 1) - 8) / n);
          const sBarW = opts.barWidth != null ? Math.min(opts.barWidth, maxBarW) : Math.min(maxBarW, 28);
          const groupW = n * sBarW + gap * (n - 1);
          const gLeft = cx0 + (band - groupW) / 2;
          tv.forEach((t, k) => { const yt = ys(t.v); els.push(<rect key={`r${k}-${i}`} x={gLeft} y={yt} width={groupW} height={Math.max(0, y0 - yt)} fill={t.color} fillOpacity={0.14} rx={2} />); });
          seriesList.forEach((s, k) => {
            const left = gLeft + k * (sBarW + gap);
            const cx = left + sBarW / 2;
            const sales = toNum(row[s.key]) ?? 0;
            const ySales = ys(sales);
            els.push(<rect key={`s-${i}-${k}`} x={left} y={ySales} width={sBarW} height={Math.max(0, y0 - ySales)} rx={2} fill={s.color} fillOpacity={0.95} />);
            const topY = Math.min(ySales, ...tv.map(t => ys(t.v)));
            const compRaw = opts.compKey ? row[`__comp__${s.key}`] : undefined;
            const comp = compRaw != null ? toNum(compRaw) : undefined;
            const compMissing = opts.compKey != null && comp == null;
            // Stack value label above the delta% label, both scaled to the configured font size.
            const valueY = comp != null || compMissing ? topY - compFs - 5 : topY - 5;
            if (opts.valueLabel) els.push(<text key={`v-${i}-${k}`} x={cx} y={valueY} textAnchor="middle" fill={opts.valueLabelColor} fontSize={labelFs} fontWeight={600}>{opts.formatBarLabel(sales)}</text>);
            if (comp != null) els.push(<text key={`c-${i}-${k}`} x={cx} y={topY - 4} textAnchor="middle" fill={comp >= 0 ? '#16a34a' : '#dc2626'} fontSize={compFs}>{comp >= 0 ? '+' : ''}{comp.toFixed(1)}%</text>);
            else if (compMissing) els.push(<text key={`c-${i}-${k}`} x={cx} y={topY - 4} textAnchor="middle" fill="#94a3b8" fontSize={compFs}>—</text>);
          });
          tv.forEach((t, k) => { const yt = ys(t.v); els.push(<line key={`l${k}-${i}`} x1={gLeft - 1} x2={gLeft + groupW + 1} y1={yt} y2={yt} stroke={t.color} strokeWidth={1.4} strokeDasharray="3 2" />); });
          return <g key={`g-${i}`}>{els}</g>;
        }
        const left = cx0 + (band - barW) / 2;
        const cx = left + barW / 2;
        const sales = toNum(row[opts.valueKey]) ?? 0;
        const ySales = ys(sales);
        tv.forEach((t, k) => { const yt = ys(t.v); els.push(<rect key={`r${k}-${i}`} x={left} y={yt} width={barW} height={Math.max(0, y0 - yt)} fill={t.color} fillOpacity={0.14} rx={2} />); });
        const clickable = !!opts.onBarClick && opts.drillKeyField != null && row[opts.drillKeyField] != null;
        els.push(<rect key={`s-${i}`} x={left} y={ySales} width={barW} height={Math.max(0, y0 - ySales)} rx={2} fill={opts.valueColor} fillOpacity={0.95} style={{ cursor: clickable ? 'pointer' : 'default' }} onClick={clickable ? () => opts.onBarClick?.(row) : undefined} />);
        tv.forEach((t, k) => { const yt = ys(t.v); els.push(<line key={`l${k}-${i}`} x1={left - 1} x2={left + barW + 1} y1={yt} y2={yt} stroke={t.color} strokeWidth={1.4} strokeDasharray="3 2" />); });
        const topY = Math.min(ySales, ...tv.map(t => ys(t.v)));
        // compKey configured but value null/non-numeric (zero or missing LY base) = not comparable:
        // show a muted '—' instead of coercing to a misleading +0.0%; no compKey at all → no delta label.
        const comp = opts.compKey && row[opts.compKey] != null ? toNum(row[opts.compKey]) : undefined;
        const compMissing = opts.compKey != null && comp == null;
        // Stack value label above the delta% label, both scaled to the configured value-label font size.
        const valueY = comp != null || compMissing ? topY - compFs - 5 : topY - 5;
        if (opts.valueLabel) els.push(<text key={`v-${i}`} x={cx} y={valueY} textAnchor="middle" fill={opts.valueLabelColor} fontSize={labelFs} fontWeight={600}>{opts.formatBarLabel(sales)}</text>);
        if (comp != null) els.push(<text key={`c-${i}`} x={cx} y={topY - 4} textAnchor="middle" fill={comp >= 0 ? '#16a34a' : '#dc2626'} fontSize={compFs}>{comp >= 0 ? '+' : ''}{comp.toFixed(1)}%</text>);
        else if (compMissing) els.push(<text key={`c-${i}`} x={cx} y={topY - 4} textAnchor="middle" fill="#94a3b8" fontSize={compFs}>—</text>);
        return <g key={`g-${i}`}>{els}</g>;
      })}
    </g>
  );
}

function rechartsGradientUrl(idPrefix: string, variant: RechartsGradientVariant, colorIndex: number) {
  return `url(#${idPrefix}-${variant}-${colorIndex})`;
}

function renderRechartsGradientDefs(
  idPrefix: string,
  colors: string[],
  variant: RechartsGradientVariant
) {
  const getStops: (color: string) => GradientStop[] =
    variant === 'area' ? getLineAreaGradientStops : getTopToBottomGradientStops;

  return (
    <defs>
      {colors.map((baseColor, index) => {
        const stops = getStops(baseColor);
        const gradId = `${idPrefix}-${variant}-${index}`;
        return (
          <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
            {stops.map((stop, stopIndex) => (
              <stop key={stopIndex} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        );
      })}
    </defs>
  );
}

type ChartGradientDefsProps = {
  gradientIdPrefix: string;
  chartColors: string[];
  variant: RechartsGradientVariant;
};

function ChartGradientDefs({ gradientIdPrefix, chartColors, variant }: ChartGradientDefsProps) {
  return renderRechartsGradientDefs(gradientIdPrefix, chartColors, variant);
}

function measureMaxLabelWidthPx(labels: string[], fontSizePx: number): number {
  if (typeof document === 'undefined' || labels.length === 0) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${fontSizePx}px sans-serif`;
  let max = 0;
  for (const s of labels) {
    max = Math.max(max, ctx.measureText(s ?? '').width);
  }
  return Math.ceil(max);
}

// d3-style nice ticks: returns [0, step, 2*step, … niceMax] with top >= rawMax; step is 1/2/2.5/5×10^n.
// Used for overlapBar Y-axis (prototype-aligned ticks instead of hard-coded max*1.14).
function niceAxisTicks(rawMax: number, targetCount = 4): { max: number; ticks: number[] } {
  if (!(rawMax > 0)) return { max: 100, ticks: [0, 25, 50, 75, 100] };
  const rawStep = rawMax / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  const step = niceNorm * mag;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v));
  return { max, ticks };
}

// 6-digit hex → rgba with alpha. Used for semi-transparent legend target fills (stroke stays solid).
function hexAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// overlapBar Y-axis tick labels: no currency, no decimals (ticks are already nice). Millions → 5M, thousands → 500K, else integer.
function fmtAxisTick(v: number): string {
  if (!Number.isFinite(v) || v === 0) return '0';
  if (v % 1e6 === 0) return `${v / 1e6}M`;
  if (v % 1e3 === 0) return `${v / 1e3}K`;
  return String(Math.round(v));
}

type BarAdaptiveAxisLayout = {
  margin: { top: number; right: number; bottom: number; left: number };

  xAngle: number;
  xTextAnchor: 'middle' | 'end';
  xHeight: number;
  xDy: number;

  yWidth: number;
  yTickAngle: number | undefined;
};

function computeBarAdaptiveAxisLayout(
  containerW: number,
  _containerH: number,
  labels: string[],
  opts: {
    isBar: boolean;
    xFs: number;
    yFs: number;
    showBarNumberOn: boolean;
  }
): BarAdaptiveAxisLayout {
  const { isBar, xFs, yFs, showBarNumberOn } = opts;

  if (!isBar) {
    const n = Math.max(labels.length, 1);
    const left = 12;
    const right = 18;
    const top = showBarNumberOn ? 20 : 10;
    const plotW = Math.max(containerW - left - right, 48);
    const maxW = measureMaxLabelWidthPx(labels, xFs);
    const slotW = plotW / n;
    const slant = maxW > slotW * 0.88;
    const bottom = slant
      ? Math.min(132, Math.max(34, Math.round(maxW * 0.58 + 24)))
      : 10;
    const xHeight = slant ? Math.min(110, Math.round(maxW * 0.48 + 32)) : 40;
    return {
      margin: { top, right, left, bottom },
      xAngle: slant ? -45 : 0,
      xTextAnchor: slant ? 'end' : 'middle',
      xHeight,
      xDy: slant ? 6 : 0,
      yWidth: 0,
      yTickAngle: undefined
    };
  }

  const top = 10;
  const bottom = 4;
  const right = showBarNumberOn ? 36 : 22;
  const maxW = measureMaxLabelWidthPx(labels, yFs);
  const leftCap = Math.max(Math.floor(containerW * 0.42), 72);
  const needW = maxW + 36;

  const slant = needW > leftCap;

  if (!slant) {
    const yWidth = Math.min(Math.max(needW, 52), leftCap);
    return {
      margin: { top, right, left: 10, bottom },
      xAngle: 0,
      xTextAnchor: 'middle',
      xHeight: 36,
      xDy: 0,
      yWidth,
      yTickAngle: undefined
    };
  }

  return {
    margin: { top, right, left: Math.min(20, Math.max(10, Math.floor(containerW * 0.05))), bottom },
    xAngle: 0,
    xTextAnchor: 'middle',
    xHeight: 36,
    xDy: 0,
    yWidth: Math.min(96, Math.max(56, leftCap - 8)),
    yTickAngle: -45
  };
}

type BarChartAdaptiveContainerProps = {
  plotHeight: number;
  isBar: boolean;
  categoryLabels: string[];
  xAxisFontSize?: number;
  yAxisFontSize?: number;
  showBarNumberOn: boolean;
  /** Imposed-height cell: flex to the surrounding band instead of the fixed plotHeight. */
  fill?: boolean;
  children: (layout: BarAdaptiveAxisLayout) => React.ReactNode;
};

function BarChartAdaptiveContainer({
  plotHeight,
  isBar,
  categoryLabels,
  xAxisFontSize,
  yAxisFontSize,
  showBarNumberOn,
  fill = false,
  children
}: BarChartAdaptiveContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 400, h: plotHeight });
  const xFs = xAxisFontSize ?? 12;
  const yFs = yAxisFontSize ?? 12;
  const labelsKey = categoryLabels.join('\u0001');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: Math.max(r.width, 48), h: Math.max(r.height || plotHeight, 48) });
    };
    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [plotHeight, labelsKey, isBar, xFs, yFs, showBarNumberOn]);

  const layout = useMemo(
    () =>
      computeBarAdaptiveAxisLayout(box.w, box.h, categoryLabels, {
        isBar,
        xFs,
        yFs,
        showBarNumberOn
      }),
    [box.w, box.h, categoryLabels, isBar, xFs, yFs, showBarNumberOn]
  );

  return (
    <div
      ref={ref}
      className={cn('w-full min-w-0', fill && 'min-h-0 flex-1')}
      style={fill ? undefined : { height: plotHeight }}
    >
      {children(layout)}
    </div>
  );
}

// Minimum horizontal space per period group in the overlap-bar (sales trend) chart, sized so the
// wide bars + stacked value/comp labels (full numbers like 12,930,000 at a larger font) stay legible.
// Past the container width the chart scrolls instead of squeezing.
const OVERLAP_MIN_GROUP_PX = 64;

// Hourly (cumulative-line) mode bar width ceiling (2026-08-05 client): all 8 hourly buckets must
// fit the container without horizontal scrolling, so the chart drops the per-group min width and
// draws slimmer bars. A smaller configured overlapBarWidth still wins.
const HOURLY_MAX_BAR_PX = 20;

// CJK-aware visual width (CJK char ≈ 1 unit, latin/digit ≈ 0.6 units of the font size) — used to
// decide when overlap-bar x-tick labels (e.g. region→store drill-down: full store names) can no
// longer fit on one line inside a group and must wrap.
const CJK_CHAR_RE = /[\u2e80-\u9fff\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]/;
const visualUnits = (s: string): number => [...s].reduce((w, ch) => w + (CJK_CHAR_RE.test(ch) ? 1 : 0.6), 0);

// Split a long category label into at most `maxLines` lines of <= `unitsPerLine` visual units;
// when the label still overflows, the last line is ellipsized (tooltip keeps the full name).
function wrapAxisLabel(label: string, unitsPerLine: number, maxLines = 2): string[] {
  const chars = [...label];
  const lines: string[] = [];
  let i = 0;
  for (let ln = 0; ln < maxLines && i < chars.length; ln++) {
    let line = '';
    let units = 0;
    while (i < chars.length) {
      const w = CJK_CHAR_RE.test(chars[i]) ? 1 : 0.6;
      if (units + w > unitsPerLine && line) break;
      if (!line && chars[i] === ' ') { i++; continue; } // no leading spaces on wrapped lines
      line += chars[i];
      units += w;
      i++;
    }
    lines.push(line);
  }
  if (i < chars.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && visualUnits(last) + 1 > unitsPerLine) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

// Two-line x-axis tick for the overlap-bar chart (recharts injects x/y/payload). Only used when
// labels are too long for a single line — keeps the default `tick={{ fontSize }}` look otherwise.
function OverlapAxisTick({ x = 0, y = 0, payload, fontSize, unitsPerLine }: {
  x?: number; y?: number; payload?: { value?: unknown }; fontSize: number; unitsPerLine: number;
}) {
  const lines = wrapAxisLabel(String(payload?.value ?? ''), unitsPerLine);
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={fontSize} fill="#666">
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 10 : fontSize + 1}>{ln}</tspan>
      ))}
    </text>
  );
}

interface HorizontalScrollChartProps {
  minWidth: number;
  height: number;
  hint?: string;
  children: React.ReactElement;
  /**
   * Optional chart rendering ONLY the Y-axis, pinned to the left as a non-scrolling column so
   * the scale stays a readable reference while the plot scrolls. Must share the scrolling
   * chart's height + top/bottom margins + x-axis height so its ticks line up with the bars.
   */
  fixedYAxis?: React.ReactElement;
  yAxisWidth?: number;
}

// Wraps a chart in a horizontally-scrollable track. When the data needs more room than the
// container width, the inner track grows to `minWidth` so the bars/value-labels keep their
// spacing (instead of squeezing into an unreadable jumble) and the container scrolls; a swipe
// hint shows below only while it actually overflows. The legend stays OUTSIDE this wrapper so
// its text always wraps and shows in full.
function HorizontalScrollChart({ minWidth, height, hint, children, fixedYAxis, yAxisWidth = 44 }: HorizontalScrollChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth - el.clientWidth > 4);
    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, [minWidth]);

  return (
    <>
      <div className="flex">
        {fixedYAxis ? (
          <div className="shrink-0" style={{ width: yAxisWidth, height }}>
            <ResponsiveContainer width="100%" height={height}>
              {fixedYAxis}
            </ResponsiveContainer>
          </div>
        ) : null}
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none' }}>
          <div style={{ minWidth }}>
            <ResponsiveContainer width="100%" height={height}>
              {children}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {scrollable && hint ? (
        <div className="px-4 pt-1 text-center text-[11px] text-slate-400 dark:text-neutral-500">{hint}</div>
      ) : null}
    </>
  );
}

function parseChartBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return defaultValue;
}

interface ChartRendererProps {
  chartType: 'line' | 'column' | 'bar' | 'area' | 'pie' | 'radar' | 'heatmap' | 'composedBar' | 'overlapBar';
  
  series?: Array<{ type: 'bar' | 'line'; dataKey: string; yAxisId?: 'left' | 'right'; color?: string; name?: string }>;
  referenceLines?: Array<{ value: number; stroke?: string; strokeDasharray?: string; label?: string }>;
  composedBarLabel?: boolean;
  
  overlapValueKey?: string;
  overlapValueName?: string | { zh?: string; en?: string };   // legend/tooltip name of the main bar — plain string or inline bilingual
  overlapTargets?: Array<{ dataKey: string; color?: string; name?: string | { zh?: string; en?: string }; hideWithLine?: boolean }>; // hideWithLine: drop this target in hourly (cumulative-line) mode
  overlapTargetAchievement?: boolean;                // Tooltip target rows append the achievement rate: value ÷ target, e.g. "¥1.37M (94.9%)". Default off.
  overlapCompKey?: string;
  overlapHideTargets?: boolean;
  overlapValueLabel?: boolean;
  overlapValueColor?: string;                        // Fill color of the main (sales) bar. Default chartColors[0] || '#6366f1'.
  overlapValueLabelColor?: string;                   // Color of the bar-top value (sales) label. Default '#6366f2'.
  overlapValueLabelFontSize?: number;                // Font size (px) of the bar-top value label. Default 11.
  overlapSummaryFontSize?: number;                   // Font size (px) of the summary strip value. Default 14.
  // color: per-cell value text color — a CSS color (#hex/rgb, applied inline) or a tailwind class
  //   (e.g. 'text-amber-600 dark:text-amber-400'); overrides the default color.
  // fontSize: per-cell value font size (px); overrides overlapSummaryFontSize.
  // textField: display the first row's value of this column verbatim (pre-formatted in SQL, e.g. "¥1.99M / ¥700K");
  //   takes precedence over field/ratio sums.
  // subTextField: verbatim second line rendered under the main value (smaller, muted) — e.g. main = summed
  //   total, sub = SQL-formatted offline/ecom split. The renderer stacks lines; no mid-text wrapping.
  // subTextFields: extra verbatim sub-lines rendered after the subTextField line (same style, array order).
  // secondaryTextField: verbatim second-tier value under the main value (fontSize-2, weight 600, main color).
  // flex: per-cell flex-grow ratio (default 1). subTextSignedColor: color signed % tokens in sub lines
  //   (+green #16a34a / -red #dc2626, same colors as the comp label). All optional; unset = zero change.
  overlapSummary?: Array<{ label?: string | { zh?: string; en?: string }; field?: string; ratioNum?: string; ratioDen?: string; textField?: string; subTextField?: string; subTextFields?: string[]; secondaryTextField?: string; flex?: number; subTextSignedColor?: boolean; color?: string; fontSize?: number }>;
  overlapShowSummary?: boolean;                      // Show top summary bar (default true). Skeleton reserves space to avoid layout shift.
  // overlapBar + seriesField (multi-store comparison) only:
  seriesSameColor?: boolean;                         // true = every store bar uses overlapValueColor; false (default) = walk the chart palette per store.
  seriesLegendVisible?: boolean;                     // Show the store legend row (default true). Target/comp legend row is unaffected.
  overlapSideMargin?: number;                        // Overlap bar side margin (px). 0 = flush to edge; unset = default left:20/right:30 + outer px-3.
  overlapBarWidth?: number;                          // Overlap bar width (px). Unset = 60% bandwidth max 26; set = use value (capped by bandwidth).
  // Overlap bar only: keep x-tick labels on a single line — never wrap to two lines. Range mode
  // widens each group to fit the longest label (plot scrolls when it overflows the container);
  // hourly mode stays container-fit, so over-long labels may bleed into neighbours (tooltip keeps
  // the full name). Default false: long labels auto-wrap to two lines as before.
  overlapXTickNoWrap?: boolean;
  // Cumulative line overlay (hourly distribution mode): a running-total column (e.g. cum_sales)
  // drawn as a recharts Line over the period bars. Rendered only when the key is configured AND at
  // least one row carries a non-null numeric value — range mode emits all-NULL and stays line-free.
  overlapLineKey?: string;
  overlapLineName?: string | { zh?: string; en?: string };   // Legend/tooltip name of the line — plain string or inline bilingual
  overlapLineColor?: string;                         // Line stroke color. Default '#10b981'.

  drillDataSourceConfig?: DatabaseDataSourceConfig | null;
  drillParamKey?: string;                            
  drillKeyField?: string;                            
  drillBreadcrumbLabel?: string | { zh?: string; en?: string };
  title?: string;
  data?: any[];
  xField: string;
  yField: string | string[];
  seriesField?: string;

  height?: number;

  chartHeight?: number;
  loading?: boolean;
  className?: string;
  meta?: {
    [key: string]: {
      alias?: string;
      formatter?: (value: any) => string;
    };
  };
  label?: boolean | {
    type?: 'inner' | 'outer' | 'spider';
    labelHeight?: number;
    formatter?: string;
    style?: React.CSSProperties;
  };
  smooth?: boolean;
  isGroup?: boolean;
  isStack?: boolean;
  colorField?: string;
  angleField?: string;
  radius?: number;
  innerRadius?: number; 
  color?: string | string[]; 
  colors?: string[]; 

  colorScheme?: string;

  legend?: boolean | {
    position?: 'top' | 'right' | 'bottom' | 'left';
  };
  tooltip?: {
    shared?: boolean;
    showCrosshairs?: boolean;
    formatter?: (value: any, name: string) => [string, string];
  };
  showArea?: boolean; 
  areaStyle?: any; 
  showPoint?: boolean; 
  point?: {
    size?: number;
    shape?: 'circle' | 'diamond' | 'square' | 'triangle';
  };
  columnWidthRatio?: number; 

  barSizePx?: number;

  // Column/bar only: when true, each x-category group keeps a fixed minimum width and the plot
  // scrolls horizontally (with a swipe hint) once the groups overflow the container — e.g. the
  // store view with many stores selected (one bar per store per day). Default false: zero change.
  scrollable?: boolean;

  // Column/bar + scrollable: minimum width (px) per x-category group. Unset = auto-sized from the
  // series count (max(56, series × 22)) so selecting more stores widens the track automatically.
  scrollMinWidthPerGroup?: number;

  grid?: boolean;

  showValueAxisGrid?: boolean;

  barLengthAdjustment?: boolean;

  showBarNumber?: boolean;

  barNumberFontSize?: number;

  // Column/bar + seriesField + showBarNumber: also pivot this field per series (as `__comp__<series>`
  // columns) and render a second YoY% line under each bar-top value label (+x.x% green / −x.x% red,
  // same colors as the overlapBar comp label). Empty/non-numeric comp → no second line. Unset = zero change.
  barCompField?: string;

  showMode?: 'value' | 'percentage';
  showLegend?: boolean;
  showTooltip?: boolean;

  showDataView?: boolean;

  // Whether to wrap the chart in a bordered card. Default true (legacy). Set false when the chart
  // already sits inside an outer card (e.g. a Tabs panel) to avoid a redundant nested border —
  // mirrors AnalyticsTableRenderer's `bare` prop.
  bordered?: boolean;

  additionalStats?: Array<{
    field: string;
    label?: string;
    unit?: string;

    newlineAtEnd?: boolean;
    ratio?: { denominator: string; unit?: '%' | '';  prefix?: string };
  }>;

  additionalStatsLabelFontSize?: number;

  titleFontSize?: number;

  xAxisFontSize?: number;

  yAxisFontSize?: number;

  useMockData?: boolean;
  mockData?: any[];

  id?: string;
  customStyles?: CustomStylesConfig;

  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  pageParams?: Record<string, any>;

  componentParameterConfig?: ComponentParameterConfig | null;
  componentId?: string;

  followPageRefresh?: boolean;
}

// Resolved summary-strip cell (overlapBar + column/bar top summary).
interface OverlapSummaryCellView {
  label: string;
  text: string;
  cls: string;
  fontSize?: number;
  colorStyle?: string;
  subText?: string;
  subTexts?: string[];
  secondaryText?: string;
  flex?: number;
  signedColor?: boolean;
}

// Sub-line signed-percent highlighter (overlapSummary subTextSignedColor): wraps each signed %
// token in a span — '+x.x%' green / '-x.x%' red, same colors as the comp labels above.
function renderSignedPercentText(text: string): React.ReactNode {
  const parts = text.split(/([+-]\d+(?:\.\d+)?%)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} style={{ color: part.startsWith('-') ? '#dc2626' : '#16a34a' }}>{part}</span>
      : part
  );
}

// Shared summary-cell builder (overlapBar + column/bar): field = sum over rows, ratioNum/ratioDen =
// sum ratio as %, textField/subTextField = first-row verbatim text. `rows` is the dataset to sum
// over — the caller passes PRE-PIVOT rows when a seriesField pivot has reshaped the data (the
// original metric columns no longer exist on the pivoted per-x rows).
function buildOverlapSummaryCells(
  rows: Record<string, unknown>[],
  opts: {
    cells?: ChartRendererProps['overlapSummary'];
    valueKey: string;
    hideTargets: boolean;
    language: string;
    formatValue: (v: unknown) => string;
  },
): OverlapSummaryCellView[] {
  const toNum = (v: unknown): number | undefined => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
  const sumField = (f: string) => rows.reduce((a, r) => a + (toNum(r[f]) || 0), 0);
  // Optional second line under the main value (subTextField): SQL provides the pre-formatted
  // text (e.g. the offline/ecom split "¥66.1M / ¥20.4M"), the renderer only stacks it — each
  // line stays one unit instead of mid-text wrapping.
  const subTextOf = (cell: { subTextField?: string }): string | undefined => {
    if (!cell.subTextField) return undefined;
    const raw = rows[0]?.[cell.subTextField];
    return raw != null && raw !== '' ? String(raw) : '—';
  };
  // Multi-line sub-text (subTextFields): same verbatim first-row rule as subTextField (null/'' → '—'),
  // one rendered line per field in array order.
  const subTextsOf = (cell: { subTextFields?: string[] }): string[] | undefined => {
    if (!cell.subTextFields?.length) return undefined;
    return cell.subTextFields
      .map((f) => { if (!f) return undefined; const raw = rows[0]?.[f]; return raw != null && raw !== '' ? String(raw) : '—'; })
      .filter((s): s is string => s != null);
  };
  // Second-tier value line (secondaryTextField): verbatim first-row text like textField, but an
  // empty/missing value simply drops the line instead of showing '—'.
  const secondaryTextOf = (cell: { secondaryTextField?: string }): string | undefined => {
    if (!cell.secondaryTextField) return undefined;
    const raw = rows[0]?.[cell.secondaryTextField];
    return raw != null && raw !== '' ? String(raw) : undefined;
  };
  return (opts.cells || []).map((cell) => {
    const targetDep = !!cell.ratioNum || (!!cell.field && cell.field !== opts.valueKey);
    const fontSize = cell.fontSize;   // per-cell value font size override
    const subText = subTextOf(cell);
    const subTexts = subTextsOf(cell);
    const secondaryText = secondaryTextOf(cell);
    // flex-grow ratio + signed-% coloring passthrough (both default to off/1).
    const flex = cell.flex;
    const signedColor = cell.subTextSignedColor === true;
    // Summary label accepts inline bilingual `{ zh, en }` — follows the display language toggle.
    const label = resolveBilingualText(cell.label, opts.language);
    // color override: a CSS color (#hex / rgb / hsl, from the color picker) applies inline and wins
    // over any class; a tailwind class (e.g. 'text-amber-600 dark:text-amber-400') applies via cls.
    const colorIsCss = !!cell.color && /^(#|rgb|hsl|var\()/i.test(cell.color.trim());
    const colorStyle = colorIsCss ? cell.color : undefined;
    const colorClass = cell.color && !colorIsCss ? cell.color : undefined;
    if (opts.hideTargets && targetDep) return { label, text: '—', cls: 'text-slate-400 dark:text-neutral-500', fontSize, colorStyle: undefined as string | undefined, subText: undefined as string | undefined, subTexts: undefined, secondaryText: undefined, flex, signedColor };
    if (cell.textField) {
      // Verbatim text cell: the datasource pre-formats (and pre-splits) the value in SQL.
      const raw = rows[0]?.[cell.textField];
      const text = raw != null && raw !== '' ? String(raw) : '—';
      return { label, text, cls: colorClass || 'text-slate-900 dark:text-neutral-100', fontSize, colorStyle, subText, subTexts, secondaryText, flex, signedColor };
    }
    if (cell.ratioNum && cell.ratioDen) {
      const den = sumField(cell.ratioDen);
      const pct = den > 0 ? Math.round((sumField(cell.ratioNum) / den) * 1000) / 10 : 0;
      const cls = colorClass || 'text-slate-900 dark:text-neutral-100';
      return { label, text: `${pct}%`, cls, fontSize, colorStyle, subText, subTexts, secondaryText, flex, signedColor };
    }
    if (cell.field) return { label, text: opts.formatValue(sumField(cell.field)), cls: colorClass || 'text-slate-900 dark:text-neutral-100', fontSize, colorStyle, subText, subTexts, secondaryText, flex, signedColor };
    return { label, text: '—', cls: 'text-slate-400 dark:text-neutral-500', fontSize, colorStyle: undefined as string | undefined, subText, subTexts, secondaryText, flex, signedColor };
  });
}

// Shared top summary strip (overlapBar + column/bar): rounded grey bar of label-over-value cells
// separated by vertical rules. Rendered above the chart, outside any horizontal scroll track.
function OverlapSummaryStrip({ cells, defaultFontSize, sideMargin }: { cells: OverlapSummaryCellView[]; defaultFontSize?: number; sideMargin?: number }) {
  const narrow = useMobileFlowLayout();
  if (cells.length === 0) return null;
  return (
    <div
      className={cn(
        'mx-1 mb-3 flex items-center rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60 px-1 py-2.5',
        narrow && 'flex-wrap'
      )}
      style={sideMargin != null ? { marginLeft: sideMargin, marginRight: sideMargin } : undefined}
    >
      {cells.map((c, k) => {
        const valueSize = c.fontSize ?? defaultFontSize ?? 14;
        // Sub lines: the single subTextField line first (kept as one-line sugar), then each
        // subTextFields line in array order — identical styling.
        const subLines = [...(c.subText != null ? [c.subText] : []), ...(c.subTexts ?? [])];
        return (
        <React.Fragment key={k}>
          {k > 0 && <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-neutral-700" />}
          <div className={cn('flex-1 text-center', narrow && 'min-w-0')} style={c.flex != null ? { flex: c.flex } : undefined}>
            <div className="text-[12px] text-slate-400 dark:text-neutral-500">{c.label}</div>
            <div className={cn('tabular-nums', c.cls)} style={{ fontSize: valueSize, fontWeight: 700, ...(c.colorStyle ? { color: c.colorStyle } : {}) }}>{c.text}</div>
            {c.secondaryText != null && (
              <div className={cn('tabular-nums', c.cls)} style={{ fontSize: Math.max(8, valueSize - 2), fontWeight: 600, ...(c.colorStyle ? { color: c.colorStyle } : {}) }}>{c.secondaryText}</div>
            )}
            {subLines.map((line, i) => (
              <div key={i} className="whitespace-nowrap tabular-nums text-slate-400 dark:text-neutral-500" style={{ fontSize: Math.max(9, valueSize - 4) }}>
                {c.signedColor ? renderSignedPercentText(line) : line}
              </div>
            ))}
          </div>
        </React.Fragment>
        );
      })}
    </div>
  );
}

// overlapBar summary skeleton: matches real summary bar layout (see renderChart overlapBar branch).
// Reserves height during load so the chart below does not jump when data arrives.
function OverlapSummaryBarSkeleton({ cells, overlapSideMargin }: { cells: number; overlapSideMargin?: number }) {
  const narrow = useMobileFlowLayout();
  return (
    <div
      className={cn(
        'mx-1 mb-3 flex items-center rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60 px-1 py-2.5',
        narrow && 'flex-wrap'
      )}
      style={overlapSideMargin != null ? { marginLeft: overlapSideMargin, marginRight: overlapSideMargin } : undefined}
    >
      {Array.from({ length: Math.max(1, cells) }).map((_, k) => (
        <React.Fragment key={k}>
          {k > 0 && <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-neutral-700" />}
          <div className={cn('flex flex-1 flex-col items-center gap-1', narrow && 'min-w-0')}>
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  chartType,
  title,
  data,
  xField,
  yField,
  seriesField: _seriesField,
  height = 300,
  chartHeight: chartHeightProp,
  loading = false,
  className,
  meta = {},
  label = false,
  smooth = false,
  isGroup = false,
  isStack = false,
  colorField,
  angleField,
  radius = 0.8,
  innerRadius,
  legend: _legend = {
    position: 'bottom'
  },
  useMockData = false,
  mockData = [],
  color,
  colors,
  colorScheme = 'default',
  tooltip,
  showArea = true,
  areaStyle,
  showPoint = false,
  point,
  columnWidthRatio = 0.8,
  barSizePx,
  scrollable = false,
  scrollMinWidthPerGroup,
  grid = true,
  showValueAxisGrid = true,
  barLengthAdjustment = false,
  showBarNumber = false,
  barNumberFontSize,
  barCompField,
  showMode = 'value',
  showLegend = true,
  showTooltip = true,
  showDataView = true,
  bordered = true,
  additionalStats,
  additionalStatsLabelFontSize,
  titleFontSize,
  xAxisFontSize,
  yAxisFontSize,
  id,
  customStyles,
  databaseDataSourceConfig,
  pageParams = {},
  componentParameterConfig,
  followPageRefresh = false,
  series: composedSeries,
  referenceLines: composedRefLines,
  composedBarLabel = false,
  overlapValueKey = 'sales_amt',
  overlapValueName,
  overlapTargets,
  overlapTargetAchievement = false,
  overlapCompKey,
  overlapHideTargets = false,
  overlapValueLabel = true,
  overlapValueColor,
  overlapValueLabelColor = '#6366f2',
  overlapValueLabelFontSize = 11,
  overlapSummaryFontSize,
  overlapSummary,
  overlapShowSummary = true,
  seriesSameColor = false,
  seriesLegendVisible = true,
  overlapSideMargin,
  overlapBarWidth,
  overlapXTickNoWrap = false,
  overlapLineKey,
  overlapLineName,
  overlapLineColor = '#10b981',
  drillDataSourceConfig,
  drillParamKey = 'region',
  drillKeyField = 'drill_key',
  drillBreadcrumbLabel,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const { localizeRows, language: cfgLanguage } = useWorkbenchConfigLocale();
  const fillCell = useGrid24FillCell();

  const showMainGrid = grid !== false;
  const showValueAxisGridLines = parseChartBool(showValueAxisGrid, true);
  const barLengthAdjustmentOn = parseChartBool(barLengthAdjustment, false);
  const showBarNumberOn = parseChartBool(showBarNumber, false);

  const legendVisible = _legend !== false && parseChartBool(showLegend, true);
  const showDataViewEnabled = parseChartBool(showDataView, true);
  const showCardChrome = parseChartBool(bordered, true);

  const parametersKey = JSON.stringify(databaseDataSourceConfig?.parameters || {});
  const listenToParametersKey = JSON.stringify(componentParameterConfig?.listenToParameters || []);

  const listenParams = useMemo(() => {

    if (componentParameterConfig?.listenToParameters && componentParameterConfig.listenToParameters.length > 0) {
      return componentParameterConfig.listenToParameters;
    }

    const extractedParams: string[] = [];
    if (databaseDataSourceConfig?.parameters) {
      Object.values(databaseDataSourceConfig.parameters).forEach((value: any) => {

        if (value && typeof value === 'object' && value.type === 'parameter' && value.source) {
          extractedParams.push(value.source);
        }
      });
    }

    return extractedParams;

  }, [parametersKey, listenToParametersKey]);

  
  
  const { getCurrentParameter } = useComponentCommunication({
    componentId: id ?? 'chart',
    listenParameters: listenParams,
    autoCleanup: true,
  });
  
  useParameters(listenParams);
  const boundParamSig = listenParams.map(k => `${k}=${String(getCurrentParameter(k) ?? '')}`).join('|');

  // waitForValue contract: only gating params (strict waitForValue:true + legacy no-default)
  // hold the first fetch; opt-out (waitForValue:false) and defaulted bindings never do. When
  // listenToParameters is configured explicitly, keep waiting on that list (legacy behavior).
  const fetchGateParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [parametersKey]
  );
  const fetchWaitParams = useMemo(
    () =>
      componentParameterConfig?.listenToParameters?.length
        ? listenParams
        : fetchGateParams.all,
    [componentParameterConfig?.listenToParameters, listenParams, fetchGateParams]
  );
  // Strict keys are checked against the RESOLVED request body (gate == payload by construction).
  const strictWaitKeys = useMemo(
    () => extractStrictWaitParameterKeysFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [parametersKey]
  );

  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    fetchWaitParams.length > 0 ? fetchWaitParams : undefined
  );

  // Resolve bound parameter descriptors ({type:'parameter'|'system'}) into concrete values from
  // page params / the parameter bus. Shared by the main AND the drill fetch: the drill config must
  // go through the same resolution + the same hook branch as the main fetch — useDatabaseDataSource
  // ignores config.parameters entirely when additionalParams.parameters is present, so unresolved
  // drill bindings (dates, store filters) would be silently dropped and the drill query would fall
  // back to its full-time-range defaults.
  const resolveDataSourceConfig = (
    config: DatabaseDataSourceConfig | null | undefined
  ): DatabaseDataSourceConfig | null => {
    if (!config) return null;

    if (!config.parameters || Object.keys(config.parameters).length === 0) {
      return config;
    }

    const resolvedParameters: Record<string, any> = {};

    Object.entries(config.parameters).forEach(([key, value]) => {
      if (value && typeof value === 'object' && (value as any).type === 'parameter') {
        const paramConfig = value as { type: 'parameter'; source: string; value?: any };
        const paramName = paramConfig.source;

        let actualValue = pageParams[paramName];
        if (actualValue === undefined || actualValue === null) {
          const busVal = getCurrentParameter(paramName);
          if (busVal !== undefined && busVal !== null) actualValue = busVal;
        }

        if (actualValue && typeof actualValue === 'object') {
          if ('id' in actualValue) {
            actualValue = actualValue.id;
          } else if ('value' in actualValue) {
            actualValue = actualValue.value;
          }
        }

        resolvedParameters[key] = actualValue !== undefined ? actualValue : paramConfig.value;
      } else if (value && typeof value === 'object' && (value as any).type === 'system') {

        const systemParamConfig = value as { type: 'system'; systemParam: string; value?: any };
        const systemValue = getSystemParameterValue(
          systemParamConfig.systemParam as any
        );

        resolvedParameters[key] = systemValue || systemParamConfig.value || '';
      } else {
        resolvedParameters[key] = value;
      }
    });

    return {
      ...config,
      parameters: resolvedParameters
    };
  };

  const resolvedDatabaseDataSourceConfig = useMemo(
    () => resolveDataSourceConfig(databaseDataSourceConfig),
    [databaseDataSourceConfig, pageParams, getCurrentParameter, boundParamSig]
  );

  const {
    data: databaseData,
    loading: databaseLoading,
    error: databaseError,
    isInitialized: databaseInitialized,
    refetch: refetchDatabaseData
  } = useDatabaseDataSource(
    resolvedDatabaseDataSourceConfig,
    'Chart',
    {},
    {
      autoFetch: false, 
      errorConfig: {
        showToast: true,
        retryAttempts: 2,
        retryDelay: 1000
      }
    }
  );

  const refetchRef = useRef(refetchDatabaseData);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConfigKeyRef = useRef<string>('');

  useEffect(() => {
    refetchRef.current = refetchDatabaseData;
  }, [refetchDatabaseData]);

  useEffect(() => {

    if (!databaseDataSourceConfig?.datasourceId) {
      return;
    }

    const configKey = JSON.stringify({
      datasourceId: databaseDataSourceConfig.datasourceId,
      parameters: resolvedDatabaseDataSourceConfig?.parameters || {},
      listenParams: listenParams
    });

    if (configKey === lastConfigKeyRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const hasWaitParams = fetchWaitParams.length > 0;

    const resolvedP = (resolvedDatabaseDataSourceConfig?.parameters || {}) as Record<string, unknown>;
    const resolvedKeys = Object.keys(resolvedP);
    const hasResolvedBoundValues = resolvedKeys.length > 0 && resolvedKeys.every(k => resolvedP[k] !== undefined);
    // strict (waitForValue:true) keys must have resolved into the request body itself — readiness
    // marks alone don't count (FilterPanel marks its params ready before async-resolved values
    // land, which would let an unfiltered query through). Checking the body keeps gate == payload.
    const strictBodyOk = strictWaitKeys.every(k => resolvedP[k] !== undefined && resolvedP[k] !== null);
    const isReallyReady =
      strictBodyOk &&
      (!hasWaitParams || parametersReady || checkParametersReady(fetchWaitParams) || hasResolvedBoundValues);
    if ((hasWaitParams || strictWaitKeys.length > 0) && !isReallyReady) {

      return;
    }

    lastConfigKeyRef.current = configKey;
    timeoutRef.current = setTimeout(() => {
      refetchRef.current();
    }, 0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    databaseDataSourceConfig?.datasourceId,
    listenParams,
    fetchWaitParams,
    strictWaitKeys,
    parametersReady,
    checkParametersReady,
    resolvedDatabaseDataSourceConfig,
    getCurrentParameter
  ]);

  const chartRefreshTrigger = pageParams?.chartRefreshTrigger;
  useEffect(() => {
    if (!followPageRefresh || !databaseDataSourceConfig?.datasourceId || chartRefreshTrigger == null) {
      return;
    }
    refetchRef.current();
  }, [followPageRefresh, databaseDataSourceConfig?.datasourceId, chartRefreshTrigger]);

  
  const [drill, setDrill] = useState<{ key: string; label: string } | null>(null);
  
  useEffect(() => { setDrill(null); }, [databaseDataSourceConfig?.datasourceId]);
  
  // Drill fetch config: bus-resolved bound params (dates/store filters, same as the main fetch)
  // + the clicked drill key baked into parameters. Passed as the config with EMPTY additionalParams
  // so the hook takes the same config.parameters branch as the main fetch — putting the drill key in
  // additionalParams.parameters would make the hook drop every other bound parameter (full-range bug).
  const resolvedDrillDataSourceConfig = useMemo(() => {
    if (!drill) return null;
    const base = resolveDataSourceConfig(drillDataSourceConfig);
    if (!base) return null;
    return { ...base, parameters: { ...(base.parameters ?? {}), [drillParamKey]: drill.key } };
  }, [drill, drillParamKey, drillDataSourceConfig, pageParams, getCurrentParameter, boundParamSig]);
  const {
    data: drillData,
    loading: drillLoading,
    isInitialized: drillInitialized,
    refetch: refetchDrillData,
  } = useDatabaseDataSource(
    resolvedDrillDataSourceConfig,
    'Chart',
    {},
    { autoFetch: false, errorConfig: { showToast: true, retryAttempts: 2, retryDelay: 1000 } }
  );

  const drillSettled = !!drill && drillInitialized && !drillLoading;
  const refetchDrillRef = useRef(refetchDrillData);
  useEffect(() => { refetchDrillRef.current = refetchDrillData; }, [refetchDrillData]);
  // Refetch when the drill opens OR when any resolved param (date/store filter) changes while drilled,
  // so the drill view follows the FilterPanel just like the region bars do.
  const drillParamSig = useMemo(
    () => (resolvedDrillDataSourceConfig ? JSON.stringify(resolvedDrillDataSourceConfig.parameters ?? null) : ''),
    [resolvedDrillDataSourceConfig]
  );
  useEffect(() => {
    if (!drill || !resolvedDrillDataSourceConfig?.datasourceId) return;
    const tid = setTimeout(() => refetchDrillRef.current(), 0);
    return () => clearTimeout(tid);
  }, [drill, resolvedDrillDataSourceConfig?.datasourceId, drillParamSig]);

  const rawChartData = useMemo(() => {
    if (drill) {
      
      return drillSettled ? (drillData ?? []) : [];
    }
    if (useMockData && mockData && mockData.length > 0) {
      return mockData;
    }
    if (databaseDataSourceConfig?.datasourceId && databaseData && databaseData.length > 0) {
      return databaseData;
    }
    return data || [];
  }, [drill, drillSettled, drillData, useMockData, mockData, databaseDataSourceConfig?.datasourceId, databaseData, data]);

  const chartData = useMemo(() => {
    const localized = localizeRows(rawChartData as Record<string, unknown>[]);
    // Bilingual datasource labels (2026-08-11): trend charts pin xField to the `label_zh`
    // column while the SQL also emits `label_en` (e.g. the hourly 'Before 10am' bucket).
    // In EN mode prefer the `<base>_en` column when it carries a value — otherwise the axis
    // would stay Chinese regardless of the display language.
    if (!cfgLanguage.startsWith('zh') && xField?.endsWith('_zh')) {
      const enKey = `${xField.slice(0, -3)}_en`;
      return localized.map((row) => {
        const enVal = row?.[enKey];
        return enVal != null && String(enVal).trim() !== '' ? { ...row, [xField]: enVal } : row;
      });
    }
    return localized;
  }, [rawChartData, localizeRows, cfgLanguage, xField]);

  const isLoading = loading || (databaseDataSourceConfig?.datasourceId && databaseLoading) || (!!drill && !drillSettled);

  const customStyleProps = id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };

  const plotHeight =
    typeof chartHeightProp === 'number' && !Number.isNaN(chartHeightProp) && chartHeightProp >= 0
      ? chartHeightProp
      : height;

  // Imposed-height cells (edit canvas / fill-mode view cells): the card stretches to the cell
  // band and the plot flexes instead of keeping its fixed px height, which would leave a dead
  // strip inside the cell.
  const cardStyle: React.CSSProperties = {
    ...customStyleProps.style,
    ...(fillCell
      ? { height: '100%' }
      : typeof height === 'number' && height > 0
        ? { minHeight: `${height}px` }
        : {})
  };

  const plotAreaHeight: number | string = fillCell ? '100%' : plotHeight;
  const plotAreaClassName = fillCell ? 'min-h-0 flex-1' : undefined;

  const chartColors = resolveEchartsChartPalette(colorScheme, colors);
  const gradientIdPrefix = useId().replace(/:/g, '');

  const [viewType, setViewType] = useState<'chart' | 'data'>('chart');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!showDataViewEnabled && viewType === 'data') {
      setViewType('chart');
    }
  }, [showDataViewEnabled, viewType]);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkTheme();

    const observer = new MutationObserver(() => {
      checkTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const getYFields = (): string[] => {
    return Array.isArray(yField) ? yField : [yField];
  };

  const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  function formatNumericDisplayValue(raw: unknown): string {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n)) return formatNumericDisplayValue(n);
      return raw;
    }
    const n = typeof raw === 'number' ? raw : toNumber(raw);
    if (Number.isNaN(n)) return String(raw);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(10).replace(/\.?0+$/, '') || '0';
  }

  const formatTooltipValue = (value: any, name: string) => {
    const formatter = meta[name]?.formatter;
    if (formatter) {

      if (typeof formatter === 'function') {
        return [formatter(value), meta[name]?.alias || name];
      }

      if (formatter === 'percentage') {
        if (showMode === 'percentage') {
          return [`${formatNumericDisplayValue(value)}%`, meta[name]?.alias || name];
        }

        return [formatNumericDisplayValue(value), meta[name]?.alias || name];
      }
    }
    if (showMode === 'percentage') {
      return [`${formatNumericDisplayValue(value)}%`, meta[name]?.alias || name];
    }
    return [formatNumericDisplayValue(value), meta[name]?.alias || name];
  };

  const formatLabelValue = (value: any, field: string, formatter?: string) => {

    if (value === undefined || value === null) {
      return '';
    }

    if (!formatter) return value;

    if (formatter.includes('{value}')) {
      return formatter.replace('{value}', String(value));
    }

    if (formatter === 'percentage') {
      return `${value}%`;
    }
    return value;
  };

  const renderDataView = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div
          className={cn('data-empty flex items-center justify-center', fillCell && 'min-h-0 flex-1')}
          style={fillCell ? undefined : { height: `${plotHeight}px` }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">📊</div>
            <p className={`text-sm ${SEMANTIC_COLORS.text.muted}`}>{i18n.t('renderers:chart.no_data', 'No data')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('data-table-view overflow-auto custom-scrollbar', fillCell && 'min-h-0 flex-1')}>
        <table className="data-table w-full border-collapse">
          <thead className="data-table-header">
            <tr className="data-table-row border-b">
              <th className="data-table-cell text-left p-2 font-semibold">{xField}</th>
              {getYFields().map(field => (
                <th key={field} className="data-table-cell text-left p-2 font-semibold">
                  {meta[field]?.alias || field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {chartData.map((item, index) => (
              <tr key={index} className="data-table-row border-b hover:bg-muted/50">
                <td className="data-table-cell p-2">{formatNumericDisplayValue(item[xField])}</td>
                {getYFields().map(field => {
                  const formatter = meta[field]?.formatter;
                  let formattedValue = item[field];

                  if (formatter) {

                    if (typeof formatter === 'function') {
                      formattedValue = formatter(item[field]);
                    }

                    else if (formatter === 'percentage') {
                      formattedValue = `${item[field]}%`;
                    }
                  }

                  return (
                    <td key={field} className="data-table-cell p-2">
                      {formatNumericDisplayValue(formattedValue)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatValueAxisTick = (value: number | string): string => {
    if (showMode !== 'percentage') return formatNumericDisplayValue(value);
    return `${formatNumericDisplayValue(value)}%`;
  };

  const getBarValueExtent = (data: any[], fields: string[], stacked: boolean): { min: number; max: number } => {
    if (!data.length || !fields.length) return { min: 0, max: 1 };
    if (stacked) {
      const sums = data.map(row => fields.reduce((sum, f) => sum + toNumber(row[f]), 0));
      return { min: Math.min(...sums), max: Math.max(...sums) };
    }
    let minV = Infinity;
    let maxV = -Infinity;
    for (const row of data) {
      for (const f of fields) {
        const v = toNumber(row[f]);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }
    }
    if (!Number.isFinite(minV)) minV = 0;
    if (!Number.isFinite(maxV)) maxV = 1;
    return { min: minV, max: maxV };
  };

  const barDataAllowsSqrtScale = (data: any[], fields: string[]): boolean => {
    let hasPositive = false;
    for (const row of data) {
      for (const f of fields) {
        if (!(f in row)) continue;
        const v = toNumber(row[f]);
        if (v < 0) return false;
        if (v > 0) hasPositive = true;
      }
    }
    return hasPositive;
  };

  const transformDataForSeries = (data: any[], xField: string, yField: string, seriesField?: string, compField?: string) => {
    if (!seriesField || !data || data.length === 0) {
      return data;
    }

    const xValues = Array.from(new Set(data.map(item => item[xField])));
    const seriesValues = Array.from(new Set(data.map(item => item[seriesField])));

    return xValues.map(xVal => {
      const result: any = { [xField]: xVal };
      seriesValues.forEach(seriesVal => {
        const item = data.find(d => d[xField] === xVal && d[seriesField] === seriesVal);
        result[seriesVal] = toNumber(item ? item[yField] : 0);
        // Optional comparison (YoY%) column per series — raw value kept so the bar-top label can
        // distinguish "missing/non-numeric" (no second line) from a real 0%.
        if (compField) {
          result[`__comp__${seriesVal}`] = item ? item[compField] : undefined;
        }
      });
      return result;
    });
  };

  const normalizeChartData = (data: any[], yFields: string[], xField: string) => {
    if (!data || data.length === 0) return data;
    return data.map(row => {
      const normalized = { ...row };
      yFields.forEach(field => {
        if (field in normalized) {
          normalized[field] = toNumber(normalized[field]);
        }
      });
      return normalized;
    });
  };

  const renderChart = () => {
    if (viewType === 'data') {
      return renderDataView();
    }

    if (!chartData || chartData.length === 0) {
      return (
        <ChartEmptyState
          height={plotHeight}
          chartType={chartType}
          className={plotAreaClassName}
          title={i18n.t('renderers:chart.no_data', 'No data')}
          description={i18n.t('renderers:chart.no_data_hint', 'No data for the current selection')}
        />
      );
    }

    // overlapBar does its own pivot inside its branch (per-bucket target sums + per-store comp
    // columns) — the generic series pivot would drop the raw target/comp columns it needs.
    const genericSeriesPivot = !!_seriesField && chartType !== 'overlapBar';
    const processedData = genericSeriesPivot
      ? transformDataForSeries(chartData, xField, Array.isArray(yField) ? yField[0] : yField, _seriesField, barCompField)
      : chartData;

    const yFields: string[] = genericSeriesPivot
      ? Array.from(new Set(chartData.map((item) => item[_seriesField]).filter(Boolean))).map(String)
      : getYFields();

    const normalizedData = normalizeChartData(processedData, yFields, xField);

    const commonProps = {
      data: normalizedData,
      margin: { top: 20, right: 30, left: 20, bottom: 10 }
    };

    if (chartType === 'composedBar') {
      const seriesCfg =
        Array.isArray(composedSeries) && composedSeries.length > 0
          ? composedSeries
          : [
              { type: 'bar' as const, dataKey: 'salesAmtLY', yAxisId: 'left' as const, color: '#c7d2fe', name: 'LY' },
              { type: 'bar' as const, dataKey: 'salesAmt', yAxisId: 'left' as const, color: '#6366f1', name: t('chart.current_period', 'Current Period') },
              { type: 'line' as const, dataKey: 'smiRate', yAxisId: 'right' as const, color: '#f59e0b', name: 'SMI%' },
            ];
      const refLines = Array.isArray(composedRefLines) ? composedRefLines : [];
      return (
        <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
          <ComposedChart {...commonProps} barGap={2} barCategoryGap="24%">
            {showMainGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /> : null}
            <XAxis dataKey={xField} tick={{ fontSize: xAxisFontSize ?? 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: yAxisFontSize ?? 10 }} axisLine={false} tickLine={false} width={40} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: yAxisFontSize ?? 10 }} axisLine={false} tickLine={false} width={32} />
            {showTooltip && (
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
            )}
            {legendVisible && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {refLines.map((r, i) => (
              <ReferenceLine
                key={`ref-${i}`}
                yAxisId="right"
                y={r.value}
                stroke={r.stroke || '#cbd5e1'}
                strokeDasharray={r.strokeDasharray || '3 3'}
              />
            ))}
            {seriesCfg.map((s, i) =>
              s.type === 'line' ? (
                <Line
                  key={`s-${i}`}
                  yAxisId={s.yAxisId || 'left'}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name || s.dataKey}
                  stroke={s.color || '#f59e0b'}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ) : (
                <Bar
                  key={`s-${i}`}
                  yAxisId={s.yAxisId || 'left'}
                  dataKey={s.dataKey}
                  name={s.name || s.dataKey}
                  fill={s.color || '#6366f1'}
                  radius={[3, 3, 0, 0]}
                  barSize={10}
                >
                  {composedBarLabel && <LabelList dataKey={s.dataKey} position="top" style={{ fontSize: 11, fill: '#64748b' }} />}
                </Bar>
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'overlapBar') {
      const toNum = (v: unknown): number | undefined => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
      const fmtVal = (v: unknown) => formatCompactCurrency(v, 'CNY');
      // Bar-top label: compact to thousands (K) — keeps the ÷1000 calculation but caps the unit at K
      // (never M), no currency symbol, no decimals. e.g. 12,930,000 -> "12,930K". Tooltip + summary
      // keep the full compact ¥ format via fmtVal.
      const fmtBarLabel = (v: unknown) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '';
        if (n === 0) return '0';
        return `${Math.round(n / 1000).toLocaleString('en-US')}K`;
      };
      const valueColor = overlapValueColor || chartColors[0] || '#6366f1';
      // Legend/tooltip names accept inline bilingual `{ zh, en }` — resolved by the workbench
      // display language so the bottom-left legend follows the zh/en toggle.
      const valueName = resolveBilingualText(overlapValueName, cfgLanguage) || meta[overlapValueKey]?.alias || overlapValueKey;
      const targetPalette = ['#f59e0b', '#f43f5e', '#10b981'];
      const allTargets = overlapHideTargets
        ? []
        : (overlapTargets || []).map((tg, k) => ({ dataKey: tg.dataKey, color: tg.color || targetPalette[k % targetPalette.length], name: resolveBilingualText(tg.name, cfgLanguage) || tg.dataKey, hideWithLine: tg.hideWithLine }));

      // Multi-store comparison (seriesField set): pivot (bucket, store, value/target/comp) rows into
      // one row per bucket — one sales column per store, per-store comp columns, and per-bucket
      // SUMMED target columns (the target overlay is one band per bucket, not per store). Buckets
      // and stores keep first-seen row order.
      let overlapSeries: Array<{ key: string; name: string; color: string }> | undefined;
      let od = normalizedData as Record<string, unknown>[];
      if (_seriesField) {
        const rawRows = chartData as Record<string, unknown>[];
        const buckets = Array.from(new Set(rawRows.map((r) => String(r[xField]))));
        const storeNames = Array.from(new Set(rawRows.map((r) => String(r[_seriesField])).filter((v) => v && v !== 'undefined')));
        od = buckets.map((b) => {
          const bucketRows = rawRows.filter((r) => String(r[xField]) === b);
          const out: Record<string, unknown> = { [xField]: b };
          storeNames.forEach((s) => {
            const item = bucketRows.find((r) => String(r[_seriesField]) === s);
            out[s] = item ? toNumber(item[overlapValueKey]) : 0;
            if (overlapCompKey) out[`__comp__${s}`] = item ? item[overlapCompKey] : undefined;
          });
          allTargets.forEach((tg) => {
            out[tg.dataKey] = bucketRows.reduce((a, r) => a + toNumber(r[tg.dataKey]), 0);
          });
          return out;
        });
        // First store = the main value color; following stores walk the chart palette in order —
        // unless seriesSameColor flattens every store to the main value color.
        const sameColor = parseChartBool(seriesSameColor, false);
        overlapSeries = storeNames.map((s, k) => ({
          key: s,
          name: meta[s]?.alias || s,
          color: k === 0 || sameColor ? valueColor : chartColors[k % chartColors.length],
        }));
      }
      const overlapRows = od;

      // Cumulative line: gated on data, not just config — range mode returns the column as all
      // NULL, and a configured-but-empty key must not draw a line or a legend entry. The null
      // check is explicit: toNum alone would coerce null to 0 via Number(null).
      const lineName = overlapLineKey ? resolveBilingualText(overlapLineName, cfgLanguage) || meta[overlapLineKey]?.alias || overlapLineKey : '';
      const showLine = !!overlapLineKey && overlapRows.some((r) => r[overlapLineKey] != null && toNum(r[overlapLineKey]) !== undefined);

      // Targets flagged hideWithLine drop out entirely in hourly (cumulative-line) mode — no
      // reference line, legend entry, tooltip row, or axis contribution (2026-08-04: Budget
      // removed from the hourly chart per client; SMI stays). Range mode is unaffected.
      const targets = allTargets.filter((tg) => !(showLine && tg.hideWithLine));

      let rawMax = 0;
      overlapRows.forEach((r) => {
        rawMax = Math.max(
          rawMax,
          ...(overlapSeries ? overlapSeries.map((s) => toNum(r[s.key]) || 0) : [toNum(r[overlapValueKey]) || 0]),
          ...targets.map((tg) => toNum(r[tg.dataKey]) || 0),
          // Cumulative values are >= the bar values, so they must feed the axis max or the line
          // gets clipped at the top of the plot.
          ...(showLine && overlapLineKey ? [toNum(r[overlapLineKey]) || 0] : []),
        );
      });
      // Nice ticks (prototype-aligned): top >= rawMax with uniform steps instead of hard-coded max*1.14.
      const { max: yMax, ticks: yTicks } = niceAxisTicks(rawMax);

      // Summary strip cells come from the shared builder (also used by the column/bar path).
      // With seriesField the pivot dropped the raw metric columns, so sums run over the PRE-PIVOT
      // rows (chartData) — sales/targets are cross-store totals.
      const summaryCells = buildOverlapSummaryCells((_seriesField ? chartData : normalizedData) as Record<string, unknown>[], {
        cells: overlapSummary,
        valueKey: overlapValueKey,
        hideTargets: overlapHideTargets,
        language: cfgLanguage,
        formatValue: fmtVal,
      });

      const canDrill = !!drillDataSourceConfig && !drill;
      const onBarClick = canDrill
        ? (row: Record<string, unknown>) => setDrill({ key: String(row[drillKeyField]), label: String(row[xField]) })
        : undefined;

      // Give every period group a fixed minimum width so bars + value-labels stay readable;
      // when the total exceeds the container the chart scrolls horizontally (with a swipe hint)
      // instead of cramming the bars together.
      const overlapGroupCount = overlapRows.length;
      // When a fixed bar width is configured, widen each group so the requested width isn't capped by
      // the band (barCategoryGap ≈ 24%, so the group must be ~1.4× the bar to leave room for the gap).
      const baseGroupPx = Math.max(OVERLAP_MIN_GROUP_PX, overlapBarWidth != null ? Math.ceil(overlapBarWidth * 1.4) : 0);
      // Multi-store groups widen with the store count: per store the wider of the configured bar
      // width and ~42px for the two-line bar-top labels, plus the inter-bar gap and group padding.
      const seriesGroupPx = overlapSeries && overlapSeries.length > 0
        ? Math.max(overlapBarWidth ?? 0, 42) * overlapSeries.length + 4 * (overlapSeries.length - 1) + 12
        : 0;
      // Long category labels (region→store drill-down shows full store names) overlap as flat
      // single-line ticks. When the longest label (CJK-aware width) can't fit one line in a group,
      // wrap ticks to two lines and widen groups so a wrapped line fits — the chart scrolls anyway.
      // Hourly mode (showLine): wrap only when a bucket label is actually long — the first
      // bucket 'Before 10am' (2026-08-11) is long by design and the plot is
      // container-fit (slot width ≈ container/7), so it wraps to two lines. Short-label sets
      // (e.g. the old '10am/12pm') stay single-line so nothing like '10a'/'m' ever renders.
      // `> 3` visual units is the cutoff: '10am' is 2.4 units, its Chinese form is ~4.4.
      const xTickFs = xAxisFontSize ?? 12;
      const maxLabelUnits = overlapRows
        .reduce((m, r) => Math.max(m, visualUnits(String(r[xField] ?? ''))), 0);
      const wrapTicks = !overlapXTickNoWrap && (showLine
        ? maxLabelUnits > 3
        : maxLabelUnits * xTickFs > Math.max(baseGroupPx, seriesGroupPx) - 6);
      const tickUnitsPerLine = wrapTicks
        ? (showLine
          ? Math.min(6, Math.max(3, Math.ceil(maxLabelUnits / 2)))
          : Math.min(6, Math.ceil(maxLabelUnits / 2)))
        : 0;
      const overlapGroupPx = Math.max(
        wrapTicks ? Math.ceil(tickUnitsPerLine * xTickFs) + 10 : 0,
        // No-wrap mode: widen groups so the longest label fits on ONE line (plot scrolls instead).
        overlapXTickNoWrap && !showLine ? Math.ceil(maxLabelUnits * xTickFs) + 10 : 0,
        baseGroupPx,
        seriesGroupPx,
      );
      const xAxisH = wrapTicks ? 24 + xTickFs + 2 : 24;
      // Hourly mode (2026-08-05 client): min width 0 → the plot fits the container and all 8
      // buckets show at once, no horizontal scrolling (the swipe hint auto-hides when nothing
      // overflows). Range mode keeps the per-group min width + scroll behavior.
      const overlapMinWidth = showLine ? 0 : overlapGroupCount * overlapGroupPx;

      return (
        <div className="chart-container flex flex-col">
          {drill && (
            <div
              className="mx-1 mb-1 flex items-center gap-1 px-1 text-[11px] text-slate-500 dark:text-neutral-400"
              style={overlapSideMargin != null ? { marginLeft: overlapSideMargin, marginRight: overlapSideMargin } : undefined}
            >
              <button type="button" onClick={() => setDrill(null)} className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                <ChevronLeft className="h-3.5 w-3.5" />{i18n.t('renderers:common.back', 'Back')}
              </button>
              <span className="text-slate-300 dark:text-neutral-600">|</span>
              <span>{resolveBilingualText(drillBreadcrumbLabel, cfgLanguage) || title} › <span className="text-indigo-600 dark:text-indigo-300">{drill.label}</span></span>
            </div>
          )}
          {overlapShowSummary !== false && summaryCells.length > 0 && (
            <OverlapSummaryStrip cells={summaryCells} defaultFontSize={overlapSummaryFontSize} sideMargin={overlapSideMargin} />
          )}
          <HorizontalScrollChart
            minWidth={overlapMinWidth}
            height={plotHeight}
            hint={i18n.t('renderers:chart.swipe_to_explore', '← Swipe to explore →')}
            yAxisWidth={36}
            fixedYAxis={
              <ComposedChart data={overlapRows} margin={{ top: 20, right: 0, left: 0, bottom: 10 }}>
                <YAxis domain={[0, yMax]} ticks={yTicks} tick={{ fontSize: yAxisFontSize ?? 12 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => fmtAxisTick(v)} />
                <XAxis dataKey={xField} height={xAxisH} tick={false} axisLine={false} tickLine={false} />
              </ComposedChart>
            }
          >
            <ComposedChart
              data={overlapRows}
              // No left margin: bars sit flush against the Y-axis column (removes the left blank gap).
              margin={overlapSideMargin != null
                ? { top: 20, right: overlapSideMargin, left: overlapSideMargin, bottom: 10 }
                : { top: 20, right: 12, left: 0, bottom: 10 }}
              barCategoryGap="24%"
            >
              {showMainGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} /> : null}
              <XAxis
                dataKey={xField}
                tick={wrapTicks ? <OverlapAxisTick fontSize={xTickFs} unitsPerLine={tickUnitsPerLine} /> : { fontSize: xTickFs }}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={xAxisH}
              />
              <YAxis domain={[0, yMax]} ticks={yTicks} hide />
              {showTooltip && (
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  content={({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }> }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    if (!row) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-[11px] shadow-sm">
                        <div className="mb-0.5 font-medium text-slate-700 dark:text-neutral-300">{String(row[xField] ?? '')}</div>
                        {overlapSeries ? (
                          <>
                            {overlapSeries.map((s, k) => {
                              const comp = overlapCompKey && row[`__comp__${s.key}`] != null ? toNumber(row[`__comp__${s.key}`]) : NaN;
                              const hasComp = overlapCompKey != null;
                              return (
                                <div key={k} className="flex items-center gap-1.5">
                                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                                  {s.name}: <span className="tabular-nums">{row[s.key] != null ? fmtVal(row[s.key]) : '—'}</span>
                                  {hasComp && (
                                    Number.isFinite(comp)
                                      ? <span className={cn('tabular-nums', comp >= 0 ? 'text-green-600' : 'text-red-600')}>{comp >= 0 ? '+' : ''}{comp.toFixed(1)}%</span>
                                      : <span className="tabular-nums text-slate-400 dark:text-neutral-500">—</span>
                                  )}
                                </div>
                              );
                            })}
                            {targets.map((tg, k) => {
                              if (row[tg.dataKey] == null) return null;
                              // Achievement = cross-store total sales ÷ this bucket's summed target.
                              const den = toNumber(row[tg.dataKey]);
                              const total = overlapSeries.reduce((a, s) => a + toNumber(row[s.key]), 0);
                              const ach = Number.isFinite(den) && den > 0 && total > 0
                                ? ` (${((total / den) * 100).toFixed(1)}%)` : '';
                              return (
                                <div key={k} className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: tg.color }} />{tg.name}: <span className="tabular-nums">{fmtVal(row[tg.dataKey])}{ach}</span></div>
                              );
                            })}
                          </>
                        ) : (
                          <>
                        <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: valueColor }} />{valueName}: <span className="tabular-nums">{row[overlapValueKey] != null ? fmtVal(row[overlapValueKey]) : '—'}</span></div>
                        {(() => {
                          // YoY line mirrors the bar-top comp% label (0706 acceptance #3).
                          // compKey set but value null/non-numeric (zero or missing LY base) → muted '—'.
                          // Hourly mode (cumulative line showing) follows the 0804 mockup: no Comp/YoY
                          // tooltip row — rt has no comparable comp base, so all comp display is hidden.
                          const comp = overlapCompKey ? toNumber(row[overlapCompKey]) : NaN;
                          if (!overlapCompKey || showLine) return null;
                          if (row[overlapCompKey] == null || !Number.isFinite(comp)) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#94a3b8' }} />
                                {i18n.t('renderers:chart.comp_yoy', 'vs LY')}: <span className="tabular-nums text-slate-400 dark:text-neutral-500">—</span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: comp >= 0 ? '#16a34a' : '#dc2626' }} />
                              {i18n.t('renderers:chart.comp_yoy', 'vs LY')}: <span className={cn('tabular-nums', comp >= 0 ? 'text-green-600' : 'text-red-600')}>{comp >= 0 ? '+' : ''}{comp.toFixed(1)}%</span>
                            </div>
                          );
                        })()}
                        {targets.map((tg, k) => {
                          if (row[tg.dataKey] == null) return null;
                          // Achievement rate = main value ÷ this target (dashboard acceptance 0714_2 #1).
                          const den = toNumber(row[tg.dataKey]);
                          const num = toNumber(row[overlapValueKey]);
                          const ach = overlapTargetAchievement && Number.isFinite(den) && den > 0 && Number.isFinite(num)
                            ? ` (${((num / den) * 100).toFixed(1)}%)` : '';
                          return (
                            <div key={k} className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: tg.color }} />{tg.name}: <span className="tabular-nums">{fmtVal(row[tg.dataKey])}{ach}</span></div>
                          );
                        })}
                        {showLine && overlapLineKey && row[overlapLineKey] != null && (
                          <div className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: overlapLineColor }} />{lineName}: <span className="tabular-nums">{fmtVal(row[overlapLineKey])}</span></div>
                        )}
                          </>
                        )}
                      </div>
                    );
                  }}
                />
              )}
              {overlapSeries
                ? overlapSeries.map((s) => <Bar key={s.key} dataKey={s.key} fill={s.color} fillOpacity={0} isAnimationActive={false} />)
                : <Bar dataKey={overlapValueKey} fill={valueColor} fillOpacity={0} isAnimationActive={false} />}
              {/* compKey suppressed in hourly mode (showLine): rt has no comparable comp base, so the
                  0804 mockup's bar-top pct is dropped — bars show the plain value label only (2026-08-04).
                  targets suppressed likewise: hourly targets are flat day totals drawn as full-width
                  ReferenceLines below (prototype: SMI is one continuous dashed line, not per-bar caps). */}
              <Customized component={(p: object) => renderOverlapBarOverlay(p as Parameters<typeof renderOverlapBarOverlay>[0], { data: overlapRows, xField, valueKey: overlapValueKey, valueColor, valueLabel: overlapValueLabel, compKey: showLine ? undefined : overlapCompKey, targets: showLine ? [] : targets, series: overlapSeries, drillKeyField: canDrill ? drillKeyField : undefined, onBarClick, formatValue: fmtVal, formatBarLabel: fmtBarLabel, valueLabelColor: overlapValueLabelColor, valueLabelFontSize: overlapValueLabelFontSize, barWidth: showLine ? Math.min(overlapBarWidth ?? HOURLY_MAX_BAR_PX, HOURLY_MAX_BAR_PX) : overlapBarWidth })} />
              {/* Hourly mode: flat day-total targets as continuous dashed lines spanning the plot
                  (2026-08-04 prototype alignment). Value comes from the first row carrying it —
                  the SQL emits the same day total on every hourly bucket. */}
              {showLine && targets.map((tg, k) => {
                const tv = overlapRows.map((r) => toNum(r[tg.dataKey])).find((v) => v != null);
                return tv != null ? <ReferenceLine key={`tgline-${k}`} y={tv} stroke={tg.color} strokeWidth={1.5} strokeDasharray="6 4" /> : null;
              })}
              {/* Cumulative line — a plain recharts Line shares the chart's scales (the visible
                  bars are hand-drawn by the overlay, the real <Bar> is a fillOpacity=0 placeholder).
                  Declared after <Customized> so recharts paints it on top of the overlay bars. */}
              {showLine && overlapLineKey && (
                <Line type="monotone" dataKey={overlapLineKey} stroke={overlapLineColor} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
              )}
            </ComposedChart>
          </HorizontalScrollChart>
          {legendVisible && (
            <div
              className={cn(
                'px-2 pb-1 pt-1 text-[12px] text-slate-500 dark:text-neutral-400',
                overlapSeries ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-3'
              )}
              style={overlapSideMargin != null ? { paddingLeft: overlapSideMargin, paddingRight: overlapSideMargin } : undefined}
            >
              {overlapSeries
                // Multi-store: store swatches get their own row above the target/comp row; the row
                // is hidden entirely when seriesLegendVisible is false.
                ? (parseChartBool(seriesLegendVisible, true) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {overlapSeries.map((s, k) => (
                      <span key={k} className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: s.color }} />{s.name}</span>
                    ))}
                  </div>
                ))
                : <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: valueColor }} />{valueName}</span>}
              {overlapSeries ? (
                <div className="flex flex-wrap items-center gap-3">
                  {targets.map((tg, k) => (
                    <span key={k} className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border" style={{ background: hexAlpha(tg.color, 0.5), borderColor: tg.color }} />{tg.name}</span>
                  ))}
                  {/* Hourly mode (cumulative line showing) hides the Comp legend entry per the 0804 mockup */}
                  {overlapCompKey && !showLine && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded" style={{ background: 'linear-gradient(135deg, #16a34a 50%, #dc2626 50%)' }} />
                      {i18n.t('renderers:chart.comp_yoy', 'vs LY')} %
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {targets.map((tg, k) => (
                    <span key={k} className="flex items-center gap-1">
                      {/* Hourly mode draws targets as dashed full-width lines — the swatch matches */}
                      {showLine
                        ? <span className="inline-block h-0.5 w-4 rounded" style={{ background: `repeating-linear-gradient(90deg, ${tg.color} 0 3px, transparent 3px 5px)` }} />
                        : <span className="inline-block h-3 w-3 rounded border" style={{ background: hexAlpha(tg.color, 0.5), borderColor: tg.color }} />}
                      {tg.name}
                    </span>
                  ))}
                  {/* Hourly mode (cumulative line showing) hides the Comp legend entry per the 0804 mockup */}
                  {overlapCompKey && !showLine && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded" style={{ background: 'linear-gradient(135deg, #16a34a 50%, #dc2626 50%)' }} />
                      {i18n.t('renderers:chart.comp_yoy', 'vs LY')} %
                    </span>
                  )}
                  {showLine && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-0.5 w-4 rounded" style={{ background: overlapLineColor }} />
                      {lineName}
                    </span>
                  )}
                </>
              )}
              {canDrill && <span className="ml-auto text-indigo-500">{i18n.t('renderers:chart.tap_drill', 'Tap to drill →')}</span>}
            </div>
          )}
        </div>
      );
    }

    if (chartType === 'line') {

      const statsItems =
        additionalStats && additionalStats.length > 0
          ? (() => {
              const fieldSums: Record<string, number> = {};
              yFields.forEach((field: string) => {
                fieldSums[field] = normalizedData.reduce((acc, row) => acc + toNumber(row[field]), 0);
              });
              return additionalStats
                .filter((item) => yFields.includes(item.field))
                .map((item) => {
                  const sum = fieldSums[item.field] ?? 0;
                  const displayName = item.label || meta[item.field]?.alias || item.field;
                  const formatter = meta[item.field]?.formatter;
                  let formattedValue: string | number = sum;
                  if (formatter && typeof formatter === 'function') {
                    formattedValue = formatter(sum);
                  } else if (typeof formatter === 'string' && formatter === 'percentage') {
                    formattedValue = `${sum}%`;
                  }
                  const unit = item.unit || '';
                  let ratioText = '';
                  if (item.ratio) {
                    const denomSum = fieldSums[item.ratio.denominator] ?? 0;
                    const ratioValue = denomSum === 0 ? '-' : Math.round((sum / denomSum) * 100);
                    const ratioUnit = item.ratio.unit === '%' ? '%' : '';
                    const ratioPrefix =
                      item.ratio.prefix !== undefined && item.ratio.prefix !== null
                        ? item.ratio.prefix
                        : i18n.t('renderers:chart.ratio_prefix', 'Share');
                    ratioText = `${ratioPrefix}${ratioValue}${ratioUnit}`;
                  }
                  const colorIndex = yFields.indexOf(item.field);
                  const color = chartColors[colorIndex >= 0 ? colorIndex % chartColors.length : 0];
                  return {
                    displayName,
                    formattedValue,
                    unit,
                    ratioText,
                    color,
                    newlineAtEnd: Boolean(item.newlineAtEnd)
                  };
                });
            })()
          : [];

      const statsFontSize = additionalStatsLabelFontSize ?? 18;

      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          {statsItems.length > 0 && (
            <div
              className="chart-additional-stats mb-2 flex w-full flex-wrap content-start items-start justify-start gap-x-6 font-medium pl-[1em]"
              style={{ fontSize: `${statsFontSize}px` }}
            >
              {statsItems.map(({ displayName, formattedValue, unit, ratioText, color, newlineAtEnd }, idx) => (
                <span
                  key={`${displayName}-${idx}`}
                  className={cn(
                    'inline-flex max-w-full shrink-0 items-baseline text-left',
                    newlineAtEnd && 'block w-full max-w-full basis-full shrink-0'
                  )}
                  style={{ color }}
                >
                  {displayName}: {formattedValue}{unit}
                  {ratioText ? (
                    <span className="whitespace-pre-wrap">{ratioText}</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
          <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
            <LineChart {...commonProps}>
              {showMainGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
              <XAxis dataKey={xField} tick={xAxisFontSize ? { fontSize: xAxisFontSize } : undefined} />
              <YAxis domain={['dataMin', 'dataMax']} allowDataOverflow={false} tick={yAxisFontSize ? { fontSize: yAxisFontSize } : undefined} />
              {showTooltip && (
                <Tooltip 
                  formatter={tooltip?.formatter || formatTooltipValue}
                  shared={tooltip?.shared}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
              {legendVisible && <Legend className="chart-legend" />}
              {yFields.map((field: string, index: number) => (
                <Line 
                  key={String(field)}
                  type={smooth ? "monotone" : "linear"}
                  dataKey={String(field)}
                  name={meta[String(field)]?.alias || String(field)}
                  stroke={chartColors[index % chartColors.length]}
                  activeDot={{ r: 6 }}
                  dot={showPoint ? { r: point?.size || 4 } : false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'area') {
      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
            <AreaChart {...commonProps}>
              <Customized
                component={ChartGradientDefs}
                gradientIdPrefix={gradientIdPrefix}
                chartColors={chartColors}
                variant={'area' as const}
              />
              {showMainGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
              <XAxis dataKey={xField} tick={xAxisFontSize ? { fontSize: xAxisFontSize } : undefined} />
              <YAxis domain={['dataMin', 'dataMax']} allowDataOverflow={false} tick={yAxisFontSize ? { fontSize: yAxisFontSize } : undefined} />
              {showTooltip && (
                <Tooltip 
                  formatter={tooltip?.formatter || formatTooltipValue}
                  shared={tooltip?.shared}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
              {legendVisible && <Legend className="chart-legend" />}
              {yFields.map((field: string, index: number) => {
                const fillColor = chartColors[index % chartColors.length];
                const colorIndex = index % chartColors.length;
                return (
                  <Area
                    key={String(field)}
                    type={smooth ? "monotone" : "linear"}
                    dataKey={String(field)}
                    name={meta[String(field)]?.alias || String(field)}
                    stroke={fillColor}
                    fill={
                      showArea
                        ? areaStyle?.fill || rechartsGradientUrl(gradientIdPrefix, 'area', colorIndex)
                        : 'transparent'
                    }
                    stackId={isStack ? "1" : undefined}
                    dot={showPoint ? { r: point?.size || 4 } : false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'column' || chartType === 'bar') {
      const isBar = chartType === 'bar';
      const useSqrtScale =
        barLengthAdjustmentOn && barDataAllowsSqrtScale(normalizedData, yFields.map(String));
      const valueAxisScale = useSqrtScale ? ('sqrt' as const) : undefined;
      const computedBarSize =
        typeof barSizePx === 'number' && barSizePx > 0
          ? barSizePx
          : undefined;
      const barGridHorizontal = !isBar && showValueAxisGridLines;
      const barGridVertical = isBar && showValueAxisGridLines;
      const showBarCartesian = showMainGrid && (barGridHorizontal || barGridVertical);

      const extent = getBarValueExtent(normalizedData, yFields.map(String), isStack);
      const rawValueSpan = extent.max - extent.min;

      const degenerateValueRange =
        !Number.isFinite(rawValueSpan) || rawValueSpan <= 0;
      const span = rawValueSpan || Math.max(Math.abs(extent.max), 1);
      const headroom = Math.max(span * 0.14, Math.abs(extent.max) * 0.08, 2);
      const paddedMax = extent.max + headroom;
      const paddedMin = extent.min >= 0 ? 0 : extent.min - Math.max(span * 0.06, 1);
      const valueDomainPadded: [number, number] | undefined = showBarNumberOn
        ? useSqrtScale
          ? [0, paddedMax]
          : [paddedMin, paddedMax]
        : undefined;

      const valueDomainWhenDegenerate: [number, number] | undefined =
        degenerateValueRange && !useSqrtScale
          ? extent.min >= 0
            ? [0, paddedMax]
            : [paddedMin, paddedMax]
          : undefined;

      const xAxisDomain = isBar
        ? showBarNumberOn
          ? valueDomainPadded
          : useSqrtScale
            ? ([0, 'dataMax'] as [number, string])
            : valueDomainWhenDegenerate
        : undefined;

      const yAxisDomain = isBar
        ? undefined
        : showBarNumberOn
          ? valueDomainPadded
          : useSqrtScale
            ? ([0, 'dataMax'] as [number, string])
            : valueDomainWhenDegenerate ??
              (['dataMin', 'dataMax'] as [string, string]);

      const categoryLabels = normalizedData.map((row) => String(row[xField] ?? ''));

      // Horizontal scroll (store view: many stores selected → one bar per store per day): each
      // x-category group keeps a fixed minimum width; past the container width the plot scrolls
      // with a swipe hint instead of squeezing. Off unless `scrollable` is set.
      const barScrollable = parseChartBool(scrollable, false);
      const scrollGroupPx =
        typeof scrollMinWidthPerGroup === 'number' && !Number.isNaN(scrollMinWidthPerGroup) && scrollMinWidthPerGroup > 0
          ? scrollMinWidthPerGroup
          : Math.max(56, Math.max(1, yFields.length) * 22);
      const barScrollMinWidth = normalizedData.length * scrollGroupPx;

      // Top summary strip (same cells/UI as overlapBar). With seriesField the pivot drops the raw
      // metric columns (sales_amt, smi_target, …) from the per-x rows, so sums run over the
      // PRE-PIVOT rows (chartData); without seriesField normalizedData matches overlapBar behavior.
      const barSummaryCells = buildOverlapSummaryCells(
        (_seriesField ? chartData : normalizedData) as Record<string, unknown>[],
        {
          cells: overlapSummary,
          valueKey: overlapValueKey,
          hideTargets: overlapHideTargets,
          language: cfgLanguage,
          formatValue: (v) => formatCompactCurrency(v, 'CNY'),
        },
      );

      // Two-line bar-top labels (value + YoY%) — only with a seriesField pivot + barCompField;
      // otherwise the single-line showBarNumber label is unchanged.
      const barCompLabelsOn = showBarNumberOn && !!_seriesField && !!barCompField;
      const barNumberFs =
        typeof barNumberFontSize === 'number' && !Number.isNaN(barNumberFontSize) && barNumberFontSize > 0
          ? barNumberFontSize
          : (yAxisFontSize ?? xAxisFontSize ?? 12);

      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          {overlapShowSummary !== false && barSummaryCells.length > 0 && (
            <OverlapSummaryStrip cells={barSummaryCells} defaultFontSize={overlapSummaryFontSize} />
          )}
          <BarChartAdaptiveContainer
            plotHeight={plotHeight}
            isBar={isBar}
            categoryLabels={categoryLabels}
            xAxisFontSize={xAxisFontSize}
            yAxisFontSize={yAxisFontSize}
            showBarNumberOn={showBarNumberOn}
            fill={fillCell}
          >
            {(axisLayout) => {
          const barChartElement = (
            <BarChart
              {...commonProps}
              layout={isBar ? 'vertical' : undefined}
              margin={axisLayout.margin}
            >
              <Customized
                component={ChartGradientDefs}
                gradientIdPrefix={gradientIdPrefix}
                chartColors={chartColors}
                variant={'bar' as const}
              />
              {showBarCartesian ? (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={barGridHorizontal}
                  vertical={barGridVertical}
                />
              ) : null}
              <XAxis 
                type={isBar ? "number" : "category"} 
                dataKey={isBar ? undefined : xField}
                tick={
                  !isBar
                    ? xAxisFontSize
                      ? { fontSize: xAxisFontSize, ...(axisLayout.xAngle ? { dy: axisLayout.xDy } : {}) }
                      : axisLayout.xAngle
                        ? { dy: axisLayout.xDy }
                        : undefined
                    : xAxisFontSize
                      ? { fontSize: xAxisFontSize }
                      : undefined
                }
                angle={!isBar ? axisLayout.xAngle : undefined}
                textAnchor={!isBar ? axisLayout.xTextAnchor : undefined}
                height={!isBar ? axisLayout.xHeight : undefined}
                interval={!isBar ? 0 : undefined}
                scale={isBar ? valueAxisScale : undefined}
                domain={xAxisDomain as [number, number] | [number, string] | undefined}
                tickFormatter={isBar && showMode === 'percentage' ? formatValueAxisTick : undefined}
              />
              <YAxis 
                type={isBar ? "category" : "number"} 
                dataKey={isBar ? xField : undefined}
                domain={yAxisDomain as [number, number] | [number, string] | [string, string] | undefined}
                allowDataOverflow={isBar ? undefined : false}
                width={isBar && axisLayout.yWidth > 0 ? axisLayout.yWidth : undefined}
                tick={
                  (
                    isBar && axisLayout.yTickAngle != null
                      ? {
                          fontSize: yAxisFontSize ?? 12,
                          angle: axisLayout.yTickAngle,
                          textAnchor: 'end' as const,
                          dx: -2,
                          dy: 4
                        }
                      : yAxisFontSize
                        ? { fontSize: yAxisFontSize }
                        : undefined
                  ) as never
                }
                scale={isBar ? undefined : valueAxisScale}
                tickFormatter={!isBar && showMode === 'percentage' ? formatValueAxisTick : undefined}
              />
              {showTooltip && (
                <Tooltip 
                  formatter={tooltip?.formatter || formatTooltipValue}
                  shared={tooltip?.shared}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
              {legendVisible && <Legend className="chart-legend" />}
              {yFields.map((field: string, index: number) => {
                const showLegacyTopLabel =
                  !showBarNumberOn &&
                  label &&
                  typeof label === 'object' &&
                  (label.type === 'outer' || (label as { position?: string }).position === 'top');

                const labelPosition =
                  label && typeof label === 'object'
                    ? ((label as { position?: string }).position === 'top' ? 'top' : 'middle')
                    : 'middle';

                const labelFormatter =
                  label && typeof label === 'object' && label.formatter
                    ? (value: any, _name: string, props: any) => {
                        const dataValue = value !== undefined ? value : props?.payload?.[String(field)];
                        return formatLabelValue(dataValue, String(field), label.formatter as string);
                      }
                    : undefined;

                const formatBarNumberText = (raw: unknown): string => {
                  const mf = meta[String(field)]?.formatter;
                  if (typeof mf === 'function') return String(mf(toNumber(raw)));
                  if (showMode === 'percentage') {
                    return `${formatNumericDisplayValue(raw)}%`;
                  }
                  return formatNumericDisplayValue(raw);
                };

                const barNumberLabelFormatter = (value: unknown, _name: string, props: any) => {
                  const v =
                    value !== undefined && value !== null ? value : props?.payload?.[String(field)];
                  return formatBarNumberText(v);
                };

                const barColor = chartColors[index % chartColors.length];
                const barColorIndex = index % chartColors.length;
                const barGradientFill = rechartsGradientUrl(gradientIdPrefix, 'bar', barColorIndex);

                // Two-line bar-top label: value (existing showBarNumber formatting) on top, YoY%
                // below (+x.x% green / −x.x% red, same colors as the overlapBar comp label).
                // recharts LabelList single text can't stack two lines → custom content renderer.
                const renderBarCompLabel = (labelProps: { x?: unknown; y?: unknown; value?: unknown; index?: unknown }): React.ReactNode => {
                  const { x, y, value, index: rowIndex } = labelProps;
                  if (typeof x !== 'number' || typeof y !== 'number') return null;
                  const row = typeof rowIndex === 'number'
                    ? (normalizedData as Record<string, unknown>[])[rowIndex]
                    : undefined;
                  const rawComp = barCompField ? row?.[`__comp__${String(field)}`] : undefined;
                  const comp = rawComp != null ? Number(rawComp) : NaN;
                  const hasComp = Number.isFinite(comp);
                  const compFs = Math.max(7, Math.round(barNumberFs * 0.8));
                  return (
                    <g>
                      <text x={x} y={hasComp ? y - compFs - 2 : y} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={barNumberFs} fontWeight={500}>
                        {formatBarNumberText(value)}
                      </text>
                      {hasComp && (
                        <text x={x} y={y - 1} textAnchor="middle" fill={comp >= 0 ? '#16a34a' : '#dc2626'} fontSize={compFs}>
                          {comp >= 0 ? '+' : ''}{comp.toFixed(1)}%
                        </text>
                      )}
                    </g>
                  );
                };

                const perCategoryColors = yFields.length === 1;
                return (
                  <Bar
                    key={String(field)}
                    dataKey={String(field)}
                    name={meta[String(field)]?.alias || String(field)}
                    fill={barGradientFill}
                    stackId={isStack ? "1" : undefined}
                    barSize={computedBarSize}
                    maxBarSize={32}
                    radius={isStack ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    activeBar={isDark ? {
                      fill: barGradientFill,
                      opacity: 0.9
                    } : undefined}
                  >
                    {perCategoryColors &&
                      normalizedData.map((_row, cellIndex) => (
                        <Cell
                          key={`bar-cell-${String(field)}-${cellIndex}`}
                          fill={rechartsGradientUrl(gradientIdPrefix, 'bar', cellIndex % chartColors.length)}
                        />
                      ))}
                  {showBarNumberOn && (
                    barCompLabelsOn ? (
                      <LabelList
                        dataKey={String(field)}
                        position={isBar ? 'right' : 'top'}
                        offset={isBar ? 6 : 4}
                        content={renderBarCompLabel}
                      />
                    ) : (
                    <LabelList
                      dataKey={String(field)}
                      position={isBar ? 'right' : 'top'}
                      offset={isBar ? 6 : 4}
                      formatter={barNumberLabelFormatter}
                      style={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: barNumberFs,
                        fontWeight: 500
                      }}
                    />
                    )
                  )}
                  {showLegacyTopLabel && (
                    <LabelList
                      dataKey={String(field)}
                      position={labelPosition}
                      style={typeof label === 'object' ? label.style : undefined}
                      formatter={labelFormatter}
                    />
                  )}
                  </Bar>
                );
              })}
            </BarChart>
          );
          return barScrollable ? (
            <HorizontalScrollChart
              minWidth={barScrollMinWidth}
              height={plotHeight}
              hint={i18n.t('renderers:chart.swipe_to_explore', '← Swipe to explore →')}
            >
              {barChartElement}
            </HorizontalScrollChart>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {barChartElement}
            </ResponsiveContainer>
          );
            }}
          </BarChartAdaptiveContainer>
        </div>
      );
    }

    if (chartType === 'pie') {

      const nameFieldForPie = colorField || xField;

      const valueFieldForPie = angleField || (Array.isArray(yField) ? yField[0] : yField);

      const pieData = chartData.map(item => {
        const name = item[nameFieldForPie];

        const rawValue = item[valueFieldForPie];
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
        return {
          name: name,
          value: value,
          percentage: item.percentage || ''
        };
      });

      const totalValue = pieData.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const pieDataWithPercentage = pieData.map(item => ({
        ...item,
        percentage: item.percentage || (totalValue > 0 ? ((Number(item.value) / totalValue) * 100).toFixed(1) + '%' : '0%')
      }));

      const validPieData = pieDataWithPercentage.filter(item => 
        item.name !== undefined && item.name !== null && 
        item.value !== undefined && item.value !== null
      );

      if (validPieData.length === 0) {
        console.warn('[ChartRenderer] 饼图没有有效数据:', {
          nameFieldForPie,
          valueFieldForPie,
          originalData: chartData.slice(0, 3)
        });
        return (
          <div className={cn('chart-empty text-center py-8 text-muted-foreground', fillCell && 'flex min-h-0 flex-1 flex-col items-center justify-center')}>
            <div className="text-4xl mb-2">🥧</div>
            <p className="text-sm">{t('chart.no_valid_data', 'No valid data')}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('chart.pie_field_hint', 'Please check field configuration: Name field={{nameField}}, Value field={{valueField}}', {
                nameField: nameFieldForPie,
                valueField: valueFieldForPie
              })}
            </p>
          </div>
        );
      }

      const labelConfig = typeof label === 'object' ? label : (label ? { type: 'outer' } : false);

      const outerRadiusValue = Math.min(plotHeight * 0.35, 120); 

      const innerRadiusRatio = innerRadius !== undefined ? innerRadius : 0;
      const innerRadiusValue = outerRadiusValue * innerRadiusRatio;

      const renderLabel = (entry: any) => {
        if (!labelConfig || typeof labelConfig !== 'object' || !('type' in labelConfig)) return null;
        const config = labelConfig as { type?: string; formatter?: string };
        if (config.type === 'spider') {
          const formatter = (config.formatter || '{name}\n{percentage}') as string;
          return formatter
            .replace(/{name}/g, entry.name)
            .replace(/{value}/g, entry.value)
            .replace(/{percentage}/g, entry.percentage || '');
        }
        if (config.type === 'inner') {
          const percent = (entry.value / validPieData.reduce((sum, d) => sum + Number(d.value), 0) * 100).toFixed(0);
          return `${percent}%`;
        }
        return `${entry.name}: ${entry.value}`;
      };

      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
            <PieChart>
              <Customized
                component={ChartGradientDefs}
                gradientIdPrefix={gradientIdPrefix}
                chartColors={chartColors}
                variant={'bar' as const}
              />
              <Pie
                data={validPieData}
                cx="50%"
                cy="50%"
                innerRadius={innerRadiusValue}
                outerRadius={outerRadiusValue}
                fill={rechartsGradientUrl(gradientIdPrefix, 'bar', 0)}
                dataKey="value"
                nameKey="name"
                label={labelConfig ? renderLabel : false}
                labelLine={labelConfig && typeof labelConfig === 'object' && labelConfig.type === 'spider'}
              >
                {validPieData.map((entry, index) => {
                  const entryColor = (entry as any).color;
                  const colorIndex = index % chartColors.length;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entryColor
                          ? entryColor
                          : rechartsGradientUrl(gradientIdPrefix, 'bar', colorIndex)
                      } 
                    />
                  );
                })}
              </Pie>
              {legendVisible && <Legend className="chart-legend" />}
              {showTooltip && (
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    const entry = validPieData.find(d => d.name === name);
                    return [`${value} (${entry?.percentage || ''})`, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'radar') {
      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
            <RadarChart outerRadius={90} data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xField} />
              <PolarRadiusAxis />
              {yFields.map((field, index) => (
                <Radar
                  key={field}
                  name={meta[field]?.alias || field}
                  dataKey={field}
                  stroke={chartColors[index % chartColors.length]}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.2}
                />
              ))}
              {legendVisible && <Legend className="chart-legend" />}
              {showTooltip && (
                <Tooltip 
                  formatter={tooltip?.formatter || formatTooltipValue}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'heatmap') {

      const heatmapColors = Array.isArray(color) ? color : 
        (color ? [color] : chartColors.length >= 5 ? chartColors.slice(0, 5) : ['#FFE6E6', '#FF9999', '#FF6666', '#FF3333', '#FF0000']);

      const yFieldStr = Array.isArray(yField) ? yField[0] : yField;

      const xValues = Array.from(new Set(chartData.map((item) => item[xField]))).map(String);
      const yValues = Array.from(new Set(chartData.map((item) => item[yFieldStr]))).map(String);

      const valueField = colorField || yFieldStr;

      const heatmapData = yValues.map(yVal => {
        const row: any = { [yFieldStr]: yVal };
        xValues.forEach(xVal => {
          const cell = chartData.find(
            item => item[xField] === xVal && item[yFieldStr] === yVal
          );
          row[xVal] = cell ? (cell[valueField] || 0) : 0;
        });
        return row;
      });

      const allValues = chartData.map(item => {
        const val = item[valueField];
        return typeof val === 'number' ? val : 0;
      }).filter(v => v !== 0);
      const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
      const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
      const valueRange = maxValue - minValue || 1;

      const getColor = (value: number) => {
        if (value === 0) return '#f0f0f0';
        const ratio = (value - minValue) / valueRange;
        const colorIndex = Math.floor(ratio * (heatmapColors.length - 1));
        return heatmapColors[Math.min(colorIndex, heatmapColors.length - 1)];
      };

      return (
        <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
          <ResponsiveContainer width="100%" height={plotAreaHeight} className={plotAreaClassName}>
            <BarChart data={heatmapData} layout="vertical">
              {showMainGrid ? <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /> : null}
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey={yFieldStr}
                width={80}
              />
              {showTooltip && (
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    const xVal = name;
                    const entry = heatmapData.find(item => item[yFieldStr] === name);
                    return [
                      `${xVal}: ${value}`,
                      entry ? entry[yFieldStr] : yFieldStr
                    ];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--foreground))',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{
                    color: 'hsl(var(--foreground))',
                  }}
                />
              )}
              {xValues.map((xVal) => (
                <Bar
                  key={xVal}
                  dataKey={xVal}
                  stackId="heatmap"
                  fill={heatmapColors[0]}
                >
                  {heatmapData.map((entry, entryIndex) => {
                    const value = entry[xVal] || 0;
                    return (
                      <Cell 
                        key={`cell-${entryIndex}`} 
                        fill={getColor(value)}
                      />
                    );
                  })}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  const hasLineAdditionalStats =
    chartType === 'line' && Array.isArray(additionalStats) && additionalStats.length > 0;
  // overlapBar summary visibility — config-only (not data-dependent); renderer and skeleton share the same signal for consistent height.
  const showOverlapSummary =
    chartType === 'overlapBar' && overlapShowSummary !== false && Array.isArray(overlapSummary) && overlapSummary.length > 0;
  // overlapBar outer horizontal padding: overlapSideMargin overrides default px-3 (0 = flush to prototype edge).
  const overlapContentPadX = chartType === 'overlapBar' && overlapSideMargin != null ? overlapSideMargin : undefined;
  const isCompactLayoutChart =
    chartType === 'column' || chartType === 'bar' || chartType === 'line' || chartType === 'area' || chartType === 'overlapBar';

  // In bare mode (no card chrome) the chart usually sits inside an outer card (e.g. a Tabs panel),
  // so suppress the otherwise-empty header to avoid a dead gap above the plot.
  const showHeader = showCardChrome || Boolean(title) || showDataViewEnabled;

  const headerEl = (
    <CardHeader
      className={cn(
        'chart-header shrink-0 flex flex-row items-center justify-between gap-2 space-y-0 pb-2',
        isCompactLayoutChart && '!pt-2 !pb-1 !px-4'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CardTitle
          className="chart-title min-w-0 truncate"
          style={titleFontSize ? { fontSize: `${titleFontSize}px` } : undefined}
        >
          {title}
        </CardTitle>
      </div>
      <div className="chart-toolbar flex min-h-[32px] shrink-0 items-center gap-2">
        {showDataViewEnabled ? (
          <ViewToggleButton
            viewType={viewType}
            onToggle={() => setViewType(viewType === 'chart' ? 'data' : 'chart')}
          />
        ) : null}
      </div>
    </CardHeader>
  );

  const contentEl = (
    <CardContent
      className={cn(
        'chart-content relative flex min-h-0 flex-1 flex-col',
        isCompactLayoutChart && 'px-3 pb-2 pt-0',
        hasLineAdditionalStats && 'chart-line-stats-unified'
      )}
      style={overlapContentPadX != null ? { paddingLeft: overlapContentPadX, paddingRight: overlapContentPadX } : undefined}
    >
      {}
      {isLoading && chartData.length > 0 && (
        <div className={`absolute right-3 top-3 ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      )}
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {databaseError ? (
          <div
            className={cn('chart-error flex items-center justify-center', fillCell ? 'min-h-0 flex-1' : 'shrink-0')}
            style={fillCell ? undefined : { height: `${plotHeight}px` }}
          >
            <div className="text-center text-status-error">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm">{t('chart.error', 'Data load failed')}: {databaseError}</p>
            </div>
          </div>
        ) : isLoading && chartData.length === 0 ? (
          showOverlapSummary ? (
            <div className={cn('flex w-full flex-col', fillCell && 'min-h-0 flex-1')}>
              <OverlapSummaryBarSkeleton cells={overlapSummary?.length ?? 0} overlapSideMargin={overlapSideMargin} />
              <ChartAreaSkeleton height={plotHeight} chartType={chartType} className={fillCell ? 'flex min-h-0 flex-1 flex-col justify-center' : undefined} />
            </div>
          ) : (
            <ChartAreaSkeleton height={plotHeight} chartType={chartType} className={fillCell ? 'flex min-h-0 flex-1 flex-col justify-center' : undefined} />
          )
        ) : (
          renderChart()
        )}
      </div>
    </CardContent>
  );

  // Without card chrome: a plain div (no border/shadow/bg/rounded that <Card> adds), so the chart
  // doesn't draw a redundant nested border when it lives inside an outer card.
  if (!showCardChrome) {
    return (
      <div
        className={cn(
          'chart-renderer flex flex-col',
          isCompactLayoutChart && 'chart-bar-compact',
          hasLineAdditionalStats && 'chart-has-additional-stats',
          customStyleProps.className
        )}
        style={cardStyle}
      >
        {showHeader ? headerEl : null}
        {contentEl}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'chart-renderer flex flex-col dark:bg-card dark:border-border',
        isCompactLayoutChart && 'chart-bar-compact',
        hasLineAdditionalStats && 'chart-has-additional-stats',
        customStyleProps.className
      )}
      style={cardStyle}
    >
      {headerEl}
      {contentEl}
    </Card>
  );
};

export default ChartRenderer; 