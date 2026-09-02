import * as echarts from 'echarts';
import {
  getLineAreaGradientStops,
  getTopToBottomGradientStops
} from '@/utils/chartGradientStops';

export const DEFAULT_GAUGE_TRACK_BASE = '#94a3b8';

export const HORIZONTAL_BAR_LABEL_POSITION_MAP: Record<
  string,
  'right' | 'insideLeft' | 'inside' | 'insideRight'
> = {
  follow: 'right',
  insideLeft: 'insideLeft',
  inside: 'inside',
  insideRight: 'insideRight'
};

export const VERTICAL_BAR_LABEL_POSITION_MAP: Record<
  string,
  'top' | 'insideBottom' | 'inside' | 'insideTop'
> = {
  follow: 'top',
  insideLeft: 'insideBottom',
  inside: 'inside',
  insideRight: 'insideTop'
};

export const HORIZONTAL_BAR_LABEL_USE_CHART_FG_BELOW_FILL_RATIO = 0.58;
export const HORIZONTAL_BAR_LABEL_CONTRAST_ON_LONG_OUTSIDE_FILL_RATIO = 0.88;

export function parseEchartsBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return defaultValue;
}

export function parseCssColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color || typeof color !== 'string') return null;
  const c = color.trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) {
      h = h
        .split('')
        .map(ch => ch + ch)
        .join('');
    }
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].every(n => !Number.isNaN(n))) return { r, g, b };
    }
  }
  const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(c);
  if (rgbMatch) {
    const r = Math.round(Number(rgbMatch[1]));
    const g = Math.round(Number(rgbMatch[2]));
    const b = Math.round(Number(rgbMatch[3]));
    if ([r, g, b].every(n => Number.isFinite(n) && n >= 0 && n <= 255)) return { r, g, b };
  }
  return null;
}

export function relativeLuminance255(r: number, g: number, b: number): number {
  const lin = (x: number) => {
    const v = x / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function pickContrastTextOnBarFill(backgroundCssColor: string): string {
  const rgb = parseCssColorToRgb(backgroundCssColor);
  if (!rgb) return '#1a1a1a';
  const L = relativeLuminance255(rgb.r, rgb.g, rgb.b);
  return L > 0.48 ? '#1a1a1a' : '#ffffff';
}

export function isColorTooDarkForDarkMode(color: string): boolean {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return false;
  return relativeLuminance255(rgb.r, rgb.g, rgb.b) < 0.15;
}

export function resolveGaugeColorWithDarkModeSafe(
  userColor: string | undefined,
  fallbackColor: string,
  themedForeground: string,
  isDarkMode: boolean
): string {
  if (!userColor || !userColor.trim()) return fallbackColor;
  if (!isDarkMode) return userColor.trim();
  return isColorTooDarkForDarkMode(userColor) ? themedForeground : userColor.trim();
}

export function colorToRgba(color: string, alpha: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) {
    return `rgba(59,130,246,${alpha})`;
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function lightenColor(color: string, ratio: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return color;
  const r = Math.round(rgb.r + (255 - rgb.r) * ratio);
  const g = Math.round(rgb.g + (255 - rgb.g) * ratio);
  const b = Math.round(rgb.b + (255 - rgb.b) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function darkenColor(color: string, ratio: number): string {
  const rgb = parseCssColorToRgb(color);
  if (!rgb) return color;
  const r = Math.round(rgb.r * (1 - ratio));
  const g = Math.round(rgb.g * (1 - ratio));
  const b = Math.round(rgb.b * (1 - ratio));
  return `rgb(${r},${g},${b})`;
}

export type { GradientStop } from '@/utils/chartGradientStops';
export {
  getTopToBottomGradientStops,
  getLineAreaGradientStops
} from '@/utils/chartGradientStops';

export function buildTopToBottomGradientColor(color: string): unknown {
  const stops = getTopToBottomGradientStops(color);
  return new echarts.graphic.LinearGradient(
    0,
    0,
    0,
    1,
    stops.map((stop) => ({
      offset: parseFloat(stop.offset) / 100,
      color: stop.color
    })),
    false
  );
}

export function rgbTripletToCss(rgb: { r: number; g: number; b: number }): string {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

export function toRgbTripletString(color: string, fallback: string): string {
  const rgb = parseCssColorToRgb(color.trim()) ?? parseCssColorToRgb(fallback);
  if (!rgb) return 'rgb(148,163,184)';
  return rgbTripletToCss(rgb);
}

export function rgbDistanceSquared(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

export function ensureGaugeTrackBaseDistinct(trackBaseRgb: string, progressBase: string): string {
  const tRgb = parseCssColorToRgb(trackBaseRgb);
  const pRgb = parseCssColorToRgb(progressBase);
  if (!tRgb || !pRgb) return trackBaseRgb;
  if (rgbDistanceSquared(tRgb, pRgb) >= 2800) return trackBaseRgb;
  const mix = 0.5;
  const nr = Math.round(tRgb.r * (1 - mix) + 148 * mix);
  const ng = Math.round(tRgb.g * (1 - mix) + 163 * mix);
  const nb = Math.round(tRgb.b * (1 - mix) + 184 * mix);
  return rgbTripletToCss({ r: nr, g: ng, b: nb });
}

export function buildGaugeTrackGradient(baseColor: string): unknown {
  const base = toRgbTripletString(baseColor, DEFAULT_GAUGE_TRACK_BASE);
  return new echarts.graphic.LinearGradient(
    0,
    0,
    0,
    1,
    [
      { offset: 0, color: colorToRgba(lightenColor(base, 0.42), 0.3) },
      { offset: 0.18, color: colorToRgba(lightenColor(base, 0.16), 0.24) },
      { offset: 0.62, color: colorToRgba(base, 0.22) },
      { offset: 1, color: colorToRgba(darkenColor(base, 0.14), 0.17) }
    ],
    false
  );
}

export function ensureSolidGaugeTrackDistinct(trackCss: string, progressBase: string): string {
  const tRgb = parseCssColorToRgb(trackCss);
  const pRgb = parseCssColorToRgb(progressBase);
  if (!tRgb || !pRgb) return trackCss;
  if (rgbDistanceSquared(tRgb, pRgb) >= 2800) return trackCss;
  const mix = 0.45;
  const nr = Math.round(tRgb.r * (1 - mix) + 148 * mix);
  const ng = Math.round(tRgb.g * (1 - mix) + 163 * mix);
  const nb = Math.round(tRgb.b * (1 - mix) + 184 * mix);
  return rgbTripletToCss({ r: nr, g: ng, b: nb });
}

export function buildLineAreaGradient(color: string): { color: unknown } {
  const stops = getLineAreaGradientStops(color);
  return {
    color: new echarts.graphic.LinearGradient(
      0,
      0,
      0,
      1,
      stops.map((stop) => ({
        offset: parseFloat(stop.offset) / 100,
        color: stop.color
      })),
      false
    )
  };
}

export function coerceGaugeFontWeight(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(900, Math.max(100, Math.round(n)));
}

export function formatGaugeSeriesOffsetAxis(
  value: number | string | undefined,
  axis: 'x' | 'y',
  defaults: { x: number | string; y: string }
): number | string {
  if (value === undefined || value === '') {
    return axis === 'x' ? defaults.x : defaults.y;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return axis === 'x' ? defaults.x : defaults.y;
    }
    if (axis === 'x' && value === 0) return 0;
    return `${value}%`;
  }
  const s = String(value).trim();
  if (s.includes('%')) return s;
  return `${s}%`;
}

export function computePieOutsideLabelLiftDy(params: {
  labelRect: { x: number; y: number; width: number; height: number };
  labelLinePoints?: number[][];
}): number {
  const pts = params.labelLinePoints;
  if (!pts || pts.length < 2) return 0;
  // ECharts labelLine points run from pie edge → bend → outer end (near label)
  const end = pts[pts.length - 1];
  if (!end || end.length < 2) return 0;

  // Vertically center the label block on the horizontal extension line
  const labelCenterY = params.labelRect.y + params.labelRect.height / 2;
  const lineY = end[1];
  if (!Number.isFinite(labelCenterY) || !Number.isFinite(lineY)) return 0;
  return lineY - labelCenterY;
}
