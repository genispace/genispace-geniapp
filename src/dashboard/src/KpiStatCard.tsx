import type { ComponentType, ReactNode } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@genispace/geniapp/kit';
import { type Delta, fmtPct } from './format';

export interface KpiComparison {
  /** Short label, e.g. "环比" / "MoM" / "同比" / "YoY". */
  label: string;
  delta: Delta;
  /**
   * Hover tooltip spelling out what the delta compares against — the exact
   * base period and its value (e.g. "vs 2026-05-13 – 2026-06-11: ¥182K").
   */
  title?: string;
}

export interface KpiStatCardProps {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Comparison chips (e.g. 环比 + 同比). */
  comparisons?: KpiComparison[];
  /** When false, a DOWN movement is colored good (e.g. churn, dormant). Default true. */
  higherIsBetter?: boolean;
  /** Secondary line under the value. */
  hint?: string;
  /** Drill / link-to-data. Renders the card as an interactive button. */
  onClick?: () => void;
}

function deltaTone(d: Delta, higherIsBetter: boolean): string {
  if (d.direction === 'flat' || d.pct == null) return 'text-muted-foreground';
  const good = higherIsBetter ? d.direction === 'up' : d.direction === 'down';
  return good ? 'text-emerald-600' : 'text-rose-600';
}

export function KpiStatCard({
  label,
  value,
  icon: Icon,
  comparisons,
  higherIsBetter = true,
  hint,
  onClick,
}: KpiStatCardProps) {
  const interactive = typeof onClick === 'function';
  return (
    <Card
      className={interactive ? 'cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40' : undefined}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <CardContent className="py-4 sm:py-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground/60" /> : null}
        </div>
        <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:mt-2 sm:text-2xl">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {comparisons && comparisons.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {comparisons.map((c) => {
              const tone = deltaTone(c.delta, higherIsBetter);
              const ArrowIcon =
                c.delta.direction === 'up' ? ArrowUpRight : c.delta.direction === 'down' ? ArrowDownRight : Minus;
              return (
                <span
                  key={c.label}
                  className={`inline-flex items-center gap-1 text-xs ${c.title ? 'cursor-help' : ''}`}
                  title={c.title}
                >
                  <span
                    className={`text-muted-foreground ${c.title ? 'border-b border-dotted border-muted-foreground/40' : ''}`}
                  >
                    {c.label}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
                    <ArrowIcon className="h-3 w-3" />
                    {fmtPct(c.delta.pct)}
                  </span>
                </span>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
