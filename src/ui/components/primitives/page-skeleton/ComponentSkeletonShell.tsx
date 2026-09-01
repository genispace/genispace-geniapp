import type { CSSProperties } from 'react';
import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';
import { skeletonBarWidth } from './skeletonMetrics';

export interface ComponentSkeletonShellProps {
  /** 是否展示卡片标题骨架条 */
  showHeader?: boolean;
  /** 内容区骨架行数 */
  lines?: number;
  /** 最小高度（px），与 loaded 态对齐避免跳动 */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * 通用组件骨架壳：无专用骨架的组件类型的兜底占位（卡片标题条 + 若干内容行）。
 */
export function ComponentSkeletonShell({
  showHeader = true,
  lines = 4,
  height,
  className,
  style,
}: ComponentSkeletonShellProps) {
  return (
    <div
      className={cn(
        'card border border-neutral-200 dark:border-neutral-700 shadow-sm',
        className
      )}
      style={{ ...(height ? { minHeight: `${height}px` } : {}), ...style }}
      aria-busy="true"
    >
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      )}
      <div className="space-y-3 p-4 pt-0">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: skeletonBarWidth(i) }} />
        ))}
      </div>
    </div>
  );
}
