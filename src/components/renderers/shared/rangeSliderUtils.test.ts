import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RANGE_TICKS,
  buildRangeChipText,
  buildRangeConditionText,
  isRangeEmpty,
  normalizeRange,
  parseRangeInput,
  rangeToParams,
  tickIndexToValue,
  valueToTickSnap,
} from './rangeSliderUtils';

const ZH = { metricLabel: '销量', unit: '件', zeroNote: '（无销售）' } as const;

describe('rangeSliderUtils 刻度配置（验收 #22-7）', () => {
  it('13 档刻度含 <0 与 >10 端档', () => {
    expect(DEFAULT_RANGE_TICKS).toHaveLength(13);
    expect(DEFAULT_RANGE_TICKS[0]).toBe('<0');
    expect(DEFAULT_RANGE_TICKS[12]).toBe('>10');
    expect(DEFAULT_RANGE_TICKS.slice(1, 12)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });
});

describe('valueToTickSnap 数值→刻度吸附', () => {
  it('null（不限）归位端档不加亮', () => {
    expect(valueToTickSnap(null, 'min')).toEqual({ index: 0, overflow: false });
    expect(valueToTickSnap(null, 'max')).toEqual({ index: 12, overflow: false });
  });
  it('刻度内数值对位（0 → index 1，5 → index 6，10 → index 11）', () => {
    expect(valueToTickSnap(0, 'min')).toEqual({ index: 1, overflow: false });
    expect(valueToTickSnap(5, 'max')).toEqual({ index: 6, overflow: false });
    expect(valueToTickSnap(10, 'max')).toEqual({ index: 11, overflow: false });
  });
  it('下限溢出：手输 −3 → 吸附 <0 档并加亮', () => {
    expect(valueToTickSnap(-3, 'min')).toEqual({ index: 0, overflow: true });
  });
  it('上限溢出：手输 999 → 吸附 >10 档并加亮', () => {
    expect(valueToTickSnap(999, 'max')).toEqual({ index: 12, overflow: true });
  });
  it('非对称溢出：min 侧 >10 不加亮（仅防御归位），max 侧 <0 不加亮', () => {
    expect(valueToTickSnap(999, 'min')).toEqual({ index: 12, overflow: false });
    expect(valueToTickSnap(-3, 'max')).toEqual({ index: 0, overflow: false });
  });
});

describe('tickIndexToValue 刻度→数值', () => {
  it("min 侧 '<0' 档 = 不限下界（null）", () => {
    expect(tickIndexToValue(0, 'min')).toBeNull();
  });
  it("max 侧 '>10' 档 = 不限上界（null）", () => {
    expect(tickIndexToValue(12, 'max')).toBeNull();
  });
  it('中间档映射 0..10', () => {
    expect(tickIndexToValue(1, 'min')).toBe(0);
    expect(tickIndexToValue(6, 'max')).toBe(5);
    expect(tickIndexToValue(11, 'min')).toBe(10);
  });
});

describe('parseRangeInput 单边留空=不限', () => {
  it("'' → null（不限）", () => expect(parseRangeInput('')).toBeNull());
  it("'  ' → null", () => expect(parseRangeInput('  ')).toBeNull());
  it("'5' → 5；'−3'（全角负号）→ -3", () => {
    expect(parseRangeInput('5')).toBe(5);
    expect(parseRangeInput('−3')).toBe(-3);
  });
  it("'abc' → undefined（忽略）", () => expect(parseRangeInput('abc')).toBeUndefined());
});

describe('条件文案四形态（= / ≤ / ≥ / 区间）', () => {
  it('区间：0 ≤ 销量 ≤ 5 件', () => {
    expect(buildRangeConditionText({ min: 0, max: 5 }, ZH)).toBe('0 ≤ 销量 ≤ 5 件');
  });
  it('上限溢出按输入框精确值：0 ≤ 销量 ≤ 999 件', () => {
    expect(buildRangeConditionText({ min: 0, max: 999 }, ZH)).toBe('0 ≤ 销量 ≤ 999 件');
  });
  it('下限溢出：−3 ≤ 销量 ≤ 5 件', () => {
    expect(buildRangeConditionText({ min: -3, max: 5 }, ZH)).toBe('-3 ≤ 销量 ≤ 5 件');
  });
  it('只输最大值：销量 ≤ 5 件', () => {
    expect(buildRangeConditionText({ min: null, max: 5 }, ZH)).toBe('销量 ≤ 5 件');
  });
  it('只输最小值：销量 ≥ 3 件', () => {
    expect(buildRangeConditionText({ min: 3, max: null }, ZH)).toBe('销量 ≥ 3 件');
  });
  it('精确值（双滑块并拢/两框同数）：销量 = 0 件（无销售）', () => {
    expect(buildRangeConditionText({ min: 0, max: 0 }, ZH)).toBe('销量 = 0 件（无销售）');
    expect(buildRangeConditionText({ min: 3, max: 3 }, ZH)).toBe('销量 = 3 件');
  });
  it('两端留空 = 清除（空条件）', () => {
    expect(isRangeEmpty({ min: null, max: null })).toBe(true);
  });
});

describe('chip 文案', () => {
  it('销量≤1 / 销量≥3 / 销量=0 / 销量0~5', () => {
    expect(buildRangeChipText({ min: null, max: 1 }, ZH)).toBe('销量≤1');
    expect(buildRangeChipText({ min: 3, max: null }, ZH)).toBe('销量≥3');
    expect(buildRangeChipText({ min: 0, max: 0 }, ZH)).toBe('销量=0');
    expect(buildRangeChipText({ min: 0, max: 5 }, ZH)).toBe('销量0~5');
  });
});

describe('normalizeRange / rangeToParams', () => {
  it('min>max 交换', () => {
    expect(normalizeRange({ min: 5, max: 0 })).toEqual({ min: 0, max: 5 });
  });
  it('参数映射：空串=不限，数字转字符串', () => {
    expect(rangeToParams({ min: null, max: 5 })).toEqual({ qtyMin: '', qtyMax: '5' });
    expect(rangeToParams({ min: -3, max: null })).toEqual({ qtyMin: '-3', qtyMax: '' });
    expect(rangeToParams({ min: 0, max: 0 })).toEqual({ qtyMin: '0', qtyMax: '0' });
  });
});
