import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AnalyticsTableRenderer from './AnalyticsTableRenderer';
import type { AnalyticsColumn } from './AnalyticsTableRenderer';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (_key: string, defaultValue?: string) => defaultValue ?? _key }),
  };
});

vi.mock('@/contexts/WorkbenchConfigLocaleContext', () => ({
  useWorkbenchConfigLocale: () => ({
    language: 'en',
    resolveBilingualText: (v: unknown) =>
      v && typeof v === 'object'
        ? String((v as Record<string, unknown>).en ?? (v as Record<string, unknown>).zh ?? '')
        : String(v ?? ''),
  }),
}));

vi.mock('@/mobile/mobileFlowLayoutContext', () => ({ useMobileFlowLayout: () => false }));
vi.mock('@/layout/grid24CellContext', () => ({ useGrid24FillCell: () => false }));
vi.mock('@/hooks/useComponentCommunication', () => ({
  useComponentCommunication: () => ({ getCurrentParameter: () => undefined }),
}));
vi.mock('../shared/useStickyHeaderClone', () => ({ useStickyHeaderClone: () => undefined }));

const SUMMARY_ROW = { label_en: 'Total', sales_amt_cny: 372400 };

vi.mock('../data/useBoundRows', () => ({
  useBoundRows: (config: Record<string, unknown> | null) => ({
    rows: config ? [SUMMARY_ROW] : [],
    loading: false,
  }),
}));

const COLUMNS: AnalyticsColumn[] = [
  { key: 'name', kind: 'label', label: 'Name' },
  { key: 'amt', kind: 'text', field: 'sales_amt_cny', label: 'Sales', align: 'right' },
];

const row = (name: string, amt: number, store: string) => ({
  label_en: name,
  sales_amt_cny: amt,
  store_code: store,
});

const DISTINCT_ROWS = [row('A', 128500, 'R001'), row('B', 96200, 'R045'), row('C', 88700, 'R096'), row('D', 76400, 'R101')];

const renderTable = (props: Record<string, unknown>, rows = DISTINCT_ROWS) =>
  render(
    <AnalyticsTableRenderer
      useMockData
      mockData={rows}
      columns={COLUMNS}
      summaryDataSourceConfig={{ datasourceId: 'ds-sum' } as never}
      {...(props as object)}
    />,
  );

describe('AnalyticsTableRenderer rankBadge (#26)', () => {
  it('replaces ranks 1..topN with medal SVGs and keeps numbers beyond topN', () => {
    const { container } = renderTable({ rankBadge: { enabled: true, style: 'rosette', topN: 3 } });
    const badges = container.querySelectorAll('svg[data-rank-badge="rosette"]');
    expect(badges).toHaveLength(3);
    expect([...badges].map(b => b.getAttribute('data-rank'))).toEqual(['1', '2', '3']);
    // 4th row keeps the positional number.
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders plain numbers when disabled', () => {
    const { container } = renderTable({});
    expect(container.querySelectorAll('svg[data-rank-badge]')).toHaveLength(0);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('honors topN and the style variant', () => {
    const { container } = renderTable({ rankBadge: { enabled: true, style: 'star', topN: 1 } });
    const badges = container.querySelectorAll('svg[data-rank-badge="star"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].getAttribute('data-rank')).toBe('1');
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('AnalyticsTableRenderer tieRank (#25追加)', () => {
  const TIED = [
    row('王晓萌', 128500, 'R001'),
    row('李嘉悦', 128500, 'R045'),
    row('陈思琪', 128500, 'R096'),
    row('赵婷婷', 71000, 'R048'),
  ];
  const TIE_CFG = { enabled: true, valueField: 'sales_amt_cny', subKeyField: 'store_code' };

  it('shows the shared rank with an 8px subRank/tieCount line and "1224" skip numbering', () => {
    renderTable({ tieRank: TIE_CFG }, TIED);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    // Sub line renders at 8px (req-1109 follow-up: enlarged from 6px for legibility).
    expect(screen.getByText('1/3').className).toContain('text-[8px]');
    // Next distinct value after a 3-way tie at 1 ranks 4, without a sub line.
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
  });

  it('keeps sub-ranks stable when the table sort changes', () => {
    const { rerender } = renderTable({ tieRank: TIE_CFG }, TIED);
    expect(screen.getByText('1/3')).toBeInTheDocument();
    // Re-render with rows in a different (post-sort) order: sub-ranks follow the row, not position.
    rerender(
      <AnalyticsTableRenderer
        useMockData
        mockData={[TIED[3], TIED[1], TIED[0], TIED[2]]}
        columns={COLUMNS}
        summaryDataSourceConfig={{ datasourceId: 'ds-sum' } as never}
        tieRank={TIE_CFG}
      />,
    );
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('coexists with rankBadge: tied top ranks still render medals plus the sub line', () => {
    const { container } = renderTable(
      { tieRank: TIE_CFG, rankBadge: { enabled: true, style: 'rosette', topN: 3 } },
      TIED,
    );
    // All three rows tie at rank 1 → three gold medals, each with its own sub line.
    const badges = container.querySelectorAll('svg[data-rank-badge="rosette"]');
    expect(badges).toHaveLength(3);
    expect([...badges].map(b => b.getAttribute('data-rank'))).toEqual(['1', '1', '1']);
    // Tie mode sizes badges by the 28px vertical budget (fitHeight): rosette ratio 40/34 → w 24.
    expect(badges[0].getAttribute('height')).toBe('28');
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('AnalyticsTableRenderer stickySummary (#28)', () => {
  it('pins the summary row by default and unpins when stickySummary is false', () => {
    const { container, rerender } = renderTable({});
    expect(container.querySelector('tfoot')?.className).toContain('sticky');
    rerender(
      <AnalyticsTableRenderer
        useMockData
        mockData={DISTINCT_ROWS}
        columns={COLUMNS}
        summaryDataSourceConfig={{ datasourceId: 'ds-sum' } as never}
        stickySummary={false}
      />,
    );
    expect(container.querySelector('tfoot')?.className).not.toContain('sticky');
  });
});
