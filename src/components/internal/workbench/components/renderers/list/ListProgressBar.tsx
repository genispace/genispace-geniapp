import React from 'react';
import { cn } from '@genispace/shared-utils';

export interface ListProgressBarProps {
  value: number;
  max?: number;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  barColor?: string;
  trackColor?: string;
  className?: string;
}

const SIZE_CLASS = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
} as const;

// Named color tokens → Tailwind bg classes (listed literally so Tailwind keeps them in the build).
// Anything not here falls through to a raw CSS color via inline backgroundColor (e.g. '#6366f1').
// NOTE: bare names like 'indigo'/'emerald' MUST be mapped here — 'indigo' as a CSS color is a dark
// #4B0082 (not Tailwind indigo) and 'emerald' isn't a valid CSS color at all (renders nothing).
const BAR_COLOR_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-500',
};

// Matching light tints for the track (background). Same token vocabulary as BAR_COLOR_CLASS so a
// token bar color can auto-tint its track (prototype pairs bar-500 with track-100). Dark variants
// keep the tint legible on dark backgrounds.
const TRACK_TINT_CLASS: Record<string, string> = {
  primary: 'bg-primary/15',
  green: 'bg-green-100 dark:bg-green-900/40',
  purple: 'bg-purple-100 dark:bg-purple-900/40',
  blue: 'bg-blue-100 dark:bg-blue-900/40',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/40',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
  amber: 'bg-amber-100 dark:bg-amber-900/40',
  rose: 'bg-rose-100 dark:bg-rose-900/40',
  red: 'bg-red-100 dark:bg-red-900/40',
  orange: 'bg-orange-100 dark:bg-orange-900/40',
  sky: 'bg-sky-100 dark:bg-sky-900/40',
  violet: 'bg-violet-100 dark:bg-violet-900/40',
  teal: 'bg-teal-100 dark:bg-teal-900/40',
  slate: 'bg-slate-100 dark:bg-slate-800',
};

export const ListProgressBar: React.FC<ListProgressBarProps> = ({
  value,
  max = 100,
  fullWidth = false,
  size = 'md',
  barColor = 'primary',
  trackColor,
  className,
}) => {
  const pct = Math.min(max, Math.max(0, value));
  const percentage = max > 0 ? Math.min(100, Math.max(0, (pct / max) * 100)) : 0;
  const fillClass = BAR_COLOR_CLASS[barColor] ?? '';
  const fillStyle =
    !fillClass && barColor
      ? { backgroundColor: barColor }
      : undefined;

  // Track color comes only from the explicit trackColor config (a token → its light tint, or a raw
  // CSS color/hex → inline). No deriving from the bar; unset = neutral gray.
  const trackClass = trackColor && TRACK_TINT_CLASS[trackColor] ? TRACK_TINT_CLASS[trackColor] : '';
  const trackStyle = !trackClass && trackColor ? { backgroundColor: trackColor } : undefined;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full',
        SIZE_CLASS[size],
        fullWidth ? 'w-full' : 'w-24',
        trackClass || (!trackStyle ? 'bg-neutral-200 dark:bg-neutral-700' : ''),
        className
      )}
      style={trackStyle}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300 ease-in-out',
          fillClass
        )}
        style={{ width: `${percentage}%`, ...fillStyle }}
      />
    </div>
  );
};
