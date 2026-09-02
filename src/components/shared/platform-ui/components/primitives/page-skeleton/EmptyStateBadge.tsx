import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@genispace/shared-utils';

// 空态共享徽章：线性托盘图标 + 标题 + 副文案 + 可选操作。ChartEmptyState / TableEmptyState 共用，保证一脉相承。
export function EmptyTrayIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground/70"
      aria-hidden="true"
    >
      <path d="M3 14h4l1.5 2.5h7L17 14h4" />
      <path d="M5 14V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8" />
    </svg>
  );
}

export interface EmptyStateBadgeProps {
  title?: string;
  description?: string;
  /** 操作按钮（如"重置筛选"）；不传则不渲染 */
  action?: ReactNode;
  className?: string;
  /** 行内样式（如浮动模式下用 maxWidth 覆盖基础的 max-w-[88%]，避免 shrink-to-fit 反馈环导致文字折行） */
  style?: CSSProperties;
}

export function EmptyStateBadge({ title, description, action, className, style }: EmptyStateBadgeProps) {
  return (
    <div
      style={style}
      className={cn(
        'flex max-w-[88%] flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/85 px-5 py-3.5 text-center shadow-sm backdrop-blur-[2px]',
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-muted/60">
        <EmptyTrayIcon />
      </span>
      <div className="text-sm font-medium text-foreground/80">{title || '暂无数据'}</div>
      {description ? <div className="text-xs leading-snug text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  );
}
