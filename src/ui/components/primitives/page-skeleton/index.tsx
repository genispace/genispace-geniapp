import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';
import { ConfigEditorSkeleton } from './ConfigEditorSkeleton';
import { DetailTabsSkeleton } from './DetailTabsSkeleton';
import { TablePageSkeleton } from './TablePageSkeleton';
import { GridCardsSkeleton } from './GridCardsSkeleton';
import { SplitPaneSkeleton } from './SplitPaneSkeleton';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';
import { FormCardSkeleton } from './FormCardSkeleton';
import { StatsRowSkeleton } from './StatsRowSkeleton';
import { FormFieldSkeleton } from './FormFieldSkeleton';
import { FormPageSkeleton } from './FormPageSkeleton';

export { FormFieldSkeleton, type FormFieldSkeletonProps } from './FormFieldSkeleton';
export { FormPageSkeleton, type FormPageSkeletonProps } from './FormPageSkeleton';
export { PageHeaderSkeleton, type PageHeaderSkeletonProps } from './PageHeaderSkeleton';
export { TabsBarSkeleton, type TabsBarSkeletonProps } from './TabsBarSkeleton';
export { FormCardSkeleton, type FormCardSkeletonProps } from './FormCardSkeleton';
export { TablePageSkeleton, type TablePageSkeletonProps } from './TablePageSkeleton';
export { GridCardsSkeleton, type GridCardsSkeletonProps } from './GridCardsSkeleton';
export { SplitPaneSkeleton, type SplitPaneSkeletonProps } from './SplitPaneSkeleton';
export { ConfigEditorSkeleton, type ConfigEditorSkeletonProps } from './ConfigEditorSkeleton';
export { DetailTabsSkeleton, type DetailTabsSkeletonProps } from './DetailTabsSkeleton';
export { StatsRowSkeleton, type StatsRowSkeletonProps } from './StatsRowSkeleton';
export {
  ChartAreaSkeleton,
  type ChartAreaSkeletonProps,
  type ChartSkeletonType,
} from './ChartAreaSkeleton';
export { ChartEmptyState, type ChartEmptyStateProps } from './ChartEmptyState';
export { TableEmptyState, type TableEmptyStateProps } from './TableEmptyState';
export { EmptyStateBadge, EmptyTrayIcon, type EmptyStateBadgeProps } from './EmptyStateBadge';
export {
  ListSkeleton,
  type ListSkeletonProps,
  type ListSkeletonTemplate,
} from './ListSkeleton';
export {
  ComponentSkeletonShell,
  type ComponentSkeletonShellProps,
} from './ComponentSkeletonShell';
export { skeletonBarWidth, skeletonItemCount } from './skeletonMetrics';

export type PageSkeletonPreset =
  | 'config-editor'
  | 'detail-tabs'
  | 'table-page'
  | 'grid-cards'
  | 'split-pane'
  | 'profile'
  | 'dashboard'
  | 'form-page';

export interface PageLoadingSkeletonProps {
  preset: PageSkeletonPreset;
  className?: string;
}

export function PageLoadingSkeleton({ preset, className }: PageLoadingSkeletonProps) {
  switch (preset) {
    case 'config-editor':
      return <ConfigEditorSkeleton className={className} />;
    case 'detail-tabs':
      return <DetailTabsSkeleton className={className} />;
    case 'table-page':
      return <TablePageSkeleton className={className} />;
    case 'grid-cards':
      return <GridCardsSkeleton className={className} />;
    case 'split-pane':
      return <SplitPaneSkeleton className={className} />;
    case 'profile':
      return (
        <div className={className}>
          <PageHeaderSkeleton showBack={false} showActions={false} />
          <div className="space-y-8">
            <div className="card p-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <Skeleton className="size-20 rounded-full shrink-0" />
                <div className="flex-1 w-full space-y-4">
                  <FormFieldSkeleton labelWidth="w-20" />
                  <FormFieldSkeleton labelWidth="w-24" />
                  <FormFieldSkeleton labelWidth="w-28" />
                </div>
              </div>
            </div>
            <FormCardSkeleton fieldCount={4} />
          </div>
        </div>
      );
    case 'dashboard':
      return (
        <div className={cn('space-y-6', className)}>
          <StatsRowSkeleton />
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <TablePageSkeleton rowCount={5} showSearch={false} />
        </div>
      );
    case 'form-page':
      return <FormPageSkeleton className={className} />;
    default:
      return null;
  }
}
