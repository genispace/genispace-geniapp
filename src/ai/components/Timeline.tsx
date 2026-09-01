import type { ComponentType, ReactNode } from 'react';

export interface TimelineProps {
  children: ReactNode;
  className?: string;
}

/** Vertical activity timeline rail. Wrap a list of <TimelineItem>. */
export function Timeline({ children, className }: TimelineProps) {
  return <ol className={`relative flex flex-col gap-12 ${className ?? ''}`}>{children}</ol>;
}

export interface TimelineItemProps {
  /** Lucide icon for the node chip. */
  icon?: ComponentType<{ className?: string }>;
  /** Tailwind text-color class for the icon (e.g. "text-emerald-600"). */
  dotClassName?: string;
  /** Tailwind background tint for the node chip (e.g. "bg-emerald-500/10"). Defaults to muted. */
  nodeClassName?: string;
  /** Tailwind left-border accent class for the event card (e.g. "border-l-emerald-500"). */
  accentClassName?: string;
  title: ReactNode;
  /** Right-aligned timestamp / relative time. */
  time?: ReactNode;
  /** Secondary meta line (channel, store, SA…). */
  meta?: ReactNode;
  /** Rich body (badges, amount, content). */
  children?: ReactNode;
  /** Hide the connector below the node (last item). */
  isLast?: boolean;
}

/**
 * One node on the vertical timeline: a filled, ringed icon chip on the rail (left)
 * and a styled event card (right) with an accent edge. Newest-first ordering is
 * the caller's job; pass node/accent classes per event type for distinct styling.
 */
export function TimelineItem({
  icon: Icon,
  dotClassName = 'text-foreground',
  nodeClassName = 'bg-muted',
  accentClassName = 'border-l-border',
  title,
  time,
  meta,
  children,
  isLast,
}: TimelineItemProps) {
  return (
    <li className="relative flex items-start gap-5">
      {/* rail + node — self-stretch so the connector only spans this row, not the inter-row gap */}
      <div className="relative flex w-9 shrink-0 flex-col items-center self-stretch">
        <span
          className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${nodeClassName} ${dotClassName}`}
        >
          {Icon ? <Icon className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        {!isLast ? (
          <span
            className="mt-3 w-px flex-1 min-h-[1.5rem] bg-gradient-to-b from-border to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      {/* event card */}
      <div
        className={`min-w-0 flex-1 space-y-3 rounded-xl border border-l-2 border-border bg-card px-4 py-4 shadow-sm transition-shadow hover:shadow-md ${accentClassName}`}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold leading-normal text-foreground">{title}</p>
          {time ? (
            <span className="shrink-0 text-xs leading-5 tabular-nums text-muted-foreground">{time}</span>
          ) : null}
        </div>
        {meta ? <p className="text-xs leading-relaxed text-muted-foreground">{meta}</p> : null}
        {children ? <div className="pt-1">{children}</div> : null}
      </div>
    </li>
  );
}
