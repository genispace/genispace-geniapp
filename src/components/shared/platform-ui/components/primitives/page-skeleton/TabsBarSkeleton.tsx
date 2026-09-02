import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';

export interface TabsBarSkeletonProps {
  count?: number;
  variant?: 'pill' | 'segmented';
  className?: string;
}

export function TabsBarSkeleton({
  count = 4,
  variant = 'segmented',
  className,
}: TabsBarSkeletonProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('flex flex-wrap gap-4 mb-6', className)}>
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mb-6 flex h-auto w-full flex-wrap items-stretch gap-1 rounded-xl border border-neutral-200/80 dark:border-neutral-800',
        'bg-neutral-100/80 dark:bg-neutral-900/50 p-1',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-9 min-w-[5.5rem] flex-1 rounded-lg sm:flex-initial sm:min-w-[7rem]"
        />
      ))}
    </div>
  );
}
