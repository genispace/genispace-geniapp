import React, { useMemo } from 'react';
import { cn } from '@genispace/shared-utils';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useTranslation } from 'react-i18next';
import { useBoundRows } from '../data/useBoundRows';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { TileGridSkeleton } from '../../skeleton';



type Bi = string | { zh?: string; en?: string };

interface TileBand {
  key?: string;       
  max?: number;       
  color?: string;     
  heat?: boolean;     
  label?: Bi;         
  
  tileClass?: string;
  valueClass?: string;
  barClass?: string;
  heatColor?: string;
}

export interface TileGridRendererProps {
  id?: string;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  
  rows?: Record<string, unknown>[];
  topField?: string;      
  valueField?: string;    
  bandField?: string;     
  bands?: TileBand[];     
  cols?: number;          
  showBars?: boolean;     
  showLegend?: boolean;   
  title?: Bi;
  bare?: boolean;
  emptyText?: Bi;

  titleFontSize?: number;
  valueFontSize?: number;
  labelFontSize?: number;
}

const num = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };


function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Audit decision 2026-07-07: the DEFAULT_BANDS code fallback was removed — band thresholds are business
// config and must come explicitly from the page JSON (maintained in the editor's "Bands & colors");
// when bands are missing, render a "config missing" notice instead of silently using default bands.
// Fallback appearance when no band matches (purely neutral styling, not a business value):
const NEUTRAL_BAND: TileBand = { key: '_none' };


function tileVisual(b: TileBand, v: number, minVal: number, maxVal: number): { style: React.CSSProperties; cls: string; topCls: string; valCls: string; valStyle: React.CSSProperties } {
  const heatBase = b.color || b.heatColor;
  if ((b.heat || b.heatColor) && heatBase) {
    
    const norm = maxVal === minVal ? 1 : (v - minVal) / (maxVal - minVal);
    const op = 0.45 + 0.55 * Math.max(0, Math.min(1, norm));
    const dark = op >= 0.6;
    return { style: { backgroundColor: hexToRgba(heatBase, op) }, cls: 'border border-transparent', topCls: dark ? 'text-white/80' : 'text-slate-600', valCls: dark ? 'text-white' : 'text-slate-900', valStyle: {} };
  }
  if (b.color) {
    
    return { style: { backgroundColor: b.color }, cls: 'border border-transparent', topCls: 'text-white/85', valCls: 'text-white', valStyle: {} };
  }
  return { style: {}, cls: b.tileClass || 'border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60', topCls: 'text-slate-500 dark:text-neutral-400', valCls: b.valueClass || 'text-slate-800 dark:text-neutral-200', valStyle: {} };
}

function bandSwatch(b: TileBand): { style?: React.CSSProperties; cls: string } {
  return b.color ? { style: { backgroundColor: b.color }, cls: '' } : { cls: b.barClass || 'bg-slate-300 dark:bg-neutral-600' };
}

const TileGridRenderer: React.FC<TileGridRendererProps> = ({
  id = 'tile-grid',
  databaseDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  rows: directRows,
  topField = 'label',
  valueField = 'value',
  bandField,
  bands = [],
  cols = 4,
  showBars = false,
  showLegend = true,
  title,
  bare = false,
  emptyText,
  titleFontSize = 14,
  valueFontSize = 14,
  labelFontSize = 13,
}) => {
  const { resolveBilingualText: bi } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const narrow = useMobileFlowLayout();
  const biText = (v: Bi | undefined): string => bi(v);

  const { rows: boundRows, loading } = useBoundRows(
    directRows ? null : databaseDataSourceConfig,
    componentParameterConfig, pageParams, id, 'tile-grid',
  );
  const rows = directRows ?? boundRows;

  const resolveBand = (row: Record<string, unknown>): TileBand => {
    if (bandField && row[bandField] != null) {
      const hit = bands.find(b => b.key === String(row[bandField]));
      if (hit) return hit;
    }
    const v = num(row[valueField]);
    const withMax = bands.filter(b => typeof b.max === 'number');
    const hit = withMax.find(b => v <= (b.max as number));
    return hit ?? bands[bands.length - 1] ?? NEUTRAL_BAND;
  };

  const vals = useMemo(() => rows.map(r => num(r[valueField])), [rows, valueField]);
  const maxVal = useMemo(() => Math.max(...vals, 1), [vals]);
  const minVal = useMemo(() => (vals.length ? Math.min(...vals) : 0), [vals]);
  // Tiles are compact icon chips — cap at 4-up when the flow is narrow (real mobile or studio phone frame).
  const effCols = narrow ? Math.min(cols, 4) : cols;
  const gridStyle: React.CSSProperties = { gridTemplateColumns: `repeat(${effCols}, minmax(0, 1fr))` };

  const inner = (
    <>
      {title && <div className="mb-3 text-slate-700 dark:text-neutral-300" style={{ fontWeight: 500, fontSize: titleFontSize }}>{biText(title)}</div>}

      {bands.length === 0 ? (
        <div className="py-6 text-center text-sm text-amber-500 dark:text-amber-400">
          {t('tile_grid.bands_missing', 'Bands not configured — set thresholds in the editor (Bands & colors)')}
        </div>
      ) : loading && rows.length === 0 ? (
        <TileGridSkeleton cols={effCols} showTitle={false} showLegend={showLegend} />
      ) : rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400 dark:text-neutral-500">{biText(emptyText) || t('tile_grid.no_data', 'No data')}</div>
      ) : (
        <>
          <div className="mb-3 grid gap-2" style={gridStyle}>
            {rows.map((r, i) => {
              const v = num(r[valueField]);
              const tv = tileVisual(resolveBand(r), v, minVal, maxVal);
              return (
                <div key={String(r[topField] ?? i)} className={cn('rounded-xl p-2.5 text-center', tv.cls)} style={tv.style}>
                  <div className={tv.topCls} style={{ fontSize: labelFontSize }}>{String(r[topField] ?? '')}</div>
                  <div className={cn('mt-1', tv.valCls)} style={{ fontWeight: 700, fontSize: valueFontSize, ...tv.valStyle }}>{v}</div>
                </div>
              );
            })}
          </div>

          {showBars && (
            <div className="space-y-1.5">
              {rows.map((r, i) => {
                const b = resolveBand(r);
                const v = num(r[valueField]);
                return (
                  <div key={String(r[topField] ?? i)} className="flex items-center gap-2">
                    <div className="w-8 flex-shrink-0 text-right text-slate-400 dark:text-neutral-500" style={{ fontSize: labelFontSize }}>{String(r[topField] ?? '')}</div>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                      <div className={cn('h-full rounded-full', bandSwatch(b).cls)} style={{ width: `${Math.round((v / maxVal) * 100)}%`, ...bandSwatch(b).style }} />
                    </div>
                    <div className="w-6 flex-shrink-0 tabular-nums text-slate-600 dark:text-neutral-400" style={{ fontSize: labelFontSize }}>{v}</div>
                  </div>
                );
              })}
            </div>
          )}

          {showLegend && bands.some(b => b.label) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-slate-400 dark:text-neutral-500" style={{ fontSize: labelFontSize }}>
              {bands.filter(b => b.label).map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className={cn('inline-block h-2 w-2 rounded', bandSwatch(b).cls)} style={bandSwatch(b).style} />{biText(b.label)}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  return bare ? <div>{inner}</div> : <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">{inner}</div>;
};

export default TileGridRenderer;
