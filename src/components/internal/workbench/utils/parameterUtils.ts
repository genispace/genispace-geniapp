import i18n from '@/locales/i18n';
import {
  resolveDateRangeDefault,
  applyConfiguredTimeToDateRange,
  formatDateRangeStartForParams,
  formatDateRangeEndForParams
} from '@/utils/filterPanelDateRangeUtils';

export interface CustomField {
  fieldName: string;
  displayName: string;
}

export interface ComponentEmitConfig {
  componentId: string;
  componentType: string;
  triggers: Record<string, { enabled: boolean }>;
  customEmitFields?: Record<string, CustomField[]>;
}

export function collectAvailableParameters(pageComponents: any[]): Array<{
  value: string;
  label: string;
  source: string;
  category: 'builtin' | 'custom';
}> {
  const parameters: Array<{
    value: string;
    label: string;
    source: string;
    category: 'builtin' | 'custom';
  }> = [];

  pageComponents.forEach(component => {
    if (component.parameterConfig?.enableCommunication && component.parameterConfig?.enableEmit) {
      const componentType = component.type;
      const componentId = component.id;

      if (componentType === 'Table') {
        const triggers = component.parameterConfig?.triggers || {};

        if (triggers['onRowSelect']?.enabled) {

          const tableTitle = component.title || component.name || component.props?.title || componentId;

          const columns = component.props?.columns || [];

          columns.forEach((column: any) => {
            if (column.dataIndex) {
              const fieldName = column.dataIndex;
              const fieldLabel = column.title || fieldName;
              const paramName = `table_${componentId}_selectedRowData_${fieldName}`;

              const displayLabel = fieldLabel === fieldName 
                ? `${fieldLabel} (from Table: ${tableTitle})`
                : `${fieldLabel} (${fieldName}) (from Table: ${tableTitle})`;

              parameters.push({
                value: paramName,
                label: displayLabel,
                source: componentId,
                category: 'builtin'
              });
            }
          });
        }
      }

      if (componentType === 'Tree') {

        const builtinParams = [
          { key: 'selectedTreeNode', label: i18n.t('common:parameters.selected_tree_node', 'Selected tree node (object)') }
        ];

        builtinParams.forEach(param => {
          parameters.push({
            value: param.key,
            label: `${param.label} ${i18n.t('common:parameters.from', '(from: {{componentId}})', { componentId })}`,
            source: componentId,
            category: 'builtin'
          });
        });
      }

      const customEmitFields = component.parameterConfig?.customEmitFields || {};
      Object.entries(customEmitFields).forEach(([triggerKey, fields]) => {
        (fields as CustomField[]).forEach(field => {
          if (field.fieldName && field.displayName) {
            const paramName = `selected_${field.fieldName}`;
            parameters.push({
              value: paramName,
              label: `${field.displayName} ${i18n.t('common:parameters.from', '(from: {{componentId}})', { componentId })}`,
              source: componentId,
              category: 'custom'
            });

          }
        });
      });
    }
  });

  return parameters;
}

export function isCustomFieldParameter(paramName: string): boolean {
  return paramName.startsWith('selected_');
}

export function extractFieldNameFromParameter(paramName: string): string | null {
  if (isCustomFieldParameter(paramName)) {
    return paramName.replace('selected_', '');
  }
  return null;
}

export function inferParameterType(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  const trimmed = value.trim();
  if (
    trimmed !== '' &&
    !isNaN(Number(trimmed)) &&
    // Only coerce values that round-trip exactly, so ID-like strings
    // (leading zeros like '00123', or values beyond Number.MAX_SAFE_INTEGER
    // that lose precision) are preserved as strings.
    String(Number(trimmed)) === trimmed
  ) {
    return Number(trimmed);
  }

  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  return value;
}

export function parseParameters(params: Record<string, any>): Record<string, any> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const parsed: Record<string, any> = {};

  Object.entries(params).forEach(([key, value]) => {
    parsed[key] = inferParameterType(value);
  });

  return parsed;
}

export function extractParametersFromFilters(
  parameterFilters: Array<{ parameterName?: string; enabled?: boolean }>
): string[] {
  const parameters = new Set<string>();

  if (!parameterFilters || !Array.isArray(parameterFilters)) {
    return [];
  }

  parameterFilters.forEach(filter => {
    if (filter.parameterName && filter.enabled !== false) {
      parameters.add(filter.parameterName);

    }
  });

  return Array.from(parameters);
}

export function extractParametersFromString(
  conditionString: string
): string[] {
  if (!conditionString || typeof conditionString !== 'string') {
    return [];
  }

  const parameters: string[] = [];

  const regex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(conditionString)) !== null) {
    const paramName = match[1].trim();
    if (paramName && !parameters.includes(paramName)) {
      parameters.push(paramName);
    }
  }

  return parameters;
}

export function mergeListenParameters(
  manualListenParameters: string[],
  autoListenParameters: string[]
): {
  finalListenParameters: string[];
  manualOnly: string[];
  autoOnly: string[];
} {
  const finalSet = new Set<string>();
  const manualSet = new Set(manualListenParameters || []);
  const autoSet = new Set(autoListenParameters || []);

  (manualListenParameters || []).forEach(param => finalSet.add(param));
  (autoListenParameters || []).forEach(param => finalSet.add(param));

  return {
    finalListenParameters: Array.from(finalSet),
    manualOnly: (manualListenParameters || []).filter(p => !autoSet.has(p)),
    autoOnly: (autoListenParameters || []).filter(p => !manualSet.has(p))
  };
}

// Page-param keys a filterSheet filter emits — mirrors FilterPanelRenderer's collectFilterSheetKeys.
// A filterSheet emits ONE page param per section / tab / input (its own emit key), NOT the parent
// filter key (the parent has no single value). Keep this in sync with the renderer's emit set.
function collectFilterSheetParamKeys(filter: any): string[] {
  const keys: string[] = [];
  (filter.sections || []).forEach((sec: any) => {
    if (sec.kind === 'chipMultiSelect') {
      if (sec.key) keys.push(sec.key);
    } else if (sec.kind === 'tabbedChip' || sec.kind === 'layeredStore') {
      (sec.tabs || []).forEach((tab: any) => { if (tab.key) keys.push(tab.key); });
      if (sec.tags?.key) keys.push(sec.tags.key);
    } else if (sec.kind === 'textInputs') {
      (sec.inputs || []).forEach((inp: any) => { if (inp.key) keys.push(inp.key); });
    }
  });
  return keys;
}

export function collectFilterPanelParameters(pageComponents: any[]): Array<{
  value: string;
  label: string;
  source: string;
  type: string;
  parent?: string;
}> {
  const parameters: Array<{
    value: string;
    label: string;
    source: string;
    type: string;
    parent?: string;
  }> = [];

  pageComponents.forEach(component => {
    if (component.type === 'FilterPanel') {
      const componentId = component.id;
      const filters = component.props?.filters || [];

      filters.forEach((filter: any) => {

        const filterLabel = filter.label || filter.key;

        if (filter.type === 'dateRange') {

          const startTime = `${componentId}_${filter.key}.startTime`;
          const endTime = `${componentId}_${filter.key}.endTime`;

          parameters.push({
            value: startTime,
            label: i18n.t('parameter_utils.date_range_start_time', '{{filterLabel}} - Start Time (from: {{componentId}})', {
              filterLabel: filterLabel,
              componentId
            }),
            source: componentId,
            type: 'date',
            parent: `${componentId}_${filter.key}`
          });

          parameters.push({
            value: endTime,
            label: i18n.t('parameter_utils.date_range_end_time', '{{filterLabel}} - End Time (from: {{componentId}})', {
              filterLabel: filterLabel,
              componentId
            }),
            source: componentId,
            type: 'date',
            parent: `${componentId}_${filter.key}`
          });
        } else if (filter.type === 'filterSheet') {
          // A filterSheet emits one page param per section/tab/input — NOT the parent key.
          collectFilterSheetParamKeys(filter).forEach((subKey) => {
            parameters.push({
              value: `${componentId}_${subKey}`,
              label: `${subKey} (from: ${componentId})`,
              source: componentId,
              type: 'string',
              parent: `${componentId}_${filter.key}`
            });
          });
        } else if (filter.type === 'presetDateRange') {
          // presetDateRange emits the preset key + the resolved start/end dates.
          ([
            { suffix: '', type: filter.type || 'string' },
            { suffix: 'Start', type: 'date' },
            { suffix: 'End', type: 'date' }
          ] as Array<{ suffix: string; type: string }>).forEach(({ suffix, type }) => {
            const paramKey = `${filter.key}${suffix}`;
            parameters.push({
              value: `${componentId}_${paramKey}`,
              label: `${filterLabel}${suffix ? ` ${suffix}` : ''} (from: ${componentId})`,
              source: componentId,
              type
            });
          });
        } else {

          const paramName = `${componentId}_${filter.key}`;
          parameters.push({
            value: paramName,
            label: `${filterLabel} (from: ${componentId})`,
            source: componentId,
            type: filter.type || 'string'
          });
        }
      });
    }
  });

  return parameters;
}

export function extractFilterPanelDefaultValues(
  pageComponents: any[],
  filterPanelId?: string
): Record<string, any> {
  const defaultValues: Record<string, any> = {};

  pageComponents.forEach(component => {

    if (component.type !== 'FilterPanel') {
      return;
    }

    if (filterPanelId && component.id !== filterPanelId) {
      return;
    }

    const componentId = component.id;
    const filters = component.props?.filters || [];

    filters.forEach((filter: any) => {
      if (filter.type === 'dateRange') {
        const dateRange = resolveDateRangeDefault(filter);
        if (!dateRange) {
          return;
        }
        const merged = applyConfiguredTimeToDateRange(filter, dateRange);
        const startTimeParam = `${componentId}_${filter.key}.startTime`;
        const endTimeParam = `${componentId}_${filter.key}.endTime`;

        if (merged.from) {
          defaultValues[startTimeParam] = formatDateRangeStartForParams(filter, new Date(merged.from));
        }
        if (merged.to) {
          defaultValues[endTimeParam] = formatDateRangeEndForParams(filter, new Date(merged.to));
        }
        return;
      }

      if (filter.defaultValue === undefined || filter.defaultValue === null) {
        return;
      }

      const paramName = `${componentId}_${filter.key}`;
      defaultValues[paramName] = filter.defaultValue;
    });
  });

  return defaultValues;
}

export const ParameterUtils = {
  inferParameterType,
  parseParameters,
  collectAvailableParameters,
  isCustomFieldParameter,
  extractFieldNameFromParameter,
  extractParametersFromFilters,
  extractParametersFromString,
  mergeListenParameters,
  collectFilterPanelParameters,
  extractFilterPanelDefaultValues
};