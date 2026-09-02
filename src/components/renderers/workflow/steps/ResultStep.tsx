import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@genispace/shared-ui';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ResultStepConfig } from '../types';
import { toast } from '@genispace/shared-ui';
import { getIconComponent } from '@/lib/utils/icon';
import { useTranslation } from 'react-i18next';

interface ResultStepProps {
  config: ResultStepConfig;
  data: any | null;
  status?: 'idle' | 'success' | 'error';
  icon?: string;
  title: string;
  description: string;
}

export const ResultStep: React.FC<ResultStepProps> = ({
  config,
  data,
  status = 'idle',
  icon = 'Shield',
  title,
  description
}) => {
  const { t } = useTranslation('common');
  const IconComponent = getIconComponent(icon, 5);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderContent = () => {
    if (status === 'error') {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {config.errorMessage || 'An error occurred'}
          </p>
        </div>
      );
    }

    if (status === 'success' && data) {
      return (
        <div className="flex flex-col h-full space-y-4">
          <div className="flex-shrink-0 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">
                {config.successMessage || 'Success'}
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Operation completed successfully.
            </p>
          </div>

          {config.displayFormat === 'json' && (
            <div className="flex flex-col flex-1 min-h-0 space-y-2">
              <h4 className="flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">Result Data:</h4>
              <pre className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg overflow-auto custom-scrollbar text-xs min-h-0 border border-gray-200 dark:border-gray-700">
                {formatValue(data)}
              </pre>
              {config.showCopy && (
                <Button
                  variant="outline"
                  className="flex-shrink-0 w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(formatValue(data));
                    toast({
                      variant: 'default',
                      title: 'Copied',
                      description: 'Data copied to clipboard'
                    });
                  }}
                >
                  Copy Data
                </Button>
              )}
            </div>
          )}

          {config.displayFormat === 'table' && data && Array.isArray(data) && (
            <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {Object.keys(data[0] || {}).map((key) => (
                        <th key={key} className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((row: any, index: number) => (
                      <tr key={index} className="bg-white dark:bg-gray-900">
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {formatValue(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">{t('workflow.complete_previous_steps', 'Please complete previous steps')}</p>
      </div>
    );
  };

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          {IconComponent}
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
