import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';

export interface StatsRowSkeletonProps {
  count?: number;
  className?: string;
}

export function StatsRowSkeleton({ count = 4, className }: StatsRowSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="card p-4 border border-neutral-200 dark:border-neutral-700 space-y-3"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
