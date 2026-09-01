import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';

export type ChartSkeletonType =
  | 'line'
  | 'column'
  | 'bar'
  | 'area'
  | 'pie'
  | 'radar'
  | 'heatmap'
  | 'composedBar'
  | 'overlapBar';

export interface ChartAreaSkeletonProps {
  /** 绘图区高度（px），与真实图高对齐以避免跳动 */
  height: number;
  chartType?: ChartSkeletonType;
  className?: string;
}

// 稳定的柱高分布（百分比），避免随机、保证 SSR/CSR 一致。
const BAR_HEIGHTS = [58, 84, 46, 92, 68, 54, 78];

function CircularChartSkeleton({ height }: { height: number }) {
  const size = Math.max(64, Math.min(height - 32, 168));
  return (
    <div className="flex w-full items-center justify-center gap-6" style={{ height }}>
      <Skeleton className="rounded-full" style={{ width: size, height: size }} />
      <div className="hidden space-y-2 sm:block">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CartesianChartSkeleton({ height }: { height: number }) {
  return (
    <div className="flex w-full gap-2" style={{ height }}>
      <div className="flex w-8 shrink-0 flex-col justify-between py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 items-end gap-2 sm:gap-3">
          {BAR_HEIGHTS.map((h, i) => (
            <Skeleton key={i} className="min-w-0 flex-1 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex gap-2 pt-2 sm:gap-3">
          {BAR_HEIGHTS.map((_, i) => (
            <Skeleton key={i} className="h-2 min-w-0 flex-1" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 图表区骨架屏：替换居中 spinner。
 * - pie / radar：环形占位 + legend 条。
 * - 其余笛卡尔图：y 轴刻度 + 柱形占位 + x 轴刻度。
 */
export function ChartAreaSkeleton({ height, chartType = 'column', className }: ChartAreaSkeletonProps) {
  const isCircular = chartType === 'pie' || chartType === 'radar';
  return (
    <div className={cn('w-full', className)} aria-busy="true">
      {isCircular ? (
        <CircularChartSkeleton height={height} />
      ) : (
        <CartesianChartSkeleton height={height} />
      )}
    </div>
  );
}
