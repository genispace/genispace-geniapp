/** Shared recharts styling tokens (semantic HSL; consistent across all GeniApp dashboards).
 *  The first series follows the app's theme color (--primary) so each app's dashboard
 *  leads with its own brand accent; the rest are a fixed categorical palette. */
export const CHART_COLORS = [
  'hsl(var(--primary))', // app theme accent
  'hsl(280 65% 55%)', // purple
  'hsl(160 55% 42%)', // teal
  'hsl(32 95% 55%)', // orange
  'hsl(340 72% 52%)', // pink
  'hsl(199 89% 48%)', // cyan
  'hsl(142 71% 45%)', // green
  'hsl(48 96% 53%)', // amber
] as const;

export const CHART_GRID_STROKE = 'hsl(var(--border))';
export const CHART_AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;

export function chartColorAt(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}
