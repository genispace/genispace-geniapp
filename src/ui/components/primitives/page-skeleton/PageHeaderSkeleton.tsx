import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';

export interface PageHeaderSkeletonProps {
  showBack?: boolean;
  showActions?: boolean;
  className?: string;
}

export function PageHeaderSkeleton({
  showBack = true,
  showActions = true,
  className,
}: PageHeaderSkeletonProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8', className)}>
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {showBack ? <Skeleton className="h-10 w-10 shrink-0 rounded-md" /> : null}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      {showActions ? (
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      ) : null}
    </div>
  );
}
