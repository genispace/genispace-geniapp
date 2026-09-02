/**
 * Workbench presentation i18n: merge `metadata.locales` into config for display.
 * Mirrors operator `metadata.locales` pattern — canonical strings at top level,
 * localized overrides under `metadata.locales.<lng>`.
 */

export type WorkbenchLocaleMetadata = {
  locales?: Record<string, WorkbenchLocalePatch>;
};

export type WorkbenchLocalePatch = {
  appConfig?: Record<string, unknown>;
  pages?: Record<string, PageLocalePatch>;
  /** Runtime label map for API/datasource display strings (zh → en). */
  labels?: Record<string, string>;
};

export type PageLocalePatch = {
  title?: string;
  description?: string;
  components?: Record<string, ComponentLocalePatch>;
};

export type ComponentLocalePatch = Record<string, unknown>;

export type WorkbenchConfigWithLocales = {
  appConfig?: Record<string, unknown>;
  pages?: Record<string, Record<string, unknown>>;
  metadata?: WorkbenchLocaleMetadata;
  [key: string]: unknown;
};

const ARRAY_ITEM_KEY_FIELDS = ['key', 'dataIndex', 'id', 'value', 'guide_id', 'store_code', 'row_id', 'plu'] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

const getArrayItemMatchKey = (item: Record<string, unknown>, index: number): string => {
  for (const field of ARRAY_ITEM_KEY_FIELDS) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return `__index_${index}`;
};

/** Deep-merge locale patch objects; arrays merge by stable item keys when possible. */
export const mergeLocaleObjects = (
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...base };

  for (const [key, patchVal] of Object.entries(patch)) {
    if (patchVal === undefined) {
      continue;
    }

    const baseVal = out[key];

    if (Array.isArray(patchVal) && Array.isArray(baseVal)) {
      out[key] = mergeLocaleArrays(baseVal, patchVal);
      continue;
    }

    if (isPlainObject(patchVal) && isPlainObject(baseVal)) {
      out[key] = mergeLocaleObjects(baseVal, patchVal);
      continue;
    }

    out[key] = patchVal;
  }

  return out;
};

export const mergeLocaleArrays = (base: unknown[], patch: unknown[]): unknown[] => {
  const patchByKey = new Map<string, unknown>();
  patch.forEach((item, index) => {
    if (isPlainObject(item)) {
      patchByKey.set(getArrayItemMatchKey(item, index), item);
    }
  });

  return base.map((item, index) => {
    if (!isPlainObject(item)) {
      return item;
    }

    const matchKey = getArrayItemMatchKey(item, index);
    const itemPatch = patchByKey.get(matchKey);
    if (!isPlainObject(itemPatch)) {
      return item;
    }

    return mergeLocaleObjects(item, itemPatch);
  });
};

const mergeNavigationItems = (
  baseItems: unknown[] | undefined,
  patchItems: unknown[] | undefined
): unknown[] | undefined => {
  if (!patchItems?.length) {
    return baseItems;
  }
  if (!baseItems?.length) {
    return patchItems;
  }
  return mergeLocaleArrays(baseItems, patchItems);
};

const localizeComponentTree = (
  component: Record<string, unknown>,
  patches: Record<string, ComponentLocalePatch>
): Record<string, unknown> => {
  const componentId = typeof component.id === 'string' ? component.id : undefined;
  const patch = componentId ? patches[componentId] : undefined;
  let result = patch ? mergeLocaleObjects(component, patch) : { ...component };

  if (Array.isArray(result.children)) {
    result = {
      ...result,
      children: result.children.map((child) =>
        isPlainObject(child) ? localizeComponentTree(child, patches) : child
      ),
    };
  }

  const props = result.props;
  if (isPlainObject(props) && Array.isArray(props.items)) {
    result = {
      ...result,
      props: {
        ...props,
        items: props.items.map((item) => {
          if (!isPlainObject(item)) {
            return item;
          }
          const nestedComponent = item.component;
          if (isPlainObject(nestedComponent)) {
            return {
              ...item,
              component: localizeComponentTree(nestedComponent, patches),
            };
          }
          return item;
        }),
      },
    };
  }

  return result;
};

/** Apply page-level locale patch (component patches keyed by component id). */
export const applyPageConfigLocale = <T extends Record<string, unknown>>(
  pageConfig: T,
  pagePatch?: PageLocalePatch
): T => {
  if (!pagePatch) {
    return pageConfig;
  }

  let result = cloneValue(pageConfig) as Record<string, unknown>;

  if (pagePatch.title !== undefined) {
    result.title = pagePatch.title;
  }
  if (pagePatch.description !== undefined) {
    result.description = pagePatch.description;
  }

  const componentPatches = pagePatch.components;
  if (componentPatches && Array.isArray(result.components)) {
    result = {
      ...result,
      components: result.components.map((component) =>
        isPlainObject(component) ? localizeComponentTree(component, componentPatches) : component
      ),
    };
  }

  return result as T;
};

/** Apply appConfig locale patch (navigation items merge by `key`). */
export const applyAppConfigLocale = <T extends Record<string, unknown>>(
  appConfig: T,
  appConfigPatch?: Record<string, unknown>
): T => {
  if (!appConfigPatch) {
    return appConfig;
  }

  const result = cloneValue(appConfig);
  const merged = mergeLocaleObjects(result, appConfigPatch);

  const baseNavigation = isPlainObject(result.navigation) ? result.navigation : undefined;
  const patchNavigation = isPlainObject(appConfigPatch.navigation) ? appConfigPatch.navigation : undefined;

  if (baseNavigation && patchNavigation && Array.isArray(baseNavigation.items)) {
    merged.navigation = {
      ...baseNavigation,
      ...patchNavigation,
      items: mergeNavigationItems(
        baseNavigation.items as unknown[],
        patchNavigation.items as unknown[] | undefined
      ),
    };
  }

  return merged as T;
};

export type ApplyWorkbenchConfigLocaleOptions = {
  /** Keep `metadata` on the returned object (for editors). Default false. */
  keepMetadata?: boolean;
};

/**
 * Merge `metadata.locales[lng]` into workbench config for display.
 * When no locale patch exists for `lng`, returns a clone of the original config.
 */
export const applyWorkbenchConfigLocale = (
  config: WorkbenchConfigWithLocales | null | undefined,
  lng: string,
  options: ApplyWorkbenchConfigLocaleOptions = {}
): WorkbenchConfigWithLocales | null | undefined => {
  if (!config) {
    return config;
  }

  const keepMetadata = options.keepMetadata === true;
  const localePatch = config.metadata?.locales?.[lng];

  if (!localePatch) {
    const cloned = cloneValue(config);
    if (!keepMetadata && cloned.metadata !== undefined) {
      delete cloned.metadata;
    }
    return cloned;
  }

  const out = cloneValue(config);

  if (localePatch.appConfig && out.appConfig && isPlainObject(out.appConfig)) {
    out.appConfig = applyAppConfigLocale(out.appConfig, localePatch.appConfig);
  }

  if (localePatch.pages && out.pages && isPlainObject(out.pages)) {
    const localizedPages: Record<string, Record<string, unknown>> = { ...out.pages };
    for (const [pageId, pagePatch] of Object.entries(localePatch.pages)) {
      const pageConfig = localizedPages[pageId];
      if (pageConfig && isPlainObject(pageConfig)) {
        localizedPages[pageId] = applyPageConfigLocale(pageConfig, pagePatch);
      }
    }
    out.pages = localizedPages;
  }

  if (!keepMetadata && out.metadata !== undefined) {
    delete out.metadata;
  }

  return out;
};

/** Read locale patch for a single page without cloning the full workbench config. */
export const getPageLocalePatch = (
  metadata: WorkbenchLocaleMetadata | undefined,
  lng: string,
  pageId: string
): PageLocalePatch | undefined => metadata?.locales?.[lng]?.pages?.[pageId];
