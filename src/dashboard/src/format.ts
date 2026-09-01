import { formatBusinessNumber } from '@genispace/geniapp/hooks';
/** Numeric/format helpers shared by dashboard widgets. */

export function finiteNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Compact count: 31,204 → "31.2K", 980 → "980". */
export function fmtCount(v: unknown): string {
  const x = finiteNum(v) ?? 0;
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(x / 1000).toFixed(x % 1000 === 0 ? 0 : 1)}K`;
  return formatBusinessNumber(Math.round(x));
}

/** Compact money: 2_400_000 → "¥2.4M", 186_000 → "¥186K". */
export function fmtMoney(v: unknown, currency = '¥'): string {
  const x = finiteNum(v) ?? 0;
  const sign = x < 0 ? '-' : '';
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${currency}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${currency}${abs.toFixed(0)}`;
}

/** Signed percent for a fraction (0.123 → "+12.3%"). null → em dash. */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(digits)}%`;
}

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface Delta {
  /** Fractional change vs base (0.12 = +12%); null when base is 0 and not computable. */
  pct: number | null;
  direction: DeltaDirection;
}

/** Period-over-period delta. base=0 with positive current → direction up, pct null (n/a). */
export function computeDelta(current: unknown, base: unknown): Delta {
  const c = finiteNum(current) ?? 0;
  const b = finiteNum(base) ?? 0;
  if (b === 0) {
    return { pct: c === 0 ? 0 : null, direction: c > 0 ? 'up' : c < 0 ? 'down' : 'flat' };
  }
  const pct = (c - b) / Math.abs(b);
  return { pct, direction: pct > 0.0001 ? 'up' : pct < -0.0001 ? 'down' : 'flat' };
}
