import {
  getFilterEmitParamNames,
  type FilterConfig,
} from '../renderers/filter-panel/FilterPanelRenderer';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * PageParam names emitted by the FilterPanel components of a page config — the authoritative
 * ownership set for fetch gates and for ParameterContext's re-init reconciliation.
 *
 * Derived statically from the page config (not from heuristics on parameter names), so:
 * - drill params like `pluId` (no FilterPanel on the page emits them) are never claimed;
 * - pages without a FilterPanel yield an empty set, and their consumers gate on nothing.
 *
 * The components tree is scanned generically (any nested object/array) because container
 * components (Container children, Tabs items, grid cells) each nest differently.
 */
export function collectPageFilterPanelParamNames(components: unknown): string[] {
  const names = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isPlainObject(node)) return;

    if (node.type === 'FilterPanel') {
      const componentId = typeof node.id === 'string' ? node.id : '';
      const props = isPlainObject(node.props) ? node.props : {};
      const filters = Array.isArray(props.filters) ? (props.filters as FilterConfig[]) : [];
      if (componentId) {
        filters.forEach((filter) => {
          if (!filter || typeof filter.key !== 'string') return;
          getFilterEmitParamNames(filter, componentId).forEach((name) => names.add(name));
        });
      }
    }

    Object.values(node).forEach(visit);
  };

  visit(components);
  return Array.from(names);
}
