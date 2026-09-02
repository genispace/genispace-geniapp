import { NavigationItem } from '../types';
import i18n from '@/locales/i18n';
import { isCommunicationOnlyParameter } from '@/config/componentTriggers';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';
import { evaluateVisibleWhen, type VisibleWhenContext } from './visibleWhen';

/** NavigationItem.title may be a plain string or inline bilingual `{ zh, en }` — always display through this. */
export const navigationTitleText = (title: NavigationItem['title'] | undefined): string =>
  resolveBilingualText(title, i18n.language ?? 'zh');

type NavigationVisibility = NonNullable<NavigationItem['visibility']>;

const normalizeNavigationVisibility = (
  visibility: NavigationItem['visibility']
): NavigationVisibility => {
  if (!visibility || visibility.mode !== 'members') {
    return { mode: 'all' };
  }

  return {
    mode: 'members',
    memberIds: Array.from(
      new Set((visibility.memberIds || []).filter((memberId) => typeof memberId === 'string' && memberId.trim() !== ''))
    ),
  };
};

export const getNavigationTargetPageId = (item: NavigationItem): string | null => {
  if (typeof item.linkedPage === 'string' && item.linkedPage.trim() !== '') {
    return item.linkedPage;
  }
  if (typeof item.key === 'string' && item.key.trim() !== '') {
    return item.key;
  }
  return null;
};

export type NavigationDevice = 'desktop' | 'mobile';

export const isNavigationItemVisibleToMember = (
  item: NavigationItem,
  currentMemberId?: string | null,
  device?: NavigationDevice,
  visibleWhenContext?: VisibleWhenContext
): boolean => {
  // Device gate is orthogonal to the member gate: an item restricted to some devices is
  // dropped on the other device regardless of who is looking.
  const devices = item.visibility?.devices;
  if (device && Array.isArray(devices) && devices.length > 0 && !devices.includes(device)) {
    return false;
  }

  // visibleWhen is ANDed with the member/device gates. Without an evaluation context it
  // fails closed, so role-gated entries never leak through a path that cannot evaluate them.
  if (item.visibleWhen && !evaluateVisibleWhen(item.visibleWhen, visibleWhenContext ?? {})) {
    return false;
  }

  const visibility = normalizeNavigationVisibility(item.visibility);
  if (visibility.mode === 'all') {
    return true;
  }

  if (!currentMemberId) {
    return false;
  }

  return (visibility.memberIds || []).includes(currentMemberId);
};

const isNavigationItemSelfNavigable = (item: NavigationItem): boolean => {
  if (item.linkedPage) {
    return true;
  }
  return !item.children?.length;
};

export const stripNavigationSystemParams = (params: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(Object.entries(params).filter(([key]) => !key.startsWith('_')));
};

const areNavigationParamsEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean => {
  const leftSerialized = serializeWorkbenchUrlSearchParams(left);
  const rightSerialized = serializeWorkbenchUrlSearchParams(right);
  return leftSerialized === rightSerialized;
};

export const findNavigationItemsForPage = (
  navigationItems: NavigationItem[] | undefined | null,
  pageId: string
): NavigationItem[] => {
  if (!navigationItems?.length) {
    return [];
  }

  const matches: NavigationItem[] = [];
  const visit = (items: NavigationItem[]) => {
    for (const item of items) {
      if (getNavigationTargetPageId(item) === pageId && isNavigationItemSelfNavigable(item)) {
        matches.push(item);
      }
      if (item.children?.length) {
        visit(item.children);
      }
    }
  };

  visit(navigationItems);
  return matches;
};

export const filterNavigationItemsForMember = (
  items: NavigationItem[],
  currentMemberId?: string | null,
  device?: NavigationDevice,
  visibleWhenContext?: VisibleWhenContext
): NavigationItem[] => {
  return items.reduce<NavigationItem[]>((acc, item) => {
    if (!isNavigationItemVisibleToMember(item, currentMemberId, device, visibleWhenContext)) {
      return acc;
    }

    const filteredChildren = item.children?.length
      ? filterNavigationItemsForMember(item.children, currentMemberId, device, visibleWhenContext)
      : undefined;

    const hadChildren = Boolean(item.children?.length);
    const canKeepSelf = isNavigationItemSelfNavigable(item);

    if (filteredChildren?.length) {
      acc.push({
        ...item,
        children: filteredChildren,
      });
      return acc;
    }

    if (hadChildren && !canKeepSelf) {
      return acc;
    }

    acc.push({
      ...item,
      children: filteredChildren,
    });
    return acc;
  }, []);
};

const findFirstVisibleNavigationEntry = (
  items: NavigationItem[],
  pagesMap: Record<string, unknown>,
  currentMemberId?: string | null,
  visibleWhenContext?: VisibleWhenContext
): NavigationItem | null => {
  for (const item of items) {
    if (isNavigationItemVisibleToMember(item, currentMemberId, undefined, visibleWhenContext)) {
      const targetPageId = getNavigationTargetPageId(item);
      if (targetPageId && pagesMap[targetPageId] && isNavigationItemSelfNavigable(item)) {
        return item;
      }
    }

    if (item.children?.length) {
      const childMatch = findFirstVisibleNavigationEntry(item.children, pagesMap, currentMemberId, visibleWhenContext);
      if (childMatch) {
        return childMatch;
      }
    }
  }

  return null;
};

const buildNavigationQueryString = (
  item: NavigationItem,
  paramsOverride?: Record<string, unknown>
): string => {
  const urlParams: Record<string, unknown> = {
    ...(paramsOverride ?? item.pageParameters ?? {}),
    _nav: item.key,
  };
  const qs = serializeWorkbenchUrlSearchParams(urlParams);
  return qs ? `?${qs}` : '';
};

/** Build URL params for programmatic page open (List/Table navigate, open-tab event). */
export const resolveNavigationOpenParams = (
  navigationItems: NavigationItem[] | undefined | null,
  targetPageId: string,
  actionParams: Record<string, unknown> = {}
): Record<string, unknown> => {
  const items = navigationItems ?? [];
  const pageNavItems = findNavigationItemsForPage(items, targetPageId);

  if (pageNavItems.length === 0) {
    return stripNavigationSystemParams(actionParams);
  }

  if (typeof actionParams._nav === 'string' && actionParams._nav.trim() !== '') {
    const explicit = findNavigationItem(items, actionParams._nav);
    if (explicit && getNavigationTargetPageId(explicit) === targetPageId) {
      return {
        ...(explicit.pageParameters ?? {}),
        ...actionParams,
        _nav: explicit.key,
      };
    }
  }

  const nonSystemParams = stripNavigationSystemParams(actionParams);
  if (Object.keys(nonSystemParams).length > 0) {
    const paramMatch = pageNavItems.find((item) =>
      areNavigationParamsEqual(item.pageParameters || {}, nonSystemParams)
    );
    if (paramMatch) {
      return {
        ...nonSystemParams,
        _nav: paramMatch.key,
      };
    }
  }

  const defaultItem =
    pageNavItems.find(
      (item) => !item.pageParameters || Object.keys(item.pageParameters).length === 0
    ) ?? pageNavItems[0];

  return {
    ...(defaultItem.pageParameters ?? {}),
    ...actionParams,
    _nav: defaultItem.key,
  };
};

export type NavigationRouteAccessResult =
  | {
      allowed: true;
      matchedItem: NavigationItem | null;
      targetPageId: string;
      normalizedQueryString: string | null;
    }
  | {
      allowed: false;
      matchedItem: NavigationItem | null;
      targetPageId: string;
      normalizedQueryString: string | null;
    };

export const resolveNavigationRouteAccess = ({
  items,
  routePageId,
  routeParams,
  currentMemberId,
  visibleWhenContext,
}: {
  items: NavigationItem[];
  routePageId: string;
  routeParams: Record<string, unknown>;
  currentMemberId?: string | null;
  visibleWhenContext?: VisibleWhenContext;
}): NavigationRouteAccessResult => {
  const currentNavKey =
    typeof routeParams._nav === 'string' && routeParams._nav.trim() !== ''
      ? routeParams._nav
      : null;
  const nonSystemParams = stripNavigationSystemParams(routeParams);

  if (currentNavKey) {
    const navItem = findNavigationItem(items, currentNavKey);
    if (navItem && isNavigationItemSelfNavigable(navItem)) {
      const navLinkedPageId = getNavigationTargetPageId(navItem) || routePageId;

      // Stale `_nav` from the source page (e.g. dashboard) must not hijack deep-link targets
      // such as reconciliation-result that are not linked in the sidebar navigation.
      if (navLinkedPageId === routePageId) {
        if (!isNavigationItemVisibleToMember(navItem, currentMemberId, undefined, visibleWhenContext)) {
          return {
            allowed: false,
            matchedItem: navItem,
            targetPageId: navLinkedPageId,
            normalizedQueryString: null,
          };
        }

        const needsPathNormalization = routePageId !== navLinkedPageId;
        const normalizedQueryString =
          needsPathNormalization && Object.keys(nonSystemParams).length === 0
            ? buildNavigationQueryString(navItem)
            : needsPathNormalization
              ? `?${serializeWorkbenchUrlSearchParams({ ...nonSystemParams, _nav: navItem.key })}`
              : null;

        return {
          allowed: true,
          matchedItem: navItem,
          targetPageId: navLinkedPageId,
          normalizedQueryString,
        };
      }
    } else if (!navItem || !isNavigationItemSelfNavigable(navItem)) {
      return {
        allowed: false,
        matchedItem: null,
        targetPageId: routePageId,
        normalizedQueryString: null,
      };
    }
  }

  const navItemByKey = findNavigationItem(items, routePageId);
  if (navItemByKey && isNavigationItemSelfNavigable(navItemByKey)) {
    const targetPageId = getNavigationTargetPageId(navItemByKey) || routePageId;
    if (!isNavigationItemVisibleToMember(navItemByKey, currentMemberId, undefined, visibleWhenContext)) {
      return {
        allowed: false,
        matchedItem: navItemByKey,
        targetPageId,
        normalizedQueryString: null,
      };
    }

    return {
      allowed: true,
      matchedItem: navItemByKey,
      targetPageId,
      normalizedQueryString: buildNavigationQueryString(navItemByKey),
    };
  }

  const pageNavItems = findNavigationItemsForPage(items, routePageId);
  if (pageNavItems.length === 0) {
    return {
      allowed: true,
      matchedItem: null,
      targetPageId: routePageId,
      normalizedQueryString: null,
    };
  }

  const matchedByParams = pageNavItems.filter((item) =>
    areNavigationParamsEqual(item.pageParameters || {}, nonSystemParams)
  );
  const visibleMatch = matchedByParams.find((item) =>
    isNavigationItemVisibleToMember(item, currentMemberId, undefined, visibleWhenContext)
  );

  if (!visibleMatch) {
    return {
      allowed: false,
      matchedItem: matchedByParams[0] || null,
      targetPageId: routePageId,
      normalizedQueryString: null,
    };
  }

  return {
    allowed: true,
    matchedItem: visibleMatch,
    targetPageId: routePageId,
    normalizedQueryString: `?${serializeWorkbenchUrlSearchParams({ ...nonSystemParams, _nav: visibleMatch.key })}`,
  };
};

export const calculateNavigationLevels = (items: NavigationItem[], parentKey?: string, level: number = 1): NavigationItem[] => {
  return items.map(item => {
    const updatedItem: NavigationItem = {
      ...item,
      level,
      parentKey,
      hasChildren: Boolean(item.children && item.children.length > 0)
    };

    if (item.children && item.children.length > 0) {
      updatedItem.children = calculateNavigationLevels(item.children, item.key, level + 1);
    }

    return updatedItem;
  });
};

export const validateNavigationHierarchy = (items: NavigationItem[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const allKeys = new Set<string>();

  const validateRecursive = (navItems: NavigationItem[], currentLevel: number, path: string[] = []) => {
    navItems.forEach((item, index) => {

      if (currentLevel > 3) {
        errors.push(i18n.t('common:navigation.errors.level_exceeded', 'Navigation item "{{title}}" exceeds 3-level limit', { title: navigationTitleText(item.title) }));
      }

      if (allKeys.has(item.key)) {
        errors.push(i18n.t('common:navigation.errors.duplicate_key', 'Navigation item key "{{key}}" is duplicated', { key: item.key }));
      } else {
        allKeys.add(item.key);
      }

      if (path.includes(item.key)) {
        errors.push(i18n.t('common:navigation.errors.circular_reference', 'Navigation item "{{title}}" has circular reference', { title: navigationTitleText(item.title) }));
      }

      if (item.children && item.children.length > 0) {

        validateRecursive(item.children, currentLevel + 1, [...path, item.key]);
      } else {

        if (!item.title || navigationTitleText(item.title).trim() === '') {
          errors.push(i18n.t('common:navigation.errors.leaf_node_title_required', 'Leaf node must have a title'));
        }
      }
    });
  };

  validateRecursive(items, 1);

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const findNavigationItem = (items: NavigationItem[], key: string): NavigationItem | null => {
  for (const item of items) {
    if (item.key === key) {
      return item;
    }
    if (item.children) {
      const found = findNavigationItem(item.children, key);
      if (found) return found;
    }
  }
  return null;
};

export const findParentItem = (items: NavigationItem[], childKey: string): NavigationItem | null => {
  for (const item of items) {
    if (item.children) {

      if (item.children.some(child => child.key === childKey)) {
        return item;
      }

      const found = findParentItem(item.children, childKey);
      if (found) return found;
    }
  }
  return null;
};

export const addNavigationItem = (
  items: NavigationItem[], 
  newItem: Omit<NavigationItem, 'level' | 'hasChildren'>, 
  parentKey?: string
): NavigationItem[] => {
  const newItems = [...items];

  if (parentKey) {
    const addToParent = (navItems: NavigationItem[]): NavigationItem[] => {
      return navItems.map(item => {
        if (item.key === parentKey) {
          return {
            ...item,
            children: [
              ...(item.children || []),
              {
                ...newItem,
                path: '',
                pageParameters: newItem.pageParameters || {},
                level: (item.level || 1) + 1,
                parentKey,
                hasChildren: false
              }
            ]
          };
        }
        if (item.children) {
          return { ...item, children: addToParent(item.children) };
        }
        return item;
      });
    };
    return calculateNavigationLevels(addToParent(newItems));
  } else {

    newItems.push({
      ...newItem,
      path: '', 
      pageParameters: newItem.pageParameters || {}, 
      level: 1,
      hasChildren: false
    });
    return calculateNavigationLevels(newItems);
  }
};

export const removeNavigationItem = (items: NavigationItem[], keyToRemove: string): NavigationItem[] => {
  const removeRecursive = (navItems: NavigationItem[]): NavigationItem[] => {
    return navItems.filter(item => {
      if (item.key === keyToRemove) return false;
      if (item.children) {
        item.children = removeRecursive(item.children);
      }
      return true;
    });
  };

  return calculateNavigationLevels(removeRecursive(items));
};

export const flattenNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
  const flattened: NavigationItem[] = [];

  const flatten = (navItems: NavigationItem[]) => {
    navItems.forEach(item => {
      flattened.push(item);
      if (item.children) {
        flatten(item.children);
      }
    });
  };

  flatten(items);
  return flattened;
};

export const getUsedPageKeys = (items: any[]): Set<string> => {
  const usedPages = new Set<string>();

  const traverse = (nodeItems: any[]) => {
    nodeItems.forEach(item => {

      const usedPageKey = item.linkedPage || item.key;
      if (usedPageKey) {
        usedPages.add(usedPageKey);
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  };

  traverse(items);
  return usedPages;
};

export const getAvailablePages = (allPages: any[], navigationItems: any[]): any[] => {
  if (!allPages || !navigationItems) return allPages || [];

  const usedPageKeys = getUsedPageKeys(navigationItems);
  return allPages.filter((page: any) => !usedPageKeys.has(page.key));
};

export const getConfiguredPageKeys = (allPageKeys: string[], navigationItems: any[]): string[] => {
  if (!allPageKeys || !navigationItems) return [];

  const usedPageKeys = getUsedPageKeys(navigationItems);
  return allPageKeys.filter(pageKey => usedPageKeys.has(pageKey));
};

/** First matching nav item whose linked page or key equals {@param pageId} (DFS). */
export const findNavigationKeyForPage = (
  navigationItems: NavigationItem[] | undefined | null,
  pageId: string
): string | null => {
  if (!navigationItems?.length) {
    return null;
  }

  for (const item of navigationItems) {
    const linkedPage = item.linkedPage;
    const itemKey = item.key;
    if (linkedPage === pageId || itemKey === pageId) {
      return itemKey;
    }
    if (item.children?.length) {
      const found = findNavigationKeyForPage(item.children, pageId);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

/** Same encoding rules as TabManager route sync (omit communication-only trigger params). */
export const serializeWorkbenchUrlSearchParams = (params: Record<string, unknown>): string => {
  return Object.keys(params)
    .filter((key) => !isCommunicationOnlyParameter(key))
    .sort()
    .map((key) => {
      const value = params[key];
      const encodedKey = encodeURIComponent(key);
      if (typeof value === 'string') {
        return `${encodedKey}=${encodeURIComponent(value)}`;
      }
      return `${encodedKey}=${encodeURIComponent(JSON.stringify(value))}`;
    })
    .join('&');
};

export type DefaultLandingResolved = {
  pageId: string;
  /** Includes leading `?` when non-empty. */
  queryString: string;
};

const isNonEmptyDefaultValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value !== '__none__';

const resolveFirstVisibleNavigationLanding = (
  items: NavigationItem[],
  pagesMap: Record<string, unknown>,
  currentMemberId?: string | null,
  visibleWhenContext?: VisibleWhenContext
): DefaultLandingResolved | null => {
  const firstVisibleItem = findFirstVisibleNavigationEntry(items, pagesMap, currentMemberId, visibleWhenContext);
  if (!firstVisibleItem) {
    return null;
  }

  const targetPageId = getNavigationTargetPageId(firstVisibleItem);
  if (!targetPageId) {
    return null;
  }

  return {
    pageId: targetPageId,
    queryString: buildNavigationQueryString(firstVisibleItem),
  };
};

/** Resolves default landing URL from appConfig; omitting defaultOpenType uses page mode (backward compatible). */
export const resolveDefaultWorkbenchLanding = (
  appConfig:
    | {
        defaultOpenType?: string;
        defaultPage?: string;
        defaultNavigationKey?: string;
        navigation?: { items?: NavigationItem[] };
      }
    | undefined,
  pages: Record<string, unknown> | undefined,
  currentMemberId?: string | null,
  options?: { fallback?: 'default' | 'navigation'; visibleWhenContext?: VisibleWhenContext }
): DefaultLandingResolved | null => {
  const items = appConfig?.navigation?.items ?? [];
  const pagesMap = pages ?? {};
  const fallback = options?.fallback ?? 'default';
  const visibleWhenContext = options?.visibleWhenContext;
  // A configured default that this user cannot see (members/visibleWhen gate) must not
  // dead-end on null: land on the first visible navigation entry instead. Only explicit
  // "no default" configs ('' / '__none__') keep the null result in default fallback mode.
  let configuredDefaultDenied = false;

  if (
    appConfig?.defaultOpenType === 'navigation' &&
    isNonEmptyDefaultValue(appConfig.defaultNavigationKey)
  ) {
    const navItem = findNavigationItem(items, appConfig.defaultNavigationKey);
    if (
      navItem &&
      (navItem.children?.length ?? 0) === 0 &&
      isNavigationItemVisibleToMember(navItem, currentMemberId, undefined, visibleWhenContext)
    ) {
      const targetPageId = getNavigationTargetPageId(navItem);
      if (targetPageId && pagesMap[targetPageId]) {
        return {
          pageId: targetPageId,
          queryString: buildNavigationQueryString(navItem),
        };
      }
    }
    if (navItem) {
      configuredDefaultDenied = true;
    }
  }

  const defaultPage = appConfig?.defaultPage;
  if (isNonEmptyDefaultValue(defaultPage) && pagesMap[defaultPage]) {
    const pageNavItems = findNavigationItemsForPage(items, defaultPage);
    if (pageNavItems.length === 0) {
      return { pageId: defaultPage, queryString: '' };
    }

    const visibleItem = pageNavItems.find((item) =>
      isNavigationItemVisibleToMember(item, currentMemberId, undefined, visibleWhenContext)
    );
    if (visibleItem) {
      return {
        pageId: defaultPage,
        queryString: buildNavigationQueryString(visibleItem),
      };
    }
    configuredDefaultDenied = true;
  }

  if (fallback === 'navigation' || configuredDefaultDenied) {
    return resolveFirstVisibleNavigationLanding(items, pagesMap, currentMemberId, visibleWhenContext);
  }

  return null;
};

/** Leaf navigation rows for default-open dropdowns (`titlePath` shows hierarchy). */
export const flattenLeafNavigationOptions = (
  items: NavigationItem[],
  titlePath: string[] = []
): { key: string; titlePath: string }[] => {
  const out: { key: string; titlePath: string }[] = [];
  for (const item of items) {
    const pathSeg = [...titlePath, navigationTitleText(item.title) || item.key];
    if (item.children?.length) {
      out.push(...flattenLeafNavigationOptions(item.children, pathSeg));
    } else {
      out.push({
        key: item.key,
        titlePath: pathSeg.join(' / '),
      });
    }
  }
  return out;
}; 
