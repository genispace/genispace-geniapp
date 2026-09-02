import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import type { ListColumn, ListItemLayoutConfig } from '@/types/renderers';
import type { ListColumnSlots } from './listConfig';
import { renderListCellValue, type ListCellRenderContext } from './listCellRender';
import type { ListFontSizes } from '../ListRenderers';

/** Local readable fallback (avoids importing a runtime value from ListRenderers → no circular-init risk). */
const FALLBACK_LIST_FONT_SIZES: ListFontSizes = { title: 16, value: 14, label: 13, badge: 12 };

export interface ListItemTemplateContext {
  item: Record<string, unknown>;
  index: number;
  rowId: string | number;
  slots: ListColumnSlots;
  itemLayoutConfig?: ListItemLayoutConfig;
  split?: boolean;
  isSelected?: boolean;
  pageData: Record<string, unknown>[];
  allData: Record<string, unknown>[];
  selectionCheckbox?: React.ReactNode;
  rowActions?: React.ReactNode;
  onRowClick?: () => void;
  /** Current/highlighted row (left border + tint). */
  highlighted?: boolean;
  /** Status dots node rendered before the title. */
  statusDots?: React.ReactNode;
  /** Current/highlight badge node rendered after the title. */
  highlightBadge?: React.ReactNode;
  /** Per-role content font sizes (px); falls back to readable defaults. */
  fontSizes?: ListFontSizes;
  /** Narrow container (real mobile + studio phone frame); hook is called in the component, not here. */
  narrow?: boolean;
}

function fsOf(ctx: ListItemTemplateContext): ListFontSizes {
  return ctx.fontSizes ?? FALLBACK_LIST_FONT_SIZES;
}

function cellContext(ctx: ListItemTemplateContext): ListCellRenderContext {
  return {
    index: ctx.index,
    record: ctx.item,
    pageData: ctx.pageData,
    allData: ctx.allData,
    highlighted: ctx.highlighted,
  };
}

function renderCell(ctx: ListItemTemplateContext, column?: ListColumn) {
  if (!column) return null;
  return renderListCellValue(column, ctx.item, cellContext(ctx));
}

function rowPadding(ctx: ListItemTemplateContext) {
  switch (ctx.itemLayoutConfig?.rowGap) {
    case 'sm':
      return 'py-2 px-3';
    case 'lg':
      return 'py-4 px-4';
    default:
      return 'py-3 px-4';
  }
}

function rowShell(ctx: ListItemTemplateContext, children: React.ReactNode) {
  return (
    <div
      key={String(ctx.rowId)}
      className={cn(
        'list-renderer-item',
        rowPadding(ctx),
        ctx.split && 'border-b border-border last:border-b-0',
        ctx.highlighted ? 'border-l-2 border-l-indigo-400 bg-indigo-50' : ctx.isSelected && 'bg-muted/40',
        ctx.onRowClick && 'cursor-pointer'
      )}
      onClick={ctx.onRowClick}
      role={ctx.onRowClick ? 'button' : undefined}
    >
      <div className="flex items-center gap-3">
        {ctx.selectionCheckbox}
        {children}
        {ctx.rowActions}
      </div>
    </div>
  );
}

export function renderRankingListItem(ctx: ListItemTemplateContext): React.ReactNode {
  const { slots } = ctx;
  const fs = fsOf(ctx);

  // Two-line layout (task #15 store ranking, 2026-08-17): when the row has BOTH a progress bar and
  // right-side extras, compose explicit full-width lines so they stay pairwise aligned —
  //   line 1 = title (+ titleSuffix / highlight badge) … extraTop badge group, right-aligned
  //   line 2 = progress bar (flex-1) … extra cells, right-aligned
  // An extra column with `width` reserves that width even when its value is null (e.g. hideWhenNull
  // gap text on rank-1 rows), keeping the progress bar width uniform across rows.
  const line2Extras = [slots.extraPrimary, slots.extraSecondary, ...slots.extraOthers].filter(
    (c): c is ListColumn => Boolean(c)
  );
  if (slots.title && slots.progress && (slots.extraTop.length > 0 || line2Extras.length > 0)) {
    return rowShell(
      ctx,
      <>
        {slots.prefix && <div className="shrink-0">{renderCell(ctx, slots.prefix)}</div>}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <div
              className={cn('flex min-w-0 flex-1 items-center gap-1.5', ctx.highlighted ? 'text-indigo-700' : 'text-foreground')}
              style={{ fontSize: fs.title }}
            >
              {ctx.statusDots}
              <span className="truncate">{renderCell(ctx, slots.title)}</span>
              {slots.titleSuffix.map((col) => (
                <span key={col.dataIndex} className="shrink-0">
                  {renderCell(ctx, col)}
                </span>
              ))}
              {ctx.highlightBadge}
            </div>
            {slots.extraTop.length > 0 && (
              <div className="flex shrink-0 items-center justify-end gap-1.5">
                {slots.extraTop.map((col) => (
                  <span key={col.dataIndex} className="shrink-0">
                    {renderCell(ctx, col)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">{renderCell(ctx, slots.progress)}</div>
            {line2Extras.map((col) => (
              <span
                key={col.dataIndex}
                className="shrink-0 text-right"
                style={{ fontSize: fs.label, ...(col.width != null ? { minWidth: col.width } : {}) }}
              >
                {renderCell(ctx, col)}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  }

  return rowShell(
    ctx,
    <>
      {slots.prefix && <div className="shrink-0">{renderCell(ctx, slots.prefix)}</div>}
      <div className="flex-1 min-w-0 space-y-1">
        {slots.title && (
          <div
            className={cn('flex min-w-0 items-center gap-1.5', ctx.highlighted ? 'text-indigo-700' : 'text-foreground')}
            style={{ fontSize: fs.title }}
          >
            {ctx.statusDots}
            <span className="truncate">{renderCell(ctx, slots.title)}</span>
            {slots.titleSuffix.map((col) => (
              <span key={col.dataIndex} className="shrink-0">
                {renderCell(ctx, col)}
              </span>
            ))}
            {ctx.highlightBadge}
          </div>
        )}
        {slots.progress ? (
          <div>{renderCell(ctx, slots.progress)}</div>
        ) : (
          slots.subtitle && (
            <div className="text-muted-foreground truncate" style={{ fontSize: fs.label }}>
              {renderCell(ctx, slots.subtitle)}
            </div>
          )
        )}
        {!slots.title && !slots.subtitle && !slots.progress && (
          <div className="text-foreground" style={{ fontSize: fs.title }}>
            {String(ctx.item.title ?? ctx.item.name ?? '')}
          </div>
        )}
      </div>
      {(slots.extraTop.length > 0 || slots.extraPrimary || slots.extraSecondary || slots.extraOthers.length > 0) && (
        <div className="shrink-0 text-right space-y-0.5 min-w-[56px]">
          {slots.extraTop.length > 0 && (
            <div className="flex items-center justify-end gap-1.5">
              {slots.extraTop.map((col) => (
                <span key={col.dataIndex} className="shrink-0">
                  {renderCell(ctx, col)}
                </span>
              ))}
            </div>
          )}
          {slots.extraPrimary && (
            <div style={{ fontSize: fs.value }}>{renderCell(ctx, slots.extraPrimary)}</div>
          )}
          {slots.extraSecondary && (
            <div className="text-muted-foreground" style={{ fontSize: fs.label }}>{renderCell(ctx, slots.extraSecondary)}</div>
          )}
          {slots.extraOthers.map((col) => (
            <div key={col.dataIndex} style={{ fontSize: fs.value }}>{renderCell(ctx, col)}</div>
          ))}
        </div>
      )}
    </>
  );
}

function renderMetricCell(ctx: ListItemTemplateContext, column: ListColumn) {
  const fs = fsOf(ctx);
  const showLabel = column.showLabel !== false && Boolean(column.title);
  const value = renderCell(ctx, column);
  return (
    <div key={column.dataIndex} className="min-w-0">
      {showLabel && (
        <div className="text-muted-foreground leading-tight mb-0.5" style={{ fontSize: fs.label }}>
          {column.title}
        </div>
      )}
      <div className="text-foreground tabular-nums" style={{ fontSize: fs.value }}>{value}</div>
    </div>
  );
}

export function renderProductCardListItem(ctx: ListItemTemplateContext): React.ReactNode {
  const { slots } = ctx;
  const fs = fsOf(ctx);
  const metricCols =
    slots.metrics.length > 0
      ? slots.metrics
      : slots.custom.filter((c) => !c.hidden && c.title);

  return (
    <div
      key={String(ctx.rowId)}
      className={cn(
        'list-renderer-item',
        rowPadding(ctx),
        ctx.split && 'border-b border-border last:border-b-0',
        ctx.isSelected && 'bg-muted/40',
        ctx.onRowClick && 'cursor-pointer active:bg-muted/30'
      )}
      onClick={ctx.onRowClick}
      role={ctx.onRowClick ? 'button' : undefined}
    >
      <div className="flex items-start gap-2">
        {ctx.selectionCheckbox}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              {slots.title && (
                <div className="font-medium text-foreground truncate" style={{ fontSize: fs.title }}>
                  {renderCell(ctx, slots.title)}
                </div>
              )}
              {slots.meta && (
                <div className="shrink-0" style={{ fontSize: fs.label }}>{renderCell(ctx, slots.meta)}</div>
              )}
              {!slots.title && !slots.meta && (
                <div className="text-foreground truncate" style={{ fontSize: fs.title }}>
                  {String(ctx.item.title ?? ctx.item.name ?? '')}
                </div>
              )}
            </div>
            <div
              className="shrink-0 flex items-center text-muted-foreground/70"
              onClick={(e) => e.stopPropagation()}
            >
              {ctx.rowActions ?? (ctx.onRowClick ? <ChevronRight className="w-4 h-4" /> : null)}
            </div>
          </div>
          {slots.subtitle && (
            <div className="text-muted-foreground truncate -mt-1" style={{ fontSize: fs.label }}>
              {renderCell(ctx, slots.subtitle)}
            </div>
          )}
          {metricCols.length > 0 && (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(metricCols.length, ctx.narrow ? 2 : 4)}, minmax(0, 1fr))`,
              }}
            >
              {metricCols.map((col) => renderMetricCell(ctx, col))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function renderProgressTaskListItem(ctx: ListItemTemplateContext): React.ReactNode {
  const { slots } = ctx;
  const fs = fsOf(ctx);
  const spacing = ctx.itemLayoutConfig?.itemSpacing === 'sm' ? 'space-y-1.5' : 'space-y-2';
  const hasIcon = Boolean(slots.icon);

  return (
    <div
      key={String(ctx.rowId)}
      className={cn(
        'list-renderer-item',
        rowPadding(ctx),
        ctx.split && 'border-b border-border last:border-b-0',
        ctx.isSelected && 'bg-muted/40',
        ctx.onRowClick && 'cursor-pointer'
      )}
      onClick={ctx.onRowClick}
      role={ctx.onRowClick ? 'button' : undefined}
    >
      <div className={cn(hasIcon && 'flex items-start gap-3')}>
        {hasIcon && (
          <div className="shrink-0 pt-0.5">{renderCell(ctx, slots.icon)}</div>
        )}
        <div className={cn('min-w-0', hasIcon ? 'flex-1' : 'w-full', spacing)}>
          <div className="flex items-center justify-between gap-2 min-h-[24px]">
            <div className="font-medium text-foreground truncate flex-1 min-w-0" style={{ fontSize: fs.title }}>
              {slots.title
                ? renderCell(ctx, slots.title)
                : String(ctx.item.title ?? ctx.item.name ?? '')}
            </div>
            {slots.meta && (
              <div className="shrink-0 text-muted-foreground tabular-nums" style={{ fontSize: fs.label }}>{renderCell(ctx, slots.meta)}</div>
            )}
          </div>
          {slots.progress && <div>{renderCell(ctx, slots.progress)}</div>}
        </div>
      </div>
      {ctx.rowActions && (
        <div className="flex justify-end mt-2" onClick={(e) => e.stopPropagation()}>
          {ctx.rowActions}
        </div>
      )}
    </div>
  );
}
