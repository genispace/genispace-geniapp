import { describe, expect, it } from 'vitest';
import { computeTieRanks } from './tieRank';

const row = (name: string, amt: number, store: string) => ({ name, sales_amt_cny: amt, store_code: store });

describe('computeTieRanks (#25追加, "1224" skip ranking)', () => {
  it('3 rows tied at rank 1 push the next rank to 4', () => {
    const rows = [
      row('王晓萌', 128500, 'R001'),
      row('李嘉悦', 128500, 'R045'),
      row('陈思琪', 128500, 'R096'),
      row('赵婷婷', 71000, 'R048'),
    ];
    const m = computeTieRanks(rows, { valueField: 'sales_amt_cny', subKeyField: 'store_code' });
    expect(m.get(rows[0])).toEqual({ rank: 1, tieCount: 3, subRank: 1 });
    expect(m.get(rows[1])).toEqual({ rank: 1, tieCount: 3, subRank: 2 });
    expect(m.get(rows[2])).toEqual({ rank: 1, tieCount: 3, subRank: 3 });
    expect(m.get(rows[3])).toEqual({ rank: 4, tieCount: 1, subRank: 1 });
  });

  it('30 rows tied at rank 4 push the next rank to 34 (demo fixture)', () => {
    const tied = Array.from({ length: 30 }, (_, i) =>
      row(`T${String(i).padStart(2, '0')}`, 76400, `R${String(i + 2).padStart(3, '0')}`));
    const rows = [row('A', 128500, 'R001'), row('B', 96000, 'R045'), row('C', 88700, 'R096'), ...tied, row('D', 66800, 'H001')];
    const m = computeTieRanks(rows, { valueField: 'sales_amt_cny', subKeyField: 'store_code' });
    expect(m.get(tied[0])).toEqual({ rank: 4, tieCount: 30, subRank: 1 });
    expect(m.get(tied[29])).toEqual({ rank: 4, tieCount: 30, subRank: 30 });
    expect(m.get(rows[rows.length - 1])).toEqual({ rank: 34, tieCount: 1, subRank: 1 });
  });

  it('numbers sub-ranks by the fixed secondary key, decoupled from input order', () => {
    // Same rows in a different (e.g. post-sort) order must keep identical ranks/sub-ranks.
    const rows = [
      row('孙雅静', 66800, 'H001'),
      row('周梦洁', 66800, 'R104'),
      row('吴倩', 58900, 'R103'),
    ];
    const m1 = computeTieRanks(rows, { valueField: 'sales_amt_cny', subKeyField: 'store_code' });
    const shuffled = [rows[2], rows[0], rows[1]];
    const m2 = computeTieRanks(shuffled, { valueField: 'sales_amt_cny', subKeyField: 'store_code' });
    expect(m1.get(rows[0])).toEqual({ rank: 1, tieCount: 2, subRank: 1 }); // H001 < R104
    expect(m1.get(rows[1])).toEqual({ rank: 1, tieCount: 2, subRank: 2 });
    expect(m1.get(rows[2])).toEqual({ rank: 3, tieCount: 1, subRank: 1 });
    expect(m2.get(rows[0])).toEqual(m1.get(rows[0]));
    expect(m2.get(rows[1])).toEqual(m1.get(rows[1]));
    expect(m2.get(rows[2])).toEqual(m1.get(rows[2]));
  });

  it('falls back to nameField when the secondary key ties', () => {
    const rows = [row('B', 100, 'R001'), row('A', 100, 'R001')];
    const m = computeTieRanks(rows, { valueField: 'sales_amt_cny', subKeyField: 'store_code', nameField: 'name' });
    expect(m.get(rows[1])?.subRank).toBe(1);
    expect(m.get(rows[0])?.subRank).toBe(2);
  });

  it('ranks non-numeric values after all numeric rows as one trailing tie group', () => {
    const rows = [row('A', 100, 'R001'), { name: 'B', sales_amt_cny: null, store_code: 'R002' }, row('C', 50, 'R003')];
    const m = computeTieRanks(rows, { valueField: 'sales_amt_cny', subKeyField: 'store_code' });
    expect(m.get(rows[0])?.rank).toBe(1);
    expect(m.get(rows[2])?.rank).toBe(2);
    expect(m.get(rows[1])?.rank).toBe(3);
    expect(m.get(rows[1])?.tieCount).toBe(1);
  });

  it('returns an empty map without a valueField or rows', () => {
    expect(computeTieRanks([], { valueField: 'x' }).size).toBe(0);
    expect(computeTieRanks([row('A', 1, 'R1')], { valueField: '' }).size).toBe(0);
  });
});
