import React, { useMemo } from 'react';
import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../skeleton';
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import { currencySymbol } from '@/utils/currencySymbol';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useBoundRows } from './data/useBoundRows';


const COLOR_BG: Record<string, string> = {
  Black: '#2C2C2C', Brown: '#8B4513', 'Wine Red': '#722F37', Khaki: '#C3B091',
  Grey: '#9E9E9E', Nude: '#E5CBBC', Gold: '#D4AF37', White: '#F4F4F4',
  Silver: '#B0BEC5', Beige: '#F5DEB3', Navy: '#1B3A6B', Rose: '#E91E8C',
  'Midnight Blue': '#191970', 'Dark Gold': '#B8860B', Sand: '#C2B280', Cornflower: '#6495ED',
  Leopard: '#C4A35A', Almond: '#EFDECD',
};
const CAT_EMOJI: Record<string, string> = {
  boots: '👢', sandals: '👡', loafers: '👞', heels: '👠', pumps: '👠', sneakers: '👟', flats: '🥿',
};
const FILTER_KEYS = ['status', 'categories', 'subclasses', 'seasons', 'code', 'name', 'storeChannels', 'storeRegions', 'storeCities', 'storeTags', 'storeIds'];

const num = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const intStr = (v: unknown) => Math.round(num(v)).toLocaleString();
function fmtAmt(amt: unknown, currency: string): string {
  // Currency prefix = currency code via the single site-wide mapping (CNY→¥ / HKD→HK$, utils/currencySymbol; unknown codes pass through as-is)
  const v = num(amt); const sym = currencySymbol(currency);
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(2)}K`;
  return `${sym}${v.toFixed(0)}`;
}
const loc = (row: Record<string, unknown>, base: string, zh: boolean): string =>
  String((zh ? row[`${base}_zh`] : row[`${base}_en`]) ?? row[base] ?? '');

export interface ProductDetailRendererProps {
  id?: string;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null; 
  shareDataSourceConfig?: DatabaseDataSourceConfig | null;      
  sizeDataSourceConfig?: DatabaseDataSourceConfig | null;       
  topStoresDataSourceConfig?: DatabaseDataSourceConfig | null;  
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  /** Discount alert threshold (0..1; below it the discount block turns red). Must be configured explicitly — when absent the discount block stays neutral and no alert check runs (no code-level fallback). */
  discountThreshold?: number;
  /** Per-role font sizes (px). Empty = readable defaults. */
  titleFontSize?: number;
  valueFontSize?: number;
  labelFontSize?: number;
  cellFontSize?: number;
  badgeFontSize?: number;
}

const ProductDetailRenderer: React.FC<ProductDetailRendererProps> = ({
  id = 'product-detail',
  databaseDataSourceConfig,
  shareDataSourceConfig,
  sizeDataSourceConfig,
  topStoresDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  discountThreshold,
  titleFontSize,
  valueFontSize,
  labelFontSize,
  cellFontSize,
  badgeFontSize,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const zh = language === 'zh';
  const pluId = String(pageParams.pluId ?? pageParams.plu ?? '');


  const fsTitle = titleFontSize ?? 18;
  const fsValue = valueFontSize ?? 17;
  const fsLabel = labelFontSize ?? 13;
  const fsCell = cellFontSize ?? 13;
  const fsBadge = badgeFontSize ?? 11;

  
  const extra = useMemo(() => {
    const e: Record<string, string> = { plu: pluId };
    for (const k of FILTER_KEYS) e[k] = '';
    return e;
  }, [pluId]);

  const { rows: detailRows, loading } = useBoundRows(databaseDataSourceConfig, componentParameterConfig, pageParams, `${id}-detail`, 'plu-detail', extra);
  const { rows: shareRows } = useBoundRows(shareDataSourceConfig, componentParameterConfig, pageParams, `${id}-share`, 'plu-share', extra);
  const { rows: sizeRows } = useBoundRows(sizeDataSourceConfig, componentParameterConfig, pageParams, `${id}-size`, 'plu-size', extra);
  const { rows: topRows } = useBoundRows(topStoresDataSourceConfig, componentParameterConfig, pageParams, `${id}-top`, 'plu-top', extra);

  const d = detailRows[0];
  const back = () => { try { window.history.back(); } catch { /* noop */ } };

  if (!pluId) {
    return (
      <div className="space-y-4">
        <BackBtn t={t} onBack={back} />
        <Empty text={t('product_detail.no_product_selected', 'No product selected')} />
      </div>
    );
  }
  if (loading && !d) {
    return (
      <div className="space-y-4" aria-busy="true">
        <BackBtn t={t} onBack={back} />
        <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
          <Skeleton className="h-44 w-full rounded-xl" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        {/* Mirror the loaded 2-col metrics grid so the layout doesn't jump when data lands. */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="space-y-4">
        <BackBtn t={t} onBack={back} />
        <Empty text={t('product_detail.no_product_data', 'No data for this product')} />
      </div>
    );
  }

  const colorEn = String(d.color_en ?? '');
  const bg = COLOR_BG[colorEn] || '#E0E0E0';
  const emoji = CAT_EMOJI[String(d.category ?? '')] || '👞';
  const cur = String(d.currency ?? '');
  const sym = currencySymbol(cur);  // single site-wide symbol mapping (CNY→¥ / HKD→HK$; unknown codes pass through as-is)
  const disc = num(d.discount_rate);
  // Threshold must be configured explicitly: absent → neutral discount block (no code-level fallback)
  const discThr = typeof discountThreshold === 'number' ? discountThreshold : undefined;
  const mom = num(d.mom_pct);
  const momUp = mom >= 0;
  const keySize = num(d.key_size_ratio_pct);
  const isNew = String(d.product_status) === 'new';
  const maxStock = Math.max(...sizeRows.map(s => num(s.stock)), 1);

  return (
    <div className="space-y-4">
      <BackBtn t={t} onBack={back} />

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="flex h-44 items-center justify-center text-8xl" style={{ backgroundColor: bg }}>{emoji}</div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-slate-900 dark:text-neutral-100" style={{ fontSize: fsTitle, fontWeight: 600 }}>{loc(d, 'product_name', zh)}</div>
              <div className="mt-0.5 text-slate-500 dark:text-neutral-400" style={{ fontSize: fsLabel }}>{loc(d, 'color', zh)} · {String(d.season ?? '')}</div>
            </div>
            <span className={cn('flex-shrink-0 rounded-lg px-2 py-1', isNew ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400')} style={{ fontSize: fsBadge }}>
              {isNew ? t('product_detail.new_arrival', 'New Arrival') : t('product_detail.regular', 'Regular')}
            </span>
          </div>
          <div className="mt-2 text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{String(d.plu ?? '')} · {String(d.code ?? '')}</div>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-neutral-800/60 p-3">
            <div className="flex-1">
              <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{t('product_detail.retail_price', 'Retail Price')}</div>
              <div className="mt-0.5 text-slate-600 dark:text-neutral-400" style={{ fontSize: fsLabel }}>{sym}{intStr(d.retail_price)}</div>
            </div>
            <div className="text-slate-300 dark:text-neutral-600">›</div>
            <div className="flex-1">
              <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{t('product_detail.selling_price', 'Selling Price')}</div>
              <div className="mt-0.5 text-slate-900 dark:text-neutral-100" style={{ fontSize: fsLabel, fontWeight: 600 }}>{sym}{intStr(d.selling_price)}</div>
            </div>
            <div className={cn('rounded-xl px-3 py-2',
              discThr === undefined ? 'bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400'
                : disc < discThr ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400')} style={{ fontSize: fsLabel, fontWeight: 700 }}>
              {(disc * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Key metrics 2×4 */}
      <div className="grid grid-cols-2 gap-3">
        <Metric label={t('product_detail.sales_amount', 'Sales Amount')} value={fmtAmt(d.sales_amt, cur)} accent labelFs={fsLabel} valueFs={fsValue} />
        <Metric label={t('product_detail.sales_qty', 'Sales Qty')} value={`${intStr(d.sales_qty)} ${t('product_detail.pairs_unit', 'pairs')}`} labelFs={fsLabel} valueFs={fsValue} />
        <Metric label={t('product_detail.current_stock', 'Current Stock')} value={`${intStr(d.stock)} ${t('product_detail.pairs_unit', 'pairs')}`} labelFs={fsLabel} valueFs={fsValue} />
        <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{t('product_detail.mom_change', 'MoM Change')}</div>
          <div className={cn('mt-2 flex items-center gap-1', momUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')} style={{ fontSize: fsValue, fontWeight: 600 }}>
            {momUp ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}{momUp ? '+' : ''}{mom.toFixed(1)}%
          </div>
        </div>
        <Metric label={t('product_detail.weeks_of_supply', 'Weeks of Supply')} value={d.wos == null || d.wos === '' ? '—' : `${num(d.wos).toFixed(1)}w`} labelFs={fsLabel} valueFs={fsValue} />
        <Metric label={t('product_detail.sell_through', 'Sell-Through')} value={`${num(d.sell_through_pct).toFixed(1)}%`} labelFs={fsLabel} valueFs={fsValue} />
        <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{t('product_detail.key_size_ratio', 'Key Size Ratio (36-38)')}</div>
          <div className={cn('mt-2', keySize < 30 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-900 dark:text-neutral-100')} style={{ fontSize: fsValue, fontWeight: 600 }}>
            {keySize.toFixed(0)}%{keySize < 30 ? <span className="ml-1" style={{ fontSize: fsLabel }}>{t('product_detail.oos_risk', '⚠ OOS Risk')}</span> : null}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{t('product_detail.launch_date', 'Launch Date')}</div>
          <div className="mt-2 text-slate-800 dark:text-neutral-200" style={{ fontSize: fsValue, fontWeight: 600 }}>{String(d.launch_date ?? '')}</div>
          <div className="mt-0.5 text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{String(d.launch_season ?? d.season ?? '')}</div>
        </div>
      </div>

      {/* Share analysis */}
      <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="mb-3 text-slate-700 dark:text-neutral-300" style={{ fontSize: fsLabel, fontWeight: 500 }}>{t('product_detail.share_analysis', 'Share Analysis')}</div>
        <div className="space-y-3">
          {(shareRows.length ? shareRows : [
            { title_zh: t('product_detail.sales_share', 'Sales Share'), title_en: 'Sales Share', pct: d.sales_share_pct, bar_color: 'indigo' },
            { title_zh: t('product_detail.stock_share', 'Stock Share'), title_en: 'Stock Share', pct: d.stock_share_pct, bar_color: 'emerald' },
          ]).map((r, i) => (
            <ProgressRow key={i} label={loc(r, 'title', zh)} pct={num(r.pct)} color={String(r.bar_color) === 'emerald' ? 'emerald' : 'indigo'} labelFs={fsLabel} />
          ))}
        </div>
      </div>

      {/* Size inventory */}
      <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="mb-3 text-slate-700 dark:text-neutral-300" style={{ fontSize: fsLabel, fontWeight: 500 }}>{t('product_detail.size_inventory', 'Size Inventory Breakdown')}</div>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {sizeRows.map(ss => {
            const st = num(ss.stock); const band = String(ss.stock_band ?? (st === 0 ? 'oos' : st <= 3 ? 'low' : 'normal'));
            return (
              <div key={String(ss.size)} className={cn('rounded-xl p-2.5 text-center', band === 'oos' ? 'border border-rose-100 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40' : band === 'low' ? 'border border-amber-100 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40' : 'border border-slate-100 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-800/60')}>
                <div className="text-slate-500 dark:text-neutral-400" style={{ fontSize: fsLabel }}>{String(ss.size)}</div>
                <div className={cn('mt-1', band === 'oos' ? 'text-rose-500 dark:text-rose-400' : band === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-neutral-200')} style={{ fontSize: fsLabel, fontWeight: 700 }}>{st}</div>
              </div>
            );
          })}
        </div>
        <div className="space-y-1.5">
          {sizeRows.map(ss => {
            const st = num(ss.stock); const band = String(ss.stock_band ?? (st === 0 ? 'oos' : st <= 3 ? 'low' : 'normal'));
            return (
              <div key={String(ss.size)} className="flex items-center gap-2">
                <div className="w-8 flex-shrink-0 text-right text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>{String(ss.size)}</div>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                  <div className={cn('h-full rounded-full', band === 'oos' ? 'bg-rose-200 dark:bg-rose-400' : band === 'low' ? 'bg-amber-300 dark:bg-amber-400' : 'bg-indigo-400')} style={{ width: `${Math.round((st / maxStock) * 100)}%` }} />
                </div>
                <div className="w-6 flex-shrink-0 tabular-nums text-slate-600 dark:text-neutral-400" style={{ fontSize: fsLabel }}>{st}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-slate-400 dark:text-neutral-500" style={{ fontSize: fsLabel }}>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-rose-200 dark:bg-rose-400" />{t('product_detail.stock_oos', 'OOS')}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-amber-300 dark:bg-amber-400" />{t('product_detail.stock_low', 'Low (≤3)')}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-indigo-400" />{t('product_detail.stock_normal', 'Normal')}</span>
        </div>
      </div>

      {/* Top 10 stores */}
      <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
        <div className="mb-3 text-slate-700 dark:text-neutral-300" style={{ fontSize: fsLabel, fontWeight: 500 }}>{t('product_detail.top_stores', 'Top 10 Stores')}</div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: fsCell }}>
            <thead>
              <tr className="bg-slate-50 dark:bg-neutral-800">
                <th className="px-2 py-2 text-left font-normal text-slate-500 dark:text-neutral-400" style={{ minWidth: 28 }}>#</th>
                <th className="px-2 py-2 text-left font-normal text-slate-500 dark:text-neutral-400" style={{ minWidth: 120 }}>{t('product_detail.store', 'Store')}</th>
                <th className="px-2 py-2 text-right font-normal text-slate-500 dark:text-neutral-400" style={{ minWidth: 72 }}>{t('product_detail.sales', 'Sales')}</th>
                <th className="px-2 py-2 text-right font-normal text-slate-500 dark:text-neutral-400" style={{ minWidth: 52 }}>{t('product_detail.qty', 'Qty')}</th>
                <th className="px-2 py-2 text-right font-normal text-slate-500 dark:text-neutral-400" style={{ minWidth: 52 }}>{t('product_detail.stock', 'Stock')}</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((s, i) => (
                <tr key={String(s.store_id ?? i)} className={cn('border-t border-slate-50 dark:border-neutral-800', i % 2 === 1 && 'bg-slate-50/40 dark:bg-neutral-800/40')}>
                  <td className="px-2 py-2">
                    <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded text-white', i < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-300 dark:bg-neutral-600')} style={{ fontSize: fsBadge }}>{num(s.rank_no) || i + 1}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700 dark:text-neutral-300">{loc(s, 'store_name', zh)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-700 dark:text-neutral-300">{fmtAmt(s.sales_amt, String(s.currency ?? ''))}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-600 dark:text-neutral-400">{intStr(s.sales_qty)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-slate-500 dark:text-neutral-400">{intStr(s.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function BackBtn({ t, onBack }: { t: (key: string, defaultValue: string) => string; onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300">
      <ChevronLeft className="h-4 w-4" />{t('product_detail.back', 'Back')}
    </button>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm">
      <div className="mb-2 text-3xl">🔍</div>
      <div className="text-sm text-slate-500 dark:text-neutral-400">{text}</div>
    </div>
  );
}
function Metric({ label, value, accent, labelFs, valueFs }: { label: string; value: string; accent?: boolean; labelFs: number; valueFs: number }) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', accent ? 'border-indigo-100 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30' : 'border-slate-100 bg-white dark:border-neutral-800 dark:bg-neutral-900')}>
      <div className="text-slate-400 dark:text-neutral-500" style={{ fontSize: labelFs }}>{label}</div>
      <div className={cn('mt-1.5', accent ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-neutral-100')} style={{ fontSize: valueFs, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
function ProgressRow({ label, pct, color, labelFs }: { label: string; pct: number; color: 'indigo' | 'emerald'; labelFs: number }) {
  const bar = color === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500';
  const track = color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-slate-600 dark:text-neutral-400" style={{ fontSize: labelFs }}>{label}</span>
        <span className="text-slate-800 dark:text-neutral-200" style={{ fontSize: labelFs, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
      </div>
      <div className={cn('h-2 overflow-hidden rounded-full', track)}>
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

export default ProductDetailRenderer;
