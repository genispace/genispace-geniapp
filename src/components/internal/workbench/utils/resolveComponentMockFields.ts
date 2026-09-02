/**
 * Resolves component mock config (root-level and props) so renderers still see mock/chart fields
 * when only props change (e.g. chartColorScheme).
 *
 * See also:
 * - ~/memory/knowledge/workbench-useMockData.md
 * - apps/workbench/docs/useMockData-conventions.md
 */

export interface ComponentMockSource {
  useMockData?: boolean;
  mockData?: unknown;
  props?: Record<string, unknown>;
}

export function resolveUseMockData(component: ComponentMockSource | null | undefined): boolean {
  if (!component) return false;

  if (component.useMockData === false) return false;
  if (component.props?.useMockData === false) return false;

  if (component.useMockData === true) return true;
  if (component.props?.useMockData === true) return true;

  // Infer enabled when mock rows exist but the flag was omitted (legacy saves)
  return resolveMockDataRows(component).length > 0;
}

function isMockExplicitlyDisabled(component: ComponentMockSource): boolean {
  return component.useMockData === false || component.props?.useMockData === false;
}

/** Normalize before save: set root useMockData true when rows exist unless explicitly disabled */
export function normalizeComponentMockFlags<T extends ComponentMockSource>(component: T): T {
  const rows = resolveMockDataRows(component);

  if (isMockExplicitlyDisabled(component)) {
    const props =
      component.props && typeof component.props === 'object'
        ? { ...component.props, useMockData: false }
        : component.props;
    return { ...component, useMockData: false, props } as T;
  }

  if (rows.length === 0) {
    return { ...component, useMockData: false };
  }

  return { ...component, useMockData: true, mockData: component.mockData ?? rows };
}

/**
 * Merge parent pageConfig into local state: parent wins; keep local mock/chart props parent lacks.
 */
export function mergePageComponentConfig<T extends ComponentMockSource & { id?: string; props?: Record<string, unknown> }>(
  parent: T,
  local: T
): T {
  if (!parent?.id || parent.id !== local?.id) {
    return parent;
  }

  const parentProps = (parent.props ?? {}) as Record<string, unknown>;
  const localProps = (local.props ?? {}) as Record<string, unknown>;
  const parentMockRows = resolveMockDataRows(parent);
  const localMockRows = resolveMockDataRows(local);

  const mergedProps: Record<string, unknown> = { ...localProps, ...parentProps };
  if (parentProps.chartColorScheme === undefined && localProps.chartColorScheme !== undefined) {
    mergedProps.chartColorScheme = localProps.chartColorScheme;
  }
  if (
    (!Array.isArray(parentProps.colors) || parentProps.colors.length === 0) &&
    Array.isArray(localProps.colors) &&
    localProps.colors.length > 0
  ) {
    mergedProps.colors = localProps.colors;
  }

  const mockOff =
    parent.useMockData === false ||
    parentProps.useMockData === false ||
    local.useMockData === false ||
    localProps.useMockData === false;

  let useMockData: boolean | undefined;
  if (mockOff) {
    mergedProps.useMockData = false;
    useMockData = false;
  } else if (
    parent.useMockData === true ||
    parentProps.useMockData === true ||
    parentMockRows.length > 0
  ) {
    useMockData = true;
  } else if (local.useMockData === true || localMockRows.length > 0) {
    useMockData = true;
  } else {
    useMockData = parent.useMockData ?? local.useMockData;
  }

  const merged: T = {
    ...parent,
    props: mergedProps,
    mockData: parentMockRows.length > 0 ? parent.mockData : local.mockData ?? parent.mockData,
    useMockData,
  };

  return normalizeComponentMockFlags(merged);
}

/** Normalize mockData / props.mockData to an array of row objects for charts */
export function resolveMockDataRows(component: ComponentMockSource | null | undefined): Record<string, unknown>[] {
  if (!component) return [];
  const raw = component.mockData ?? component.props?.mockData;
  return normalizeMockDataRows(raw);
}

/** Single-row mock object for Form display mode and HeroCard */
export function resolveComponentMockRecord(
  component: ComponentMockSource | null | undefined
): Record<string, unknown> {
  if (!resolveUseMockData(component)) return {};
  const rows = resolveMockDataRows(component);
  return rows[0] ?? {};
}

export function normalizeMockDataRows(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      return normalizeMockDataRows(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw.filter(
      (row): row is Record<string, unknown> =>
        row != null && typeof row === 'object' && !Array.isArray(row)
    );
  }

  if (typeof raw === 'object') {
    return [raw as Record<string, unknown>];
  }

  return [];
}
