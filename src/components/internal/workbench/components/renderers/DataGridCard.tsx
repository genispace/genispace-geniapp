import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { Button } from '@genispace/shared-ui';
import { Badge } from '@genispace/shared-ui';
import { Search, RefreshCw, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '../skeleton';
import { cn } from '@genispace/shared-utils';
import { applyCustomStyles } from '@/utils/styleUtils';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { CustomStylesConfig } from '../../types/components';
import { useTranslation } from 'react-i18next';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';

interface DataGridCardProps {
  title?: string;
  columns: Array<{
    key?: string;
    dataIndex: string;
    title: string;
    render?: {
      type: string;
      props?: {
        color?: Record<string, string>;
        text?: Record<string, string>;
      };
    };
    primary?: boolean; 
    secondary?: boolean; 
  }>;
  dataSource: any[];
  loading?: boolean;
  rowKey?: string;
  className?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showRefresh?: boolean;
  showHeader?: boolean;
  onItemClick?: (record: any) => void;
  pagination?: {
    pageSize?: number;
    current?: number;
    total?: number;
    showSizeChanger?: boolean;
    showTotal?: boolean;
  };
  footerContent?: React.ReactNode;
  useMockData?: boolean;
  mockData?: any[];
  /** When set, loads rows via POST /datasources/:id/data (same contract as TableRenderer). */
  databaseDataSourceConfig?: DatabaseDataSourceConfig;

  id?: string;
  customStyles?: CustomStylesConfig;
}

const DataGridCard: React.FC<DataGridCardProps> = ({
  title,
  columns,
  dataSource,
  loading = false,
  rowKey = 'id',
  className = '',
  showSearch = false,
  searchPlaceholder,
  showRefresh = false,
  showHeader = true,
  onItemClick,
  pagination,
  footerContent,
  useMockData = false,
  mockData = [],
  databaseDataSourceConfig,
  id,
  customStyles,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const fillCell = useGrid24FillCell();
  // Narrow container (real mobile + studio phone frame) — viewport variants would miss the frame.
  const narrow = useMobileFlowLayout();
  const defaultSearchPlaceholder = searchPlaceholder || t('data_grid.search', 'Search...');

  const [dbRows, setDbRows] = useState<any[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  const fetchFromDatabase = useCallback(async () => {
    const dsId = databaseDataSourceConfig?.datasourceId;
    if (!dsId) return;
    setDbLoading(true);
    try {
      const pageSize = pagination?.pageSize || 6;
      const limit = Math.min(500, Math.max(pageSize * 20, 50));
      const res = await apiClient.post(
        withDatasourceVersion(
          `/datasources/${dsId}/data`,
          resolveRuntimeDatasourceVersion(dsId, databaseDataSourceConfig?.version)
        ),
        {
        page: 1,
        limit,
      });
      if (res.success && res.data) {
        const payload = res.data as { data?: unknown };
        const rows = Array.isArray(payload.data) ? payload.data : [];
        setDbRows(rows);
      } else {
        setDbRows([]);
      }
    } catch (e) {
      console.error('[DataGridCard] database datasource fetch failed:', e);
      setDbRows([]);
    } finally {
      setDbLoading(false);
    }
  }, [databaseDataSourceConfig?.datasourceId, databaseDataSourceConfig?.version, pagination?.pageSize]);

  useEffect(() => {
    if (databaseDataSourceConfig?.datasourceId) {
      void fetchFromDatabase();
    } else {
      setDbRows(null);
    }
  }, [databaseDataSourceConfig?.datasourceId, fetchFromDatabase]);

  const finalData = useMemo(() => {
    if (databaseDataSourceConfig?.datasourceId && dbRows !== null) {
      return dbRows;
    }
    const safeDataSource = Array.isArray(dataSource) ? dataSource : [];
    const safeMockData = Array.isArray(mockData) ? mockData : [];
    return useMockData && safeMockData.length > 0 ? safeMockData : safeDataSource;
  }, [
    databaseDataSourceConfig?.datasourceId,
    dbRows,
    dataSource,
    mockData,
    useMockData,
  ]);

  const customStyleProps = useMemo(() => {
    return id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };
  }, [id, customStyles, className]);

  const validColumns = useMemo(() => {
    return Array.isArray(columns) ? columns.filter(col => col.dataIndex && col.title) : [];
  }, [columns]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(() => finalData);
  const [currentPage, setCurrentPage] = useState(pagination?.current || 1);

  const pageSize = pagination?.pageSize || 10;

  // `pagination.current` is supplied by the parent when it needs to restore or change the
  // visible page (for example after returning to a cached workbench tab). Keep the local pager
  // in sync with later prop changes instead of using it only as a mount-time default.
  useEffect(() => {
    if (pagination?.current && pagination.current > 0) {
      setCurrentPage(pagination.current);
    }
  }, [pagination?.current]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(finalData);
      return;
    }

    const filtered = finalData.filter(record => {
      return validColumns.some(column => {
        const value = record[column.dataIndex];
        return value && 
          value.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
    });

    setFilteredData(filtered);
    setCurrentPage(1); 
  }, [searchTerm, finalData, validColumns]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleRefresh = () => {
    if (databaseDataSourceConfig?.datasourceId) {
      void fetchFromDatabase();
    }
  };

  const showLoading =
    loading || (Boolean(databaseDataSourceConfig?.datasourceId) && dbLoading && dbRows === null);

  const getCurrentPageData = () => {
    if (!pagination) return filteredData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPaginationItems = () => {
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const items: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      items.push(1);

      if (currentPage > 4) {
        items.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (currentPage < totalPages - 3) {
        items.push('ellipsis');
      }

      items.push(totalPages);
    }

    return items;
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const renderTag = (value: any, color?: string) => {
    let bgColor = 'bg-neutral-100 dark:bg-neutral-800';
    let textColor = 'text-neutral-800 dark:text-neutral-200';

    switch (color) {
      case 'green':
        bgColor = 'bg-green-100 dark:bg-green-900';
        textColor = 'text-green-800 dark:text-green-200';
        break;
      case 'blue':
        bgColor = 'bg-primary/15 dark:bg-primary/20';
        textColor = 'text-primary dark:text-primary';
        break;
      case 'orange':
        bgColor = 'bg-orange-100 dark:bg-orange-900';
        textColor = 'text-orange-800 dark:text-orange-200';
        break;
      case 'red':
        bgColor = 'bg-red-100 dark:bg-red-900';
        textColor = 'text-red-800 dark:text-red-200';
        break;
      case 'gold':
        bgColor = 'bg-yellow-100 dark:bg-yellow-900';
        textColor = 'text-yellow-800 dark:text-yellow-200';
        break;
    }

    return (
      <Badge variant="outline" className={`tag-badge ${bgColor} ${textColor} border-none`}>
        {value}
      </Badge>
    );
  };

  const renderProgress = (value: number) => {
    let barColor = 'bg-red-500';
    if (value >= 90) barColor = 'bg-green-500';
    else if (value >= 70) barColor = 'bg-blue-500';

    return (
      <div className="progress-container flex items-center w-full">
        <div className="progress-track w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mr-2">
          <div 
            className={`progress-bar h-2 rounded-full ${barColor}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="progress-text text-xs">{value}%</span>
      </div>
    );
  };

  const renderFieldValue = (record: any, column: any) => {
    const value = record[column.dataIndex];

    if (column.render && typeof column.render === 'object') {
      if (column.render.type === 'Tag') {
        const color = column.render.props?.color?.[value] || '';
        const text = column.render.props?.text?.[value] || value;
        return renderTag(text, color);
      } else if (column.render.type === 'Progress') {
        return renderProgress(value);
      }
    }

    return value;
  };

  return (
    <Card className={cn("datagrid-card border shadow-sm", fillCell && "h-full flex flex-col min-h-0", customStyleProps.className)} style={customStyleProps.style}>
      {showHeader && (
        <CardHeader className={cn("datagrid-header pb-2", fillCell && "shrink-0")}>
          <div className={cn("datagrid-header-layout flex items-center justify-between", narrow && "flex-wrap gap-2")}>
            {title && <CardTitle className={cn("datagrid-title text-lg", narrow && "min-w-0 truncate")}>{title}</CardTitle>}

            <div className="datagrid-toolbar flex items-center space-x-2">
              {showSearch && (
                <div className="search-container relative">
                  <Search className="search-icon absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    className={cn("search-input pl-8 w-48 h-8", narrow && "max-w-full")}
                    placeholder={defaultSearchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              )}

              {showRefresh && (
                <Button variant="outline" size="icon" className="refresh-button h-8 w-8" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className={cn("datagrid-content p-4 pt-0", fillCell && "flex-1 min-h-0 flex flex-col")}>
        {showLoading ? (
          <div className="grid-items space-y-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid-item space-y-2 rounded-md border p-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state text-center py-6 text-neutral-400">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">{t('data_grid.no_data', 'No data')}</p>
            <p className="text-xs mt-1">{t('data_grid.no_matching_records', 'No matching records found')}</p>
          </div>
        ) : (
          <div className={cn("grid-items space-y-3", fillCell && "flex-1 min-h-0 overflow-y-auto")}>
            {getCurrentPageData().map((record, index) => (
              <div 
                key={record[rowKey] || index}
                className={cn(
                  "grid-item p-3 border rounded-md",
                  onItemClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800' : ''
                )}
                onClick={() => onItemClick && onItemClick(record)}
              >
                <div className="grid-item-layout flex justify-between items-start">
                  <div className="grid-item-content space-y-2 w-full">
                    {validColumns.map((column) => (
                      column.primary ? (
                        <div key={column.key || column.dataIndex} className="grid-item-primary font-medium text-base">
                          {renderFieldValue(record, column)}
                        </div>
                      ) : column.secondary ? (
                        <div key={column.key || column.dataIndex} className="grid-item-secondary text-sm text-neutral-600 dark:text-neutral-300">
                          {renderFieldValue(record, column)}
                        </div>
                      ) : (
                        <div key={column.key || column.dataIndex} className="grid-item-field flex justify-between items-center text-sm text-neutral-500 dark:text-neutral-400">
                          <span className={cn("field-label", narrow && "shrink-0")}>{column.title}:</span>
                          <span className={cn("field-value", narrow && "min-w-0 break-words text-right")}>{renderFieldValue(record, column)}</span>
                        </div>
                      )
                    ))}
                  </div>

                  {onItemClick && (
                    <div className="grid-item-action flex items-center ml-2 text-neutral-400">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && filteredData.length > 0 && (
          <div
            className={cn(
              "pagination-container",
              // Narrow: stack total text above the pager instead of one justify-between row.
              narrow ? "mt-4 flex flex-col gap-2" : "mt-4 flex items-center justify-between",
              fillCell && "shrink-0"
            )}
          >
            {pagination.showTotal && (
              <div className="pagination-info text-sm text-neutral-500 dark:text-neutral-400">
                {t('data_grid.total_records', 'Total {{count}} records', { count: filteredData.length })}
              </div>
            )}

            <Pagination className="pagination-nav justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    href="#"
                  />
                </PaginationItem>

                {getPaginationItems().map((item, i) => (
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink 
                        href="#" 
                        isActive={currentPage === item}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(item as number);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                ))}

                <PaginationItem>
                  <PaginationNext 
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    href="#"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>

      {footerContent && (
        <CardFooter className="datagrid-footer p-4 pt-0">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
};

export default DataGridCard;
