import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';
import { TabsBarSkeleton } from './TabsBarSkeleton';

export interface DetailTabsSkeletonProps {
  tabCount?: number;
  showHeader?: boolean;
  className?: string;
}

export function DetailTabsSkeleton({
  tabCount = 5,
  showHeader = true,
  className,
}: DetailTabsSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {showHeader ? (
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-3">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      ) : (
        <PageHeaderSkeleton showBack={false} />
      )}

      <TabsBarSkeleton count={tabCount} variant="pill" />

      <div className="card p-6 space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[200px] w-full rounded-md" />
      </div>
    </div>
  );
}
