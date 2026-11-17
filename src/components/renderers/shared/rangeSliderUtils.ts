/**
 * 区间尺（range slider）纯逻辑——任务 #289 / req-1109 #22。
 * 13 档刻度：'<0'（退货/不限下界）、0、1…10、'>10'（不限上界）。
 * 该文件为纯函数集合，无 React 依赖，供 ProductReport 快速筛选与 FilterPanel 区间尺控件共用；
 * workbench 预览副本须与本文件逐行一致（parity）。
 */

/** 刻度：端档为哨兵标签，中间档为数值 0..10 */
export const DEFAULT_RANGE_TICKS: readonly string[] = [
  '<0', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '>10',
];

export interface RangeValue {
  min: number | null;
  max: number | null;
}

export interface TickSnap {
  /** 滑块吸附的刻度下标（0..ticks.length-1） */
  index: number;
  /** 是否溢出刻度（手输 <0 或 >10 的精确值 → 端档吸附并加亮） */
  overflow: boolean;
}

/** 数值 → 刻度吸附。null（不限）归位端档但不加亮；溢出精确值吸附端档并加亮。 */
export function valueToTickSnap(value: number | null, side: 'min' | 'max', ticks: readonly string[] = DEFAULT_RANGE_TICKS): TickSnap {
  const last = ticks.length - 1;
  if (value == null || Number.isNaN(value)) return { index: side === 'min' ? 0 : last, overflow: false };
  if (value < 0) return { index: 0, overflow: side === 'min' };
  const numericTicks = ticks.slice(1, -1).map(Number); // 0..10
  const maxTick = numericTicks[numericTicks.length - 1];
  if (value > maxTick) return { index: last, overflow: side === 'max' };
  // 中间档：最近吸附（手输 2.4 → 2）
  const rounded = Math.round(value);
  const clamped = Math.max(numericTicks[0], Math.min(maxTick, rounded));
  return { index: 1 + numericTicks.indexOf(clamped), overflow: false };
}

/** 刻度下标 → 数值。min 侧 '<0' 档 = 不限下界（null）；max 侧 '>10' 档 = 不限上界（null）。 */
export function tickIndexToValue(index: number, side: 'min' | 'max', ticks: readonly string[] = DEFAULT_RANGE_TICKS): number | null {
  const last = ticks.length - 1;
  if (index <= 0) return side === 'min' ? null : Number(ticks[1]) - 1; // max 拖到 '<0'：等价 -1（仅退货以下，防御路径）
  if (index >= last) return side === 'max' ? null : Number(ticks[last - 1]) + 1; // min 拖到 '>10'：>10 起（防御路径）
  return Number(ticks[index]);
}

/** 输入框解析：'' → null（不限，占位「不限」）；合法数字 → number；非法 → undefined（忽略） */
export function parseRangeInput(text: string): number | null | undefined {
  const s = text.trim().replace(/−/g, '-'); // 兼容全角/演示负号
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function isRangeEmpty(v: RangeValue): boolean {
  return v.min == null && v.max == null;
}

/** 应用前规范化：min>max 时交换（手输交叉防御） */
export function normalizeRange(v: RangeValue): RangeValue {
  if (v.min != null && v.max != null && v.min > v.max) return { min: v.max, max: v.min };
  return v;
}

export interface RangeTextOptions {
  /** 指标名（zh「销量」/ en「Qty」） */
  metricLabel: string;
  /** 单位（zh「件」/ en「pcs」），为空串则省略 */
  unit?: string;
  /** 精确值 = 0 时的附注（zh「（无销售）」），不需要可省略 */
  zeroNote?: string;
}

/** 条件条文案（尺子顶部 ruler-val）：区间 / 单边 / 精确值四形态 */
export function buildRangeConditionText(v: RangeValue, opts: RangeTextOptions): string {
  const unit = opts.unit ?? '';
  const u = unit ? ` ${unit}` : '';
  const m = opts.metricLabel;
  if (v.min != null && v.max != null) {
    if (v.min === v.max) {
      const note = v.min === 0 && opts.zeroNote ? opts.zeroNote : '';
      return `${m} = ${v.min}${u}${note}`;
    }
    return `${v.min} ≤ ${m} ≤ ${v.max}${u}`;
  }
  if (v.max != null) return `${m} ≤ ${v.max}${u}`;
  if (v.min != null) return `${m} ≥ ${v.min}${u}`;
  return `${m}${u}`;
}

/** chip 文案（应用后生效条件，如「销量≤1」「销量≥3」「销量=0」「销量0~5」） */
export function buildRangeChipText(v: RangeValue, opts: RangeTextOptions): string {
  const m = opts.metricLabel;
  if (v.min != null && v.max != null) {
    if (v.min === v.max) return `${m}=${v.min}`;
    return `${m}${v.min}~${v.max}`;
  }
  if (v.max != null) return `${m}≤${v.max}`;
  if (v.min != null) return `${m}≥${v.min}`;
  return m;
}

/** RangeValue → 数据源参数（空串 = 不限；数字转字符串下发，SQL 侧 NULLIF({{qtyMin}},'') 判空） */
export function rangeToParams(v: RangeValue, minKey = 'qtyMin', maxKey = 'qtyMax'): Record<string, string> {
  return {
    [minKey]: v.min == null ? '' : String(v.min),
    [maxKey]: v.max == null ? '' : String(v.max),
  };
}
