import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChartRenderer from './ChartRenderer';
import { ParameterContext } from '@/contexts/ParameterContext';

// ChartRenderer first-fetch race (销售趋势图 No data):
//  defect 1 — the fetch gate never received filterPanelOwnedParams, so a chart mounting on a
//    visibleWhen flip fired its first fetch with the FilterPanel's intermediate empty selection.
//  defect 2 (the deadlock, 1.0.24 acceptance FAIL) — the deferred setTimeout(0) fetch assumed
//    "last render == latest config". Under fast commits the emit/render chains of two commits
//    interleave (mirror expand): the stale []-timer fired first (mark advanced), the fresh
//    R001-timer was then CANCELLED by a late stale-[] render's cleanup, and that render deduped
//    itself against the []-mark — nothing was ever rescheduled, the chart stuck on No data.
//  Fix: fire SYNCHRONOUSLY in the effect (a fired request cannot be un-fired by a later stale
//  render) + a bus-live coherence guard (stale snapshots skip; the broadcast re-render for the
//  latest value re-runs the effect with a matching body) — the same pattern as useBoundRows,
//  which is why hero/明细 were immune. The gate keeps the FilterPanel-owned patch.

const DS = 'ds-sales-trend';
const OWNED_PARAM = 'filterPanel_storeIds';

const mocks = vi.hoisted(() => ({
  bus: {} as Record<string, unknown>,
  waitReady: true,
  // When set, StaleBusInjector flips the bus to this value DURING the render pass — after
  // ChartRenderer rendered (stale snapshot) but before its fetch effect runs (live bus moved).
  injectBus: null as Record<string, unknown> | null,
  // Per-render record of the MAIN datasource hook call (drill hook calls are filtered out).
  mainConfigs: [] as Array<Record<string, unknown> | null>,
  mainRefetches: [] as Array<ReturnType<typeof vi.fn>>,
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

vi.mock('@/hooks/useDatabaseDataSource', () => ({
  useDatabaseDataSource: (config: Record<string, unknown> | null) => {
    const refetch = vi.fn();
    if (config?.datasourceId === DS) {
      mocks.mainConfigs.push(config);
      mocks.mainRefetches.push(refetch);
    }
    return { data: [], loading: false, error: null, isInitialized: true, refetch };
  },
}));

vi.mock('@/hooks/useWaitForParameters', () => ({
  useWaitForParameters: (params?: unknown) => ({
    ready: params ? mocks.waitReady : true,
    isReady: () => mocks.waitReady,
  }),
}));

vi.mock('@/hooks/useComponentCommunication', () => ({
  // A FRESH getCurrentParameter identity per render: this is what makes the fetch effect
  // re-run on every render of a mid-burst commit, exactly like the production sequence where
  // one commit fans out into several emit/render pairs.
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

// Renders AFTER ChartRenderer in the same pass: when armed, it moves the bus to the committed
// value so the chart's effect sees a LIVE bus that disagrees with its render-time snapshot —
// the exact cross-commit interleave from the 1.0.24 acceptance failure.
const StaleBusInjector = () => {
  if (mocks.injectBus) mocks.bus = mocks.injectBus;
  return null;
};

function chartTree(config: unknown, withOwnedProvider = false) {
  const tree = (
    <>
      <ChartRenderer
        id="chart-race"
        chartType="line"
        title="销售趋势"
        data={[]}
        xField="d"
        yField={['v']}
        databaseDataSourceConfig={config as never}
        pageParams={{}}
      />
      <StaleBusInjector />
    </>
  );
  return withOwnedProvider ? (
    <ParameterContext.Provider value={{ filterPanelParamNames: [OWNED_PARAM] } as never}>
      {tree}
    </ParameterContext.Provider>
  ) : (
    tree
  );
}

function renderChart(config: unknown, withOwnedProvider = false) {
  return render(chartTree(config, withOwnedProvider));
}

// No fetch goes through a timer anymore; flush only keeps the mutation (setTimeout) regime
// observable — under the mutated code the pending timer is what gets cancelled/lost.
const flush = () => act(() => {
  vi.runOnlyPendingTimers();
});

const totalMainFetches = () =>
  mocks.mainRefetches.reduce((n, spy) => n + spy.mock.calls.length, 0);

const lastMainConfig = () => mocks.mainConfigs[mocks.mainConfigs.length - 1];

// The exact request bodies that actually went out, in order (a render's config pairs with its
// refetch spy; the fetch effect always fires through the CURRENT render's refetchRef).
const firedBodies = () =>
  mocks.mainConfigs
    .filter((_, i) => mocks.mainRefetches[i].mock.calls.length > 0)
    .map((c) => (c?.parameters as Record<string, unknown> | undefined)?.storeIds);

beforeEach(() => {
  mocks.bus = {};
  mocks.waitReady = true;
  mocks.injectBus = null;
  mocks.mainConfigs.length = 0;
  mocks.mainRefetches.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChartRenderer fetch coherence (synchronous fire + bus-live guard)', () => {
  it('commit fan-out: one fetch per distinct coherent config; same-key re-renders dedupe', () => {
    vi.useFakeTimers();
    mocks.bus = { [OWNED_PARAM]: [] };
    const { rerender } = renderChart(legacyConfig);
    flush();
    expect(totalMainFetches()).toBe(1);
    expect(firedBodies()).toEqual([[]]);

    // The new selection lands, fanned out over consecutive renders of ONE commit (mirror
    // expand): the first coherent render fires synchronously; the rest dedupe.
    mocks.bus = { [OWNED_PARAM]: ['S1'] };
    rerender(chartTree(legacyConfig));
    rerender(chartTree(legacyConfig));
    flush();
    expect(totalMainFetches()).toBe(2);
    expect(firedBodies()).toEqual([[], ['S1']]);
    expect((lastMainConfig()?.parameters as Record<string, unknown>).storeIds).toEqual(['S1']);

    // Dedupe is preserved: another same-key render is a no-op.
    rerender(chartTree(legacyConfig));
    flush();
    expect(totalMainFetches()).toBe(2);
  });

  it('cross-commit interleave: a trailing render with a STALE snapshot neither fires a stale request nor loses the committed one', () => {
    vi.useFakeTimers();
    // Prior selection on the bus (the acceptance loop runs 清空→选SKP→确定 repeatedly).
    mocks.bus = { [OWNED_PARAM]: ['S0'] };
    const { rerender } = renderChart(legacyConfig);
    flush();
    expect(firedBodies()).toEqual([['S0']]);

    // Commit A (清空): bus committed to [] → the empty round fires (hero/明细 fire it too).
    mocks.bus = { [OWNED_PARAM]: [] };
    rerender(chartTree(legacyConfig));
    flush();
    expect(firedBodies()).toEqual([['S0'], []]);

    // Commit B (选 SKP → 确定): bus committed to ['S1'] → the fresh round fires synchronously.
    // NOTE: deliberately NO flush here — under the mutated (setTimeout) regime the ['S1'] timer
    // is still PENDING when the stale render below arrives, which is exactly how the cleanup
    // cancelled it and the dedupe mark swallowed the reschedule (the 1.0.24 deadlock).
    mocks.bus = { [OWNED_PARAM]: ['S1'] };
    rerender(chartTree(legacyConfig));
    expect(firedBodies()).toEqual([['S0'], [], ['S1']]);

    // The 1.0.24 killer: commit A's mirror-expand emit arrives LATE and produces a render whose
    // snapshot is STILL [] while the bus has already settled on ['S1']. The injector flips the
    // bus mid-pass, so the chart's effect sees snapshot=[] vs live=['S1'].
    // Under the deferred-timer regime this render's cleanup cancelled the pending ['S1'] timer
    // and then deduped itself against the []-mark — the refetch was lost forever (No data).
    mocks.bus = { [OWNED_PARAM]: [] };
    mocks.injectBus = { [OWNED_PARAM]: ['S1'] };
    rerender(chartTree(legacyConfig));
    flush();
    mocks.injectBus = null;
    // The stale snapshot was skipped: no extra [] request, and the committed ['S1'] request
    // had already gone out synchronously — nothing left to lose.
    expect(totalMainFetches()).toBe(3);
    expect(firedBodies()).toEqual([['S0'], [], ['S1']]);

    // The follow-up render for the settled bus is coherent but already deduped — no storm.
    rerender(chartTree(legacyConfig));
    flush();
    expect(totalMainFetches()).toBe(3);
    expect(firedBodies()).toEqual([['S0'], [], ['S1']]);
  });
});

describe('ChartRenderer fetch gate receives FilterPanel-owned params', () => {
  it('owned opt-out param not yet on the bus: first fetch is held until the panel publishes (even a committed [])', () => {
    vi.useFakeTimers();
    mocks.waitReady = false; // readiness marks must NOT release an owned param
    mocks.bus = {}; // panel has not published anything yet
    const { rerender } = renderChart(optOutConfig, true);
    flush();
    expect(totalMainFetches()).toBe(0);

    // The panel publishes its (deliberately empty) selection — an actual VALUE releases the gate.
    mocks.bus = { [OWNED_PARAM]: [] };
    mocks.waitReady = true;
    rerender(chartTree(optOutConfig, true));
    flush();
    expect(totalMainFetches()).toBe(1);
    expect(firedBodies()).toEqual([[]]);
  });

  it('the same opt-out binding WITHOUT FilterPanel ownership fires immediately (no behavior change)', () => {
    vi.useFakeTimers();
    mocks.waitReady = false; // irrelevant: an unowned opt-out binding never gates
    mocks.bus = {};
    renderChart(optOutConfig, false);
    flush();
    expect(totalMainFetches()).toBe(1);
  });

  it('legacy (no-default) params still hold the first fetch while not ready (pre-existing gate intact)', () => {
    vi.useFakeTimers();
    mocks.waitReady = false;
    mocks.bus = {};
    renderChart(legacyConfig, false);
    flush();
    expect(totalMainFetches()).toBe(0);
  });
});
