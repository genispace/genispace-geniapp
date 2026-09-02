import type { NavigationItem } from '@/types';
import { filterNavigationItemsForMember } from '@/utils/navigationUtils';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import type { VisibleWhenContext } from '@/utils/visibleWhen';
import { resolveTabPageId, type MobileBottomNavTab } from './mobileBottomNav';

export type MobileToolbarNavItem = MobileBottomNavTab;

/**
 * Top-level navigation items flagged `mobileToolbar: true`, rendered as entries in the
 * mobile top toolbar ("..." panel). The device gate is intentionally NOT applied here —
 * these items typically carry `visibility.devices: ['desktop']` precisely so they stay
 * out of the mobile bottom nav while remaining reachable from the toolbar. Member and
 * visibleWhen gates still apply.
 */
export function resolveMobileToolbarNavItems(
  items: NavigationItem[] | undefined | null,
  currentMemberId?: string | null,
  language = 'zh',
  visibleWhenContext?: VisibleWhenContext
): MobileToolbarNavItem[] {
  if (!items?.length) {
    return [];
  }

  const gatedItems = filterNavigationItemsForMember(
    items,
    currentMemberId,
    undefined,
    visibleWhenContext
  );

  return gatedItems.reduce<MobileToolbarNavItem[]>((acc, item) => {
    if (item.mobileToolbar !== true) {
      return acc;
    }

    const pageId = resolveTabPageId(item);
    if (!pageId) {
      return acc;
    }

    acc.push({
      key: item.key,
      label: resolveBilingualText(item.title, language),
      icon: item.icon,
      pageId,
      pageParameters: item.pageParameters,
    });

    return acc;
  }, []);
}
