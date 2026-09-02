import React from 'react';
import { ProposalRendererConfig, TableColumn } from '../types';
import TableRenderer from '@/renderers/table/TableRenderer';
import DataGridCard from '@/renderers/data-grid-card/DataGridCard';
import { SimpleSchemaForm } from '../SimpleSchemaForm';
import type { TableColumnType } from '@/types/renderers';

interface ProposalRendererFactoryProps {
  config: ProposalRendererConfig;
  data: any;
  formData?: Record<string, any>;
  onFormDataChange?: (data: Record<string, any>) => void;
  formErrors?: Record<string, string>;
  customRenderers?: {
    [rendererId: string]: React.ComponentType<any>;
  };
}

const extractTableData = (data: any, dataPath?: string): any[] => {
  if (!data) return [];

  if (dataPath) {
    const paths = dataPath.split('.');
    let result: any = data;
    for (const path of paths) {
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        result = (result as Record<string, any>)[path];
      } else {
        return [];
      }
    }
    return Array.isArray(result) ? result : [];
  }

  return Array.isArray(data) ? data : [];
};

const convertTableColumns = (columns: TableColumn[]): TableColumnType[] => {
  return columns.map(col => {
    const column: TableColumnType = {
      key: col.key,
      dataIndex: col.key,
      title: col.label,
      filterable: false,
      editable: false,
      hidden: false,

      fieldType: col.type === 'currency' || col.type === 'number' ? 'DOUBLE' : 
                 col.type === 'date' ? 'DATE' : 
                 col.type === 'boolean' ? 'BOOL' : 'VARCHAR'
    };

    return column;
  });
};

const convertCardFields = (fields: any[]): Array<{
  key?: string;
  dataIndex: string;
  title: string;
  primary?: boolean;
  secondary?: boolean;
}> => {
  return fields.map(field => ({
    key: field.key,
    dataIndex: field.valuePath || field.key,
    title: field.label,
    primary: field.type === 'text' && !field.format,
    secondary: field.format !== undefined
  }));
};

const extractFieldValue = (data: any, field: any): any => {
  if (field.valuePath) {
    const paths = field.valuePath.split('.');
    let result = data;
    for (const path of paths) {
      if (result && typeof result === 'object') {
        result = result[path];
      } else {
        return null;
      }
    }
    return result;
  }
  return data?.[field.key];
};

export const ProposalRendererFactory: React.FC<ProposalRendererFactoryProps> = ({
  config,
  data,
  formData,
  onFormDataChange,
  formErrors,
  customRenderers
}) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No proposal data available</p>
      </div>
    );
  }

  switch (config.type) {
    case 'table': {
      if (!config.table) {
        return <div className="text-red-500">Table configuration is missing</div>;
      }

      const tableConfig = config.table;

      const tableData = extractTableData(data, tableConfig.dataPath);
      const systemColumns = convertTableColumns(tableConfig.columns);
      const tableDataWithId = tableData.map((row, index) => ({
        ...row,
        id: row.id || `row-${index}`,
      }));

      return (
        <TableRenderer
          columns={systemColumns}
          dataSource={tableDataWithId}
          rowKey="id"
          showTotal={false}
          editable={false}
          addable={false}
          deletable={false}
        />
      );
    }

    case 'form':
      if (!config.form) {
        return <div className="text-red-500">Form configuration is missing</div>;
      }
      if (!formData || !onFormDataChange) {
        return <div className="text-red-500">Form data handlers are missing</div>;
      }
      return (
        <SimpleSchemaForm
          schema={config.form.schema}
          values={formData}
          onChange={onFormDataChange}
          errors={formErrors}
        />
      );

    case 'card': {
      if (!config.card) {
        return <div className="text-red-500">Card configuration is missing</div>;
      }

      const cardConfig = config.card;

      const cardData = Array.isArray(data) ? data : [data];
      const cardColumns = convertCardFields(cardConfig.fields);

      if (Array.isArray(data) && data.length > 0) {

        return (
          <DataGridCard
            columns={cardColumns}
            dataSource={cardData}
            rowKey="id"
            showHeader={true}
          />
        );
      } else {

        return (
          <div className="space-y-3">
            {cardConfig.fields.map((field) => {
              const value = extractFieldValue(data, field);
              const formatValue = (val: any): string => {
                if (val === null || val === undefined) return '-';
                switch (field.format) {
                  case 'currency':
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }).format(Number(val));
                  case 'percentage':
                    return `${Number(val)}%`;
                  case 'date':
                    return new Date(val).toLocaleDateString();
                  case 'number':
                    return Number(val).toLocaleString();
                  default:
                    return String(val);
                }
              };

              return (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{field.label}:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatValue(value)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
    }

    case 'custom':
      if (!config.custom) {
        return <div className="text-red-500">Custom renderer configuration is missing</div>;
      }
      const CustomRenderer = customRenderers?.[config.custom.rendererId];
      if (!CustomRenderer) {
        return (
          <div className="text-red-500">
            Custom renderer "{config.custom.rendererId}" not found
          </div>
        );
      }
      return <CustomRenderer data={data} {...config.custom.props} />;

    default:
      return (
        <div className="text-red-500">
          Unknown renderer type: {config.type}
        </div>
      );
  }
};

