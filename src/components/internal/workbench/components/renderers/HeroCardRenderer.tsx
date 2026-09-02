import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import { applyCustomStyles } from '@/utils/styleUtils';
import type { CustomStylesConfig } from '@/types/components';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useParameters } from '@/contexts/ParameterContext';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import {
  extractFetchGateParamsFromDatasourceParameters,
  extractParameterNamesFromDatasourceParameters,
  hasResolvedDatasourceParameterValues,
  processDataSourceParametersForQuery,
} from '@/utils/databaseDatasourceParams';
import { HeroCardSkeleton } from '../skeleton';
import {
  readRowField,
  resolveHeroCardAppearance,
  HERO_GRADIENT_PRESETS,
  HERO_DETAIL_APPEARANCE,
  type HeroCardProps,
} from './heroCardUtils';
import { renderHeroRows, DEFAULT_HERO_FONT_SIZES } from './heroCardRows';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';

export interface HeroCardRendererProps extends HeroCardProps {
  id?: string;
  customStyles?: CustomStylesConfig;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[] | Record<string, unknown>;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  followPageRefresh?: boolean;
}

function toMockRow(mockData?: Record<string, unknown>[] | Record<string, unknown>): Record<string, unknown> | null {
  if (!mockData) return null;
  if (Array.isArray(mockData)) return (mockData[0] as Record<string, unknown>) ?? null;
  return mockData;
}

const HeroCardRenderer: React.FC<HeroCardRendererProps> = ({
  className = '',
  id,
  customStyles,
  useMockData = false,
  mockData,
  databaseDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  followPageRefresh = false,
  cardPerRow = false,
  rows,
  gradientPreset,
  gradientFrom,
  gradientTo,
  gradientFromField,
  gradientToField,
  cardWidth,
  shell,
  banner,
  titleFontSize,
  valueFontSize,
  labelFontSize,
  numberFontSize,
  badgeFontSize,
}) => {
  const { t } = useTranslation('renderers');
  const { language } = useWorkbenchConfigLocale();
  const fillCell = useGrid24FillCell();
  // Narrow-flow flag (real mobile AND the studio phone frame). Wide path must stay
  // byte-identical to the original desktop rendering — only gate additions on this.
  const narrow = useMobileFlowLayout();
  const customStyleProps = id
    ? applyCustomStyles(id, customStyles, className)
    : { className, style: {} as React.CSSProperties };

  const { rawParams } = useParameterHandler({
    componentParameterConfig,
    pageParams,
    componentId: id,
  });

  const datasourceBoundParams = useMemo(
    () => extractParameterNamesFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );

  // waitForValue contract (see extractFetchGateParamsFromDatasourceParameters): strict
  // (waitForValue:true, e.g. start/end date) params gate on actual VALUES; legacy (no
  // waitForValue, no default) also value-gate here; defaulted ('' = "no filter") and opt-out
  // (waitForValue:false) params never gate — otherwise a hero carrying the full filter contract
  // stalls on a dimension the page's FilterPanel never emits. Mirrors useBoundRows.
  const requiredBoundParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(databaseDataSourceConfig?.parameters).all,
    [databaseDataSourceConfig?.parameters]
  );

  const listenParams = useMemo(() => {
    const explicit = componentParameterConfig?.listenToParameters ?? [];
    return Array.from(new Set([...explicit, ...datasourceBoundParams]));
  }, [componentParameterConfig?.listenToParameters, datasourceBoundParams]);

  const refetchRef = useRef<() => Promise<void>>(async () => {});
  const [paramTick, setParamTick] = useState(0);

  const { getCurrentParameter } = useComponentCommunication({
    componentId: id ?? 'hero-card',
    listenParameters: listenParams,
    onParameterChange: () => setParamTick(tick => tick + 1), // bump on bus change to force re-resolve (pub/sub trigger)
    immediate: true,
    autoCleanup: true,
  });

  useParameters(listenParams);
  const boundParamSig = listenParams.map(k => `${k}=${String(getCurrentParameter(k) ?? '')}`).join('|');

  // Re-evaluation trigger only (NOT a fetch gate): re-checks isParametersReady on mount so a param
  // published before this card subscribed is still caught, and re-renders when readiness flips.
  // The actual fetch decision below is strictly hasBoundValues, so this never lets an empty-date
  // request through — it just guarantees the effect re-runs once the date values land on the bus.
  const { ready: parametersReady } = useWaitForParameters(
    datasourceBoundParams.length > 0 ? datasourceBoundParams : undefined
  );

  const additionalParams = useMemo(
    () =>
      processDataSourceParametersForQuery(
        databaseDataSourceConfig?.parameters,
        databaseDataSourceConfig?.parameterTypes,
        getCurrentParameter,
        rawParams
      ),
    [
      databaseDataSourceConfig?.parameters,
      databaseDataSourceConfig?.parameterTypes,
      getCurrentParameter,
      rawParams,
      boundParamSig,
      paramTick,
    ]
  );

  const additionalParamsKey = useMemo(() => JSON.stringify(additionalParams), [additionalParams]);

  const {
    data: databaseRows,
    loading,
    refetch,
  } = useDatabaseDataSource(databaseDataSourceConfig ?? null, 'HeroCard', additionalParams, {
    autoFetch: false,
  });

  refetchRef.current = refetch;

  const lastFetchKeyRef = useRef('');

  useEffect(() => {
    if (useMockData || !databaseDataSourceConfig?.datasourceId) return;

    const hasBoundParams = requiredBoundParams.length > 0;
    const hasBoundValues = hasResolvedDatasourceParameterValues(
      requiredBoundParams,
      getCurrentParameter,
      rawParams
    );
    // Honor "wait for value": only fetch once every gating bound param
    // (waitForValue !== false, e.g. start/end date) actually has a value on the bus. Never fetch
    // with missing dates — an empty-date query falls back to all-time/unfiltered = wrong data.
    // No markParametersReady bypass: it fires before the values arrive, which is exactly what made
    // the card send an empty-date request whose slow all-time response overwrote the correct one.
    if (hasBoundParams && !hasBoundValues) return;

    // Coherence guard: the gate above reads the bus LIVE, but the request body is the
    // render-time `additionalParams`. If a bound value landed between render and this effect
    // (e.g. FilterPanel resolving dates from a warm cache during its own mount effect), the
    // live gate passes while the body still lacks the dates — an empty-date query returns
    // all-time data. Skip this run; the broadcast re-renders us and the next run is coherent.
    const liveParamsKey = JSON.stringify(
      processDataSourceParametersForQuery(
        databaseDataSourceConfig.parameters,
        databaseDataSourceConfig.parameterTypes,
        getCurrentParameter,
        rawParams
      )
    );
    if (liveParamsKey !== additionalParamsKey) return;

    const fetchKey = `${databaseDataSourceConfig.datasourceId}|${additionalParamsKey}`;
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    void refetchRef.current();
  }, [
    useMockData,
    databaseDataSourceConfig?.datasourceId,
    requiredBoundParams,
    additionalParamsKey,
    boundParamSig,
    parametersReady, // re-run when params become ready (re-render trigger; gate stays hasBoundValues)
    getCurrentParameter,
    rawParams,
  ]);

  const row = useMemo(() => {
    if (useMockData) return toMockRow(mockData);
    return (databaseRows?.[0] as Record<string, unknown>) ?? null;
  }, [useMockData, mockData, databaseRows]);

  const chartRefreshTrigger = pageParams?.chartRefreshTrigger;
  const prevTriggerRef = useRef(chartRefreshTrigger);
  useEffect(() => {
    if (!followPageRefresh || useMockData) return;
    if (prevTriggerRef.current !== chartRefreshTrigger) {
      prevTriggerRef.current = chartRefreshTrigger;
      void refetch();
    }
  }, [chartRefreshTrigger, followPageRefresh, refetch, useMockData]);

  // cardPerRow: every datasource row gets its own card (N rows -> N cards). Falls back to a
  // single null-row card while loading/empty so the skeleton state still renders.
  const cardRows = useMemo<Array<Record<string, unknown> | null>>(() => {
    if (!cardPerRow) return [];
    if (useMockData) {
      if (!mockData) return [];
      return Array.isArray(mockData) ? (mockData as Record<string, unknown>[]) : [mockData];
    }
    return (databaseRows ?? []) as Array<Record<string, unknown>>;
  }, [cardPerRow, useMockData, mockData, databaseRows]);

  // Single-card render body — the ONLY copy of the card markup. cardPerRow maps every row
  // through this same function, so a per-row card is byte-identical to the single-card view
  // (per-card titles come from row-bound rows like title-bar's titleField — no extra prop).
  const renderCard = (cardRow: Record<string, unknown> | null, key?: React.Key, mcItem = false) => {
    // Gradient color resolution priority (audit decision §2.4): row-data fields
    // (gradientFromField/ToField, color values supplied by the datasource)
    // > static config (gradientFrom/To, or editor preset quick-fill) > no gradient (default theme).
    const rowGradFrom = gradientFromField ? String(readRowField(cardRow, gradientFromField) ?? '') : '';
    const rowGradTo = gradientToField ? String(readRowField(cardRow, gradientToField) ?? '') : '';
    const preset = gradientPreset ? HERO_GRADIENT_PRESETS[gradientPreset] : undefined;
    const gradFrom = rowGradFrom || gradientFrom || preset?.from;
    const gradTo = rowGradTo || gradientTo || preset?.to;
    const appearance =
      shell === 'detail'
        ? HERO_DETAIL_APPEARANCE
        : shell === 'muted'
          ? resolveHeroCardAppearance({ theme: 'muted' })
          : resolveHeroCardAppearance({ gradientFrom: gradFrom, gradientTo: gradTo });
    const onDark = shell !== 'muted' && shell !== 'detail';

    const renderBanner = () => {
      if (!banner) return null;
      const h = banner.height ?? 176;
      const img = banner.imageField ? readRowField(cardRow, banner.imageField) : null;
      if (img) {
        // Product images are white-background cutouts (portrait/square): default to 'contain' so the whole
        // product shows at its natural aspect (no crop/stretch), letterboxed on a neutral bg. 'cover' stays
        // available for lifestyle/hero photos. encodeURI + quotes tolerate spaces/CJK in supplier image URLs.
        const fit = banner.imageFit ?? 'contain';
        return (
          <div
            style={{
              height: h,
              backgroundImage: `url("${encodeURI(String(img))}")`,
              backgroundSize: fit,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: fit === 'contain' ? (banner.imageBg ?? '#ffffff') : undefined,
            }}
          />
        );
      }
      // Image banner (imageField configured) with a missing image: show a neutral "no image" placeholder
      // (same as the list thumbnails) instead of a category emoji — an emoji reads as a real product hero.
      if (banner.imageField) {
        return (
          <div
            className="flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-slate-300 dark:text-neutral-600"
            style={{ height: h }}
          >
            <ImageOff style={{ width: '2.5rem', height: '2.5rem' }} strokeWidth={1.5} />
          </div>
        );
      }
      const colorVal = banner.colorField ? String(readRowField(cardRow, banner.colorField) ?? '') : '';
      const emojiVal = banner.emojiField ? String(readRowField(cardRow, banner.emojiField) ?? '') : '';
      const bg = banner.colorMap?.[colorVal] || banner.fallbackColor || '#E0E0E0';
      const glyph = banner.emojiMap?.[emojiVal] || banner.fallbackEmoji || '';
      return (
        <div className="flex items-center justify-center" style={{ height: h, backgroundColor: bg, fontSize: '5rem', lineHeight: 1 }}>
          {glyph}
        </div>
      );
    };

    const cardStyle: React.CSSProperties = {
      ...(appearance.containerStyle ?? {}),
      ...(cardWidth && cardWidth !== 'full' ? { width: cardWidth, flexShrink: 0, ...(narrow ? { maxWidth: '100%' } : {}) } : {}),
      ...(customStyleProps.style ?? {}),
    };

    const heroRows = rows ?? [];
    const hasBanner = !!banner;
    const currency = readRowField(cardRow, 'currency');

    return (
      <div
        key={key}
        // mcItem: cardPerRow cards are laid out by a parent MetricCarousel. The marker lets the
        // carousel count/measure each card as its own scroll item; the width comes from the
        // carousel's --mc-item-w var (fallback 100% when rendered outside a carousel).
        {...(mcItem ? { 'data-mc-item': '1' } : {})}
        className={cn('hero-card rounded-2xl', fillCell && 'h-full', hasBanner ? 'overflow-hidden' : 'p-4', appearance.containerClass, customStyleProps.className)}
        style={mcItem ? { ...cardStyle, flex: '0 0 var(--mc-item-w, 100%)', maxWidth: 'var(--mc-item-w, 100%)' } : cardStyle}
      >
        {loading && !useMockData && !cardRow ? (
          <div className={hasBanner ? 'p-4' : ''}>
            <HeroCardSkeleton rows={heroRows.length ? heroRows : undefined} onDark={onDark} className="min-h-[120px]" />
          </div>
        ) : heroRows.length > 0 ? (
          <>
            {hasBanner && renderBanner()}
            <div className={hasBanner ? 'p-4' : ''}>
              {renderHeroRows(heroRows, { row: cardRow, ap: appearance, onDark, currency, narrow, lang: language === 'zh' ? 'zh' : 'en', fs: {
                title: titleFontSize ?? DEFAULT_HERO_FONT_SIZES.title,
                value: valueFontSize ?? DEFAULT_HERO_FONT_SIZES.value,
                label: labelFontSize ?? DEFAULT_HERO_FONT_SIZES.label,
                number: numberFontSize ?? DEFAULT_HERO_FONT_SIZES.number,
                badge: badgeFontSize ?? DEFAULT_HERO_FONT_SIZES.badge,
              } })}
            </div>
          </>
        ) : (
          <p className={cn('text-xs', appearance.mutedTextClass)}>
            {t('hero_card.no_rows', 'No rows configured')}
          </p>
        )}
      </div>
    );
  };

  if (cardPerRow) {
    // Flat siblings under a Fragment (NO wrapper div). PageComponentRenderer renders this
    // component's shell as display:contents (see there), so the cards become direct flex items
    // of a parent MetricCarousel track; each card carries data-mc-item + the --mc-item-w width.
    const list = cardRows.length > 0 ? cardRows : [null];
    return <>{list.map((r, i) => renderCard(r, i, true))}</>;
  }
  return renderCard(row);
};

export default HeroCardRenderer;
