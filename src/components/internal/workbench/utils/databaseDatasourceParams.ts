import type { ParameterRecord, ParameterValue } from '@/types/parameters';

function unwrapParameterValue(value: unknown): unknown {
  // Multi-select params are real arrays — they must reach the request body as-is,
  // not fall into the object branch's JSON.stringify.
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    if ('id' in (value as object)) {
      return (value as { id: unknown }).id;
    }
    if ('value' in (value as object)) {
      return (value as { value: unknown }).value;
    }
    return JSON.stringify(value);
  }
  return value;
}

function resolveBoundParameterValue(
  value: unknown,
  getCurrentParameter: (name: string) => ParameterValue | undefined,
  rawParams: ParameterRecord
): unknown {
  if (value && typeof value === 'object' && (value as { type?: string }).type === 'parameter') {
    const paramConfig = value as { type: 'parameter'; source: string; value?: unknown };
    const paramName = paramConfig.source;
    let actualValue = getCurrentParameter(paramName) ?? rawParams[paramName];
    actualValue = unwrapParameterValue(actualValue);

    if (actualValue === undefined || actualValue === null) {
      actualValue = paramConfig.value;
    }

    return actualValue;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const singlePlaceholder = trimmed.match(/^\{\{([^}]+)\}\}$/);
    if (singlePlaceholder) {
      const paramName = singlePlaceholder[1].trim();
      let actualValue = getCurrentParameter(paramName) ?? rawParams[paramName];
      actualValue = unwrapParameterValue(actualValue);
      return actualValue ?? value;
    }

    if (trimmed.includes('{{')) {
      return replaceParametersInConditionString(value, getCurrentParameter, rawParams) ?? value;
    }
  }

  return value;
}

export function extractParameterNamesFromDatasourceParameters(
  parameters: Record<string, unknown> | undefined
): string[] {
  if (!parameters) return [];

  const names = new Set<string>();
  Object.values(parameters).forEach((value) => {
    if (value && typeof value === 'object' && (value as { type?: string }).type === 'parameter') {
      const source = (value as { source?: string }).source;
      if (source) names.add(source);
      return;
    }

    if (typeof value === 'string') {
      extractParameterNamesFromCondition(value).forEach((name) => names.add(name));
    }
  });

  return Array.from(names);
}

/**
 * Source names of bound params that carry a configured default `value` (including `''`).
 * Such params always resolve to at least their default ('' = "no filter"), so they must NOT
 * gate the first fetch. Otherwise a component that mounts AFTER the params were broadcast
 * (e.g. a lazy tab with `destroyInactiveTabPane: true`) waits forever for an already-passed
 * broadcast and never fetches — the table shows up empty. Only genuinely-required bound params
 * (declared without a default) should gate.
 */
export function extractDefaultedParameterNamesFromDatasourceParameters(
  parameters: Record<string, unknown> | undefined
): string[] {
  if (!parameters) return [];

  const names = new Set<string>();
  Object.values(parameters).forEach((value) => {
    if (
      value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'parameter' &&
      'value' in (value as object)
    ) {
      const source = (value as { source?: string }).source;
      if (source) names.add(source);
    }
  });

  return Array.from(names);
}

/**
 * Fetch-gate groups for a datasource's bound parameters, per the `waitForValue` contract
 * (editable in DatabaseDataSourceEditor's "wait for value" toggle):
 * - `waitForValue: false` → never gates the first fetch (optional dimension).
 * - `waitForValue: true`  → `strict`: the first fetch MUST wait until the param has an actual
 *   value on the bus. Readiness marks alone don't count — FilterPanel marks its params ready
 *   before async-resolved values (e.g. preset date ranges) land, which is exactly what used to
 *   let empty-date queries through (all-time data overwriting the correct response).
 * - absent → `legacy`: gates only when the param has NO configured default `value` (a default —
 *   including `''` = "no filter" — self-resolves; waiting on it would stall components that
 *   mount after the broadcast, e.g. lazy tabs). Readiness escapes stay valid for these.
 * A source bound in several entries lands in the strictest group that claims it.
 */
export interface DatasourceFetchGateParams {
  strict: string[];
  legacy: string[];
  all: string[];
}

export function extractFetchGateParamsFromDatasourceParameters(
  parameters: Record<string, unknown> | undefined
): DatasourceFetchGateParams {
  const strict = new Set<string>();
  const legacy = new Set<string>();
  if (parameters) {
    Object.values(parameters).forEach((value) => {
      if (!value || typeof value !== 'object' || (value as { type?: string }).type !== 'parameter') {
        return;
      }
      const cfg = value as { source?: string; waitForValue?: boolean };
      if (!cfg.source || cfg.waitForValue === false) return;
      if (cfg.waitForValue === true) {
        strict.add(cfg.source);
      } else if (!('value' in (value as object))) {
        legacy.add(cfg.source);
      }
    });
  }
  strict.forEach((name) => legacy.delete(name));
  return {
    strict: Array.from(strict),
    legacy: Array.from(legacy),
    all: [...strict, ...legacy],
  };
}

/**
 * Config KEYS (request-body field names, not bus source names) of bindings with an explicit
 * `waitForValue: true`. For renderers that gate on the RESOLVED request body (Chart/Form/Tree/
 * CollapsePanel style, where the body is a render-time memo): the fetch may only go out once
 * every strict key actually resolved to a value — checking the body itself keeps gate and
 * payload coherent by construction.
 */
export function extractStrictWaitParameterKeysFromDatasourceParameters(
  parameters: Record<string, unknown> | undefined
): string[] {
  if (!parameters) return [];
  return Object.entries(parameters)
    .filter(([, value]) =>
      value !== null &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'parameter' &&
      (value as { waitForValue?: boolean }).waitForValue === true
    )
    .map(([key]) => key);
}

export function hasResolvedDatasourceParameterValues(
  parameterNames: string[],
  getCurrentParameter: (name: string) => ParameterValue | undefined,
  rawParams: ParameterRecord
): boolean {
  if (parameterNames.length === 0) return true;

  return parameterNames.every((name) => {
    const value = getCurrentParameter(name) ?? rawParams[name];
    // Empty string '' counts as resolved: for filter params, '' means "no filter" (valid), not "not ready".
    // Treating it as unresolved blocks fetch gates for dimensions that default to empty (e.g. FilterPanel store/category).
    // Required params missing remain undefined and are still blocked.
    return value !== undefined && value !== null;
  });
}

export function convertDatasourceParameterValue(value: unknown, type: string): unknown {
  if (value === null || value === undefined || value === '') {
    return value;
  }

  // Arrays pass through regardless of the declared type ('string' is the default):
  // the API expands them into the SQL IN list.
  if (Array.isArray(value)) {
    return value;
  }

  switch (type?.toLowerCase()) {
    case 'number':
    case 'integer':
    case 'int': {
      const numValue = Number(value);
      return Number.isNaN(numValue) ? value : numValue;
    }
    case 'boolean':
    case 'bool': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1') return true;
        if (lowerValue === 'false' || lowerValue === '0') return false;
      }
      return Boolean(value);
    }
    case 'array':
    case 'list': {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return value.split(',').map((item: string) => item.trim());
        }
      }
      return [value];
    }
    case 'object':
    case 'json': {
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }
    case 'string':
    case 'text':
    default:
      return String(value);
  }
}

export function processDataSourceParametersForQuery(
  parameters: Record<string, unknown> | undefined,
  parameterTypes: Record<string, string> | undefined,
  getCurrentParameter: (name: string) => ParameterValue | undefined,
  rawParams: ParameterRecord
): Record<string, unknown> {
  if (!parameters || Object.keys(parameters).length === 0) {
    return {};
  }

  const processedParams: Record<string, unknown> = {};

  Object.entries(parameters).forEach(([key, value]) => {
    const actualValue = resolveBoundParameterValue(value, getCurrentParameter, rawParams);
    const paramType = parameterTypes?.[key] || 'string';
    processedParams[key] = convertDatasourceParameterValue(actualValue, paramType);
  });

  return processedParams;
}

export function extractParameterNamesFromCondition(condition: string | undefined): string[] {
  if (!condition) return [];
  const names: string[] = [];
  const paramRegex = /\{\{([^}]+)\}\}/g;
  let match: RegExpExecArray | null;
  const s = condition;
  while ((match = paramRegex.exec(s)) !== null) {
    names.push(match[1].trim());
  }
  return names;
}

export function replaceParametersInConditionString(
  condition: string | undefined,
  getCurrentParameter: (name: string) => ParameterValue | undefined,
  rawParams: ParameterRecord
): string | undefined {
  if (!condition) return condition;

  let result = condition;
  const paramRegex = /\{\{([^}]+)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(condition)) !== null) {
    const paramName = match[1].trim();
    const paramValue = getCurrentParameter(paramName) ?? rawParams[paramName];

    if (paramValue !== undefined && paramValue !== null) {
      if (paramName.includes('.startTime') || paramName.includes('.endTime')) {
        result = result.replace(match[0], String(paramValue));
      } else if (Array.isArray(paramValue)) {
        // Render arrays as a quoted SQL literal list so `col IN ({{p}})` inside
        // statisticCondition keeps working (mirrors the API's expansion).
        const valueStr = paramValue
          .map((el) =>
            typeof el === 'number' || typeof el === 'boolean'
              ? String(el)
              : `'${String(el).replace(/'/g, "''")}'`
          )
          .join(',');
        result = result.replace(match[0], valueStr === '' ? "''" : valueStr);
      } else {
        const valueStr =
          typeof paramValue === 'string' ? `'${paramValue}'` : String(paramValue);
        result = result.replace(match[0], valueStr);
      }
    }
  }

  return result;
}
