import React, { useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardContent } from '@genispace/shared-ui';
import { Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { ViewToggleButton } from './shared/ViewToggleButton';
import { cn } from '@genispace/shared-utils';
import { applyCustomStyles } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { useTranslation } from 'react-i18next';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveCanonicalFieldKeys } from '@/utils/workbenchDisplayLocale';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import {
  extractFetchGateParamsFromDatasourceParameters,
  extractStrictWaitParameterKeysFromDatasourceParameters,
} from '@/utils/databaseDatasourceParams';
import type { ComponentParameterConfig } from '@/types/parameters';
import { ChartAreaSkeleton, Skeleton } from '../skeleton';
import {
  normalizeChartColorSchemeId,
  resolveEchartsChartPalette,
  SEMANTIC_COLORS,
} from '@/utils/colors';
import { normalizeMockDataRows } from '@/utils/resolveComponentMockFields';
import i18n from '@/locales/i18n';
import { usePageFullscreen } from '@/contexts/PageFullscreenContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import {
  DEFAULT_GAUGE_TRACK_BASE,
  HORIZONTAL_BAR_LABEL_POSITION_MAP,
  VERTICAL_BAR_LABEL_POSITION_MAP,
  HORIZONTAL_BAR_LABEL_USE_CHART_FG_BELOW_FILL_RATIO,
  HORIZONTAL_BAR_LABEL_CONTRAST_ON_LONG_OUTSIDE_FILL_RATIO,
  parseEchartsBool,
  parseCssColorToRgb,
  relativeLuminance255,
  pickContrastTextOnBarFill,
  isColorTooDarkForDarkMode,
  resolveGaugeColorWithDarkModeSafe,
  colorToRgba,
  lightenColor,
  darkenColor,
  rgbTripletToCss,
  toRgbTripletString,
  rgbDistanceSquared,
  ensureGaugeTrackBaseDistinct,
  buildGaugeTrackGradient,
  ensureSolidGaugeTrackDistinct,
  coerceGaugeFontWeight,
  formatGaugeSeriesOffsetAxis,
  computePieOutsideLabelLiftDy,
} from './echarts/shared/colors';

const getCSSVariable = (variableName: string): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value ? `hsl(${value})` : '';
};

function resolveEchartsThemedForeground(themeColors: {
  foreground: string;
  cardForeground: string;
}): string {
  const cardFg = themeColors.cardForeground?.trim();
  if (cardFg) return cardFg;
  const fg = themeColors.foreground?.trim();
  if (fg) return fg;
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return '#fafafa';
  }
  return '#171717';
}

const GAUGE_DETAIL_OFFSET_DEFAULTS: { x: number | string; y: string } = { x: 0, y: '0%' };
const GAUGE_TITLE_OFFSET_DEFAULTS: { x: number | string; y: string } = { x: 0, y: '-20%' };

const GAUGE_DETAIL_FONT_FAMILY =
  '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

const ADDITIONAL_STATS_FONT_PRIMARY_ORDER = [
  'Noto Sans SC',
  'PingFang SC',
  'Hiragino Sans GB',
  'Microsoft YaHei'
] as const;

export type AdditionalStatsFontFamilyChoice =
  | (typeof ADDITIONAL_STATS_FONT_PRIMARY_ORDER)[number]
  | 'sans-serif';

export function resolveAdditionalStatsFontFamily(
  primary?: string | null
): string {
  const raw = (primary ?? '').trim();
  if (raw === 'sans-serif') {
    return 'sans-serif, "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"';
  }
  const isKnown = (ADDITIONAL_STATS_FONT_PRIMARY_ORDER as readonly string[]).includes(raw);
  const p = isKnown ? raw : 'Noto Sans SC';
  const rest = ADDITIONAL_STATS_FONT_PRIMARY_ORDER.filter((x) => x !== p);
  return [`"${p}"`, ...rest.map((x) => `"${x}"`), 'sans-serif'].join(', ');
}

function coerceGaugeCanvasPercent(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return fallback;
    const n = Number(t);
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n));
  }
  return fallback;
}

function readRowFieldValue(
  row: Record<string, unknown> | undefined,
  fieldName: string,
  ...fallbackFields: string[]
): unknown {
  if (!row) return undefined;
  const keys = [fieldName, ...fallbackFields].map((k) => k?.trim()).filter(Boolean) as string[];
  for (const key of keys) {
    const direct = row[key];
    if (direct != null && String(direct).trim() !== '') return direct;
    const lower = key.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase() === lower) {
        const v = row[k];
        if (v != null && String(v).trim() !== '') return v;
      }
    }
  }
  return undefined;
}

function applyGaugeProgressRingDrawOffsetPercent(
  value: number,
  min: number,
  max: number,
  drawOffsetPercent: number
): number {
  const range = max - min;
  if (!Number.isFinite(value) || !Number.isFinite(range) || range <= 0) {
    return value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return value;
  }
  const t = (value - min) / range;
  const tRounded = Math.round(t * 1e6) / 1e6;
  const nearFullRatio = 1 - 1e-6;
  const detailRoundedValue = Math.round(value * 100) / 100;
  const detailRoundedMax = Math.round(max * 100) / 100;
  if (
    value >= max ||
    t >= nearFullRatio ||
    tRounded >= 1 ||
    detailRoundedValue >= detailRoundedMax
  ) {
    return max;
  }
  if (value <= min || t <= 0) return min;
  if (t <= 0.5) {
    return value;
  }
  const k = Math.max(0, Math.min(0.5, drawOffsetPercent / 100));
  const tDraw = Math.max(0, t - k);
  return min + tDraw * range;
}

export interface EChartsChartRendererProps {
  title?: string;

  titleFontSize?: number;

  xAxisFontSize?: number;

  yAxisFontSize?: number;

  gaugeAxisFontSize?: number;
  data?: any[];
  chartType:
    | 'funnel'
    | 'gauge'
    | 'gaugeProgressRing'
    | 'pie'
    | 'horizontalBar'
    | 'bar'
    | 'treemap'
    | 'sankey'
    | 'wordcloud'
    | 'scatter'
    | 'line'
    | 'multiLine'
    | 'heatmap'
    | 'cluster';
  height?: number;
  loading?: boolean;
  className?: string;

  nameField?: string;
  valueField?: string;
  categoryField?: string;

  funnelSort?: 'ascending' | 'descending';
  funnelGap?: number;
  funnelLabelFontSize?: number;
  funnelLabelFontWeight?: number | string;
  funnelLabelFontFamily?: AdditionalStatsFontFamilyChoice | string;

  horizontalBarPercentBaseField?: string;

  horizontalBarShowPercent?: boolean;

  horizontalBarValueUnit?: string;

  horizontalBarLabelPosition?: 'follow' | 'insideLeft' | 'inside' | 'insideRight';

  horizontalBarLabelFontSize?: number;

  horizontalBarLabelFontWeight?: number | string;

  horizontalBarLabelFontFamily?: AdditionalStatsFontFamilyChoice | string;

  barValueDisplayMode?: 'value' | 'percent' | 'valueAndPercent';

  barNumberFormat?: 'plain' | 'thousands';

  barOrientation?: 'horizontal' | 'vertical';

  /** `progress` = ranking list (name left, % right, thin track, no grid) */
  barLayout?: 'default' | 'progress';

  /** Show category names on the category axis (Y for horizontal bars, X for vertical). Default true. */
  showCategoryLabels?: boolean;

  /**
   * Where to place category names when `showCategoryLabels` is true.
   * - `axis`: on the category axis (default)
   * - `aboveBar`: above each bar, left-aligned (horizontal / progress layout)
   */
  categoryLabelPosition?: 'axis' | 'aboveBar';

  barLengthAdjustment?: boolean;

  barGradientMode?: 'none' | 'topToBottom';

  xAxisLabelRotate?: number | 'auto';

  xAxisLabelInterval?: number | 'auto';

  xAxisLabelMaxLength?: number;

  lineSmooth?: boolean;
  lineAreaStyle?: boolean;
  lineStack?: boolean;
  lineXAxisType?: 'category' | 'value' | 'time' | 'log';
  lineYAxisType?: 'category' | 'value' | 'time' | 'log';
  lineShowSymbol?: boolean;
  lineSymbolSize?: number;
  lineStep?: 'none' | 'start' | 'middle' | 'end';

  lineCumulative?: boolean;

  multiLineValueFields?: string[];

  multiLineStack?: boolean;

  heatmapXField?: string;
  heatmapYField?: string;
  heatmapValueField?: string;
  heatmapColorLow?: string;
  heatmapColorHigh?: string;

  clusterGroupField?: string;
  clusterXField?: string;
  clusterYField?: string;
  clusterSizeField?: string;

  lineQuantityUnitSuffix?: string;

  lineYAxisValueUnit?: string;

  linePointLabelFontFamily?: AdditionalStatsFontFamilyChoice | string;

  linePointLabelFontSize?: number;

  linePointLabelFontWeight?: number | string;

  linePointLabelColor?: string;

  gaugeMin?: number;
  gaugeMax?: number;
  gaugeSplitNumber?: number;
  gaugeValue?: number;
  gaugeRadius?: number; 
  gaugeCenterX?: number; 
  gaugeCenterY?: number; 
  gaugeColor?: string | string[]; 
  gaugeAxisLineColor?: Array<[number, string]>; 

  gaugeDetailColor?: string;

  gaugeShowDetail?: boolean;

  gaugeDetailOffsetCenterX?: number | string;

  gaugeDetailOffsetCenterY?: number | string;

  gaugeTitleOffsetCenterX?: number | string;

  gaugeTitleOffsetCenterY?: number | string;

  gaugeTitleFontSize?: number;

  gaugeDetailFontSize?: number;

  gaugeLabelField?: string;

  gaugeLabelColor?: string;
  gaugeLabelFontSize?: number;

  gaugeLabelFontWeight?: number;

  gaugeTitleFontWeight?: number;

  gaugeDetailFontWeight?: number;

  gaugeLabelX?: number;

  gaugeLabelY?: number;

  gaugeArcStartAngle?: number;

  gaugeArcEndAngle?: number;

  gaugeProgressRingLineWidth?: number;

  gaugeProgressRingDrawOffsetPercent?: number;

  gaugeTrackColor?: string;

  gaugeTrackGradient?: boolean;

  gaugeProgressBarColor?: string;

  gaugeProgressRingCenterY?: number | string;

  gaugeProgressRingCanvasLabelPosition?: 'ringCenter' | 'chartTop' | 'chartBottom';

  gaugeProgressRingCanvasLabelEdgePercent?: number;

  treemapLayout?: 'squarified' | 'strip' | 'slice';

  colors?: string[];

  chartColorScheme?: string;
  pieLabelFontSize?: number;
  pieLabelFontWeight?: number | string;
  pieLabelFontFamily?: AdditionalStatsFontFamilyChoice | string;

  pieRingSize?: number;

  pieRingWidth?: number;

  /** Absolute outer radius (% of chart). When set, matches gauge-style sizing and bypasses pieRingSize scale. */
  pieOuterRadius?: number;

  /** First segment of outside label leader line (px). Overrides layout preset when set. */
  pieLabelLineLength?: number;

  /** Second (near-label) segment of outside label leader line (px). Overrides layout preset when set. */
  pieLabelLineLength2?: number;

  showTooltip?: boolean;
  showLegend?: boolean;

  meta?: {
    [key: string]: {
      alias?: string;
      formatter?: (value: any) => string;
    };
  };

  useMockData?: boolean;
  mockData?: any[];
  id?: string;
  customStyles?: CustomStylesConfig;
  showDataView?: boolean;

  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  pageParams?: Record<string, any>;

  componentParameterConfig?: ComponentParameterConfig | null;
  componentId?: string;

  followPageRefresh?: boolean;

  /** When true, renders chart body only (no outer Card/title) for embedding in List viewToggle */
  embedded?: boolean;

  headerLabelField?: string;
  headerLabelFontSize?: number;
  headerLabelFontWeight?: number | string;

  headerLabelColor?: string;

  /** Where to render headerLabelField text. Default keeps it beside the title. */
  headerLabelPosition?: 'header' | 'chartTopRight';

  additionalStats?: Array<{
    field: string;
    label?: string;
    unit?: string;
    newlineAtEnd?: boolean;

    displayContent?: 'sum' | 'ratio' | 'sumAndRatio';
    ratio?: { denominator: string; unit?: '%' | ''; prefix?: string };
  }>;

  additionalStatsLabelFontSize?: number;

  additionalStatsFontFamily?: AdditionalStatsFontFamilyChoice | string;

  additional_stats_font_family?: string;

  additionalStatsFontWeight?: number | string;

  additional_stats_font_weight?: number | string;

  additionalStatsFontBold?: boolean;

  additional_stats_font_bold?: boolean;

  additionalStatsShowLegendSquare?: boolean;

  additionalStatsNumberFormat?: 'plain' | 'thousands';

  additionalStatsPosition?: 'headerRight' | 'headerCenter' | 'chartTopRight' | 'chartTopLeft' | 'chartTopCenter';
}

const EChartsChartRenderer: React.FC<EChartsChartRendererProps> = ({
  title,
  titleFontSize,
  xAxisFontSize,
  yAxisFontSize,
  gaugeAxisFontSize,
  data = [],
  chartType,
  height = 400,
  loading = false,
  className,
  nameField = 'name',
  valueField = 'value',
  categoryField = 'category',
  funnelSort = 'descending',
  funnelGap = 0,
  funnelLabelFontSize,
  funnelLabelFontWeight,
  funnelLabelFontFamily,
  horizontalBarPercentBaseField,
  horizontalBarShowPercent = true,
  horizontalBarValueUnit,
  horizontalBarLabelPosition = 'follow',
  horizontalBarLabelFontSize,
  horizontalBarLabelFontWeight,
  horizontalBarLabelFontFamily,
  barValueDisplayMode,
  barNumberFormat = 'thousands',
  barOrientation = 'vertical',
  barLayout = 'default',
  showCategoryLabels = true,
  categoryLabelPosition = 'axis',
  barLengthAdjustment = false,
  barGradientMode: _barGradientMode = 'none',
  xAxisLabelRotate = 'auto',
  xAxisLabelInterval = 'auto',
  xAxisLabelMaxLength = 12,
  lineSmooth = false,
  lineAreaStyle = false,
  lineStack = false,
  lineXAxisType = 'category',
  lineYAxisType = 'value',
  lineShowSymbol = true,
  lineSymbolSize = 4,
  lineStep = 'none',
  lineCumulative = false,
  multiLineValueFields = [],
  multiLineStack,
  heatmapXField = 'x',
  heatmapYField = 'y',
  heatmapValueField = 'value',
  heatmapColorLow = '#f7faff',
  heatmapColorHigh = '#004a8f',
  clusterGroupField = 'group',
  clusterXField = 'x',
  clusterYField = 'y',
  clusterSizeField = 'value',
  lineQuantityUnitSuffix,
  lineYAxisValueUnit,
  linePointLabelFontFamily,
  linePointLabelFontSize,
  linePointLabelFontWeight,
  linePointLabelColor,
  gaugeMin = 0,
  gaugeMax = 100,
  gaugeSplitNumber = 10,
  gaugeValue,
  gaugeRadius = 95,
  gaugeCenterX = 50,
  gaugeCenterY = 65,
  gaugeColor,
  gaugeAxisLineColor,
  gaugeDetailColor,
  gaugeShowDetail,
  gaugeDetailOffsetCenterX,
  gaugeDetailOffsetCenterY,
  gaugeTitleOffsetCenterX,
  gaugeTitleOffsetCenterY,
  gaugeTitleFontSize,
  gaugeDetailFontSize,
  gaugeLabelField,
  gaugeLabelColor,
  gaugeLabelFontSize = 14,
  gaugeLabelFontWeight,
  gaugeTitleFontWeight,
  gaugeDetailFontWeight,
  gaugeLabelX = 50,
  gaugeLabelY = 90,
  gaugeArcStartAngle,
  gaugeArcEndAngle,
  gaugeProgressRingLineWidth = 18,
  gaugeProgressRingDrawOffsetPercent,
  gaugeTrackColor,
  gaugeTrackGradient,
  gaugeProgressBarColor,
  gaugeProgressRingCenterY,
  gaugeProgressRingCanvasLabelPosition,
  gaugeProgressRingCanvasLabelEdgePercent,
  treemapLayout = 'squarified',
  colors,
  chartColorScheme = 'default',
  pieLabelFontSize,
  pieLabelFontWeight,
  pieLabelFontFamily,
  pieRingSize,
  pieRingWidth,
  pieOuterRadius,
  pieLabelLineLength,
  pieLabelLineLength2,
  showTooltip = true,
  showLegend = true,
  meta = {},
  useMockData = false,
  mockData = [],
  id,
  componentId,
  customStyles,
  showDataView = false,
  databaseDataSourceConfig,
  pageParams = {},
  componentParameterConfig,
  followPageRefresh = false,
  embedded = false,
  headerLabelField,
  headerLabelFontSize = 14,
  headerLabelFontWeight = 400,
  headerLabelColor,
  headerLabelPosition = 'header',
  additionalStats,
  additionalStatsLabelFontSize,
  additionalStatsFontFamily,
  additional_stats_font_family,
  additionalStatsFontWeight,
  additional_stats_font_weight,
  additionalStatsFontBold,
  additional_stats_font_bold,
  additionalStatsShowLegendSquare = false,
  additionalStatsNumberFormat = 'thousands',
  additionalStatsPosition = 'chartTopLeft'
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const { localizeRows, localizeText, labelMap, language } = useWorkbenchConfigLocale();
  const dataNameFields = useMemo(
    () => resolveCanonicalFieldKeys(nameField, labelMap, language),
    [nameField, labelMap, language]
  );
  const dataNameField = dataNameFields[0] ?? nameField;
  const displayNameField = useMemo(
    () => localizeText(dataNameField) || nameField,
    [dataNameField, nameField, localizeText]
  );
  const getRowName = (item: Record<string, unknown>) => {
    for (const key of dataNameFields) {
      const value = readRowFieldValue(item, key);
      if (value != null && String(value).trim() !== '') {
        return localizeText(String(value));
      }
    }
    const fallback = readRowFieldValue(item, nameField, 'name');
    return fallback != null && String(fallback).trim() !== ''
      ? localizeText(String(fallback))
      : '';
  };
  const chartRef = useRef<ReactECharts>(null);
  const isPageFullscreen = usePageFullscreen();
  const isNarrowFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell() && !embedded;
  const fillHeight = fillCell;
  const [viewType, setViewType] = React.useState<'chart' | 'data'>('chart');
  const [themeColors, setThemeColors] = React.useState({
    foreground: '',
    popover: '',
    border: '',
    card: '',
    cardForeground: ''
  });

  const parametersKey = JSON.stringify(databaseDataSourceConfig?.parameters || {});
  const listenToParametersKey = JSON.stringify(componentParameterConfig?.listenToParameters || []);

  const listenParams = useMemo(() => {

    if (componentParameterConfig?.listenToParameters && componentParameterConfig.listenToParameters.length > 0) {
      return componentParameterConfig.listenToParameters;
    }

    const extractedParams: string[] = [];
    if (databaseDataSourceConfig?.parameters) {
      Object.values(databaseDataSourceConfig.parameters).forEach((value: any) => {

        if (value && typeof value === 'object' && value.type === 'parameter' && value.source) {
          extractedParams.push(value.source);
        }
      });
    }

    return extractedParams;

  }, [parametersKey, listenToParametersKey]);

  // waitForValue contract: only gating params (strict waitForValue:true + legacy no-default)
  // hold the first fetch; opt-out (waitForValue:false) and defaulted bindings never do. When
  // listenToParameters is configured explicitly, keep waiting on that list (legacy behavior).
  // NOTE: this renderer resolves the request body from pageParams only (no bus reads), so
  // strict keys are checked against the resolved body below.
  const fetchGateParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [parametersKey]
  );
  const fetchWaitParams = useMemo(
    () =>
      componentParameterConfig?.listenToParameters?.length
        ? listenParams
        : fetchGateParams.all,
    [componentParameterConfig?.listenToParameters, listenParams, fetchGateParams]
  );
  const strictWaitKeys = useMemo(
    () => extractStrictWaitParameterKeysFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [parametersKey]
  );

  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    fetchWaitParams.length > 0 ? fetchWaitParams : undefined
  );

  const resolvedDatabaseDataSourceConfig = useMemo(() => {
    if (!databaseDataSourceConfig) return null;

    if (!databaseDataSourceConfig.parameters || Object.keys(databaseDataSourceConfig.parameters).length === 0) {
      return databaseDataSourceConfig;
    }

    const resolvedParameters: Record<string, any> = {};

    Object.entries(databaseDataSourceConfig.parameters).forEach(([key, value]) => {
      if (value && typeof value === 'object' && (value as any).type === 'parameter') {
        const paramConfig = value as { type: 'parameter'; source: string; value?: any };
        const paramName = paramConfig.source;
        let actualValue = pageParams[paramName];

        if (actualValue && typeof actualValue === 'object') {
          if ('id' in actualValue) {
            actualValue = actualValue.id;
          } else if ('value' in actualValue) {
            actualValue = actualValue.value;
          }
        }

        resolvedParameters[key] = actualValue !== undefined ? actualValue : paramConfig.value;
      } else {
        resolvedParameters[key] = value;
      }
    });

    return {
      ...databaseDataSourceConfig,
      parameters: resolvedParameters
    };
  }, [databaseDataSourceConfig, pageParams]);

  const {
    data: databaseData,
    loading: databaseLoading,
    error: databaseError,
    isInitialized: databaseInitialized,
    refetch: refetchDatabaseData
  } = useDatabaseDataSource(
    resolvedDatabaseDataSourceConfig,
    'Chart',
    {},
    {
      autoFetch: false, 
      errorConfig: {
        showToast: true,
        retryAttempts: 2,
        retryDelay: 1000
      }
    }
  );

  const refetchRef = useRef(refetchDatabaseData);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConfigKeyRef = useRef<string>('');

  useEffect(() => {
    refetchRef.current = refetchDatabaseData;
  }, [refetchDatabaseData]);

  useEffect(() => {

    if (!databaseDataSourceConfig?.datasourceId) {
      return;
    }

    const configKey = JSON.stringify({
      datasourceId: databaseDataSourceConfig.datasourceId,
      parameters: resolvedDatabaseDataSourceConfig?.parameters || {},
      listenParams: listenParams
    });

    if (configKey === lastConfigKeyRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const hasWaitParams = fetchWaitParams.length > 0;

    // strict (waitForValue:true) keys must have resolved into the request body itself —
    // readiness marks alone don't count. Checking the body keeps gate == payload.
    const resolvedP = (resolvedDatabaseDataSourceConfig?.parameters || {}) as Record<string, unknown>;
    const strictBodyOk = strictWaitKeys.every(k => resolvedP[k] !== undefined && resolvedP[k] !== null);
    const isReallyReady =
      strictBodyOk && (!hasWaitParams || parametersReady || checkParametersReady(fetchWaitParams));
    if ((hasWaitParams || strictWaitKeys.length > 0) && !isReallyReady) {

      return;
    }

    lastConfigKeyRef.current = configKey;
    timeoutRef.current = setTimeout(() => {
      refetchRef.current();
    }, 0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    databaseDataSourceConfig?.datasourceId,
    listenParams,
    fetchWaitParams,
    strictWaitKeys,
    parametersReady,
    checkParametersReady,
    resolvedDatabaseDataSourceConfig
  ]);

  const chartRefreshTrigger = pageParams?.chartRefreshTrigger;
  useEffect(() => {
    if (!followPageRefresh || !databaseDataSourceConfig?.datasourceId || chartRefreshTrigger == null) {
      return;
    }
    refetchRef.current();
  }, [followPageRefresh, databaseDataSourceConfig?.datasourceId, chartRefreshTrigger]);

  useEffect(() => {
    if (!isPageFullscreen) return;
    const frame = window.requestAnimationFrame(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isPageFullscreen]);

  useEffect(() => {
    const updateColors = () => {
      setThemeColors({
        foreground: getCSSVariable('--foreground'),
        popover: getCSSVariable('--popover'),
        border: getCSSVariable('--border'),
        card: getCSSVariable('--card'),
        cardForeground: getCSSVariable('--card-foreground')
      });
    };

    updateColors();

    const observer = new MutationObserver(() => {
      updateColors();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const customStyleProps = id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };

  const rawChartData = useMemo(() => {
    const mockRows = normalizeMockDataRows(mockData);
    if (useMockData) {
      if (mockRows.length > 0) {
        return mockRows;
      }
      const dataRows = normalizeMockDataRows(data);
      if (dataRows.length > 0) {
        return dataRows;
      }
    }
    if (databaseDataSourceConfig?.datasourceId && databaseData && databaseData.length > 0) {
      return databaseData;
    }
    return normalizeMockDataRows(data);
  }, [useMockData, mockData, databaseDataSourceConfig?.datasourceId, databaseData, data]);

  const chartData = useMemo(
    () => localizeRows(rawChartData),
    [rawChartData, localizeRows]
  );

  const headerLabelText = useMemo(() => {
    if (!headerLabelField || !chartData?.length) return '';
    const raw = chartData[0][headerLabelField];
    if (raw == null) return '';
    return localizeText(String(raw));
  }, [chartData, headerLabelField, localizeText]);

  const expectsRemoteData =
    Boolean(databaseDataSourceConfig?.datasourceId) && !useMockData;

  const isLoading =
    loading ||
    (expectsRemoteData && databaseLoading) ||
    (expectsRemoteData && !databaseInitialized && !databaseError);

  const defaultColors = resolveEchartsChartPalette(chartColorScheme, colors);
  const chartPaletteKey = useMemo(() => {
    const scheme = normalizeChartColorSchemeId(chartColorScheme);
    const custom =
      Array.isArray(colors) && colors.length > 0 ? colors.join('|') : '';
    return `${scheme}::${custom}`;
  }, [chartColorScheme, colors]);
  const isLineLikeChart = chartType === 'line' || chartType === 'multiLine';
  const isBarLikeChart = chartType === 'bar' || chartType === 'horizontalBar';
  const isPieChart = chartType === 'pie';
  const isFunnelChart = chartType === 'funnel';
  const isGaugeLikeChart = chartType === 'gauge' || chartType === 'gaugeProgressRing';

  const isCompactLayoutChart =
    isBarLikeChart || isLineLikeChart || isPieChart || isFunnelChart || isGaugeLikeChart;
  const isStatsSupportedChart = isLineLikeChart || isBarLikeChart;
  const parseNumericLike = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const compact = value.replace(/,/g, '').trim();
      const matched = compact.match(/-?\d+(\.\d+)?/);
      if (matched) {
        const n = Number(matched[0]);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const toNumber = (value: unknown): number => {
    return parseNumericLike(value);
  };
  const formatDisplayNumber = (value: number, mode: 'plain' | 'thousands'): string => {
    if (!Number.isFinite(value)) return '0';
    return mode === 'thousands' ? value.toLocaleString('zh-CN') : String(value);
  };

  const formatLineQuantityValue = (value: unknown, suffix: string): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (!suffix) return String(value);
    return `${value}${suffix}`;
  };

  const getLineAxisTooltipFormatter = (
    qtySuffix: string
  ): ((params: unknown) => string) | undefined => {
    if (!qtySuffix) return undefined;
    return (params: unknown) => {
      const arr = Array.isArray(params) ? params : [params];
      if (!arr.length) return '';
      type AxisTip = {
        axisValueLabel?: string;
        name?: string;
        marker?: string;
        seriesName?: string;
        value?: unknown;
      };
      const first = arr[0] as AxisTip;
      const header = String(first.axisValueLabel ?? first.name ?? '');
      const body = arr.map((raw) => {
        const p = raw as AxisTip;
        return `${p.marker ?? ''}${p.seriesName ?? ''}: ${formatLineQuantityValue(p.value, qtySuffix)}`;
      });
      return [header, ...body].join('<br/>');
    };
  };
  const formatStatNumberWithGrouping = (value: unknown): string | number => {
    if (additionalStatsNumberFormat === 'plain') {
      return value as string | number;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toLocaleString('zh-CN');
    }
    if (typeof value === 'string') {
      const compact = value.replace(/,/g, '').trim();
      if (/^-?\d+(\.\d+)?$/.test(compact)) {
        const n = Number(compact);
        if (Number.isFinite(n)) {
          return n.toLocaleString('zh-CN');
        }
      }
    }
    return value as string | number;
  };
  const parseAxisNumberConfig = (value: number | 'auto' | string | undefined, fallback: 'auto'): number | 'auto' => {
    if (value === undefined || value === null || value === '') return fallback;
    if (value === 'auto') return 'auto';
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n) ? Number(n) : fallback;
  };
  const axisLabelRotateConfig = parseAxisNumberConfig(xAxisLabelRotate as number | 'auto' | string | undefined, 'auto');
  const axisLabelIntervalConfig = parseAxisNumberConfig(xAxisLabelInterval as number | 'auto' | string | undefined, 'auto');
  const barLengthAdjustmentOn = parseEchartsBool(barLengthAdjustment, false);
  const gaugeShowDetailOn = parseEchartsBool(gaugeShowDetail, true);
  const axisLabelMaxLengthConfig =
    typeof xAxisLabelMaxLength === 'number' && Number.isFinite(xAxisLabelMaxLength) && xAxisLabelMaxLength > 0
      ? Math.floor(xAxisLabelMaxLength)
      : 12;
  const resolveCategoryAxisLabelRotate = (labels: string[], axisPixelWidth?: number): number => {
    if (!Array.isArray(labels) || labels.length === 0) return 0;
    const chartWidth = chartRef.current?.getEchartsInstance?.().getWidth?.() ?? 760;
    const plotWidth = axisPixelWidth ?? Math.max(240, chartWidth - 120);
    const avgSlotWidth = Math.max(1, plotWidth / labels.length);
    const axisFontSize = xAxisFontSize && xAxisFontSize > 0 ? xAxisFontSize : 12;
    const measureTextWidth = (text: string): number => {
      if (typeof document === 'undefined') {
        return text.length * (axisFontSize * 0.58);
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return text.length * (axisFontSize * 0.58);
      ctx.font = `${axisFontSize}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","PingFang SC","Microsoft YaHei",sans-serif`;
      return ctx.measureText(text).width;
    };
    const maxLabelWidth = labels.reduce((m, raw) => {
      const text = String(raw ?? '');
      const truncated = text.length > axisLabelMaxLengthConfig
        ? `${text.slice(0, Math.max(1, axisLabelMaxLengthConfig))}...`
        : text;
      return Math.max(m, measureTextWidth(truncated));
    }, 0);
    if (maxLabelWidth <= avgSlotWidth * 0.96) return 0;
    if (maxLabelWidth <= avgSlotWidth * 1.3) return 20;
    if (maxLabelWidth <= avgSlotWidth * 1.75) return 35;
    return 45;
  };
  const resolveAxisLabelStrategy = (labels: string[], axis: 'x' | 'y') => {
    const safeLabels = Array.isArray(labels) ? labels : [];
    const chartWidth = chartRef.current?.getEchartsInstance?.().getWidth?.() ?? 760;
    const chartHeight = chartRef.current?.getEchartsInstance?.().getHeight?.() ?? Math.max(320, height);
    const axisPixelWidth = axis === 'x' ? Math.max(240, chartWidth - 120) : Math.max(120, chartHeight - 120);
    const avgSlotWidth = safeLabels.length > 0 ? axisPixelWidth / safeLabels.length : axisPixelWidth;
    const autoRotate = (() => {
      if (axis === 'y') return 0;
      return resolveCategoryAxisLabelRotate(safeLabels, axisPixelWidth);
    })();
    const rotate = axisLabelRotateConfig === 'auto' ? autoRotate : axisLabelRotateConfig;
    const autoInterval = avgSlotWidth < 18 ? 2 : avgSlotWidth < 26 ? 1 : 0;
    const interval = axisLabelIntervalConfig === 'auto' ? autoInterval : axisLabelIntervalConfig;
    const formatter = (value: string) => {
      const text = String(value ?? '');
      return text.length > axisLabelMaxLengthConfig
        ? `${text.slice(0, Math.max(1, axisLabelMaxLengthConfig))}...`
        : text;
    };
    return { rotate, interval, formatter };
  };
  const toCumulative = (values: number[]): number[] => {
    let running = 0;
    return values.map((v) => {
      running += v;
      return running;
    });
  };
  const parseLinePointValue = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const n = parseNumericLike(value);
    return Number.isFinite(n) ? n : null;
  };
  const toCumulativeWithNull = (values: Array<number | null>): Array<number | null> => {
    let running = 0;
    return values.map((v) => {
      if (v === null) return null;
      running += v;
      return running;
    });
  };
  const splitLineStyle = {
    color: themeColors.foreground || '#94a3b8',
    type: 'dashed' as const,
    opacity: 0.2,
    width: 1
  };
  const axisLineStyle = {
    color: themeColors.foreground || '#94a3b8',
    opacity: 0.55,
    width: 1
  };

  const lineLikeStatsItems = useMemo(() => {
    if (!isStatsSupportedChart || !Array.isArray(additionalStats) || additionalStats.length === 0) {
      return [];
    }

    const trim = (v: unknown) => String(v ?? '').trim();
    const wideFields = (Array.isArray(multiLineValueFields) ? multiLineValueFields : [])
      .map(trim)
      .filter(Boolean);
    const hasWideFields = chartType === 'multiLine' && wideFields.length > 0;

    const longSeriesNames =
      chartType === 'multiLine' && !hasWideFields
        ? Array.from(
            new Set(
              chartData
                .map((row) => trim(row?.[categoryField]))
                .filter(Boolean)
            )
          )
        : [];
    const lineSeriesNames = chartType === 'line' ? [trim(valueField)].filter(Boolean) : [];
    const barSeriesNames = isBarLikeChart ? [trim(valueField)].filter(Boolean) : [];
    const availableFields = hasWideFields
      ? wideFields
      : longSeriesNames.length > 0
        ? longSeriesNames
        : isLineLikeChart
          ? lineSeriesNames
          : barSeriesNames;

    const sumByField = (targetField: string) => {
      if (!targetField) return 0;
      if (chartType === 'multiLine' && !hasWideFields) {
        return chartData.reduce((acc, row) => {
          const category = trim(row?.[categoryField]);
          if (category !== targetField) return acc;
          return acc + toNumber(row?.[valueField]);
        }, 0);
      }
      if (isBarLikeChart && targetField === trim(valueField)) {
        return chartData.reduce((acc, row) => acc + toNumber(row?.[valueField]), 0);
      }
      return chartData.reduce((acc, row) => acc + toNumber(row?.[targetField]), 0);
    };

    return additionalStats
      .filter((item) => trim(item.field))
      .filter((item) => availableFields.length === 0 || availableFields.includes(trim(item.field)))
      .map((item) => {
        const field = trim(item.field);
        const sum = sumByField(field);
        const displayName = item.label || (meta[field]?.alias as string | undefined) || field;
        const formatter = (meta[field] as { formatter?: unknown } | undefined)?.formatter;
        let formattedValue: string | number = sum;
        if (typeof formatter === 'function') {
          formattedValue = formatter(sum);
        } else if (formatter === 'percentage') {
          formattedValue = `${sum}%`;
        }

        formattedValue = formatStatNumberWithGrouping(formattedValue);
        const unit = item.unit || '';
        const hasDenominator = Boolean(trim(item.ratio?.denominator));
        const rawMode = item.displayContent;
        const effectiveMode: 'sum' | 'ratio' | 'sumAndRatio' =
          rawMode === 'sum' || rawMode === 'ratio' || rawMode === 'sumAndRatio'
            ? rawMode
            : hasDenominator
              ? 'sumAndRatio'
              : 'sum';

        let ratioPart = '';
        if (hasDenominator && item.ratio) {
          const denominator = trim(item.ratio.denominator);
          const denominatorSum = sumByField(denominator);
          const pctStr =
            denominatorSum === 0 ? '-' : `${Math.round((sum / denominatorSum) * 100)}%`;
          const ratioPrefixText =
            item.ratio.prefix !== undefined && item.ratio.prefix !== null
              ? item.ratio.prefix
              : t('chart.additional_stats_ratio_prefix_default', 'Share');
          ratioPart = `${ratioPrefixText}${pctStr}`;
        }

        const colorIndex = availableFields.indexOf(field);
        const color = defaultColors[colorIndex >= 0 ? colorIndex % defaultColors.length : 0];
        return {
          displayName,
          formattedValue,
          unit,
          ratioPart,
          effectiveMode,
          color,
          newlineAtEnd: Boolean(item.newlineAtEnd)
        };
      });
  }, [
    additionalStats,
    categoryField,
    chartData,
    chartType,
    defaultColors,
    isBarLikeChart,
    isLineLikeChart,
    isStatsSupportedChart,
    additionalStatsNumberFormat,
    formatStatNumberWithGrouping,
    meta,
    multiLineValueFields,
    t,
    valueField
  ]);

  const rawAdditionalStatsPosition = additionalStatsPosition || 'chartTopLeft';
  // Narrow flow: the absolute header overlay draws over the title at 390px — remap into the chart-top row.
  const normalizedAdditionalStatsPosition =
    isNarrowFlow && rawAdditionalStatsPosition === 'headerCenter'
      ? 'chartTopCenter'
      : isNarrowFlow && rawAdditionalStatsPosition === 'headerRight'
        ? 'chartTopRight'
        : rawAdditionalStatsPosition;
  const statsRenderInHeader =
    normalizedAdditionalStatsPosition === 'headerRight' ||
    normalizedAdditionalStatsPosition === 'headerCenter';
  const statsRenderInChartTop = !statsRenderInHeader;

  const additionalStatsFontFamilyCss = resolveAdditionalStatsFontFamily(
    additionalStatsFontFamily ?? additional_stats_font_family
  );
  const statsFontWeightResolved = coerceGaugeFontWeight(
    additionalStatsFontWeight ?? additional_stats_font_weight,
    500
  );
  const statsFontBold = parseEchartsBool(
    additionalStatsFontBold ?? additional_stats_font_bold,
    false
  );
  const statsFontWeight: React.CSSProperties['fontWeight'] = statsFontBold
    ? 700
    : statsFontWeightResolved;
  const funnelLabelFontFamilyCss = resolveAdditionalStatsFontFamily(funnelLabelFontFamily);
  const barLabelFontFamilyCss = resolveAdditionalStatsFontFamily(horizontalBarLabelFontFamily);
  const pieLabelFontFamilyCss = resolveAdditionalStatsFontFamily(pieLabelFontFamily);
  const funnelLabelFontWeightResolved = coerceGaugeFontWeight(funnelLabelFontWeight, 400);
  const barLabelFontWeightResolved = coerceGaugeFontWeight(horizontalBarLabelFontWeight, 400);
  const pieLabelFontWeightResolved = coerceGaugeFontWeight(pieLabelFontWeight, 400);

  const renderAdditionalStats = (containerClassName: string) => {
    if (lineLikeStatsItems.length === 0) return null;
    const statsFontSize = additionalStatsLabelFontSize ?? 18;
    return (
      <div
        className={cn(
          'chart-additional-stats flex w-full flex-wrap content-start items-start gap-x-6',
          containerClassName
        )}
        style={{
          fontSize: `${statsFontSize}px`,
          fontFamily: additionalStatsFontFamilyCss,
          fontWeight: statsFontWeight
        }}
      >
        {lineLikeStatsItems.map(
          ({ displayName, formattedValue, unit, ratioPart, effectiveMode, color, newlineAtEnd }, idx) => (
          <span
            key={`${displayName}-${idx}`}
            className={cn(
              'inline-flex max-w-full shrink-0 items-baseline text-left',
              newlineAtEnd && 'block w-full max-w-full basis-full shrink-0'
            )}
            style={{
              color,
              fontFamily: additionalStatsFontFamilyCss,
              fontWeight: statsFontWeight
            }}
          >
            {additionalStatsShowLegendSquare ? (
              <span
                className="mr-2 inline-block h-2 w-2 shrink-0 self-center rounded-[2px]"
                style={{ backgroundColor: color }}
              />
            ) : null}
            {effectiveMode === 'sum' ? (
              <>
                {displayName}: {formattedValue}
                {unit}
              </>
            ) : effectiveMode === 'ratio' ? (
              <>
                {displayName}:{' '}
                {ratioPart ? (
                  <span
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: additionalStatsFontFamilyCss,
                      fontWeight: statsFontWeight
                    }}
                  >
                    {ratioPart}
                  </span>
                ) : (
                  '-'
                )}
              </>
            ) : (
              <>
                {displayName}: {formattedValue}
                {unit}
                {ratioPart ? (
                  <span
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: additionalStatsFontFamilyCss,
                      fontWeight: statsFontWeight
                    }}
                  >
                    {ratioPart}
                  </span>
                ) : null}
              </>
            )}
          </span>
        ))}
      </div>
    );
  };

  const renderDataView = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="data-empty flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">📊</div>
            <p className={`text-sm ${SEMANTIC_COLORS.text.muted}`}>{i18n.t('renderers:chart.no_data', 'No data')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="data-table-view overflow-auto custom-scrollbar">
        <table className="data-table w-full border-collapse">
          <thead className="data-table-header">
            <tr className="data-table-row border-b">
              <th className="data-table-cell text-left p-2 font-semibold">{displayNameField}</th>
              <th className="data-table-cell text-left p-2 font-semibold">{valueField}</th>
            </tr>
          </thead>
          <tbody className="data-table-body">
            {chartData.map((item, index) => (
              <tr key={index} className="data-table-row border-b hover:bg-muted/50">
                <td className="data-table-cell p-2">{getRowName(item)}</td>
                <td className="data-table-cell p-2">{item[valueField] || item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const buildHeatmapInRangeColors = (palette: string[]): string[] => {
    const anchor = palette[0] || '#5aa9e6';
    return [
      lightenColor(anchor, 0.88),
      lightenColor(anchor, 0.62),
      lightenColor(anchor, 0.28),
      anchor,
      darkenColor(anchor, 0.35)
    ];
  };

  const resolveClusterSymbolSize = (val: unknown, params?: { data?: unknown }): number => {
    const row = Array.isArray(val) ? val : params?.data;
    const size = Array.isArray(row) ? Number(row[2]) : NaN;
    return Math.sqrt(Number.isFinite(size) && size > 0 ? size : 1) * 4;
  };

  const buildOption = () => {
    const themedForeground = resolveEchartsThemedForeground(themeColors);
    const resolvedLineStep: false | 'start' | 'middle' | 'end' =
      lineStep === 'none' ? false : lineStep;
    const lineQtySuffix = (lineQuantityUnitSuffix ?? '').trim();
    const lineYAxisUnitStr = (lineYAxisValueUnit ?? '').trim();
    const lineYAxisTickFormatter =
      lineYAxisUnitStr !== '' && (lineYAxisType === 'value' || lineYAxisType === 'log')
        ? (v: number | string) => `${v}${lineYAxisUnitStr}`
        : undefined;
    const linePointLabelFormatter =
      lineQtySuffix !== ''
        ? (p: { value?: unknown }) => formatLineQuantityValue(p.value, lineQtySuffix)
        : undefined;

    const linePointLabelTextStyle: Record<string, string | number> = {};
    if (
      typeof linePointLabelFontSize === 'number' &&
      Number.isFinite(linePointLabelFontSize) &&
      linePointLabelFontSize > 0
    ) {
      linePointLabelTextStyle.fontSize = linePointLabelFontSize;
    }
    if (linePointLabelFontWeight !== undefined && linePointLabelFontWeight !== '') {
      linePointLabelTextStyle.fontWeight = coerceGaugeFontWeight(linePointLabelFontWeight, 400);
    }
    const linePointFontFamilyTrim = (linePointLabelFontFamily ?? '').trim();
    if (linePointFontFamilyTrim !== '') {
      linePointLabelTextStyle.fontFamily = resolveAdditionalStatsFontFamily(linePointLabelFontFamily);
    }
    const linePointColorTrim = (linePointLabelColor ?? '').trim();

    linePointLabelTextStyle.color = linePointColorTrim || themedForeground;

    const baseOption: any = {
      backgroundColor: 'transparent', 
      tooltip: showTooltip ? {
        trigger: 'item',
        backgroundColor: themeColors.popover || '#fff',
        borderColor: themeColors.border || '#e5e7eb',
        borderWidth: 1,
        borderRadius: 6,
        textStyle: {
          color: themedForeground
        }
      } : undefined,
      legend: showLegend ? {
        bottom: 0,
        textStyle: {
          color: themedForeground
        }
      } : undefined,
      color: defaultColors
    };

    const seriesData = chartData.map(item => {

      const value = item[valueField] !== undefined ? item[valueField] : (item.value !== undefined ? item.value : 0);

      const numValue = parseNumericLike(value);
      return {
        ...item,
        name: getRowName(item),
        value: isNaN(numValue) ? 0 : numValue
      };
    });

    switch (chartType) {
      case 'funnel': {

        const sortedData = [...seriesData].sort((a, b) =>
          funnelSort === 'descending' ? b.value - a.value : a.value - b.value
        );

        const FUNNEL_DEFAULT_ITEM_HEIGHT_PX = 44;
        const FUNNEL_MIN_ITEM_HEIGHT_PX = 24;
        const FUNNEL_MIN_VERTICAL_PADDING_PX = 10;
        const stageCount = Math.max(sortedData.length, 1);
        const gapPx = Number.isFinite(funnelGap) && funnelGap > 0 ? funnelGap : 0;
        const gapTotal = Math.max(0, stageCount - 1) * gapPx;
        const legendReservedPx = showLegend ? 30 : 0;
        const drawableHeight = Math.max(160, height - legendReservedPx);
        const maxStageAreaHeight = Math.max(
          stageCount * FUNNEL_MIN_ITEM_HEIGHT_PX,
          drawableHeight - FUNNEL_MIN_VERTICAL_PADDING_PX * 2 - gapTotal
        );
        const resolvedItemHeight = Math.max(
          FUNNEL_MIN_ITEM_HEIGHT_PX,
          Math.min(FUNNEL_DEFAULT_ITEM_HEIGHT_PX, Math.floor(maxStageAreaHeight / stageCount))
        );
        const stageAreaHeight = resolvedItemHeight * stageCount + gapTotal;
        const verticalPadding = Math.max(
          FUNNEL_MIN_VERTICAL_PADDING_PX,
          Math.floor((drawableHeight - stageAreaHeight) / 2)
        );
        const funnelTop = verticalPadding;
        const funnelBottom = verticalPadding + legendReservedPx;

        const labelFormatter = (params: {
          dataIndex: number;
          name: string;
          value: number;
        }) => {
          const { dataIndex, name, value } = params;

          if (dataIndex === 0) {
            return `${name}: ${value}`;
          }

          const prevValue = sortedData[dataIndex - 1].value;
          return `${name}: ${value} / ${prevValue}`;
        };

        const values = sortedData.map(item => item.value);
        const maxValue = Math.max(...values);
        const isDarkTheme = typeof document !== 'undefined'
          && document.documentElement.classList.contains('dark');
        const funnelLabelColor = isDarkTheme ? '#f9fafb' : '#111827';

        const coloredData = sortedData.map((item, index) => {
          const baseColor = defaultColors[index % defaultColors.length];
          return {
            ...item,
            itemStyle: {
              color: baseColor,
              borderColor: themeColors.card || '#fff',
              borderWidth: 1
            },
            label: {
              color: funnelLabelColor
            }
          };
        });

        return {
          ...baseOption,
          legend: showLegend
            ? {
                ...(baseOption.legend || {}),
                bottom: '2%'
              }
            : undefined,
          series: [{
            type: 'funnel',
            left: '8%',
            top: funnelTop,
            bottom: funnelBottom,
            width: '84%',
            min: 0,
            max: maxValue,
            minSize: '35%',
            maxSize: '100%',
            sort: funnelSort,
            gap: funnelGap,
            funnelAlign: 'center',
            label: {
              show: true,
              position: 'inside',
              formatter: labelFormatter,
              color: funnelLabelColor,
              fontSize:
                typeof funnelLabelFontSize === 'number' && Number.isFinite(funnelLabelFontSize) && funnelLabelFontSize > 0
                  ? funnelLabelFontSize
                  : 12,
              fontWeight: funnelLabelFontWeightResolved,
              fontFamily: funnelLabelFontFamilyCss,
              textBorderWidth: 0,
              textBorderColor: 'transparent',
              textShadowBlur: 0,
              textShadowColor: 'transparent'
            },
            labelLine: {
              show: false
            },
            emphasis: { disabled: true },
            data: coloredData
          }]
        };
      }

      case 'pie': {

        const pieTop = showLegend ? '2%' : '1%';
        const pieBottom = showLegend ? '10%' : '2%';
        const pieCenterY = showLegend ? '48%' : '50%';
        const pieChartWidth = chartRef.current?.getEchartsInstance?.().getWidth?.() ?? 760;
        const categoryCount = Math.max(0, seriesData.length);
        const denseCategories = categoryCount >= 6;

        type PieLayoutMode = 'spacious' | 'balanced' | 'compact';
        const pieLayoutMode: PieLayoutMode = (() => {
          if (pieChartWidth < 540) return 'compact';
          if (pieChartWidth < 860) return 'balanced';
          if (denseCategories) return 'balanced';
          return 'spacious';
        })();

        const pieLayoutConfig = (() => {
          const fewCategories = categoryCount > 0 && categoryCount <= 3;
          if (pieLayoutMode === 'compact') {
            // Narrow cards with few slices: longer leaders + larger ring (kanban brand pie)
            if (fewCategories) {
              return {
                radius: showLegend ? (['40%', '70%'] as [string, string]) : (['44%', '78%'] as [string, string]),
                labelWidth: 110,
                edgeDistance: 4,
                labelLineLength: 22,
                labelLineLength2: 18,
                showLeaderLine: true
              };
            }
            return {
              radius: showLegend ? (['34%', '58%'] as [string, string]) : (['36%', '60%'] as [string, string]),
              labelWidth: 96,
              edgeDistance: 6,
              labelLineLength: 4,
              labelLineLength2: 3,
              showLeaderLine: true
            };
          }
          if (pieLayoutMode === 'balanced') {
            return {
              radius: showLegend ? (['38%', '68%'] as [string, string]) : (['40%', '70%'] as [string, string]),
              labelWidth: 118,
              edgeDistance: 8,
              labelLineLength: fewCategories ? 18 : 10,
              labelLineLength2: fewCategories ? 14 : 8,
              showLeaderLine: true
            };
          }
          return {
            radius: showLegend ? (['42%', '76%'] as [string, string]) : (['44%', '78%'] as [string, string]),
            labelWidth: 136,
            edgeDistance: 10,
            labelLineLength: fewCategories ? 20 : 12,
            labelLineLength2: fewCategories ? 16 : 9,
            showLeaderLine: true
          };
        })();
        const isDarkTheme = typeof document !== 'undefined'
          && document.documentElement.classList.contains('dark');
        const pieLeaderLineBaseColor = isDarkTheme
          ? (themeColors.cardForeground || themeColors.foreground || '#e5e7eb')
          : (themeColors.border || '#888');
        const forceLeaderLineInDoubleColumn =
          pieLayoutMode === 'compact' && pieChartWidth >= 460 && categoryCount <= 4;
        const resolvedShowLeaderLine = pieLayoutConfig.showLeaderLine || forceLeaderLineInDoubleColumn;
        const resolvedEdgeDistance = forceLeaderLineInDoubleColumn ? 8 : pieLayoutConfig.edgeDistance;
        const resolvedLabelWidth = forceLeaderLineInDoubleColumn ? 104 : pieLayoutConfig.labelWidth;
        const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
        const parsePercent = (raw: string): number => {
          const n = Number(String(raw).replace('%', '').trim());
          return Number.isFinite(n) ? n : 0;
        };
        const resolvedLabelLineLength =
          typeof pieLabelLineLength === 'number' && Number.isFinite(pieLabelLineLength) && pieLabelLineLength >= 0
            ? pieLabelLineLength
            : pieLayoutConfig.labelLineLength;
        const resolvedLabelLineLength2 =
          typeof pieLabelLineLength2 === 'number' && Number.isFinite(pieLabelLineLength2) && pieLabelLineLength2 >= 0
            ? pieLabelLineLength2
            : pieLayoutConfig.labelLineLength2;
        const [baseInnerRadiusRaw, baseOuterRadiusRaw] = pieLayoutConfig.radius;
        const baseInnerRadius = parsePercent(baseInnerRadiusRaw);
        const baseOuterRadius = parsePercent(baseOuterRadiusRaw);
        const ringSizeScale =
          typeof pieRingSize === 'number' && Number.isFinite(pieRingSize) && pieRingSize > 0
            ? clamp(pieRingSize, 60, 160) / 100
            : 1;
        // Absolute outer radius (same unit as gaugeRadius) — keeps brand pie aligned with progress rings
        const hasAbsoluteOuter =
          typeof pieOuterRadius === 'number' && Number.isFinite(pieOuterRadius) && pieOuterRadius > 0;
        const scaledOuterRadius = hasAbsoluteOuter
          ? clamp(pieOuterRadius, 20, 90)
          : clamp(baseOuterRadius * ringSizeScale, 20, 98);
        let scaledInnerRadius = clamp(baseInnerRadius * ringSizeScale, 0, Math.max(0, scaledOuterRadius - 2));
        if (typeof pieRingWidth === 'number' && Number.isFinite(pieRingWidth) && pieRingWidth > 0) {
          // pieRingWidth is ring thickness in % points of chart (aligned with gaugeProgressRingLineWidth)
          const width = clamp(pieRingWidth, 4, Math.max(4, scaledOuterRadius - 2));
          scaledInnerRadius = clamp(scaledOuterRadius - width, 0, Math.max(0, scaledOuterRadius - 2));
        } else if (hasAbsoluteOuter) {
          scaledInnerRadius = clamp(scaledOuterRadius - 16, 0, Math.max(0, scaledOuterRadius - 2));
        }
        const resolvedPieRadius: [string, string] = [`${scaledInnerRadius}%`, `${scaledOuterRadius}%`];
        // Match left-column gaugeProgressRing vertical placement when using absolute radius
        const resolvedPieCenterY = hasAbsoluteOuter ? '42%' : pieCenterY;
        const resolvedPieTop = hasAbsoluteOuter ? '0%' : pieTop;
        const resolvedPieBottom = hasAbsoluteOuter ? '8%' : pieBottom;
        const pieData = seriesData.map(({ name, value }, index) => {
          const baseColor = defaultColors[index % defaultColors.length];
          return {
            name,
            value,
            itemStyle: {
              color: baseColor,
              borderColor: themeColors.card || '#fff',
              borderWidth: 1
            }
          };
        });
        return {
          ...baseOption,
          legend: showLegend
            ? {
                ...(baseOption.legend || {}),
                bottom: '2%',
                left: 0,
                align: 'left'
              }
            : undefined,
          series: [{
            type: 'pie',

            top: resolvedPieTop,
            bottom: resolvedPieBottom,
            radius: resolvedPieRadius,
            center: ['50%', resolvedPieCenterY],
            avoidLabelOverlap: true,
            alignTo: resolvedShowLeaderLine ? 'labelLine' : 'edge',
            edgeDistance: resolvedEdgeDistance,
            minShowLabelAngle: 0,
            labelLayout: (layoutParams: {
              labelRect: { x: number; y: number; width: number; height: number };
              labelLinePoints?: number[][];
            }) => {
              const liftDy = computePieOutsideLabelLiftDy(layoutParams);
              return {
                hideOverlap: true,
                moveOverlap: 'shiftY',
                ...(liftDy !== 0 ? { dy: liftDy } : {})
              };
            },
            label: {
              show: true,
              formatter: (params: { name?: string; value?: number | string; percent?: number }) => {
                const percentNumber = typeof params.percent === 'number' && Number.isFinite(params.percent)
                  ? params.percent
                  : 0;
                const percentValue = percentNumber.toFixed(1);
                return `${params.name ?? ''}\n${params.value ?? ''} (${percentValue}%)`;
              },
              color: themedForeground,
              verticalAlign: 'middle',
              fontSize:
                typeof pieLabelFontSize === 'number' && Number.isFinite(pieLabelFontSize) && pieLabelFontSize > 0
                  ? pieLabelFontSize
                  : 12,
              fontWeight: pieLabelFontWeightResolved,
              fontFamily: pieLabelFontFamilyCss,
              overflow: 'break',
              padding: [0, 2, 0, 2],
              width: resolvedLabelWidth,
              bleedMargin: 8
            },
            labelLine: {
              show: resolvedShowLeaderLine,
              length: resolvedLabelLineLength,
              length2: resolvedLabelLineLength2,
              lineStyle: {
                color: colorToRgba(pieLeaderLineBaseColor, isDarkTheme ? 0.95 : 0.9),
                width: isDarkTheme ? 1.2 : 1,
                opacity: 1
              }
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.2)'
              },
              label: {
                color: themedForeground,
                fontSize:
                  typeof pieLabelFontSize === 'number' && Number.isFinite(pieLabelFontSize) && pieLabelFontSize > 0
                    ? Math.max(10, pieLabelFontSize + 1)
                    : 13,
                fontWeight: pieLabelFontWeightResolved,
                fontFamily: pieLabelFontFamilyCss
              }
            },
            data: pieData
          }]
        };
      }

      case 'bar':
      case 'horizontalBar': {
        const buildBarOption = (orientation: 'horizontal' | 'vertical') => {
          const barPalette = defaultColors;
          const barRows = seriesData;
          const baseField = horizontalBarPercentBaseField?.trim();
          const valueUnitSuffix = horizontalBarValueUnit?.trim() ?? '';
          const labelPositionMap =
            orientation === 'horizontal' ? HORIZONTAL_BAR_LABEL_POSITION_MAP : VERTICAL_BAR_LABEL_POSITION_MAP;
          const barLabelPosition = labelPositionMap[horizontalBarLabelPosition ?? 'follow'] ?? 'top';
          const barLabelFontSize =
            horizontalBarLabelFontSize != null &&
            Number.isFinite(horizontalBarLabelFontSize) &&
            horizontalBarLabelFontSize > 0
              ? horizontalBarLabelFontSize
              : 12;
          const resolvedDisplayMode: 'value' | 'percent' | 'valueAndPercent' =
            barValueDisplayMode ??
            (horizontalBarShowPercent && baseField ? 'valueAndPercent' : 'value');

          const formatQuantity = (n: number) =>
            valueUnitSuffix
              ? `${formatDisplayNumber(n, barNumberFormat)}${valueUnitSuffix}`
              : formatDisplayNumber(n, barNumberFormat);

          const readPositiveBase = (row: Record<string, unknown>): number => {
            if (!baseField) return 0;
            const raw = row[baseField];
            const n = parseNumericLike(raw);
            return Number.isFinite(n) && n > 0 ? n : 0;
          };

          const categories = barRows.map(d => String(d.name ?? ''));
          const values = barRows.map(d => d.value);
          const valuesTotal = values.reduce((sum, current) => sum + (Number.isFinite(current) ? current : 0), 0);
          const firstValidBase = barRows.reduce((found, row) => {
            if (found > 0) return found;
            const candidate = readPositiveBase(row as Record<string, unknown>);
            return candidate > 0 ? candidate : 0;
          }, 0);
          const resolvePercentBaseAt = (rowIndex: number): number => {
            const rowBase = readPositiveBase(barRows[rowIndex] as Record<string, unknown>);
            if (rowBase > 0) return rowBase;
            if (firstValidBase > 0) return firstValidBase;
            return valuesTotal > 0 ? valuesTotal : 0;
          };
          const valuePercents = barRows.map((_row, index) => {
            const base = resolvePercentBaseAt(index);
            const rawValue = values[index] ?? 0;
            return base > 0 ? (rawValue / base) * 100 : 0;
          });
          const usePercentDisplay = resolvedDisplayMode !== 'value' && Boolean(baseField);
          const valuesForSeries = usePercentDisplay ? valuePercents : values;
          const valuesAllowSqrt =
            valuesForSeries.length > 0 &&
            valuesForSeries.every((v) => Number.isFinite(v) && v >= 0) &&
            valuesForSeries.some((v) => v > 0);
          const useSqrtAxis = barLengthAdjustmentOn && valuesAllowSqrt;
          // Progress list: scale bars to data max so the longest nearly fills the track
          // (locking to 100% leaves empty space when top share is ~50%).
          const isProgressLayoutForAxis = barLayout === 'progress' && orientation === 'horizontal';
          const lockPercentAxisRange =
            usePercentDisplay && !useSqrtAxis && !isProgressLayoutForAxis;
          const visualValuesForSeries = useSqrtAxis
            ? valuesForSeries.map((v) => Math.sqrt(Math.max(0, v)))
            : valuesForSeries;
          const dataMax = valuesForSeries.length ? Math.max(...valuesForSeries, 0) : 0;
          const baseMax = !usePercentDisplay && baseField
            ? barRows.reduce((m, row) => Math.max(m, readPositiveBase(row as Record<string, unknown>)), 0)
            : 0;

          const valueAxisMaxRaw = lockPercentAxisRange
            ? 100
            : usePercentDisplay
              ? Math.max(dataMax, 1)
              : Math.max(dataMax, baseMax, 1);
          const needsTopLabelHeadroom = orientation === 'vertical' && barLabelPosition === 'top';

          const valueAxisMaxWithHeadroom = needsTopLabelHeadroom
            ? valueAxisMaxRaw * (lockPercentAxisRange ? 1.05 : 1.08)
            : valueAxisMaxRaw;
          const valueAxisMax = useSqrtAxis
            ? Math.sqrt(Math.max(0, valueAxisMaxWithHeadroom))
            : valueAxisMaxWithHeadroom;
          const valueAxisMin = lockPercentAxisRange ? 0 : undefined;
          const formatAxisTickValue = (axisValue: number): string => {
            const rawValue = useSqrtAxis ? axisValue * axisValue : axisValue;
            const roundedRaw = Number(rawValue.toFixed(2));
            if (usePercentDisplay) {
              return `${Number(roundedRaw.toFixed(1))}%`;
            }
            return formatDisplayNumber(roundedRaw, barNumberFormat);
          };

          const resolveBarRowIndex = (params: { dataIndex?: number; name?: string }): number => {
            if (typeof params.dataIndex === 'number' && params.dataIndex >= 0) {
              return params.dataIndex;
            }
            const ni = categories.indexOf(String(params.name ?? ''));
            return ni >= 0 ? ni : 0;
          };

          const barLabelFormatter = (params: { value?: number; dataIndex?: number; name?: string }) => {
            const idx = resolveBarRowIndex(params);
            const rawValue = values[idx] ?? 0;
            const qty = formatQuantity(rawValue);
            if (resolvedDisplayMode === 'value') {
              return qty;
            }
            if (!baseField) return qty;
            const pct = (() => {
              const base = resolvePercentBaseAt(idx);
              return base > 0 ? ((rawValue / base) * 100).toFixed(1) : '0.0';
            })();
            if (resolvedDisplayMode === 'percent') {
              return `${pct}%`;
            }
            return `${qty} (${pct}%)`;
          };

          const labelColorUsesBarContrast = (rowIndex: number): boolean => {
            const isOutsidePosition =
              orientation === 'horizontal' ? barLabelPosition === 'right' : barLabelPosition === 'top';

            if (isOutsidePosition) {
              return false;
            }
            const val = visualValuesForSeries[rowIndex] ?? 0;
            const fillRatio = valueAxisMax > 0 ? val / valueAxisMax : 0;
            if (fillRatio < HORIZONTAL_BAR_LABEL_USE_CHART_FG_BELOW_FILL_RATIO) {
              return false;
            }
            const isInsidePosition =
              orientation === 'horizontal'
                ? barLabelPosition === 'insideLeft' || barLabelPosition === 'inside' || barLabelPosition === 'insideRight'
                : barLabelPosition === 'insideBottom' || barLabelPosition === 'inside' || barLabelPosition === 'insideTop';
            if (isInsidePosition) {
              return true;
            }
            return fillRatio >= HORIZONTAL_BAR_LABEL_CONTRAST_ON_LONG_OUTSIDE_FILL_RATIO;
          };

          const categoryAxisLabelStrategy = resolveAxisLabelStrategy(
            categories,
            orientation === 'vertical' ? 'x' : 'y'
          );

          const isProgressLayout = barLayout === 'progress' && orientation === 'horizontal';
          const categoryLabelsVisible = showCategoryLabels !== false;
          // aboveBar only applies to horizontal bars; vertical falls back to axis labels
          const categoryOnBar =
            categoryLabelsVisible &&
            categoryLabelPosition === 'aboveBar' &&
            orientation === 'horizontal';
          const categoryOnAxis = categoryLabelsVisible && !categoryOnBar;
          const progressTrackColor =
            typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(15,23,42,0.08)';
          const barMaxWidth = isProgressLayout ? 10 : 22;
          const barCategoryGap = isProgressLayout
            ? categoryOnBar
              ? '72%'
              : '68%'
            : '42%';
          const progressLabelFontSize =
            horizontalBarLabelFontSize != null &&
            Number.isFinite(horizontalBarLabelFontSize) &&
            horizontalBarLabelFontSize > 0
              ? horizontalBarLabelFontSize
              : 12;
          // Negative Y lifts label above the track; closer to 0 = lower on screen
          const progressLabelOffsetY = -4;

          return {
            ...baseOption,
            legend: false,
            tooltip: showTooltip
              ? {
                  trigger: 'axis',
                  axisPointer: { type: isProgressLayout ? 'none' : 'shadow' },
                  backgroundColor: themeColors.popover || '#fff',
                  borderColor: themeColors.border || '#e5e7eb',
                  borderWidth: 1,
                  borderRadius: 6,
                  textStyle: {
                    color: themedForeground
                  },
                  formatter: (params: unknown) => {
                    const arr = params as Array<{ name?: string; value?: number; dataIndex?: number; seriesName?: string }>;
                    const p =
                      arr.find(
                        (item) =>
                          item?.seriesName !== '__categoryLabel' && item?.seriesName !== '__valueLabel'
                      ) ?? arr[0];
                    if (!p) return '';
                    const idx = resolveBarRowIndex(p);
                    const rawValue = values[idx] ?? 0;
                    const qty = formatQuantity(rawValue);
                    if (resolvedDisplayMode === 'value') {
                      return `${p.name ?? ''}<br/>${qty}`;
                    }
                    if (!baseField) return `${p.name ?? ''}<br/>${qty}`;
                    const pct = (() => {
                      const base = resolvePercentBaseAt(idx);
                      return base > 0 ? ((rawValue / base) * 100).toFixed(1) : '0.0';
                    })();
                    if (resolvedDisplayMode === 'percent') {
                      return `${p.name ?? ''}<br/>${pct}%`;
                    }
                    return `${p.name ?? ''}<br/>${qty} (${pct}%)`;
                  }
                }
              : undefined,
            grid: isProgressLayout
              ? {
                  left: categoryOnAxis ? '3%' : '2%',
                  // Value labels above the track → almost no right gutter; bars can run longer
                  right: categoryOnBar ? '2%' : '12%',
                  top: statsRenderInChartTop ? '10%' : categoryOnBar ? '10%' : '6%',
                  bottom: '4%',
                  containLabel: true
                }
              : {
                  left: '2%',
                  right: '3%',
                  top: statsRenderInChartTop ? '12%' : '8%',
                  bottom: '4%',
                  containLabel: true
                },
            xAxis: orientation === 'horizontal'
              ? {
                  type: 'value',
                  min: valueAxisMin,
                  max: valueAxisMax,
                  name: '',
                  show: !isProgressLayout,
                  nameTextStyle: {
                    color: themedForeground,
                    ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
                  },
                  axisLabel: {
                    show: !isProgressLayout,
                    color: themedForeground,
                    formatter: (value: number) => formatAxisTickValue(Number(value)),
                    ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
                  },
                  axisLine: {
                    show: !isProgressLayout,
                    lineStyle: axisLineStyle
                  },
                  axisTick: { show: !isProgressLayout },
                  splitLine: {
                    show: !isProgressLayout,
                    lineStyle: splitLineStyle
                  }
                }
              : {
                  type: 'category',
                  data: categories,
                  axisLabel: {
                    show: categoryOnAxis,
                    color: themedForeground,
                    rotate: categoryAxisLabelStrategy.rotate,
                    interval: categoryAxisLabelStrategy.interval,
                    formatter: categoryAxisLabelStrategy.formatter,
                    ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
                  },
                  axisLine: {
                    show: !isProgressLayout,
                    lineStyle: axisLineStyle
                  },
                  axisTick: { alignWithLabel: true, show: categoryOnAxis }
                },
            yAxis: orientation === 'horizontal'
              ? {
                  type: 'category',
                  data: categories,
                  inverse: true,
                  axisLabel: {
                    show: categoryOnAxis,
                    color: themedForeground,
                    rotate: 0,
                    interval: 0,
                    fontSize: isProgressLayout ? 13 : undefined,
                    ...(yAxisFontSize && !isProgressLayout ? { fontSize: yAxisFontSize } : {}),
                    ...(isProgressLayout
                      ? {}
                      : {
                          rotate: categoryAxisLabelStrategy.rotate,
                          interval: categoryAxisLabelStrategy.interval,
                          formatter: categoryAxisLabelStrategy.formatter
                        })
                  },
                  axisLine: {
                    show: categoryOnAxis || !isProgressLayout,
                    lineStyle: axisLineStyle
                  },
                  axisTick: { show: !isProgressLayout && categoryOnAxis },
                  splitLine: { show: false }
                }
              : {
                  type: 'value',
                  min: valueAxisMin,
                  max: valueAxisMax,
                  name: '',
                  nameTextStyle: {
                    color: themedForeground,
                    ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {})
                  },
                  axisLabel: {
                    color: themedForeground,
                    formatter: (value: number) => formatAxisTickValue(Number(value)),
                    ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {})
                  },
                  axisLine: {
                    lineStyle: axisLineStyle
                  },
                  splitLine: {
                    show: true,
                    lineStyle: splitLineStyle
                  }
                },
            series: [
              {
                type: 'bar',
                data: visualValuesForSeries.map((v, i) => {
                  const barColor = barPalette[i % barPalette.length];
                  const outsideColor = themedForeground;
                  return {
                    value: v,
                    itemStyle: {
                      // Always solid; legacy barGradientMode=topToBottom is ignored
                      color: barColor,
                      borderRadius: isProgressLayout
                        ? 4
                        : orientation === 'vertical'
                          ? [4, 4, 0, 0]
                          : [0, 4, 4, 0]
                    },
                    label: {
                      color: labelColorUsesBarContrast(i)
                        ? pickContrastTextOnBarFill(barColor)
                        : outsideColor
                    }
                  };
                }),
                barMaxWidth,
                barCategoryGap,
                ...(isProgressLayout
                  ? {
                      showBackground: true,
                      backgroundStyle: {
                        color: progressTrackColor,
                        borderRadius: 4
                      }
                    }
                  : {}),
                label: {
                  // When category sits above the bar, value/% moves to top-right (see __valueLabel)
                  show: !categoryOnBar,
                  position: isProgressLayout ? 'right' : barLabelPosition,
                  formatter: barLabelFormatter,
                  distance: isProgressLayout
                    ? 8
                    : orientation === 'vertical' && barLabelPosition === 'top'
                      ? 4
                      : 0,
                  fontSize: isProgressLayout ? 13 : barLabelFontSize,
                  fontWeight: isProgressLayout ? 500 : barLabelFontWeightResolved,
                  fontFamily: barLabelFontFamilyCss
                }
              },
              ...(categoryOnBar
                ? [
                    {
                      type: 'bar' as const,
                      name: '__categoryLabel',
                      // Full track width so left label aligns with the progress track start
                      data: visualValuesForSeries.map(() => ({
                        value: valueAxisMax,
                        itemStyle: {
                          color: 'transparent',
                          borderColor: 'transparent'
                        }
                      })),
                      barGap: '-100%',
                      barMaxWidth,
                      barCategoryGap,
                      silent: true,
                      tooltip: { show: false },
                      emphasis: { disabled: true },
                      label: {
                        show: true,
                        // Negative Y lifts text above the track for a small gap
                        position: [0, progressLabelOffsetY] as [number, number],
                        align: 'left' as const,
                        verticalAlign: 'bottom' as const,
                        distance: 0,
                        formatter: (params: { name?: string; dataIndex?: number }) =>
                          params.name ?? categories[params.dataIndex ?? 0] ?? '',
                        color: themedForeground,
                        fontSize: isProgressLayout ? progressLabelFontSize : Math.max(barLabelFontSize ?? 12, 14),
                        fontWeight: isProgressLayout ? 500 : barLabelFontWeightResolved,
                        fontFamily: barLabelFontFamilyCss
                      },
                      z: 10
                    },
                    {
                      type: 'bar' as const,
                      name: '__valueLabel',
                      // Full track width so % sits above the track, right-aligned
                      data: visualValuesForSeries.map(() => ({
                        value: valueAxisMax,
                        itemStyle: {
                          color: 'transparent',
                          borderColor: 'transparent'
                        }
                      })),
                      barGap: '-100%',
                      barMaxWidth,
                      barCategoryGap,
                      silent: true,
                      tooltip: { show: false },
                      emphasis: { disabled: true },
                      label: {
                        show: true,
                        position: ['100%', progressLabelOffsetY] as [string, number],
                        align: 'right' as const,
                        verticalAlign: 'bottom' as const,
                        distance: 0,
                        formatter: barLabelFormatter,
                        color: themedForeground,
                        fontSize: isProgressLayout ? progressLabelFontSize : Math.max(barLabelFontSize ?? 12, 14),
                        fontWeight: isProgressLayout ? 500 : barLabelFontWeightResolved,
                        fontFamily: barLabelFontFamilyCss
                      },
                      z: 10
                    }
                  ]
                : [])
            ]
          };
        };

        const normalizedOrientation = chartType === 'horizontalBar' ? 'horizontal' : barOrientation;
        return buildBarOption(normalizedOrientation);
      }

      case 'gauge':
      case 'gaugeProgressRing': {
        const isProgressRing = chartType === 'gaugeProgressRing';

        const hasDataSource = databaseDataSourceConfig?.datasourceId && databaseData && databaseData.length > 0;
        const currentValue = hasDataSource && seriesData.length > 0
          ? seriesData[0].value  
          : (gaugeValue !== undefined 
              ? gaugeValue 
              : (seriesData.length > 0 ? seriesData[0].value : 0));
        const gaugeNumericCurrent =
          typeof currentValue === 'number' && Number.isFinite(currentValue)
            ? currentValue
            : parseNumericLike(currentValue) ?? 0;
        const gaugeLabelFontWeightResolved = coerceGaugeFontWeight(gaugeLabelFontWeight, 400);
        const gaugeTitleFontWeightResolved = coerceGaugeFontWeight(gaugeTitleFontWeight, 400);
        const gaugeDetailFontWeightResolved = coerceGaugeFontWeight(gaugeDetailFontWeight, 400);

        const gaugeLabelFieldKey = gaugeLabelField?.trim() ?? '';
        const labelRaw =
          gaugeLabelFieldKey && chartData.length > 0
            ? readRowFieldValue(chartData[0] as Record<string, unknown>, gaugeLabelFieldKey)
            : undefined;
        const labelRawFallback =
          labelRaw == null && gaugeLabelFieldKey && seriesData.length > 0
            ? readRowFieldValue(seriesData[0] as Record<string, unknown>, gaugeLabelFieldKey)
            : undefined;
        const labelResolved = labelRaw ?? labelRawFallback;
        const labelContent =
          gaugeLabelFieldKey && labelResolved != null && String(labelResolved).trim() !== ''
            ? String(labelResolved)
            : '';
        const detailOffsetCenter: [number | string, number | string] = [
          formatGaugeSeriesOffsetAxis(gaugeDetailOffsetCenterX, 'x', GAUGE_DETAIL_OFFSET_DEFAULTS),
          formatGaugeSeriesOffsetAxis(gaugeDetailOffsetCenterY, 'y', GAUGE_DETAIL_OFFSET_DEFAULTS)
        ];
        const titleOffsetCenter: [number | string, number | string] = [
          formatGaugeSeriesOffsetAxis(gaugeTitleOffsetCenterX, 'x', GAUGE_TITLE_OFFSET_DEFAULTS),
          formatGaugeSeriesOffsetAxis(gaugeTitleOffsetCenterY, 'y', GAUGE_TITLE_OFFSET_DEFAULTS)
        ];
        const ringLineWidth =
          typeof gaugeProgressRingLineWidth === 'number' && Number.isFinite(gaugeProgressRingLineWidth) && gaugeProgressRingLineWidth > 0
            ? gaugeProgressRingLineWidth
            : 18;
        const resolvedProgressBarColor =
          gaugeProgressBarColor ||
          (typeof gaugeColor === 'string'
            ? gaugeColor
            : Array.isArray(gaugeColor) && gaugeColor.length > 0
              ? gaugeColor[0]
              : defaultColors[0] || '#a855f7');
        const ringTrackGradientOn =
          isProgressRing && parseEchartsBool(gaugeTrackGradient, false);
        const rawTrackColor = gaugeTrackColor?.trim() ?? '';
        const trackBaseRaw = rawTrackColor || DEFAULT_GAUGE_TRACK_BASE;
        const trackBaseDistinct = ensureGaugeTrackBaseDistinct(
          toRgbTripletString(trackBaseRaw, DEFAULT_GAUGE_TRACK_BASE),
          resolvedProgressBarColor
        );
        const resolvedTrackAxisPaint: string | unknown = ringTrackGradientOn
          ? buildGaugeTrackGradient(trackBaseDistinct)
          : ensureSolidGaugeTrackDistinct(
              rawTrackColor || 'rgba(128, 128, 128, 0.22)',
              resolvedProgressBarColor
            );

        const ringAxisLineWidth = ringLineWidth;
        const ringProgressWidth = Math.max(6, ringLineWidth - 6);
        const ringArcStart = gaugeArcStartAngle ?? 225;
        const ringArcEnd = gaugeArcEndAngle ?? -45;
        const ringDrawOffsetPercent =
          typeof gaugeProgressRingDrawOffsetPercent === 'number' &&
          Number.isFinite(gaugeProgressRingDrawOffsetPercent)
            ? Math.min(50, Math.max(0, gaugeProgressRingDrawOffsetPercent))
            : 0;

        const progressRingDrawingValue = isProgressRing
          ? applyGaugeProgressRingDrawOffsetPercent(
              gaugeNumericCurrent,
              gaugeMin,
              gaugeMax,
              ringDrawOffsetPercent
            )
          : gaugeNumericCurrent;

        const gaugeUiDark =
          typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const resolvedGaugeDetailColor =
          gaugeDetailColor?.trim()
            ? resolveGaugeColorWithDarkModeSafe(gaugeDetailColor, resolvedProgressBarColor, themedForeground, gaugeUiDark)
            : (isProgressRing && gaugeUiDark ? themedForeground : resolvedProgressBarColor);

        const resolvedGaugeLabelColor =
          gaugeLabelColor?.trim()
            ? resolveGaugeColorWithDarkModeSafe(gaugeLabelColor, resolvedGaugeDetailColor, themedForeground, gaugeUiDark)
            : resolvedGaugeDetailColor;
        const progressRingPlotCenterY = coerceGaugeCanvasPercent(gaugeProgressRingCenterY, 50);

        const ringCanvasLabelPositionRaw = gaugeProgressRingCanvasLabelPosition ?? 'ringCenter';
        const ringCanvasLabelPosition: 'ringCenter' | 'chartTop' | 'chartBottom' =
          ringCanvasLabelPositionRaw === 'chartTop' || ringCanvasLabelPositionRaw === 'chartBottom'
            ? ringCanvasLabelPositionRaw
            : 'ringCenter';
        const ringCanvasLabelEdgePercent =
          typeof gaugeProgressRingCanvasLabelEdgePercent === 'number' &&
          Number.isFinite(gaugeProgressRingCanvasLabelEdgePercent)
            ? Math.min(40, Math.max(2, gaugeProgressRingCanvasLabelEdgePercent))
            : 8;

        const ringCenterNameFromField =
          isProgressRing &&
          Boolean(gaugeLabelFieldKey) &&
          labelContent !== '' &&
          ringCanvasLabelPosition === 'ringCenter';

        const ringCanvasLabelAsGraphic =
          isProgressRing &&
          Boolean(gaugeLabelFieldKey) &&
          labelContent !== '' &&
          (ringCanvasLabelPosition === 'chartTop' || ringCanvasLabelPosition === 'chartBottom');

        const ringCanvasLabelGraphic = ringCanvasLabelAsGraphic
          ? (() => {
              const fontSize =
                typeof gaugeLabelFontSize === 'number' &&
                Number.isFinite(gaugeLabelFontSize) &&
                gaugeLabelFontSize > 0
                  ? gaugeLabelFontSize
                  : 14;
              const fill = resolvedGaugeLabelColor;
              const x =
                typeof gaugeLabelX === 'number' && Number.isFinite(gaugeLabelX)
                  ? Math.min(100, Math.max(0, gaugeLabelX))
                  : 50;
              const gy =
                typeof gaugeLabelY === 'number' &&
                Number.isFinite(gaugeLabelY) &&
                gaugeLabelY >= 0 &&
                gaugeLabelY <= 100
                  ? gaugeLabelY
                  : 90;
              const isTop = ringCanvasLabelPosition === 'chartTop';

              const topPercentForRing = isTop
                ? gy > 50
                  ? ringCanvasLabelEdgePercent
                  : gy
                : undefined;
              const bottomPercentForRing = !isTop
                ? gy < 50
                  ? ringCanvasLabelEdgePercent
                  : 100 - gy
                : undefined;
              return [
                {
                  type: 'group' as const,
                  left: `${x}%`,
                  ...(isTop
                    ? { top: `${topPercentForRing}%` }
                    : { bottom: `${bottomPercentForRing}%` }),
                  origin: [0.5, isTop ? 0 : 1] as [number, number],
                  bounding: 'raw' as const,
                  children: [
                    {
                      type: 'text' as const,
                      style: {
                        text: labelContent,
                        fontSize,
                        fontFamily: GAUGE_DETAIL_FONT_FAMILY,
                        fontWeight: gaugeLabelFontWeightResolved,
                        fill,
                        textAlign: 'center' as const,
                        textVerticalAlign: (isTop ? 'top' : 'bottom') as 'top' | 'bottom'
                      }
                    }
                  ],
                  z: 10
                }
              ];
            })()
          : undefined;

        const classicSeries = {
          type: 'gauge' as const,
          center: [`${gaugeCenterX}%`, `${gaugeCenterY}%`],
          radius: `${gaugeRadius}%`,
          startAngle: 180,
          endAngle: 0,
          min: gaugeMin,
          max: gaugeMax,
          splitNumber: gaugeSplitNumber,
          axisLine: {
            lineStyle: {
              width: 6,
              color: gaugeAxisLineColor || [
                [0.3, '#67e0e3'],
                [0.7, '#37a2da'],
                [1, '#fd666d']
              ]
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0L12.8,0.7z',
            length: '12%',
            width: 20,
            offsetCenter: [0, '-60%'],
            itemStyle: {
              color: 'auto'
            }
          },
          axisTick: {
            length: 8,
            lineStyle: {
              color: 'auto',
              width: 1
            }
          },
          splitLine: {
            length: 15,
            lineStyle: {
              color: 'auto',
              width: 2
            }
          },
          axisLabel: {
            color: themedForeground,
            fontSize: gaugeAxisFontSize ?? 12,
            distance: -60,
            rotate: 'tangential' as const,
            formatter: function (value: number) {
              return value;
            }
          },
          title: {
            offsetCenter: titleOffsetCenter,
            fontSize:
              typeof gaugeTitleFontSize === 'number' &&
              Number.isFinite(gaugeTitleFontSize) &&
              gaugeTitleFontSize > 0
                ? gaugeTitleFontSize
                : 20,
            fontFamily: GAUGE_DETAIL_FONT_FAMILY,
            fontWeight: gaugeTitleFontWeightResolved,
            color: themedForeground
          },
          detail: {
            show: gaugeShowDetailOn,
            fontSize:
              typeof gaugeDetailFontSize === 'number' &&
              Number.isFinite(gaugeDetailFontSize) &&
              gaugeDetailFontSize > 0
                ? gaugeDetailFontSize
                : 30,
            fontFamily: GAUGE_DETAIL_FONT_FAMILY,
            fontWeight: gaugeDetailFontWeightResolved,
            offsetCenter: detailOffsetCenter,
            valueAnimation: true,
            formatter: function (value: number) {
              return Math.round(value * 100) / 100 + '%';
            },
            color: resolvedGaugeDetailColor
          },
          data: [{
            value: currentValue,
            name: seriesData.length > 0 ? seriesData[0].name : t('chart.indicator', 'Indicator')
          }]
        };

        const progressRingSeries = {
          type: 'gauge' as const,
          center: [`${gaugeCenterX}%`, `${progressRingPlotCenterY}%`],
          radius: `${gaugeRadius}%`,
          startAngle: ringArcStart,
          endAngle: ringArcEnd,
          min: gaugeMin,
          max: gaugeMax,
          splitNumber: Math.max(1, gaugeSplitNumber),
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: ringAxisLineWidth,
              color: [[1, resolvedTrackAxisPaint]]
            }
          },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            width: ringProgressWidth,
            clip: true,
            itemStyle: {
              color: resolvedProgressBarColor
            }
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },

          title: ringCenterNameFromField
            ? {
                show: true,
                formatter: () => labelContent,
                offsetCenter: titleOffsetCenter,
                fontSize:
                  typeof gaugeLabelFontSize === 'number' &&
                  Number.isFinite(gaugeLabelFontSize) &&
                  gaugeLabelFontSize > 0
                    ? gaugeLabelFontSize
                    : 14,
                fontFamily: GAUGE_DETAIL_FONT_FAMILY,
                fontWeight: gaugeLabelFontWeightResolved,
                color: resolvedGaugeLabelColor
              }
            : { show: false },
          detail: {
            show: gaugeShowDetailOn,
            fontSize:
              typeof gaugeDetailFontSize === 'number' &&
              Number.isFinite(gaugeDetailFontSize) &&
              gaugeDetailFontSize > 0
                ? gaugeDetailFontSize
                : 28,
            fontFamily: GAUGE_DETAIL_FONT_FAMILY,
            fontWeight: gaugeDetailFontWeightResolved,
            offsetCenter: detailOffsetCenter,
            valueAnimation: true,
            formatter: function () {
              return Math.round(gaugeNumericCurrent * 100) / 100 + '%';
            },
            color: resolvedGaugeDetailColor
          },
          data: [{
            value: progressRingDrawingValue,
            name: ringCenterNameFromField
              ? labelContent
              : (seriesData.length > 0 ? seriesData[0].name : t('chart.indicator', 'Indicator'))
          }]
        };

        const classicLabelX =
          typeof gaugeLabelX === 'number' && Number.isFinite(gaugeLabelX)
            ? Math.min(100, Math.max(0, gaugeLabelX))
            : 50;
        const classicLabelY =
          typeof gaugeLabelY === 'number' && Number.isFinite(gaugeLabelY)
            ? Math.min(100, Math.max(0, gaugeLabelY))
            : 90;

        const classicGaugeGraphic =
          labelContent && gaugeLabelFieldKey && !isProgressRing
            ? [
                {
                  type: 'group' as const,
                  left: `${classicLabelX}%`,
                  top: `${classicLabelY}%`,
                  origin: [0.5, 0.5] as [number, number],
                  bounding: 'raw' as const,
                  children: [
                    {
                      type: 'text' as const,
                      style: {
                        text: labelContent,
                        fontSize: gaugeLabelFontSize,
                        fontFamily: GAUGE_DETAIL_FONT_FAMILY,
                        fontWeight: gaugeLabelFontWeightResolved,
                        fill: resolvedGaugeLabelColor,
                        textAlign: 'center' as const,
                        textVerticalAlign: 'middle' as const
                      }
                    }
                  ],
                  z: 10
                }
              ]
            : undefined;

        const gaugeOption = {
          ...baseOption,
          ...(isProgressRing ? { legend: { show: false } } : {}),
          graphic: isProgressRing ? ringCanvasLabelGraphic : classicGaugeGraphic,
          series: [isProgressRing ? progressRingSeries : classicSeries]
        };
        return gaugeOption;
      }

      case 'treemap':
        return {
          ...baseOption,
          series: [{
            type: 'treemap',
            layout: treemapLayout,
            roam: false,
            nodeClick: false,
            breadcrumb: {
              show: false
            },
            label: {
              show: true,
              formatter: '{b}\n{c}',
              color: themedForeground
            },
            upperLabel: {
              show: true,
              height: 30,
              color: themedForeground
            },
            itemStyle: {
              borderColor: themeColors.border || '#e5e7eb'
            },
            emphasis: {
              label: {
                show: true
              }
            },
            data: seriesData
          }]
        };

      case 'scatter':
        return {
          ...baseOption,
          grid: {
            left: '10%',
            right: '10%',
            top: '10%',
            bottom: '10%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            scale: true,
            name: t('chart.x_axis', 'X Axis'),
            nameTextStyle: {
              color: themedForeground
            },
            axisLabel: {
              color: themedForeground,
              ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: true,
              lineStyle: splitLineStyle
            }
          },
          yAxis: {
            type: 'value',
            scale: true,
            name: t('chart.y_axis', 'Y Axis'),
            nameTextStyle: {
              color: themedForeground
            },
            axisLabel: {
              color: themedForeground,
              ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: true,
              lineStyle: splitLineStyle
            }
          },
          series: [{
            type: 'scatter',
            symbolSize: function (data: any[]) {
              return Math.sqrt(data[2] || 1) * 4;
            },
            data: seriesData.map((item) => {
              const row = item as Record<string, unknown>;
              const xVal = row.x !== undefined ? row.x : row.value;
              const yVal = row.y !== undefined ? row.y : row.value;
              return [xVal, yVal, row.value ?? 1];
            }),
            emphasis: {
              focus: 'series',
              label: {
                show: true,
                formatter: function (param: any) {
                  return param.data[3] || param.name || '';
                },
                position: 'top'
              }
            }
          }]
        };

      case 'line': {

        const categoryData = chartData.map((item) => String(getRowName(item) ?? ''));
        const lineColor = defaultColors[0] || '#3b82f6';
        const lineSeriesName = String(meta[valueField]?.alias || valueField || '').trim();
        const shouldShowLineLegend = showLegend && lineSeriesName.length > 0;
        const xAxisLabelRotate = lineXAxisType === 'category' ? resolveCategoryAxisLabelRotate(categoryData) : 0;
        const lineValues = seriesData.map((item) => parseLinePointValue(item[valueField]));
        const renderedLineValues = lineCumulative ? toCumulativeWithNull(lineValues) : lineValues;

        return {
          ...baseOption,
          tooltip: showTooltip
            ? {
                ...baseOption.tooltip,
                trigger: 'axis',
                axisPointer: { type: 'line' },
                ...(lineQtySuffix ? { formatter: getLineAxisTooltipFormatter(lineQtySuffix) } : {})
              }
            : undefined,
          grid: {
            left: '4%',
            right: '4%',
            top: statsRenderInChartTop ? '8%' : '4%',
            bottom: shouldShowLineLegend ? 28 : 8,
            containLabel: true
          },
          xAxis: {
            type: lineXAxisType,
            data: lineXAxisType === 'category' ? categoryData : undefined,
            axisLabel: {
              color: themedForeground,
              rotate: xAxisLabelRotate,
              ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: lineXAxisType === 'value',
              lineStyle: splitLineStyle
            }
          },
          yAxis: {
            type: lineYAxisType,
            axisLabel: {
              color: themedForeground,
              ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {}),
              ...(lineYAxisTickFormatter ? { formatter: lineYAxisTickFormatter } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: true,
              lineStyle: splitLineStyle
            }
          },
          series: [{
            type: 'line',
            name: lineSeriesName,
            data: renderedLineValues,
            smooth: lineSmooth,
            stack: lineStack ? 'total' : undefined,
            areaStyle: lineAreaStyle ? { color: colorToRgba(lineColor, 0.14) } : undefined,
            showSymbol: lineShowSymbol,
            symbolSize: lineSymbolSize,
            step: resolvedLineStep,
            connectNulls: false,
            label: {
              show: lineQtySuffix !== '',
              position: 'top',
              ...(linePointLabelFormatter ? { formatter: linePointLabelFormatter } : {}),
              ...linePointLabelTextStyle
            },
            emphasis: {
              focus: 'series',
              label: {
                show: true,
                position: 'top',
                ...(linePointLabelFormatter ? { formatter: linePointLabelFormatter } : {}),
                ...linePointLabelTextStyle
              }
            },
            lineStyle: {
              width: 4
            }
          }],
          legend: shouldShowLineLegend
            ? {
                bottom: 0,
                left: 'center',
                padding: 0,
                itemGap: 16,
                textStyle: {
                  color: themedForeground
                },
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 8
              }
            : undefined
        };
      }

      case 'multiLine': {

        const stackEnabled = multiLineStack ?? lineStack;

        const categories = Array.from(new Set(chartData.map((item) => String(getRowName(item) ?? ''))));
        const wideFields = (multiLineValueFields || []).map((f) => String(f || '').trim()).filter(Boolean);
        const hasWideFields = wideFields.length > 0;
        const xAxisLabelRotate = lineXAxisType === 'category' ? resolveCategoryAxisLabelRotate(categories) : 0;

        const multiLinePointLabel = {
          show: lineQtySuffix !== '',
          position: 'top' as const,
          ...(linePointLabelFormatter ? { formatter: linePointLabelFormatter } : {}),
          ...linePointLabelTextStyle
        };
        const multiLineEmphasisLabel = {
          focus: 'series' as const,
          label: {
            show: true,
            position: 'top' as const,
            ...(linePointLabelFormatter ? { formatter: linePointLabelFormatter } : {}),
            ...linePointLabelTextStyle
          }
        };

        const series = hasWideFields
          ? wideFields.map((field, index) => {
              const seriesColor = defaultColors[index % defaultColors.length];
              const rawValues = categories.map((category) => {
                const row = chartData.find((item) => String(getRowName(item) ?? '') === category);
                return parseLinePointValue(row?.[field]);
              });
              return {
                type: 'line',
                name: meta[field]?.alias || field,
                data: lineCumulative ? toCumulativeWithNull(rawValues) : rawValues,
                smooth: lineSmooth,
                stack: stackEnabled ? 'total' : undefined,
                areaStyle: lineAreaStyle ? { color: colorToRgba(seriesColor, 0.14) } : undefined,
                showSymbol: lineShowSymbol,
                symbolSize: lineSymbolSize,
                step: resolvedLineStep,
                connectNulls: false,
                lineStyle: { width: 4 },
                label: multiLinePointLabel,
                emphasis: multiLineEmphasisLabel,
                itemStyle: { color: seriesColor }
              };
            })
          : Array.from(new Set(chartData.map((item) => String(item?.[categoryField] ?? '')).filter(Boolean))).map((seriesName, index) => {
              const seriesColor = defaultColors[index % defaultColors.length];
              const rawValues = categories.map((category) => {
                const matchedRow = chartData.find(
                  (row) =>
                    String(row?.[categoryField] ?? '') === seriesName &&
                    String(getRowName(row) ?? '') === category
                );
                return parseLinePointValue(matchedRow?.[valueField]);
              });
              return {
                type: 'line',
                name: meta[seriesName]?.alias || seriesName,
                data: lineCumulative ? toCumulativeWithNull(rawValues) : rawValues,
                smooth: lineSmooth,
                stack: stackEnabled ? 'total' : undefined,
                areaStyle: lineAreaStyle ? { color: colorToRgba(seriesColor, 0.14) } : undefined,
                showSymbol: lineShowSymbol,
                symbolSize: lineSymbolSize,
                step: resolvedLineStep,
                connectNulls: false,
                lineStyle: { width: 4 },
                label: multiLinePointLabel,
                emphasis: multiLineEmphasisLabel,
                itemStyle: { color: seriesColor }
              };
            });

        const seriesMax = (data: unknown): number => {
          if (!Array.isArray(data) || data.length === 0) return 0;
          let m = Number.NEGATIVE_INFINITY;
          for (const v of data) {
            const n = typeof v === 'number' ? v : Number(v);
            if (Number.isFinite(n) && n > m) m = n;
          }
          return m === Number.NEGATIVE_INFINITY ? 0 : m;
        };

        const seriesWithZ = !stackEnabled
          ? series.map((s: { data?: unknown }) => {
              const m = seriesMax(s.data);
              const z = series.filter((other: { data?: unknown }) => seriesMax(other.data) > m).length;
              return { ...s, z };
            })
          : series;

        return {
          ...baseOption,
          tooltip: showTooltip
            ? {
                trigger: 'axis',
                axisPointer: { type: 'line' },
                backgroundColor: themeColors.popover || '#fff',
                borderColor: themeColors.border || '#e5e7eb',
                borderWidth: 1,
                borderRadius: 6,
                textStyle: {
                  color: themedForeground
                },
                ...(lineQtySuffix ? { formatter: getLineAxisTooltipFormatter(lineQtySuffix) } : {})
              }
            : undefined,
          legend: showLegend
            ? {
                bottom: 0,
                left: 'center',
                padding: 0,
                itemGap: 16,
                textStyle: {
                  color: themedForeground
                },
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 8,
                data: series.map((s: { name: string }) => s.name)
              }
            : undefined,
          grid: {
            left: '4%',
            right: '4%',
            top: statsRenderInChartTop ? '8%' : '4%',
            bottom: showLegend ? 28 : 8,
            containLabel: true
          },
          xAxis: {
            type: lineXAxisType,
            data: lineXAxisType === 'category' ? categories : undefined,
            axisLabel: {
              color: themedForeground,
              rotate: xAxisLabelRotate,
              ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: lineXAxisType === 'value',
              lineStyle: splitLineStyle
            }
          },
          yAxis: {
            type: lineYAxisType,
            axisLabel: {
              color: themedForeground,
              ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {}),
              ...(lineYAxisTickFormatter ? { formatter: lineYAxisTickFormatter } : {})
            },
            axisLine: {
              lineStyle: axisLineStyle
            },
            splitLine: {
              show: true,
              lineStyle: splitLineStyle
            }
          },
          series: seriesWithZ
        };
      }

      case 'heatmap': {
        const xField = heatmapXField || 'x';
        const yField = heatmapYField || 'y';
        const valueFieldKey = heatmapValueField || 'value';

        const xCategories = [
          ...new Set(chartData.map((item) => String(item[xField] ?? '')))
        ].filter(Boolean);
        const yCategories = [
          ...new Set(chartData.map((item) => String(item[yField] ?? '')))
        ].filter(Boolean);

        const heatmapData = chartData
          .map((item) => {
            const xi = xCategories.indexOf(String(item[xField] ?? ''));
            const yi = yCategories.indexOf(String(item[yField] ?? ''));
            if (xi < 0 || yi < 0) return null;
            const val = Number(item[valueFieldKey]);
            return [xi, yi, Number.isFinite(val) ? val : 0] as [number, number, number];
          })
          .filter((row): row is [number, number, number] => row !== null);

        const heatmapMax = Math.max(
          ...chartData.map((item) => Number(item[valueFieldKey]) || 0),
          1
        );

        const heatmapColors = buildHeatmapInRangeColors(defaultColors);

        return {
          backgroundColor: baseOption.backgroundColor,
          legend: undefined,
          color: undefined,
          tooltip: showTooltip
            ? {
                position: 'top',
                backgroundColor: themeColors.popover || '#fff',
                borderColor: themeColors.border || '#e5e7eb',
                borderWidth: 1,
                borderRadius: 6,
                textStyle: { color: themedForeground },
                formatter: (params: { data?: number[] }) => {
                  const d = params.data;
                  if (!d || d.length < 3) return '';
                  return `${xCategories[d[0]] ?? ''} × ${yCategories[d[1]] ?? ''}<br/>${d[2]}`;
                }
              }
            : undefined,
          grid: {
            left: '4%',
            // Narrow flow: the vertical visualMap moves below the chart, so reclaim the right gutter
            // and bump bottom to clear the horizontal strip.
            right: isNarrowFlow ? '4%' : '12%',
            top: statsRenderInChartTop ? '12%' : '8%',
            bottom: isNarrowFlow ? '22%' : '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: xCategories,
            axisLabel: {
              color: themedForeground,
              ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {}),
              interval: 0,
              rotate: xCategories.length > 6 ? 30 : 0
            },
            axisLine: { lineStyle: axisLineStyle },
            splitArea: { show: false }
          },
          yAxis: {
            type: 'category',
            data: yCategories,
            axisLabel: {
              color: themedForeground,
              ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {})
            },
            axisLine: { lineStyle: axisLineStyle },
            splitArea: { show: false }
          },
          visualMap: {
            show: showLegend !== false,
            type: 'continuous',
            min: 0,
            max: heatmapMax,
            calculable: true,
            ...(isNarrowFlow
              ? { orient: 'horizontal', left: 'center', bottom: 0 }
              : { orient: 'vertical', right: '2%', top: 'center' }),
            seriesIndex: 0,
            dimension: 2,
            inRange: { color: heatmapColors },
            textStyle: { color: themedForeground }
          },
          series: [
            {
              type: 'heatmap',
              data: heatmapData,
              itemStyle: {
                borderColor: themeColors.border || 'rgba(0,0,0,0.06)',
                borderWidth: 1
              },
              label: {
                show: (chartData.length || 0) <= 30,
                fontSize: 10,
                color: themedForeground
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 0, 0, 0.3)'
                }
              }
            }
          ]
        };
      }

      case 'cluster': {
        const groupField = clusterGroupField || 'group';
        const xField = clusterXField || 'x';
        const yField = clusterYField || 'y';
        const sizeField = clusterSizeField || 'value';

        const groups = [
          ...new Set(chartData.map((item) => String(item[groupField] ?? '')))
        ].filter(Boolean);
        const groupColors = groups.map(
          (_, i) => defaultColors[i % defaultColors.length] || '#3b82f6'
        );

        const clusterSeries = groups.map((group, groupIndex) => {
          const groupItems = chartData.filter(
            (item) => String(item[groupField] ?? '') === group
          );
          return {
            name: group,
            type: 'scatter' as const,
            data: groupItems.map((item) => {
              const xVal = parseNumericLike(item[xField]);
              const yVal = parseNumericLike(item[yField]);
              const sizeVal = parseNumericLike(item[sizeField]);
              return [
                Number.isFinite(xVal) ? xVal : 0,
                Number.isFinite(yVal) ? yVal : 0,
                Number.isFinite(sizeVal) ? sizeVal : 10,
                String(getRowName(item) ?? '')
              ];
            }),
            symbolSize: resolveClusterSymbolSize,
            itemStyle: {
              color: groupColors[groupIndex]
            },
            emphasis: {
              focus: 'series' as const,
              label: {
                show: true,
                formatter: (param: { data?: unknown[] }) => {
                  const d = param.data;
                  if (!Array.isArray(d)) return group;
                  return String(d[3] ?? group);
                },
                position: 'top' as const,
                color: themedForeground
              }
            }
          };
        });

        return {
          backgroundColor: baseOption.backgroundColor,
          color: undefined,
          legend:
            showLegend !== false && groups.length > 0
              ? {
                  bottom: 0,
                  textStyle: { color: themedForeground },
                  icon: 'circle',
                  itemWidth: 10,
                  itemHeight: 10,
                  data: groups
                }
              : undefined,
          tooltip: showTooltip
            ? {
                trigger: 'item',
                backgroundColor: themeColors.popover || '#fff',
                borderColor: themeColors.border || '#e5e7eb',
                borderWidth: 1,
                borderRadius: 6,
                textStyle: { color: themedForeground },
                formatter: (params: {
                  seriesType?: string;
                  data?: number[];
                }) => {
                  if (params.seriesType !== 'scatter' || !params.data) return '';
                  const [x, y, size, label] = params.data;
                  return `${label}<br/>X: ${x}<br/>Y: ${y}<br/>Size: ${size}`;
                }
              }
            : undefined,
          grid: {
            left: '4%',
            right: '4%',
            top: showLegend !== false && groups.length > 0 ? '14%' : statsRenderInChartTop ? '12%' : '6%',
            bottom: showLegend !== false && groups.length > 0 ? '12%' : '6%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            scale: true,
            name: t('chart.x_axis', 'X Axis'),
            nameTextStyle: { color: themedForeground },
            axisLabel: {
              color: themedForeground,
              ...(xAxisFontSize ? { fontSize: xAxisFontSize } : {})
            },
            axisLine: { lineStyle: axisLineStyle },
            splitLine: { show: true, lineStyle: splitLineStyle }
          },
          yAxis: {
            type: 'value',
            scale: true,
            name: t('chart.y_axis', 'Y Axis'),
            nameTextStyle: { color: themedForeground },
            axisLabel: {
              color: themedForeground,
              ...(yAxisFontSize ? { fontSize: yAxisFontSize } : {})
            },
            axisLine: { lineStyle: axisLineStyle },
            splitLine: { show: true, lineStyle: splitLineStyle }
          },
          series: clusterSeries
        };
      }

      default:
        return baseOption;
    }
  };

  const chartOption = useMemo(() => buildOption(), [
    chartData,
    chartType,
    showTooltip,
    showLegend,
    themeColors,
    funnelSort,
    funnelGap,
    funnelLabelFontSize,
    funnelLabelFontWeightResolved,
    funnelLabelFontFamilyCss,
    horizontalBarPercentBaseField,
    horizontalBarShowPercent,
    horizontalBarValueUnit,
    horizontalBarLabelPosition,
    horizontalBarLabelFontSize,
    barLabelFontWeightResolved,
    barLabelFontFamilyCss,
    barValueDisplayMode,
    barNumberFormat,
    barOrientation,
    barLayout,
    showCategoryLabels,
    categoryLabelPosition,
    barLengthAdjustment,
    pieLabelFontSize,
    pieLabelFontWeightResolved,
    pieLabelFontFamilyCss,
    pieRingSize,
    pieRingWidth,
    pieOuterRadius,
    pieLabelLineLength,
    pieLabelLineLength2,
    xAxisLabelRotate,
    xAxisLabelInterval,
    xAxisLabelMaxLength,

    lineSmooth,
    lineAreaStyle,
    lineStack,
    multiLineStack,
    lineXAxisType,
    lineYAxisType,
    lineShowSymbol,
    lineSymbolSize,
    lineStep,
    lineCumulative,
    lineQuantityUnitSuffix,
    lineYAxisValueUnit,
    linePointLabelFontFamily,
    linePointLabelFontSize,
    linePointLabelFontWeight,
    linePointLabelColor,
    multiLineValueFields,
    heatmapXField,
    heatmapYField,
    heatmapValueField,
    heatmapColorLow,
    heatmapColorHigh,
    isNarrowFlow,
    clusterGroupField,
    clusterXField,
    clusterYField,
    clusterSizeField,
    dataNameFields,
    displayNameField,
    additionalStats,
    additionalStatsLabelFontSize,
    additionalStatsNumberFormat,

    gaugeMin,
    gaugeMax,
    gaugeSplitNumber,
    gaugeValue,
    gaugeRadius,
    gaugeCenterX,
    gaugeCenterY,
    gaugeColor,
    gaugeAxisLineColor,
    gaugeDetailColor,
    gaugeShowDetail,
    gaugeDetailOffsetCenterX,
    gaugeDetailOffsetCenterY,
    gaugeTitleOffsetCenterX,
    gaugeTitleOffsetCenterY,
    gaugeTitleFontSize,
    gaugeDetailFontSize,
    gaugeLabelField,
    gaugeLabelColor,
    gaugeLabelFontSize,
    gaugeLabelFontWeight,
    gaugeTitleFontWeight,
    gaugeDetailFontWeight,
    gaugeLabelX,
    gaugeLabelY,
    gaugeArcStartAngle,
    gaugeArcEndAngle,
    gaugeProgressRingLineWidth,
    gaugeProgressRingDrawOffsetPercent,
    gaugeTrackColor,
    gaugeTrackGradient,
    gaugeProgressBarColor,
    gaugeProgressRingCenterY,
    gaugeProgressRingCanvasLabelPosition,
    gaugeProgressRingCanvasLabelEdgePercent,
    gaugeAxisFontSize,
    titleFontSize,
    xAxisFontSize,
    yAxisFontSize,
    treemapLayout,
    chartColorScheme,
    colors,
    defaultColors,
    dataNameFields,
    displayNameField,
    valueField,
    categoryField,
    height,
    t
  ]);

  const chartAreaStyle: React.CSSProperties = fillHeight
    ? { flex: 1, minHeight: 0, height: '100%' }
    : { height };

  const renderChart = () => {
    if (viewType === 'data') {
      return renderDataView();
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div
          className={cn('chart-empty flex items-center justify-center', fillHeight && 'flex-1 min-h-0')}
          style={chartAreaStyle}
        >
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">📊</div>
            <p className={`text-sm ${SEMANTIC_COLORS.text.muted}`}>{i18n.t('renderers:chart.no_data', 'No data')}</p>
          </div>
        </div>
      );
    }

    const headerLabelInChartTopRight =
      Boolean(headerLabelText) && headerLabelPosition === 'chartTopRight';

    return (
      <div className={cn('chart-container', fillHeight && 'flex min-h-0 flex-1 flex-col')}>
        {statsRenderInChartTop
          ? renderAdditionalStats(
              cn(
                isCompactLayoutChart ? 'mb-0' : 'mb-2',
                normalizedAdditionalStatsPosition === 'chartTopRight' && 'justify-end',
                normalizedAdditionalStatsPosition === 'chartTopCenter' && 'justify-center',
                normalizedAdditionalStatsPosition === 'chartTopLeft' && 'justify-start pl-[1em]'
              )
            )
          : null}
        <div className="echarts-chart-container relative" style={chartAreaStyle}>
          {headerLabelInChartTopRight ? (
            <span
              className={cn(
                'pointer-events-none absolute right-2 z-[1] shrink-0 rounded-md px-1.5 py-0.5',
                !headerLabelColor?.trim() && SEMANTIC_COLORS.text.muted
              )}
              style={{
                // Align with the bar chart's top grid line (grid.top ≈ 8%), not a separate row.
                top: '8%',
                transform: 'translateY(-50%)',
                fontSize: `${headerLabelFontSize}px`,
                fontWeight: headerLabelFontWeight,
                ...(headerLabelColor?.trim() ? { color: headerLabelColor.trim() } : {}),
              }}
            >
              {headerLabelText}
            </span>
          ) : null}
          <ReactECharts
            key={`${id ?? componentId ?? 'echarts'}-${chartType}-${chartPaletteKey}`}
            ref={chartRef}
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true}
            lazyUpdate={false}
          />
        </div>
      </div>
    );
  };

  const hasLineAdditionalStats =
    isStatsSupportedChart && Array.isArray(additionalStats) && additionalStats.length > 0;
  const hasLineAdditionalStatsInChart = hasLineAdditionalStats && statsRenderInChartTop;

  if (embedded) {
    return (
      <div className={cn('chart-renderer-embedded relative w-full', className)}>
        {isLoading && chartData.length > 0 && (
          <div className={`absolute right-2 top-2 ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        )}
        {databaseError ? (
          <div className="chart-error flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="text-center text-status-error text-sm">{databaseError}</div>
          </div>
        ) : isLoading && chartData.length === 0 ? (
          <ChartAreaSkeleton
            height={typeof height === 'number' ? height : 240}
            chartType={isGaugeLikeChart || isPieChart ? 'pie' : 'column'}
          />
        ) : (
          renderChart()
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "chart-renderer dark:bg-card dark:border-border",
        isCompactLayoutChart && 'chart-bar-compact',
        hasLineAdditionalStats && 'chart-has-additional-stats',
        fillHeight && 'flex h-full min-h-0 flex-col',
        customStyleProps.className
      )}
      style={customStyleProps.style}
    >
      <CardHeader
        className={cn(
          "chart-header relative flex flex-row items-center justify-between gap-2 space-y-0 pb-2",
          isCompactLayoutChart && "!pt-2 !pb-1 !px-4"
        )}
      >
        <div
          className={cn(
            'flex flex-1 min-w-0 gap-2',
            headerLabelText && headerLabelPosition !== 'chartTopRight'
              ? 'items-start'
              : 'items-center'
          )}
        >
          <CardTitle
            className={cn(
              'chart-title min-w-0 flex-1 text-card-foreground',
              headerLabelText && headerLabelPosition !== 'chartTopRight'
                ? 'leading-snug'
                : 'truncate'
            )}
            style={titleFontSize ? { fontSize: `${titleFontSize}px` } : undefined}
          >
            {title}
          </CardTitle>
          {headerLabelText && headerLabelPosition !== 'chartTopRight' ? (
            <span
              className={cn(
                isNarrowFlow ? 'max-w-[55%] truncate pt-0.5' : 'shrink-0 whitespace-nowrap pt-0.5',
                !headerLabelColor?.trim() && SEMANTIC_COLORS.text.muted
              )}
              style={{
                fontSize: `${headerLabelFontSize}px`,
                fontWeight: headerLabelFontWeight,
                ...(headerLabelColor?.trim() ? { color: headerLabelColor.trim() } : {})
              }}
            >
              {headerLabelText}
            </span>
          ) : null}
        </div>
        {hasLineAdditionalStats && normalizedAdditionalStatsPosition === 'headerCenter'
          ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 w-[80%] -translate-x-1/2 -translate-y-1/2 px-2">
              {renderAdditionalStats('justify-center')}
            </div>
          )
          : null}
        <div className="chart-toolbar flex items-center gap-2 min-h-[32px] shrink-0">
          {hasLineAdditionalStats && normalizedAdditionalStatsPosition === 'headerRight'
            ? renderAdditionalStats('justify-end')
            : null}
          {showDataView && (
            <ViewToggleButton
              viewType={viewType}
              onToggle={() => setViewType(viewType === 'chart' ? 'data' : 'chart')}
            />
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "chart-content relative",
          isCompactLayoutChart && 'px-3 pb-2 pt-0',
          isLineLikeChart && showLegend && '!pb-1',
          hasLineAdditionalStatsInChart && 'chart-line-stats-unified',
          fillHeight && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        {isLoading && chartData.length > 0 && (
          <div className={`absolute right-3 top-3 ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        )}
        {databaseError ? (
          <div
            className={cn('chart-error flex items-center justify-center', fillHeight && 'flex-1 min-h-0')}
            style={chartAreaStyle}
          >
            <div className="text-center text-status-error">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm">{t('chart.error', 'Data load failed')}: {databaseError}</p>
            </div>
          </div>
        ) : isLoading && chartData.length === 0 ? (
          <ChartAreaSkeleton
            height={typeof height === 'number' ? height : 240}
            chartType={isGaugeLikeChart || isPieChart ? 'pie' : 'column'}
          />
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
};

export default EChartsChartRenderer;
