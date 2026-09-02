import { useMemo, useCallback, useContext } from 'react';
import { ParameterConfig } from '../types';
import { ParameterRecord, ParameterValue, ComponentParameterConfig, ParameterChangeEvent } from '../types/parameters';
import { ParameterContext } from '../contexts/ParameterContext';

interface UseParameterHandlerProps {
  parameterConfig?: ParameterConfig;
  pageParams?: ParameterRecord;
  componentId?: string;

  preferProvidedParams?: boolean;

  componentParameterConfig?: ComponentParameterConfig;

}

interface UseParameterHandlerReturn {
  rawParams: ParameterRecord; 
  getParameterForDataSource: () => ParameterRecord;
  getParameterForProps: () => ParameterRecord;
  updateParameter: (key: string, value: ParameterValue) => void;
  isParameterEnabled: boolean;

  parameterSource: 'context' | 'provided' | 'none';

  broadcastParameter: (key: string, value: ParameterValue) => void;

  subscribeToParameters: (keys: string[], callback: (event: ParameterChangeEvent) => void) => () => void;

  isListeningToParameters: boolean;
}

type ParameterTarget = 'props' | 'dataSource';

type ParameterMappingEntry = {
  targetField?: string;
  targetType?: 'props' | 'dataSource' | 'filterCondition';
  defaultValue?: ParameterValue;
  transform?: (value: ParameterValue) => ParameterValue;
};

const isSafeParameterKey = (key: string): boolean =>
  key !== '__proto__' && key !== 'constructor' && key !== 'prototype';

const useSafeParameterContext = () => useContext(ParameterContext);

export const useParameterHandler = ({
  parameterConfig,
  pageParams,
  componentId = 'unknown',
  preferProvidedParams = false,
  componentParameterConfig

}: UseParameterHandlerProps): UseParameterHandlerReturn => {
  const parameterContext = useSafeParameterContext();

  const { actualParams, parameterSource } = useMemo(() => {

    const getSafeObjectKeys = (obj: any): string[] => {
      if (!obj || typeof obj !== 'object') return [];
      try {
        return Object.keys(obj);
      } catch {
        return [];
      }
    };

    if (preferProvidedParams && pageParams && getSafeObjectKeys(pageParams).length > 0) {
      return { actualParams: pageParams, parameterSource: 'provided' as const };
    }

    if (parameterContext?.currentTabParams && getSafeObjectKeys(parameterContext.currentTabParams).length > 0) {
      return { actualParams: parameterContext.currentTabParams, parameterSource: 'context' as const };
    }

    if (pageParams && getSafeObjectKeys(pageParams).length > 0) {
      return { actualParams: pageParams, parameterSource: 'provided' as const };
    }

    if (parameterContext?.globalUrlParams) {
      return { actualParams: parameterContext.globalUrlParams || {}, parameterSource: 'context' as const };
    }

    return { actualParams: {}, parameterSource: 'none' as const };
  }, [pageParams, parameterContext, preferProvidedParams]);

  const parameterMappings = useMemo<Record<string, ParameterMappingEntry> | undefined>(() => {
    const legacyMappings = parameterConfig?.parameterMapping as Record<string, ParameterMappingEntry> | undefined;
    const componentMappings = componentParameterConfig?.parameterMapping;

    if (!legacyMappings && !componentMappings) {
      return undefined;
    }

    return { ...legacyMappings, ...componentMappings };
  }, [componentParameterConfig?.parameterMapping, parameterConfig?.parameterMapping]);

  const isParameterEnabled =
    componentParameterConfig?.enableParameterReceiving ?? parameterConfig?.enableParameterReceiving ?? false;

  const getMappedParameters = useCallback((target: ParameterTarget): ParameterRecord => {
    if (!parameterMappings) {
      return { ...actualParams };
    }

    const mappedParameters: ParameterRecord = {};

    Object.entries(parameterMappings).forEach(([sourceKey, mapping]) => {
      const mappingTarget = mapping?.targetType;
      const appliesToTarget =
        mappingTarget === undefined ||
        mappingTarget === target ||
        (target === 'dataSource' && mappingTarget === 'filterCondition');

      if (!appliesToTarget) {
        return;
      }

      const targetField = mapping?.targetField?.trim() || sourceKey;
      if (!isSafeParameterKey(targetField)) {
        return;
      }

      let value = actualParams[sourceKey];
      if (value === undefined) {
        value = mapping?.defaultValue;
      }
      if (value === undefined) {
        return;
      }

      if (mapping?.transform) {
        try {
          value = mapping.transform(value);
        } catch {
          return;
        }
      }

      if (value !== undefined) {
        mappedParameters[targetField] = value;
      }
    });

    return mappedParameters;
  }, [actualParams, parameterMappings]);

  const getParameterForDataSource = useCallback(
    () => getMappedParameters('dataSource'),
    [getMappedParameters]
  );

  const getParameterForProps = useCallback(
    () => getMappedParameters('props'),
    [getMappedParameters]
  );

  const updateParameter = useCallback((key: string, value: ParameterValue) => {
    if (parameterContext) {
      parameterContext.updateTabParams({ [key]: value }, 'component', componentId);
    }
  }, [componentId, parameterContext]);

  const broadcastParameter = useCallback((key: string, value: ParameterValue) => {
    if (parameterContext) {
      parameterContext.broadcastParameterChange(key, value, 'component', componentId);
    }
  }, [componentId, parameterContext]);

  const subscribeToParameters = useCallback((keys: string[], callback: (event: ParameterChangeEvent) => void) => {
    if (parameterContext) {
      return parameterContext.subscribeToParameter({
        parameterKeys: keys,
        callback,
        componentId,
        immediate: true
      });
    } else {
      return () => {}; 
    }
  }, [componentId, parameterContext]);

  const isListeningToParameters = Array.isArray(componentParameterConfig?.listenToParameters) &&
    componentParameterConfig.listenToParameters.length > 0;

  return {
    rawParams: actualParams, 
    getParameterForDataSource,
    getParameterForProps,
    updateParameter,
    isParameterEnabled,
    parameterSource,
    broadcastParameter,
    subscribeToParameters,
    isListeningToParameters
  };
};

export const buildDataSourceFilters = (
  filters: ParameterConfig['dataSourceFilters'] = [],
  parameters: ParameterRecord = {}
): ParameterRecord => {
  const filterConditions: ParameterRecord = {};

  filters.forEach(filter => {
    let filterValue: ParameterValue;

    if (typeof filter.value === 'string') {

      const paramMatch = filter.value.match(/^\{([^}]+)\}$/);
      if (paramMatch) {
        const paramName = paramMatch[1];
        filterValue = parameters[paramName];

      } else {

        filterValue = filter.value;
      }
    } else if (filter.value && typeof filter.value === 'object' && filter.value.type === 'parameter') {
      filterValue = parameters[filter.value.value];

    } else if (filter.value && typeof filter.value === 'object' && filter.value.type === 'static') {
      filterValue = filter.value.value;
    }

    if (filterValue !== undefined && filterValue !== null) {

      switch (filter.operator) {
        case 'equals':
          filterConditions[filter.field] = filterValue;
          break;
        case 'like':
          filterConditions[`${filter.field}__like`] = filterValue;
          break;
        case 'in': {
          filterConditions[`${filter.field}__in`] = Array.isArray(filterValue) ? filterValue as unknown as ParameterValue : [filterValue] as unknown as ParameterValue;
          break;
        }
        case 'gt':
          filterConditions[`${filter.field}__gt`] = filterValue;
          break;
        case 'lt':
          filterConditions[`${filter.field}__lt`] = filterValue;
          break;
        case 'not_equals':
          filterConditions[`${filter.field}__ne`] = filterValue;
          break;
        default:
          filterConditions[filter.field] = filterValue;
      }

    }
  });

  return filterConditions;
};

export const buildFilterString = (
  filters: ParameterRecord = {},
  fieldTypes?: Record<string, string>
): string => {
  const conditions: string[] = [];

  const formatValue = (value: any, fieldName: string): string => {
    if (value === null || value === undefined) return 'NULL';

    const fieldType = fieldTypes?.[fieldName];

    if (fieldType) {
      const typeUpper = fieldType.toUpperCase();

      if (['INT8', 'INT16', 'INT32', 'INT64', 'FLOAT', 'DOUBLE'].includes(typeUpper)) {
        return String(value);
      }

      if (typeUpper === 'BOOL') {
        return value ? 'true' : 'false';
      }

      if (['JSON', 'ARRAY'].includes(typeUpper)) {
        return `'${JSON.stringify(value)}'`;
      }

      if (['VARCHAR', 'TEXT', 'DATE', 'DATETIME'].includes(typeUpper)) {
        return `'${value}'`;
      }
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string' && /^\d+$/.test(value) && value.length <= 10) {
      return value; 
    }

    return `'${value}'`;
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key.includes('__')) {
      const [field, operator] = key.split('__');

      switch (operator) {
        case 'like':
          conditions.push(`${field} LIKE '%${value}%'`);
          break;
        case 'in': {
          const inValues = Array.isArray(value) ? value : [value];
          const quotedValues = inValues.map(v => formatValue(v, field)).join(', ');
          conditions.push(`${field} IN (${quotedValues})`);
          break;
        }
        case 'gt':
          conditions.push(`${field} > ${formatValue(value, field)}`);
          break;
        case 'lt':
          conditions.push(`${field} < ${formatValue(value, field)}`);
          break;
        case 'ne':
          conditions.push(`${field} != ${formatValue(value, field)}`);
          break;
        default:
          conditions.push(`${field} = ${formatValue(value, field)}`);
      }
    } else {

      conditions.push(`${key} = ${formatValue(value, key)}`);
    }
  });

  return conditions.join(' AND ');
};

export const mergeFilterStrings = (...filters: (string | undefined)[]): string => {
  const validFilters = filters.filter(filter => filter && filter.trim() !== '');

  if (validFilters.length === 0) {
    return '';
  }

  if (validFilters.length === 1) {
    return validFilters[0];
  }

  const allConditions: string[] = [];

  validFilters.forEach(filterString => {

    const conditions = filterString.split(' AND ').map(condition => condition.trim());
    allConditions.push(...conditions);
  });

  const uniqueConditions = Array.from(new Set(allConditions))
    .filter(condition => condition && condition.trim() !== '');

  return uniqueConditions.join(' AND ');
};

export const parseUrlParameters = (): ParameterRecord => {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const params: ParameterRecord = {};

  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }

  return params;
};
