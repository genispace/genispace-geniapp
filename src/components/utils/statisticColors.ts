import type { CSSProperties } from 'react';

const SEMANTIC_VALUE_CLASSES: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  orange: 'text-orange-600 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  red: 'text-red-600 dark:text-red-400',
  gray: 'text-gray-600 dark:text-gray-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  slate: 'text-slate-600 dark:text-slate-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  rose: 'text-rose-600 dark:text-rose-400',
};

const SEMANTIC_ICON_CLASSES: Record<string, string> = {
  blue: 'text-blue-500 dark:text-blue-400',
  green: 'text-green-500 dark:text-green-400',
  orange: 'text-orange-500 dark:text-orange-400',
  purple: 'text-purple-500 dark:text-purple-400',
  red: 'text-red-500 dark:text-red-400',
  gray: 'text-gray-500 dark:text-gray-400',
  yellow: 'text-yellow-500 dark:text-yellow-400',
  slate: 'text-slate-500 dark:text-slate-400',
  cyan: 'text-cyan-500 dark:text-cyan-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  rose: 'text-rose-500 dark:text-rose-400',
};

function isHexColor(s: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s.trim());
}

export interface ResolveStatisticColorOptions {

  mode: 'value' | 'icon';

  fallbackLegacy?: string;
}

export function resolveStatisticColor(
  value: string | undefined,
  opts: ResolveStatisticColorOptions
): { className?: string; style?: CSSProperties } {
  const raw = value?.trim() ?? '';
  if (!raw) {
    if (opts.mode === 'icon' && opts.fallbackLegacy?.trim()) {
      return resolveSemanticIcon(opts.fallbackLegacy.trim());
    }
    if (opts.mode === 'icon') {
      return { className: 'text-muted-foreground' };
    }
    return {};
  }
  if (raw.toLowerCase() === 'none') {
    if (opts.mode === 'icon') {
      return { className: 'text-muted-foreground' };
    }
    return {};
  }
  if (isHexColor(raw)) {
    return { style: { color: raw } };
  }
  const lower = raw.toLowerCase();
  if (opts.mode === 'value') {
    const cls = SEMANTIC_VALUE_CLASSES[lower];
    if (cls) return { className: cls };
  } else {
    const cls = SEMANTIC_ICON_CLASSES[lower];
    if (cls) return { className: cls };
  }
  if (opts.mode === 'icon' && opts.fallbackLegacy?.trim()) {
    return resolveSemanticIcon(opts.fallbackLegacy.trim());
  }
  return opts.mode === 'icon' ? { className: 'text-muted-foreground' } : {};
}

function resolveSemanticIcon(token: string): { className?: string; style?: CSSProperties } {
  const lower = token.toLowerCase();
  if (isHexColor(token)) {
    return { style: { color: token } };
  }
  const cls = SEMANTIC_ICON_CLASSES[lower];
  if (cls) return { className: cls };
  return { className: 'text-muted-foreground' };
}

export const STATISTIC_SEMANTIC_COLOR_KEYS = Object.keys(SEMANTIC_VALUE_CLASSES);
