import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 任务 #289（req-1109 #22）：FilterPanel 新增「区间尺」控件类型 rangeSlider —— 双滑块刻度尺 +
// 最小/最大输入联动，提交 `{key}Min`/`{key}Max` 两个数值参数（空串 = 不限）。六态行为逻辑
// （刻度吸附/溢出加亮/文案四形态）由 shared/rangeSliderUtils.test.ts 覆盖，本文件只测控件接入：
// 类型存在、刻度数组可配、参数下发形态。与 frontend apps/workbench 副本同构。

const state = vi.hoisted(() => ({
  emit: vi.fn(),
  emitBatch: vi.fn(),
  markParametersReady: vi.fn(),
  refetch: vi.fn(),
}));

const t = vi.hoisted(
  () => (key: string, fallback?: string | Record<string, unknown>) =>
    (typeof fallback === 'string' ? fallback : key),
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/hooks/useComponentCommunication', () => ({
  useComponentCommunication: () => ({ emit: state.emit, emitBatch: state.emitBatch }),
}));
vi.mock('@/hooks/useDatabaseDataSource', () => ({
  useDatabaseDataSource: () => ({ data: [], loading: false, isInitialized: true, refetch: state.refetch }),
}));
vi.mock('@/hooks/useWorkbenchAppAccess', () => ({
  useWorkbenchAppAccess: () => ({ roles: [], loading: false, applicationId: 'app-1' }),
}));
vi.mock('@/contexts/ParameterContext', () => ({
  useParameterContext: () => ({ markParametersReady: state.markParametersReady, getCurrentTabParams: () => ({}) }),
  useParameters: () => ({}),
}));
vi.mock('@/contexts/WorkbenchConfigLocaleContext', () => ({
  useWorkbenchConfigLocale: () => ({ language: 'en', localizeText: (value: unknown) => (value == null ? '' : String(value)) }),
}));
vi.mock('@/mobile/mobileFlowLayoutContext', () => ({ useMobileFlowLayout: () => false }));
vi.mock('../shared/useEscapedStickyPanel', () => ({
  useEscapedStickyPanel: () => ({ wrapSticky: (node: React.ReactNode) => node, stuck: false }),
}));
vi.mock('@/utils/datasourceVersion', () => ({ useDatasourceVersions: () => ({}) }));
vi.mock('@/utils/iconUtils', () => ({ renderLucideIcon: (name: string) => <span aria-label={`icon-${name}`} /> }));
vi.mock('@/mobile/utils/workbenchSpaceSyncGate', () => ({
  isWorkbenchSpaceSyncPending: () => false,
  subscribeWorkbenchSpaceSyncGate: () => () => undefined,
}));
vi.mock('@/ui/dialog-tag-input', () => ({ DialogTagInput: () => null }));
vi.mock('./filterOptionCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./filterOptionCache')>();
  return { ...actual, loadFilterOptions: () => Promise.resolve([]) };
});

vi.mock('@genispace/shared-ui', async () => {
  const React = await import('react');
  return {
    Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...props}>{children}</h3>,
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    Label: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
    RadioButtonGroup: () => null,
    DateRangeFilter: () => null,
    MultiSelect: () => null,
    DialogInput: ({ value, onChange, ...props }: any) => (
      <input {...props} value={value} onChange={(event) => onChange(event.target.value)} />
    ),
    Calendar: () => null,
    Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div data-testid="sheet">{children}</div> : null),
    SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    SheetHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    SheetTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h4 {...props}>{children}</h4>,
  };
});

vi.mock('@/ui/select', async () => {
  const React = await import('react');
  const SelectContext = React.createContext<{ value?: string; onValueChange?: (value: string) => void }>({});
  return {
    Select: ({ value, onValueChange, children }: any) => <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>,
    SelectTrigger: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => {
      const ctx = React.useContext(SelectContext);
      return <span>{ctx.value || placeholder || ''}</span>;
    },
    SelectContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const ctx = React.useContext(SelectContext);
      return <button type="button" onClick={() => ctx.onValueChange?.(value)}>{children}</button>;
    },
  };
});

import FilterPanelRenderer, { __resetFilterPanelSharedState } from './FilterPanelRenderer';

const renderPanel = (filters: unknown[], onFilterChange = vi.fn()) => {
  render(
    <MemoryRouter>
      <FilterPanelRenderer componentId="core" filters={filters as never} onFilterChange={onFilterChange} />
    </MemoryRouter>,
  );
  return onFilterChange;
};

describe('FilterPanelRenderer rangeSlider 区间尺控件 (任务 #289, req-1109 #22)', () => {
  beforeEach(() => {
    __resetFilterPanelSharedState();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the range ruler with the default 13 ticks and min/max inputs', async () => {
    renderPanel([{ key: 'qty', type: 'rangeSlider', label: '销量', rangeUnit: { zh: '件', en: 'pcs' } }]);
    await waitFor(() => expect(state.markParametersReady).toHaveBeenCalled());
    // 13 default ticks: <0, 0…10, >10
    expect(screen.getByText('<0')).toBeInTheDocument();
    expect(screen.getByText('>10')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // Two bound inputs with the "Any" placeholder.
    expect(screen.getAllByPlaceholderText('Any')).toHaveLength(2);
  });

  it('honors a custom ticks array from the filter config', async () => {
    renderPanel([{ key: 'qty', type: 'rangeSlider', label: 'Qty', rangeTicks: ['低', '中', '高'] }]);
    await waitFor(() => expect(state.markParametersReady).toHaveBeenCalled());
    expect(screen.getByText('低')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
    expect(screen.queryByText('>10')).not.toBeInTheDocument();
  });

  it('commits `{key}Min`/`{key}Max` params (empty string = unbounded)', async () => {
    const onFilterChange = renderPanel([{ key: 'qty', type: 'rangeSlider', label: 'Qty' }]);
    await waitFor(() => expect(state.markParametersReady).toHaveBeenCalled());
    const [minInput, maxInput] = screen.getAllByPlaceholderText('Any');

    fireEvent.change(minInput, { target: { value: '3' } });
    fireEvent.blur(minInput);
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ qtyMin: 3, qtyMax: '' })),
    );

    fireEvent.change(maxInput, { target: { value: '5' } });
    fireEvent.blur(maxInput);
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ qtyMin: 3, qtyMax: 5 })),
    );
  });

  it('clears a bound back to unbounded (empty string) when the input is emptied', async () => {
    const onFilterChange = renderPanel([{ key: 'qty', type: 'rangeSlider', label: 'Qty' }]);
    await waitFor(() => expect(state.markParametersReady).toHaveBeenCalled());
    const [minInput] = screen.getAllByPlaceholderText('Any');

    fireEvent.change(minInput, { target: { value: '3' } });
    fireEvent.blur(minInput);
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ qtyMin: 3 })),
    );

    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.blur(minInput);
    await waitFor(() =>
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ qtyMin: '' })),
    );
  });
});
