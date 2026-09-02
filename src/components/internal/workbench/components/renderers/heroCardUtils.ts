import { currencySymbol } from '@/utils/currencySymbol';

export type HeroCardTheme =
  | 'primary'
  | 'success'
  | 'info'
  | 'warning'
  | 'destructive'
  | 'muted';


export type HeroRowFormat =
  | 'raw' | 'number' | 'percent' | 'currency' | 'currency-compact' | 'compact-k' | 'wan';


export interface HeroKpiItem {
  label: string;
  field: string;
  lyField?: string;
  diff?: 'absolute' | 'pp' | 'percent';
  format?: HeroRowFormat;
  /** Fixed currency for this item's symbol (e.g. 'CNY' for CNY-based stats on a local-currency card); defaults to row.currency. */
  currency?: string;
}

export type HeroRow =
  | { type: 'text'; text?: unknown; field?: string; format?: HeroRowFormat; size?: 'xs' | 'sm' | 'base'; muted?: boolean }
  | { type: 'metric'; field: string; format?: HeroRowFormat; prefix?: string; suffix?: string; label?: string; lyField?: string; lyLabel?: string; lyFormat?: HeroRowFormat; currency?: string; /** Render LY inline in parens on the same line as the value (e.g. Y3.6K (LY Y323.1K)) instead of below it. */ lyInline?: boolean; /** Shrink the row's font sizes so value + inline LY always fit on ONE line (replaces the narrow-flow wrap point). */ autoFit?: boolean }
  | { type: 'trend-badges'; items: Array<{ label: string; field: string; suffix?: string }>; /** Shrink the strip's font sizes so all badges stay on ONE line (replaces the narrow-flow flex-wrap). */ autoFit?: boolean }
  | { type: 'key-value'; label: string; field: string; format?: HeroRowFormat; prefix?: string; suffix?: string; signedColor?: boolean; signed?: boolean; currency?: string; /** Shrink the row's font sizes so label + value always fit on ONE line. */ autoFit?: boolean }
  // Two metrics on one row: `label label2 value1 value2` — e.g. Target Gap Y204.6K -Y200.9K. value2 can be
  // signed (explicit +) and signed-colored (green/red). Merges what used to be two key-value rows onto one line.
  | { type: 'dual-key-value'; label: unknown; label2: unknown; field: string; field2: string; format?: HeroRowFormat; format2?: HeroRowFormat; currency?: string; signed2?: boolean; signedColor2?: boolean; /** Shrink the row's font sizes so all parts always fit on ONE line. */ autoFit?: boolean }
  | { type: 'progress'; field: string; max?: number }
  // valueAlign 'left': value follows its label with a uniform fixed gap (per-column max-content label
  // tracks keep values aligned) instead of being pushed to the far edge (dashboard acceptance 0714_2 #7).
  | { type: 'kpi-list'; columns?: 1 | 2; items: HeroKpiItem[]; valueAlign?: 'left' | 'right'; /** Shrink each item row's font sizes so label + value + delta always fit on ONE line. */ autoFit?: boolean }
  
  | { type: 'title-bar'; titleField: string; statusField?: string; statusMap?: Record<string, { label?: unknown; class?: string }> }
  | { type: 'price-row'; retailLabel?: unknown; retailField: string; sellingLabel?: unknown; sellingField: string; discountField?: string; discountThreshold?: number; discountOff?: boolean; discountLabel?: unknown; discountTextField?: string; currencyField?: string }
  | { type: 'divider' }
  | { type: 'spacer'; size?: number };


export interface HeroBanner {
  imageField?: string;                       
  colorField?: string;                       
  colorMap?: Record<string, string>;         
  emojiField?: string;                        
  emojiMap?: Record<string, string>;         
  fallbackColor?: string;
  fallbackEmoji?: string;
  height?: number;
  imageFit?: 'cover' | 'contain';            // how the image fills the banner; product cutouts default to 'contain'
  imageBg?: string;                          // letterbox background when imageFit='contain' (defaults to white)
}


export const HERO_GRADIENT_PRESETS: Record<string, { from: string; to: string }> = {
  'indigo-violet': { from: '#6366f1', to: '#6d28d9' },
  'purple-pink': { from: '#a855f7', to: '#be185d' },
  'sky-blue': { from: '#0ea5e9', to: '#1d4ed8' },
};

export interface HeroCardProps {
  className?: string;
  rows?: HeroRow[];
  /** Editor quick preset (on selection, prefer writing concrete gradientFrom/To values directly; lowest priority in the render fallback order). */
  gradientPreset?: string;
  /** Static gradient colors (concrete values set explicitly in the page config). */
  gradientFrom?: string;
  gradientTo?: string;
  /** Gradient column bindings: colors read from row data (values supplied by the datasource; highest priority — audit decision §2.4). */
  gradientFromField?: string;
  gradientToField?: string;
  cardWidth?: number | 'full';
  shell?: 'gradient' | 'muted' | 'detail';
  banner?: HeroBanner;
  /** Render ONE card per datasource row (N rows -> N sibling cards) instead of only row[0].
   *  Each card uses the exact same single-card markup; per-row titles come from row-bound
   *  rows (e.g. title-bar's titleField). False = original single-card behavior. */
  cardPerRow?: boolean;
  // ── Per-role font sizes (px). Unset = readable defaults (title 18 / value 26 / label 13 / number 14 / badge 13). ──
  titleFontSize?: number;
  valueFontSize?: number;
  labelFontSize?: number;
  numberFontSize?: number;
  badgeFontSize?: number;
}


export function formatCompactCurrency(raw: unknown, currency?: unknown): string {
  // NULL/empty must render '—', not '¥0' (Number(null) === 0 would slip past the finite check).
  if (raw === undefined || raw === null || raw === '') return '—';
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return '—';
  // Currency prefix = the currency code mapped to a symbol via the single site-wide mapping table (CNY->Y, HKD->HK$, see utils/currencySymbol);
  // unknown/missing codes pass through as-is so errors stay visible (decided 2026-07-08).
  const sym = currencySymbol(currency);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}


export function formatCompactK(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return '—';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}


// Always-K currency with thousand separators (dashboard acceptance 0709 #4): unify the sales-detail magnitude to
// K (never M) so the column doesn't mix Y1.13M / Y584.8K. Divides by 1e3, keeps <=1 decimal, strips a
// trailing .0, and adds thousand separators on the integer part — e.g. 1,130,000 -> Y1,130K, 584,800 -> Y584.8K.
export function formatCurrencyK(raw: unknown, currency?: unknown): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return '—';
  const sym = currencySymbol(currency);
  const sign = num < 0 ? '-' : '';
  const k = Math.abs(num) / 1e3;
  const str = k.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${sign}${sym}${str}K`;
}


export function formatHeroRowValue(raw: unknown, format?: HeroRowFormat, currency?: unknown, prefix = '', suffix = ''): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  switch (format) {
    case 'currency-compact': return formatCompactCurrency(raw, currency);
    case 'compact-k': return formatCompactK(raw);
    case 'percent': { const n = Number(raw); return Number.isFinite(n) ? `${prefix}${n.toFixed(1)}${suffix || '%'}` : '—'; }
    case 'currency': { const n = Number(raw); return Number.isFinite(n) ? `${prefix || currencySymbol(currency)}${n.toLocaleString()}${suffix}` : '—'; }
    case 'number': { const n = Number(raw); return Number.isFinite(n) ? `${prefix}${n.toLocaleString()}${suffix}` : '—'; }
    case 'wan': { const n = Number(raw); return Number.isFinite(n) ? `${prefix || currencySymbol(currency)}${(n / 10000).toFixed(1)}${suffix || 'w'}` : '—'; }
    default: return `${prefix}${String(raw)}${suffix}`;
  }
}

export interface HeroCardAppearance {
  containerClass: string;
  containerStyle?: { background?: string };
  mutedTextClass: string;
  strongTextClass: string;
  badgeClass: string;
  trendClass: string;
  progressBarColor: string;
  progressTrackColor?: string;
}

const LEGACY_THEME_MAP: Record<string, HeroCardTheme> = {
  purple: 'primary',
  pink: 'primary',
  indigo: 'primary',
  green: 'success',
  'rose-orange': 'warning',
};

const HERO_CARD_THEMES: Record<HeroCardTheme, HeroCardAppearance> = {
  primary: {
    containerClass: 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-sm',
    mutedTextClass: 'text-primary-foreground/75',
    strongTextClass: 'text-primary-foreground',
    badgeClass: 'bg-primary-foreground/20 text-primary-foreground',
    trendClass: 'bg-primary-foreground/20 text-primary-foreground',
    progressBarColor: 'hsl(var(--primary-foreground))',
    progressTrackColor: 'hsla(var(--primary-foreground) / 0.25)',
  },
  success: {
    containerClass:
      'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-sm dark:from-green-600/90 dark:to-green-700/90',
    mutedTextClass: 'text-white/80',
    strongTextClass: 'text-white',
    badgeClass: 'bg-white/20 text-white',
    trendClass: 'bg-white/20 text-white',
    progressBarColor: '#ffffff',
    progressTrackColor: 'rgba(255,255,255,0.25)',
  },
  info: {
    containerClass:
      'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm dark:from-blue-600/90 dark:to-blue-700/90',
    mutedTextClass: 'text-white/80',
    strongTextClass: 'text-white',
    badgeClass: 'bg-white/20 text-white',
    trendClass: 'bg-white/20 text-white',
    progressBarColor: '#ffffff',
    progressTrackColor: 'rgba(255,255,255,0.25)',
  },
  warning: {
    containerClass:
      'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm dark:from-amber-500/90 dark:to-orange-600/90',
    mutedTextClass: 'text-white/80',
    strongTextClass: 'text-white',
    badgeClass: 'bg-white/20 text-white',
    trendClass: 'bg-white/20 text-white',
    progressBarColor: '#ffffff',
    progressTrackColor: 'rgba(255,255,255,0.25)',
  },
  destructive: {
    containerClass:
      'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm dark:from-red-600/90 dark:to-red-700/90',
    mutedTextClass: 'text-white/80',
    strongTextClass: 'text-white',
    badgeClass: 'bg-white/20 text-white',
    trendClass: 'bg-white/20 text-white',
    progressBarColor: '#ffffff',
    progressTrackColor: 'rgba(255,255,255,0.25)',
  },
  muted: {
    containerClass: 'bg-card border border-border text-card-foreground shadow-sm',
    mutedTextClass: 'text-muted-foreground',
    strongTextClass: 'text-foreground',
    badgeClass: 'bg-muted text-muted-foreground',
    trendClass: 'bg-muted text-muted-foreground',
    progressBarColor: 'primary',
    progressTrackColor: undefined,
  },
};


export const HERO_DETAIL_APPEARANCE: HeroCardAppearance = {
  containerClass: 'bg-white border border-slate-100 shadow-sm dark:bg-neutral-900 dark:border-neutral-800',
  mutedTextClass: 'text-slate-400',
  strongTextClass: 'text-slate-900 dark:text-slate-100',
  badgeClass: 'bg-slate-100 text-slate-500',
  trendClass: 'bg-slate-100 text-slate-500',
  progressBarColor: 'hsl(var(--primary))',
  progressTrackColor: undefined,
};

const CUSTOM_GRADIENT_APPEARANCE: HeroCardAppearance = {
  containerClass: 'text-white shadow-sm',
  mutedTextClass: 'text-white/75',
  strongTextClass: 'text-white',
  badgeClass: 'bg-white/20 text-white',
  trendClass: 'bg-white/20 text-white',
  progressBarColor: '#ffffff',
  progressTrackColor: 'rgba(255,255,255,0.25)',
};

export function normalizeHeroTheme(theme?: string): HeroCardTheme {
  if (!theme) return 'primary';
  if (theme in HERO_CARD_THEMES) return theme as HeroCardTheme;
  if (theme in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[theme];
  return 'primary';
}

export function resolveHeroCardAppearance(
  props: { theme?: HeroCardTheme | string; gradientFrom?: string; gradientTo?: string }
): HeroCardAppearance {
  if (props.gradientFrom && props.gradientTo) {
    return {
      ...CUSTOM_GRADIENT_APPEARANCE,
      containerStyle: {
        background: `linear-gradient(to bottom right, ${props.gradientFrom}, ${props.gradientTo})`,
      },
    };
  }
  return HERO_CARD_THEMES[normalizeHeroTheme(props.theme)];
}

export function readRowField(
  row: Record<string, unknown> | null | undefined,
  field?: string
): unknown {
  if (!row || !field) return undefined;
  return row[field];
}

/** Normalize progress when SQL returns 0-100 or 0-1. */
export function normalizeProgressValue(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return 0;
  if (num <= 1) return num * 100;
  return Math.min(100, Math.max(0, num));
}
