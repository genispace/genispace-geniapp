import { describe, expect, it } from 'vitest';
import { extractFetchGateParamsFromDatasourceParameters } from './databaseDatasourceParams';

const param = (source: string, extra: Record<string, unknown> = {}) => ({
  type: 'parameter',
  source,
  ...extra,
});

describe('extractFetchGateParamsFromDatasourceParameters', () => {
  it('keeps legacy behavior when no options are given', () => {
    const gate = extractFetchGateParamsFromDatasourceParameters({
      a: param('strict_p', { waitForValue: true }),
      b: param('legacy_p'),
      c: param('defaulted_p', { value: '' }),
      d: param('optout_p', { waitForValue: false }),
    });
    expect(gate.strict).toEqual(['strict_p']);
    expect(gate.legacy).toEqual(['legacy_p']);
    expect(gate.all).toEqual(['strict_p', 'legacy_p']);
  });

  it('pulls FilterPanel-owned opt-out (waitForValue:false) params into the STRICT gate', () => {
    // Owned params must wait for an actual bus value: FilterPanel marks them ready one commit
    // BEFORE its deferred emit lands, so a readiness escape would fetch default-empty in between.
    const gate = extractFetchGateParamsFromDatasourceParameters(
      { storeIds: param('sw-filter-global_storeIds', { waitForValue: false }) },
      { filterPanelOwnedParams: ['sw-filter-global_storeIds'] }
    );
    expect(gate.strict).toEqual(['sw-filter-global_storeIds']);
    expect(gate.legacy).toEqual([]);
    expect(gate.all).toEqual(['sw-filter-global_storeIds']);
  });

  it('pulls FilterPanel-owned defaulted params into the STRICT gate', () => {
    const gate = extractFetchGateParamsFromDatasourceParameters(
      { storeIds: param('sw-filter-global_storeIds', { value: '' }) },
      { filterPanelOwnedParams: ['sw-filter-global_storeIds'] }
    );
    expect(gate.strict).toEqual(['sw-filter-global_storeIds']);
    expect(gate.legacy).toEqual([]);
  });

  it('keeps owned params strict when waitForValue:true already claims them', () => {
    const gate = extractFetchGateParamsFromDatasourceParameters(
      { start: param('sw-filter-global_period.startTime', { waitForValue: true }) },
      { filterPanelOwnedParams: ['sw-filter-global_period.startTime'] }
    );
    expect(gate.strict).toEqual(['sw-filter-global_period.startTime']);
    expect(gate.legacy).toEqual([]);
  });

  it('does not gate non-owned opt-out params (drill params like pluId stay non-blocking)', () => {
    const gate = extractFetchGateParamsFromDatasourceParameters(
      {
        plu: param('pluId', { waitForValue: false }),
        storeIds: param('sw-filter-global_storeIds', { waitForValue: false }),
      },
      { filterPanelOwnedParams: ['sw-filter-global_storeIds'] }
    );
    expect(gate.all).toEqual(['sw-filter-global_storeIds']);
    expect(gate.all).not.toContain('pluId');
  });
});
