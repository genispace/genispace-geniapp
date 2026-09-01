import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';

export interface GridCardsSkeletonProps {
  count?: number;
  columns?: '2' | '3' | '4';
  className?: string;
}

const columnClass: Record<NonNullable<GridCardsSkeletonProps['columns']>, string> = {
  '2': 'md:grid-cols-2',
  '3': 'md:grid-cols-2 lg:grid-cols-3',
  '4': 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function GridCardsSkeleton({
  count = 8,
  columns = '4',
  className,
}: GridCardsSkeletonProps) {
  return (
    <div className={cn('grid gap-4', columnClass[columns], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="card p-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col h-full"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <Skeleton className="w-4 h-4 shrink-0" />
          </div>
          <div className="space-y-3 flex-grow">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-12 rounded-md" />
              <Skeleton className="h-12 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-200/80 dark:border-neutral-800">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
