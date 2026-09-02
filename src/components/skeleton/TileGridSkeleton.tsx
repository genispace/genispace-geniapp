import React from 'react';
import { cn } from '@genispace/shared-utils';
import { Skeleton } from '@genispace/shared-ui';



export interface TileGridSkeletonProps {
  
  cols?: number;
  
  count?: number;
  
  showTitle?: boolean;
  
  showLegend?: boolean;
  className?: string;
}

export function TileGridSkeleton({
  cols = 4,
  count,
  showTitle = true,
  showLegend = true,
  className,
}: TileGridSkeletonProps) {
  const n = count ?? cols * 2;
  return (
    <div className={cn('space-y-3', className)}>
      {showTitle && <Skeleton className="h-4 w-24" />}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: n }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
      {showLegend && (
        <div className="flex items-center gap-3 pt-0.5">
          <Skeleton className="h-2 w-12 rounded" />
          <Skeleton className="h-2 w-16 rounded" />
          <Skeleton className="h-2 w-10 rounded" />
        </div>
      )}
    </div>
  );
}

export default TileGridSkeleton;
