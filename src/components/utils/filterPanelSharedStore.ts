// Cross-page committed-state sharing between FilterPanel instances configured with the SAME
// componentId (one logical filter bar rendered once per page). Each page has an isolated
// parameter bus (ParameterProvider per tab), so carrying selections across pages requires
// two pieces: new panels hydrate from this store at mount, and live sibling panels fold
// published values and re-emit them onto their own page's bus (data components only read
// their own page's bus). Dates are intentionally excluded (per-page preset memory is the
// established behavior).
//
// Values are indexed two ways:
// - by componentId → filter-keyed record: panel mount hydration and sibling folds read this;
// - by bus param name (`${componentId}_${filterKey}`): ParameterContext's re-init
//   reconciliation refreshes kept owned values from here, so a lingering tab-bus entry can
//   never be STALER than the latest cross-page commit (an unmounted page's panel cannot
//   re-emit, and its kept value would otherwise win hydration over the newer snapshot).
// Zero-dependency module: both FilterPanelRenderer and ParameterContext import it, so it
// must not import from either (cycle).

const sharedPanelValues = new Map<string, Record<string, any>>();
const sharedPanelParamValues = new Map<string, any>();
const sharedPanelSubscribers = new Map<string, Set<(values: Record<string, any>, fromInstance: string) => void>>();

export function publishSharedPanelValues(
  componentId: string,
  fromInstance: string,
  values: Record<string, any>,
  paramsByName?: Record<string, any>
) {
  sharedPanelValues.set(componentId, { ...values });
  if (paramsByName) {
    Object.entries(paramsByName).forEach(([paramName, value]) => {
      sharedPanelParamValues.set(paramName, value);
    });
  }
  sharedPanelSubscribers.get(componentId)?.forEach(fn => {
    try { fn(values, fromInstance); } catch { /* one broken sibling must not block the rest */ }
  });
}

export function getSharedPanelValues(componentId: string): Record<string, any> | undefined {
  return sharedPanelValues.get(componentId);
}

// Latest cross-page commit for one bus param name; `undefined` means nothing was ever
// published for it (callers must treat that as "no fresher value", not as a real value).
export function getSharedPanelParamValue(paramName: string): any {
  return sharedPanelParamValues.get(paramName);
}

export function hasSharedPanelParamValue(paramName: string): boolean {
  return sharedPanelParamValues.has(paramName);
}

export function subscribeSharedPanelValues(
  componentId: string,
  handler: (values: Record<string, any>, fromInstance: string) => void
): () => void {
  let subs = sharedPanelSubscribers.get(componentId);
  if (!subs) { subs = new Set(); sharedPanelSubscribers.set(componentId, subs); }
  subs.add(handler);
  return () => { subs.delete(handler); };
}

/** Test-only: module-level stores otherwise leak committed state across test cases. */
export function __resetFilterPanelSharedStore() {
  sharedPanelValues.clear();
  sharedPanelParamValues.clear();
  sharedPanelSubscribers.clear();
}
