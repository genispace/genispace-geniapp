/**
 * 区间尺控件（req-1109 #22 定稿：双滑块 13 档区间尺 + 最小/最大自定义输入联动）。
 * ProductReport 快速筛选与 FilterPanel「区间尺」控件共用；workbench 预览副本须逐行一致（parity）。
 * 纯逻辑见同目录 rangeSliderUtils.ts（刻度映射/文案/参数换算均在那里，本文件只做交互与渲染）。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import {
  DEFAULT_RANGE_TICKS,
  buildRangeConditionText,
  parseRangeInput,
  tickIndexToValue,
  valueToTickSnap,
  type RangeValue,
} from './rangeSliderUtils';

export interface RangeSliderFieldProps {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  ticks?: readonly string[];
  /** 指标名（销量 / Qty） */
  metricLabel: string;
  /** 单位（件 / pcs），可空 */
  unit?: string;
  /** 精确值 = 0 附注（（无销售）） */
  zeroNote?: string;
  /** 输入框占位（不限 / Any） */
  inputPlaceholder?: string;
  /** 底部提示文案（状态相关说明由父级按当前值选择传入） */
  hint?: React.ReactNode;
}

const RangeSliderField: React.FC<RangeSliderFieldProps> = ({
  value,
  onChange,
  ticks = DEFAULT_RANGE_TICKS,
  metricLabel,
  unit = '',
  zeroNote,
  inputPlaceholder = '不限',
  hint,
}) => {
  const last = ticks.length - 1;
  const minSnap = valueToTickSnap(value.min, 'min', ticks);
  const maxSnap = valueToTickSnap(value.max, 'max', ticks);

  // 输入框文本：跟随外部值；用户编辑期间以本地态为准（失焦/回车提交）
  const [minText, setMinText] = useState(value.min == null ? '' : String(value.min));
  const [maxText, setMaxText] = useState(value.max == null ? '' : String(value.max));
  const [editing, setEditing] = useState<'min' | 'max' | null>(null);
  useEffect(() => {
    if (editing !== 'min') setMinText(value.min == null ? '' : String(value.min));
    if (editing !== 'max') setMaxText(value.max == null ? '' : String(value.max));
  }, [value.min, value.max, editing]);

  const commitInput = (side: 'min' | 'max') => {
    setEditing(null);
    const text = side === 'min' ? minText : maxText;
    const parsed = parseRangeInput(text);
    if (parsed === undefined) {
      // 非法输入：回显当前值，不触发变更
      if (side === 'min') setMinText(value.min == null ? '' : String(value.min));
      else setMaxText(value.max == null ? '' : String(value.max));
      return;
    }
    if (side === 'min') onChange({ ...value, min: parsed });
    else onChange({ ...value, max: parsed });
  };

  // 滑块拖动：pointer capture + 最近刻度吸附
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragSide = useRef<'min' | 'max' | null>(null);
  const moveToClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    const side = dragSide.current;
    if (!el || !side) return;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    const index = Math.round(ratio * last);
    const v = tickIndexToValue(index, side, ticks);
    if (side === 'min') {
      // min 不允许越过 max（同在端档 null 时允许并拢：精确值场景由 tickIndexToValue 中间档产生）
      const maxIdx = valueToTickSnap(value.max, 'max', ticks).index;
      const clamped = Math.min(index, maxIdx);
      onChange({ ...value, min: tickIndexToValue(clamped, 'min', ticks) });
    } else {
      const minIdx = valueToTickSnap(value.min, 'min', ticks).index;
      const clamped = Math.max(index, minIdx);
      onChange({ ...value, max: tickIndexToValue(clamped, 'max', ticks) });
    }
  }, [last, onChange, ticks, value]);

  const onKnobPointerDown = (side: 'min' | 'max') => (e: React.PointerEvent) => {
    dragSide.current = side;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onKnobPointerMove = (e: React.PointerEvent) => {
    if (dragSide.current) moveToClientX(e.clientX);
  };
  const onKnobPointerUp = () => { dragSide.current = null; };
  const onTrackPointerDown = (e: React.PointerEvent) => {
    // 点击轨道：移动较近一侧滑块
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) : 0;
    const index = Math.round(ratio * last);
    const dMin = Math.abs(index - minSnap.index);
    const dMax = Math.abs(index - maxSnap.index);
    dragSide.current = dMin <= dMax ? 'min' : 'max';
    moveToClientX(e.clientX);
    dragSide.current = null;
  };

  const pct = (i: number) => `${(i / last) * 100}%`;
  const fillLeft = pct(minSnap.index);
  const fillWidth = `${((maxSnap.index - minSnap.index) / last) * 100}%`;
  const exact = value.min != null && value.max != null && value.min === value.max;

  return (
    <div>
      <div className="text-center text-[13px] text-slate-600 dark:text-neutral-300" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {buildRangeConditionText(value, { metricLabel, unit, zeroNote }).split(/(\-?\d+(?:\.\d+)?)/g).map((part, i) =>
          /^\-?\d/.test(part) ? <b key={i} className="text-slate-900 dark:text-neutral-100">{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>,
        )}
      </div>

      <div className="mt-3 px-1">
        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          className="relative h-1.5 rounded-full bg-slate-200 dark:bg-neutral-700"
        >
          <div className="absolute top-0 h-full rounded-full bg-indigo-500" style={{ left: fillLeft, width: fillWidth }} />
          {(['min', 'max'] as const).map((side) => {
            const snap = side === 'min' ? minSnap : maxSnap;
            return (
              <div
                key={side}
                role="slider"
                aria-label={side === 'min' ? `${metricLabel} min` : `${metricLabel} max`}
                aria-valuenow={side === 'min' ? (value.min ?? Number(ticks[1]) - 1) : (value.max ?? Number(ticks[last - 1]) + 1)}
                tabIndex={0}
                onPointerDown={onKnobPointerDown(side)}
                onPointerMove={onKnobPointerMove}
                onPointerUp={onKnobPointerUp}
                onKeyDown={(e) => {
                  const delta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
                  if (!delta) return;
                  e.preventDefault();
                  const next = Math.max(0, Math.min(last, snap.index + delta));
                  if (side === 'min') onChange({ ...value, min: tickIndexToValue(Math.min(next, maxSnap.index), 'min', ticks) });
                  else onChange({ ...value, max: tickIndexToValue(Math.max(next, minSnap.index), 'max', ticks) });
                }}
                className={cn(
                  'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-indigo-500 bg-white shadow touch-none dark:bg-neutral-900',
                  exact && side === 'max' && 'shadow-[0_0_0_3px_rgba(108,92,231,.25)]',
                )}
                style={{ left: pct(snap.index) }}
              />
            );
          })}
        </div>
        <div className="relative mt-1.5 h-4">
          {ticks.map((tk, i) => {
            const highlighted = (i === 0 && minSnap.overflow) || (i === last && maxSnap.overflow) || (exact && i === minSnap.index);
            return (
              <React.Fragment key={tk}>
                <i className="absolute top-0 h-1 w-px bg-slate-300 dark:bg-neutral-600" style={{ left: pct(i) }} />
                <span
                  className={cn('absolute top-1 -translate-x-1/2 text-[10px] text-slate-400 dark:text-neutral-500', highlighted && 'font-bold text-indigo-500 dark:text-indigo-400')}
                  style={{ left: pct(i) }}
                >
                  {tk}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <input
          value={minText}
          inputMode="decimal"
          placeholder={inputPlaceholder}
          onFocus={() => setEditing('min')}
          onChange={(e) => setMinText(e.target.value)}
          onBlur={() => commitInput('min')}
          onKeyDown={(e) => { if (e.key === 'Enter') commitInput('min'); }}
          className={cn(
            'w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[13px] outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
            minSnap.overflow && 'border-indigo-500 shadow-[0_0_0_2px_rgba(108,92,231,.15)]',
          )}
        />
        <span className="text-slate-400">~</span>
        <input
          value={maxText}
          inputMode="decimal"
          placeholder={inputPlaceholder}
          onFocus={() => setEditing('max')}
          onChange={(e) => setMaxText(e.target.value)}
          onBlur={() => commitInput('max')}
          onKeyDown={(e) => { if (e.key === 'Enter') commitInput('max'); }}
          className={cn(
            'w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[13px] outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
            maxSnap.overflow && 'border-indigo-500 shadow-[0_0_0_2px_rgba(108,92,231,.15)]',
          )}
        />
        {unit && <span className="text-[12px] text-slate-400">{unit}</span>}
      </div>

      {hint && <div className="mt-2 text-center text-[11px] leading-relaxed text-slate-400 dark:text-neutral-500">{hint}</div>}
    </div>
  );
};

export default RangeSliderField;
