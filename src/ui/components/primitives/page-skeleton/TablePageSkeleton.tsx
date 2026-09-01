import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';

export interface TablePageSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
}

export function TablePageSkeleton({
  rowCount = 8,
  columnCount = 6,
  showSearch = true,
  showFilters = false,
  className,
}: TablePageSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {showSearch ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" />
          {showFilters ? <Skeleton className="h-10 w-32 rounded-md" /> : null}
        </div>
      ) : null}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b">
                {Array.from({ length: columnCount }).map((_, index) => (
                  <th key={index} className="py-3 px-4 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                    <td key={colIndex} className="py-3 px-4">
                      {colIndex === 0 ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      ) : (
                        <Skeleton className="h-4 w-20" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
