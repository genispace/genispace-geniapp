import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { toast, Z_INDEX_CLASSES, ScrollArea, Button, MODAL_DIMENSIONS } from '@genispace/shared-ui';
import { FormField, FormConfig } from '../../types';
import { FormAction } from '../../types';
import {
  collectFormFieldKeysFromFormActionVisibility,
  evaluateFormActionVisibility,
  hasFormActionParameterVisibilityClauses,
  normalizeFormActionVisibilityClauses,
  stableSerializePageParams,
} from '@/utils/formActionVisibility';
import { queryDatasetData } from '@/app/services/workbenchApi';
import { useParameterHandler, buildDataSourceFilters, buildFilterString as buildParameterFilterString, mergeFilterStrings } from '../../hooks/useParameterHandler';
import { ParameterConfig } from '../../types';
import { useDatabaseDataSource } from '../../hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '../../types/databaseDataSource';
import { ParameterRecord } from '../../types/parameters';
import type { CustomStylesConfig } from '../../types/components';
import type { EnhancedDataSource } from '../../types/datasource';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/ui/dialog';
import { renderLucideIcon } from '@/utils/iconUtils';
import { evaluateComputedExpression } from '@/utils/expressionUtils';
import {
  resolveComponentMockRecord,
  resolveUseMockData,
} from '@/utils/resolveComponentMockFields';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getSystemParameterValue } from '@/utils/systemParameters';
import { extractStrictWaitParameterKeysFromDatasourceParameters } from '@/utils/databaseDatasourceParams';
import { baseApiClient } from '@/lib/api/baseApiClient';
import TaskInputRenderer, { type TaskInputRendererHandle } from '@/renderers/task-input/TaskInputRenderer';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { useTranslation } from 'react-i18next';
import { resolveFormContainerStyle } from './formSizing';
import { 
  getTaskSchema, 
  checkTaskParamsFilled,
  formatTaskParamsForAPI,
  executeTask
} from '@/utils/taskUtils';

function getFormStructureSignature(config: FormConfig | undefined): string {
  if (!config) return '';
  return JSON.stringify({
    title: config.title,
    description: config.description,
    mode: config.mode,
    layout: config.layout,
    fields: config.fields,
    actions: config.actions,
    displayConfig: config.displayConfig,
    layoutConfig: config.layoutConfig,
    height: config.height,
    heightMode: config.heightMode,
  });
}

const globalFormRegistry = new Map<string, {
  formId: string;
  title?: string;
  mode?: string;
  fieldsCount: number;
  containerRef: React.RefObject<HTMLDivElement>;
  formDataRef: React.MutableRefObject<Record<string, any>>;
  initialConfigRef: React.RefObject<any>;
}>();

const EMPTY_MOCK_DATA: Record<string, any> = {};

interface FormRendererProps {
  config: any;
  id?: string;

  parameterConfig?: ParameterConfig;
  pageParams?: ParameterRecord;
  dataSource?: any;
  datasetConfig?: { datasetId: string; params?: Record<string, any> }; 
  databaseDataSourceConfig?: DatabaseDataSourceConfig; 
  enhancedDataSource?: EnhancedDataSource; 
  useMockData?: boolean;
  mockData?: Record<string, any>;

  onParameterChange?: (key: string, value: any) => void;
  componentId?: string;
  pageId?: string;
  tabId?: string;

  className?: string;
  customStyles?: CustomStylesConfig;
}

const FormRenderer: React.FC<FormRendererProps> = ({
  config,
  id,
  parameterConfig,
  pageParams = {},
  dataSource,
  datasetConfig, 
  databaseDataSourceConfig, 
  enhancedDataSource: _enhancedDataSource, 
  useMockData = false,
  mockData = EMPTY_MOCK_DATA,

  onParameterChange,
  componentId,
  pageId,
  tabId
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const isNarrowFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();
  const lastNarrowFlowRef = useRef(isNarrowFlow);
  // User-typed values captured across a narrow-flow flip rebuild (see the
  // render effect); consumed once as the highest-priority value seed.
  const preservedValuesRef = useRef<Record<string, any> | null>(null);

  const mockSource = useMemo(
    () => ({ useMockData, mockData }),
    [useMockData, mockData]
  );
  const mockEnabled = useMemo(() => resolveUseMockData(mockSource), [mockSource]);
  const mockRecord = useMemo(
    () => resolveComponentMockRecord(mockSource) as Record<string, any>,
    [mockSource]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const formDataRef = useRef<Record<string, any>>({});
  const isInitializedRef = useRef(false);
  const initialConfigRef = useRef<any>(null);

  const [formTopOffset, setFormTopOffset] = useState<number>(0);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useCurrentUser();

  const [dataIsLoading, setDataIsLoading] = useState(false); 
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, boolean>>({}); 
  const [loadedData, setLoadedData] = useState<Record<string, any>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isLoadingRef = useRef(false);
  const lastLoadParamsRef = useRef<string>('');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: FormAction | null;
    onConfirm: (() => void) | null;
    actionType?: 'delete' | 'insert' | 'update' | 'custom';
  }>({
    isOpen: false,
    action: null,
    onConfirm: null,
    actionType: 'custom'
  });

  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    details?: string[];
    actionType: 'error-general' | 'error-url' | 'error-file' | 'error-field';
  }>({
    isOpen: false,
    title: undefined,
    message: undefined,
    details: [],
    actionType: 'error-general'
  });

  const [taskParamsDialog, setTaskParamsDialog] = useState<{
    isOpen: boolean;
    taskId: string;
    initialParams?: Record<string, unknown>;
    action?: FormAction;
  }>({
    isOpen: false,
    taskId: '',
    initialParams: undefined,
    action: undefined
  });

  const taskParamsInputRef = useRef<TaskInputRendererHandle>(null);
  const [isFormTaskExecuting, setIsFormTaskExecuting] = useState(false);
  const executeOperationRef = useRef<(action: FormAction) => Promise<void>>();

  const showErrorDialog = (
    title: string,
    message: string,
    details: string[] = [],
    errorType: 'general' | 'url' | 'file' | 'field' = 'general'
  ) => {
    const actionTypeMap = {
      'general': 'error-general' as const,
      'url': 'error-url' as const,
      'file': 'error-file' as const,
      'field': 'error-field' as const
    };

    setErrorDialog({
      isOpen: true,
      title,
      message,
      details,
      actionType: actionTypeMap[errorType]
    });
  };

  const setButtonLoading = (actionId: string, loading: boolean) => {
    setButtonLoadingStates(prev => ({
      ...prev,
      [actionId]: loading
    }));
  };

  const isButtonLoading = (actionId: string) => {
    return buttonLoadingStates[actionId] || false;
  };

  const isAnyButtonLoading = () => {
    return Object.values(buttonLoadingStates).some(loading => loading);
  };

  const componentParameterConfig = React.useMemo(() => {
    if (!parameterConfig) {
      return {
        enableParameterReceiving: true,
        listenToParameters: ['selected_candidate_id'],
        autoRefreshOnParameterChange: false,
        refreshDebounceTime: 300
      };
    }

    const configListenParams = parameterConfig?.listenToParameters || [];
    const listenToParameters = (() => {
      const params = [...configListenParams];
      if (!params.includes('selected_candidate_id')) {
        params.push('selected_candidate_id');
      }
      return params;
    })();

    const config = {
      enableParameterReceiving: parameterConfig?.enableParameterReceiving ?? true,
      listenToParameters: listenToParameters,
      autoRefreshOnParameterChange: false, 
      refreshDebounceTime: (parameterConfig as any)?.refreshDebounceTime || 300
    };
    return config;
  }, [parameterConfig, id]); 

  const {
    rawParams, 
    broadcastParameter
  } = useParameterHandler({
    parameterConfig,
    pageParams,
    componentId: id || 'form',

    componentParameterConfig: componentParameterConfig

  });

  const [actionVisibilityTick, setActionVisibilityTick] = useState(0);
  const actionVisibilityFormDepsRef = useRef<Set<string>>(new Set());
  actionVisibilityFormDepsRef.current = collectFormFieldKeysFromFormActionVisibility(
    config?.actions as FormAction[] | undefined
  );

  const pageParamsVisibilitySignature = useMemo(
    () => stableSerializePageParams(pageParams as Record<string, unknown>),
    [pageParams]
  );

  const actionVisibilityUsesPageParams = useMemo(
    () => hasFormActionParameterVisibilityClauses(config?.actions as FormAction[] | undefined),
    [config?.actions]
  );

  useEffect(() => {
    if (!actionVisibilityUsesPageParams) return;
    setActionVisibilityTick((t) => t + 1);
  }, [pageParamsVisibilitySignature, actionVisibilityUsesPageParams]);

  const resolvedDatabaseDataSourceConfig = useMemo(() => {
    if (!databaseDataSourceConfig) return null;

    if (!databaseDataSourceConfig.parameters || Object.keys(databaseDataSourceConfig.parameters).length === 0) {
      return databaseDataSourceConfig;
    }

    const resolvedParameters: Record<string, any> = {};

    Object.entries(databaseDataSourceConfig.parameters).forEach(([key, value]) => {

      if (value && typeof value === 'object' && (value as any).type === 'parameter') {
        const paramConfig = value as { type: 'parameter'; source: string; value?: any };
        const paramName = paramConfig.source;

        let actualValue = pageParams[paramName];

        // Multi-select params are real arrays — keep them as-is; the API expands
        // them into the SQL IN list (JSON.stringify would send the string '[]').
        if (Array.isArray(actualValue)) {
          // pass through
        } else if (actualValue && typeof actualValue === 'object') {

          if ('id' in actualValue) {
            actualValue = actualValue.id;
          } else if ('value' in actualValue) {
            actualValue = actualValue.value;
          } else {

            console.warn(
              `[FormRenderer] Parameter "${paramName}" is an object without id or value; serializing as JSON.`,
              actualValue
            );
            actualValue = JSON.stringify(actualValue);
          }
        }

        resolvedParameters[key] = actualValue !== undefined && actualValue !== null ? actualValue : paramConfig.value;
      } else if (value && typeof value === 'object' && (value as any).type === 'system') {

        const systemParamConfig = value as { type: 'system'; systemParam: string; value?: any };
        const systemValue = getSystemParameterValue(
          systemParamConfig.systemParam as any
        );

        resolvedParameters[key] = systemValue || systemParamConfig.value || '';
      } else {

        resolvedParameters[key] = value;
      }
    });

    return {
      ...databaseDataSourceConfig,
      parameters: resolvedParameters
    };
  }, [databaseDataSourceConfig, pageParams]);

  // waitForValue: bindings marked waitForValue:true must have resolved into the request body
  // before the first fetch (gate == payload; this renderer resolves params from pageParams).
  // autoFetch is reactive to this flag, so the fetch fires once the values land.
  const strictWaitKeys = useMemo(
    () => extractStrictWaitParameterKeysFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );
  const strictParamsSatisfied = useMemo(() => {
    const resolvedP = (resolvedDatabaseDataSourceConfig?.parameters || {}) as Record<string, unknown>;
    return strictWaitKeys.every(k => resolvedP[k] !== undefined && resolvedP[k] !== null);
  }, [strictWaitKeys, resolvedDatabaseDataSourceConfig]);

  const {
    data: databaseData,
    loading: databaseLoading,
    error: databaseError,
    refetch: _refetchDatabaseData
  } = useDatabaseDataSource(
    resolvedDatabaseDataSourceConfig || null,
    'Form',

    rawParams,
    {
      autoFetch: !mockEnabled && strictParamsSatisfied,
      errorConfig: {
        showToast: true,
        retryAttempts: 2,
        retryDelay: 1000
      }
    }
  );

  useEffect(() => {
    if (mockEnabled) {
      setLoadedData(Object.keys(mockRecord).length > 0 ? mockRecord : {});
      return;
    }

    if (!databaseDataSourceConfig?.datasourceId) {
      return;
    }

    if (databaseLoading) {
      return;
    }

    if (databaseError) {
      console.warn('[FormRenderer] Database data source error; skipping form fill:', databaseError);
      setLoadedData({});
      return;
    }

    if (Array.isArray(databaseData) && databaseData.length > 0) {
      const firstRecord = databaseData[0];
      setLoadedData(firstRecord);
    } else {

      setLoadedData({ __noData: true } as any);
    }
  }, [
    mockEnabled,
    mockRecord,
    databaseDataSourceConfig?.datasourceId,
    databaseData,
    databaseLoading,
    databaseError,
  ]);

  const lastParamsRef = useRef<string>('');

  React.useEffect(() => {

    const generateParamsHash = (raw: any, page: any) => {

      const rawKeys = Object.keys(raw || {}).sort();
      const pageKeys = Object.keys(page || {}).sort();
      return rawKeys.map(k => `${k}:${raw[k]}`).join('|') + '||' +
        pageKeys.map(k => `${k}:${page[k]}`).join('|');
    };

    const currentParamsHash = generateParamsHash(rawParams, pageParams);

    if (lastParamsRef.current === currentParamsHash) {
      return;
    }

    lastParamsRef.current = currentParamsHash;

    const isValidParameterValue = (value: any): boolean => {

      if (value === null || value === 'null') return false;

      return value !== undefined && value !== 'undefined';
    };

    const hasValidParameters = (): boolean => {

      if (!parameterConfig?.enableParameterReceiving) {
        return true;
      }

      const allParamNames = [...Object.keys(rawParams || {}), ...Object.keys(pageParams || {})];

      if (allParamNames.length === 0) {
        return true;
      }

      const hasAnyValidParam = allParamNames.some(paramName =>
        isValidParameterValue(rawParams?.[paramName]) || isValidParameterValue(pageParams?.[paramName])
      );

      return hasAnyValidParam;
    };

    const parametersValid = hasValidParameters();

    if (parametersValid) {
      debouncedHandleDataRefresh(); 
    } 
  }, [rawParams, pageParams, id, parameterConfig?.enableParameterReceiving]); 

  const debouncedHandleDataRefresh = React.useCallback(() => {
    const timeoutKey = `formRenderer-${id}-debounce`;

    if ((window as any)[timeoutKey]) {
      clearTimeout((window as any)[timeoutKey]);
    }

    (window as any)[timeoutKey] = setTimeout(() => {

      setRefreshTrigger(prev => {
        const newValue = prev + 1;
        return newValue;
      });

      delete (window as any)[timeoutKey];
    }, 150); 
  }, [id]); 

  const broadcastFormSuccess = useCallback((actionType: string, formData: Record<string, any>, actionConfig?: any) => {

    if (parameterConfig?.enableCommunication === false) {
      return;
    }

    try {
      const currentComponentId = componentId || id || 'form';
      const timestamp = Date.now();

      if (onParameterChange) {
        onParameterChange('tableRefreshTrigger', timestamp);
      }
      if (broadcastParameter) {
        broadcastParameter('tableRefreshTrigger', timestamp);
      }

      const formResult = {
        formId: currentComponentId,
        actionType,
        formData,
        timestamp,
        componentId: currentComponentId,
        pageId,
        tabId,
        config: actionConfig
      };

      if (onParameterChange) {
        onParameterChange('lastFormResult', formResult);
      }
      if (broadcastParameter) {
        broadcastParameter('lastFormResult', formResult);
      }

      const dataChangeNotification = {
        changeType: actionType,
        source: 'form',
        sourceId: currentComponentId,
        timestamp,
        affectedDataset: actionConfig?.targetDatasetId,
        changeData: formData
      };

      if (onParameterChange) {
        onParameterChange('dataChangeNotification', dataChangeNotification);
      }
      if (broadcastParameter) {
        broadcastParameter('dataChangeNotification', dataChangeNotification);
      }

      const formTitle = config?.title;
      if (formTitle) {
        const specificFormKey = `form_${formTitle.replace(/\s+/g, '_').toLowerCase()}_submitted`;
        const specificFormData = {
          formTitle,
          formId: currentComponentId,
          actionType,
          timestamp,
          formData
        };

        if (onParameterChange) {
          onParameterChange(specificFormKey, specificFormData);
        }
        if (broadcastParameter) {
          broadcastParameter(specificFormKey, specificFormData);
        }
      }

    } catch (error) {
      console.error('[FormRenderer] Parameter broadcast failed:', error);
    }
  }, [parameterConfig, onParameterChange, broadcastParameter, componentId, id, pageId, tabId, config?.title]);

  const jsonToTableHtml = (jsonValue: any): string => {
    if (!jsonValue) return `<div class="text-neutral-400 dark:text-neutral-500">${t('form.no_data', 'No Data')}</div>`;

    try {
      let obj = jsonValue;
      if (typeof jsonValue === 'string') {
        obj = JSON.parse(jsonValue);
      }

      if (obj === null || obj === undefined) {
        return `<div class="text-neutral-400 dark:text-neutral-500">${t('form.no_data', 'No Data')}</div>`;
      }

      if (typeof obj !== 'object') {
        return `<div class="text-sm">${String(obj)}</div>`;
      }

      if (Array.isArray(obj)) {
        if (obj.length === 0) {
          return `<div class="text-neutral-400 dark:text-neutral-500">${t('form.empty_array', 'Empty Array')}</div>`;
        }

        const firstItem = obj[0];
        if (typeof firstItem === 'object' && firstItem !== null) {

          const allKeys = new Set<string>();
          obj.forEach(item => {
            if (typeof item === 'object' && item !== null) {
              Object.keys(item).forEach(key => allKeys.add(key));
            }
          });

          const columns = Array.from(allKeys);

          const headerRow = `
            <tr class="bg-neutral-100 dark:bg-neutral-700">
              ${columns.map(col => `<th class="py-2 px-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300 min-w-[100px] max-w-[200px] break-words">${col}</th>`).join('')}
            </tr>
          `;

          const dataRows = obj.map((item) => {
            if (typeof item !== 'object' || item === null) {
              return `<tr class="border-b border-neutral-100 dark:border-neutral-700"><td colspan="${columns.length}" class="py-2 px-3 text-sm text-neutral-900 dark:text-neutral-100">${String(item)}</td></tr>`;
            }

            const cells = columns.map(col => {
              const value = item[col];
              let formattedValue = '';

              if (value === null || value === undefined) {
                formattedValue = '<span class="text-neutral-400 dark:text-neutral-500">-</span>';
              } else if (typeof value === 'object') {

                formattedValue = `<span class="text-xs text-neutral-600 dark:text-neutral-400">[${t('form.object', 'Object')}]</span>`;
              } else if (typeof value === 'boolean') {
                formattedValue = value ? `<span class="text-green-600">${t('form.yes', 'Yes')}</span>` : `<span class="text-red-600">${t('form.no', 'No')}</span>`;
              } else {
                formattedValue = String(value);
              }

              return `<td class="py-2 px-3 text-sm text-neutral-900 dark:text-neutral-100 min-w-[100px] max-w-[200px] break-words">${formattedValue}</td>`;
            }).join('');

            return `<tr class="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">${cells}</tr>`;
          }).join('');

          return `
            <div class="w-full overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
              <table class="min-w-full border border-neutral-200 dark:border-neutral-600 rounded-md overflow-hidden table-auto">
                <thead class="sticky top-0 bg-neutral-100 dark:bg-neutral-700">
                  ${headerRow}
                </thead>
                <tbody>
                  ${dataRows}
                </tbody>
              </table>
            </div>
          `;
        } else {

          const listItems = obj.map((item, index) =>
            `<div class="py-1 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
              <span class="text-xs text-neutral-500 mr-2">${index + 1}.</span>
              <span class="text-sm">${String(item)}</span>
            </div>`
          ).join('');

          return `<div class="w-full overflow-x-auto border border-neutral-200 dark:border-neutral-600 rounded-md p-2 max-h-[300px] overflow-y-auto custom-scrollbar">${listItems}</div>`;
        }
      }

      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return `<div class="text-neutral-400 dark:text-neutral-500">${t('form.empty_object', 'Empty Object')}</div>`;
      }

      const tableRows = entries.map(([key, value]) => {
        let formattedValue = '';
        if (value === null || value === undefined) {
          formattedValue = '<span class="text-neutral-400 dark:text-neutral-500">null</span>';
        } else if (typeof value === 'object') {
          formattedValue = jsonToTableHtml(value);
        } else if (typeof value === 'boolean') {
          formattedValue = value ? `<span class="text-green-600">${t('form.yes', 'Yes')}</span>` : `<span class="text-red-600">${t('form.no', 'No')}</span>`;
        } else {
          formattedValue = String(value);
        }

        return `
          <tr class="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
            <td class="py-2 px-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700 min-w-[120px] max-w-[150px] break-words">${key}</td>
            <td class="py-2 px-3 text-sm text-neutral-900 dark:text-neutral-100 break-words max-w-[300px]">${formattedValue}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="w-full overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table class="min-w-full border border-neutral-200 dark:border-neutral-600 rounded-md overflow-hidden table-auto">
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      return `<div class="text-red-500 text-sm">${t('form.json_format_error', 'JSON Format Error')}: ${error instanceof Error ? error.message : t('form.unknown_error', 'Unknown error')}</div>`;
    }
  };

  const addFieldErrorStyle = (fieldName: string, fieldType: string) => {
    const container = containerRef.current;
    if (!container) return;

    removeFieldErrorStyle(fieldName, fieldType);

    let targetElement: HTMLElement | null = null;

    switch (fieldType) {
      case 'checkbox':
        targetElement = container.querySelector(`input[type="checkbox"][id="${fieldName}"]`);
        break;
      case 'select':
        targetElement = container.querySelector(`select[data-field="${fieldName}"]`);
        break;
      case 'textarea':
        targetElement = container.querySelector(`textarea[data-field="${fieldName}"]`);
        break;
      case 'json':

        targetElement = container.querySelector(`div[data-field="${fieldName}"][data-display-mode="true"]`);
        if (!targetElement) {

          targetElement = container.querySelector(`textarea[data-field="${fieldName}"]`);
        }
        break;
      default:
        targetElement = container.querySelector(`input[data-field="${fieldName}"]`);
        break;
    }

    if (targetElement) {

      targetElement.classList.add('border-red-500', 'border-2', 'ring-red-500', 'ring-1');

      targetElement.classList.remove('border-neutral-300', 'border-primary');

    }
  };

  const removeFieldErrorStyle = (fieldName: string, fieldType: string) => {
    const container = containerRef.current;
    if (!container) return;

    let targetElement: HTMLElement | null = null;

    switch (fieldType) {
      case 'checkbox':
        targetElement = container.querySelector(`input[type="checkbox"][id="${fieldName}"]`);
        break;
      case 'select':
        targetElement = container.querySelector(`select[data-field="${fieldName}"]`);
        break;
      case 'textarea':
        targetElement = container.querySelector(`textarea[data-field="${fieldName}"]`);
        break;
      case 'json':

        targetElement = container.querySelector(`div[data-field="${fieldName}"][data-display-mode="true"]`);
        if (!targetElement) {

          targetElement = container.querySelector(`textarea[data-field="${fieldName}"]`);
        }
        break;
      default:
        targetElement = container.querySelector(`input[data-field="${fieldName}"]`);
        break;
    }

    if (targetElement) {

      targetElement.classList.remove('border-red-500', 'border-2', 'ring-red-500', 'ring-1');

      targetElement.classList.add('border-neutral-300');

    }
  };

  const clearAllFieldErrors = () => {
    if (config.fields) {
      config.fields.forEach((field: any) => {
        removeFieldErrorStyle(field.name, field.type);
      });
    }
  };

  const formStructureSignature = useMemo(() => getFormStructureSignature(config), [config]);
  const prevFormStructureSignatureRef = useRef('');

  useEffect(() => {
    const signatureChanged =
      prevFormStructureSignatureRef.current !== '' &&
      prevFormStructureSignatureRef.current !== formStructureSignature;

    if (signatureChanged) {
      initialConfigRef.current = config;
      isInitializedRef.current = false;
      formDataRef.current = {};
      setRefreshTrigger((prev) => prev + 1);
    } else if (!initialConfigRef.current) {
      initialConfigRef.current = config;
    }

    prevFormStructureSignatureRef.current = formStructureSignature;
  }, [config, formStructureSignature]);

  useEffect(() => {
    const currentComponentId = componentId || id || 'form';

    const resetFormRenderState = () => {
      initialConfigRef.current = config;
      formDataRef.current = {};
      isInitializedRef.current = false;
      setRefreshTrigger((prev) => prev + 1);
    };

    const handleComponentRefresh = (event: CustomEvent) => {
      const { componentId: eventComponentId } = event.detail || {};

      if (eventComponentId === currentComponentId) {
        resetFormRenderState();

        toast({
          title: t('form.refreshed', 'Form Refreshed'),
          description: t('form.refreshed_description', 'Form data has been reloaded'),
        });
      }
    };

    const handleComponentConfigUpdated = (event: CustomEvent) => {
      const { componentId: eventComponentId } = event.detail || {};

      if (eventComponentId === currentComponentId) {
        resetFormRenderState();
      }
    };

    window.addEventListener('component-refresh', handleComponentRefresh as EventListener);
    window.addEventListener('component-config-updated', handleComponentConfigUpdated as EventListener);

    return () => {
      window.removeEventListener('component-refresh', handleComponentRefresh as EventListener);
      window.removeEventListener('component-config-updated', handleComponentConfigUpdated as EventListener);
    };
  }, [componentId, id, config, t]);

  useEffect(() => {

    const loadFormData = async () => {

      const hasDatabaseDataSource = !!databaseDataSourceConfig?.datasourceId;

      if (mockEnabled) {
        setLoadedData(mockRecord);
        return;
      }

      if (hasDatabaseDataSource) {
        return;
      }

      if (isLoadingRef.current) {
        return;
      }

      const generateLoadParams = () => {
        const rawKeys = Object.keys(rawParams || {}).sort();
        const pageKeys = Object.keys(pageParams || {}).sort();
        return `${refreshTrigger}|${rawKeys.map(k => `${k}:${rawParams[k]}`).join(',')}|${pageKeys.map(k => `${k}:${pageParams[k]}`).join(',')}|${dataSource?.datasetId || dataSource?.id || ''}`;
      };

      const currentParams = generateLoadParams();

      if (lastLoadParamsRef.current === currentParams && refreshTrigger === 0) {
        return;
      }

      const isValidParameterValue = (value: any): boolean => {
        if (value === null || value === undefined || value === '' ||
          value === 'null' || value === 'undefined') return false;
        return true;
      };

      const hasValidParameters = (): boolean => {

        if (mockEnabled || !dataSource) {
          return true;
        }

        const allParamNames = [...Object.keys(rawParams || {}), ...Object.keys(pageParams || {})];

        const hasAtLeastOneValidParam = allParamNames.some(paramName => {
          const rawValue = rawParams[paramName];
          const pageValue = pageParams[paramName];

          const isValidValue = (value: any) => {
            return value !== null && value !== 'null' && value !== undefined && value !== 'undefined';
          };

          return (
            (Object.prototype.hasOwnProperty.call(rawParams, paramName) && isValidValue(rawValue)) ||
            (Object.prototype.hasOwnProperty.call(pageParams, paramName) && isValidValue(pageValue))
          );
        });

        if (!hasAtLeastOneValidParam) {
          return false;
        } 

        const hasParameterizedFilters = () => {

          if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters && parameterConfig.dataSourceFilters.length > 0) {
            return true;
          }
          if (dataSource?.paramsParameterFilters && dataSource.paramsParameterFilters.length > 0) {
            return true;
          }
          if (dataSource?.params?.parameterFilters && dataSource.params.parameterFilters.length > 0) {
            return true;
          }
          if (dataSource?.parameterFilters && dataSource.parameterFilters.length > 0) {
            return true;
          }
          return false;
        };

        if (hasParameterizedFilters()) {
          const allParams = { ...rawParams, ...pageParams };

          const getRequiredParameterNames = () => {
            const paramNames = new Set<string>();

            if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters) {
              parameterConfig.dataSourceFilters.forEach((filter: any) => {
                if (filter.value && typeof filter.value === 'string') {
                  const matches = filter.value.match(/\{([^}]+)\}/g);
                  if (matches) {
                    matches.forEach((match: string) => {
                      const paramName = match.slice(1, -1); 
                      paramNames.add(paramName);
                    });
                  }
                }
              });
            }

            [
              dataSource?.paramsParameterFilters,
              dataSource?.params?.parameterFilters,
              dataSource?.parameterFilters
            ].forEach(filters => {
              if (filters && Array.isArray(filters)) {
                filters.forEach((filter: any) => {
                  if (filter.parameterName) {
                    paramNames.add(filter.parameterName);
                  }
                });
              }
            });

            return Array.from(paramNames);
          };

          const requiredParams = getRequiredParameterNames();

          const hasValidFilterParams = requiredParams.length === 0 ||
            requiredParams.some(paramName => isValidParameterValue(allParams[paramName]));

          if (!hasValidFilterParams) {
            return false;
          }
        }

        const keyParameters = ['selected_candidate_id', 'candidate_id', 'id'];

        for (const paramName of keyParameters) {
          const rawValue = rawParams[paramName];
          const pageValue = pageParams[paramName];

          if (isValidParameterValue(rawValue) || isValidParameterValue(pageValue)) {
            return true;
          }
        }

        if (parameterConfig?.enableParameterReceiving) {

          const hasOtherValidParams = allParamNames.some(paramName =>
            isValidParameterValue(rawParams[paramName]) || isValidParameterValue(pageParams[paramName])
          );

          if (!hasOtherValidParams && refreshTrigger > 0) {

            return false;
          }
        }

        return true; 
      };

      if (!hasValidParameters()) {
        return; 
      }

      if (mockEnabled) {
        setLoadedData(mockRecord);
        return;
      }

      if (!dataSource) {
        setLoadedData((currentData) =>
          Object.keys(currentData).length > 0 ? {} : currentData
        );
        return;
      }

      try {

        isLoadingRef.current = true;
        lastLoadParamsRef.current = currentParams;
        setDataIsLoading(true);

        const originalFilter = dataSource?.params?.filter;

        let parameterDataSourceFilterString = '';

        let filtersToUse: any[] = [];

        if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters && parameterConfig.dataSourceFilters.length > 0) {

          filtersToUse = parameterConfig.dataSourceFilters;
        } else if (dataSource?.paramsParameterFilters && dataSource.paramsParameterFilters.length > 0) {

          filtersToUse = dataSource.paramsParameterFilters.map((filter: any) => ({
            field: filter.field,
            operator: filter.operator,
            value: `{${filter.parameterName}}` 
          }));
        } else if (dataSource?.params?.parameterFilters && dataSource.params.parameterFilters.length > 0) {

          filtersToUse = dataSource.params.parameterFilters.map((filter: any) => ({
            field: filter.field,
            operator: filter.operator,
            value: `{${filter.parameterName}}` 
          }));
        } else if (dataSource?.parameterFilters && dataSource.parameterFilters.length > 0) {

          filtersToUse = dataSource.parameterFilters.map((filter: any) => ({
            field: filter.field,
            operator: filter.operator,
            value: `{${filter.parameterName}}` 
          }));
        }

        if (filtersToUse.length > 0) {

          const allParams = {
            ...rawParams, 
            ...pageParams 
          };

          const dataSourceFilters = buildDataSourceFilters(
            filtersToUse,
            allParams 
          );

          if (Object.keys(dataSourceFilters).length > 0) {

            parameterDataSourceFilterString = buildParameterFilterString(dataSourceFilters, {});

          }
        }

        const finalFilter = mergeFilterStrings(
          originalFilter,
          parameterDataSourceFilterString
        );

        let datasetId = null;

        if (datasetConfig?.datasetId) {
          datasetId = datasetConfig.datasetId;
        } else if (typeof dataSource === 'string') {
          datasetId = dataSource;
        } else if (dataSource?.datasetId) {
          datasetId = dataSource.datasetId;
        } else if (dataSource?.id) {
          datasetId = dataSource.id;
        } else if (dataSource?.dataset?.id) {
          datasetId = dataSource.dataset.id;
        } else if (dataSource?.dataset?.datasetId) {
          datasetId = dataSource.dataset.datasetId;
        }

        if (!datasetId) {

          setLoadedData({});
          return;
        }

        let finalDatasetId = datasetId;

        if (typeof datasetId === 'object' && datasetId !== null) {

          if (datasetId.datasetId) {
            finalDatasetId = datasetId.datasetId;
          } else if (datasetId.id) {
            finalDatasetId = datasetId.id;
          } else if (datasetId.value) {
            finalDatasetId = datasetId.value;
          } else {

            const keys = Object.keys(datasetId);
            for (const key of keys) {
              if (typeof datasetId[key] === 'string') {
                finalDatasetId = datasetId[key];
                break;
              }
            }
          }
        }

        const stringDatasetId = String(finalDatasetId);

        const response = await queryDatasetData(
          stringDatasetId, 
          { 
            ...(finalFilter && { filter: finalFilter }),
            limit: 1 
          }
        );

        if (response?.success && (response as any)?.data?.data?.length > 0) {
          const formData = (response as any).data.data[0];
          setLoadedData(formData);

        } else {
          setLoadedData({});

        }
      } catch (error) {
        console.error('[FormRenderer] Form data load failed:', error);
        setLoadedData({});
        toast({
          variant: "destructive",
          title: t('form.data_load_failed', 'Data Load Failed'),
          description: t('form.data_load_failed_description', 'Unable to get form data, please try again later')
        });
      } finally {

        isLoadingRef.current = false;
        setDataIsLoading(false);
      }
    };

    loadFormData();
  }, [refreshTrigger, mockEnabled, mockRecord]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const stableConfig = initialConfigRef.current;

    const isAnyDataLoading = mockEnabled ? dataIsLoading : dataIsLoading || databaseLoading;

    // Rebuild the DOM when the narrow-flow flag flips (e.g. toggling the studio
    // device preset), otherwise the initialized guard below would skip it.
    // Snapshot the live values first: this rebuild is layout-only, and
    // reseeding from loadedData/defaults would silently wipe what the user has
    // typed. Data-refresh rebuilds keep their reset semantics (no snapshot).
    if (lastNarrowFlowRef.current !== isNarrowFlow) {
      lastNarrowFlowRef.current = isNarrowFlow;
      if (isInitializedRef.current) {
        preservedValuesRef.current = { ...formDataRef.current };
      }
      isInitializedRef.current = false;
    }

    const hasLoadedData = loadedData && Object.keys(loadedData).length > 0 && !(loadedData as any).__noData;
    const isDataLoadCompleted = loadedData && ((loadedData as any).__noData || Object.keys(loadedData).length > 0);
    const shouldUpdateData = hasLoadedData && isInitializedRef.current;

    if (isAnyDataLoading && !isDataLoadCompleted) {
      container.innerHTML = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'space-y-4 p-2';
      const loadingText = t('form.loading_form_data', 'Loading form data...');
      loadingDiv.setAttribute('role', 'status');
      loadingDiv.setAttribute('aria-busy', 'true');
      loadingDiv.setAttribute('aria-label', loadingText);
      
      const SK = "relative overflow-hidden rounded-md bg-primary/10 before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:content-[''] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent dark:before:via-white/[0.14]";
      loadingDiv.innerHTML = Array.from({ length: 4 })
        .map(() => `<div class="space-y-1.5"><div class="${SK} h-3 w-24"></div><div class="${SK} h-9 w-full"></div></div>`)
        .join('');
      container.appendChild(loadingDiv);
      return;
    }

    if (shouldUpdateData) {
      container.innerHTML = '';
      isInitializedRef.current = false;
    }

    if (isInitializedRef.current && !shouldUpdateData && !isAnyDataLoading) {
      return;
    }

    const formInstanceId = id || 'default';
    globalFormRegistry.set(formInstanceId, {
      formId: formInstanceId,
      title: initialConfigRef.current?.title,
      mode: initialConfigRef.current?.mode,
      fieldsCount: initialConfigRef.current?.fields?.length || 0,
      containerRef,
      formDataRef,
      initialConfigRef
    });

    container.innerHTML = '';

    isInitializedRef.current = true;

    const bumpActionVisibilityForField = (fieldName: string) => {
      if (actionVisibilityFormDepsRef.current.has(fieldName)) {
        setActionVisibilityTick((x) => x + 1);
      }
    };

    const formDiv = document.createElement('div');

    let layoutMode = stableConfig.layoutConfig?.layoutMode;

    if (!layoutMode || layoutMode === 'auto') {
      const hasGridPositions = stableConfig.fields.some((field: FormField) => field.layoutConfig?.gridPosition);
      if (hasGridPositions) {
        layoutMode = 'grid';
      }
    }

    let formClassName = 'form-content';

    if (layoutMode === 'grid') {

      const gridConfig = stableConfig.layoutConfig?.gridConfig;

      let columns = gridConfig?.columns;
      if (!columns) {
        const fieldsWithPositions = stableConfig.fields.filter((f: FormField) => f.layoutConfig?.gridPosition);
        if (fieldsWithPositions.length > 0) {

          const maxColumn = Math.max(...fieldsWithPositions.map((f: FormField) => {
            const pos = f.layoutConfig!.gridPosition!;
            return pos.column + (pos.colSpan || 1) - 1;
          }));
          columns = Math.max(maxColumn, 2); 
        } else {
          columns = 2; 
        }
      }

      const gap = gridConfig?.gap || '16px';

      formClassName += ' grid';
      formDiv.style.display = 'grid';

      if (isNarrowFlow) {

        // Narrow flow (real mobile or studio phone frame): force a single column.
        // The inline style beats the injected .form-content.grid class; the vars
        // keep the !important media-query rules single-column on real mobile too.
        formDiv.style.gridTemplateColumns = 'minmax(0, 1fr)';
        formDiv.style.setProperty('--grid-columns-tablet', 'minmax(0, 1fr)');
        formDiv.style.setProperty('--grid-columns-mobile', 'minmax(0, 1fr)');
      } else if (gridConfig?.columnTemplate) {

        formDiv.style.gridTemplateColumns = gridConfig.columnTemplate;

        formDiv.style.setProperty('--grid-columns-mobile', '1fr');
      } else {

        const mobileColumns = Math.min(columns, 2);
        const tabletColumns = Math.min(columns, Math.ceil(columns * 0.75));

        formDiv.style.setProperty('--grid-columns-desktop', `repeat(${columns}, minmax(0, 1fr))`);
        formDiv.style.setProperty('--grid-columns-tablet', `repeat(${tabletColumns}, minmax(0, 1fr))`);
        formDiv.style.setProperty('--grid-columns-mobile', `repeat(${mobileColumns}, minmax(0, 1fr))`);

        formDiv.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
      }

      formDiv.style.gap = gap;

      const fieldsWithPositions = stableConfig.fields.filter((f: FormField) => f.layoutConfig?.gridPosition);
      const fieldsWithoutPositions = stableConfig.fields.filter((f: FormField) => !f.layoutConfig?.gridPosition);

      let maxRow = 1;
      if (fieldsWithPositions.length > 0) {

        maxRow = Math.max(...fieldsWithPositions.map((f: FormField) => {
          const pos = f.layoutConfig!.gridPosition!;
          return pos.row + (pos.rowSpan || 1) - 1;
        }));
      }

      const additionalRows = Math.ceil(fieldsWithoutPositions.length / columns);
      const totalRows = maxRow + additionalRows;

      formDiv.style.gridTemplateRows = `repeat(${totalRows}, auto)`;

    } else if (layoutMode === 'flex') {

      formClassName += ' flex flex-wrap gap-4';

    } else if (layoutMode === 'auto' || !layoutMode) {

      if (stableConfig.layout === 'grid') {

        const cols = stableConfig.displayConfig?.columnsPerRow || 1;
        const gridClasses: Record<number, string> = {
          1: 'grid-cols-1',
          2: 'grid-cols-1 md:grid-cols-2',
          3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        };
        const gridClass = gridClasses[cols] || 'grid-cols-1';
        formClassName += ` grid gap-6 ${gridClass}`;

        formDiv.style.display = 'grid';
        if (cols > 1 && isNarrowFlow) {
          // Same trap as the explicit grid branch: the inline template beats
          // the responsive classes, so narrow flow must pin one column (and
          // the CSS vars, whose media rules are !important on real mobile).
          formDiv.style.gridTemplateColumns = 'minmax(0, 1fr)';
          formDiv.style.setProperty('--grid-columns-tablet', 'minmax(0, 1fr)');
          formDiv.style.setProperty('--grid-columns-mobile', 'minmax(0, 1fr)');
          formDiv.style.gap = '1.5rem';
        } else if (cols > 1) {

          const mobileCols = Math.min(cols, 2);
          const tabletCols = Math.min(cols, Math.ceil(cols * 0.75));

          formDiv.style.setProperty('--grid-columns-desktop', `repeat(${cols}, minmax(0, 1fr))`);
          formDiv.style.setProperty('--grid-columns-tablet', `repeat(${tabletCols}, minmax(0, 1fr))`);
          formDiv.style.setProperty('--grid-columns-mobile', `repeat(${mobileCols}, minmax(0, 1fr))`);

          formDiv.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
          formDiv.style.gap = '1.5rem';
        }

      } else if (stableConfig.layout === 'horizontal') {

        const cols = stableConfig.displayConfig?.columnsPerRow || 2;
        if (cols === 1 || isNarrowFlow) {
          // md:/lg: variants resolve desktop inside the studio phone frame, so
          // narrow flow stacks fields instead of using the grid classes.
          formClassName += ' space-y-6';
        } else {
          const gridClasses: Record<number, string> = {
            1: 'grid-cols-1',
            2: 'grid-cols-1 md:grid-cols-2',
            3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
            4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
          };
          const gridClass = gridClasses[cols] || 'grid-cols-2';
          formClassName += ` space-y-0 grid gap-6 ${gridClass}`;
        }
      } else {

        formClassName += ' space-y-6';
      }
    }

    formDiv.className = formClassName;

    if (stableConfig.layoutConfig?.containerStyle) {
      const containerStyle = stableConfig.layoutConfig.containerStyle;
      if (containerStyle.maxWidth) formDiv.style.maxWidth = containerStyle.maxWidth;
      if (containerStyle.padding) formDiv.style.padding = containerStyle.padding;
      if (containerStyle.background) formDiv.style.background = containerStyle.background;
    }

    let fieldsToRender = [...stableConfig.fields];
    let unpositionedFieldIndex = 0; 

    if (layoutMode === 'grid') {

      fieldsToRender = fieldsToRender.sort((a, b) => {
        const aPos = a.layoutConfig?.gridPosition;
        const bPos = b.layoutConfig?.gridPosition;

        if (!aPos && !bPos) return 0;
        if (!aPos) return 1;
        if (!bPos) return -1;

        if (aPos.row !== bPos.row) {
          return aPos.row - bPos.row;
        }
        return aPos.column - bPos.column;
      });
    }

    fieldsToRender.forEach((field: FormField) => {

      const isHidden = field.hidden || field.mode === 'hidden';

      if (isHidden) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.setAttribute('data-field', field.name);

        let hiddenValue = '';

        if (preservedValuesRef.current && field.name in preservedValuesRef.current) {
          // Layout-only rebuild — keep the live value (see preservedValuesRef).
          hiddenValue = String(preservedValuesRef.current[field.name] ?? '');
        } else if (loadedData[field.name] !== undefined && loadedData[field.name] !== null) {
          hiddenValue = String(loadedData[field.name]);
        } else if (rawParams[field.name] !== undefined && rawParams[field.name] !== null) {
          hiddenValue = String(rawParams[field.name]);
        } else if (pageParams[field.name] !== undefined && pageParams[field.name] !== null) {
          hiddenValue = String(pageParams[field.name]);
        } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
          hiddenValue = String(field.defaultValue);
        }

        hiddenInput.value = hiddenValue;
        hiddenInput.id = field.name;

        formDataRef.current[field.name] = hiddenValue;

        formDiv.appendChild(hiddenInput);

        return;
      }

      let initialValue = '';
      if (field.dataSource === 'parameter' && field.parameterConfig?.paramName) {

        const paramName = field.parameterConfig.paramName;
        if (pageParams[paramName] !== undefined && pageParams[paramName] !== null) {
          initialValue = String(pageParams[paramName]);
        } else if (field.parameterConfig.defaultValue !== undefined) {
          initialValue = String(field.parameterConfig.defaultValue);
        }
      } else if (field.dataSource === 'dataset') {

        initialValue = loadedData[field.name] ?? field.defaultValue ?? '';

      } else {

        initialValue = loadedData[field.name] ?? field.defaultValue ?? '';

      }

      // Layout-only rebuild (narrow-flow flip): the user's typed values are
      // the live source of truth — the defaults above would wipe them.
      if (preservedValuesRef.current && field.name in preservedValuesRef.current) {
        initialValue = preservedValuesRef.current[field.name];
      }

      if (field.type !== 'switch') {
        formDataRef.current[field.name] = initialValue;
      }

      const isDisplayMode = stableConfig.mode === 'display';
      const isReadonly = field.mode === 'readonly';

      const fieldDiv = document.createElement('div');

      // 'field-container' is what the injected mobile CSS reset targets.
      let containerClasses = 'field-container w-full';

      const labelPosition = field.layoutConfig?.labelPosition || 'top';
      switch (labelPosition) {
        case 'left':
        case 'right':
          containerClasses += ' flex items-center gap-3';
          break;
        case 'none':
          containerClasses += ' space-y-0';
          break;
        default: // 'top', 'bottom', 'inside'
          containerClasses += ' space-y-2';
      }

      // Narrow flow: no grid-area — explicit desktop column indices would force
      // implicit tracks even when the template is a single column.
      if (layoutMode === 'grid' && !isNarrowFlow) {
        if (field.layoutConfig?.gridPosition) {

          const { row, column, rowSpan = 1, colSpan = 1 } = field.layoutConfig.gridPosition;
          fieldDiv.style.gridArea = `${row} / ${column} / ${row + rowSpan} / ${column + colSpan}`;
        } else {

          const gridConfig = stableConfig.layoutConfig?.gridConfig;
          const columns = gridConfig?.columns || 2;

          const configuredPositions = fieldsToRender
            .filter(f => f.layoutConfig?.gridPosition)
            .map(f => f.layoutConfig!.gridPosition!);

          let autoRow = 1;
          let autoColumn = 1;

          if (configuredPositions.length > 0) {

            const maxRow = Math.max(...configuredPositions.map(pos => pos.row + (pos.rowSpan || 1) - 1));
            autoRow = maxRow + Math.floor(unpositionedFieldIndex / columns) + 1;
            autoColumn = (unpositionedFieldIndex % columns) + 1;
          } else {

            autoRow = Math.floor(unpositionedFieldIndex / columns) + 1;
            autoColumn = (unpositionedFieldIndex % columns) + 1;
          }

          fieldDiv.style.gridArea = `${autoRow} / ${autoColumn} / ${autoRow + 1} / ${autoColumn + 1}`;
          unpositionedFieldIndex++; 

        }
      }

      if (field.layoutConfig?.containerStyle) {
        const containerStyle = field.layoutConfig.containerStyle;
        // Narrow flow: skip fixed width/min-width (inline min-width beats
        // max-width) and cap the field at the frame width.
        if (containerStyle.width && !isNarrowFlow) fieldDiv.style.width = containerStyle.width;
        if (containerStyle.minWidth && !isNarrowFlow) fieldDiv.style.minWidth = containerStyle.minWidth;
        if (containerStyle.maxWidth) fieldDiv.style.maxWidth = containerStyle.maxWidth;
        if (containerStyle.margin) fieldDiv.style.margin = containerStyle.margin;
        if (containerStyle.padding) fieldDiv.style.padding = containerStyle.padding;
      }
      if (isNarrowFlow) {
        fieldDiv.style.maxWidth = '100%';
      }

      fieldDiv.className = containerClasses;

      let label: HTMLLabelElement | null = null;

      if (labelPosition !== 'none') {
        label = document.createElement('label');

        let labelClasses = 'text-sm font-medium text-neutral-700 dark:text-neutral-300';
        if (labelPosition === 'left' || labelPosition === 'right') {
          labelClasses += ' flex-shrink-0';

          const verticalAlign = field.layoutConfig?.labelVerticalAlign || 'center';
          if (verticalAlign === 'start') {
            labelClasses += ' self-start';
          } else if (verticalAlign === 'end') {
            labelClasses += ' self-end';
          } else {
            labelClasses += ' self-center';
          }

          if (field.layoutConfig?.labelWidth) {
            label.style.width = field.layoutConfig.labelWidth;
          }
        } else {
          labelClasses += ' block';
        }

        label.className = labelClasses;
        label.textContent = field.label;

        if (field.required && !isDisplayMode) {
          const span = document.createElement('span');
          span.className = 'text-red-500 ml-1';
          span.textContent = '*';
          label.appendChild(span);
        }
      }

      let inputElement: HTMLElement;

      if (isDisplayMode) {

        inputElement = document.createElement('div');
        inputElement.className = 'px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800 rounded-md min-h-[40px] flex items-center';

        let displayValue = '';
        if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
          switch (field.type) {
            case 'checkbox':
            case 'switch':

              const parseSwitchValue = (value: any): boolean => {
                if (value === undefined || value === null) return false;
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
                if (typeof value === 'number') return value === 1;
                return Boolean(value);
              };
              displayValue = parseSwitchValue(initialValue) ? t('form.yes', 'Yes') : t('form.no', 'No');
              break;
            case 'select':

              const selectedOption = field.options?.find((option: any) => option.value === initialValue);
              displayValue = selectedOption ? selectedOption.label : String(initialValue);
              break;
            case 'date':

              try {
                const date = new Date(initialValue);
                displayValue = date.toLocaleDateString('zh-CN');
              } catch {
                displayValue = String(initialValue);
              }
              break;
            case 'json':

              inputElement.innerHTML = jsonToTableHtml(initialValue);
              inputElement.setAttribute('data-field', field.name);
              inputElement.setAttribute('data-display-mode', 'true');

              switch (labelPosition) {
                case 'left':
                  if (label) fieldDiv.appendChild(label);
                  fieldDiv.appendChild(inputElement);
                  break;
                case 'right':
                  fieldDiv.appendChild(inputElement);
                  if (label) fieldDiv.appendChild(label);
                  break;
                case 'bottom':
                  fieldDiv.appendChild(inputElement);
                  if (label) fieldDiv.appendChild(label);
                  break;
                case 'none':
                  fieldDiv.appendChild(inputElement);
                  break;
                default: // 'top', 'inside'
                  if (label) fieldDiv.appendChild(label);
                  fieldDiv.appendChild(inputElement);
              }
              formDiv.appendChild(fieldDiv);
              return;
            default:
              displayValue = String(initialValue);
          }
        } else {
          displayValue = t('form.no_data', 'No Data');
          inputElement.className += ' text-neutral-400 dark:text-neutral-500';
        }

        inputElement.textContent = displayValue;
        inputElement.setAttribute('data-field', field.name);
        inputElement.setAttribute('data-display-mode', 'true');

      } else {

        switch (field.type) {
          case 'text':
          case 'email':
          case 'password':
          case 'number':
          case 'date':
            inputElement = document.createElement('input');
            (inputElement as HTMLInputElement).type = field.type === 'number' ? 'number' : field.type || 'text';
            (inputElement as HTMLInputElement).value = String(initialValue);
            (inputElement as HTMLInputElement).placeholder = field.placeholder || '';
            (inputElement as HTMLInputElement).readOnly = isReadonly;
            inputElement.setAttribute('data-field', field.name);
            inputElement.className = 'flex h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

            const inputInitialValue = field.type === 'number' ? (initialValue === '' ? 0 : Number(initialValue)) : initialValue;
            formDataRef.current[field.name] = inputInitialValue;

            if (isReadonly) {
              inputElement.className += ' bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-75 border-dashed border-neutral-400 dark:border-neutral-600';

              (inputElement as HTMLElement).style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)';
            }

            if (!isReadonly) {
              inputElement.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const value = field.type === 'number' ? (target.value === '' ? 0 : Number(target.value)) : target.value;
                formDataRef.current[field.name] = value;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);

              });

              inputElement.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const value = field.type === 'number' ? (target.value === '' ? 0 : Number(target.value)) : target.value;
                formDataRef.current[field.name] = value;

                bumpActionVisibilityForField(field.name);

              });
            }
            break;

          case 'textarea':
            inputElement = document.createElement('textarea');
            (inputElement as HTMLTextAreaElement).value = String(initialValue);
            (inputElement as HTMLTextAreaElement).placeholder = field.placeholder || '';
            (inputElement as HTMLTextAreaElement).rows = field.rows || 3;
            (inputElement as HTMLTextAreaElement).readOnly = isReadonly;
            inputElement.setAttribute('data-field', field.name);
            inputElement.className = 'flex min-h-[80px] w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

            formDataRef.current[field.name] = initialValue;

            if (isReadonly) {
              inputElement.className += ' bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-75 border-dashed border-neutral-400 dark:border-neutral-600';

              (inputElement as HTMLElement).style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)';
            }

            if (!isReadonly) {
              inputElement.addEventListener('input', (e) => {
                const target = e.target as HTMLTextAreaElement;
                formDataRef.current[field.name] = target.value;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);

              });

              inputElement.addEventListener('blur', (e) => {
                const target = e.target as HTMLTextAreaElement;
                formDataRef.current[field.name] = target.value;

                bumpActionVisibilityForField(field.name);

              });
            }
            break;

          case 'select':
            inputElement = document.createElement('select');
            (inputElement as HTMLSelectElement).disabled = isReadonly;
            inputElement.setAttribute('data-field', field.name);
            inputElement.className = 'flex h-10 w-full items-center justify-between rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

            if (isReadonly) {
              inputElement.className += ' bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-75 border-dashed border-neutral-400 dark:border-neutral-600';

              (inputElement as HTMLElement).style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)';
            }

            let selectInitialValue = initialValue;
            field.options?.forEach((option: any) => {
              const optionElement = document.createElement('option');
              optionElement.value = String(option.value);
              optionElement.textContent = option.label;
              if (String(option.value) === String(initialValue)) {
                optionElement.selected = true;
                selectInitialValue = option.value; 
              }
              (inputElement as HTMLSelectElement).appendChild(optionElement);
            });

            if (selectInitialValue !== undefined) {
              formDataRef.current[field.name] = selectInitialValue;
            }

            if (!isReadonly) {
              inputElement.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                formDataRef.current[field.name] = target.value;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);

              });

              inputElement.addEventListener('blur', (e) => {
                const target = e.target as HTMLSelectElement;
                formDataRef.current[field.name] = target.value;

                bumpActionVisibilityForField(field.name);

              });
            }
            break;

          case 'checkbox':
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'flex items-center space-x-2';

            const checkboxInitialValue = Boolean(initialValue);
            formDataRef.current[field.name] = checkboxInitialValue;

            inputElement = document.createElement('input');
            inputElement.id = field.name;
            (inputElement as HTMLInputElement).type = 'checkbox';
            (inputElement as HTMLInputElement).checked = checkboxInitialValue;
            (inputElement as HTMLInputElement).disabled = isReadonly;
            inputElement.className = 'peer h-4 w-4 shrink-0 rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary checked:border-primary checked:text-primary-foreground';

            const checkboxLabel = document.createElement('label');
            checkboxLabel.htmlFor = field.name;
            checkboxLabel.textContent = field.label;
            checkboxLabel.className = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-700 dark:text-neutral-300';

            checkboxDiv.appendChild(inputElement);
            checkboxDiv.appendChild(checkboxLabel);

            if (label && label.parentNode === fieldDiv) {
              fieldDiv.removeChild(label);
            }

            if (isReadonly) {
              checkboxDiv.style.opacity = '0.75';
              checkboxDiv.style.pointerEvents = 'none';
              const checkboxInput = checkboxDiv.querySelector('input') as HTMLInputElement;
              if (checkboxInput) {
                checkboxInput.style.borderStyle = 'dashed';
                checkboxInput.style.borderColor = '#9ca3af'; // border-neutral-400
              }
            }

            inputElement = checkboxDiv;

            if (!isReadonly) {
              const checkboxInput = inputElement.querySelector('input') as HTMLInputElement;
              checkboxInput.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                formDataRef.current[field.name] = target.checked;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);

              });

              checkboxInput.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                formDataRef.current[field.name] = target.checked;

                bumpActionVisibilityForField(field.name);

              });
            }
            break;

          case 'switch':

            const switchDiv = document.createElement('div');
            switchDiv.className = 'flex items-center';

            const fieldTypeStr = String(field.fieldType || '');
            const isStringType = fieldTypeStr === 'VARCHAR' || fieldTypeStr === 'TEXT' || fieldTypeStr === 'CHAR' ||
              (fieldTypeStr.includes('VARCHAR') || fieldTypeStr.includes('TEXT') || fieldTypeStr.includes('CHAR'));
            const isBoolType = fieldTypeStr === 'BOOL' || fieldTypeStr === 'BOOLEAN';

            const getSwitchValue = (isOn: boolean) => {
              if (isBoolType) {
                return isOn; 
              } else if (isStringType) {
                return isOn ? '1' : '0'; // String type returns "1"/"0"
              } else {
                return isOn ? 1 : 0; 
              }
            };

            const parseInitialValue = (value: any): boolean => {
              if (value === undefined || value === null) return false;
              if (typeof value === 'boolean') return value;
              if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
              if (typeof value === 'number') return value === 1;
              return Boolean(value);
            };

            const isInitiallyOn = parseInitialValue(initialValue);

            const initialSwitchValue = getSwitchValue(isInitiallyOn);
            formDataRef.current[field.name] = initialSwitchValue;

            const showText = field.switchConfig?.showText || false;
            const onText = field.switchConfig?.onText || '';
            const offText = field.switchConfig?.offText || '';

            const switchContainer = document.createElement('div');

            const switchWidth = showText && (onText || offText) ? 'w-16' : 'w-11';
            switchContainer.className = `relative inline-flex h-6 ${switchWidth} items-center rounded-full transition-colors cursor-pointer ${isInitiallyOn
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
              }`;
            switchContainer.setAttribute('role', 'switch');
            switchContainer.setAttribute('aria-checked', String(isInitiallyOn));
            switchContainer.setAttribute('data-field', field.name);

            const switchButton = document.createElement('div');

            const translateOnClass = showText && (onText || offText) ? 'translate-x-11' : 'translate-x-6';
            switchButton.className = `inline-block h-4 w-4 transform rounded-full bg-white dark:bg-neutral-200 transition-transform shadow-sm ${isInitiallyOn ? translateOnClass : 'translate-x-1'
              }`;

            switchContainer.appendChild(switchButton);

            if (showText && (onText || offText)) {
              const switchText = document.createElement('span');
              switchText.className = 'absolute inset-0 flex items-center justify-center text-xs font-medium text-white pointer-events-none';
              switchText.textContent = isInitiallyOn ? onText : offText;
              switchContainer.appendChild(switchText);
            }

            switchDiv.appendChild(switchContainer);

            inputElement = switchDiv;

            if (!isReadonly) {
              let currentIsOn = isInitiallyOn;

              const toggleSwitch = () => {
                currentIsOn = !currentIsOn;

                const switchValue = getSwitchValue(currentIsOn);
                formDataRef.current[field.name] = switchValue;

                switchContainer.className = `relative inline-flex h-6 ${switchWidth} items-center rounded-full transition-colors cursor-pointer ${currentIsOn
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
                  }`;
                switchButton.className = `inline-block h-4 w-4 transform rounded-full bg-white dark:bg-neutral-200 transition-transform shadow-sm ${currentIsOn ? translateOnClass : 'translate-x-1'
                  }`;
                switchContainer.setAttribute('aria-checked', String(currentIsOn));

                if (showText && (onText || offText)) {
                  const switchText = switchContainer.querySelector('span');
                  if (switchText) {
                    switchText.textContent = currentIsOn ? onText : offText;
                  }
                }

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);
              };

              switchContainer.addEventListener('click', toggleSwitch);

              switchContainer.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  toggleSwitch();
                }
              });

              switchContainer.setAttribute('tabindex', '0');
            } else {

              switchContainer.className += ' opacity-75 cursor-not-allowed';

              switchContainer.style.borderWidth = '2px';
              switchContainer.style.borderStyle = 'dashed';
              switchContainer.style.borderColor = '#9ca3af'; // border-neutral-400
              switchDiv.style.pointerEvents = 'none';
            }
            break;

          case 'json':

            if (isReadonly) {
              inputElement = document.createElement('div');
              inputElement.innerHTML = jsonToTableHtml(initialValue);
              inputElement.setAttribute('data-field', field.name);
              inputElement.setAttribute('data-display-mode', 'true');

              switch (labelPosition) {
                case 'left':
                  if (label) fieldDiv.appendChild(label);
                  fieldDiv.appendChild(inputElement);
                  break;
                case 'right':
                  fieldDiv.appendChild(inputElement);
                  if (label) fieldDiv.appendChild(label);
                  break;
                case 'bottom':
                  fieldDiv.appendChild(inputElement);
                  if (label) fieldDiv.appendChild(label);
                  break;
                case 'none':
                  fieldDiv.appendChild(inputElement);
                  break;
                default: // 'top', 'inside'
                  if (label) fieldDiv.appendChild(label);
                  fieldDiv.appendChild(inputElement);
              }
              formDiv.appendChild(fieldDiv);
              return;
            } else {

              inputElement = document.createElement('textarea');

              let jsonDisplayValue = '';
              try {
                if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
                  if (typeof initialValue === 'object') {

                    jsonDisplayValue = JSON.stringify(initialValue, null, 2);
                  } else if (typeof initialValue === 'string') {

                    try {
                      const parsed = JSON.parse(initialValue);
                      jsonDisplayValue = JSON.stringify(parsed, null, 2);
                    } catch {

                      jsonDisplayValue = initialValue;
                    }
                  } else {

                    jsonDisplayValue = JSON.stringify(initialValue, null, 2);
                  }
                } else {
                  jsonDisplayValue = '';
                }
              } catch (error) {

                console.warn('[FormRenderer] JSON serialization failed:', error);
                jsonDisplayValue = String(initialValue || '');
              }

              (inputElement as HTMLTextAreaElement).value = jsonDisplayValue;
              (inputElement as HTMLTextAreaElement).placeholder = field.placeholder || t('form.enter_json_data', 'Please enter JSON format data');
              (inputElement as HTMLTextAreaElement).rows = 6;
              (inputElement as HTMLTextAreaElement).readOnly = isReadonly;
              inputElement.setAttribute('data-field', field.name);
              inputElement.className = 'flex min-h-[120px] w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 font-mono';

              try {
                if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
                  if (typeof initialValue === 'object') {
                    formDataRef.current[field.name] = initialValue; 
                  } else if (typeof initialValue === 'string') {
                    try {
                      const parsed = JSON.parse(initialValue);
                      formDataRef.current[field.name] = parsed; 
                    } catch {
                      formDataRef.current[field.name] = initialValue; 
                    }
                  } else {
                    formDataRef.current[field.name] = initialValue;
                  }
                } else {
                  formDataRef.current[field.name] = '';
                }
              } catch {
                formDataRef.current[field.name] = initialValue || '';
              }

              inputElement.addEventListener('input', (e) => {
                const target = e.target as HTMLTextAreaElement;
                formDataRef.current[field.name] = target.value;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);
              });

              inputElement.addEventListener('blur', (e) => {
                const target = e.target as HTMLTextAreaElement;
                const value = target.value.trim();

                if (value) {
                  try {

                    const parsed = JSON.parse(value);

                    const formatted = JSON.stringify(parsed, null, 2);
                    target.value = formatted;
                    formDataRef.current[field.name] = parsed; 

                    removeFieldErrorStyle(field.name, field.type);
                  } catch {

                    formDataRef.current[field.name] = value;

                    // addFieldErrorStyle(field.name, field.type);
                  }
                } else {
                  formDataRef.current[field.name] = value;
                }
                bumpActionVisibilityForField(field.name);
              });
            }
            break;

          default:
            inputElement = document.createElement('input');
            (inputElement as HTMLInputElement).type = 'text';
            (inputElement as HTMLInputElement).value = String(initialValue);
            (inputElement as HTMLInputElement).placeholder = field.placeholder || '';
            (inputElement as HTMLInputElement).readOnly = isReadonly;
            inputElement.setAttribute('data-field', field.name);
            inputElement.className = 'flex h-10 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

            formDataRef.current[field.name] = initialValue;

            if (isReadonly) {
              inputElement.className += ' bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-75 border-dashed border-neutral-400 dark:border-neutral-600';

              (inputElement as HTMLElement).style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)';
            }

            if (!isReadonly) {
              inputElement.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                formDataRef.current[field.name] = target.value;

                removeFieldErrorStyle(field.name, field.type);
                bumpActionVisibilityForField(field.name);

              });

              inputElement.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                formDataRef.current[field.name] = target.value;

                bumpActionVisibilityForField(field.name);

              });
            }
            break;
        }
      }

      switch (labelPosition) {
        case 'left':
          if (label) fieldDiv.appendChild(label);
          fieldDiv.appendChild(inputElement);
          break;
        case 'right':
          fieldDiv.appendChild(inputElement);
          if (label) fieldDiv.appendChild(label);
          break;
        case 'bottom':
          fieldDiv.appendChild(inputElement);
          if (label) fieldDiv.appendChild(label);
          break;
        case 'inside':

          if (inputElement instanceof HTMLInputElement || inputElement instanceof HTMLTextAreaElement) {
            inputElement.placeholder = field.label + (field.required && !isDisplayMode ? ' *' : '');
          }
          fieldDiv.appendChild(inputElement);
          break;
        case 'none':
          fieldDiv.appendChild(inputElement);
          break;
        default: // 'top'
          if (label) fieldDiv.appendChild(label);
          fieldDiv.appendChild(inputElement);
      }

      formDiv.appendChild(fieldDiv);
    });

    container.appendChild(formDiv);

    (window as any)._debugFormData = () => {
      const currentConfig = initialConfigRef.current;
      return formDataRef.current;
    };

    (window as any)._debugFormConfig = () => {
      const currentConfig = initialConfigRef.current;
      return { config, stableConfig: currentConfig };
    };

    (window as any)._debugFormActions = () => {
      const currentConfig = initialConfigRef.current;
      return currentConfig.actions;
    };

    (window as any)._testFieldErrors = () => {
      const currentConfig = initialConfigRef.current;
      const requiredFields = currentConfig.fields.filter((f: any) => f.required);

      requiredFields.forEach((field: any) => {
        addFieldErrorStyle(field.name, field.type);
      });

      return {
        requiredFieldsCount: requiredFields.length,
        requiredFields: requiredFields.map((f: any) => f.name)
      };
    };

    (window as any)._clearFieldErrors = () => {
      clearAllFieldErrors();
    };

    (window as any)._debugDatasetOperations = () => {
      const currentConfig = initialConfigRef.current;

      const actions = currentConfig.actions || [];
      const datasetActions = actions.filter((action: any) =>
        ['updateDataset', 'insertDataset', 'deleteDataset'].includes(action.type)
      );

      datasetActions.forEach((action: any) => {
        switch (action.type) {
          case 'updateDataset':
            const updateConfig = action.config.updateDataset;
            if (updateConfig) {

              if (updateConfig.updateFields) {
                Object.entries(updateConfig.updateFields).forEach(([fieldName, field]: [string, any]) => {
                  let value: any;
                  switch (field.source) {
                    case 'column':
                    case 'field':
                      value = formDataRef.current[field.value];
                      break;
                    case 'parameter':
                      value = pageParams[field.value];
                      break;
                    case 'static':
                      value = field.value;
                      break;
                    default:
                      value = field.value;
                  }
                });
              }
            }
            break;

          case 'insertDataset':
            const insertConfig = action.config.insertDataset;
            if (insertConfig) {

              if (insertConfig.insertFields) {
                Object.entries(insertConfig.insertFields).forEach(([fieldName, field]: [string, any]) => {
                  let value: any;
                  switch (field.source) {
                    case 'column':
                    case 'field':
                      value = formDataRef.current[field.value];
                      break;
                    case 'parameter':
                      value = pageParams[field.value];
                      break;
                    case 'static':
                      value = field.value;
                      break;
                    default:
                      value = field.value;
                  }
                });
              }
            }
            break;

          case 'deleteDataset':
            const deleteConfig = action.config.deleteDataset;
            if (deleteConfig) {

              if (deleteConfig.deleteConditions) {
                Object.entries(deleteConfig.deleteConditions).forEach(([fieldName, condition]: [string, any]) => {
                  let value: any;
                  switch (condition.source) {
                    case 'column':
                    case 'field':
                      value = formDataRef.current[condition.value];
                      break;
                    case 'parameter':
                      value = pageParams[condition.value];
                      break;
                    case 'static':
                      value = condition.value;
                      break;
                    default:
                      value = condition.value;
                  }
                });
              }
            }
            break;
        }
      });

      const formFields = currentConfig.fields || [];

      const visibleFields = formFields.filter((f: any) => !f.hidden && f.mode !== 'hidden');
      const hiddenFields = formFields.filter((f: any) => f.hidden || f.mode === 'hidden');

      const hasPingjia = formFields.find((f: any) => f.name === 'pingjia');
      const hasJingkuang = formFields.find((f: any) => f.name === 'jingkuang');

      const possibleConditions = {
        [t('form.debug.page_params', 'Page Params')]: pageParams,
        [t('form.debug.form_mode', 'Form Mode')]: currentConfig.mode,
        [t('form.debug.form_title', 'Form Title')]: currentConfig.title,
        [t('form.debug.data_source', 'Data Source')]: !!currentConfig.dataSource,
        [t('form.debug.dataset_config', 'Dataset Config')]: !!currentConfig.datasetConfig,
        [t('form.debug.parameter_config', 'Parameter Config')]: currentConfig.parameterConfig,
        [t('form.debug.loaded_data', 'Loaded Data')]: loadedData
      };

      const relevantParams = Object.entries(pageParams).filter(([key, value]) =>
        key.toLowerCase().includes('type') ||
        key.toLowerCase().includes('mode') ||
        key.toLowerCase().includes('status') ||
        key.toLowerCase().includes('step') ||
        key.toLowerCase().includes('phase') ||
        key.toLowerCase().includes('category') ||
        value === 'pingjia' ||
        value === 'jingkuang' ||
        String(value).toLowerCase().includes('pingjia') ||
        String(value).toLowerCase().includes('jingkuang')
      );

      const relevantLoadedData = Object.entries(loadedData).filter(([key, value]) =>
        key.toLowerCase().includes('type') ||
        key.toLowerCase().includes('mode') ||
        key.toLowerCase().includes('status') ||
        key.toLowerCase().includes('step') ||
        key.toLowerCase().includes('phase') ||
        key.toLowerCase().includes('category') ||
        value === 'pingjia' ||
        value === 'jingkuang' ||
        String(value).toLowerCase().includes('pingjia') ||
        String(value).toLowerCase().includes('jingkuang')
      );

      const fieldsWithConditions = formFields.filter((f: any) =>
        f.visibilityCondition ||
        f.displayCondition ||
        f.showWhen ||
        f.hideWhen ||
        (f.name === 'pingjia' || f.name === 'jingkuang')
      );

      const fieldNames = formFields.map((f: any) => f.name);
      const groupedFields = {
        pingjia相关: fieldNames.filter((name: string) => name.includes('pingjia')),
        jingkuang相关: fieldNames.filter((name: string) => name.includes('jingkuang')),
        类型相关: fieldNames.filter((name: string) =>
          name.includes('type') ||
          name.includes('kind') ||
          name.includes('category')
        ),
        状态相关: fieldNames.filter((name: string) =>
          name.includes('status') ||
          name.includes('state') ||
          name.includes('phase')
        )
      };

      void groupedFields; 

      formFields.forEach((field: any) => {
        const isInFormData = Object.prototype.hasOwnProperty.call(formDataRef.current, field.name);
        const isVisible = !field.hidden && field.mode !== 'hidden';

        const fieldDataSource = field.dataSource || field.source;
        const isDatasetField = fieldDataSource === 'dataset' || fieldDataSource === 'dataSource';
        const isCustomField = !fieldDataSource || fieldDataSource === 'custom';
      });

      datasetActions.forEach((action: any) => {
        const config = action.config[action.type];
        if (!config) return;

        if (config.updateFields) {
          Object.entries(config.updateFields).forEach(([fieldName, field]: [string, any]) => {
            if (field.source === 'field' || field.source === 'column') {
              const exists = Object.prototype.hasOwnProperty.call(formDataRef.current, field.value);
              const configuredField = formFields.find((f: any) => f.name === field.value);
              const isFieldVisible = configuredField && !configuredField.hidden && configuredField.mode !== 'hidden';
              const fieldDataSource = configuredField?.dataSource || configuredField?.source;
              const isDatasetField = fieldDataSource === 'dataset' || fieldDataSource === 'dataSource';
            }
          });
        }

        if (config.insertFields) {
          Object.entries(config.insertFields).forEach(([fieldName, field]: [string, any]) => {
            if (field.source === 'field' || field.source === 'column') {
              void 0;
            }
          });
        }

        if (config.updateConditions) {
          Object.entries(config.updateConditions).forEach(([fieldName, condition]: [string, any]) => {
            if (condition.source === 'field' || condition.source === 'column') {
              const exists = Object.prototype.hasOwnProperty.call(formDataRef.current, condition.value);
              const configuredField = formFields.find((f: any) => f.name === condition.value);
              const isFieldVisible = configuredField && !configuredField.hidden && configuredField.mode !== 'hidden';
              const fieldDataSource = configuredField?.dataSource || configuredField?.source;
              const isDatasetField = fieldDataSource === 'dataset' || fieldDataSource === 'dataSource';
            }
          });
        }

        if (config.deleteConditions) {
          Object.entries(config.deleteConditions).forEach(([fieldName, condition]: [string, any]) => {
            if (condition.source === 'field' || condition.source === 'column') {
              const exists = Object.prototype.hasOwnProperty.call(formDataRef.current, condition.value);
              const configuredField = formFields.find((f: any) => f.name === condition.value);
              const isFieldVisible = configuredField && !configuredField.hidden && configuredField.mode !== 'hidden';
              const fieldDataSource = configuredField?.dataSource || configuredField?.source;
              const isDatasetField = fieldDataSource === 'dataset' || fieldDataSource === 'dataSource';
            }
          });
        }
      });

      return {
        actions: datasetActions,
        formData: formDataRef.current,
        pageParams,
        fieldMismatchDetected: true
      };
    };

    (window as any)._checkFormData = (targetId?: string) => {
      if (targetId) {

        const targetFormInfo = globalFormRegistry.get(targetId);
        if (!targetFormInfo) {
          console.error(`[FormRenderer] Form instance not found: ${targetId}`);
          return;
        }

        const targetFormData = targetFormInfo.formDataRef.current;
        const targetConfig = targetFormInfo.initialConfigRef.current;

        return targetFormData;
      } else {

        const allFormData: Record<string, any> = {};

        globalFormRegistry.forEach((formInfo, formId) => {
          const formData = formInfo.formDataRef.current;

          allFormData[formId] = formData;
        });

        return allFormData;
      }
    };

    (window as any)._emergencySync = (targetId?: string) => {
      if (targetId) {

        const targetFormInfo = globalFormRegistry.get(targetId);
        if (!targetFormInfo) {
          console.error(`[FormRenderer] Form instance not found: ${targetId}`);
          return;
        }

        const targetFormData = targetFormInfo.formDataRef.current;
        const targetConfig = targetFormInfo.initialConfigRef.current;
        const targetContainer = targetFormInfo.containerRef.current;
        let syncCount = 0;

        targetConfig.fields?.forEach((field: any) => {
          const domElement = targetContainer?.querySelector(`[data-field="${field.name}"]`) as HTMLInputElement;
          let domValue: any = undefined;

          if (domElement) {
            if (domElement.type === 'checkbox') {
              domValue = domElement.checked;
            } else if (domElement.tagName.toLowerCase() === 'select') {
              domValue = (domElement as unknown as HTMLSelectElement).value;
            } else if (domElement.getAttribute('role') === 'switch') {
              const isChecked = domElement.getAttribute('aria-checked') === 'true';

              if (field.fieldType === 'VARCHAR' || field.fieldType === 'TEXT' || field.fieldType === 'CHAR') {
                domValue = isChecked ? '1' : '0';
              } else if (field.fieldType === 'BOOL') {
                domValue = isChecked;
              } else {
                domValue = isChecked ? 1 : 0;
              }
            } else if (domElement.tagName.toLowerCase() === 'textarea') {
              domValue = (domElement as unknown as HTMLTextAreaElement).value;
            } else {
              domValue = domElement.value;
            }
          } else {
            const switchContainer = targetContainer?.querySelector(`div[role="switch"][data-field="${field.name}"]`);
            if (switchContainer) {
              const isChecked = switchContainer.getAttribute('aria-checked') === 'true';

              if (field.fieldType === 'VARCHAR' || field.fieldType === 'TEXT' || field.fieldType === 'CHAR') {
                domValue = isChecked ? '1' : '0';
              } else if (field.fieldType === 'BOOL') {
                domValue = isChecked;
              } else {
                domValue = isChecked ? 1 : 0;
              }
            }
          }

          if (domValue !== undefined) {
            const oldValue = targetFormData[field.name];
            targetFormData[field.name] = domValue;
            syncCount++;
          }
        });
        return targetFormData;

      } else {

        const allResults: Record<string, any> = {};

        globalFormRegistry.forEach((_, formId) => {
          const result = (window as any)._emergencySync(formId);
          allResults[formId] = result;
        });

        return allResults;
      }
    };

    // The layout-flip snapshot is consumed exactly once by the rebuild above;
    // clear it so later data-refresh rebuilds keep their reset semantics.
    preservedValuesRef.current = null;

    return () => {
      const formInstanceId = id || 'default';
      if (globalFormRegistry.has(formInstanceId)) {
        globalFormRegistry.delete(formInstanceId);
      }
    };

  }, [refreshTrigger, loadedData, formStructureSignature, isNarrowFlow]);

  useEffect(() => {
    if (!isInitializedRef.current || !containerRef.current) {

      return;
    }

    const stableConfig = initialConfigRef.current;

    stableConfig.fields.forEach((field: FormField) => {

      const isHidden = field.hidden || field.mode === 'hidden';

      let newValue = '';
      if (field.dataSource === 'parameter' && field.parameterConfig?.paramName) {

        const paramName = field.parameterConfig.paramName;
        let paramValue = pageParams[paramName];

        if (paramValue && typeof paramValue === 'object' && field.parameterConfig.fieldName) {

          const fieldName = field.parameterConfig.fieldName;
          const paramValueObj = paramValue as Record<string, any>;
          if (fieldName in paramValueObj) {
            paramValue = paramValueObj[fieldName];
          } else {
            paramValue = undefined;
          }
        }

        const isValidParameterValue = (value: any): boolean => {
          return value !== null && value !== undefined && value !== '' && value !== 'null';
        };

        if (isValidParameterValue(paramValue)) {
          newValue = String(paramValue);
        } else if (field.parameterConfig.defaultValue !== undefined) {
          newValue = String(field.parameterConfig.defaultValue);
        } else {

          newValue = formDataRef.current[field.name] || '';
        }
      } else if (field.dataSource === 'dataset') {

        newValue = loadedData[field.name] ?? field.defaultValue ?? '';
      } else {

        newValue = loadedData[field.name] ?? field.defaultValue ?? '';
      }
      formDataRef.current[field.name] = newValue;

      if (isHidden) {

        let updatedValue = '';

        if (field.dataSource === 'parameter' && field.parameterConfig?.paramName) {

          const paramName = field.parameterConfig.paramName;
          let paramValue = pageParams[paramName];

          if (paramValue && typeof paramValue === 'object' && field.parameterConfig.fieldName) {

            const fieldName = field.parameterConfig.fieldName;
            const paramValueObj = paramValue as Record<string, any>;
            if (fieldName in paramValueObj) {
              paramValue = paramValueObj[fieldName];
            } else {
              paramValue = undefined;
            }
          }

          const isValidParameterValue = (value: any): boolean => {
            return value !== null && value !== undefined && value !== '' && value !== 'null';
          };

          if (isValidParameterValue(paramValue)) {
            updatedValue = String(paramValue);
          } else if (field.parameterConfig.defaultValue !== undefined) {
            updatedValue = String(field.parameterConfig.defaultValue);
          } else {

            updatedValue = formDataRef.current[field.name] || '';
          }
        } else {

          if (loadedData[field.name] !== undefined && loadedData[field.name] !== null) {
            updatedValue = String(loadedData[field.name]);
          } else if (rawParams[field.name] !== undefined && rawParams[field.name] !== null) {
            updatedValue = String(rawParams[field.name]);
          } else if (pageParams[field.name] !== undefined && pageParams[field.name] !== null) {
            updatedValue = String(pageParams[field.name]);
          } else if (field.defaultValue !== undefined && field.defaultValue !== null) {
            updatedValue = String(field.defaultValue);
          }
        }

        formDataRef.current[field.name] = updatedValue;

        const container = containerRef.current;
        if (container) {
          const hiddenInput = container.querySelector(`input[type="hidden"][data-field="${field.name}"]`) as HTMLInputElement;
          if (hiddenInput) {
            hiddenInput.value = updatedValue;
          }
        }

        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const isDisplayMode = stableConfig.mode === 'display';

      if (isDisplayMode) {

        const displayElement = container.querySelector(`div[data-field="${field.name}"][data-display-mode="true"]`);
        if (displayElement) {
          let displayValue = '';
          let isJsonField = false;

          if (newValue !== undefined && newValue !== null && newValue !== '') {
            switch (field.type) {
              case 'checkbox':
              case 'switch':

                const parseSwitchValueForUpdate = (value: any): boolean => {
                  if (value === undefined || value === null) return false;
                  if (typeof value === 'boolean') return value;
                  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
                  if (typeof value === 'number') return value === 1;
                  return Boolean(value);
                };
                displayValue = parseSwitchValueForUpdate(newValue) ? t('form.yes', 'Yes') : t('form.no', 'No');
                break;
              case 'select':

                const selectedOption = field.options?.find((option: any) => option.value === newValue);
                displayValue = selectedOption ? selectedOption.label : String(newValue);
                break;
              case 'date':

                try {
                  const date = new Date(newValue);
                  displayValue = date.toLocaleDateString('zh-CN');
                } catch {
                  displayValue = String(newValue);
                }
                break;
              case 'json':

                displayElement.innerHTML = jsonToTableHtml(newValue);
                isJsonField = true;
                break;
              default:
                displayValue = String(newValue);
            }
          } else {
            displayValue = t('form.no_data', 'No Data');
          }

          if (!isJsonField) {
            displayElement.textContent = displayValue;

            if (displayValue === t('form.no_data', 'No Data')) {
              displayElement.className = displayElement.className.replace(/text-neutral-400.*?(?=\s|$)/g, '') + ' text-neutral-400 dark:text-neutral-500';
            } else {
              displayElement.className = displayElement.className.replace(/text-neutral-400.*?(?=\s|$)/g, '');
            }
          }

        }
      } else {

        let inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;

        if (field.type === 'checkbox') {
          inputElement = container.querySelector(`input[type="checkbox"][id="${field.name}"]`);
          if (inputElement) {
            (inputElement as HTMLInputElement).checked = Boolean(newValue);
          }
        } else if (field.type === 'select') {
          inputElement = container.querySelector(`select[data-field="${field.name}"]`);
          if (inputElement) {
            (inputElement as HTMLSelectElement).value = String(newValue);
          }
        } else if (field.type === 'textarea') {
          inputElement = container.querySelector(`textarea[data-field="${field.name}"]`);
          if (inputElement) {
            (inputElement as HTMLTextAreaElement).value = String(newValue);
          }
        } else if (field.type === 'json') {

          const readonlyElement = container.querySelector(`div[data-field="${field.name}"][data-display-mode="true"]`);
          if (readonlyElement) {

            readonlyElement.innerHTML = jsonToTableHtml(newValue);
          } else {

            inputElement = container.querySelector(`textarea[data-field="${field.name}"]`);
            if (inputElement) {

              let jsonDisplayValue = '';
              try {
                if (newValue !== undefined && newValue !== null && newValue !== '') {
                  if (typeof newValue === 'object') {

                    jsonDisplayValue = JSON.stringify(newValue, null, 2);
                  } else if (typeof newValue === 'string') {

                    try {
                      const parsed = JSON.parse(newValue);
                      jsonDisplayValue = JSON.stringify(parsed, null, 2);
                    } catch {

                      jsonDisplayValue = newValue;
                    }
                  } else {

                    jsonDisplayValue = JSON.stringify(newValue, null, 2);
                  }
                } else {
                  jsonDisplayValue = '';
                }
              } catch (error) {

                console.warn('[FormRenderer] JSON serialization failed:', error);
                jsonDisplayValue = String(newValue || '');
              }
              (inputElement as HTMLTextAreaElement).value = jsonDisplayValue;
            }
          }
        } else {
          inputElement = container.querySelector(`input[data-field="${field.name}"]`);
          if (inputElement) {
            (inputElement as HTMLInputElement).value = String(newValue);
          }
        }

      }
    });

    const actionsForVisibility = stableConfig.actions as FormAction[] | undefined;
    if (
      Array.isArray(actionsForVisibility) &&
      actionsForVisibility.some((a) => normalizeFormActionVisibilityClauses(a).length > 0)
    ) {
      setActionVisibilityTick((t) => t + 1);
    }
  }, [loadedData, pageParamsVisibilitySignature, dataIsLoading, databaseLoading]);

  const renderActionButtons = () => {
    if (!config.actions || config.actions.length === 0 || config.mode === 'display') {
      return null;
    }

    const visibleActions = (config.actions as FormAction[]).filter((action) =>
      evaluateFormActionVisibility(action, {
        formValues: formDataRef.current as Record<string, unknown>,
        parameters: pageParams as Record<string, unknown>,
      })
    );

    if (visibleActions.length === 0) {
      return null;
    }

    const actionsLayout = config.layoutConfig?.actionsLayout;
    const position = actionsLayout?.position || 'bottom';
    const alignment = actionsLayout?.alignment || 'right';
    const isFloating = actionsLayout?.floating || false;

    let containerClass = 'form-actions';
    let innerClass = isNarrowFlow ? 'flex flex-wrap gap-2 w-full' : 'flex space-x-2 w-full';
    const containerStyle: React.CSSProperties = {};

    if (isFloating) {

      if (position === 'top') {
        containerClass = `form-actions sticky top-0 ${Z_INDEX_CLASSES.STICKY_HEADER} w-full bg-white dark:bg-neutral-800 shadow-sm border-b border-neutral-200 dark:border-neutral-700 p-4`;
      } else {
        containerClass = `form-actions sticky bottom-0 ${Z_INDEX_CLASSES.STICKY_HEADER} w-full bg-white dark:bg-neutral-800 shadow-sm border-t border-neutral-200 dark:border-neutral-700 p-4`;
      }
    } else {

      containerClass += ' w-full flex-shrink-0';
      if (position === 'top') {

        containerClass += '';
        innerClass += '';
      } else {

        containerClass += ' p-6 pt-0';
        innerClass += ' pt-4 border-t border-neutral-200 dark:border-neutral-700';
      }
    }

    if (alignment === 'left') {
      innerClass += ' justify-start';
    } else {

      innerClass += ' justify-end';
    }

    const buttons = (
      <div className={containerClass} style={containerStyle} data-action-visibility-rev={actionVisibilityTick}>
        <div className={innerClass}>
          {visibleActions.map((action: any, index: number) => {
            const iconElement = action.icon ? renderIcon(action.icon) : null;
            const actionId = action.id || action.label || `action-${index}`;
            const currentActionLoading = isButtonLoading(actionId);

            return (
              <Button
                key={action.id || index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleActionClick(action);
                }}
                disabled={currentActionLoading || dataIsLoading}
                variant={
                  action.variant === 'destructive' || action.type === 'deleteDataset'
                    ? 'destructive'
                    : action.variant === 'outline'
                      ? 'outline'
                      : action.variant === 'secondary'
                        ? 'secondary'
                        : 'default'
                }
              >
                {currentActionLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!currentActionLoading && iconElement && (
                  <span className="mr-2 flex items-center">
                    {iconElement}
                  </span>
                )}
                {currentActionLoading ? t('form.processing', 'Processing...') : action.label}
              </Button>
            );
          })}
        </div>
      </div>
    );

    return { buttons, position };
  };

  const renderIcon = (iconName: string) => {
    return renderLucideIcon(iconName, "w-4 h-4");
  };

  const handleActionClick = useCallback(async (action: any) => {

    if (action.config.requireValidation) {
      let isValid = true;
      const hasRequiredFields = config.fields?.some((f: any) => f.required);

      for (const field of config.fields || []) {
        if (field.required) {
          const value = formDataRef.current[field.name];

          let domValue = value;
          const container = containerRef.current;
          if (container) {
            let inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;

            if (field.type === 'checkbox') {
              inputElement = container.querySelector(`input[type="checkbox"][id="${field.name}"]`);
              if (inputElement) {
                domValue = (inputElement as HTMLInputElement).checked;
              }
            } else if (field.type === 'select') {
              inputElement = container.querySelector(`select[data-field="${field.name}"]`);
              if (inputElement) {
                domValue = (inputElement as HTMLSelectElement).value;
              }
            } else if (field.type === 'textarea') {
              inputElement = container.querySelector(`textarea[data-field="${field.name}"]`);
              if (inputElement) {
                domValue = (inputElement as HTMLTextAreaElement).value;
              }
            } else {
              inputElement = container.querySelector(`input[data-field="${field.name}"]`);
              if (inputElement) {
                domValue = (inputElement as HTMLInputElement).value;
              }
            }
          }

          const finalValue = domValue !== undefined ? domValue : value;
          const isEmpty = finalValue === undefined ||
            finalValue === null ||
            finalValue === '' ||
            (typeof finalValue === 'string' && finalValue.trim() === '') ||
            (field.type === 'checkbox' && !finalValue);

          if (isEmpty) {
            addFieldErrorStyle(field.name, field.type);
            toast({
              variant: "destructive",
              title: t('form.validation_failed', 'Form Validation Failed'),
              description: t('form.field_required', '{{field}} is required', { field: field.label }),
            });
            isValid = false;
            break;
          }
        }
      }

      if (!isValid) {
        return;
      }

      clearAllFieldErrors();
    }

    if (action.config.requireConfirmation) {

      const actionType = action.type === 'updateDataset' ? 'update' :
        action.type === 'insertDataset' ? 'insert' :
          action.type === 'deleteDataset' ? 'delete' :
            'custom';

      setConfirmDialog({
        isOpen: true,
        action,
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false, action: null, onConfirm: null });
          await executeOperationRef.current?.(action);
        },
        actionType
      });
      return;
    }

    await executeOperationRef.current?.(action);
  }, [config.fields]);

  const executeOperation = useCallback(async (action: FormAction) => {
    const actionId = action.id || action.label || 'unknown-action';
    setButtonLoading(actionId, true);

    try {

      const container = containerRef.current;
      if (container) {
        config.fields?.forEach((field: any) => {
          let inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null = null;
          let value: any;

          const isHidden = field.hidden || field.mode === 'hidden';

          if (isHidden) {

            inputElement = container.querySelector(`input[type="hidden"][data-field="${field.name}"]`) ||
              container.querySelector(`input[data-field="${field.name}"]`);
            value = inputElement ? (inputElement as HTMLInputElement).value : '';

          } else if (field.type === 'checkbox') {
            inputElement = container.querySelector(`input[type="checkbox"][id="${field.name}"]`);
            value = inputElement ? (inputElement as HTMLInputElement).checked : false;
          } else if (field.type === 'select') {
            inputElement = container.querySelector(`select[data-field="${field.name}"]`);
            value = inputElement ? (inputElement as HTMLSelectElement).value : '';
          } else if (field.type === 'textarea') {
            inputElement = container.querySelector(`textarea[data-field="${field.name}"]`);
            value = inputElement ? (inputElement as HTMLTextAreaElement).value : '';
          } else {
            inputElement = container.querySelector(`input[data-field="${field.name}"]`);
            value = inputElement ? (inputElement as HTMLInputElement).value : '';
          }

          if (value !== undefined) {
            formDataRef.current[field.name] = value;
          }
        });
      }

      const parameters = {
        ...rawParams,          
        ...pageParams,         
        ...loadedData,         
        ...formDataRef.current 
      };

      switch (action.type) {
        case 'updateDataset': {
          const { updateDatasetData } = await import('@/app/services/workbenchApi');
          const updateConfig = action.config.updateDataset;
          if (!updateConfig) {
            throw new Error(t('form.update_config_not_found', 'Update configuration not found'));
          }

          let targetDatasetId: string;
          if (typeof updateConfig.targetDatasetId === 'string') {
            targetDatasetId = updateConfig.targetDatasetId;
          } else if (updateConfig.targetDatasetId?.source === 'parameter' && updateConfig.targetDatasetId.paramName) {
            targetDatasetId = String(parameters[updateConfig.targetDatasetId.paramName] || '');
          } else if (updateConfig.targetDatasetId?.source === 'static' && updateConfig.targetDatasetId.value) {
            targetDatasetId = updateConfig.targetDatasetId.value;
          } else {
            throw new Error(t('form.invalid_dataset_id_config', 'Invalid dataset ID configuration'));
          }

          if (!targetDatasetId) {
            throw new Error(t('form.no_valid_dataset_id_found', 'No valid dataset ID found'));
          }

          const updateConditions: Record<string, any> = {};
          Object.entries(updateConfig.updateConditions || {}).forEach(([fieldName, condition]: [string, any]) => {
            let conditionValue: any;

            switch (condition.source) {
              case 'parameter':
                conditionValue = parameters[condition.value];
                break;
              case 'field':
              case 'column':

                conditionValue = formDataRef.current[condition.value] !== undefined
                  ? formDataRef.current[condition.value]
                  : loadedData[condition.value] !== undefined
                    ? loadedData[condition.value]
                    : parameters[condition.value]; 

                break;
              case 'static':
                conditionValue = condition.value;
                break;
              default:
                conditionValue = condition.value;
            }

            const isValidConditionValue = (value: any, fieldName: string): boolean => {
              if (value === undefined || value === null) {
                return false;
              }

              if (typeof value === 'string' && value.trim() === '') {
                return false;
              }

              const fieldConfig = config.fields?.find((f: any) => f.name === fieldName);
              if (fieldConfig?.fieldType?.includes('INT') || fieldConfig?.fieldType?.includes('FLOAT')) {

                return value !== '' && !isNaN(Number(value));
              }

              return true;
            };

            if (isValidConditionValue(conditionValue, fieldName)) {
              updateConditions[fieldName] = conditionValue;

            }
          });

          const updateData: Record<string, any> = {};
          Object.entries(updateConfig.updateFields || {}).forEach(([fieldName, field]: [string, any]) => {
            let fieldValue: any;
            switch (field.source) {
              case 'parameter':
                fieldValue = parameters[field.value];

                break;
              case 'column':
              case 'field':

                let domValue: any = undefined;
                if (formDataRef.current[field.value] === undefined || formDataRef.current[field.value] === '') {
                  const domElement = containerRef.current?.querySelector(`[data-field="${field.value}"]`) as HTMLInputElement;
                  if (domElement) {

                    if (domElement.type === 'checkbox') {
                      domValue = domElement.checked;
                    } else if (domElement.tagName.toLowerCase() === 'select') {
                      domValue = (domElement as unknown as HTMLSelectElement).value;
                    } else if (domElement.getAttribute('role') === 'switch') {

                      const isChecked = domElement.getAttribute('aria-checked') === 'true';

                      const targetFieldType = field.fieldType;
                      if (targetFieldType === 'VARCHAR' || targetFieldType === 'TEXT' || targetFieldType === 'CHAR') {
                        domValue = isChecked ? '1' : '0'; 
                      } else if (targetFieldType === 'BOOL') {
                        domValue = isChecked; 
                      } else {
                        domValue = isChecked ? 1 : 0; 
                      }

                    } else if (domElement.tagName.toLowerCase() === 'textarea') {
                      domValue = (domElement as unknown as HTMLTextAreaElement).value;
                    } else {
                      domValue = domElement.value;
                    }

                  } else {

                    const switchContainer = containerRef.current?.querySelector(`div[role="switch"][data-field="${field.value}"]`);
                    if (switchContainer) {
                      const isChecked = switchContainer.getAttribute('aria-checked') === 'true';

                      const targetFieldType = field.fieldType;
                      if (targetFieldType === 'VARCHAR' || targetFieldType === 'TEXT' || targetFieldType === 'CHAR') {
                        domValue = isChecked ? '1' : '0'; 
                      } else if (targetFieldType === 'BOOL') {
                        domValue = isChecked; 
                      } else {
                        domValue = isChecked ? 1 : 0; 
                      }

                    }
                  }
                }

                if (formDataRef.current[field.value] !== undefined && formDataRef.current[field.value] !== '') {
                  fieldValue = formDataRef.current[field.value];
                } else if (domValue !== undefined && domValue !== '') {
                  fieldValue = domValue; 
                } else if (loadedData[field.value] !== undefined && loadedData[field.value] !== '') {
                  fieldValue = loadedData[field.value];
                } else if (parameters[field.value] !== undefined && parameters[field.value] !== '') {
                  fieldValue = parameters[field.value];
                } else {

                  fieldValue = formDataRef.current[field.value] !== undefined
                    ? formDataRef.current[field.value]
                    : domValue !== undefined
                      ? domValue
                      : loadedData[field.value] !== undefined
                        ? loadedData[field.value]
                        : parameters[field.value] || '';
                }

                break;
              case 'static':
                fieldValue = field.value;
                break;
              case 'computed':

                fieldValue = evaluateComputedExpression(field.value, currentUser || undefined);
                break;
              default:
                fieldValue = field.value;
            }

            if (fieldValue !== undefined && fieldValue !== null) {
              updateData[fieldName] = fieldValue;
            }

          });

          const fieldTypes: Record<string, string> = {};
          config.fields?.forEach((field: any) => {
            if (field.fieldType) {
              fieldTypes[field.name] = field.fieldType;
            }
          });

          const filterConditions = buildParameterFilterString(updateConditions, fieldTypes);

          const response = await updateDatasetData(targetDatasetId, filterConditions, updateData);

          if (response?.success) {
            toast({
              title: t('form.update_success', 'Update Success'),
              description: action.config.successMessage || t('form.update_success_description', 'Data has been successfully updated')
            });

            broadcastFormSuccess('updateDataset', formDataRef.current, {
              ...action.config,
              targetDatasetId,
              updateData,
              filterConditions
            });
          } else {
            throw new Error(response?.message || action.config.errorMessage || t('form.update_failed', 'Update Failed'));
          }
          break;
        }

        case 'insertDataset': {
          const { insertDatasetData } = await import('@/app/services/workbenchApi');
          const insertConfig = action.config.insertDataset;
          if (!insertConfig) {
            throw new Error(t('form.insert_config_not_found', 'Insert configuration not found'));
          }

          let targetDatasetId: string;
          if (typeof insertConfig.targetDatasetId === 'string') {
            targetDatasetId = insertConfig.targetDatasetId;
          } else if (insertConfig.targetDatasetId?.source === 'parameter' && insertConfig.targetDatasetId.paramName) {
            targetDatasetId = String(parameters[insertConfig.targetDatasetId.paramName] || '');
          } else if (insertConfig.targetDatasetId?.source === 'static' && insertConfig.targetDatasetId.value) {
            targetDatasetId = insertConfig.targetDatasetId.value;
          } else {
            throw new Error(t('form.invalid_dataset_id_config', 'Invalid dataset ID configuration'));
          }

          if (!targetDatasetId) {
            throw new Error(t('form.no_valid_dataset_id_found', 'No valid dataset ID found'));
          }

          const insertData: Record<string, any> = {};
          Object.entries(insertConfig.insertFields || {}).forEach(([fieldName, field]: [string, any]) => {
            let fieldValue: any;
            switch (field.source) {
              case 'parameter':
                fieldValue = parameters[field.value];
                break;
              case 'column':
              case 'field':
                fieldValue = formDataRef.current[field.value] !== undefined
                  ? formDataRef.current[field.value]
                  : loadedData[field.value];
                break;
              case 'static':
                fieldValue = field.value;
                break;
              case 'computed':

                fieldValue = evaluateComputedExpression(field.value, currentUser || undefined);

                break;
              default:
                fieldValue = field.value;
            }

            if (fieldValue !== undefined && fieldValue !== null) {
              insertData[fieldName] = fieldValue;
            }
          });

          const response = await insertDatasetData(targetDatasetId, [insertData]);
          if (response?.success) {
            toast({
              title: t('form.create_success', 'Create Success'),
              description: action.config.successMessage || t('form.create_success_description', 'Data has been successfully created')
            });

            broadcastFormSuccess('insertDataset', formDataRef.current, {
              ...action.config,
              targetDatasetId,
              insertData
            });
          } else {
            throw new Error(response?.message || action.config.errorMessage || t('form.create_failed', 'Create Failed'));
          }
          break;
        }

        case 'deleteDataset': {
          const { deleteDatasetData } = await import('@/app/services/workbenchApi');
          const deleteConfig = action.config.deleteDataset;
          if (!deleteConfig) {
            throw new Error(t('form.delete_config_not_found', 'Delete configuration not found'));
          }

          let targetDatasetId: string;
          if (typeof deleteConfig.targetDatasetId === 'string') {
            targetDatasetId = deleteConfig.targetDatasetId;
          } else if (deleteConfig.targetDatasetId?.source === 'parameter' && deleteConfig.targetDatasetId.paramName) {
            targetDatasetId = String(parameters[deleteConfig.targetDatasetId.paramName] || '');
          } else if (deleteConfig.targetDatasetId?.source === 'static' && deleteConfig.targetDatasetId.value) {
            targetDatasetId = deleteConfig.targetDatasetId.value;
          } else {
            throw new Error(t('form.invalid_dataset_id_config', 'Invalid dataset ID configuration'));
          }

          if (!targetDatasetId) {
            throw new Error(t('form.no_valid_dataset_id_found', 'No valid dataset ID found'));
          }

          const deleteConditions: Record<string, any> = {};
          Object.entries(deleteConfig.deleteConditions || {}).forEach(([fieldName, condition]: [string, any]) => {
            let conditionValue: any;
            switch (condition.source) {
              case 'parameter':
                conditionValue = parameters[condition.value];
                break;
              case 'field':
              case 'column':
                conditionValue = formDataRef.current[condition.value] !== undefined
                  ? formDataRef.current[condition.value]
                  : loadedData[condition.value];
                break;
              case 'static':
                conditionValue = condition.value;
                break;
              default:
                conditionValue = condition.value;
            }

            if (conditionValue !== undefined && conditionValue !== null) {
              deleteConditions[fieldName] = conditionValue;
            }
          });

          const fieldTypes: Record<string, string> = {};
          config.fields?.forEach((field: any) => {
            if (field.fieldType) {
              fieldTypes[field.name] = field.fieldType;
            }
          });

          const filterConditions = buildParameterFilterString(deleteConditions, fieldTypes);
          const response = await deleteDatasetData(targetDatasetId, filterConditions);

          if (response?.success) {
            toast({
              title: t('form.delete_success', 'Delete Success'),
              description: action.config.successMessage || t('form.delete_success_description', 'Data has been successfully deleted')
            });

            broadcastFormSuccess('deleteDataset', formDataRef.current, {
              ...action.config,
              targetDatasetId,
              filterConditions
            });
          } else {
            throw new Error(response?.message || action.config.errorMessage || t('form.delete_failed', 'Delete Failed'));
          }
          break;
        }

        case 'download': {
          const downloadConfig = action.config.downloadConfig;
          if (!downloadConfig || !downloadConfig.fileUrlField) {
            throw new Error(t('form.download_config_incomplete', 'Download configuration incomplete: missing file URL field'));
          }

          const fileUrl = parameters[downloadConfig.fileUrlField];
          if (!fileUrl) {

            showErrorDialog(
              t('form.cannot_get_download_url', 'Cannot Get Download URL'),
              t('form.field_empty', 'Field "{{field}}" is empty', { field: downloadConfig.fileUrlField }),
              [
                t('form.check_field_filled', 'Is this field filled?'),
                t('form.check_field_config', 'Is the field configuration correct?'), 
                t('form.check_data_loaded', 'Is the data loaded correctly?')
              ],
              'field'
            );

            toast({
              variant: "destructive",
              title: t('form.download_failed', 'File Download Failed'), 
              description: t('form.no_file_url_in_field', 'No file URL in field "{{field}}"', { field: downloadConfig.fileUrlField })
            });

            return; 
          }

          let validatedUrl: URL;
          try {
            validatedUrl = new URL(fileUrl);

            if (!validatedUrl.pathname || validatedUrl.pathname === '/') {
              throw new Error(t('form.invalid_url_path', 'Invalid URL path'));
            }

            if (!['http:', 'https:', 'data:', 'blob:'].includes(validatedUrl.protocol)) {
              throw new Error(t('form.unsupported_protocol', 'Unsupported protocol type'));
            }

          } catch (urlError) {
            console.error('[FormRenderer][download] URL validation failed:', urlError);

            const errorMessage = urlError instanceof Error ? urlError.message : t('form.unknown_error', 'Unknown error');
            showErrorDialog(
              t('form.invalid_file_url', 'Invalid File URL'),
              t('form.cannot_download_file', 'Cannot download file, current URL: {{url}}', { url: fileUrl }),
              [
                t('form.check_url_format', 'Is the URL format correct?'),
                t('form.check_file_path_exists', 'Does the file path exist?'),
                t('form.check_protocol_supported', 'Is the protocol supported (http/https/data/blob)?'),
                t('form.error_details', 'Error details: {{error}}', { error: errorMessage })
              ],
              'url'
            );

            toast({
              variant: "destructive", 
              title: t('form.download_failed', 'File Download Failed'),
              description: t('form.invalid_file_url_check', 'Invalid file URL, please check if the file path is correct')
            });

            return; 
          }

          let fileName: string | undefined;
          if (downloadConfig.fileNameField) {

            fileName = parameters[downloadConfig.fileNameField];
          }

          if (!fileName) {
            try {
              const pathname = validatedUrl.pathname;
              const segments = pathname.split('/');
              let extractedName = segments[segments.length - 1];

              if (extractedName) {
                try {

                  if (extractedName.includes('?')) {
                    extractedName = extractedName.split('?')[0];
                  }

                  let decodedName = extractedName;

                  if (extractedName.includes('%')) {
                    try {
                      decodedName = decodeURIComponent(extractedName);
                    } catch (decodeError) {
                      console.warn('[FormRenderer][download] URL decode failed; using fallback decode:', decodeError);

                      decodedName = extractedName.replace(/%([0-9A-F]{2})/g, (match, hex) => {
                        try {
                          return String.fromCharCode(parseInt(hex, 16));
                        } catch {
                          return match;
                        }
                      });
                    }
                  }

                  extractedName = decodedName;
                } catch (error) {
                  console.warn('[FormRenderer][download] Filename handling failed; using raw name:', error);
                }
              }

              fileName = extractedName || 'download';

            } catch (error) {
              console.error('[FormRenderer][download] Failed to extract filename:', error);
              fileName = 'download';
            }
          }

          if (!fileName || fileName.trim() === '') {
            fileName = 'download';
          }

          const sanitizeFileName = (name: string): string => {
            try {

              const sanitized = name.replace(/[<>:"/\\|?*]/g, '_');

              if (/[\u4e00-\u9fa5]/.test(sanitized)) {

                try {

                  const encoded = encodeURIComponent(sanitized);
                  const decoded = decodeURIComponent(encoded);
                  if (decoded === sanitized) {
                    void decoded;
                  } else {
                    console.warn('[FormRenderer][download] CJK filename encoding check failed; keeping original name');
                  }
                } catch (encodingError) {
                  console.warn('[FormRenderer][download] CJK filename encoding test failed:', encodingError);
                }
              }

              return sanitized;
            } catch (error) {
              console.warn('[FormRenderer][download] Filename sanitization failed:', error);
              return name;
            }
          };

          fileName = sanitizeFileName(fileName);

          try {

            let finalFileName = fileName;
            if (finalFileName && !finalFileName.includes('.')) {

              const urlPath = validatedUrl.pathname;
              const urlExtMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
              if (urlExtMatch) {
                finalFileName = `${finalFileName}.${urlExtMatch[1]}`;
              } else {

                finalFileName = `${finalFileName}.docx`;
              }
            }

            await baseApiClient.downloadFile(validatedUrl.href, finalFileName);

            toast({
              title: t('form.download_success', 'Download Success'),
              description: action.config.successMessage || t('form.download_started', 'File "{{name}}" download has started', { name: finalFileName })
            });

          } catch (apiError) {
            console.error('[FormRenderer][download] baseApiClient download failed:', apiError);

            try {

              const link = document.createElement('a');
              link.href = validatedUrl.href;
              link.download = fileName;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              toast({
                title: t('form.download_started_title', 'Download Started'),
                description: t('form.download_rename_hint', 'If the file name is incorrect, please rename it to: "{{name}}.docx"', { name: fileName }),
                duration: 8000
              });

            } catch (fallbackError) {
              console.error('[FormRenderer][download] Direct link download failed:', fallbackError);

              const errorMessage = fallbackError instanceof Error ? fallbackError.message : t('form.unknown_error', 'Unknown error');
              showErrorDialog(
                t('form.download_failed', 'File Download Failed'),
                t('form.download_error_occurred', 'An error occurred during file download'),
                [
                  t('form.network_connection_issue', 'Network connection issue'),
                  t('form.file_server_unreachable', 'File server is unreachable'),
                  t('form.browser_security_restriction', 'Browser security restriction'),
                  t('form.file_deleted_or_moved', 'File has been deleted or moved'),
                  t('form.error_details', 'Error details: {{error}}', { error: errorMessage }),
                  t('form.retry_or_contact_admin', 'Please try again later or contact administrator')
                ],
                'file'
              );

              return; 
            }
          }

          break;
        }

        case 'taskCall': {
          const taskCallConfig = action.config.taskCall;
          if (!taskCallConfig) {
            throw new Error(t('form.task_call_config_not_found', 'Task call configuration not found'));
          }

          let taskId: string;
          if (typeof taskCallConfig.taskId === 'string') {
            taskId = taskCallConfig.taskId;
          } else if (taskCallConfig.taskId?.source === 'parameter' && taskCallConfig.taskId.paramName) {
            taskId = String(parameters[taskCallConfig.taskId.paramName] || '');
          } else if (taskCallConfig.taskId?.source === 'static' && taskCallConfig.taskId.value) {
            taskId = taskCallConfig.taskId.value;
          } else {
            throw new Error(t('form.invalid_task_id_config', 'Invalid task ID configuration'));
          }

          if (!taskId) {
            throw new Error(t('form.no_valid_task_id_found', 'No valid task ID found'));
          }

          try {

            const schema = await getTaskSchema(taskId);

            const taskParams: Record<string, unknown> = {};
            const parameterMapping = taskCallConfig.parameterMapping || {};

            type ParamMapping = { source: 'static' | 'formField' | 'parameter'; value: string };
            Object.entries(parameterMapping).forEach(([paramId, mapping]) => {
              const m = mapping as ParamMapping;
              let value: unknown;

              switch (m.source) {
                case 'static':

                  value = m.value;
                  break;

                case 'formField':

                  value = formDataRef.current[m.value];
                  break;

                case 'parameter':

                  value = parameters[m.value] || pageParams[m.value];
                  break;

                default:
                  value = undefined;
              }

              if (value !== undefined) {
                taskParams[paramId] = value;
              }
            });

            const missingParams = checkTaskParamsFilled(taskParams, schema);

            if (missingParams.length > 0) {

              setTaskParamsDialog({
                isOpen: true,
                taskId,
                initialParams: taskParams,
                action
              });
              return; 
            } else {

              const apiFormData = formatTaskParamsForAPI(taskParams);
              const result = await executeTask(taskId, apiFormData);

              toast({
                title: t('form.task_execution_success', 'Task Execution Success'),
                description: taskCallConfig.successMessage || t('form.task_submitted_success', 'Task has been successfully submitted')
              });

              broadcastFormSuccess('taskCall', formDataRef.current, {
                ...action.config,
                taskId,
                result
              });
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t('form.task_execution_failed', 'Task Execution Failed');
            toast({
              variant: "destructive",
              title: t('form.task_execution_failed', 'Task Execution Failed'),
              description: taskCallConfig.errorMessage || errorMessage
            });
            throw error;
          }
          break;
        }

        case 'taskExecute': {
          const taskExecuteConfig = action.config.taskExecute;
          if (!taskExecuteConfig) {
            throw new Error(t('form.task_call_config_not_found', 'Task call configuration not found'));
          }

          let taskId: string;
          if (typeof taskExecuteConfig.taskId === 'string') {
            taskId = taskExecuteConfig.taskId;
          } else if (taskExecuteConfig.taskId?.source === 'parameter' && taskExecuteConfig.taskId.paramName) {
            taskId = String(parameters[taskExecuteConfig.taskId.paramName] || '');
          } else if (taskExecuteConfig.taskId?.source === 'static' && taskExecuteConfig.taskId.value) {
            taskId = taskExecuteConfig.taskId.value;
          } else {
            throw new Error(t('form.invalid_task_id_config', 'Invalid task ID configuration'));
          }

          if (!taskId) {
            throw new Error(t('form.no_valid_task_id_found', 'No valid task ID found'));
          }

          const taskParams: Record<string, unknown> = {};
          const parameterMapping = taskExecuteConfig.parameterMapping || {};

          Object.entries(parameterMapping).forEach(([paramId, mapping]) => {
            let value: unknown;

            switch (mapping.source) {
              case 'static':
                value = mapping.value;
                break;
              case 'formField':
                value = formDataRef.current[mapping.value];
                break;
              case 'column':

                value = undefined;
                break;
              case 'parameter':
                value = parameters[mapping.value] || pageParams[mapping.value];
                break;
              case 'database':
                value = mapping.value;
                break;
              default:
                value = undefined;
            }

            if (value !== undefined) {
              taskParams[paramId] = value;
            }
          });

          setTaskParamsDialog({
            isOpen: true,
            taskId,
            initialParams: taskParams,
            action
          });
          return;

          break;
        }

        default:
          toast({
            variant: "destructive",
            title: t('form.operation_failed', 'Operation Failed'),
            description: t('form.unsupported_operation_type', 'Unsupported operation type: {{type}}', { type: action.type })
          });
      }
    } catch (error: unknown) {
      console.error('[FormRenderer] executeOperation failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('form.operation_failed', 'Operation Failed');
      toast({
        variant: "destructive",
        title: t('form.operation_failed', 'Operation Failed'),
        description: action.config.errorMessage || errorMessage,
      });
    } finally {
      setButtonLoading(actionId, false);
    }
  }, [pageParams, config.fields, loadedData, currentUser]);

  executeOperationRef.current = executeOperation;

  const shouldShowTitle = (config.displayConfig?.showTitle !== false) && config.title;

  const actionButtonsData = renderActionButtons();
  const actionsLayout = config.layoutConfig?.actionsLayout;
  const isFloating = actionsLayout?.floating || false;

  useEffect(() => {
    const updateTopOffset = () => {
      if (formContainerRef.current && config.heightMode === 'fullscreen') {
        const rect = formContainerRef.current.getBoundingClientRect();
        setFormTopOffset(rect.top + window.scrollY);
      }
    };

    if (config.heightMode === 'fullscreen') {

      updateTopOffset();

      const handleResize = () => updateTopOffset();
      const handleScroll = () => updateTopOffset();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);

      const resizeObserver = new ResizeObserver(updateTopOffset);
      if (formContainerRef.current) {
        resizeObserver.observe(formContainerRef.current.parentElement || document.body);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, [config.heightMode]);

  useEffect(() => {

    const styleId = `form-responsive-grid-${componentId}`;
    let existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      existingStyle = document.createElement('style');
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }

    existingStyle.textContent = `
      /* 表单响应式网格样式 */
      .form-renderer[data-component-id="${componentId}"] .form-content.grid {
        grid-template-columns: var(--grid-columns-desktop, repeat(2, minmax(0, 1fr)));
      }
      
      /* 平板断点：768px及以下 */
      @media (max-width: 768px) {
        .form-renderer[data-component-id="${componentId}"] .form-content.grid {
          grid-template-columns: var(--grid-columns-tablet, repeat(2, minmax(0, 1fr))) !important;
        }
      }
      
      /* 移动设备断点：480px及以下 */
      @media (max-width: 480px) {
        .form-renderer[data-component-id="${componentId}"] .form-content.grid {
          grid-template-columns: var(--grid-columns-mobile, 1fr) !important;
        }
        
        /* 在移动设备上确保字段容器不被挤压 */
        .form-renderer[data-component-id="${componentId}"] .field-container {
          min-width: 0;
          width: 100%;
        }
        
        /* 在移动设备上重置网格区域，让字段按原始顺序显示 */
        .form-renderer[data-component-id="${componentId}"] .field-container {
          grid-area: auto !important;
        }
      }
      
      /* 超小屏幕：320px及以下，强制单列 */
      @media (max-width: 320px) {
        .form-renderer[data-component-id="${componentId}"] .form-content.grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    return () => {

      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, [componentId]);

  const getFormBodyClass = () => {
    const heightMode = config.heightMode || 'auto';

    if (fillCell || (heightMode === 'fixed' && config.height) || heightMode === 'fullscreen') {
      return 'form-body p-6 flex-1 overflow-y-auto custom-scrollbar';
    } else {
      return 'form-body p-6';
    }
  };

  const getFormBodyStyle = () => {
    const heightMode = config.heightMode || 'auto';

    if (fillCell || (heightMode === 'fixed' && config.height) || heightMode === 'fullscreen') {
      return { minHeight: '0' };
    } else {
      return { minHeight: 'auto' };
    }
  };

  return (
    <>
      <div
        ref={formContainerRef}
        className="w-full form-renderer rounded-xl border bg-card text-card-foreground shadow flex flex-col"
        style={resolveFormContainerStyle(config, fillCell, formTopOffset)}
        data-component-id={componentId}
      >
        {shouldShowTitle && (
          <div className="form-header p-6 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="form-title text-lg font-semibold text-neutral-900 dark:text-neutral-100">{config.title}</h3>
                {config.description && (
                  <p className="form-description text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {config.description}
                  </p>
                )}
              </div>
              {!isFloating && actionsLayout?.position === 'top' && (
                <div className="flex-shrink-0 self-start">
                  {actionButtonsData?.buttons}
                </div>
              )}
            </div>
          </div>
        )}

        {!shouldShowTitle && !isFloating && actionsLayout?.position === 'top' && (
          <div className="p-6 pb-2 flex-shrink-0">
            {actionButtonsData?.buttons}
          </div>
        )}

        <div
          className={getFormBodyClass()}
          style={getFormBodyStyle()}
        >
          <div ref={containerRef} />
        </div>

        {!isFloating && actionsLayout?.position !== 'top' && actionButtonsData?.buttons}

        {isFloating && actionButtonsData?.buttons}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, onConfirm: null })}
        onConfirm={() => confirmDialog.onConfirm?.()}
        title={confirmDialog.action?.config.confirmMessage ? undefined : undefined}
        message={confirmDialog.action?.config.confirmMessage}
        buttonType={confirmDialog.action?.variant as any}
        buttonLabel={confirmDialog.action?.label}
        actionType={confirmDialog.actionType}
        loading={isAnyButtonLoading()}
      />

      <Dialog
        open={taskParamsDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTaskParamsDialog({ isOpen: false, taskId: '', initialParams: undefined, action: undefined });
            setIsFormTaskExecuting(false);
          }
        }}
      >
        <DialogContent
          style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }}
          className="px-8 overflow-y-auto"
        >
          {taskParamsDialog.taskId && taskParamsDialog.action && (() => {
            const taskExecuteConfig = taskParamsDialog.action.config.taskExecute;
            const isTaskNormalMode = (taskExecuteConfig?.interactiveMode || 'professional') === 'normal';

            const actionButtonLabel = taskParamsDialog.action?.label?.trim();

            return (
              <>
                <DialogHeader className="pb-6">
                  <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                    {taskParamsDialog.action?.icon ? (
                      <span
                        className="inline-flex shrink-0 items-center text-neutral-600 dark:text-neutral-400"
                        aria-hidden
                      >
                        {renderIcon(taskParamsDialog.action.icon)}
                      </span>
                    ) : null}
                    <span className="min-w-0 break-words">
                      {actionButtonLabel ||
                        t('form.execute_task', 'Execute Task')}
                    </span>
                    {isFormTaskExecuting && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                    )}
                  </DialogTitle>
                  <DialogDescription className={isTaskNormalMode ? 'sr-only' : undefined}>
                    {isTaskNormalMode
                      ? t('form:task_execute_dialog_a11y', 'Fill in task parameters, then click execute')
                      : t(
                          'common:action_form_dialog.description',
                          'Please fill in the following information to complete the operation'
                        )}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-2 px-2">
                    <TaskInputRenderer
                    ref={taskParamsInputRef}
                    taskId={taskParamsDialog.taskId}
                    initialParams={taskParamsDialog.initialParams}
                    mappingContext={{
                      formFieldValues: formDataRef.current as Record<string, unknown>,
                      pageParams: { ...rawParams, ...pageParams } as Record<string, unknown>
                    }}
                    embedded
                    embeddedFieldLayout="plain"
                    interactiveMode={taskExecuteConfig?.interactiveMode || 'professional'}
                    submitButtonPlacement={isTaskNormalMode ? 'dialogFooter' : 'default'}
                    isDialogExecuting={isFormTaskExecuting}
                    onDialogExecutingChange={setIsFormTaskExecuting}
                    parameterConfig={{

                      parameterMapping: Object.fromEntries(
                        Object.entries(
                          (taskExecuteConfig?.parameterMapping ?? {}) as Record<
                            string,
                            {
                              source: 'static' | 'formField' | 'parameter' | 'database' | 'column';
                              value: string;
                              labelText?: string;
                              requiredInTaskInput?: boolean;
                              sortOrder?: number;
                            }
                          >
                        ).filter(([, val]) => val.source !== 'column')
                      ),
                    }}
                    onSuccess={async (result) => {
                      const action = taskParamsDialog.action;
                      if (action) {
                        const execCfg = action.config.taskExecute;
                        toast({
                          title: t('form.task_execution_success', 'Task Execution Success'),
                          description: execCfg?.successMessage || t('form.task_submitted_success', 'Task has been successfully submitted')
                        });

                        broadcastFormSuccess('taskExecute', formDataRef.current, {
                          ...action.config,
                          taskId: taskParamsDialog.taskId,
                          result
                        });
                      }
                      setTaskParamsDialog({ isOpen: false, taskId: '', initialParams: undefined, action: undefined });
                      setIsFormTaskExecuting(false);
                    }}
                    onError={(error) => {
                      const action = taskParamsDialog.action;
                      if (action) {
                        const execCfg = action.config.taskExecute;
                        toast({
                          variant: 'destructive',
                          title: t('form.task_execution_failed', 'Task Execution Failed'),
                          description: execCfg?.errorMessage || error.message
                        });
                      }
                    }}
                  />
                  </div>
                </ScrollArea>

                <DialogFooter className="flex justify-end space-x-3 border-t border-neutral-200 px-2 pt-6 dark:border-neutral-700">
                  <Button
                    variant="outline"
                    type="button"
                    className="px-6"
                    onClick={() => {
                      setTaskParamsDialog({ isOpen: false, taskId: '', initialParams: undefined, action: undefined });
                      setIsFormTaskExecuting(false);
                    }}
                    disabled={isFormTaskExecuting}
                  >
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  {isTaskNormalMode && (
                    <Button
                      type="button"
                      className="min-w-[100px] px-6"
                      onClick={() => void taskParamsInputRef.current?.submitTask()}
                      disabled={isFormTaskExecuting}
                    >
                      {isFormTaskExecuting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t('renderers:task_input.execute_task', 'Execute Task')}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ 
          isOpen: false, 
          title: undefined, 
          message: undefined, 
          details: [], 
          actionType: 'error-general' 
        })}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
        actionType={errorDialog.actionType}
        mode="alert"
      />
    </>
  );
};

export default FormRenderer;
