import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChartRenderer from './ChartRenderer';
import { ParameterContext } from '@/contexts/ParameterContext';

// 销售趋势图 No data — the REAL root cause behind the 1.0.24/1.0.25 acceptance FAILs.
// ChartRenderer resolves bound params INTO config.parameters and calls refetch() with no args,
// so useDatabaseDataSource builds its in-flight dedupe key from {datasourceId, params:{},
// additionalParams:{}} — CONSTANT across refetches, because the key never included
// config.parameters (the actual request-body source on the config branch). While the previous
// request is in flight, EVERY superseding refetch is silently dropped by the
// `lastRequestKeyRef === requestKey` guard before any HTTP call: the fresh-value fetch never
// reaches the wire and the chart freezes on the stale (empty) response. Hero/明细 are immune
// because useBoundRows passes resolved values via additionalParams, which ARE part of the key —
// their second fetch takes the abort-supersede path instead. Slow cadence "works" only because
// the in-flight window closes between commits.
// These tests run the REAL useDatabaseDataSource (only apiClient is mocked) so the in-flight
// guard executes exactly as in production.

const DS = 'ds-sales-trend';
const OWNED_PARAM = 'filterPanel_storeIds';

const mocks = vi.hoisted(() => ({
  bus: {} as Record<string, unknown>,
  waitReady: true,
  post: vi.fn(),
}));

vi.mock('@/lib/api/apiClient', () => ({
  default: {
    post: (...args: unknown[]) => mocks.post(...args),
  },
}));

vi.mock('@/app/services/workbenchApi', () => ({
  withDatasourceVersion: (url: string) => url,
}));

vi.mock('@/utils/datasourceVersion', () => ({
  isDatasourceVersionNotFoundError: () => false,
  resolveDatasourceVersion: () => undefined,
  resolveRuntimeDatasourceVersion: () => undefined,
  useDatasourceVersions: () => undefined,
}));

vi.mock('@/mobile/utils/workbenchSpaceSyncGate', () => ({
  isWorkbenchSpaceSyncPending: () => false,
  subscribeWorkbenchSpaceSyncGate: () => () => {},
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, defaultValue?: string) => defaultValue ?? _key,
    }),
  };
});

vi.mock('@/locales/i18n', () => ({
  default: { t: (_key: string, defaultValue?: string) => defaultValue ?? _key },
}));

vi.mock('@/contexts/WorkbenchConfigLocaleContext', () => ({
  useWorkbenchConfigLocale: () => ({
    language: 'en',
    localizeRows: (rows: Record<string, unknown>[]) => rows,
  }),
}));

vi.mock('@/mobile/mobileFlowLayoutContext', () => ({
  useMobileFlowLayout: () => false,
}));

vi.mock('@/layout/grid24CellContext', () => ({
  useGrid24FillCell: () => false,
}));

vi.mock('@/hooks/useWaitForParameters', () => ({
  useWaitForParameters: (params?: unknown) => ({
    ready: params ? mocks.waitReady : true,
    isReady: () => mocks.waitReady,
  }),
}));

vi.mock('@/hooks/useComponentCommunication', () => ({
  // A FRESH getCurrentParameter identity per render: makes the fetch effect re-run on every
  // render of a mid-burst commit, exactly like the production emit/render fan-out.
  useComponentCommunication: () => ({
    getCurrentParameter: (k: string) => mocks.bus[k],
  }),
}));

// The real module only needs its context OBJECT shared between this test and the component
// (the component reads useContext(ParameterContext)?.filterPanelParamNames); useParameters is
// stubbed. A locally created context keeps the mock self-contained (no importOriginal).
vi.mock('@/contexts/ParameterContext', () => ({
  ParameterContext: React.createContext(null),
  useParameters: () => undefined,
}));

vi.mock('@/utils/styleUtils', () => ({
  applyCustomStyles: (_id: string, _styles: unknown, className?: string) => ({
    className,
    style: {},
  }),
}));

vi.mock('@/renderers/shared/ViewToggleButton', () => ({
  ViewToggleButton: () => null,
}));

vi.mock('@/skeleton', () => ({
  Skeleton: () => null,
  ChartAreaSkeleton: () => null,
  ChartEmptyState: () => null,
}));

vi.mock('@genispace/shared-ui', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  Z_INDEX_CLASSES: { STICKY_HEADER: 'z-sticky-header' },
  toast: vi.fn(),
}));

vi.mock('recharts', () => {
  const capture = (name: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid={name}>{children}</div>
  );
  const leaf = (name: string) => () => <div data-testid={name} />;
  return {
    ResponsiveContainer: capture('responsive-container'),
    LineChart: capture('line-chart'),
    Line: leaf('line'),
    AreaChart: capture('area-chart'),
    Area: leaf('area'),
    BarChart: capture('bar-chart'),
    Bar: capture('bar'),
    PieChart: capture('pie-chart'),
    Pie: capture('pie'),
    Cell: leaf('cell'),
    RadarChart: capture('radar-chart'),
    Radar: leaf('radar'),
    XAxis: leaf('x-axis'),
    YAxis: leaf('y-axis'),
    CartesianGrid: leaf('grid'),
    Tooltip: leaf('tooltip'),
    Legend: leaf('legend'),
    PolarGrid: leaf('polar-grid'),
    PolarAngleAxis: leaf('polar-angle-axis'),
    PolarRadiusAxis: leaf('polar-radius-axis'),
    LabelList: leaf('label-list'),
    Customized: () => null,
    ComposedChart: capture('composed-chart'),
    ReferenceLine: leaf('reference-line'),
  };
});

const legacyConfig = {
  datasourceId: DS,
  parameters: { storeIds: { type: 'parameter', source: OWNED_PARAM } },
};

// opt-out binding (waitForValue:false): only the FilterPanel-owned patch may gate it.
const optOutConfig = {
  datasourceId: DS,
  parameters: { storeIds: { type: 'parameter', source: OWNED_PARAM, waitForValue: false } },
};

function chartTree(config: unknown, withOwnedProvider = false) {
  const chart = (
    <ChartRenderer
      id="chart-inflight"
      chartType="line"
      title="销售趋势"
      data={[]}
      xField="d"
      yField={['v']}
      databaseDataSourceConfig={config as never}
      pageParams={{}}
    />
  );
  return withOwnedProvider ? (
    <ParameterContext.Provider value={{ filterPanelParamNames: [OWNED_PARAM] } as never}>
      {chart}
    </ParameterContext.Provider>
  ) : (
    chart
  );
}

const postBodies = () => mocks.post.mock.calls.map((c) => (c[1] as Record<string, unknown>).storeIds);
const postSignal = (i: number) => (mocks.post.mock.calls[i][2] as { signal: AbortSignal }).signal;

beforeEach(() => {
  mocks.bus = {};
  mocks.waitReady = true;
  mocks.post.mockReset();
  // Every request stays in flight forever — the acceptance scenario is precisely that the
  // previous request has NOT returned when the superseding refetch arrives.
  mocks.post.mockImplementation(() => new Promise(() => {}));
});

describe('ChartRenderer refetch vs useDatabaseDataSource in-flight dedupe (real hook)', () => {
  it('acceptance sequence: gate-held mount → burst [] → burst R001 — the R001 refetch must reach the wire while [] is in flight', () => {
    // 清空/选SKP real-time commits flipped visibleWhen and mounted the chart, but the panel has
    // not published the owned param yet: the gate holds the first fetch — zero requests.
    mocks.waitReady = false;
    mocks.bus = {};
    const { rerender } = render(chartTree(optOutConfig, true));
    expect(mocks.post).toHaveBeenCalledTimes(0);

    // 确定 burst, first write: the committed empty selection. The gate releases and the []
    // request goes out — and stays in flight (slow trend DS).
    mocks.bus = { [OWNED_PARAM]: [] };
    mocks.waitReady = true;
    rerender(chartTree(optOutConfig, true));
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(postBodies()).toEqual([[]]);

    // 确定 burst, second write (~300ms later in production): R001 lands on the bus. The chart
    // re-renders and its effect DOES call refetch — but with a constant dedupe key the
    // in-flight guard used to drop it silently, so the R001 request never reached the wire.
    mocks.bus = { [OWNED_PARAM]: ['R001'] };
    rerender(chartTree(optOutConfig, true));
    expect(mocks.post).toHaveBeenCalledTimes(2);
    expect(postBodies()).toEqual([[], ['R001']]);
    // The superseded [] request was aborted (its late 0-row response can no longer clobber).
    expect(postSignal(0).aborted).toBe(true);
  });

  it('rapid successive values supersede each other: every distinct body reaches the wire exactly once', () => {
    mocks.bus = { [OWNED_PARAM]: ['S0'] };
    const { rerender } = render(chartTree(legacyConfig));
    expect(mocks.post).toHaveBeenCalledTimes(1);

    mocks.bus = { [OWNED_PARAM]: ['S1'] };
    rerender(chartTree(legacyConfig));
    expect(mocks.post).toHaveBeenCalledTimes(2);

    mocks.bus = { [OWNED_PARAM]: ['S2'] };
    rerender(chartTree(legacyConfig));
    expect(mocks.post).toHaveBeenCalledTimes(3);
    expect(postBodies()).toEqual([['S0'], ['S1'], ['S2']]);
    expect(postSignal(0).aborted).toBe(true);
    expect(postSignal(1).aborted).toBe(true);
    expect(postSignal(2).aborted).toBe(false);
  });
});
