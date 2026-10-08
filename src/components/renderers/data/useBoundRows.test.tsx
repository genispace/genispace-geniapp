import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParameterProvider, useParameterContext } from '../../contexts/ParameterContext';
import type { ParameterContextValue } from '../../types/parameters';
import type { DatabaseDataSourceConfig } from '../../types/databaseDataSource';
import { useBoundRows } from './useBoundRows';

const { mockRefetch } = vi.hoisted(() => ({ mockRefetch: vi.fn(async () => {}) }));

vi.mock('@/hooks/useDatabaseDataSource', () => ({
  useDatabaseDataSource: () => ({
    data: [],
    loading: false,
    refetch: mockRefetch,
    pagination: null,
  }),
}));

let probeCtx: ParameterContextValue | null = null;

function BoundRowsProbe({ config }: { config: DatabaseDataSourceConfig }) {
  probeCtx = useParameterContext();
  useBoundRows(config, undefined, {}, 'probe-component', 'probe');
  return null;
}

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

const OWNED_STORE_PARAM = 'sw-filter-global_storeIds';

const storeGateConfig = {
  datasourceId: 'ds-size-inventory',
  parameters: {
    // The SW detail-page binding that froze empty-param responses: opted out via
    // waitForValue:false, but owned by the page FilterPanel.
    storeIds: { type: 'parameter', source: OWNED_STORE_PARAM, waitForValue: false },
  },
} as unknown as DatabaseDataSourceConfig;

const drillConfig = {
  datasourceId: 'ds-drill',
  parameters: {
    plu: { type: 'parameter', source: 'pluId', waitForValue: false },
  },
} as unknown as DatabaseDataSourceConfig;

let tabSeq = 0;
const nextTabId = () => `tab-boundrows-${Date.now()}-${tabSeq++}`;

beforeEach(() => {
  mockRefetch.mockClear();
  probeCtx = null;
});

describe('useBoundRows fetch gate with FilterPanel ownership', () => {
  it('holds the first fetch for a panel-owned opt-out param until it is ready, then fetches exactly once', async () => {
    render(
      <ParameterProvider
        tabId={nextTabId()}
        pageId="product-detail"
        initialParams={{}}
        filterPanelParamNames={[OWNED_STORE_PARAM]}
      >
        <BoundRowsProbe config={storeGateConfig} />
      </ParameterProvider>
    );

    await flush();
    expect(mockRefetch).not.toHaveBeenCalled();

    // Panel's first broadcast: value lands + ready mark (what FilterPanelRenderer does).
    act(() => {
      probeCtx!.updateTabParams({ [OWNED_STORE_PARAM]: ['S1'] }, 'component');
      probeCtx!.markParametersReady([OWNED_STORE_PARAM]);
    });
    await flush();
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    // Unrelated param churn must not refetch (fetch key unchanged).
    act(() => {
      probeCtx!.updateTabParams({ unrelated: 'x' }, 'component');
    });
    await flush();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('releases the owned gate when the value is already on the bus (persisted selection session)', async () => {
    render(
      <ParameterProvider
        tabId={nextTabId()}
        pageId="product-detail"
        initialParams={{ [OWNED_STORE_PARAM]: 'S9' }}
        filterPanelParamNames={[OWNED_STORE_PARAM]}
      >
        <BoundRowsProbe config={storeGateConfig} />
      </ParameterProvider>
    );

    await flush();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not release the owned gate on a readiness mark alone (mark lands before the deferred emit)', async () => {
    // FilterPanelRenderer's first-broadcast effect marks params ready synchronously while the
    // value emit is deferred (`setFilterValues(prev => sendParameters(prev))`). A component whose
    // gate effect runs in that window must NOT fetch: its body would carry configured defaults
    // ('' / []) and the empty-param late response overwrites the correct one. Only the actual
    // bus value may release an owned param — and the value alone (no ready mark) must suffice,
    // so a post-abort value re-broadcast still compensates.
    render(
      <ParameterProvider
        tabId={nextTabId()}
        pageId="product-detail"
        initialParams={{}}
        filterPanelParamNames={[OWNED_STORE_PARAM]}
      >
        <BoundRowsProbe config={storeGateConfig} />
      </ParameterProvider>
    );

    await flush();
    expect(mockRefetch).not.toHaveBeenCalled();

    act(() => {
      probeCtx!.markParametersReady([OWNED_STORE_PARAM]);
    });
    await flush();
    expect(mockRefetch).not.toHaveBeenCalled();

    act(() => {
      probeCtx!.updateTabParams({ [OWNED_STORE_PARAM]: ['R001', 'R002'] }, 'component');
    });
    await flush();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('does not hold the fetch for non-owned opt-out params (drill params like pluId)', async () => {
    render(
      <ParameterProvider
        tabId={nextTabId()}
        pageId="product-detail"
        initialParams={{}}
        filterPanelParamNames={[OWNED_STORE_PARAM]}
      >
        <BoundRowsProbe config={drillConfig} />
      </ParameterProvider>
    );

    await flush();
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
