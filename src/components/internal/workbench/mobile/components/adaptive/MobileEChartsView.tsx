import React from 'react';
import EChartsChartRenderer from '@/components/renderers/EChartsChartRenderer';
import type { EChartsChartRendererProps } from '@/components/renderers/EChartsChartRenderer';

export type MobileEChartsViewProps = EChartsChartRendererProps;

/**
 * Mobile wrapper around EChartsChartRenderer.
 * Reuses the full data pipeline (mock / dataset / database datasource) so charts
 * render correctly on mobile; only layout and default height differ from desktop.
 */
export function MobileEChartsView({
  height = 280,
  className,
  showDataView,
  ...props
}: MobileEChartsViewProps) {
  return (
    <div className="mobile-echarts-view w-full min-w-0 overflow-hidden rounded-lg bg-white p-1 dark:bg-neutral-900">
      <EChartsChartRenderer
        {...props}
        height={height}
        className={className}
        showDataView={showDataView}
      />
    </div>
  );
}
