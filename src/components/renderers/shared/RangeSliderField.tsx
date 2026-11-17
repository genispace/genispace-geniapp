/**
 * Range ruler field (req-1109 #22 final: dual-thumb 13-tick ruler + linked min/max custom inputs).
 * Shared by the ProductReport quick filter and the FilterPanel "rangeSlider" control; the workbench
 * preview copy must stay line-identical (parity).
 * Pure logic lives in rangeSliderUtils.ts next to this file (tick mapping / texts / param mapping);
 * this file only handles interaction and rendering.
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
  /** Metric name (e.g. Qty) */
  metricLabel: string;
  /** Unit (e.g. pcs), optional */
  unit?: string;
  /** Note appended to an exact value of 0 (e.g. "(no sales)") */
  zeroNote?: string;
  /** Input placeholder (e.g. Any) */
  inputPlaceholder?: string;
  /** Footer hint (the parent picks state-dependent text for the current value) */
  hint?: React.ReactNode;
}

const RangeSliderField: React.FC<RangeSliderFieldProps> = ({
  value,
  onChange,
  ticks = DEFAULT_RANGE_TICKS,
  metricLabel,
  unit = '',
  zeroNote,
  inputPlaceholder = 'Any',
  hint,
}) => {
  const last = ticks.length - 1;
  const minSnap = valueToTickSnap(value.min, 'min', ticks);
  const maxSnap = valueToTickSnap(value.max, 'max', ticks);

  // Input texts follow the external value; while the user edits, local state wins (commit on blur/Enter)
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
      // Invalid input: echo the current value back, do not emit a change
      if (side === 'min') setMinText(value.min == null ? '' : String(value.min));
      else setMaxText(value.max == null ? '' : String(value.max));
      return;
    }
    if (side === 'min') onChange({ ...value, min: parsed });
    else onChange({ ...value, max: parsed });
  };

  // Thumb dragging: pointer capture + snap to the nearest tick
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
      // min must not pass max (both may meet at an end tick when null: exact-value cases come from
      // middle ticks via tickIndexToValue)
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
    // Track click: move the nearer thumb
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
        {buildRangeConditionText(value, { metricLabel, unit, zeroNote }).split(/(-?\d+(?:\.\d+)?)/g).map((part, i) =>
          /^-?\d/.test(part) ? <b key={i} className="text-slate-900 dark:text-neutral-100">{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>,
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
