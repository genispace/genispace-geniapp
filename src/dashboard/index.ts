/**
 * @genispace/app-dashboard — shared "mature dashboard" kit:
 * time-range selection with 环比/同比 (period & year-over-year) comparison,
 * KPI stat cards, dimension filters, chart frames and link-to-data helpers.
 * Import only from this barrel in application code.
 */

export {
  useDashboardRange,
  resolvePreset,
  previousRange,
  yearOverYearRange,
  RANGE_PRESETS,
  type RangePreset,
  type DateRange,
  type UseDashboardRangeResult,
} from './src/useDashboardRange';

export {
  finiteNum,
  fmtCount,
  fmtMoney,
  fmtPct,
  computeDelta,
  type Delta,
  type DeltaDirection,
} from './src/format';

export { CHART_COLORS, CHART_GRID_STROKE, CHART_AXIS_TICK, chartColorAt } from './src/chart';
export {
  ChartTooltip,
  type ChartTooltipProps,
  ChartGradients,
  chartGradientRef,
} from './src/ChartTooltip';
export { buildDataLink } from './src/links';

export { KpiStatCard, type KpiStatCardProps, type KpiComparison } from './src/KpiStatCard';
export { StatGrid, type StatGridProps, type StatGridColumns } from './src/StatGrid';
export { TimeRangePicker, type TimeRangePickerProps } from './src/TimeRangePicker';
export {
  FilterBar,
  DimensionSelect,
  type DimensionSelectProps,
  type DimensionOption,
} from './src/FilterBar';
export { ChartFrame, type ChartFrameProps } from './src/ChartFrame';
