import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardHeader, CardTitle, CardContent } from '@genispace/shared-ui';
import { Button, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import * as echarts from 'echarts';
import { applyCustomStyles } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { useTranslation } from 'react-i18next';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import {
  extractFetchGateParamsFromDatasourceParameters,
  extractStrictWaitParameterKeysFromDatasourceParameters,
} from '@/utils/databaseDatasourceParams';
import type { ComponentParameterConfig } from '@/types/parameters';
import { Skeleton } from '../../skeleton';
import { SEMANTIC_COLORS } from '@/utils/colors';
import i18n from '@/locales/i18n';
import { cn } from '@genispace/shared-utils';
import { Map as MapIcon, Table2 } from 'lucide-react';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { getBundledChinaGeo, getBundledEuropeGeo, getBundledUsaGeo } from '@/assets/maps/bundledMapGeo';

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Parse #RGB / #RRGGBB; return null if invalid. */
function parseHexRgb(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== 'string') return null;
  const s = hex.trim();
  if (!s.startsWith('#')) return null;
  const h = s.slice(1);
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16)
    ];
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Same piecewise linear interpolation as ECharts continuous visualMap across color stops. */
function interpolateColorInStops(colors: string[], t: number): string {
  const stops = colors.map((c) => ({ raw: c, rgb: parseHexRgb(c) })).filter((x) => x.rgb !== null) as {
    raw: string;
    rgb: [number, number, number];
  }[];
  if (stops.length === 0) return '#9ca3af';
  if (stops.length === 1) return stops[0].raw;
  const u = clamp01(t);
  const scaled = u * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;
  const a = stops[i].rgb;
  const b = stops[i + 1].rgb;
  return rgbToHex(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f));
}

function valueToPaletteColor(value: number, vmin: number, vmax: number, palette: string[]): string {
  if (palette.length === 0) return '#9ca3af';
  if (vmax <= vmin) return interpolateColorInStops(palette, 0.5);
  const tv = clamp01((value - vmin) / (vmax - vmin));
  return interpolateColorInStops(palette, tv);
}

function mixRgbWith(hex: string, target: [number, number, number], amount: number): string {
  const c = parseHexRgb(hex);
  if (!c) return hex;
  return rgbToHex(
    lerp(c[0], target[0], amount),
    lerp(c[1], target[1], amount),
    lerp(c[2], target[2], amount)
  );
}

/** Per-region diagonal fill: light to dark; anchor color matches data value on the palette. */
function linearRegionAreaGradient(baseHex: string) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 1,
    global: false as const,
    colorStops: [
      { offset: 0, color: mixRgbWith(baseHex, [255, 255, 255], 0.58) },
      { offset: 0.48, color: baseHex },
      { offset: 1, color: mixRgbWith(baseHex, [0, 0, 0], 0.45) }
    ]
  };
}

function extractVisualMapContinuousRange(params: any): [number, number] | null {
  const tryPair = (sel: unknown): [number, number] | null => {
    if (Array.isArray(sel) && sel.length >= 2) {
      const a = Number(sel[0]);
      const b = Number(sel[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return a <= b ? [a, b] : [b, a];
      }
    }
    return null;
  };
  const direct = tryPair(params?.selected);
  if (direct) {
    return direct;
  }
  const batch = params?.batch;
  if (Array.isArray(batch)) {
    for (const b of batch) {
      const p = tryPair(b?.selected);
      if (p) {
        return p;
      }
    }
  }
  return null;
}

export interface MapChartRendererProps {
  title?: string;
  data?: any[];
  nameField?: string; 
  valueField?: string; 
  height?: number;
  loading?: boolean;
  className?: string;
  mapType?: 'china' | 'province' | 'usa' | 'europe'; 
  province?: string; 
  color?: string | string[]; 
  showLabel?: boolean; 
  labelFormatter?: (params: any) => string; 
  tooltipFormatter?: ((params: any) => string) | string; 
  visualMap?: {
    type?: 'continuous' | 'piecewise';
    min?: number;
    max?: number;
    seriesIndex?: number | number[];
    inRange?: {
      color?: string[];
    };
    text?: string[];
    calculable?: boolean;
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
}

const MapChartRenderer: React.FC<MapChartRendererProps> = ({
  title,
  data = [],
  nameField = 'name',
  valueField = 'value',
  height = 1000,
  loading = false,
  className,
  mapType = 'china',
  province,
  color,
  showLabel = true,
  labelFormatter,
  tooltipFormatter,
  visualMap,
  useMockData = false,
  mockData = [],
  id,
  customStyles,
  showDataView = false,
  databaseDataSourceConfig,
  pageParams = {},
  componentParameterConfig
}) => {
  const { t } = useTranslation('renderers');
  const isNarrowFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<number>(1);
  const [viewType, setViewType] = React.useState<'chart' | 'data'>('chart');
  const [mapRegistered, setMapRegistered] = React.useState(false);
  const [showHint, setShowHint] = React.useState(true);
  /** Selected interval on continuous visualMap handles (subset of domain); null = full domain */
  const [vmSelectedRange, setVmSelectedRange] = React.useState<[number, number] | null>(null);
  /** Value under cursor on continuous visualMap strip (for hover-linked dimming on the map) */
  const [vmHoverProbeValue, setVmHoverProbeValue] = React.useState<number | null>(null);

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

  const configuredHeight = typeof height === 'number'
    ? height
    : (typeof height === 'string'
      ? parseInt(height, 10) || 1000
      : 1000);
  // Narrow flow: clamp the height — the 1000px default leaves mostly dead space in a ~358px column
  const actualHeight = isNarrowFlow ? Math.min(configuredHeight, 420) : configuredHeight;

  useEffect(() => {
    const resizeChart = () => {
      if (chartRef.current && containerRef.current) {
        const chartInstance = chartRef.current.getEchartsInstance();
        if (chartInstance) {

          chartInstance.resize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
          });
        }
      }
    };

    if (mapRegistered) {

      const timer1 = setTimeout(() => {
        resizeChart();
      }, 200);

      const timer2 = setTimeout(() => {
        resizeChart();
      }, 500);

      const timer3 = setTimeout(() => {
        resizeChart();
      }, 1000);

      window.addEventListener('resize', resizeChart);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        window.removeEventListener('resize', resizeChart);
      };
    }
  }, [mapRegistered, viewType, actualHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {

      if (e.shiftKey) {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (chartInstance) {

          const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

          const scrollDistance = Math.abs(delta);

          const baseZoomStep = 0.25; 

          const dynamicMultiplier = Math.min(2, scrollDistance / 80); 
          const zoomStep = baseZoomStep * (1 + dynamicMultiplier); 

          const zoomFactor = delta > 0 
            ? (1 - zoomStep) 
            : (1 + zoomStep); 

          zoomRef.current = Math.max(0.5, Math.min(5, zoomRef.current * zoomFactor));

          chartInstance.setOption({
            series: [{
              zoom: zoomRef.current
            }]
          }, { notMerge: false });
        }
        e.preventDefault();
        e.stopPropagation();
      }

    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [mapRegistered]);

  useEffect(() => {
    if (mapRegistered && chartRef.current) {
      const timer = setTimeout(() => {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (chartInstance) {
          const option = chartInstance.getOption();
          const currentZoom = (option as any).series?.[0]?.zoom || 1;
          zoomRef.current = currentZoom;
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mapRegistered]);

  const mapLoadKey = useMemo(
    () => `${mapType}:${mapType === 'province' ? (province || '') : ''}`,
    [mapType, province]
  );

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) {
        setMapRegistered(true);
      }
    };

    const registerMap = () => {
      setMapRegistered(false);

      try {
        const emptyFc = {
          type: 'FeatureCollection' as const,
          features: [] as any[]
        };

        if (mapType === 'china') {
          echarts.registerMap('china', getBundledChinaGeo() as any);
          finish();
        } else if (mapType === 'usa') {
          echarts.registerMap('usa', getBundledUsaGeo() as any);
          finish();
        } else if (mapType === 'europe') {
          echarts.registerMap('europe', getBundledEuropeGeo() as any);
          finish();
        } else if (mapType === 'province' && province) {
          // Province drill-down GeoJSON is not bundled; register empty FC so the chart does not stay loading.
          echarts.registerMap(province, emptyFc);
          finish();
        } else {
          finish();
        }
      } catch (error) {
        console.error('注册地图失败:', error);
        finish();
      }
    };

    registerMap();

    return () => {
      cancelled = true;
    };
  }, [mapLoadKey]);

  const chartData = useMemo(() => {
    if (useMockData && mockData && mockData.length > 0) {
      return mockData;
    }
    if (databaseDataSourceConfig?.datasourceId && databaseData && databaseData.length > 0) {
      return databaseData;
    }
    return data || [];
  }, [useMockData, mockData, databaseDataSourceConfig?.datasourceId, databaseData, databaseLoading, databaseInitialized, databaseError, data]);

  const isLoading = loading || (databaseDataSourceConfig?.datasourceId && databaseLoading);

  const provinceNameMap: Record<string, string> = useMemo(() => ({
    '北京': t('map_chart.provinces.beijing_full', 'Beijing Municipality'),
    '上海': t('map_chart.provinces.shanghai_full', 'Shanghai Municipality'),
    '天津': t('map_chart.provinces.tianjin_full', 'Tianjin Municipality'),
    '重庆': t('map_chart.provinces.chongqing_full', 'Chongqing Municipality'),
    '广东': t('map_chart.provinces.guangdong_full', 'Guangdong Province'),
    '江苏': t('map_chart.provinces.jiangsu_full', 'Jiangsu Province'),
    '浙江': t('map_chart.provinces.zhejiang_full', 'Zhejiang Province'),
    '山东': t('map_chart.provinces.shandong_full', 'Shandong Province'),
    '四川': t('map_chart.provinces.sichuan_full', 'Sichuan Province'),
    '湖北': t('map_chart.provinces.hubei_full', 'Hubei Province'),
    '河南': t('map_chart.provinces.henan_full', 'Henan Province'),
    '湖南': t('map_chart.provinces.hunan_full', 'Hunan Province'),
    '安徽': t('map_chart.provinces.anhui_full', 'Anhui Province'),
    '福建': t('map_chart.provinces.fujian_full', 'Fujian Province'),
    '江西': t('map_chart.provinces.jiangxi_full', 'Jiangxi Province'),
    '河北': t('map_chart.provinces.hebei_full', 'Hebei Province'),
    '山西': t('map_chart.provinces.shanxi_full', 'Shanxi Province'),
    '内蒙古': t('map_chart.provinces.inner_mongolia_full', 'Inner Mongolia Autonomous Region'),
    '辽宁': t('map_chart.provinces.liaoning_full', 'Liaoning Province'),
    '吉林': t('map_chart.provinces.jilin_full', 'Jilin Province'),
    '黑龙江': t('map_chart.provinces.heilongjiang_full', 'Heilongjiang Province'),
    '广西': t('map_chart.provinces.guangxi_full', 'Guangxi Zhuang Autonomous Region'),
    '海南': t('map_chart.provinces.hainan_full', 'Hainan Province'),
    '贵州': t('map_chart.provinces.guizhou_full', 'Guizhou Province'),
    '云南': t('map_chart.provinces.yunnan_full', 'Yunnan Province'),
    '西藏': t('map_chart.provinces.tibet_full', 'Tibet Autonomous Region'),
    '陕西': t('map_chart.provinces.shaanxi_full', 'Shaanxi Province'),
    '甘肃': t('map_chart.provinces.gansu_full', 'Gansu Province'),
    '青海': t('map_chart.provinces.qinghai_full', 'Qinghai Province'),
    '宁夏': t('map_chart.provinces.ningxia_full', 'Ningxia Hui Autonomous Region'),
    '新疆': t('map_chart.provinces.xinjiang_full', 'Xinjiang Uygur Autonomous Region'),
    '台湾': t('map_chart.provinces.taiwan_full', 'Taiwan Province'),
    '香港': t('map_chart.provinces.hong_kong_full', 'Hong Kong Special Administrative Region'),
    '澳门': t('map_chart.provinces.macau_full', 'Macau Special Administrative Region')
  }), [t]);

  const reverseProvinceNameMap: Record<string, string> = Object.fromEntries(
    Object.entries(provinceNameMap).map(([key, value]) => [value, key])
  );

  const fullNameMap: Record<string, string> = useMemo(() => ({
    ...provinceNameMap,
    ...reverseProvinceNameMap,

    '北京市': t('map_chart.provinces.beijing_full', 'Beijing Municipality'),
    '上海市': t('map_chart.provinces.shanghai_full', 'Shanghai Municipality'),
    '天津市': t('map_chart.provinces.tianjin_full', 'Tianjin Municipality'),
    '重庆市': t('map_chart.provinces.chongqing_full', 'Chongqing Municipality'),
    '广东省': t('map_chart.provinces.guangdong_full', 'Guangdong Province'),
    '江苏省': t('map_chart.provinces.jiangsu_full', 'Jiangsu Province'),
    '浙江省': t('map_chart.provinces.zhejiang_full', 'Zhejiang Province'),
    '山东省': t('map_chart.provinces.shandong_full', 'Shandong Province'),
    '四川省': t('map_chart.provinces.sichuan_full', 'Sichuan Province'),
    '湖北省': t('map_chart.provinces.hubei_full', 'Hubei Province'),
    '河南省': t('map_chart.provinces.henan_full', 'Henan Province'),
    '湖南省': t('map_chart.provinces.hunan_full', 'Hunan Province'),
    '安徽省': t('map_chart.provinces.anhui_full', 'Anhui Province'),
    '福建省': t('map_chart.provinces.fujian_full', 'Fujian Province'),
    '江西省': t('map_chart.provinces.jiangxi_full', 'Jiangxi Province'),
    '河北省': t('map_chart.provinces.hebei_full', 'Hebei Province'),
    '山西省': t('map_chart.provinces.shanxi_full', 'Shanxi Province'),
    '内蒙古自治区': t('map_chart.provinces.inner_mongolia_full', 'Inner Mongolia Autonomous Region'),
    '辽宁省': t('map_chart.provinces.liaoning_full', 'Liaoning Province'),
    '吉林省': t('map_chart.provinces.jilin_full', 'Jilin Province'),
    '黑龙江省': t('map_chart.provinces.heilongjiang_full', 'Heilongjiang Province'),
    '广西壮族自治区': t('map_chart.provinces.guangxi_full', 'Guangxi Zhuang Autonomous Region'),
    '海南省': t('map_chart.provinces.hainan_full', 'Hainan Province'),
    '贵州省': t('map_chart.provinces.guizhou_full', 'Guizhou Province'),
    '云南省': t('map_chart.provinces.yunnan_full', 'Yunnan Province'),
    '西藏自治区': t('map_chart.provinces.tibet_full', 'Tibet Autonomous Region'),
    '陕西省': t('map_chart.provinces.shaanxi_full', 'Shaanxi Province'),
    '甘肃省': t('map_chart.provinces.gansu_full', 'Gansu Province'),
    '青海省': t('map_chart.provinces.qinghai_full', 'Qinghai Province'),
    '宁夏回族自治区': t('map_chart.provinces.ningxia_full', 'Ningxia Hui Autonomous Region'),
    '新疆维吾尔自治区': t('map_chart.provinces.xinjiang_full', 'Xinjiang Uygur Autonomous Region'),
    '台湾省': t('map_chart.provinces.taiwan_full', 'Taiwan Province'),
    '香港特别行政区': t('map_chart.provinces.hong_kong_full', 'Hong Kong Special Administrative Region'),
    '澳门特别行政区': t('map_chart.provinces.macau_full', 'Macau Special Administrative Region')
  }), [provinceNameMap, t]);

  const mapData = useMemo(() => {
    const skipChinaNameNormalize = mapType === 'usa' || mapType === 'europe';

    return chartData.map((item, index) => {
      let name = item[nameField] || item.name;

      if (!skipChinaNameNormalize) {
        if (fullNameMap[name]) {
          name = fullNameMap[name];
        } else {
          const nameWithoutSuffix = name
            .replace(/省$/, '')
            .replace(/市$/, '')
            .replace(/自治区$/, '')
            .replace(/特别行政区$/, '');

          if (nameWithoutSuffix !== name && provinceNameMap[nameWithoutSuffix]) {
            name = provinceNameMap[nameWithoutSuffix];
          } else if (nameWithoutSuffix !== name && fullNameMap[nameWithoutSuffix]) {
            name = fullNameMap[nameWithoutSuffix];
          }
        }
      }

      const rawValue = item[valueField] !== undefined ? item[valueField] : (item.value !== undefined ? item.value : null);

      let value: number;
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        value = 0;
      } else if (typeof rawValue === 'number') {
        value = isNaN(rawValue) ? 0 : rawValue;
      } else {

        const numValue = Number(rawValue);
        value = isNaN(numValue) ? 0 : numValue;
      }

      return {
        name: name,
        value: value,
        ...item
      };
    });
  }, [chartData, nameField, valueField, mapType, fullNameMap, provinceNameMap]);

  const mapValuesSignature = useMemo(
    () => mapData.map((d) => `${String(d.name)}:${Number(d.value)}`).join('|'),
    [mapData]
  );

  const echartsSeriesMapName = useMemo(() => {
    if (mapType === 'china') return 'china';
    if (mapType === 'usa') return 'usa';
    if (mapType === 'europe') return 'europe';
    return province || 'china';
  }, [mapType, province]);

  const values = mapData.map(item => item.value).filter(v => typeof v === 'number' && !isNaN(v));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 100;

  const defaultGradientColors = useMemo(
    () =>
      Array.isArray(color)
        ? color
        : color
          ? [String(color), '#e8f4fc']
          : [
              '#313695',
              '#4575b4',
              '#74add1',
              '#abd9e9',
              '#e0f3f8',
              '#ffffcc',
              '#fee090',
              '#fdae61',
              '#f46d43',
              '#d73027',
              '#a50026'
            ],
    [color]
  );

  const visualMapConfig = useMemo(() => {
    const continuousBase = {
      type: 'continuous' as const,
      min: minValue,
      max: maxValue,
      left: 'left',
      top: 'bottom',
      orient: 'horizontal' as const,
      text: [t('map_chart.high', 'High'), t('map_chart.low', 'Low')],
      calculable: true,
      realtime: true,
      inRange: {
        color: defaultGradientColors
      },
      textStyle: {
        color: 'hsl(var(--foreground))'
      }
    };

    const inRangeColor =
      visualMap?.inRange?.color && visualMap.inRange.color.length > 0
        ? visualMap.inRange.color
        : defaultGradientColors;

    const merged = !visualMap
      ? continuousBase
      : {
          ...continuousBase,
          ...visualMap,
          type: visualMap.type ?? continuousBase.type,
          min: visualMap.min !== undefined ? visualMap.min : continuousBase.min,
          max: visualMap.max !== undefined ? visualMap.max : continuousBase.max,
          text: visualMap.text ?? continuousBase.text,
          calculable: visualMap.calculable ?? continuousBase.calculable,
          orient: (visualMap as { orient?: 'horizontal' | 'vertical' }).orient ?? continuousBase.orient,
          inRange: {
            ...continuousBase.inRange,
            ...(visualMap.inRange || {}),
            color: inRangeColor
          },
          textStyle: {
            ...continuousBase.textStyle,
            ...((visualMap as { textStyle?: object }).textStyle || {})
          }
        };

    if (merged.type === 'piecewise') {
      return merged;
    }

    return {
      ...merged,
      // Map is series 0 with per-item gradients (visualMap: false on items). Bind
      // visualMap to an invisible scatter[1] so calculable handles + hover indicator render.
      hoverLink: false,
      seriesIndex: [1],
      dimension: 2,
      handleStyle: {
        borderColor: '#fff',
        borderWidth: 1,
        shadowBlur: 2,
        shadowColor: 'rgba(0,0,0,0.2)'
      },
      indicatorIcon: 'circle',
      indicatorSize: 14,
      indicatorStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        shadowBlur: 3,
        shadowColor: 'rgba(0,0,0,0.35)'
      }
    };
  }, [visualMap, minValue, maxValue, defaultGradientColors, t]);

  useEffect(() => {
    setVmSelectedRange(null);
    setVmHoverProbeValue(null);
  }, [mapLoadKey, visualMap?.min, visualMap?.max, visualMap?.type, mapValuesSignature]);

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart || !mapRegistered || viewType !== 'chart') {
      return;
    }
    if (visualMap?.type === 'piecewise') {
      return;
    }

    const domainMin = Number.isFinite(Number(visualMap?.min)) ? Number(visualMap.min) : minValue;
    const domainMax = Number.isFinite(Number(visualMap?.max)) ? Number(visualMap.max) : maxValue;
    const span = Math.max(domainMax - domainMin, 1e-6);
    const buckets = 40;

    let rafId = 0;
    const flush = (v: number | null) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (v == null) {
          setVmHoverProbeValue(null);
          return;
        }
        const q = domainMin + (Math.round(((v - domainMin) / span) * buckets) / buckets) * span;
        setVmHoverProbeValue((prev) =>
          prev !== null && Math.abs(prev - q) < span / (buckets * 3) ? prev : q
        );
      });
    };

    const zr = chart.getZr();
    const onZrMove = (ev: any) => {
      const x = ev?.offsetX;
      const y = ev?.offsetY;
      if (typeof x !== 'number' || typeof y !== 'number') {
        flush(null);
        return;
      }
      try {
        const finder = { visualMapIndex: 0 } as unknown as Parameters<typeof chart.containPixel>[0];
        if (!chart.containPixel(finder, [x, y])) {
          flush(null);
          return;
        }
        const raw = chart.convertFromPixel(finder, [x, y] as [number, number]);
        let v: number | null = null;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          v = raw;
        } else if (Array.isArray(raw) && raw.length > 0) {
          const n = Number(raw[0]);
          if (Number.isFinite(n)) {
            v = n;
          }
        }
        flush(v);
      } catch {
        flush(null);
      }
    };

    const onGlobalOut = () => flush(null);

    zr.on('mousemove', onZrMove);
    zr.on('globalout', onGlobalOut);

    return () => {
      cancelAnimationFrame(rafId);
      zr.off('mousemove', onZrMove);
      zr.off('globalout', onGlobalOut);
    };
  }, [mapRegistered, viewType, visualMap?.type, visualMap?.min, visualMap?.max, minValue, maxValue]);

  const onDataRangeSelected = useCallback((params: unknown) => {
    if (visualMap?.type === 'piecewise') {
      return;
    }
    const r = extractVisualMapContinuousRange(params);
    if (r) {
      setVmSelectedRange(r);
    }
  }, [visualMap?.type]);

  const option = useMemo(() => {
    const isPiecewise = (visualMapConfig as { type?: string }).type === 'piecewise';
    const visualMapForOption =
      !isPiecewise && vmSelectedRange
        ? { ...visualMapConfig, range: vmSelectedRange }
        : visualMapConfig;
    const vmDomainMin = Number.isFinite(Number(visualMapConfig.min))
      ? Number(visualMapConfig.min)
      : minValue;
    const vmDomainMax = Number.isFinite(Number(visualMapConfig.max))
      ? Number(visualMapConfig.max)
      : maxValue;

    return {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: 'hsl(var(--foreground))',
        fontSize: 16,
        fontWeight: 'bold'
      }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: typeof tooltipFormatter === 'function' 
        ? tooltipFormatter 
        : typeof tooltipFormatter === 'string'
        ? (params: any) => {

            const displayValue = typeof params.value === 'number' 
              ? params.value 
              : (params.value !== null && params.value !== undefined && params.value !== '')
                ? Number(params.value) || 0
                : 0;

            if (tooltipFormatter.includes('${')) {
              return tooltipFormatter
                .replace(/\${params\.name}/g, params.name)
                .replace(/\${params\.value}/g, String(displayValue))
                .replace(/\${name}/g, params.name)
                .replace(/\${value}/g, String(displayValue));
            }
            return tooltipFormatter;
          }
        : ((params: any) => {
            if (params.data) {

              const displayValue = typeof params.value === 'number' 
                ? (isNaN(params.value) ? 0 : params.value)
                : (params.value !== null && params.value !== undefined && params.value !== '')
                  ? (() => {
                      const numValue = Number(params.value);
                      return isNaN(numValue) ? 0 : numValue;
                    })()
                  : 0;

              return `${params.name}<br/>${valueField}: ${displayValue}`;
            }
            return `${params.name}: ${t('map_chart.no_data', 'No data')}`;
          }),
      backgroundColor: 'hsl(var(--popover))',
      borderColor: 'hsl(var(--border))',
      textStyle: {
        color: 'hsl(var(--foreground))'
      }
    },
    visualMap: visualMapForOption,
    ...(!isPiecewise
      ? {
          grid: {
            left: -80,
            top: -80,
            width: 40,
            height: 40,
            show: false
          },
          xAxis: {
            type: 'value' as const,
            show: false,
            min: 0,
            max: 1
          },
          yAxis: {
            type: 'value' as const,
            show: false,
            min: 0,
            max: 1
          }
        }
      : {}),
    series: [
      {
        name: title || t('map_chart.data', 'Data'),
        type: 'map',
        map: echartsSeriesMapName,
        roam: 'move', 
        zoom: 1, 
        layoutCenter: ['50%', '50%'], 
        layoutSize: '100%', 

        emphasis: {
          label: {
            show: true,
            color: '#000',
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        itemStyle: {
          borderColor: 'hsl(var(--border))',
          borderWidth: 1,
          areaColor: '#E5E5E5'
        },
        label: {
          show: showLabel,
          formatter: labelFormatter || '{b}',
          fontSize: 10,
          color: '#000',
          fontWeight: 'normal'
        },
        data: (() => {
          const vmType = (visualMapConfig as { type?: string }).type;
          const useRegionGradient = vmType !== 'piecewise';
          const domainMin = Number.isFinite(Number(visualMapConfig.min))
            ? Number(visualMapConfig.min)
            : minValue;
          const domainMax = Number.isFinite(Number(visualMapConfig.max))
            ? Number(visualMapConfig.max)
            : maxValue;
          const [r0, r1] = vmSelectedRange ?? [domainMin, domainMax];
          const palette =
            (visualMapConfig.inRange?.color?.length
              ? visualMapConfig.inRange.color
              : defaultGradientColors) || defaultGradientColors;

          const domainSpan = Math.max(domainMax - domainMin, 1e-6);
          const probeBand = Math.max(domainSpan * 0.03, 0.75);

          const processedData = mapData.map((item) => {
            const finalValue = typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0;
            const { itemStyle: _omitItemStyle, emphasis: _omitEmphasis, select: _omitSelect, ...rest } = item;

            if (!useRegionGradient) {
              return {
                name: item.name,
                value: finalValue,
                ...rest
              };
            }

            const inWindow = finalValue >= r0 && finalValue <= r1;
            if (!inWindow) {
              return {
                name: item.name,
                value: finalValue,
                ...rest,
                visualMap: false,
                itemStyle: {
                  areaColor: '#E5E5E5'
                },
                emphasis: {
                  itemStyle: {
                    areaColor: linearRegionAreaGradient('#d4d4d4'),
                    borderWidth: 2,
                    borderColor: '#fff'
                  }
                }
              };
            }

            const baseColor = valueToPaletteColor(finalValue, r0, r1, palette as string[]);
            const hoverAnchor = mixRgbWith(baseColor, [255, 255, 255], 0.24);
            const probeActive =
              vmHoverProbeValue != null &&
              Number.isFinite(vmHoverProbeValue) &&
              Math.abs(finalValue - vmHoverProbeValue) <= probeBand;

            return {
              name: item.name,
              value: finalValue,
              ...rest,
              visualMap: false,
              itemStyle: {
                areaColor: linearRegionAreaGradient(baseColor),
                ...(vmHoverProbeValue != null && !probeActive ? { opacity: 0.38 } : {})
              },
              emphasis: {
                itemStyle: {
                  areaColor: linearRegionAreaGradient(hoverAnchor),
                  borderWidth: 2,
                  borderColor: '#fff'
                }
              }
            };
          });

          return processedData;
        })(),
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',

        nameMap: (mapType === 'china' || mapType === 'province') ? {

          '北京': t('map_chart.provinces.beijing_full', 'Beijing Municipality'),
          '上海': t('map_chart.provinces.shanghai_full', 'Shanghai Municipality'),
          '天津': t('map_chart.provinces.tianjin_full', 'Tianjin Municipality'),
          '重庆': t('map_chart.provinces.chongqing_full', 'Chongqing Municipality'),
          '广东': t('map_chart.provinces.guangdong_full', 'Guangdong Province'),
          '江苏': t('map_chart.provinces.jiangsu_full', 'Jiangsu Province'),
          '浙江': t('map_chart.provinces.zhejiang_full', 'Zhejiang Province'),
          '山东': t('map_chart.provinces.shandong_full', 'Shandong Province'),
          '四川': t('map_chart.provinces.sichuan_full', 'Sichuan Province'),
          '湖北': t('map_chart.provinces.hubei_full', 'Hubei Province'),
          '河南': t('map_chart.provinces.henan_full', 'Henan Province'),
          '湖南': t('map_chart.provinces.hunan_full', 'Hunan Province'),
          '安徽': t('map_chart.provinces.anhui_full', 'Anhui Province'),
          '福建': t('map_chart.provinces.fujian_full', 'Fujian Province'),
          '江西': t('map_chart.provinces.jiangxi_full', 'Jiangxi Province'),
          '河北': t('map_chart.provinces.hebei_full', 'Hebei Province'),
          '山西': t('map_chart.provinces.shanxi_full', 'Shanxi Province'),
          '内蒙古': t('map_chart.provinces.inner_mongolia_full', 'Inner Mongolia Autonomous Region'),
          '辽宁': t('map_chart.provinces.liaoning_full', 'Liaoning Province'),
          '吉林': t('map_chart.provinces.jilin_full', 'Jilin Province'),
          '黑龙江': t('map_chart.provinces.heilongjiang_full', 'Heilongjiang Province'),
          '广西': t('map_chart.provinces.guangxi_full', 'Guangxi Zhuang Autonomous Region'),
          '海南': t('map_chart.provinces.hainan_full', 'Hainan Province'),
          '贵州': t('map_chart.provinces.guizhou_full', 'Guizhou Province'),
          '云南': t('map_chart.provinces.yunnan_full', 'Yunnan Province'),
          '西藏': t('map_chart.provinces.tibet_full', 'Tibet Autonomous Region'),
          '陕西': t('map_chart.provinces.shaanxi_full', 'Shaanxi Province'),
          '甘肃': t('map_chart.provinces.gansu_full', 'Gansu Province'),
          '青海': t('map_chart.provinces.qinghai_full', 'Qinghai Province'),
          '宁夏': t('map_chart.provinces.ningxia_full', 'Ningxia Hui Autonomous Region'),
          '新疆': t('map_chart.provinces.xinjiang_full', 'Xinjiang Uygur Autonomous Region'),
          '台湾': t('map_chart.provinces.taiwan_full', 'Taiwan Province'),
          '香港': t('map_chart.provinces.hong_kong_full', 'Hong Kong Special Administrative Region'),
          '澳门': t('map_chart.provinces.macau_full', 'Macau Special Administrative Region'),

          '北京市': t('map_chart.provinces.beijing_full', 'Beijing Municipality'),
          '上海市': t('map_chart.provinces.shanghai_full', 'Shanghai Municipality'),
          '天津市': t('map_chart.provinces.tianjin_full', 'Tianjin Municipality'),
          '重庆市': t('map_chart.provinces.chongqing_full', 'Chongqing Municipality'),
          '广东省': t('map_chart.provinces.guangdong_full', 'Guangdong Province'),
          '江苏省': t('map_chart.provinces.jiangsu_full', 'Jiangsu Province'),
          '浙江省': t('map_chart.provinces.zhejiang_full', 'Zhejiang Province'),
          '山东省': t('map_chart.provinces.shandong_full', 'Shandong Province'),
          '四川省': t('map_chart.provinces.sichuan_full', 'Sichuan Province'),
          '湖北省': t('map_chart.provinces.hubei_full', 'Hubei Province'),
          '河南省': t('map_chart.provinces.henan_full', 'Henan Province'),
          '湖南省': t('map_chart.provinces.hunan_full', 'Hunan Province'),
          '安徽省': t('map_chart.provinces.anhui_full', 'Anhui Province'),
          '福建省': t('map_chart.provinces.fujian_full', 'Fujian Province'),
          '江西省': t('map_chart.provinces.jiangxi_full', 'Jiangxi Province'),
          '河北省': t('map_chart.provinces.hebei_full', 'Hebei Province'),
          '山西省': t('map_chart.provinces.shanxi_full', 'Shanxi Province'),
          '内蒙古自治区': t('map_chart.provinces.inner_mongolia_full', 'Inner Mongolia Autonomous Region'),
          '辽宁省': t('map_chart.provinces.liaoning_full', 'Liaoning Province'),
          '吉林省': t('map_chart.provinces.jilin_full', 'Jilin Province'),
          '黑龙江省': t('map_chart.provinces.heilongjiang_full', 'Heilongjiang Province'),
          '广西壮族自治区': t('map_chart.provinces.guangxi_full', 'Guangxi Zhuang Autonomous Region'),
          '海南省': t('map_chart.provinces.hainan_full', 'Hainan Province'),
          '贵州省': t('map_chart.provinces.guizhou_full', 'Guizhou Province'),
          '云南省': t('map_chart.provinces.yunnan_full', 'Yunnan Province'),
          '西藏自治区': t('map_chart.provinces.tibet_full', 'Tibet Autonomous Region'),
          '陕西省': t('map_chart.provinces.shaanxi_full', 'Shaanxi Province'),
          '甘肃省': t('map_chart.provinces.gansu_full', 'Gansu Province'),
          '青海省': t('map_chart.provinces.qinghai_full', 'Qinghai Province'),
          '宁夏回族自治区': t('map_chart.provinces.ningxia_full', 'Ningxia Hui Autonomous Region'),
          '新疆维吾尔自治区': t('map_chart.provinces.xinjiang_full', 'Xinjiang Uygur Autonomous Region'),
          '台湾省': t('map_chart.provinces.taiwan_full', 'Taiwan Province'),
          '香港特别行政区': t('map_chart.provinces.hong_kong_full', 'Hong Kong Special Administrative Region'),
          '澳门特别行政区': t('map_chart.provinces.macau_full', 'Macau Special Administrative Region')
        } : {}
      },
      ...(isPiecewise
        ? []
        : [
            {
              type: 'scatter' as const,
              name: '__visualMapRange',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: [
                [0, 0, vmDomainMin],
                [1, 1, Math.max(vmDomainMax, vmDomainMin + 1e-6)]
              ],
              symbolSize: 0,
              itemStyle: { opacity: 0 },
              emphasis: { disabled: true },
              silent: true,
              tooltip: { show: false },
              z: -20,
              animation: false
            }
          ])
    ]
  };
  }, [
    title,
    tooltipFormatter,
    valueField,
    visualMapConfig,
    defaultGradientColors,
    mapType,
    province,
    echartsSeriesMapName,
    showLabel,
    labelFormatter,
    mapData,
    minValue,
    maxValue,
    vmSelectedRange,
    vmHoverProbeValue,
    actualHeight,
    t
  ]);

  const renderDataView = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div
          className={cn('data-empty flex items-center justify-center', fillCell && 'min-h-0 flex-1')}
          style={fillCell ? undefined : { height: `${actualHeight}px` }}
        >
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-50">🗺️</div>
            <p className={`text-sm ${SEMANTIC_COLORS.text.muted}`}>{i18n.t('renderers:chart.no_data', 'No data')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('data-table-view overflow-auto custom-scrollbar', fillCell && 'min-h-0 flex-1')}>
        <table className="data-table w-full border-collapse">
          <thead className="data-table-header">
            <tr className="data-table-row border-b">
              <th className="data-table-cell text-left p-2 font-semibold">{nameField}</th>
              <th className="data-table-cell text-left p-2 font-semibold">{valueField}</th>
            </tr>
          </thead>
          <tbody className="data-table-body">
            {chartData.map((item, index) => (
              <tr key={index} className="data-table-row border-b hover:bg-muted/50">
                <td className="data-table-cell p-2">{item[nameField] || item.name}</td>
                <td className="data-table-cell p-2">{item[valueField] || item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const customStyleProps = id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };

  return (
    <Card className={cn("dark:bg-card dark:border-border", fillCell && 'flex h-full min-h-0 flex-col', customStyleProps.className)} id={id} style={customStyleProps.style}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={isNarrowFlow ? 'min-w-0 truncate' : undefined}>{title}</CardTitle>
          {showDataView && (
            <div className="flex gap-2">
              <Button
                variant={viewType === 'chart' ? 'default' : 'outline'}
                size={isNarrowFlow ? 'icon' : 'sm'}
                className={isNarrowFlow ? 'h-8 w-8' : undefined}
                onClick={() => setViewType('chart')}
                aria-label={isNarrowFlow ? t('map_chart.chart', 'Chart') : undefined}
                title={isNarrowFlow ? t('map_chart.chart', 'Chart') : undefined}
              >
                {isNarrowFlow ? <MapIcon className="h-4 w-4" /> : t('map_chart.chart', 'Chart')}
              </Button>
              <Button
                variant={viewType === 'data' ? 'default' : 'outline'}
                size={isNarrowFlow ? 'icon' : 'sm'}
                className={isNarrowFlow ? 'h-8 w-8' : undefined}
                onClick={() => setViewType('data')}
                aria-label={isNarrowFlow ? t('map_chart.data', 'Data') : undefined}
                title={isNarrowFlow ? t('map_chart.data', 'Data') : undefined}
              >
                {isNarrowFlow ? <Table2 className="h-4 w-4" /> : t('map_chart.data', 'Data')}
              </Button>
            </div>
          )}
        </CardHeader>
      )}
      <CardContent
        className={cn('relative', fillCell && 'flex min-h-0 flex-1 flex-col')}
        style={{ padding: 0, overflow: 'visible', height: fillCell ? undefined : 'auto' }}
      >
        {isLoading && chartData.length > 0 && (
          <div className={`absolute right-3 top-3 ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        )}
        {databaseError ? (
          <div
            className={cn('chart-error flex items-center justify-center', fillCell && 'min-h-0 flex-1')}
            style={fillCell ? undefined : { height: `${actualHeight}px` }}
          >
            <div className="text-center text-status-error">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm">{t('map_chart.error', 'Data load failed')}: {databaseError}</p>
            </div>
          </div>
        ) : isLoading && chartData.length === 0 ? (
          <Skeleton
            className={cn('w-full rounded-lg', fillCell && 'min-h-0 flex-1')}
            style={fillCell ? undefined : { height: `${actualHeight}px` }}
          />
        ) : viewType === 'data' ? (
          renderDataView()
        ) : (
          <div
            className={cn('relative map-chart-height-container', fillCell && 'min-h-0 flex-1')}
            style={fillCell
              ? { height: '100%', width: '100%', boxSizing: 'border-box' }
              : {
                  height: `${actualHeight}px`,
                  minHeight: `${actualHeight}px`,
                  maxHeight: `${actualHeight}px`,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
            data-height={actualHeight}
          >
            {/* Hint is mouse-only (Shift+wheel / drag) and would cover most of a narrow map */}
            {!isNarrowFlow && showHint && mapRegistered && (
              <div className={`absolute top-2 right-2 ${Z_INDEX_CLASSES.STICKY_HEADER} bg-status-info/10 dark:bg-status-info/20 border border-neutral-200 dark:border-neutral-700 rounded-md px-3 py-2 text-xs text-status-info shadow-sm`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium mb-1">{t('map_chart.operation_hint', 'Operation Hint')}</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>
                        {t('map_chart.zoom_hint_prefix', 'Hold')} <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-600">Shift</kbd> {t('map_chart.zoom_hint_suffix', '+ scroll wheel: Zoom map')}
                      </li>
                      <li>{t('map_chart.pan_hint', 'Mouse drag: Pan map')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setShowHint(false)}
                    className="btn btn-ghost ml-2"
                    aria-label={t('map_chart.close_hint', 'Close hint')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div 
              ref={containerRef}
              className="map-chart-container" 
              style={{ 
                height: '100%',
                width: '100%'
              }}
            >
              {mapRegistered ? (
                <ReactECharts
                  key={`map-${actualHeight}-${mapLoadKey}-${mapData.length}`}
                  ref={chartRef}
                  option={option}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={false}
                  lazyUpdate={true}
                  onEvents={{ datarangeselected: onDataRangeSelected }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {t('map_chart.loading_map_data', 'Loading map data...')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MapChartRenderer;

