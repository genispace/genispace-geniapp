import React, { useCallback } from 'react';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { applyCustomStyles } from '@/utils/styleUtils';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import { renderLucideIcon } from '@/utils/iconUtils';
import type { CustomStylesConfig } from '@/types/components';
import type { NavigationItem } from '@/types';
import { executeListNavigate } from './list/listActionUtils';
import {
  getVisibleNavTileItems,
  navTileItemToAction,
  navTileItemToRecord,
  normalizeNavTileColumns,
  normalizeNavTileItemHeight,
  resolveNavTileGridClass,
  resolveNavTileVariantClass,
  type NavTileItem,
  type NavTileProps,
} from './navTileUtils';

export interface NavTileRendererProps extends NavTileProps {
  id?: string;
  customStyles?: CustomStylesConfig;
  pageParams?: Record<string, unknown>;
  navigationItems?: NavigationItem[];
}

function normalizeNavTilePathSegment(value?: string): string {
  if (!value?.trim()) return '';
  const path = value.split('?')[0].split('#')[0];
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

const NavTileRenderer: React.FC<NavTileRendererProps> = ({
  items = [],
  columns = 2,
  gap = 12,
  itemHeight,
  variant = 'default',
  showArrow = true,
  arrowIcon = 'chevron-right',
  className = '',
  id,
  customStyles,
  pageParams = {},
  navigationItems,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const narrow = useMobileFlowLayout();
  const bi = (v: unknown) => resolveBilingualText(v, language);
  const navigate = useNavigate();
  const location = useLocation();
  const { workbenchId } = useParams<{ workbenchId?: string }>();

  const customStyleProps = id
    ? applyCustomStyles(id, customStyles, className)
    : { className, style: {} as React.CSSProperties };

  const visibleItems = getVisibleNavTileItems(items);
  // NavTile cards are large — cap at 2-up when the flow is narrow (real mobile or studio phone frame).
  const columnCount = narrow
    ? Math.min(normalizeNavTileColumns(columns), 2)
    : normalizeNavTileColumns(columns);
  const resolvedItemHeight = normalizeNavTileItemHeight(itemHeight);

  const handleItemClick = useCallback(
    (item: NavTileItem, index: number) => {
      if (item.disabled) return;
      const action = navTileItemToAction(item, index);
      if (!action) return;
      executeListNavigate({
        action,
        record: navTileItemToRecord(item),
        pageParams,
        workbenchId,
        pathname: location.pathname,
        navigate,
        navigationItems,
      });
    },
    [location.pathname, navigate, navigationItems, pageParams, workbenchId]
  );

  if (visibleItems.length === 0) {
    return (
      <div
        className={cn('nav-tile text-center py-6 text-muted-foreground text-sm', customStyleProps.className)}
        style={customStyleProps.style}
      >
        {t('nav_tile.no_items', 'No navigation entries')}
      </div>
    );
  }

  return (
    <div
      className={cn('nav-tile overflow-hidden', customStyleProps.className)}
      style={customStyleProps.style}
      data-variant={variant}
    >
      <div
        className={cn('grid', resolveNavTileGridClass(columnCount))}
        style={{ gap: `${gap}px` }}
      >
        {visibleItems.map((item, index) => {
          const clickable = Boolean(item.targetPage?.trim()) && !item.disabled;
          const selected = normalizeNavTilePathSegment(item.targetPage) === normalizeNavTilePathSegment(location.pathname);
          const disabled = (item.disabled || !item.targetPage?.trim()) && !selected;
          return (
            <button
              key={item.id ?? `${item.title}-${index}`}
              type="button"
              disabled={disabled}
              className={cn(
                'nav-tile-item box-border flex w-full items-center gap-3 text-left transition-colors appearance-none',
                resolveNavTileVariantClass(variant),
                selected && 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 dark:border-primary dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90',
                clickable && !selected && 'cursor-pointer hover:bg-muted/40 active:opacity-90',
                clickable && selected && 'cursor-pointer active:opacity-90',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              style={{ height: resolvedItemHeight }}
              onClick={() => handleItemClick(item, index)}
              aria-current={selected ? 'page' : undefined}
            >
              {item.icon && (
                <span className={cn('shrink-0 text-muted-foreground', selected && 'text-primary-foreground/90')}>
                  {renderLucideIcon(item.icon, 'w-4 h-4')}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn('truncate text-sm font-medium text-foreground', selected && 'text-primary-foreground')}>
                    {bi(item.title)}
                  </span>
                  {item.badge && !selected && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary',
                        selected && 'bg-primary-foreground/20 text-primary-foreground'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.subtitle && (
                  <span className={cn('mt-0.5 block truncate text-xs text-muted-foreground', selected && 'text-primary-foreground/80')}>
                    {bi(item.subtitle)}
                  </span>
                )}
              </span>
              {showArrow && (
                <span className={cn('shrink-0 text-muted-foreground/70', selected && 'text-primary-foreground/80')}>
                  {renderLucideIcon(arrowIcon, 'w-4 h-4')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavTileRenderer;
