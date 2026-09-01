import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@genispace/geniapp/utils';
import { EmptyStateBadge } from './EmptyStateBadge';
import { Z_INDEX_LAYERS } from '../../../styles/z-index-layers';
import { useVisibleCenter } from './useVisibleCenter';

// 表格空态：淡灰 ghost 表行（可选表头）+ 中央徽章。与 ChartEmptyState / 加载骨架一脉相承。
// 独立用时 showHeader 默认 true（自带 ghost 表头）；嵌入已渲染表头的 <tbody> 里时传 showHeader={false}，只画 ghost 行。
export interface TableEmptyStateProps {
  /** ghost 列数（与真实列数对齐更自然） */
  columns?: number;
  /** ghost 行数 */
  rows?: number;
  /** 是否画 ghost 表头 */
  showHeader?: boolean;
  /** 最小高度（px） */
  minHeight?: number;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /**
   * 浮动徽章：把「暂无数据」徽章 portal 到 body 用 fixed 定位，
   * 始终居中于表格**当前在屏幕上可见的那一块区域**（跟随横/纵滚动、侧边栏折叠）。
   * 表格滚出视野时徽章随之消失。默认 false（沿用原 absolute 居中行为）。
   */
  floatBadge?: boolean;
  /** floatBadge 模式下，从视口顶部排除的固定/吸顶 chrome 高度（px），避免徽章浮到吸顶筛选栏之上。 */
  topInset?: number;
  /** floatBadge 模式下，从视口底部排除的固定 chrome 高度（px），避免徽章浮到底部导航之上。 */
  bottomInset?: number;
}

// 确定性单元格宽度（首列偏宽=标签列，其余偏窄），避免随机、SSR/CSR 一致
// 每列骨架条占「各自列宽」的比例（错落以更自然）。列用 flex-1 均分，使骨架始终铺满整表宽度，
// 不再被固定 maxWidth 截断（之前宽表上只填了左侧约 1/3）。确定性数组保证 SSR/CSR 一致。
const BAR_FILL = ['40%', '64%', '54%', '70%', '50%', '66%', '58%'];

function GhostRow({ columns, header }: { columns: number; header?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3" style={{ height: header ? 30 : 34 }}>
      {Array.from({ length: Math.max(1, columns) }).map((_, i) => (
        <div key={i} className="min-w-0 flex-1">
          <div
            className={cn('h-2.5 rounded-sm', header ? 'bg-foreground/[0.09]' : 'bg-foreground/[0.05]')}
            style={{ width: BAR_FILL[i % BAR_FILL.length] }}
          />
        </div>
      ))}
    </div>
  );
}

export function TableEmptyState({
  columns = 4,
  rows = 5,
  showHeader = true,
  minHeight = 220,
  title,
  description,
  action,
  className,
  floatBadge = false,
  topInset = 0,
  bottomInset = 0,
}: TableEmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Measure the floating badge so useVisibleCenter can fit it inside the clean band (table ∩ safe
  // area): when that band is shorter than the badge it returns a < 1 scale, shrinking the badge to fit
  // rather than letting it spill over the table header (top) or the bottom nav.
  const badgeRef = useRef<HTMLDivElement>(null);
  const [badgeHeight, setBadgeHeight] = useState(0);
  const { x, y, visible, scale } = useVisibleCenter(containerRef, {
    topInset,
    bottomInset,
    reserveHeight: floatBadge ? badgeHeight : 0,
  });
  useLayoutEffect(() => {
    if (!floatBadge) return;
    const h = badgeRef.current?.offsetHeight ?? 0;
    if (h && h !== badgeHeight) setBadgeHeight(h);
  });

  // 浮动模式下徽章的父链是 shrink-to-fit（无确定宽度），基础的 max-w-[88%] 会按
  // 徽章自身收缩宽度的 88% 解析，导致每次少掉 ~12% 把「暂无数据」末字挤到换行。
  // 用行内 maxWidth 覆盖（定长、断开反馈环；行内样式必生效，不依赖 Tailwind 任意值生成），
  // min(88vw, 360px) 既让徽章按内容单行排布、又在窄屏避免超出屏幕。
  const badge = (
    <EmptyStateBadge
      title={title}
      description={description}
      action={action}
      style={floatBadge ? { maxWidth: 'min(88vw, 360px)' } : undefined}
    />
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ minHeight }}
      role="status"
      aria-label={title || 'No data'}
    >
      {/* 淡灰 ghost 表，向下柔化淡出 */}
      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,#000_62%,transparent)]">
        {showHeader ? (
          <div className="border-b border-foreground/[0.06] pb-1 pt-2">
            <GhostRow columns={columns} header />
          </div>
        ) : null}
        <div className="space-y-1 pt-1">
          {Array.from({ length: Math.max(1, rows) }).map((_, i) => (
            <GhostRow key={i} columns={columns} />
          ))}
        </div>
      </div>

      {/* 中央徽章 */}
      {floatBadge ? (
        // 浮动模式：portal 到 body，fixed 居中于可见交集区域
        visible && typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={badgeRef}
                className="pointer-events-none fixed"
                style={{
                  left: x,
                  top: y,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  zIndex: Z_INDEX_LAYERS.FLOATING_PANEL,
                }}
              >
                <div className="pointer-events-auto">{badge}</div>
              </div>,
              document.body,
            )
          : null
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-3">{badge}</div>
      )}
    </div>
  );
}
