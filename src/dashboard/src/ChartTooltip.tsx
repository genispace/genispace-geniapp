import type { ReactNode } from 'react';
import { CHART_COLORS } from './chart';

interface TooltipEntry {
  name?: ReactNode;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  /** Injected by recharts when used as `<Tooltip content={<ChartTooltip … />} />`. */
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ReactNode;
  /** Format the header label (e.g. a date bucket). */
  labelFormatter?: (label: unknown) => ReactNode;
  /** Format each series value; receives the raw value and series name. */
  formatter?: (value: number | string, name: string) => ReactNode;
}

/**
 * Themed recharts tooltip — replaces recharts' default bare white box with a
 * rounded, elevated popover that follows the design tokens (bg-popover, border,
 * shadow, muted labels, per-series color dots). Pass as
 * `<Tooltip content={<ChartTooltip formatter={…} />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.25 }} />`.
 */
export function ChartTooltip({ active, payload, label, labelFormatter, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[8rem] rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {label != null && label !== '' ? (
        <div className="mb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : (label as ReactNode)}
        </div>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${String(entry.dataKey ?? i)}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {formatter && entry.value != null
                ? formatter(entry.value, String(entry.name ?? ''))
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Vertical fade `<defs>` for area/bar fills — one linear gradient per palette
 * color (top → bottom, opacity 0.35 → 0.02). Drop `<ChartGradients />` as the
 * first child of a recharts chart, then fill a series with
 * `fill={chartGradientRef(seriesIndex)}` for a modern soft-fill look instead of
 * a flat block of color.
 */
export function ChartGradients({ colors = CHART_COLORS }: { colors?: readonly string[] }) {
  return (
    <defs>
      {colors.map((c, i) => (
        <linearGradient key={i} id={`chartGrad${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.35} />
          <stop offset="100%" stopColor={c} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  );
}

/** `url(#…)` reference to the gradient for palette color `i` (see {@link ChartGradients}). */
export function chartGradientRef(i: number): string {
  const idx = ((i % CHART_COLORS.length) + CHART_COLORS.length) % CHART_COLORS.length;
  return `url(#chartGrad${idx})`;
}
