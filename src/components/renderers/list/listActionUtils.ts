import type { TableAction } from '@/types';
import type { NavigationItem } from '@/types';
import type { TableDataType } from '@/types/renderers';
import type { ParameterRecord } from '@/types/parameters';
import { ParameterUtils } from '@/utils/parameterUtils';
import { resolveNavigationOpenParams } from '@/utils/navigationUtils';
import { mobilePushNavigate } from '@/mobile/utils/mobileNavigationStore';

export function resolveWorkbenchIdFromPath(
  pathname: string,
  paramWorkbenchId?: string
): string | undefined {
  if (paramWorkbenchId) return paramWorkbenchId;
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'workbench' && segments[1]) return segments[1];
  if (segments[0] && segments[0] !== 'workbench') return segments[0];
  return undefined;
}

function buildNavigateUrlParams(
  action: TableAction,
  record: TableDataType,
  pageParams: ParameterRecord
): Record<string, unknown> {
  const mapping = action.config?.parameterMapping;
  const urlParams: Record<string, unknown> = {};

  if (!mapping) {
    return urlParams;
  }

  Object.entries(mapping).forEach(([paramKey, config]) => {
    if (!paramKey?.trim() || !config) return;

    let paramValue: unknown;
    switch (config.source) {
      case 'column':
        paramValue = record[config.value];
        break;
      case 'static':
        paramValue = config.value;
        break;
      case 'parameter':
        paramValue = pageParams[config.value];
        break;
      case 'computed':
        if (config.value?.includes('${')) {
          paramValue = config.value.replace(/\$\{(\w+)\}/g, (_match, columnName: string) =>
            String(record[columnName] ?? '')
          );
        } else {
          paramValue = config.value;
        }
        break;
      default:
        return;
    }

    if (paramValue !== undefined && paramValue !== null) {
      if (typeof paramValue === 'string') {
        urlParams[paramKey] = ParameterUtils.inferParameterType(paramValue);
      } else {
        urlParams[paramKey] = paramValue;
      }
    }
  });

  return urlParams;
}

function buildNavigateQueryString(urlParams: Record<string, unknown>): string {
  const urlParamsObj = new URLSearchParams();
  Object.entries(urlParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlParamsObj.append(key, value);
    } else {
      urlParamsObj.append(key, JSON.stringify(value));
    }
  });
  return urlParamsObj.toString();
}

export function buildListNavigateUrl(
  targetPage: string,
  workbenchId: string | undefined,
  queryString: string
): string {
  if (targetPage.startsWith('/')) {
    return queryString ? `${targetPage}?${queryString}` : targetPage;
  }
  if (workbenchId) {
    return queryString
      ? `/${workbenchId}/${targetPage}?${queryString}`
      : `/${workbenchId}/${targetPage}`;
  }
  return queryString ? `${targetPage}?${queryString}` : targetPage;
}

export interface ExecuteListNavigateOptions {
  action: TableAction;
  record: TableDataType;
  pageParams?: ParameterRecord;
  workbenchId?: string;
  pathname: string;
  navigate: (url: string) => void;
  navigationItems?: NavigationItem[];
}

/** Align List navigate behavior with TableRenderer (open-tab + workbench path fallback). */
export function executeListNavigate({
  action,
  record,
  pageParams = {},
  workbenchId: paramWorkbenchId,
  pathname,
  navigate,
  navigationItems,
}: ExecuteListNavigateOptions): void {
  const { targetPage, openInNewTab } = action.config;
  if (!targetPage) return;

  const workbenchId = resolveWorkbenchIdFromPath(pathname, paramWorkbenchId);
  const mappedParams = buildNavigateUrlParams(action, record, pageParams);
  const urlParams = resolveNavigationOpenParams(navigationItems, targetPage, mappedParams);
  const queryString = buildNavigateQueryString(urlParams);
  const inAppUrl = buildListNavigateUrl(targetPage, workbenchId, queryString);

  if (openInNewTab) {
    window.open(inAppUrl, '_blank');
    return;
  }

  if (workbenchId && !targetPage.startsWith('/')) {
    window.dispatchEvent(
      new CustomEvent('workbench-open-tab', {
        detail: {
          pageId: targetPage,
          navigationTitle: action.label,
          icon: action.icon,
          urlParams: Object.keys(urlParams).length > 0 ? urlParams : undefined,
        },
      })
    );
    return;
  }

  mobilePushNavigate(
    navigate,
    { pathname: window.location.pathname, search: window.location.search },
    inAppUrl
  );
}

export function buildListActionParameters(
  action: TableAction,
  record: TableDataType,
  pageParams: ParameterRecord = {}
): ParameterRecord {
  const mapping = action.config?.parameterMapping;
  if (!mapping) {
    return { ...pageParams };
  }

  const parameters: ParameterRecord = { ...pageParams };

  Object.entries(mapping).forEach(([paramKey, config]) => {
    if (!paramKey?.trim() || !config) return;

    let paramValue: unknown;

    switch (config.source) {
      case 'column':
        paramValue = record[config.value];
        if (typeof paramValue === 'string') {
          paramValue = ParameterUtils.inferParameterType(paramValue);
        }
        break;
      case 'static':
        paramValue = config.value;
        if (typeof paramValue === 'string') {
          paramValue = ParameterUtils.inferParameterType(paramValue);
        }
        break;
      case 'parameter':
        paramValue = pageParams[config.value];
        break;
      case 'computed':
        if (config.value?.includes('${')) {
          paramValue = config.value.replace(/\$\{(\w+)\}/g, (_match, columnName: string) =>
            String(record[columnName] ?? '')
          );
        } else {
          paramValue = config.value;
        }
        if (typeof paramValue === 'string') {
          paramValue = ParameterUtils.inferParameterType(paramValue);
        }
        break;
      default:
        return;
    }

    parameters[paramKey] = paramValue as ParameterRecord[string];
  });

  return parameters;
}
