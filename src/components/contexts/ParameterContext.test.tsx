import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ParameterProvider, useParameterContext } from './ParameterContext';
import type { ParameterContextValue } from '../types/parameters';
import { useWaitForParameters } from '../hooks/useWaitForParameters';
import {
  __resetFilterPanelSharedStore,
  publishSharedPanelValues,
} from '@/utils/filterPanelSharedStore';

describe('ParameterContext readiness gate', () => {
  it('is immediately ready when no parameters are awaited', () => {
    function NoWaitProbe() {
      const { ready } = useWaitForParameters(undefined);
      return <output data-testid="gate-now">{ready ? 'ready' : 'waiting'}</output>;
    }
    render(
      <ParameterProvider tabId={`tab-nowait-${Date.now()}`} pageId="page-1" initialParams={{}}>
        <NoWaitProbe />
      </ParameterProvider>,
    );
    // Pages without filter-panel dependencies are never held by the gate.
    expect(screen.getByTestId('gate-now')).toHaveTextContent('ready');
  });
});

describe('ParameterContext re-init reconciliation', () => {
  let ctx: ParameterContextValue | null = null;

  function Probe() {
    ctx = useParameterContext();
    return null;
  }

  const OWNED = 'sw-filter-global_storeIds';
  const EVICTED_DATE = 'sw-filter-global_period.startTime';
  const EVICTED_PANEL = 'sw-old-filter_pageSize';

  it('keeps still-owned filter params (value AND ready) and strips only disowned ones on page switch', () => {
    const tabId = `tab-reconcile-${Date.now()}`;
    const first = render(
      <ParameterProvider
        tabId={tabId}
        pageId="page-1"
        initialParams={{}}
        filterPanelParamNames={[OWNED, EVICTED_DATE]}
      >
        <Probe />
      </ParameterProvider>,
    );

    // Previous page incarnation: panel emitted values and marked them ready.
    act(() => {
      ctx!.updateTabParams(
        {
          [OWNED]: ['S1'],
          [EVICTED_DATE]: '2026-01-01',
          [EVICTED_PANEL]: '20',
          pluId: 'P123',
        },
        'component',
      );
      ctx!.markParametersReady([OWNED, EVICTED_DATE, EVICTED_PANEL]);
    });

    // Page switch: the new page's FilterPanel still emits OWNED, but nothing emits
    // EVICTED_DATE / EVICTED_PANEL anymore.
    first.rerender(
      <ParameterProvider
        tabId={tabId}
        pageId="page-2"
        initialParams={{}}
        filterPanelParamNames={[OWNED]}
      >
        <Probe />
      </ParameterProvider>,
    );

    const params = ctx!.getCurrentTabParams();
    // Still-owned: value survives (the remounting panel dedupes its re-emit, so dropping
    // this would wedge every gated consumer).
    expect(params[OWNED]).toEqual(['S1']);
    // Non-filter params are untouched.
    expect(params.pluId).toBe('P123');
    // Disowned filter params are stripped.
    expect(params[EVICTED_DATE]).toBeUndefined();
    expect(params[EVICTED_PANEL]).toBeUndefined();

    // Ready marks follow the same ownership split.
    expect(ctx!.isParametersReady([OWNED])).toBe(true);
    expect(ctx!.isParametersReady([EVICTED_DATE])).toBe(false);
    expect(ctx!.isParametersReady([EVICTED_PANEL])).toBe(false);
  });
});

describe('ParameterContext reconcile freshness (apply → immediate drill)', () => {
  let ctx: ParameterContextValue | null = null;

  function Probe() {
    ctx = useParameterContext();
    return null;
  }

  const OWNED = 'sw-filter-global_storeIds';
  const PERIOD = 'sw-filter-global_period';

  afterEach(() => {
    ctx = null;
    __resetFilterPanelSharedStore();
  });

  const mountDetail = (tabId: string) =>
    render(
      <ParameterProvider
        tabId={tabId}
        pageId="product-detail"
        initialParams={{ pluId: 'SW6701028_BLK' }}
        filterPanelParamNames={[OWNED]}
      >
        <Probe />
      </ParameterProvider>,
    );

  it('refreshes a stale kept value with the newer cross-page commit (store change → re-drill same product)', () => {
    const tabId = `tab-stale-${Date.now()}`;
    // Round A: the detail page was visited with two stores committed; its panel emitted
    // them onto the detail tab bus before the tab unmounted.
    const first = mountDetail(tabId);
    act(() => {
      ctx!.updateTabParams({ [OWNED]: ['R001', 'R002'] }, 'component');
      ctx!.markParametersReady([OWNED]);
    });
    first.unmount();

    // Back on the list page the user narrows to one store and applies — every panel commit
    // mirrors into the shared store by bus param name.
    publishSharedPanelValues('sw-filter-global', 'list-instance', { storeIds: ['R001'] }, {
      [OWNED]: ['R001'],
      [PERIOD]: 'wtd',
    });

    // Round B: re-drill the SAME product → same tabId → reconciliation must not revive the
    // stale two-store value (mount hydration prefers the bus, so a stale keep would stick).
    mountDetail(tabId);
    const params = ctx!.getCurrentTabParams();
    expect(params[OWNED]).toEqual(['R001']);
    // The shared store only REFRESHES kept params — it never seeds ones the bus lacks.
    expect(params[PERIOD]).toBeUndefined();
  });

  it('refreshes a lingering EMPTY value too (reload → first open emitted defaults → select → drill)', () => {
    const tabId = `tab-empty-${Date.now()}`;
    // After a reload the app landed on the detail page: the panel emitted its empty defaults
    // onto the detail tab bus, then the user navigated away.
    const first = mountDetail(tabId);
    act(() => {
      ctx!.updateTabParams({ [OWNED]: [] }, 'component');
      ctx!.markParametersReady([OWNED]);
    });
    first.unmount();

    // User selects two stores on the list page and applies, then drills immediately.
    publishSharedPanelValues('sw-filter-global', 'list-instance', { storeIds: ['R001', 'R002'] }, {
      [OWNED]: ['R001', 'R002'],
    });

    mountDetail(tabId);
    expect(ctx!.getCurrentTabParams()[OWNED]).toEqual(['R001', 'R002']);
  });

  it('keeps the lingering value when the shared store never saw the param (wedge guard unchanged)', () => {
    const tabId = `tab-keep-${Date.now()}`;
    const first = mountDetail(tabId);
    act(() => {
      ctx!.updateTabParams({ [OWNED]: ['S1'] }, 'component');
      ctx!.markParametersReady([OWNED]);
    });
    first.unmount();

    // No cross-page commit anywhere (shared store empty) — reconciliation keeps the value
    // exactly as before, so consumers gated on a deduped panel re-emit are not wedged.
    mountDetail(tabId);
    expect(ctx!.getCurrentTabParams()[OWNED]).toEqual(['S1']);
  });
});
