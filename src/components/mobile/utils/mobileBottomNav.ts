import type { NavigationItem } from '@/types';
import {
  filterNavigationItemsForMember,
  getNavigationTargetPageId,
} from '@/utils/navigationUtils';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import type { VisibleWhenContext } from '@/utils/visibleWhen';

export interface MobileBottomNavTab {
  key: string;
  label: string;
  icon?: string;
  pageId: string;
  pageParameters?: Record<string, unknown>;
}

export function resolveTabPageId(item: NavigationItem): string | null {
  if (typeof item.linkedPage === 'string' && item.linkedPage.trim() !== '') {
    return item.linkedPage;
  }

  if (item.children?.length) {
    for (const child of item.children) {
      const childPageId = resolveTabPageId(child);
      if (childPageId) {
        return childPageId;
      }
    }
    return null;
  }

  return getNavigationTargetPageId(item);
}

export function resolveMobileBottomNavTabs(
  items: NavigationItem[] | undefined | null,
  currentMemberId?: string | null,
  language = 'zh',
  visibleWhenContext?: VisibleWhenContext
): MobileBottomNavTab[] {
  if (!items?.length) {
    return [];
  }

  const visibleItems = filterNavigationItemsForMember(items, currentMemberId, 'mobile', visibleWhenContext);

  return visibleItems.reduce<MobileBottomNavTab[]>((tabs, item) => {
    const pageId = resolveTabPageId(item);
    if (!pageId) {
      return tabs;
    }

    tabs.push({
      key: item.key,
      label: resolveBilingualText(item.title, language),
      icon: item.icon,
      pageId,
      pageParameters: item.pageParameters,
    });

    return tabs;
  }, []);
}

function collectPageIdsForTab(
  item: NavigationItem,
  pageIds: Set<string>
): void {
  const pageId = getNavigationTargetPageId(item);
  if (pageId) {
    pageIds.add(pageId);
  }
  item.children?.forEach((child) => collectPageIdsForTab(child, pageIds));
}

export function isMobileBottomNavTabActive(
  tab: MobileBottomNavTab,
  currentPageId: string | undefined,
  navigationItems: NavigationItem[] | undefined | null
): boolean {
  if (!currentPageId) {
    return false;
  }

  if (tab.pageId === currentPageId) {
    return true;
  }

  const rootItem = navigationItems?.find((item) => item.key === tab.key);
  if (!rootItem) {
    return false;
  }

  const pageIds = new Set<string>();
  collectPageIdsForTab(rootItem, pageIds);
  return pageIds.has(currentPageId);
}
