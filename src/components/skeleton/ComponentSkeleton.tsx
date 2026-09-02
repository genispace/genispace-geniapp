import React from 'react';
import { cn } from '@genispace/shared-utils';
import {
  Skeleton,
  StatsRowSkeleton,
  TablePageSkeleton,
  ListSkeleton,
  ChartAreaSkeleton,
  ComponentSkeletonShell,
  type ChartSkeletonType,
} from '@genispace/shared-ui';
import { HeroCardSkeleton } from './HeroCardSkeleton';
import { TileGridSkeleton } from './TileGridSkeleton';

export interface ComponentSkeletonProps {
  
  type?: string;
  
  height?: number;
  className?: string;
}

const CHART_TYPE_BY_COMPONENT: Record<string, ChartSkeletonType> = {
  Chart: 'column',
  EChartsChart: 'column',
  MapChart: 'heatmap',
  RadarChart: 'radar',
};



export function ComponentSkeleton({ type, height, className }: ComponentSkeletonProps) {
  switch (type) {
    case 'Table':
    case 'EditableTable':
    case 'DataGridCard':
      return <TablePageSkeleton showSearch={false} className={className} />;

    case 'List':
      return <ListSkeleton bordered rounded className={className} />;

    case 'StatisticGroup':
      return <StatsRowSkeleton className={className} />;

    case 'TileGrid':
      return (
        <div className={cn('rounded-xl border p-4 shadow-sm', className)}>
          <TileGridSkeleton />
        </div>
      );

    case 'HeroCard':
      return (
        <div
          className={cn(
            'hero-card min-h-[120px] rounded-2xl border bg-card p-5 shadow-sm',
            className
          )}
        >
          <HeroCardSkeleton />
        </div>
      );

    case 'Chart':
    case 'EChartsChart':
    case 'MapChart':
    case 'RadarChart':
      return (
        <div className={cn('rounded-xl border p-4 shadow-sm', className)}>
          <Skeleton className="mb-4 h-5 w-32" />
          <ChartAreaSkeleton
            height={height ?? 240}
            chartType={CHART_TYPE_BY_COMPONENT[type] ?? 'column'}
          />
        </div>
      );

    default:
      return <ComponentSkeletonShell height={height} className={className} />;
  }
}

export default ComponentSkeleton;
