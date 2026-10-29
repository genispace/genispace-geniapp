import { describe, expect, it } from 'vitest';
import { buildOverlapSummaryTableView } from './ChartRenderer';

// Table-mode summary strip (task #184): pure display of SQL-preformatted fields on the FIRST
// data row. Main value `<rowKey>_<colKey>`, sub line `<rowKey>_<colKey>_pct`; missing → '—';
// target columns blank under hideTargets; labels resolve bilingual.

const CONFIG = {
  columns: [
    { key: 'cur', label: { zh: '当期', en: 'Current' } },
    { key: 'ly', label: { zh: 'LY', en: 'LY' } },
    { key: 'lly', label: { zh: 'LLY', en: 'LLY' } },
    { key: 'target', label: { zh: 'Target', en: 'Target' }, subField: true, target: true },
  ],
  rows: [
    { key: 'total', label: { zh: '合计', en: 'Total' } },
    { key: 'bm', label: { zh: 'BM', en: 'BM' } },
    { key: 'ec', label: { zh: 'EC', en: 'EC' } },
  ],
};

const ROW = {
  total_cur: '¥6.18M', total_cur_pct: '',
  total_ly: '¥5.44M', total_ly_pct: '+13.6%',
  total_lly: '¥9.34M', total_lly_pct: '-33.8%',
  total_target: '¥6.13M', total_target_pct: '100.8%',
  bm_cur: '¥4.00M', bm_ly: '¥3.50M', bm_lly: '¥5.10M', bm_target: '¥4.20M',
  bm_cur_pct: '', bm_ly_pct: '+14.3%', bm_lly_pct: '-21.6%', bm_target_pct: '95.2%',
  ec_cur: '¥2.18M', ec_ly: '¥1.94M', ec_lly: '¥4.24M', ec_target: '¥1.93M',
  ec_cur_pct: '', ec_ly_pct: '+12.4%', ec_lly_pct: '-48.6%', ec_target_pct: '113.0%',
};

describe('buildOverlapSummaryTableView', () => {
  it('returns null without a valid config', () => {
    expect(buildOverlapSummaryTableView([ROW], { hideTargets: false, language: 'zh' })).toBeNull();
    expect(buildOverlapSummaryTableView([ROW], { config: { columns: [], rows: CONFIG.rows }, hideTargets: false, language: 'zh' })).toBeNull();
    expect(buildOverlapSummaryTableView([ROW], { config: { columns: CONFIG.columns, rows: [] }, hideTargets: false, language: 'zh' })).toBeNull();
  });

  it('maps <rowKey>_<colKey> / _pct fields from the first row (zh labels)', () => {
    const view = buildOverlapSummaryTableView([ROW], { config: CONFIG, hideTargets: false, language: 'zh' })!;
    expect(view.columns.map((c) => c.label)).toEqual(['当期', 'LY', 'LLY', 'Target']);
    expect(view.rows.map((r) => r.label)).toEqual(['合计', 'BM', 'EC']);
    const total = view.rows[0];
    expect(total.cells.map((c) => c.text)).toEqual(['¥6.18M', '¥5.44M', '¥9.34M', '¥6.13M']);
    // sub lines: empty-string pct → '—'; signed values verbatim
    expect(total.cells[1].sub).toBe('+13.6%');
    expect(total.cells[2].sub).toBe('-33.8%');
    expect(total.cells[3].sub).toBe('100.8%');
  });

  it('resolves en labels', () => {
    const view = buildOverlapSummaryTableView([ROW], { config: CONFIG, hideTargets: false, language: 'en' })!;
    expect(view.columns[0].label).toBe('Current');
    expect(view.rows[0].label).toBe('Total');
  });

  it('renders — for missing/empty values', () => {
    const view = buildOverlapSummaryTableView([{ total_cur: '¥1.00M' }], { config: CONFIG, hideTargets: false, language: 'zh' })!;
    expect(view.rows[0].cells[0].text).toBe('¥1.00M');
    expect(view.rows[0].cells[1].text).toBe('—');
    expect(view.rows[2].cells[0].text).toBe('—');
  });

  it('hideTargets blanks only target columns (main + sub)', () => {
    const view = buildOverlapSummaryTableView([ROW], { config: CONFIG, hideTargets: true, language: 'zh' })!;
    for (const row of view.rows) {
      expect(row.cells[3]).toEqual({ text: '—' });
      expect(row.cells[0].text).not.toBe('—');
    }
  });

  it('reads only the first row', () => {
    const view = buildOverlapSummaryTableView([ROW, { total_cur: 'IGNORED' }], { config: CONFIG, hideTargets: false, language: 'zh' })!;
    expect(view.rows[0].cells[0].text).toBe('¥6.18M');
  });

  it('subField: false suppresses the sub line entirely', () => {
    const cfg = { ...CONFIG, columns: CONFIG.columns.map((c) => (c.key === 'ly' ? { ...c, subField: false } : c)) };
    const view = buildOverlapSummaryTableView([ROW], { config: cfg, hideTargets: false, language: 'zh' })!;
    expect(view.rows[0].cells[1].sub).toBeUndefined();
    expect(view.rows[0].cells[2].sub).toBe('-33.8%');
  });
});
