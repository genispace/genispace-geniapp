import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';
import { skeletonBarWidth, skeletonItemCount } from './skeletonMetrics';

// 列表项布局变体（与消费方的列表模板取值对齐）。
export type ListSkeletonTemplate =
  | 'default'
  | 'ranking'
  | 'progress-task'
  | 'product-card';

export interface ListSkeletonProps {
  template?: ListSkeletonTemplate;
  /** 骨架项数，默认夹在 [3,6] */
  count?: number;
  /** 是否展示卡片头部（标题区） */
  showHeader?: boolean;
  /** 已配置的真实标题：loading 时保留文案；缺省时渲染标题骨架条 */
  title?: ReactNode;
  /** 行间分隔线 */
  split?: boolean;
  /** 是否带边框/阴影 */
  bordered?: boolean;
  /** 圆角（dashboard 模板） */
  rounded?: boolean;
  /** 内容区尺寸类 */
  sizeClassName?: string;
  className?: string;
  style?: CSSProperties;
}

function RowShell({
  split,
  children,
}: {
  split?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'list-renderer-item py-3 px-4',
        split && 'border-b border-border last:border-b-0'
      )}
    >
      {children}
    </div>
  );
}

function RankingItemSkeleton({ index, split }: { index: number; split?: boolean }) {
  return (
    <RowShell split={split}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5" style={{ width: skeletonBarWidth(index, 0) }} />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-4 w-12 shrink-0" />
      </div>
    </RowShell>
  );
}

function ProgressTaskItemSkeleton({ index, split }: { index: number; split?: boolean }) {
  return (
    <RowShell split={split}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4" style={{ width: skeletonBarWidth(index, 1) }} />
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </RowShell>
  );
}

function ProductCardItemSkeleton({ index, split }: { index: number; split?: boolean }) {
  return (
    <RowShell split={split}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4" style={{ width: skeletonBarWidth(index, 2) }} />
          <Skeleton className="h-4 w-4 shrink-0 rounded" />
        </div>
        <Skeleton className="h-3 w-1/4" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, c) => (
            <div key={c} className="space-y-1">
              <Skeleton className="h-2.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </RowShell>
  );
}

function DefaultItemSkeleton({ index, split }: { index: number; split?: boolean }) {
  return (
    <RowShell split={split}>
      <div className="space-y-1.5">
        <Skeleton className="h-4" style={{ width: skeletonBarWidth(index, 3) }} />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </RowShell>
  );
}

function ItemSkeleton({
  template,
  index,
  split,
}: {
  template: ListSkeletonTemplate;
  index: number;
  split?: boolean;
}) {
  switch (template) {
    case 'ranking':
      return <RankingItemSkeleton index={index} split={split} />;
    case 'progress-task':
      return <ProgressTaskItemSkeleton index={index} split={split} />;
    case 'product-card':
      return <ProductCardItemSkeleton index={index} split={split} />;
    default:
      return <DefaultItemSkeleton index={index} split={split} />;
  }
}

/**
 * 列表骨架屏：按模板生成与真实列表项同构的占位（排名 / 进度任务 / 商品卡 / 默认）。
 */
export function ListSkeleton({
  template = 'default',
  count,
  showHeader = true,
  title,
  split = true,
  bordered = false,
  rounded = false,
  sizeClassName,
  className,
  style,
}: ListSkeletonProps) {
  const n = count ?? skeletonItemCount();

  return (
    <div
      className={cn(
        'list-renderer card overflow-hidden',
        bordered
          ? 'border border-neutral-200 dark:border-neutral-700 shadow-sm'
          : 'border-0 shadow-none',
        rounded && 'rounded-xl',
        className
      )}
      style={style}
      aria-busy="true"
    >
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3">
          {title ? (
            <div className="text-base font-semibold text-foreground">{title}</div>
          ) : (
            <Skeleton className="h-5 w-32" />
          )}
        </div>
      )}
      <div className={cn('list-content', sizeClassName)}>
        {Array.from({ length: n }).map((_, i) => (
          <ItemSkeleton key={i} template={template} index={i} split={split} />
        ))}
      </div>
    </div>
  );
}
