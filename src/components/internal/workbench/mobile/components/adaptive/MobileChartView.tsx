import React from 'react';
import ChartRenderer from '@/components/renderers/ChartRenderer';

export type MobileChartViewProps = React.ComponentProps<typeof ChartRenderer>;

/**
 * Mobile wrapper around ChartRenderer.
 * Reuses mock / dataset / database data loading so charts render on mobile.
 */
export function MobileChartView({
  height = 280,
  className,
  ...props
}: MobileChartViewProps) {
  return (
    <div className="mobile-chart-view w-full min-w-0 overflow-hidden rounded-lg bg-white p-1 dark:bg-neutral-900">
      <ChartRenderer {...props} height={height} className={className} />
    </div>
  );
}
