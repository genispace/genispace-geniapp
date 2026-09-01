import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';
import { FormFieldSkeleton } from './FormFieldSkeleton';

export interface SplitPaneSkeletonProps {
  className?: string;
}

export function SplitPaneSkeleton({ className }: SplitPaneSkeletonProps) {
  return (
    <div className={cn('flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 min-h-0', className)}>
      <div className="lg:col-span-3 flex flex-col min-h-0">
        <div className="card border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-full min-h-[320px]">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="p-4 sm:p-6 space-y-4 flex-1">
            <FormFieldSkeleton labelWidth="w-20" />
            <FormFieldSkeleton labelWidth="w-16" inputHeight="h-24" />
            <FormFieldSkeleton labelWidth="w-12" />
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <div className="lg:col-span-9 flex flex-col min-h-0">
        <div className="card border border-neutral-200 dark:border-neutral-800 flex flex-col flex-1 min-h-[320px]">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
          <div className="p-4 sm:p-6 flex-1 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800">
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
