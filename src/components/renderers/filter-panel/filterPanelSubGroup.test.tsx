import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 任务 #152（评论 #3409/#3438）：DateCustomTabSource.subGroupI18nKey — 自定义周期 tab 内
// 子 Tab 分组。读 `{base}_zh`/`{base}_en`，文案数据源原样出，组顺序=行序首次出现去重
// （前端不排序）；空值归末尾「其他 / Others」；配置即开关，未配置 tab 零回归。
// 与 frontend apps/workbench filter-panel-sub-group.test.tsx 同构镜像。

const state = vi.hoisted(() => ({
  emit: vi.fn(),
  emitBatch: vi.fn(),
  markParametersReady: vi.fn(),
  refetch: vi.fn(),
  lang: 'zh',
}));

const t = vi.hoisted(
  () => (key: string, fallback?: string | Record<string, unknown>, values?: Record<string, unknown>) => {
    let text = typeof fallback === 'string' ? fallback : key;
    if (key === 'filter_panel.sub_group_other') text = state.lang.startsWith('zh') ? '其他' : 'Others';
    return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values?.[name] ?? `{{${name}}}`));
  },
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
  useWorkbenchConfigLocale: () => ({ language: state.lang, localizeText: (value: unknown) => value == null ? '' : String(value) }),
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
  return {
    ...actual,
    loadFilterOptions: (_cacheKey: string, datasourceId: string) => {
      if (datasourceId === 'ds-sub') {
        // 行序刻意让 FY26 不连续：分组去重必须是「行序首次出现」而非排序/连续归并
        return Promise.resolve([
          { value: 'h_nd_2026', label_zh: '国庆2026', start_date: '2026-10-01', end_date: '2026-10-07', ui_group: 'holiday', sub_group_zh: 'FY26', sub_group_en: 'FY2026' },
          { value: 'h_ny_2026', label_zh: '元旦2026', start_date: '2026-01-01', end_date: '2026-01-03', ui_group: 'holiday', sub_group_zh: 'FY25', sub_group_en: 'FY2025' },
          { value: 'h_ny_2027', label_zh: '元旦2027', start_date: '2027-01-01', end_date: '2027-01-03', ui_group: 'holiday', sub_group_zh: 'FY26', sub_group_en: 'FY2026' },
          { value: 'h_special', label_zh: '特殊日', start_date: '2026-05-01', end_date: '2026-05-01', ui_group: 'holiday', sub_group_zh: null, sub_group_en: null },
        ]);
      }
      if (datasourceId === 'ds-range') {
        return Promise.resolve([
          { value: 'wtd', label_zh: 'WTD', start_date: '2026-09-07', end_date: '2026-09-08', sub_zh: '', sub_en: '' },
        ]);
      }
      return Promise.resolve([]);
    },
  };
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
    Calendar: ({ onSelect }: any) => <button type="button" onClick={() => onSelect({ from: new Date(2026, 4, 1), to: new Date(2026, 4, 3) })}>Choose calendar range</button>,
    Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div data-testid="sheet">{children}</div> : null,
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

const subGroupFilter = [
  {
    key: 'period', type: 'presetDateRange', label: 'Period',
    defaultValue: 'wtd', rememberSelection: true, allowCustom: true,
    fiscalPresets: [{ label: 'WTD', value: 'wtd' }],
    dateRangeSource: { datasourceId: 'ds-range' },
    customTabs: [
      {
        key: 'holiday_grouped', label: { zh: '节假日', en: 'Holiday' }, cols: 2,
        source: { datasourceId: 'ds-sub', valueKey: 'value', labelKey: 'label_zh', startKey: 'start_date', endKey: 'end_date', groupKey: 'ui_group', groupValue: 'holiday', subGroupI18nKey: 'sub_group' },
      },
      {
        key: 'holiday_plain', label: { zh: '无配置', en: 'Plain' }, cols: 2,
        source: { datasourceId: 'ds-sub', valueKey: 'value', labelKey: 'label_zh', startKey: 'start_date', endKey: 'end_date', groupKey: 'ui_group', groupValue: 'holiday' },
      },
    ],
  },
] as any;

/** 打开发射期面板并切到 Custom 区（首个 customTab 默认激活）；返回触发器节点供重开复用。 */
async function openCustomSheet() {
  render(
    <MemoryRouter>
      <FilterPanelRenderer componentId="core" filters={subGroupFilter} onFilterChange={vi.fn()} />
    </MemoryRouter>
  );
  await waitFor(() => expect(state.markParametersReady).toHaveBeenCalled());
  const trigger = screen.getByRole('button', { name: /WTD/ });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('button', { name: /Custom/ }));
  return trigger;
}

/** 子 Tab 条 = 包含组胶囊的容器；按文档顺序返回胶囊文本。 */
async function subTabTexts() {
  const first = await screen.findByRole('button', { name: 'FY26' });
  return within(first.parentElement as HTMLElement).getAllByRole('button').map(b => b.textContent);
}

describe('FilterPanelRenderer presetDateRange subGroupI18nKey 子 Tab 分组 (任务 #152)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    __resetFilterPanelSharedState();
    vi.clearAllMocks();
    localStorage.clear();
    state.lang = 'zh';
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('分组按行序首次出现去重：FY26（行不连续仍一组）→ FY25 → 空值归末尾「其他」', async () => {
    await openCustomSheet();
    expect(await subTabTexts()).toEqual(['FY26', 'FY25', '其他']);
  });

  it('无已选时默认第一组，网格只含该组方块', async () => {
    await openCustomSheet();

    expect((await screen.findByRole('button', { name: 'FY26' })).className).toContain('font-semibold');
    expect(await screen.findByRole('button', { name: /国庆2026/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /元旦2027/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /元旦2026/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /特殊日/ })).toBeNull();
  });

  it('切换子 Tab：网格只含该组方块（FY25 / 其他）', async () => {
    await openCustomSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'FY25' }));
    expect(await screen.findByRole('button', { name: /元旦2026/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /国庆2026/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /特殊日/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '其他' }));
    expect(await screen.findByRole('button', { name: /特殊日/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /元旦2026/ })).toBeNull();
  });

  it('未配 subGroupI18nKey 的 tab 不渲染子 Tab 条（零回归）', async () => {
    await openCustomSheet();
    fireEvent.click(await screen.findByRole('button', { name: '无配置' }));

    expect(await screen.findByRole('button', { name: /国庆2026/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /特殊日/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'FY26' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'FY25' })).toBeNull();
    expect(screen.queryByRole('button', { name: '其他' })).toBeNull();
  });

  it('打开时定位到已选项所在组；选中态跨子 Tab 保持', async () => {
    const trigger = await openCustomSheet();

    // 切到 FY25 选中「元旦2026」（单选 chip 点击即提交，面板关闭）
    fireEvent.click(await screen.findByRole('button', { name: 'FY25' }));
    fireEvent.click(await screen.findByRole('button', { name: /元旦2026/ }));
    await waitFor(() => expect(state.emitBatch).toHaveBeenLastCalledWith(expect.objectContaining({
      core_periodStart: '2026-01-01',
      core_periodEnd: '2026-01-03',
    })));

    // 重开（触发器 label 已变，复用同一 DOM 节点）：初始子 Tab = 已选项所在组 FY25，且方块高亮
    expect(screen.queryByTestId('sheet')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('button', { name: /Custom/ }));

    expect((await screen.findByRole('button', { name: 'FY25' })).className).toContain('font-semibold');
    const chip = await screen.findByRole('button', { name: /元旦2026/ });
    expect(chip.className).toContain('border-indigo-400');

    // 切到 FY26 再切回 FY25：选中态保持
    fireEvent.click(screen.getByRole('button', { name: 'FY26' }));
    expect(screen.queryByRole('button', { name: /元旦2026/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'FY25' }));
    const chipAgain = await screen.findByRole('button', { name: /元旦2026/ });
    expect(chipAgain.className).toContain('border-indigo-400');
  });

  it('双语：英文下子 Tab 读 sub_group_en 列，兜底组为 Others', async () => {
    state.lang = 'en';
    await openCustomSheet();

    const first = await screen.findByRole('button', { name: 'FY2026' });
    const texts = within(first.parentElement as HTMLElement).getAllByRole('button').map(b => b.textContent);
    expect(texts).toEqual(['FY2026', 'FY2025', 'Others']);
    expect(screen.queryByRole('button', { name: 'FY26' })).toBeNull();
    expect(screen.queryByRole('button', { name: '其他' })).toBeNull();
  });
});
