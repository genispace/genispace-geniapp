import React, { useRef } from 'react';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import type { ListColumn } from '@/types/renderers';
import { renderListCellValue, type ListCellRenderContext } from './listCellRender';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useStickyHeaderClone } from '../shared/useStickyHeaderClone';

interface ListDataTableProps {
  columns: ListColumn[];
  data: Record<string, unknown>[];
  allData: Record<string, unknown>[];
  className?: string;
  /** Mobile only: pin the header below the FilterPanel on page scroll. Off by default. */
  freezeFirstColumn?: boolean;
}

function resolveColumnTitle(column: ListColumn): string {
  if (column.title?.trim()) return column.title.trim();
  return column.dataIndex;
}

export const ListDataTable: React.FC<ListDataTableProps> = ({
  columns,
  data,
  allData,
  className,
  freezeFirstColumn = false,
}) => {
  const { t } = useTranslation('renderers');
  // Narrow-container flag (real mobile + studio phone frame), not a viewport check.
  const isMobile = useMobileFlowLayout();
  const overlayRef = useRef<HTMLDivElement>(null);
  const cloneKey = columns.map((c) => c.dataIndex).join(',');
  const stickyHeaderOn = isMobile && freezeFirstColumn && columns.length > 0;
  // Mobile + freezeFirstColumn on: clone the header so it pins on page scroll.
  useStickyHeaderClone({ enabled: stickyHeaderOn, overlayRef, cloneKey });

  if (columns.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t('list.data_view_no_columns', 'No columns configured for data view')}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {stickyHeaderOn && <div ref={overlayRef} aria-hidden />}
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((column) => (
              <th
                key={column.dataIndex}
                className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {resolveColumnTitle(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => {
            const cellContext: ListCellRenderContext = {
              index,
              record,
              pageData: data,
              allData,
            };
            return (
              <tr
                key={String(record.id ?? record.key ?? index)}
                className="border-b border-border last:border-b-0"
              >
                {columns.map((column) => (
                  <td key={column.dataIndex} className="px-4 py-3 align-middle">
                    {renderListCellValue(column, record, cellContext)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};
