import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Z_INDEX_CLASSES, MODAL_DIMENSIONS } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { Label } from '@genispace/shared-ui';

import { Switch } from '@genispace/shared-ui';
import { Textarea } from '@genispace/shared-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@genispace/shared-ui';
import { Loader2, Database, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@genispace/shared-utils';
import { toast } from '@genispace/shared-ui';
import { queryDatasetData } from '@/app/services/workbenchApi';
import { useTranslation } from 'react-i18next';

import { evaluateExpression } from '@/utils/dataConfigUtils';
import {
  parseInsertConfigToFormFields,
  parseUpdateConfigToFormFields,
  findTreeDisplayField,
  validateRequiredFields,
  type TreeFormField,
  type DatasourceOption
} from '@/utils/treeFormUtils';
import type { InsertDatasetConfig, UpdateDatasetConfig } from '../../types';
import type { ColumnConfig } from '../editor/common/types';

interface TreeFormDialogProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  insertConfig?: InsertDatasetConfig;
  updateConfig?: UpdateDatasetConfig;
  treeColumns: ColumnConfig[];
  selectedNode?: any; 
  selectedParent?: any; 
  parentKey?: string; 
  availableParameters?: Array<{ label: string; value: string; type?: string }>;
}

export const TreeFormDialog: React.FC<TreeFormDialogProps> = ({
  isOpen,
  mode,
  onClose,
  onSubmit,
  insertConfig,
  updateConfig,
  treeColumns,
  selectedNode,
  selectedParent,
  parentKey = 'p_id',
  availableParameters = []
}) => {
  const { t } = useTranslation('common');
  const [formFields, setFormFields] = useState<TreeFormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [datasourceOptions, setDatasourceOptions] = useState<Record<string, DatasourceOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [datasourceLoading, setDatasourceLoading] = useState<Record<string, boolean>>({});
  const [datasourceSearchQuery, setDatasourceSearchQuery] = useState<Record<string, string>>({});
  const [datasourcePopoverOpen, setDatasourcePopoverOpen] = useState<Record<string, boolean>>({});
  const [datasourcePagination, setDatasourcePagination] = useState<Record<string, { page: number; hasMore: boolean; total: number }>>({});

  const searchTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const searchInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [isComposing, setIsComposing] = useState<Record<string, boolean>>({});

  const [dropdownPositions, setDropdownPositions] = useState<Record<string, { top: number; left: number; width: number }>>({});

  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getParametersObject = useCallback(() => {
    const params: Record<string, any> = {};
    availableParameters.forEach(param => {
      params[param.value] = param.label; 
    });
    return params;
  }, [availableParameters]);

  const calculateDropdownPosition = useCallback((fieldName: string) => {
    const inputElement = searchInputRefs.current[fieldName];
    if (!inputElement) return;

    const rect = inputElement.getBoundingClientRect();
    const position = {
      top: rect.bottom + window.scrollY + 4, 
      left: rect.left + window.scrollX,
      width: rect.width
    };

    setDropdownPositions(prev => ({ ...prev, [fieldName]: position }));
  }, []);

  useEffect(() => {

    if (!isOpen) {
      return;
    }

    const config = mode === 'add' ? insertConfig : updateConfig;
    if (!config) {
      setFormFields([]);
      return;
    }

    const fields = mode === 'add' 
      ? parseInsertConfigToFormFields(config as InsertDatasetConfig, treeColumns)
      : parseUpdateConfigToFormFields(config as UpdateDatasetConfig, treeColumns);

    setFormFields(fields);

    const initialData: Record<string, any> = {};

    if (mode === 'edit' && selectedNode) {

      fields.forEach(field => {
        if (selectedNode[field.name] !== undefined) {
          initialData[field.name] = selectedNode[field.name];
        }
      });

      treeColumns.forEach(column => {
        const fieldName = column.dataIndex;
        if (selectedNode[fieldName] !== undefined && initialData[fieldName] === undefined) {
          initialData[fieldName] = selectedNode[fieldName];
          }
      });

      if (selectedNode.id !== undefined && initialData.id === undefined) {
        initialData.id = selectedNode.id;
      }
    } else {

      fields.forEach(field => {
        if (field.config.source === 'static') {
          initialData[field.name] = field.config.value;
        } else if (field.config.source === 'computed') {

          const computedValue = evaluateExpression(
            field.config.value,
            initialData,
            getParametersObject()
          );
          initialData[field.name] = computedValue;
        }
      });

      if (selectedParent && parentKey) {
        initialData[parentKey] = selectedParent.id;
      }
    }

    setFormData(initialData);

    loadDatasourceOptions(fields);
  }, [isOpen, insertConfig, updateConfig, mode, treeColumns, selectedNode, selectedParent, parentKey, getParametersObject]);

  const loadDatasourceOptions = async (fields: TreeFormField[]) => {

    const datasourceFields = fields.filter(f => f.type === 'datasource-select');

    if (datasourceFields.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const optionsMap: Record<string, DatasourceOption[]> = {};

      for (const field of datasourceFields) {
        const { datasourceConfig } = field.config;
        if (!datasourceConfig) continue;

        const requestParams = {
          outputFields: [datasourceConfig.valueField, datasourceConfig.labelField],
          filter: datasourceConfig.filter,
          limit: 1000 
        };

        const response = await queryDatasetData(datasourceConfig.datasetId, requestParams);

        if (response && response.success) {

          let dataArray: any[] = [];

          if (Array.isArray((response as any).data)) {

            dataArray = (response as any).data;
          } else if ((response as any).data && Array.isArray((response as any).data.data)) {

            dataArray = (response as any).data.data;
          } else {
            console.warn(` 无法解析数据结构:`, (response as any).data);
          }

          if (dataArray.length > 0) {
            const options: DatasourceOption[] = dataArray.map((record: any) => ({
              value: record[datasourceConfig.valueField],
              label: record[datasourceConfig.labelField] || record[datasourceConfig.valueField],
              record 
            }));
            optionsMap[field.name] = options;
          } else {
            console.warn(` 数据数组为空`);
            optionsMap[field.name] = [];
          }
        } else {
          console.warn(` API调用失败:`, field.name, {
            response,
            hasResponse: !!response,
            isSuccess: response?.success
          });
          optionsMap[field.name] = [];
        }
      }

      setDatasourceOptions(optionsMap);
    } catch (error) {
      console.error('加载关联数据源失败:', error);
      toast({
        title: t('tree_form_dialog.load_options_failed', 'Load Options Failed'),
        description: t('tree_form_dialog.cannot_load_datasource_options', 'Unable to load datasource options'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const searchDatasourceOptions = useCallback(async (
    fieldName: string, 
    datasourceConfig: any, 
    searchQuery: string = '', 
    page: number = 1,
    pageSize: number = 20
  ) => {

    if (!datasourceConfig) return;

    setDatasourceLoading(prev => ({ ...prev, [fieldName]: true }));

    try {

      const buildFilterCondition = (originalFilter: string, searchQuery: string, labelField: string) => {
        const conditions = [];

        if (originalFilter) {
          conditions.push(`(${originalFilter})`);
        }

        if (searchQuery) {
          conditions.push(`${labelField} LIKE '%${searchQuery}%'`);
        }

        return conditions.length > 0 ? conditions.join(' AND ') : '';
      };

      const requestParams = {
        outputFields: [datasourceConfig.valueField, datasourceConfig.labelField],
        filter: buildFilterCondition(datasourceConfig.filter, searchQuery, datasourceConfig.labelField),
        limit: pageSize,
        offset: (page - 1) * pageSize
      };

      const response = await queryDatasetData(datasourceConfig.datasetId, requestParams);

      if (response && response.success) {
        let dataArray: any[] = [];
        let total = 0;

        if (Array.isArray((response as any).data)) {
          dataArray = (response as any).data;
          total = dataArray.length;
        } else if ((response as any).data && Array.isArray((response as any).data.data)) {
          dataArray = (response as any).data.data;
          total = (response as any).data.total || dataArray.length;
        }

        if (dataArray.length > 0) {
          const newOptions: DatasourceOption[] = dataArray.map((record: any) => ({
            value: record[datasourceConfig.valueField],
            label: record[datasourceConfig.labelField] || record[datasourceConfig.valueField],
            record
          }));

          setDatasourceOptions(prev => ({
            ...prev,
            [fieldName]: page === 1 ? newOptions : [...(prev[fieldName] || []), ...newOptions]
          }));

          setDatasourcePagination(prev => ({
            ...prev,
            [fieldName]: {
              page,
              hasMore: (page * pageSize) < total,
              total
            }
          }));

        } else {
          if (page === 1) {
            setDatasourceOptions(prev => ({ ...prev, [fieldName]: [] }));
          }
        }
      }

    } catch (error) {
      console.error('搜索关联数据源选项失败:', error);
    } finally {
      setDatasourceLoading(prev => ({ ...prev, [fieldName]: false }));
    }
  }, []);

  const restoreFocus = useCallback((fieldName: string) => {

    setTimeout(() => {
      const inputElement = searchInputRefs.current[fieldName];
      if (inputElement && document.activeElement !== inputElement) {
        inputElement.focus();
      }
    }, 0);
  }, []);

  const handleDebouncedSearch = useCallback((fieldName: string, query: string, datasourceConfig: any) => {

    if (searchTimeoutRef.current[fieldName]) {
      clearTimeout(searchTimeoutRef.current[fieldName]);
    }

    searchTimeoutRef.current[fieldName] = setTimeout(async () => {

      await searchDatasourceOptions(fieldName, datasourceConfig, query, 1);

      calculateDropdownPosition(fieldName);
      setTimeout(() => {
        setDatasourcePopoverOpen(prev => ({ ...prev, [fieldName]: true }));
      }, 0);

      restoreFocus(fieldName);
    }, 300);
  }, [searchDatasourceOptions, restoreFocus]);

  const handleSearchInputChange = useCallback((fieldName: string, query: string, datasourceConfig: any, isComposingInput = false) => {

    setDatasourceSearchQuery(prev => ({ ...prev, [fieldName]: query }));

    if (!query.trim()) {
      setDatasourceOptions(prev => ({ ...prev, [fieldName]: [] }));
      setDatasourcePopoverOpen(prev => ({ ...prev, [fieldName]: false }));
      return;
    }

    calculateDropdownPosition(fieldName);

    setTimeout(() => {
      setDatasourcePopoverOpen(prev => ({ ...prev, [fieldName]: true }));
    }, 0);

    if (isComposingInput) {
      return;
    }

    handleDebouncedSearch(fieldName, query, datasourceConfig);
  }, [handleDebouncedSearch, calculateDropdownPosition]);

  const forceCloseDropdown = useCallback((fieldName: string) => {
    setDatasourcePopoverOpen(prev => ({ ...prev, [fieldName]: false }));

    setDropdownPositions(prev => ({ ...prev, [fieldName]: { top: 0, left: 0, width: 0 } }));
  }, []);

  const loadMoreOptions = useCallback((fieldName: string, datasourceConfig: any) => {
    const pagination = datasourcePagination[fieldName];
    const searchQuery = datasourceSearchQuery[fieldName] || '';

    if (pagination && pagination.hasMore) {
      searchDatasourceOptions(fieldName, datasourceConfig, searchQuery, pagination.page + 1);
    }
  }, [searchDatasourceOptions, datasourcePagination, datasourceSearchQuery]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Element;

    const isOutside = !target.closest('[data-dropdown-container]');

    if (isOutside) {
      setDatasourcePopoverOpen({});
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, handleClickOutside]);

  useLayoutEffect(() => {

    Object.keys(datasourceSearchQuery).forEach(fieldName => {
      const inputElement = searchInputRefs.current[fieldName];
      const isPopoverOpen = datasourcePopoverOpen[fieldName];

      if (isPopoverOpen && inputElement && document.activeElement !== inputElement) {
        inputElement.focus();
      }
    });
  }, [datasourceSearchQuery, datasourcePopoverOpen]);

  useEffect(() => {
    if (!isOpen) {

      setDatasourceOptions({});
      setDatasourceSearchQuery({});
      setDatasourcePopoverOpen({});
      setDatasourcePagination({});
      setIsComposing({}); 
      setDropdownPositions({}); 

      Object.values(searchTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      searchTimeoutRef.current = {};
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePositionUpdate = () => {
      Object.keys(datasourcePopoverOpen).forEach(fieldName => {
        if (datasourcePopoverOpen[fieldName]) {
          calculateDropdownPosition(fieldName);
        }
      });
    };

    const handleScroll = () => {
      handlePositionUpdate();
    };

    const handleResize = () => {
      handlePositionUpdate();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [datasourcePopoverOpen, calculateDropdownPosition]);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Node;

      Object.keys(datasourcePopoverOpen).forEach(fieldName => {
        if (datasourcePopoverOpen[fieldName]) {
          const dropdownElement = dropdownRefs.current[fieldName];
          const inputElement = searchInputRefs.current[fieldName];

          if (dropdownElement && 
              !dropdownElement.contains(target) && 
              inputElement && 
              !inputElement.contains(target)) {
            forceCloseDropdown(fieldName);
          }
        }
      });
    };

    document.addEventListener('mousedown', handleGlobalClick, false);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, false);
    };
  }, [datasourcePopoverOpen, forceCloseDropdown]);

  useEffect(() => {
    return () => {

      const timeouts = searchTimeoutRef.current;
      Object.values(timeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: value };

      const field = formFields.find(f => f.name === fieldName);
      if (field && field.type === 'datasource-select') {
        const options = datasourceOptions[fieldName] || [];
        const selectedOption = options.find(opt => opt.value === value);

        if (selectedOption && field.config.datasourceConfig) {
          const { labelField } = field.config.datasourceConfig;

          const nameField = findTreeDisplayField(formFields);
          if (nameField && nameField.name !== fieldName) {
            const displayValue = selectedOption.record[labelField] || selectedOption.label;
            newData[nameField.name] = displayValue;

          }
        }
      }

      return newData;
    });

    setValidationErrors([]);
  }, [formFields, datasourceOptions]);

  const renderFormField = (field: TreeFormField) => {
    const value = formData[field.name];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={t('tree_form_dialog.please_enter_field', 'Please enter {{field}}', { field: field.label })}
            required={field.required}
            className="h-8"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={t('tree_form_dialog.please_enter_field', 'Please enter {{field}}', { field: field.label })}
            required={field.required}
            className="h-8"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={t('tree_form_dialog.please_enter_field', 'Please enter {{field}}', { field: field.label })}
            required={field.required}
            className="min-h-[60px]"
          />
        );

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? t('tree_form_dialog.yes', 'Yes') : t('tree_form_dialog.no', 'No')}
            </span>
          </div>
        );

      case 'datasource-select': {
        const options = datasourceOptions[field.name] || [];
        const isLoadingOptions = datasourceLoading[field.name] || false;
        const pagination = datasourcePagination[field.name];
        const searchQuery = datasourceSearchQuery[field.name] || '';

        const selectedOption = options.find(opt => opt.value === value);
        const selectedLabel = selectedOption ? selectedOption.label : value;

        return (
          <div className="space-y-2">
            <div className="relative" data-dropdown-container>
              <div className="flex items-center space-x-2">
                <Input
                  ref={(el) => {
                    searchInputRefs.current[field.name] = el;
                  }}
                  type="text"
                  placeholder={t('tree_form_dialog.search_and_select_field', 'Search and select {{field}}...', { field: field.label })}
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    const currentComposing = isComposing[field.name] || false;

                    if (field.config.datasourceConfig) {

                      e.stopPropagation();
                      handleSearchInputChange(field.name, query, field.config.datasourceConfig, currentComposing);
                    }
                  }}
                  onCompositionStart={() => {
                    setIsComposing(prev => ({ ...prev, [field.name]: true }));
                  }}
                  onCompositionEnd={(e) => {
                    setIsComposing(prev => ({ ...prev, [field.name]: false }));

                    const query = (e.target as HTMLInputElement).value;
                    if (query.trim() && field.config.datasourceConfig) {
                      handleSearchInputChange(field.name, query, field.config.datasourceConfig, false);
                    }
                  }}
                  onFocus={() => {

                    calculateDropdownPosition(field.name);

                    if (!options.length && field.config.datasourceConfig && !searchQuery) {
                      searchDatasourceOptions(field.name, field.config.datasourceConfig, '', 1);
                    }

                    setTimeout(() => {
                      setDatasourcePopoverOpen(prev => ({ ...prev, [field.name]: true }));
                    }, 0);
                  }}
                  onBlur={() => {

                    setTimeout(() => {

                      const dropdownElement = dropdownRefs.current[field.name];
                      const activeElement = document.activeElement;

                      if (!dropdownElement || !dropdownElement.contains(activeElement)) {
                        setDatasourcePopoverOpen(prev => ({ ...prev, [field.name]: false }));
                      }
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {

                      setDatasourcePopoverOpen(prev => ({ ...prev, [field.name]: false }));
                      e.stopPropagation();
                    }
                  }}
                  className="h-8"
                  disabled={isLoadingOptions}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setDatasourcePopoverOpen(prev => ({ ...prev, [field.name]: !prev[field.name] }));
                    if (!options.length && field.config.datasourceConfig) {
                      searchDatasourceOptions(field.name, field.config.datasourceConfig, '', 1);
                    }
                  }}
                  disabled={isLoadingOptions}
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </div>

              {selectedLabel !== undefined && selectedLabel !== null && selectedLabel !== '' && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="w-3 h-3 mr-2 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selectedLabel}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        ID: {value}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    onClick={() => handleFieldChange(field.name, '')}
                  >
                    ×
                  </Button>
                </div>
              )}

            </div>

            {pagination && (
              <div className="text-xs text-muted-foreground">
                {t('tree_form_dialog.displaying_items', 'Displaying {{current}} / {{total}} items', { current: options.length, total: pagination.total })}
                {searchQuery && ` ${t('tree_form_dialog.search_query', '(Search: "{{query}}")', { query: searchQuery })}`}
              </div>
            )}

          </div>
        );
      }

      case 'computed-display': {
        const computedValue = evaluateExpression(
          field.config.value,
          formData,
          getParametersObject()
        );

        return (
          <div className="space-y-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded border border-purple-200 dark:border-purple-800">
              <div className="text-xs text-purple-700 dark:text-purple-300">
                {t('tree_form_dialog.expression', 'Expression')}: {field.config.value}
              </div>
              <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                {t('tree_form_dialog.preview', 'Preview')}: {computedValue}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <Input
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="h-8"
          />
        );
    }
  };

  const handleSubmit = useCallback(() => {

    const validation = validateRequiredFields(formFields, formData);
    if (!validation.isValid) {
      setValidationErrors(validation.missingFields);
      toast({
        title: t('tree_form_dialog.please_fill_required_fields', 'Please Fill Required Fields'),
        description: t('tree_form_dialog.missing_fields', 'Missing: {{fields}}', { fields: validation.missingFields.join(', ') }),
        variant: "destructive"
      });
      return;
    }

    const config = mode === 'add' ? insertConfig : updateConfig;
    if (!config) return;

    try {

      onSubmit(formData);
    } catch (error) {
      console.error('构建数据失败:', error);
      toast({
        title: t('tree_form_dialog.data_processing_failed', 'Data Processing Failed'),
        description: t('tree_form_dialog.cannot_build_submit_data', 'Unable to build submit data'),
        variant: "destructive"
      });
    }
  }, [formFields, formData, insertConfig, updateConfig, mode, onSubmit]);

  if (!isOpen) return null;

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    const hasOpenDropdown = Object.values(datasourcePopoverOpen).some(isOpen => isOpen);
    if (hasOpenDropdown) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.xl.width, maxHeight: MODAL_DIMENSIONS.xl.maxHeight }} className="overflow-visible flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-lg font-semibold">
            {mode === 'add' ? t('tree_form_dialog.add_node', 'Add Node') : t('tree_form_dialog.edit_node', 'Edit Node')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' ? t('tree_form_dialog.fill_form_to_add_node', 'Fill in the form to add a new tree node') : t('tree_form_dialog.modify_selected_node', 'Modify the selected node information')}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="flex-shrink-0 mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('tree_form_dialog.please_fill_required_fields_with_colon', 'Please fill required fields: {{fields}}', { fields: validationErrors.join(', ') })}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 flex-1 overflow-y-auto min-h-0 px-1 custom-scrollbar">
          {formFields.length > 0 ? (
            formFields
              .filter(field => {

                if (mode === 'add' && parentKey && field.name === parentKey) {
                  return false;
                }

                if (field.config.source === 'computed') {
                  return false;
                }

                return true; 
              })
              .map(field => (
              <div key={field.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={cn(
                    "text-sm font-medium",
                    field.required && "text-red-600"
                  )}>
                    {field.label}
                    {field.required && " *"}
                  </Label>
                </div>

                {renderFormField(field)}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t('tree_form_dialog.no_field_config', 'No field configuration')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="min-w-[80px]">
            {t('tree_form_dialog.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || formFields.length === 0}
            className="min-w-[80px]"
          >
            {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {mode === 'add' ? t('tree_form_dialog.add', 'Add') : t('tree_form_dialog.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {formFields
        .filter(field => field.type === 'datasource-select')
        .map(field => {
          const isPopoverOpen = datasourcePopoverOpen[field.name] || false;
          const options = datasourceOptions[field.name] || [];
          const isLoadingOptions = datasourceLoading[field.name] || false;
          const pagination = datasourcePagination[field.name];
          const searchQuery = datasourceSearchQuery[field.name] || '';
          const position = dropdownPositions[field.name];
          const value = formData[field.name];

          if (!isPopoverOpen || !position || position.top <= 0 || position.left <= 0) {
            return null;
          }

          return createPortal(
            <div
              key={`dropdown-${field.name}`}
              ref={(el) => {
                dropdownRefs.current[field.name] = el;
              }}
              className={`fixed ${Z_INDEX_CLASSES.MODAL} bg-card border border-border rounded-xl shadow-lg max-h-60`}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                minWidth: '200px',
                maxHeight: '240px', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                position: 'fixed',
                isolation: 'isolate', 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                scrollBehavior: 'smooth' 
              }}
              data-portal-dropdown={field.name} 
              onMouseEnter={() => {
                if (isPopoverOpen) {
                  setDatasourcePopoverOpen(prev => ({ ...prev, [field.name]: true }));
                }
              }}
              onMouseDown={(e) => {

                e.stopPropagation();
              }}
              onClick={(e) => {

                e.stopPropagation();
              }}
              onWheel={(e) => {

                e.stopPropagation();

              }}
            >
              {isLoadingOptions && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 mx-auto mb-2 animate-spin" />
                  {t('tree_form_dialog.searching', 'Searching...')}
                </div>
              )}

              {!isLoadingOptions && options.length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchQuery ? t('tree_form_dialog.no_results_found', 'No results found for "{{query}}"', { query: searchQuery }) : t('tree_form_dialog.no_option_data', 'No option data')}
                  {field.config.datasourceConfig && (
                    <div className="text-xs mt-1">
                      {t('tree_form_dialog.dataset', 'Dataset')}: {field.config.datasourceConfig.datasetId}
                    </div>
                  )}
                </div>
              )}

              {options.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                    value === option.value && "bg-blue-50 dark:bg-blue-950"
                  )}
                  style={{ 
                    userSelect: 'none',
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 10001
                  }}
                  onMouseDown={(e) => {

                    e.preventDefault();
                    e.stopPropagation();

                    try {
                      handleFieldChange(field.name, option.value);
                      setDatasourceSearchQuery(prev => ({ ...prev, [field.name]: '' }));
                      forceCloseDropdown(field.name);

                      const inputElement = searchInputRefs.current[field.name];
                      if (inputElement) {
                        inputElement.blur();
                      }

                    } catch (error) {
                      console.error(` 选项选择失败:`, error);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <Database className="w-3 h-3 mr-2" />
                    <div>
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {option.value}
                      </div>
                    </div>
                  </div>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))}

              {pagination && pagination.hasMore && !isLoadingOptions && (
                <div className="p-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    style={{ userSelect: 'none' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      try {
                        loadMoreOptions(field.name, field.config.datasourceConfig);
                      } catch (error) {
                        console.error(` 加载更多失败:`, error);
                      }
                    }}
                  >
                    <Loader2 className="w-3 h-3 mr-1" />
                    {t('tree_form_dialog.load_more', 'Load More ({{count}} items)', { count: pagination.total - options.length })}
                  </Button>
                </div>
              )}
            </div>,
            document.body
          );
        })}
    </Dialog>
  );
};
