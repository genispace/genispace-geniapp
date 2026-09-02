import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@genispace/shared-utils';

interface StatItem {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
}

interface MobileStatCardProps {
  items?: StatItem[];
}

export function MobileStatCard({ items = [] }: MobileStatCardProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mobile-stat-card grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                {item.title}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {item.value}
              </p>
            </div>
            {item.trend !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  item.trend >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {item.trend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(item.trend)}%</span>
              </div>
            )}
          </div>
          {item.trendLabel && (
            <p className="text-xs text-neutral-400 mt-1">{item.trendLabel}</p>
          )}
        </div>
      ))}
    </div>
  );
}
