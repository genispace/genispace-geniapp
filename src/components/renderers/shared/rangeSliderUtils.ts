/**
 * Pure logic for the range ruler — task #289 / req-1109 #22.
 * 13 ticks: '<0' (returns / unbounded low end), 0, 1…10, '>10' (unbounded high end).
 * Pure-function module with no React dependency, shared by the ProductReport quick filter and the
 * FilterPanel rangeSlider control; the workbench preview copy must stay line-identical (parity).
 */

/** Ticks: sentinel labels at both ends, numeric 0..10 in between */
export const DEFAULT_RANGE_TICKS: readonly string[] = [
  '<0', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '>10',
];

export interface RangeValue {
  min: number | null;
  max: number | null;
}

export interface TickSnap {
  /** Tick index the thumb snaps to (0..ticks.length-1) */
  index: number;
  /** Whether the value overflows the scale (typed exact value <0 or >10 → end tick + highlight) */
  overflow: boolean;
}

/** Value → tick snap. null (unbounded) rests at the end tick without highlight; overflowing exact
 * values snap to the end tick with highlight. */
export function valueToTickSnap(value: number | null, side: 'min' | 'max', ticks: readonly string[] = DEFAULT_RANGE_TICKS): TickSnap {
  const last = ticks.length - 1;
  if (value == null || Number.isNaN(value)) return { index: side === 'min' ? 0 : last, overflow: false };
  if (value < 0) return { index: 0, overflow: side === 'min' };
  const numericTicks = ticks.slice(1, -1).map(Number); // 0..10
  const maxTick = numericTicks[numericTicks.length - 1];
  if (value > maxTick) return { index: last, overflow: side === 'max' };
  // Middle ticks: nearest snap (typed 2.4 → 2)
  const rounded = Math.round(value);
  const clamped = Math.max(numericTicks[0], Math.min(maxTick, rounded));
  return { index: 1 + numericTicks.indexOf(clamped), overflow: false };
}

/** Tick index → value. The '<0' tick on the min side = unbounded low end (null); the '>10' tick on
 * the max side = unbounded high end (null). */
export function tickIndexToValue(index: number, side: 'min' | 'max', ticks: readonly string[] = DEFAULT_RANGE_TICKS): number | null {
  const last = ticks.length - 1;
  if (index <= 0) return side === 'min' ? null : Number(ticks[1]) - 1; // max dragged to '<0': equals -1 (returns only; defensive path)
  if (index >= last) return side === 'max' ? null : Number(ticks[last - 1]) + 1; // min dragged to '>10': starts above 10 (defensive path)
  return Number(ticks[index]);
}

/** Input parse: '' → null (unbounded, shows the "Any" placeholder); valid number → number;
 * invalid → undefined (ignored) */
export function parseRangeInput(text: string): number | null | undefined {
  const s = text.trim().replace(/−/g, '-'); // tolerate full-width / demo minus signs
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function isRangeEmpty(v: RangeValue): boolean {
  return v.min == null && v.max == null;
}

/** Normalize before applying: swap when min > max (typed-crossover guard) */
export function normalizeRange(v: RangeValue): RangeValue {
  if (v.min != null && v.max != null && v.min > v.max) return { min: v.max, max: v.min };
  return v;
}

export interface RangeTextOptions {
  /** Metric name (e.g. Qty) */
  metricLabel: string;
  /** Unit (e.g. pcs); omitted when empty */
  unit?: string;
  /** Note for an exact value of 0 (e.g. "(no sales)"); omit when not needed */
  zeroNote?: string;
}

/** Condition-line text (ruler-val above the ruler): four shapes — range / single-bound / exact */
export function buildRangeConditionText(v: RangeValue, opts: RangeTextOptions): string {
  const unit = opts.unit ?? '';
  const u = unit ? ` ${unit}` : '';
  const m = opts.metricLabel;
  if (v.min != null && v.max != null) {
    if (v.min === v.max) {
      const note = v.min === 0 && opts.zeroNote ? opts.zeroNote : '';
      return `${m} = ${v.min}${u}${note}`;
    }
    return `${v.min} ≤ ${m} ≤ ${v.max}${u}`;
  }
  if (v.max != null) return `${m} ≤ ${v.max}${u}`;
  if (v.min != null) return `${m} ≥ ${v.min}${u}`;
  return `${m}${u}`;
}

/** Chip text (active condition after applying, e.g. "Qty≤1" / "Qty≥3" / "Qty=0" / "Qty0~5") */
export function buildRangeChipText(v: RangeValue, opts: RangeTextOptions): string {
  const m = opts.metricLabel;
  if (v.min != null && v.max != null) {
    if (v.min === v.max) return `${m}=${v.min}`;
    return `${m}${v.min}~${v.max}`;
  }
  if (v.max != null) return `${m}≤${v.max}`;
  if (v.min != null) return `${m}≥${v.min}`;
  return m;
}

/** RangeValue → datasource params (empty string = unbounded; numbers are sent as strings, the SQL
 * side treats them via NULLIF({{qtyMin}},'')) */
export function rangeToParams(v: RangeValue, minKey = 'qtyMin', maxKey = 'qtyMax'): Record<string, string> {
  return {
    [minKey]: v.min == null ? '' : String(v.min),
    [maxKey]: v.max == null ? '' : String(v.max),
  };
}
