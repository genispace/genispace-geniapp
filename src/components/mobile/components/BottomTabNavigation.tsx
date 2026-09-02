import React, { useMemo } from 'react';
import { cn } from '@genispace/shared-utils';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavigationItem } from '@/types';
import { renderLucideIcon } from '@/utils/iconUtils';
import { buildWorkbenchPagePath } from '@/utils/workbenchPathUtils';
import {
  mobileNavigateFromBottomTab,
  setMobileTabTransitionDirection,
} from '@/mobile/utils/mobileNavigationStore';
import {
  isMobileBottomNavTabActive,
  resolveMobileBottomNavTabs,
  type MobileBottomNavTab,
} from '@/mobile/utils/mobileBottomNav';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useVisibleWhenContext } from '@/hooks/useVisibleWhenContext';
import { serializeWorkbenchUrlSearchParams } from '@/utils/navigationUtils';

interface BottomTabNavigationProps {
  workbenchId?: string;
  currentPageId?: string;
  navigationItems?: NavigationItem[];
  currentMemberId?: string | null;
}

export function BottomTabNavigation({
  workbenchId,
  currentPageId,
  navigationItems = [],
  currentMemberId,
}: BottomTabNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const { language } = useWorkbenchConfigLocale();

  // Role/user context so navigation-level visibleWhen gates apply to the bottom tabs.
  const visibleWhenCtx = useVisibleWhenContext(undefined);
  const tabs = useMemo(
    () => resolveMobileBottomNavTabs(navigationItems, currentMemberId, language, visibleWhenCtx),
    [navigationItems, currentMemberId, language, visibleWhenCtx]
  );

  if (!workbenchId || tabs.length === 0) {
    return null;
  }

  const handleTabClick = (tab: MobileBottomNavTab, tabIndex: number) => {
    const activeTabIndex = tabs.findIndex((item) =>
      isMobileBottomNavTabActive(item, currentPageId, navigationItems)
    );
    const direction =
      activeTabIndex === -1 || tabIndex === activeTabIndex
        ? 0
        : tabIndex > activeTabIndex
          ? 1
          : -1;

    if (direction !== 0) {
      setMobileTabTransitionDirection(direction);
    }

    const params = tab.pageParameters ?? {};
    const queryString = serializeWorkbenchUrlSearchParams(params);
    const search = queryString ? `?${queryString}` : '';
    mobileNavigateFromBottomTab(
      navigate,
      buildWorkbenchPagePath(workbenchId, tab.pageId, search, location.pathname)
    );
  };

  return (
    <nav
      aria-label="Workbench bottom navigation"
      // In-flow footer, NOT fixed: the layout is h-dvh flex-col, so the nav sits flush at the
      // bottom and breathes with the WeCom iOS native toolbar's show/hide (dvh resize) instead
      // of re-anchoring independently — the visible "jumping" of the fixed version.
      className="workbench-bottom-tab-nav relative shrink-0 border-t border-neutral-200/80 bg-white pt-2 dark:border-neutral-700/80 dark:bg-neutral-950"
      // max(): iOS home-bar inset (34px) OR the base padding — not both stacked. Android (inset 0)
      // gets the base padding; the remaining cross-platform difference is the home bar itself.
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
    >
      <div className="flex h-14 items-stretch">
        {tabs.map((tab, tabIndex) => {
          const isActive = isMobileBottomNavTabActive(
            tab,
            currentPageId,
            navigationItems
          );

          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleTabClick(tab, tabIndex)}
              className={cn(
                'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors duration-200',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-neutral-400'
              )}
            >
              {tab.icon
                ? renderLucideIcon(tab.icon, 'h-7 w-7 shrink-0 transition-colors duration-200')
                : null}
              <span className="w-full truncate px-0.5 text-center text-[11px] font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
