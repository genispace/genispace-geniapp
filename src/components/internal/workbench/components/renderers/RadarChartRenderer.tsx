import React, { useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@genispace/shared-ui';
import { ChartAreaSkeleton, ChartEmptyState } from '../skeleton';
import { Button } from '@genispace/shared-ui';
import { applyCustomStyles } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { useTranslation } from 'react-i18next';
import { BarChart3, Table2 } from 'lucide-react';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { CHART_CATEGORICAL_COLORS } from '@/utils/colors';
import { useBoundRows } from './data/useBoundRows';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { cn } from '@genispace/shared-utils';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';

const DEFAULT_RADAR_COLORS: string[] = [...CHART_CATEGORICAL_COLORS];

export interface RadarChartRendererProps {

  data?: Record<string, unknown>[];
  loading?: boolean;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];

  title?: string;
  height?: number;
  className?: string;

  angleField?: string; 
  radiusField?: string | string[]; 

  colors?: string[];
  fillOpacity?: number;
  strokeWidth?: number;

  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showAngleAxis?: boolean;
  showRadiusAxis?: boolean;

  gridLevels?: number; 
  radiusDomain?: [number, number]; 

  meta?: {
    [key: string]: {
      alias?: string;
      formatter?: (value: unknown) => string;
    };
  };

  id?: string;
  customStyles?: CustomStylesConfig;

  showDataView?: boolean;

  
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig | null;
  pageParams?: Record<string, unknown>;
}

const RadarChartRenderer: React.FC<RadarChartRendererProps> = ({
  data = [],
  loading = false,
  useMockData = false,
  mockData = [],
  title,
  height = 400,
  className,
  angleField = 'subject',
  radiusField = 'value',
  colors = DEFAULT_RADAR_COLORS,
  fillOpacity = 0.6,
  strokeWidth = 2,
  showTooltip = true,
  showLegend = true,
  showGrid = true,
  showAngleAxis = true,
  showRadiusAxis = true,
  gridLevels = 5,
  radiusDomain,
  meta = {},
  id,
  customStyles,
  showDataView = true,
  databaseDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const { localizeRows } = useWorkbenchConfigLocale();
  const isNarrowFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();

  
  const { rows: dbRows, loading: dbLoading } = useBoundRows(
    databaseDataSourceConfig, componentParameterConfig ?? undefined, pageParams, id ?? 'radar-chart', 'radar',
  );
  const rawData = useMockData && mockData.length > 0
    ? mockData
    : (databaseDataSourceConfig?.datasourceId && dbRows.length > 0 ? dbRows : data);
  const chartData = localizeRows(rawData as Record<string, unknown>[]);
  const isLoading = loading || (!!databaseDataSourceConfig?.datasourceId && dbLoading);

  const customStyleProps = id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };

  const [viewType, setViewType] = useState<'chart' | 'data'>('chart');
  const chartColors = colors.length > 0 ? colors : DEFAULT_RADAR_COLORS;

  const getRadiusFields = (): string[] => {
    return Array.isArray(radiusField) ? radiusField : [radiusField];
  };

  const formatTooltipValue = (value: unknown, name: string): [string, string] => {
    const formatter = meta[name]?.formatter;
    return formatter && typeof formatter === 'function' 
      ? [formatter(value), meta[name]?.alias || name] 
      : [String(value), meta[name]?.alias || name];
  };

  const renderDataView = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">{t('chart.no_data', 'No data')}</p>
        </div>
      );
    }

    const radiusFields = getRadiusFields();

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">{angleField}</th>
                {radiusFields.map(field => (
                  <th key={field} className="text-right p-2 font-medium">
                    {meta[field]?.alias || field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-2">{String(item[angleField])}</td>
                  {radiusFields.map(field => (
                    <td key={field} className="text-right p-2">
                      {meta[field]?.formatter && typeof meta[field].formatter === 'function' 
                        ? meta[field].formatter!(item[field]) 
                        : String(item[field])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (viewType === 'data') {
      return renderDataView();
    }

    if (!chartData || chartData.length === 0) {
      return (
        <ChartEmptyState
          height={height}
          chartType="radar"
          title={t('renderers:chart.no_data', 'No data')}
          description={t('renderers:chart.no_data_hint', 'No data for the current selection')}
          className={fillCell ? '!h-full min-h-0 flex-1' : undefined}
        />
      );
    }

    const radiusFields = getRadiusFields();

    return (
      <div className={cn('chart-container', fillCell && 'flex min-h-0 flex-1 flex-col')}>
        <ResponsiveContainer
          width="100%"
          height={fillCell ? '100%' : height}
          className={fillCell ? 'min-h-0 flex-1' : undefined}
        >
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="80%" 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            {showGrid && <PolarGrid />}
            {showAngleAxis && <PolarAngleAxis dataKey={angleField} />}
            {showRadiusAxis && (
              <PolarRadiusAxis 
                tickCount={gridLevels}
                domain={radiusDomain}
              />
            )}
            {showTooltip && <Tooltip formatter={formatTooltipValue} />}
            {showLegend && <Legend className="chart-legend" />}
            {radiusFields.map((field, index) => (
              <Radar
                key={field}
                name={meta[field]?.alias || field}
                dataKey={field}
                stroke={chartColors[index % chartColors.length]}
                fill={chartColors[index % chartColors.length]}
                fillOpacity={fillOpacity}
                strokeWidth={strokeWidth}
                dot={{ r: 6 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (isLoading && chartData.length === 0) {
    return (
      <Card
        className={cn(fillCell && 'flex h-full min-h-0 flex-col', customStyleProps.className)}
        style={{ ...customStyleProps.style, ...(fillCell ? { height: '100%' } : {}) }}
      >
        {title && (
          <CardHeader className="shrink-0">
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn(fillCell && 'flex min-h-0 flex-1 flex-col')}>
          <ChartAreaSkeleton
            height={256}
            chartType="radar"
            className={fillCell ? '!h-full min-h-0 flex-1' : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(fillCell && 'flex h-full min-h-0 flex-col', customStyleProps.className)}
      style={{ ...customStyleProps.style, ...(fillCell ? { height: '100%' } : {}) }}
    >
      {(title || showDataView) && (
        <CardHeader className="shrink-0 pb-3">
          <div className="flex items-center justify-between">
            {title && <CardTitle className={isNarrowFlow ? 'text-lg min-w-0 truncate' : 'text-lg'}>{title}</CardTitle>}
            {showDataView && (
              <div className="flex space-x-2">
                <Button
                  variant={viewType === 'chart' ? 'default' : 'outline'}
                  size={isNarrowFlow ? 'icon' : 'sm'}
                  className={isNarrowFlow ? 'h-8 w-8' : undefined}
                  onClick={() => setViewType('chart')}
                  aria-label={isNarrowFlow ? t('chart.view_chart', 'Chart') : undefined}
                  title={isNarrowFlow ? t('chart.view_chart', 'Chart') : undefined}
                >
                  {isNarrowFlow ? <BarChart3 className="h-4 w-4" /> : t('chart.view_chart', 'Chart')}
                </Button>
                <Button
                  variant={viewType === 'data' ? 'default' : 'outline'}
                  size={isNarrowFlow ? 'icon' : 'sm'}
                  className={isNarrowFlow ? 'h-8 w-8' : undefined}
                  onClick={() => setViewType('data')}
                  aria-label={isNarrowFlow ? t('chart.view_data', 'Data') : undefined}
                  title={isNarrowFlow ? t('chart.view_data', 'Data') : undefined}
                >
                  {isNarrowFlow ? <Table2 className="h-4 w-4" /> : t('chart.view_data', 'Data')}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn('pt-0', fillCell && 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default RadarChartRenderer;
