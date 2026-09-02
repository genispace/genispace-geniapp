import React from 'react';
import { cn } from '@genispace/shared-utils';
import type { HeroRow } from '../renderers/heroCardUtils';
import { Skeleton } from './WorkbenchSkeletonTokens';

export interface HeroCardSkeletonProps {
  
  rows?: HeroRow[];
  
  onDark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}


function HeroBlock({
  className,
  onDark,
}: {
  className?: string;
  onDark?: boolean;
}) {
  if (onDark) {
    return <div className={cn('rounded bg-white/20 animate-pulse', className)} />;
  }
  return <Skeleton className={cn('rounded', className)} />;
}

function rowSkeleton(row: HeroRow, idx: number, onDark?: boolean): React.ReactNode {
  switch (row.type) {
    case 'text': {
      const h = row.size === 'base' ? 'h-4' : row.size === 'xs' ? 'h-2.5' : 'h-3';
      return <HeroBlock key={idx} className={cn(h, 'w-24')} onDark={onDark} />;
    }
    case 'metric':
      return (
        <div key={idx} className="space-y-1.5">
          {row.label && <HeroBlock className="h-2.5 w-16" onDark={onDark} />}
          <HeroBlock className="h-8 w-36" onDark={onDark} />
        </div>
      );
    case 'trend-badges': {
      const items = row.items?.length ? row.items : [null, null];
      return (
        <div key={idx} className="flex gap-2">
          {items.map((_, j) => (
            <HeroBlock key={j} className="h-6 w-16 rounded-full" onDark={onDark} />
          ))}
        </div>
      );
    }
    case 'key-value':
      return (
        <div key={idx} className="flex items-center justify-between">
          <HeroBlock className="h-3 w-20" onDark={onDark} />
          <HeroBlock className="h-3 w-16" onDark={onDark} />
        </div>
      );
    case 'progress':
      return (
        <HeroBlock key={idx} className="h-1.5 w-full rounded-full" onDark={onDark} />
      );
    case 'kpi-list': {
      const cols = row.columns ?? 1;
      const n = row.items?.length ? row.items.length : 4;
      return (
        <div
          key={idx}
          className={cn('grid gap-2', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}
        >
          {Array.from({ length: n }).map((_, j) => (
            <div key={j} className="flex items-center justify-between">
              <HeroBlock className="h-2.5 w-12" onDark={onDark} />
              <HeroBlock className="h-2.5 w-16" onDark={onDark} />
            </div>
          ))}
        </div>
      );
    }
    default:
      return <HeroBlock key={idx} className="h-4 w-24" onDark={onDark} />;
  }
}



export function HeroCardSkeleton({
  rows,
  onDark,
  className,
  style,
}: HeroCardSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} style={style} aria-busy="true">
      {rows && rows.length > 0 ? (
        rows.map((row, i) => rowSkeleton(row, i, onDark))
      ) : (
        <>
          <HeroBlock className="h-4 w-24" onDark={onDark} />
          <HeroBlock className="h-8 w-40" onDark={onDark} />
          <HeroBlock className="h-1.5 w-full rounded-full" onDark={onDark} />
        </>
      )}
    </div>
  );
}

export default HeroCardSkeleton;
