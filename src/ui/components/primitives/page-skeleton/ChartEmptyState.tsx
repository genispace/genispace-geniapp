import type { ReactNode } from 'react';
import { cn } from '@genispace/geniapp/utils';
import type { ChartSkeletonType } from './ChartAreaSkeleton';
import { EmptyStateBadge } from './EmptyStateBadge';

// 空数据态：淡灰 ghost 图形（按 chartType 呼应）+ 中央圆角徽章（线性图标 + 标题 + 副文案）。
// 与 ChartAreaSkeleton（加载态 shimmer）配套，但 ghost 是静态、更淡，读作"图表在、暂无数据"。
export interface ChartEmptyStateProps {
  /** 绘图区高度（px），与真实图高对齐避免跳动 */
  height: number;
  chartType?: ChartSkeletonType;
  title?: string;
  description?: string;
  /** 操作按钮（如"重置筛选"）；不传则不渲染 */
  action?: ReactNode;
  className?: string;
}

// 稳定柱高分布，避免随机、SSR/CSR 一致
const GHOST_BARS = [44, 66, 38, 80, 54, 46, 62];

function GhostBars() {
  return (
    <div className="flex h-full w-full items-end gap-2 px-4 pb-6 pt-4">
      {GHOST_BARS.map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm bg-foreground/[0.06]" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function GhostLine() {
  return (
    <svg className="h-full w-full px-2 py-4 text-foreground/[0.10]" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="2,30 18,17 34,23 50,9 66,19 82,7 98,15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function GhostCircle() {
  return (
    <div className="flex h-full w-full items-center justify-center py-4">
      <div
        className="aspect-square rounded-full border-foreground/[0.06]"
        style={{ width: 'min(56%, 132px)', borderWidth: 'clamp(10px, 6vw, 20px)' }}
      />
    </div>
  );
}

export function ChartEmptyState({
  height,
  chartType = 'column',
  title,
  description,
  action,
  className,
}: ChartEmptyStateProps) {
  const isCircular = chartType === 'pie' || chartType === 'radar';
  const isLineLike = chartType === 'line' || chartType === 'area';
  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ height }}
      role="status"
      aria-label={title || 'No data'}
    >
      {/* 淡灰 ghost 图形，上下柔化淡出 */}
      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_22%,#000_82%,transparent)]">
        {isCircular ? <GhostCircle /> : isLineLike ? <GhostLine /> : <GhostBars />}
      </div>

      {/* 中央徽章 */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        <EmptyStateBadge title={title} description={description} action={action} />
      </div>
    </div>
  );
}
