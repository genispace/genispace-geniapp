import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilterPanelRenderer, { __resetFilterPanelSharedState } from './FilterPanelRenderer';

// Ghost-selection display count (方案 C): a selected value that is NOT in the loaded option
// list (e.g. a store auto-selected before the date params were ready, then filtered out by
// the bound date window) renders nowhere — chips and the dropdown only show option-backed
// values — so "N selected" / "Confirm (N)" must count the INTERSECTION of the selection with
// the loaded options, not the raw selection length. The selection state itself is untouched
// (state-layer pruning is deferred as tech debt).

const { loadFilterOptionsMock } = vi.hoisted(() => ({
  loadFilterOptionsMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, opts?: Record<string, unknown>) => {
      let s = defaultValue || key;
      if (opts) {
        Object.entries(opts).forEach(([k, v]) => {
          s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }
      return s;
    },
    i18n: { language: 'zh' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useComponentCommunication', () => ({
  useComponentCommunication: () => ({
    emit: vi.fn(),
    emitBatch: vi.fn(),
  }),
}));

// Committed date range on the bus, so bindGlobalDateRange option fetches carry the period.
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
  useWorkbenchAppAccess: () => ({
    isUser: true,
    roles: [],
    permissionCodes: [],
    loading: false,
    applicationId: 'app-1',
  }),
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

vi.mock('./filterOptionCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./filterOptionCache')>();
  return { ...actual, loadFilterOptions: loadFilterOptionsMock };
});

// The period-bound option list: 3 stores. The ghost 'S4' only exists in the selection state.
const BOUND_ROWS = [
  { store_code: 'S1', label_zh: 'Store One' },
  { store_code: 'S2', label_zh: 'Store Two' },
  { store_code: 'S3', label_zh: 'Store Three' },
];

const STORE_DS = 'ds-store-list';

const dateRangeFilter = { key: 'period', type: 'dateRange', label: '周期' } as any;

// Mirror pair exactly as in production: the sheet tab binds the date range, the pill doesn't
// (normalized at runtime since 1.0.22 → both fetch the bound 3-store list).
const storePill = (defaultValue?: string[]) =>
  ({
    key: 'storeId',
    type: 'pillSelect',
    multiple: true,
    label: '门店',
    dataSource: { datasourceId: STORE_DS, valueField: 'store_code', labelField: 'label_zh' },
    valueKey: 'store_code',
    ...(defaultValue ? { defaultValue } : {}),
  }) as any;

const storeSheetBound = () =>
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
              bindGlobalDateRange: true,
            },
          },
        ],
      },
    ],
  }) as any;

const renderPanel = (filters: any[]) =>
  render(
    <MemoryRouter>
      <FilterPanelRenderer componentId="filterPanel" filters={filters} />
    </MemoryRouter>
  );

describe('PillSelect ghost-selection display count', () => {
  beforeEach(() => {
    __resetFilterPanelSharedState();
    vi.clearAllMocks();
    loadFilterOptionsMock.mockImplementation(async () => BOUND_ROWS);
  });

  it('mirror pair with a ghost value: trigger and Confirm count only option-backed values (3, not 4)', async () => {
    // Selection state holds 4 values: S1-S3 (in the bound option list) + ghost S4.
    renderPanel([dateRangeFilter, storePill(['S1', 'S2', 'S3', 'S4']), storeSheetBound()]);

    // Trigger counts the intersection with the loaded options.
    const trigger = await screen.findByRole('button', { name: /3 items selected/ });

    // Open the dropdown: 3 option chips (ghost renders nowhere) and Confirm shows (3).
    fireEvent.click(trigger);
    expect(await screen.findByText('Store One')).toBeInTheDocument();
    expect(screen.getByText('Store Two')).toBeInTheDocument();
    expect(screen.getByText('Store Three')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm (3)' })).toBeInTheDocument();
  });

  it('while the option list is still loading, falls back to the raw selection count (no flicker through 0)', async () => {
    loadFilterOptionsMock.mockImplementation(() => new Promise(() => {})); // never resolves
    renderPanel([dateRangeFilter, storePill(['S1', 'S2', 'S3', 'S4']), storeSheetBound()]);

    expect(await screen.findByRole('button', { name: /4 items selected/ })).toBeInTheDocument();
  });

  it('no ghost: count is unchanged (no regression for normal selections)', async () => {
    renderPanel([dateRangeFilter, storePill(['S1', 'S2', 'S3']), storeSheetBound()]);

    const trigger = await screen.findByRole('button', { name: /3 items selected/ });
    fireEvent.click(trigger);
    expect(await screen.findByRole('button', { name: 'Confirm (3)' })).toBeInTheDocument();
  });
});
