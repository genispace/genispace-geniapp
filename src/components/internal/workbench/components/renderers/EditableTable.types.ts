import type { ColumnConfig } from '@/types/datasource';

export type CellEditorType = 'text' | 'number' | 'color' | 'date' | 'select' | 'switch' | 'file';

export type EditableTableColumnConfig = ColumnConfig;

export interface EditableTableProps {
  id?: string;
  type: 'EditableTable';
  title?: string;
  columns: EditableTableColumnConfig[];
  rowKey?: string;
  pagination?: {
    pageSize?: number;
    current?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: boolean;
  };
  dataSource?: {
    datasetId?: string;
    databaseDataSourceConfig?: any;
  };
  useMockData?: boolean;
  showToolbar?: boolean;
  showRefresh?: boolean;
  enableExport?: boolean;
  onUpdateSuccess?: () => void;
}