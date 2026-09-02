import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';
import { TabsBarSkeleton } from './TabsBarSkeleton';
import { FormCardSkeleton } from './FormCardSkeleton';
import { FormFieldSkeleton } from './FormFieldSkeleton';

export interface ConfigEditorSkeletonProps {
  tabCount?: number;
  className?: string;
}

export function ConfigEditorSkeleton({ tabCount = 4, className }: ConfigEditorSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <TabsBarSkeleton count={tabCount} variant="segmented" />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <FormCardSkeleton titleWidth="w-36" fieldCount={2} showTextarea />

          <div className="card p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full rounded-md" />
            <FormFieldSkeleton labelWidth="w-16" />
          </div>

          <div className="card p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4 max-w-lg" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>

          <div className="card p-6 space-y-6">
            <Skeleton className="h-6 w-44" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-[300px] w-full rounded-md" />
            </div>
            <FormFieldSkeleton labelWidth="w-32" />
            <div className="grid md:grid-cols-2 gap-6">
              <FormFieldSkeleton labelWidth="w-24" />
              <FormFieldSkeleton labelWidth="w-24" />
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1 space-y-4">
          <div className="card p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="card p-5 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </aside>
      </div>
    </div>
  );
}
