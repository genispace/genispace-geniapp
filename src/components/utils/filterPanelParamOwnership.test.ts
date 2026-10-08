import { describe, expect, it } from 'vitest';
import { collectPageFilterPanelParamNames } from './filterPanelParamOwnership';

const filterPanel = {
  type: 'FilterPanel',
  id: 'sw-filter-global',
  props: {
    filters: [
      { key: 'view', type: 'segmented' },
      { key: 'storeId', type: 'pillSelect', multiple: true },
      { key: 'period', type: 'presetDateRange' },
    ],
  },
};

describe('collectPageFilterPanelParamNames', () => {
  it('collects emitted param names from FilterPanel components at any nesting depth', () => {
    const components = [
      { type: 'Container', id: 'c1', props: {}, children: [filterPanel] },
      { type: 'HeroCard', id: 'h1', props: {} },
    ];
    const names = collectPageFilterPanelParamNames(components);
    expect(names).toContain('sw-filter-global_view');
    expect(names).toContain('sw-filter-global_storeId');
    expect(names).toContain('sw-filter-global_period');
    expect(names).toContain('sw-filter-global_periodStart');
    expect(names).toContain('sw-filter-global_periodEnd');
    expect(names).toContain('sw-filter-global_periodHolidayKey');
  });

  it('collects the pillSelect GroupCount derived param only when configured', () => {
    const withGroupCount = {
      type: 'FilterPanel',
      id: 'sw-filter-global',
      props: {
        filters: [
          { key: 'storeId', type: 'pillSelect', multiple: true, groupCountField: 'store_group' },
        ],
      },
    };
    expect(collectPageFilterPanelParamNames([withGroupCount])).toContain(
      'sw-filter-global_storeIdGroupCount'
    );
    expect(collectPageFilterPanelParamNames([filterPanel])).not.toContain(
      'sw-filter-global_storeIdGroupCount'
    );
  });

  it('returns an empty set for pages without a FilterPanel (their gates stay open)', () => {
    expect(
      collectPageFilterPanelParamNames([{ type: 'List', id: 'l1', props: {} }])
    ).toEqual([]);
    expect(collectPageFilterPanelParamNames(undefined)).toEqual([]);
  });
});
