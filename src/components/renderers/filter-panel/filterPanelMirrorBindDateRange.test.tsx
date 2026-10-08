import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilterPanelRenderer, {
  __resetFilterPanelSharedState,
  buildMirrorBindDateRangeOverrides,
  buildStoreMirrorMap,
} from './FilterPanelRenderer';

// Mirror-pair bindGlobalDateRange normalization: a pillSelect ↔ filterSheet-tab pair (same
// datasourceId + value key) presents ONE logical option list, so `bindGlobalDateRange: true`
// set on EITHER side must make BOTH sides fetch with the panel's committed date range —
// otherwise the dropdown and the pinned chips show different store lists for the same period.

const { loadFilterOptionsMock } = vi.hoisted(() => ({
  loadFilterOptionsMock: vi.fn(),
}));

const emitBatchMock = vi.fn();
const appAccessMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'zh' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useComponentCommunication', () => ({
  useComponentCommunication: () => ({
    emit: vi.fn(),
    emitBatch: emitBatchMock,
  }),
}));

// The panel's committed date range lives on the bus: the dateRange filter `period` makes the
// panel resolve storeDateParamNames to filterPanel_period.startTime / .endTime, and bound
// option lists read those live via useParameters.
vi.mock('@/contexts/ParameterContext', () => ({
  useParameterContext: () => ({
    markParametersReady: vi.fn(),
    getCurrentTabParams: () => ({}),
  }),
  useParameters: () => ({
    'filterPanel_period.startTime': '2026-09-01',
    'filterPanel_period.endTime': '2026-09-27',
  }),
}));

vi.mock('@/hooks/useDatabaseDataSource', () => ({
  useDatabaseDataSource: () => ({
    data: [],
    loading: false,
    isInitialized: true,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWorkbenchAppAccess', () => ({
  useWorkbenchAppAccess: () => appAccessMock(),
}));

vi.mock('@genispace/shared-ui', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  RadioButtonGroup: () => null,
  DateRangeFilter: () => null,
  Calendar: () => null,
  MultiSelect: () => null,
  DialogInput: ({ value, onChange, ...props }: any) => (
    <input {...props} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock('@/ui/dialog-tag-input', () => ({
  DialogTagInput: () => null,
}));

// Datasource-backed option lists without network: bound fetches (queryParams present) return
// the 3 in-period stores; unbound fetches return all 4. A regression (one side of a mirror
// pair fetching unbound) is directly visible as 'Store Four' leaking in.
vi.mock('./filterOptionCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./filterOptionCache')>();
  return { ...actual, loadFilterOptions: loadFilterOptionsMock };
});

const BOUND_ROWS = [
  { store_code: 'S1', label_zh: 'Store One' },
  { store_code: 'S2', label_zh: 'Store Two' },
  { store_code: 'S3', label_zh: 'Store Three' },
];
const UNBOUND_ROWS = [...BOUND_ROWS, { store_code: 'S4', label_zh: 'Store Four' }];
const BOUND_PARAMS = { startDate: '2026-09-01', endDate: '2026-09-27' };

const STORE_DS = 'ds-store-list';
const OTHER_DS = 'ds-region-list';

const storeManagerAccess = {
  isUser: true,
  roles: ['store_manager'],
  permissionCodes: [],
  loading: false,
  applicationId: 'app-1',
};

const hqAccess = {
  isUser: true,
  roles: ['hq_staff'],
  permissionCodes: [],
  loading: false,
  applicationId: 'app-1',
};

const dateRangeFilter = { key: 'period', type: 'dateRange', label: '周期' } as any;

const storePill = (bound?: boolean) =>
  ({
    key: 'storeId',
    type: 'pillSelect',
    multiple: true,
    label: '门店',
    dataSource: {
      datasourceId: STORE_DS,
      valueField: 'store_code',
      labelField: 'label_zh',
      ...(bound ? { bindGlobalDateRange: true } : {}),
    },
    valueKey: 'store_code',
  }) as any;

const storeSheet = (bound?: boolean) =>
  ({
    key: 'sheet',
    type: 'filterSheet',
    label: '筛选',
    sections: [
      {
        key: 'store',
        kind: 'layeredStore',
        tabs: [
          {
            key: 'storeIds',
            label: '门店',
            dataSource: {
              datasourceId: STORE_DS,
              valueKey: 'store_code',
              labelKey: 'label_zh',
              ...(bound ? { bindGlobalDateRange: true } : {}),
            },
          },
        ],
      },
    ],
  }) as any;

const regionPill = () =>
  ({
    key: 'regionId',
    type: 'pillSelect',
    multiple: true,
    label: '大区',
    dataSource: { datasourceId: OTHER_DS, valueField: 'store_code', labelField: 'label_zh' },
    valueKey: 'store_code',
  }) as any;

const renderPanel = (filters: any[], roleFilterRules?: any) =>
  render(
    <MemoryRouter>
      <FilterPanelRenderer
        componentId="filterPanel"
        filters={filters}
        roleFilterRules={roleFilterRules}
      />
    </MemoryRouter>
  );

// Every loadFilterOptions call for one datasource, as { cacheKey, params }.
const callsFor = (datasourceId: string) =>
  loadFilterOptionsMock.mock.calls
    .filter((call) => call[1] === datasourceId)
    .map((call) => ({ cacheKey: call[0] as string, params: call[5] as Record<string, unknown> | undefined }));

describe('buildMirrorBindDateRangeOverrides (pure)', () => {
  it('upgrades the unbound pill when the paired sheet tab is bound', () => {
    const filters = [storePill(false), storeSheet(true)];
    const mirrorMap = buildStoreMirrorMap(filters);
    expect(mirrorMap).toEqual({ storeId: 'storeIds', storeIds: 'storeId' });
    expect(buildMirrorBindDateRangeOverrides(filters, mirrorMap)).toEqual({ storeId: true });
  });

  it('upgrades the unbound sheet tab when the paired pill is bound', () => {
    const filters = [storePill(true), storeSheet(false)];
    const mirrorMap = buildStoreMirrorMap(filters);
    expect(buildMirrorBindDateRangeOverrides(filters, mirrorMap)).toEqual({ storeIds: true });
  });

  it('returns no overrides when both sides agree (both bound or both unbound)', () => {
    const bothBound = [storePill(true), storeSheet(true)];
    expect(buildMirrorBindDateRangeOverrides(bothBound, buildStoreMirrorMap(bothBound))).toEqual({});
    const bothUnbound = [storePill(false), storeSheet(false)];
    expect(buildMirrorBindDateRangeOverrides(bothUnbound, buildStoreMirrorMap(bothUnbound))).toEqual({});
  });

  it('ignores filters that are not part of a mirror pair', () => {
    const filters = [regionPill(), storeSheet(true)];
    const mirrorMap = buildStoreMirrorMap(filters);
    expect(mirrorMap).toEqual({});
    expect(buildMirrorBindDateRangeOverrides(filters, mirrorMap)).toEqual({});
  });
});

describe('FilterPanelRenderer mirror-pair bindGlobalDateRange normalization', () => {
  beforeEach(() => {
    __resetFilterPanelSharedState();
    vi.clearAllMocks();
    appAccessMock.mockReturnValue(hqAccess);
    loadFilterOptionsMock.mockImplementation(async (...args: unknown[]) =>
      (args[5] ? BOUND_ROWS : UNBOUND_ROWS)
    );
  });

  it('sheet tab bound + pill unbound: BOTH sides fetch with the period params and share one cacheKey, so pinned chips and the dropdown list agree', async () => {
    appAccessMock.mockReturnValue(storeManagerAccess);
    renderPanel(
      [dateRangeFilter, storePill(false), storeSheet(true)],
      { roles: ['store_manager'], pinnedChipsFilters: ['storeIds'] }
    );

    // Pinned chips render the period-scoped list (3 stores), not the full 4.
    await screen.findByText('Store One');
    expect(screen.getByText('Store Two')).toBeInTheDocument();
    expect(screen.getByText('Store Three')).toBeInTheDocument();
    expect(screen.queryByText('Store Four')).not.toBeInTheDocument();

    const calls = callsFor(STORE_DS);
    // Pill field + pinned sheet chips both fetched.
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // Before the fix the pill side fetched with NO params (period-independent) while the
    // sheet side fetched bound — the two lists disagreed. Now every call is bound...
    calls.forEach((c) => expect(c.params).toEqual(BOUND_PARAMS));
    // ...and identical params mean one shared cacheKey: a single logical option list.
    expect(new Set(calls.map((c) => c.cacheKey)).size).toBe(1);
  });

  it('pill bound + sheet tab unbound: the sheet side inherits the binding too', async () => {
    appAccessMock.mockReturnValue(storeManagerAccess);
    renderPanel(
      [dateRangeFilter, storePill(true), storeSheet(false)],
      { roles: ['store_manager'], pinnedChipsFilters: ['storeIds'] }
    );

    await screen.findByText('Store One');
    expect(screen.queryByText('Store Four')).not.toBeInTheDocument();

    const calls = callsFor(STORE_DS);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    calls.forEach((c) => expect(c.params).toEqual(BOUND_PARAMS));
    expect(new Set(calls.map((c) => c.cacheKey)).size).toBe(1);
  });

  it('neither side bound: no period params are sent (no behavior change for unbound pairs)', async () => {
    renderPanel([dateRangeFilter, storePill(false), storeSheet(false)]);

    await waitFor(() => {
      expect(callsFor(STORE_DS).length).toBeGreaterThanOrEqual(1);
    });
    callsFor(STORE_DS).forEach((c) => expect(c.params).toBeUndefined());
  });

  it('does not leak the binding to an unrelated pill on another datasource', async () => {
    renderPanel([dateRangeFilter, storePill(false), storeSheet(true), regionPill()]);

    await waitFor(() => {
      expect(callsFor(STORE_DS).length).toBeGreaterThanOrEqual(1);
      expect(callsFor(OTHER_DS).length).toBeGreaterThanOrEqual(1);
    });
    callsFor(STORE_DS).forEach((c) => expect(c.params).toEqual(BOUND_PARAMS));
    callsFor(OTHER_DS).forEach((c) => expect(c.params).toBeUndefined());
  });
});
