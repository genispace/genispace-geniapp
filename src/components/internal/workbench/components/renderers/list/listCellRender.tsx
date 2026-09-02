import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Switch } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import type { ListColumn, ListRenderProps } from '@/types/renderers';
import i18n from '@/locales/i18n';
import {
  calcProgressValue,
  formatListNumber,
  resolveListRank,
  type ListProgressContext,
} from './listFormatUtils';
import { ListProgressBar } from './ListProgressBar';
import { renderLucideIcon } from '@/utils/iconUtils';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';

export interface ListCellRenderContext extends ListProgressContext {
  index: number;
  highlighted?: boolean;
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatDateValue = (
  value: unknown,
  format: 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss' = 'yyyy-MM-dd HH:mm:ss'
): string => {
  if (value === null || value === undefined || value === '') return '';
  try {
    let date: Date;
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) {
        const timestamp = parseInt(value, 10);
        date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp);
      } else {
        date = new Date(value);
      }
    } else if (typeof value === 'number') {
      date = new Date(value < 1e10 ? value * 1000 : value);
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(String(value));
    }
    if (isNaN(date.getTime())) return String(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    if (format === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return String(value);
  }
};

const tagColorClasses = (color?: string) => {
  switch (color) {
    case 'green':
      return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' };
    case 'blue':
      return { bg: 'bg-primary/15 dark:bg-primary/20', text: 'text-primary dark:text-primary' };
    case 'purple':
      return { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' };
    case 'orange':
      return { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200' };
    case 'red':
      return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' };
    case 'gold':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' };
    case 'rose':
      return { bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-600 dark:text-rose-400' };
    default:
      return { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-800 dark:text-neutral-200' };
  }
};

const getTextStyleClasses = (props?: ListRenderProps) =>
  cn(
    props?.align === 'right' && 'text-right',
    props?.align === 'center' && 'text-center',
    props?.fontWeight === 'medium' && 'font-medium',
    props?.fontWeight === 'semibold' && 'font-semibold',
    // Muted = clearly gray de-emphasis; aligned with the sales-detail LY sub-line (swCells StackedCell,
    // text-slate-400) — the reference style the user picked for rank-gap lists (#339). The theme's
    // text-muted-foreground (#404040) is too dark to read as "gray" in lists.
    props?.muted && 'text-slate-400 dark:text-neutral-500',
    // String presets → Tailwind classes; a numeric fontSize falls through to getTextStyle (inline px).
    props?.fontSize === 'xs' && 'text-xs',
    props?.fontSize === 'sm' && 'text-sm',
    props?.fontSize === 'base' && 'text-base'
  );

/** Numeric fontSize → exact px via inline style (overrides any inherited size); strings handled by classes. */
const getTextStyle = (props?: ListRenderProps) =>
  typeof props?.fontSize === 'number' ? { fontSize: props.fontSize } : undefined;

const getProgressHeightClass = (size?: string) => {
  switch (size) {
    case 'sm':
      return 'sm' as const;
    case 'lg':
      return 'lg' as const;
    default:
      return 'md' as const;
  }
};

const getRankBadgeClasses = (rank: number, props: ListRenderProps = {}) => {
  const topHighlight = props.topHighlight ?? 3;
  const isTop = rank <= topHighlight;
  const rankStyle = props.rankStyle ?? 'circle';

  const shape =
    rankStyle === 'rounded-square'
      ? 'rounded-md w-7 h-7 text-sm'
      : 'rounded-full w-6 h-6 text-xs';

  if (isTop) {
    if (props.topColor === 'gradient-orange') {
      return cn(
        shape,
        'bg-gradient-to-br from-orange-400 to-yellow-400 text-white font-semibold flex items-center justify-center shrink-0'
      );
    }
    return cn(
      shape,
      'bg-orange-500 text-white font-semibold flex items-center justify-center shrink-0'
    );
  }

  return cn(
    shape,
    'bg-neutral-300 dark:bg-neutral-600 text-white font-medium flex items-center justify-center shrink-0'
  );
};

function renderFormattedNumber(
  raw: unknown,
  props: ListRenderProps,
  formatDefault?: ListRenderProps['format']
) {
  // User-chosen `props.format` wins; the per-render-type value is only a default.
  // (Previously this was an override, so the Format control was silently ignored
  //  for Number/Percent columns — only Currency respected it.)
  const merged = { ...props, format: props.format ?? formatDefault ?? 'plain' };
  return (
    <span className={getTextStyleClasses(merged)} style={getTextStyle(merged)}>
      {formatListNumber(raw, merged)}
    </span>
  );
}

export function renderListCellValue(
  column: ListColumn,
  record: Record<string, unknown>,
  context?: Partial<ListCellRenderContext>
): React.ReactNode {
  const raw = record[column.dataIndex];
  const renderType = column.render?.type ?? 'default';
  const props = column.render?.props ?? {};
  const cellContext: ListCellRenderContext = {
    index: context?.index ?? 0,
    record,
    pageData: context?.pageData ?? [],
    allData: context?.allData ?? [],
    highlighted: context?.highlighted,
  };

  // Generic gate: `onlyHighlighted` cells render nothing on non-highlighted rows (any render type).
  if (props.onlyHighlighted && !cellContext.highlighted) {
    return null;
  }

  // Generic gate: `hideWhenNull` cells render nothing on empty values (default shows a muted dash below).
  if (props.hideWhenNull && (raw === null || raw === undefined || raw === '')) {
    return null;
  }

  if (
    (raw === null || raw === undefined || raw === '') &&
    renderType !== 'Rank' &&
    renderType !== 'Progress' &&
    renderType !== 'Icon' &&
    renderType !== 'RankChange'
  ) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (renderType === 'Rank') {
    const rank = resolveListRank(props, cellContext);
    return (
      <span
        className={getRankBadgeClasses(rank, props)}
        aria-label={i18n.t('renderers:list.rank_aria_label', 'Rank {{rank}}', { rank })}
      >
        {rank}
      </span>
    );
  }

  if (renderType === 'Tag') {
    const cellValue = String(raw);
    const colorProps = column.render?.props as
      | { color?: Record<string, string>; text?: Record<string, string>; textColor?: Record<string, string> }
      | undefined;
    const bgKey =
      column.render?.colorMap?.[cellValue] ?? colorProps?.color?.[cellValue];
    const textKey =
      column.render?.textColorMap?.[cellValue] ?? colorProps?.textColor?.[cellValue];
    const { bg, text } = tagColorClasses(
      typeof bgKey === 'string' ? bgKey : undefined
    );
    const textCls =
      typeof textKey === 'string' ? tagColorClasses(textKey).text : text;
    const label = colorProps?.text?.[cellValue] ?? cellValue;
    const isOutline = props.variant === 'outline';
    const tagSize = props.tagSize === 'xs' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          tagSize,
          isOutline ? 'border border-current bg-transparent' : bg,
          textCls
        )}
      >
        {label}
      </span>
    );
  }

  if (renderType === 'Icon') {
    const iconName = String(raw);
    const iconSizeClass =
      props.iconSize === 'sm' ? 'w-8 h-8' : props.iconSize === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
    const iconInnerClass =
      props.iconSize === 'sm' ? 'w-3.5 h-3.5' : props.iconSize === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    const iconNode = renderLucideIcon(iconName, cn(iconInnerClass, props.iconColor ?? 'text-muted-foreground'));
    if (props.iconVariant === 'plain') {
      return <span className="inline-flex shrink-0">{iconNode}</span>;
    }
    return (
      <span
        className={cn(
          iconSizeClass,
          'inline-flex shrink-0 items-center justify-center rounded-full bg-muted'
        )}
      >
        {iconNode}
      </span>
    );
  }

  if (renderType === 'Image') {
    const src = String(raw);
    const w = props.width;
    const h = props.height;
    return (
      <img
        src={src}
        alt={column.title ?? column.dataIndex}
        className="object-cover rounded-md border border-neutral-200 dark:border-neutral-700"
        style={{
          width: w ? `${w}px` : '48px',
          height: h ? `${h}px` : '48px',
        }}
      />
    );
  }

  if (renderType === 'Progress') {
    const pct = calcProgressValue(raw, props, cellContext);
    const showPercent = props.showPercent ?? false;
    // Percent-label precision: default 0 (integer, unchanged for existing bars); set `decimals` to keep
    // small shares readable (e.g. a single product's 0.3% stock share would otherwise round to "0%").
    const pctDecimals = props.decimals ?? 0;
    const percentPosition = props.percentPosition ?? 'right';
    const fullWidth = props.fullWidth ?? false;
    const resolvedBarColor =
      props.barColorField && record[props.barColorField] != null && record[props.barColorField] !== ''
        ? String(record[props.barColorField])
        : (props.barColor ?? 'primary');
    const resolvedTrackColor =
      props.trackColorField && record[props.trackColorField] != null && record[props.trackColorField] !== ''
        ? String(record[props.trackColorField])
        : props.trackColor;
    const progressEl = (
      <ListProgressBar
        value={pct}
        max={100}
        fullWidth={fullWidth}
        size={getProgressHeightClass(props.size)}
        barColor={resolvedBarColor}
        trackColor={resolvedTrackColor}
      />
    );

    if (!showPercent || percentPosition === 'none') {
      return fullWidth ? <div className="w-full">{progressEl}</div> : progressEl;
    }

    return (
      <div className={cn('flex items-center gap-2', fullWidth && 'w-full')}>
        {progressEl}
        {percentPosition === 'right' && (
          <span className="text-xs text-muted-foreground shrink-0 w-10 text-right tabular-nums">
            {pct.toFixed(pctDecimals)}%
          </span>
        )}
        {percentPosition === 'inside' && (
          <span className="sr-only">{pct.toFixed(pctDecimals)}%</span>
        )}
      </div>
    );
  }

  if (renderType === 'Number') {
    return renderFormattedNumber(raw, props, 'plain');
  }

  if (renderType === 'Currency') {
    return renderFormattedNumber(raw, props, props.format ?? 'currency');
  }

  if (renderType === 'Percent') {
    return renderFormattedNumber(raw, props, 'percent');
  }

  if (renderType === 'Trend') {
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    const up = num >= 0;
    return (
      <div
        className={cn(
          'flex items-center gap-0.5 text-xs font-medium',
          up ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-500 dark:text-rose-400'
        )}
      >
        {up ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
        <span className="tabular-nums">
          {formatListNumber(Math.abs(num), {
            ...props,
            format: 'percent',
            decimals: props.decimals ?? 1,
          })}
        </span>
      </div>
    );
  }

  if (renderType === 'RankChange') {
    // Rank delta from the datasource: positive = moved up. null/0 (flat or no prior rank) → gray dash.
    // Accept numeric strings too ("3") — some SQL drivers serialize numeric/bigint columns as strings.
    const num =
      typeof raw === 'number' && Number.isFinite(raw)
        ? raw
        : typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))
          ? Number(raw)
          : null;
    const isPill = props.variant !== 'text';
    const labelText = props.label ? resolveBilingualText(props.label, i18n.language ?? 'zh') : '';
    const labelNode = labelText ? <span className="mr-0.5">{labelText}</span> : null;
    if (num === null || num === 0) {
      return (
        <span
          className={cn(
            'text-xs text-slate-400 dark:text-slate-500',
            isPill && 'inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5'
          )}
        >
          {labelNode}—
        </span>
      );
    }
    const up = num > 0;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-medium',
          up ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
          isPill &&
            cn(
              'rounded-full px-1.5 py-0.5',
              up ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40'
            )
        )}
      >
        {labelNode}
        {up ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
        <span className="tabular-nums">{`${up ? '+' : '-'}${Math.abs(num)}`}</span>
      </span>
    );
  }

  if (renderType === 'Switch') {
    const checked = raw === true || raw === 1 || raw === '1';
    return <Switch checked={checked} disabled />;
  }

  if (
    renderType === 'Date' ||
    renderType === 'yyyy-MM-dd' ||
    renderType === 'yyyy-MM-dd HH:mm:ss'
  ) {
    const fmt =
      renderType === 'yyyy-MM-dd' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
    return <span className={getTextStyleClasses(props)} style={getTextStyle(props)}>{formatDateValue(raw, fmt)}</span>;
  }

  if (Array.isArray(raw)) {
    return <span className={getTextStyleClasses(props)} style={getTextStyle(props)}>{raw.map(String).join(', ')}</span>;
  }

  return (
    <span className={cn('break-words', getTextStyleClasses(props))} style={getTextStyle(props)}>
      {formatCellValue(raw)}
    </span>
  );
}
