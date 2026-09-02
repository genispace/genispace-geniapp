/**
 * Nesting depth of a layout container (Container | Card | Tabs) from the page root.
 * Page is not counted. Top-level container depth = 0 (matches PageComponentRenderer default nestingLevel).
 */

const LAYOUT_CONTAINER_TYPES = new Set(['Container', 'Tabs', 'Card', 'MetricCarousel']);

function getLayoutContainerChildList(component: Record<string, unknown>): unknown[] {
  const type = component.type as string | undefined;
  if (type === 'Tabs') {
    const items = (component.props as { items?: unknown[] } | undefined)?.items;
    if (!Array.isArray(items)) return [];
    const all: unknown[] = [];
    for (const tab of items) {
      if (!tab || typeof tab !== 'object') continue;
      const t = tab as { components?: unknown[]; component?: unknown };
      if (Array.isArray(t.components)) all.push(...t.components);
      else if (t.component) all.push(t.component);
    }
    return all;
  }
  const fromTop = component.children as unknown[] | undefined;
  if (Array.isArray(fromTop) && fromTop.length > 0) return fromTop;
  const props = component.props as { children?: unknown[] } | undefined;
  if (Array.isArray(props?.children) && props.children.length > 0) return props.children;
  return [];
}

export function getLayoutContainerNestingLevel(
  components: unknown[] | undefined,
  targetId: string,
  ancestorDepth = 0
): number | null {
  if (!Array.isArray(components)) return null;

  for (const raw of components) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const id = c.id as string | undefined;
    if (id === targetId) return ancestorDepth;

    const type = c.type as string | undefined;
    if (type && LAYOUT_CONTAINER_TYPES.has(type)) {
      const kids = getLayoutContainerChildList(c);
      const found = getLayoutContainerNestingLevel(kids as unknown[], targetId, ancestorDepth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}
