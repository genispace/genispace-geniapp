import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';

export interface AppDashboardSkeletonProps {
  className?: string;
}

function PanelHeader({ meta = false }: { meta?: boolean }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <Skeleton className="h-4 w-28" />
      {meta ? <Skeleton className="h-3 w-16" /> : null}
    </div>
  );
}

function MetricPlaceholder({ index }: { index: number }) {
  const noteWidths = ['w-40', 'w-16', 'w-36', 'w-32'];
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="mt-3 h-9 w-20" />
      <Skeleton className={cn('mt-2 h-3 max-w-full', noteWidths[index] ?? 'w-28')} />
    </article>
  );
}

function QueuePlaceholder() {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <PanelHeader meta />
      <div className="overflow-x-auto">
        <div className="min-w-[780px]">
          <div className="grid grid-cols-[1.05fr_1.55fr_.75fr_.7fr_1fr] gap-4 border-b border-border bg-muted/40 px-5 py-3">
            {[20, 28, 16, 16, 20].map((width, index) => <Skeleton key={index} className="h-3" style={{ width: `${width * 4}px` }} />)}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid min-h-[55px] grid-cols-[1.05fr_1.55fr_.75fr_.7fr_1fr] items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
              <div className="flex items-center gap-2"><Skeleton className="h-2.5 w-2.5 rounded-full" /><Skeleton className="h-4 w-28" /></div>
              <div className="space-y-2"><Skeleton className={cn('h-3.5', row % 2 ? 'w-44' : 'w-52')} /><Skeleton className="h-3 w-32" /></div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReasonsPlaceholder() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <PanelHeader meta />
      <div className="space-y-5 p-5">
        {[88, 72, 80].map((width, index) => (
          <div key={index}>
            <div className="mb-2 flex items-center justify-between gap-4"><Skeleton className="h-3.5" style={{ width: `${width}%` }} /><Skeleton className="h-3.5 w-4" /></div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartPlaceholder() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <PanelHeader meta />
      <div className="flex h-64 items-end justify-around gap-5 px-6 pb-5 pt-8">
        {[58, 82, 68].map((height, index) => (
          <div key={index} className="flex h-full flex-1 items-end justify-center gap-2 border-b border-border">
            <Skeleton className="w-[26%] max-w-12 rounded-b-none rounded-t-md" style={{ height: `${height}%` }} />
            <Skeleton className="w-[20%] max-w-9 rounded-b-none rounded-t-md" style={{ height: `${Math.max(24, height - 28)}%` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HealthPlaceholder() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <PanelHeader meta />
      <div className="space-y-5 p-5">
        {Array.from({ length: 3 }).map((_, index) => <div key={index}><div className="mb-2 flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-10" /></div><Skeleton className="h-1.5 w-full rounded-full" /></div>)}
        <div className="rounded-xl border border-border bg-muted/30 p-4"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-8 w-12" /><Skeleton className="mt-2 h-3 w-28" /></div>
      </div>
    </section>
  );
}

/**
 * Page-level loading state for GeniApp dashboards. Its chrome and responsive
 * grid mirror `AppPage` and the common dashboard composition so loading does
 * not shift from a generic table into the final page.
 */
export function AppDashboardSkeleton({ className }: AppDashboardSkeletonProps) {
  return (
    <div
      className={cn('relative w-full min-w-0 max-w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8', className)}
      data-app-dashboard-skeleton
    >
      <div className="mb-6 flex min-h-[52px] w-full min-w-0 flex-col items-stretch justify-between gap-3 sm:min-h-[60px] sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-56 max-w-full sm:h-8" />
          <Skeleton className="hidden h-4 w-[28rem] max-w-full sm:block" />
        </div>
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>

      <div className="w-full min-w-0 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <MetricPlaceholder key={index} index={index} />)}
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1.45fr_.75fr]">
          <QueuePlaceholder />
          <ReasonsPlaceholder />
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1.45fr_.75fr]">
          <ChartPlaceholder />
          <HealthPlaceholder />
        </div>
      </div>
    </div>
  );
}
