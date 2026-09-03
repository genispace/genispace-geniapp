import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import apiClient from '@/lib/api/apiClient';
import { tabIsolation } from '@/utils/tabIsolation';
import { parseOutputSchemaFields } from '@/utils/dataConfigUtils';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { Workbench, AppConfig } from '../../types';
import { handleApiError } from '@/utils/errorHandler';
import type { VisibleWhen } from '@/utils/visibleWhen';

import { getMockData } from '@/mocks/index';
import i18next from 'i18next';

export interface BaseConfig {
  id: string;
  type: string;
  version?: string;
  description?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

export interface ApiAppConfig extends AppConfig, BaseConfig {
  appId: string;
}

export interface PageConfig extends BaseConfig {
  title: string;
  layout: 'default' | 'fluid' | 'custom';
  components: ComponentConfig[];
  customStyles?: import('@/types/components').CustomStylesConfig;
}

export interface ComponentConfig {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  /** Conditional visibility; absent/undefined = visible to all (see utils/visibleWhen) */
  visibleWhen?: VisibleWhen;
  dataSource?: {
    type: string;
    datasetId: string;
    datasetName?: string; 
    params?: Record<string, unknown>;
  };
  mockData?: unknown;
  /** When true, render using mockData (sibling field; do not store only under props) */
  useMockData?: boolean;
  customStyles?: import('@/types/components').CustomStylesConfig;
  children?: ComponentConfig[];
}

export interface DataServiceConfig {
  key: string;
  type: 'rest' | 'graphql' | 'websocket';
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  transform?: {
    request?: (data: unknown) => unknown;
    response?: (data: unknown) => unknown;
  };
}

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  endpoints: {
    [key: string]: {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      mockData?: unknown;
      transformRequest?: (data: unknown) => unknown;
      transformResponse?: (data: unknown) => unknown;
    };
  };
  dataServices?: {
    [key: string]: DataServiceConfig;
  };
}

export interface RequestParams {
  search?: string;
  filters?: Record<string, unknown[]>;
  sorter?: { field: string; order: 'ascend' | 'descend' };
  pagination?: { current: number; pageSize: number };
  [key: string]: unknown;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; 
  key?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DatasetQueryParams {
  filter?: string;
  limit?: number;
  offset?: number;
  outputFields?: string[];
  [key: string]: unknown;
}

export interface DatasetResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  dbType: string;
  dbConfig: Record<string, unknown>;
  dbSchema?: Record<string, unknown>;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface DatasetListResponse {
  total: number;
  items: Dataset[];
  page: number;
  limit: number;
}

export interface ApiWorkbench extends Workbench {
  version: string; 
}

export interface WorkbenchResponse {
  success: boolean;
  data?: Workbench;
  message?: string;
  code?: string;
}

export interface WorkbenchListResponse {
  success: boolean;
  items: Workbench[];
  message?: string;
}

export interface UpdateWorkbenchRequest {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  isActive?: boolean;
}

export interface WorkbenchVersion {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
  description?: string; 
  changes?: string; 
  config?: Record<string, unknown>;
}

export interface WorkbenchVersionResponse {
  success: boolean;
  items: WorkbenchVersion[];
  message?: string;
}

export interface WorkbenchVersionRestoreResponse {
  success: boolean;
  data: Workbench;
  message?: string;
}

class WorkbenchApi {
  private config: ApiConfig;
  private mockMode: boolean;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private workbenchConfigCache: Map<string, {
    data: WorkbenchResponse;
    timestamp: number;
  }>;
  private CACHE_TTL: number;
  private pendingRequests: Map<string, Promise<WorkbenchResponse>>;

  constructor(config: ApiConfig, mockMode: boolean = false) {
    this.config = config;
    this.mockMode = mockMode;
    this.cache = new Map();
    this.workbenchConfigCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; 
    this.pendingRequests = new Map();
  }

  setConfig(config: ApiConfig): void {
    this.config = config;
  }

  setMockMode(mockMode: boolean): void {
    this.mockMode = mockMode;
  }

  private generateCacheKey(endpointKey: string, params?: RequestParams): string {
    const tabId = tabIsolation.getTabId();
    return `${tabId}:${endpointKey}:${JSON.stringify(params || {})}`;
  }

  private checkCache<T>(key: string, ttl: number): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(endpointKey?: string): void {
    const tabId = tabIsolation.getTabId();
    if (endpointKey) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tabId}:${endpointKey}:`)) {
          this.cache.delete(key);
        }
      }
    } else {

      for (const key of this.cache.keys()) {
        if (key.startsWith(`${tabId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  private processMockData(data: unknown[], params?: RequestParams): unknown[] {
    if (!Array.isArray(data)) {
      return [];
    }

    let result = [...data];

    if (params?.search) {
      const searchFields = ['name', 'title', 'description', 'content'];
      const search = params.search.toLowerCase();
      result = result.filter(item => {
        if (typeof item !== 'object' || item === null) return false;
        const itemObj = item as Record<string, unknown>;
        return searchFields.some(field =>
          String(itemObj[field] || '').toLowerCase().includes(search)
        );
      });
    }

    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, values]) => {
        if (values && values.length > 0 && result.length > 0) {
          result = result.filter(item => values.includes(item[key]));
        }
      });
    }

    if (params?.sorter) {
      const { field, order } = params.sorter;
      result.sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];
        return order === 'ascend'
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      });
    }

    if (params?.pagination) {
      const { current, pageSize } = params.pagination;
      const start = (current - 1) * pageSize;
      result = result.slice(start, start + pageSize);
    }

    return result;
  }

  async request<T>(
    endpointKey: string,
    params?: RequestParams,
    cacheConfig?: CacheConfig
  ): Promise<ApiResponse<T>> {
    const endpoint = this.config.endpoints[endpointKey];
    if (!endpoint) {
      throw new Error(i18next.t('workbench:workbenchApi.endpoint_not_found', 'API endpoint not found: {{endpointKey}}', { endpointKey }));
    }

    if (cacheConfig?.enabled) {
      const cacheKey = this.generateCacheKey(endpointKey, params);
      const cachedData = this.checkCache(cacheKey, cacheConfig.ttl);
      if (cachedData) {
        return {
          success: true,
          data: cachedData as T,
          message: i18next.t('workbench:workbenchApi.data_fetch_success', 'Data fetched successfully')
        };
      }
    }

    if (this.mockMode && endpoint.mockData !== undefined) {
      await new Promise(resolve => setTimeout(resolve, 300)); 
      let mockData = endpoint.mockData;

      if (Array.isArray(mockData)) {
        mockData = this.processMockData(mockData, params);
      }

      if (cacheConfig?.enabled) {
        const cacheKey = this.generateCacheKey(endpointKey, params);
        this.setCache(cacheKey, mockData);
      }

      return {
        success: true,
        data: mockData as T,
        message: i18next.t('workbench:workbenchApi.data_fetch_success', 'Data fetched successfully')
      };
    }

    try {
      const requestConfig: AxiosRequestConfig = {
        baseURL: this.config.baseURL,
        url: endpoint.url,
        method: endpoint.method,
        params: endpoint.method === 'GET' ? params : undefined,
        data: endpoint.method !== 'GET' ? params : undefined,
        timeout: this.config.timeout,
        headers: {
          ...this.config.headers,
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.transformRequest && requestConfig.data) {
        requestConfig.data = endpoint.transformRequest(requestConfig.data);
      }

      const response: AxiosResponse = await axios(requestConfig);
      let data = response.data;

      if (endpoint.transformResponse) {
        data = endpoint.transformResponse(data);
      }

      if (cacheConfig?.enabled) {
        const cacheKey = this.generateCacheKey(endpointKey, params);
        this.setCache(cacheKey, data);
      }

      return {
        success: true,
        data: data as T,
        message: 'success'
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || 'Unknown error');
    }
  }

  private async getWorkbench(workbenchId: string): Promise<WorkbenchResponse> {

    if (!workbenchId || workbenchId.trim() === '') {
      const errorMessage = i18next.t('workbench:workbenchApi.workbenchId_required', 'Workbench ID is required');
      console.error('[WorkbenchApi] Workbench ID is required:', { workbenchId });
      return {
        success: false,
        message: errorMessage,
        code: 'VALIDATION_ERROR'
      };
    }

    try {
      const tabId = tabIsolation.getTabId();
      const cacheKey = `${tabId}:${workbenchId}`;

      if (this.pendingRequests.has(cacheKey)) {
        return await this.pendingRequests.get(cacheKey)!;
      }

      const mockData = getMockData(workbenchId);
      if (mockData) {
        const mockResponse: WorkbenchResponse = {
          success: true,
          data: {
            id: workbenchId,
            name: mockData.appConfig.name,
            description: mockData.appConfig.description || '',
            config: mockData as unknown as Workbench['config'],
            spaceId: 'demo-team',
            version: '1.0.0',
            status: 'ACTIVE',
            isActive: true,
            createdBy: 'demo-user',
            updatedBy: 'demo-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Workbench,
          message: i18next.t('workbench:workbenchApi.get_workbench_success', 'Workbench details fetched successfully')
        };

        this.workbenchConfigCache.set(cacheKey, {
          data: mockResponse,
          timestamp: Date.now()
        });

        return mockResponse;
      }

      const cached = this.workbenchConfigCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      const requestPromise = apiClient.get<WorkbenchResponse>(`/workbenches/${workbenchId}`).then(response => {

        let workbenchResponse: WorkbenchResponse;

        if ('success' in response && 'data' in response) {

          if (!response.success) {
            throw new Error(response.message || i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
          }
          workbenchResponse = response as unknown as WorkbenchResponse;
        } else if (response.success && response.data) {

          if (typeof response.data === 'object' && response.data !== null && 'success' in response.data && 'data' in response.data) {
            const data = response.data as unknown as WorkbenchResponse;
            if (!data.success) {
              throw new Error(data.message || i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
            }
            workbenchResponse = data;
          } else {

            workbenchResponse = {
              success: true,
              data: response.data as unknown as Workbench,
              message: response.message
            };
          }
        } else {
          throw new Error(i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
        }

        this.workbenchConfigCache.set(cacheKey, {
          data: workbenchResponse,
          timestamp: Date.now()
        });
        return workbenchResponse;
      });

      this.pendingRequests.set(cacheKey, requestPromise);

      const result = await requestPromise;

      this.pendingRequests.delete(cacheKey);

      return result;
    } catch (error) {

      const tabId = tabIsolation.getTabId();
      const cacheKey = `${tabId}:${workbenchId}`;
      this.pendingRequests.delete(cacheKey);
      console.error('获取工作台详情失败:', error);
      throw error;
    }
  }

  clearWorkbenchCache(workbenchId?: string): void {
    const tabId = tabIsolation.getTabId();
    if (workbenchId) {
      const cacheKey = `${tabId}:${workbenchId}`;
      this.workbenchConfigCache.delete(cacheKey);
      this.pendingRequests.delete(cacheKey);
    } else {

      for (const key of this.workbenchConfigCache.keys()) {
        if (key.startsWith(`${tabId}:`)) {
          this.workbenchConfigCache.delete(key);
        }
      }
      for (const key of this.pendingRequests.keys()) {
        if (key.startsWith(`${tabId}:`)) {
          this.pendingRequests.delete(key);
        }
      }
    }
  }

  async getAppConfig(workbenchId: string): Promise<ApiResponse<AppConfig>> {
    const workbench = await this.getWorkbench(workbenchId);
    if (workbench.success && workbench.data?.config) {
      return {
        success: true,
        data: workbench.data.config.appConfig,
        message: i18next.t('workbench:workbenchApi.get_app_config_success', 'App configuration fetched successfully')
      };
    }
    throw new Error(workbench.message || i18next.t('workbench:workbenchApi.get_app_config_failed', 'Failed to get app configuration'));
  }

  async getPageConfig(workbenchId: string, pageId: string): Promise<ApiResponse<PageConfig>> {
    const workbench = await this.getWorkbench(workbenchId);
    if (workbench.success && workbench.data?.config) {
      const pageConfig = workbench.data.config.pages[pageId];
      if (pageConfig) {
        return {
          success: true,
          data: pageConfig,
          message: i18next.t('workbench:workbenchApi.get_page_config_success', 'Page configuration fetched successfully')
        };
      }
    }
    throw new Error(i18next.t('workbench:workbenchApi.page_config_not_found', 'Page configuration {{pageId}} not found', { pageId }));
  }

  async queryDataset<T>(
    datasetId: string,
    params?: DatasetQueryParams
  ): Promise<DatasetResponse<T>> {
    try {
      const response = await axios.post(`${this.config.baseURL}/datasets/${datasetId}/data/query`, params);
      return {
        success: true,
        data: response.data,
        message: 'success'
      };
    } catch (error: unknown) {
      console.error('Dataset query failed:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return {
        success: false,
        data: null as unknown as T,
        message: err.response?.data?.message || err.message || 'Unknown error'
      };
    }
  }

  async getComponentData<T>(
    dataSource: ComponentConfig['dataSource'],
    params?: DatasetQueryParams
  ): Promise<DatasetResponse<T>> {
    if (!dataSource) {
      throw new Error(i18next.t('workbench:workbenchApi.data_source_undefined', 'Data source is undefined'));
    }

    if (dataSource.type === 'dataset') {
      try {
        const response = await apiClient.post<DatasetResponse<T>>(
          `/datasets/${dataSource.datasetId}/data/query`,
          { ...dataSource.params, ...params }
        );

        if (!response) {
          throw new Error(i18next.t('workbench:workbenchApi.empty_response', 'Empty response from server'));
        }

        // 

        if (typeof response === 'object' && 'success' in response && 'data' in response) {
          if (!response.success) {
            return {
              success: false,
              message: response.message || i18next.t('workbench:workbenchApi.data_load_failed', 'Failed to load data'),
              data: null as T,
            };
          }

          if (!('code' in response) && !('timestamp' in response)) {
            return response as DatasetResponse<T>;
          }
        }

        if (typeof response === 'object' && 'data' in response) {
          const innerData = (response as any).data;

          if (innerData && typeof innerData === 'object' && 'success' in innerData && 'data' in innerData) {
            return innerData as DatasetResponse<T>;
          }

          return {
            success: true,
            data: innerData as T,
          };
        }

        throw new Error(i18next.t('workbench:workbenchApi.invalid_response_format', 'Invalid response format from server'));
      } catch (error: any) {
        console.error('获取组件数据失败:', error);

        if (error && typeof error === 'object' && 'success' in error) {
          return {
            success: false,
            message: error.message || i18next.t('workbench:workbenchApi.data_load_failed', 'Failed to load data'),
            data: null as T,
          } as DatasetResponse<T>;
        }

        const errorMessage = error?.message || error?.toString() || i18next.t('workbench:workbenchApi.data_load_failed', 'Failed to load data');
        return {
          success: false,
          message: errorMessage,
          data: null as T,
        } as DatasetResponse<T>;
      }
    }

    throw new Error(i18next.t('workbench:workbenchApi.unsupported_data_source_type', 'Unsupported data source type: {{type}}', { type: dataSource.type }));
  }
}

export const workbenchApi = new WorkbenchApi({
  baseURL: '/api',
  timeout: 60000, 
  headers: {
    'X-Client-Version': '1.0.0'
  },
  endpoints: {

    getAppConfig: {
      url: '/app/config',
      method: 'GET'
    },
    getPageConfig: {
      url: '/app/pages/:pageId',
      method: 'GET'
    }
  }
}, false);

export async function fetchAppConfig(workbenchId: string): Promise<ApiResponse<AppConfig>> {
  return workbenchApi.getAppConfig(workbenchId);
}

export async function fetchPageConfig(workbenchId: string, pageId: string): Promise<ApiResponse<PageConfig>> {
  return workbenchApi.getPageConfig(workbenchId, pageId);
}

export async function fetchComponentData<T>(
  dataSource: ComponentConfig['dataSource'],
  params?: DatasetQueryParams
): Promise<DatasetResponse<T>> {
  return workbenchApi.getComponentData<T>(dataSource, params);
}

export const getWorkbenches = async (options?: {
  page?: number;
  limit?: number;
  status?: string;
  isActive?: boolean;
}) => {
  try {

    const response = await apiClient.get<WorkbenchListResponse>('/workbenches', options);

    if ('success' in response && 'items' in response) {

      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.get_workbenches_failed', 'Failed to get workbench list'));
      }
      return response as WorkbenchListResponse;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as WorkbenchListResponse;
      if (!data.success) {
        throw new Error(data.message || i18next.t('workbench:workbenchApi.get_workbenches_failed', 'Failed to get workbench list'));
      }
      return data;
    }

    throw new Error(i18next.t('workbench:workbenchApi.get_workbenches_failed', 'Failed to get workbench list'));
  } catch (error) {
    console.error('获取工作台列表失败:', error);
    throw error;
  }
};

export type WorkbenchConfigView = 'draft' | 'published';

export const getWorkbench = async (
  workbenchId: string,
  options?: { view?: WorkbenchConfigView; previewToken?: string }
) => {
  try {

    const mockData = getMockData(workbenchId);
    if (mockData) {
        return {
          success: true,
          data: {
            id: workbenchId,
            name: mockData.appConfig.name,
            description: mockData.appConfig.description || '',
            config: mockData as unknown as Workbench['config'],
            spaceId: 'demo-team',
            version: '1.0.0',
            status: 'ACTIVE',
            isActive: true,
            createdBy: 'demo',
            updatedBy: 'demo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Workbench,
          message: i18next.t('workbench:workbenchApi.get_workbench_success', 'Workbench details fetched successfully')
        };
    }

    const searchParams = new URLSearchParams();
    if (options?.view) searchParams.set('view', options.view);
    if (options?.previewToken) searchParams.set('previewToken', options.previewToken);
    const qs = searchParams.toString();
    const response = await apiClient.get<WorkbenchResponse>(
      `/workbenches/${workbenchId}${qs ? `?${qs}` : ''}`
    );

    if ('success' in response && 'data' in response) {

      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
      }
      return response as unknown as WorkbenchResponse;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as unknown as WorkbenchResponse;
      if (!data.success) {
        throw new Error(data.message || i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
      }
      return data;
    }

    throw new Error(i18next.t('workbench:workbenchApi.get_workbench_failed', 'Failed to get workbench details'));
  } catch (error: unknown) {
    console.error('获取工作台详情失败:', error);

    const apiError = handleApiError(error, i18next.t('workbench:workbenchApi.workbench', 'Workbench'));
    const enhancedError = new Error(apiError.message) as Error & {
      code?: string;
      status?: number;
      originalError?: unknown;
    };
    enhancedError.code = apiError.code;
    enhancedError.status = apiError.status;
    enhancedError.originalError = apiError.originalError;
    throw enhancedError;
  }
};

export const updateWorkbench = async (workbenchId: string, data: UpdateWorkbenchRequest) => {
  try {

    const response = await apiClient.put<Workbench>(`/workbenches/${workbenchId}`, data);

    if ('success' in response && 'data' in response) {

      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.update_workbench_failed', 'Failed to update workbench'));
      }
      return response.data as Workbench;
    }

    return response as unknown as Workbench;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.update_workbench_failed', 'Failed to update workbench'), error);
    throw error;
  }
};

/** Partial update: upsert a single page in workbench config */
export const updatePage = async (
  workbenchId: string,
  pageKey: string,
  pageData: Record<string, unknown>
): Promise<Workbench> => {
  try {
    const response = await apiClient.patch<WorkbenchResponse>(
      `/workbenches/${workbenchId}/config/pages/${encodeURIComponent(pageKey)}`,
      pageData
    );

    if ('success' in response && 'data' in response) {
      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.update_page_failed', 'Failed to update page'));
      }
      return response.data as unknown as Workbench;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as unknown as WorkbenchResponse;
      if (!data.success) {
        throw new Error(data.message || i18next.t('workbench:workbenchApi.update_page_failed', 'Failed to update page'));
      }
      return data.data as Workbench;
    }

    throw new Error(i18next.t('workbench:workbenchApi.update_page_failed', 'Failed to update page'));
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.update_page_failed', 'Failed to update page'), error);
    throw error;
  }
};

/** Partial update: replace workbench appConfig */
export const updateAppConfig = async (
  workbenchId: string,
  appConfig: Record<string, unknown>
): Promise<Workbench> => {
  try {
    const response = await apiClient.patch<WorkbenchResponse>(
      `/workbenches/${workbenchId}/config/appConfig`,
      appConfig
    );

    if ('success' in response && 'data' in response) {
      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.update_app_config_partial_failed', 'Failed to update app configuration'));
      }
      return response.data as unknown as Workbench;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as unknown as WorkbenchResponse;
      if (!data.success) {
        throw new Error(data.message || i18next.t('workbench:workbenchApi.update_app_config_partial_failed', 'Failed to update app configuration'));
      }
      return data.data as Workbench;
    }

    throw new Error(i18next.t('workbench:workbenchApi.update_app_config_partial_failed', 'Failed to update app configuration'));
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.update_app_config_partial_failed', 'Failed to update app configuration'), error);
    throw error;
  }
};

export const deleteWorkbench = async (workbenchId: string) => {
  try {

    const response = await apiClient.delete<void>(`/workbenches/${workbenchId}`);

    if ('success' in response) {

      if (!response.success) {
        throw new Error(response.message || i18next.t('workbench:workbenchApi.delete_workbench_failed', 'Failed to delete workbench'));
      }

      return;
    }

    return;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.delete_workbench_failed', 'Failed to delete workbench'), error);
    throw error;
  }
};

export const toggleWorkbenchActive = async (workbenchId: string, isActive: boolean) => {
  try {
    const response = await apiClient.patch<{
      success: boolean;
      data?: Workbench;
      message?: string;
    }>(`/workbenches/${workbenchId}/active`, { isActive });
    const responseData = response.data;
    if (!responseData?.success) {
      throw new Error(responseData?.message || i18next.t('workbench:workbenchApi.toggle_workbench_status_failed', 'Failed to toggle workbench status'));
    }
    return responseData.data;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.toggle_workbench_status_failed', 'Failed to toggle workbench status'), error);
    throw error;
  }
};

/** Publish the current draft — manage permission required (enforced server-side). */
export const publishWorkbench = async (workbenchId: string, description?: string) => {
  const response = await apiClient.post<{
    id: string;
    publishedVersion: string;
    publishedAt: string;
    publishedBy: string;
  }>(`/workbenches/${workbenchId}/publish`, description ? { description } : {});
  workbenchApi.clearWorkbenchCache(workbenchId);
  return response;
};

export type GeniappExportStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface WorkbenchGeniappExportJob {
  id: string;
  workbenchId: string;
  publishedVersion: string;
  configSha256: string;
  targetIdentifier: string;
  targetVersion: string;
  packageName?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep?: string | null;
  steps: Array<{
    key: string;
    status: GeniappExportStepStatus;
    startedAt?: string;
    finishedAt?: string;
    error?: string;
  }>;
  compatibilityReport?: {
    compatible: boolean;
    installable: boolean;
    summary: { pages: number; components: number; errors: number; warnings: number };
    errors: Array<{ code: string; path: string; message: string }>;
    warnings: Array<{ code: string; path: string; message: string }>;
  } | null;
  artifactFileName?: string | null;
  artifactSha256?: string | null;
  artifactSize?: string | null;
  error?: string | null;
  errorCode?: string | null;
  createdAt: string;
  finishedAt?: string | null;
  expiresAt?: string | null;
  artifactState?: 'available' | 'expired' | 'deleted' | 'missing' | 'unavailable';
  canDownload?: boolean;
  canRetry?: boolean;
  attemptCount?: number;
  downloadCount?: number;
  lastDownloadedAt?: string | null;
}

export interface WorkbenchGeniappVersionPolicy {
  identifier: string;
  latestVersion: string | null;
  suggestedVersion: string;
  firstExport: boolean;
  totalExports: number;
}

export interface WorkbenchGeniappExportHistory {
  items: WorkbenchGeniappExportJob[];
  nextCursor: string | null;
  summary: WorkbenchGeniappVersionPolicy & { total: number };
}

export const createWorkbenchGeniappExport = async (
  workbenchId: string,
  target: { identifier: string; version?: string; packageName?: string }
) => apiClient.post<WorkbenchGeniappExportJob>(`/workbenches/${workbenchId}/geniapp-exports`, target);

export const getWorkbenchGeniappExport = async (workbenchId: string, jobId: string) =>
  apiClient.get<WorkbenchGeniappExportJob>(`/workbenches/${workbenchId}/geniapp-exports/${jobId}`);

export const listWorkbenchGeniappExports = async (workbenchId: string, limit = 20) =>
  apiClient.get<WorkbenchGeniappExportJob[]>(`/workbenches/${workbenchId}/geniapp-exports`, { limit });

export const getWorkbenchGeniappVersionPolicy = async (workbenchId: string, identifier: string) =>
  apiClient.get<WorkbenchGeniappVersionPolicy>(
    `/workbenches/${workbenchId}/geniapp-exports/version-policy`,
    { identifier }
  );

export const getWorkbenchGeniappExportHistory = async (
  workbenchId: string,
  options: { identifier: string; status?: WorkbenchGeniappExportJob['status']; limit?: number; cursor?: string }
) => apiClient.get<WorkbenchGeniappExportHistory>(
  `/workbenches/${workbenchId}/geniapp-exports/history`,
  options
);

export const retryWorkbenchGeniappExport = async (workbenchId: string, jobId: string) =>
  apiClient.post<WorkbenchGeniappExportJob>(
    `/workbenches/${workbenchId}/geniapp-exports/${jobId}/retry`,
    {}
  );

export const downloadWorkbenchGeniappExport = async (
  workbenchId: string,
  jobId: string,
  filename?: string
) => apiClient.downloadFile(
  `/workbenches/${workbenchId}/geniapp-exports/${jobId}/artifact`,
  filename || 'workbench-geniapp.zip'
);

export const createWorkbenchPreviewToken = async (workbenchId: string, expiresInHours?: number) => {
  return await apiClient.post<import('@/types').WorkbenchPreviewToken>(
    `/workbenches/${workbenchId}/preview-tokens`,
    expiresInHours ? { expiresInHours } : {}
  );
};

export const listWorkbenchPreviewTokens = async (workbenchId: string) => {
  return await apiClient.get<import('@/types').WorkbenchPreviewToken[]>(
    `/workbenches/${workbenchId}/preview-tokens`
  );
};

export const revokeWorkbenchPreviewToken = async (workbenchId: string, tokenId: string) => {
  return await apiClient.delete<{ success: boolean }>(
    `/workbenches/${workbenchId}/preview-tokens/${tokenId}`
  );
};

export const restoreVersion = async (workbenchId: string, version: string) => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data?: Workbench;
      message?: string;
    }>(
      `/workbenches/${workbenchId}/restore/${version}`,
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    const responseData = response.data;
    if (!responseData?.success) {
      throw new Error(responseData?.message || i18next.t('workbench:workbenchApi.restore_workbench_version_failed', 'Failed to restore workbench version'));
    }
    return responseData.data;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.restore_workbench_version_failed', 'Failed to restore workbench version'), error);
    throw error;
  }
};

export const getDatasets = async (options?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  try {
    const response = await apiClient.get<DatasetListResponse | Dataset[]>('/datasets', options);

    if (!response.success) {
      throw new Error(response.message || i18next.t('workbench:workbenchApi.get_datasets_failed', 'Failed to get dataset list'));
    }

    return response.data;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.get_datasets_failed', 'Failed to get dataset list'), error);
    throw error;
  }
};

export const getDataset = async (datasetId: string) => {
  try {
    const response = await apiClient.get<{
      success?: boolean;
      data?: Dataset;
      message?: string;
    } | Dataset>(`/datasets/${datasetId}`);
    const responseData = response.data;

    if (responseData && 'success' in responseData) {
      if (!responseData.success) {
        throw new Error(responseData.message || i18next.t('workbench:workbenchApi.get_dataset_failed', 'Failed to get dataset details'));
      }
      return responseData.data;
    }
    return responseData as Dataset;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.get_dataset_failed', 'Failed to get dataset details'), error);
    throw error;
  }
};

export const queryDatasetData = async <T>(
  datasetId: string,
  params?: DatasetQueryParams
) => {
  try {
    const response = await apiClient.post<T>(
      `/datasets/${datasetId}/data/query`,
      params
    );
    return response;
  } catch (error) {
    console.error('查询数据集数据失败:', error);
    throw error;
  }
};

export const insertDatasetData = async <T>(
  datasetId: string,
  data: T[]
) => {
  try {
    const response = await apiClient.post<{
      ids?: Array<string | number>;
      insertedCount?: number;
      inserted_count?: number;
    }>(
      `/datasets/${datasetId}/data/insert`,
      { data }
    );
    return response;
  } catch (error) {
    console.error('插入数据集数据失败:', error);
    throw error;
  }
};

export const updateDatasetData = async <T>(
  datasetId: string,
  filter: string,
  updateData: Partial<T>
) => {
  try {
    const requestBody = { filter, update_data: updateData };

    const response = await apiClient.post<{
      updatedCount?: number;
      updated_count?: number;
      affectedRows?: number;
      affected_rows?: number;
    }>(
      `/datasets/${datasetId}/data/update`,
      requestBody
    );

    return response;
  } catch (error) {
    console.error('更新数据集数据失败:', error);
    throw error;
  }
};

export const deleteDatasetData = async (
  datasetId: string,
  filter: string
) => {
  try {
    const response = await apiClient.post<{
      deletedCount?: number;
      deleted_count?: number;
      affectedRows?: number;
      affected_rows?: number;
    }>(
      `/datasets/${datasetId}/data/delete`,
      { filter }
    );
    return response;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.delete_dataset_data_failed', 'Failed to delete dataset data'), error);
    throw error;
  }
};

/** Append `?version=N` when version is a positive integer; otherwise leave URL unchanged. */
export function withDatasourceVersion(url: string, version?: number): string {
  if (version == null || !Number.isInteger(version) || version < 1) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}version=${version}`;
}

export interface DataSourceVersionSummary {
  id: string;
  version: number;
  isDefault: boolean;
  operationType?: string;
  databaseId?: string;
  changeNote?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const listDatasourceVersions = async (datasourceId: string) => {
  try {
    const response = await apiClient.get<{
      datasourceId: string;
      defaultVersion: number | null;
      versions: DataSourceVersionSummary[];
    }>(`/datasources/${datasourceId}/versions`);
    return response;
  } catch (error) {
    console.error('获取数据源版本列表失败:', error);
    throw error;
  }
};

/** Batch endpoint item: versions only carry {version, isDefault}; missing/cross-space ids get `error`. */
export interface DataSourceVersionBatchItem {
  datasourceId: string;
  /** Present for datasources found in the space (null when the column is empty). */
  name?: string | null;
  identifier?: string | null;
  versions: Array<{ version: number; isDefault: boolean }>;
  error?: { code: string; messageKey: string };
}

/**
 * POST /datasources/versions/batch — one call for up to 100 datasources.
 * Note: no `defaultVersion` field — derive it from `versions.find(v => v.isDefault)`.
 */
export const batchListDatasourceVersions = async (datasourceIds: string[]) => {
  try {
    const response = await apiClient.post<{
      items: DataSourceVersionBatchItem[];
    }>(`/datasources/versions/batch`, { datasourceIds });
    return response;
  } catch (error) {
    console.error('批量获取数据源版本列表失败:', error);
    throw error;
  }
};

export const updateDatabaseData = async (
  datasourceId: string,
  updateData: Record<string, unknown>,
  whereConditions?: Record<string, unknown>,
  version?: number
) => {
  try {
    // Workbench-level pin (config.datasourceVersions) overrides the action-level version.
    const resolvedVersion = resolveRuntimeDatasourceVersion(datasourceId, version);

    const requestBody = {
      ...whereConditions,  
      ...updateData        
    };

    const response = await apiClient.put<{
      success: boolean;
      data?: {
        operationType?: string;
        affectedRows?: number;
        executionTime?: number;
        insertId?: number;
        changedRows?: number;
      };
      message?: string;
    }>(withDatasourceVersion(`/datasources/${datasourceId}/data`, resolvedVersion), requestBody);

    return response;
  } catch (error) {
    console.error('更新数据库数据失败:', error);
    throw error;
  }
};

export const insertDatabaseData = async (
  datasourceId: string,
  insertData: Record<string, unknown>,
  version?: number
) => {
  try {
    // Workbench-level pin (config.datasourceVersions) overrides the action-level version.
    const resolvedVersion = resolveRuntimeDatasourceVersion(datasourceId, version);

    const response = await apiClient.post<{
      success: boolean;
      data?: {
        operationType?: string;
        affectedRows?: number;
        executionTime?: number;
        insertId?: number;
        changedRows?: number;
      };
      message?: string;
    }>(withDatasourceVersion(`/datasources/${datasourceId}/data`, resolvedVersion), insertData);

    return response;
  } catch (error) {
    console.error('新增数据库数据失败:', error);
    throw error;
  }
};

export const deleteDatabaseData = async (
  datasourceId: string,
  whereConditions: Record<string, unknown>,
  version?: number
) => {
  try {
    // Workbench-level pin (config.datasourceVersions) overrides the action-level version.
    const resolvedVersion = resolveRuntimeDatasourceVersion(datasourceId, version);

    const requestBody = {
      ...whereConditions  
    };

    const axiosInstance = apiClient.withoutAuth().getInstance();
    const response = await axiosInstance.request<{
      success: boolean;
      data?: {
        operationType?: string;
        affectedRows?: number;
        deletedCount?: number;
        executionTime?: number;
      };
      message?: string;
    }>({
      url: withDatasourceVersion(`/datasources/${datasourceId}/data`, resolvedVersion),
      method: 'DELETE',
      data: requestBody
    });

    const apiResponse = response.data as { success: boolean; data?: { operationType?: string; affectedRows?: number; deletedCount?: number; executionTime?: number }; message?: string };

    return apiResponse;
  } catch (error) {
    console.error('删除数据库数据失败:', error);
    throw error;
  }
};

export const transactionDatabaseData = async (
  datasourceId: string,
  body: Record<string, unknown>,
  version?: number
) => {
  try {
    // Workbench-level pin (config.datasourceVersions) overrides the action-level version.
    const resolvedVersion = resolveRuntimeDatasourceVersion(datasourceId, version);

    const response = await apiClient.post<{
      success: boolean;
      data?: {
        operationType?: string;
        affectedRows?: number;
        deletedCount?: number;
        executionTime?: number;
        insertId?: number;
        changedRows?: number;
      };
      message?: string;
    }>(withDatasourceVersion(`/datasources/${datasourceId}/data`, resolvedVersion), body);
    return response;
  } catch (error) {
    console.error('TRANSACTION 数据源执行失败:', error);
    throw error;
  }
};

export const getDatasources = async (params?: {
  search?: string;
  databaseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  try {

    const response = await apiClient.get<{
      success: boolean;
      data?: Array<{
        id: string;
        name: string;
        identifier?: string;
        description?: string;
        type: string;
        operationType?: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_INSERT' | 'TRANSACTION';
        status?: string;
        inputSchema?: Record<string, unknown>;
        outputSchema?: Record<string, unknown>;
        database?: {
          id: string;
          name: string;
          type: string;
          host?: string;
          port?: number;
        };
        createdAt?: string;
        updatedAt?: string;
      }>;
      message?: string;
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/datasources', params);

    return response;
  } catch (error) {
    console.error('获取数据源列表失败:', error);
    throw error;
  }
};

export const getDatasourceSchema = async (datasourceId: string, version?: number) => {
  try {

    const response = await apiClient.get<{
      success: boolean;
      data?: {
        id: string;
        name: string;
        description?: string;
        type: string;
        operationType?: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_INSERT' | 'TRANSACTION';
        database?: {
          host?: string;
          port?: number;
          database?: string;
          username?: string;
        };
        outputSchema?: {
          type: 'object';
          properties: Record<string, {
            type: string;
            title?: string;
            description?: string;
            format?: string;
          }>;
          required?: string[];
        };
        inputSchema?: {
          type: 'object';
          properties: Record<string, {
            type: string;
            title?: string;
            description?: string;
            format?: string;
            default?: unknown;
          }>;
          required?: string[];
        };
      };
      message?: string;
    }>(withDatasourceVersion(`/datasources/${datasourceId}`, version));

    const responseData = response.data as any;

    return response.data;
  } catch (error) {
    console.error('获取数据源详情失败:', error);
    throw error;
  }
};

export const getDatasourceFields = async (
  datasourceId: string,
  version?: number
): Promise<Array<{ name: string; type: string; title?: string; description?: string; format?: string; nullable?: boolean }>> => {
  try {

    const schemaResponse = await getDatasourceSchema(datasourceId, version) as Record<string, unknown>;
    const datasourceInfo = ((schemaResponse?.data as Record<string, unknown>) ?? schemaResponse) as { outputSchema?: Record<string, unknown> };
    let fields = parseOutputSchemaFields(datasourceInfo?.outputSchema);

    if (fields.length === 0) {
      const dataResponse = await apiClient.post(
        withDatasourceVersion(`/datasources/${datasourceId}/data`, version),
        { page: 1, limit: 1 }
      ) as { data?: { outputSchema?: Record<string, unknown> } };
      const responseOutputSchema = dataResponse?.data?.outputSchema;
      fields = parseOutputSchemaFields(responseOutputSchema);
    }

    return fields;
  } catch (error) {
    console.error('获取数据源字段列表失败:', error);
    return [];
  }
};

export const vectorSearch = async <T>(
  datasetId: string,
  params: {
    filter?: string;
    data: number[][];
    limit?: number;
    outputFields?: string[];
  }
) => {
  try {
    const response = await apiClient.post<DatasetResponse<T[]>>(
      `/datasets/${datasetId}/data/search`,
      params
    );
    return response.data;
  } catch (error) {
    console.error('向量搜索失败:', error);
    throw error;
  }
};

export const getWorkbenchAppConfig = async (workbenchId: string) => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data?: {
        config: {
          pages: Record<string, unknown>;
          appConfig: {
            logo: string;
            appId: string;
            theme: string;
            layout: {
              type: string;
              menuPosition: string;
              headerActions: string[];
            };
            navigation: {
              items: Array<{
                key: string;
                icon: string;
                path: string;
                title: string;
              }>;
            };
          };
        };
      };
      message?: string;
    }>(`/workbenches/${workbenchId}`);
    const responseData = response.data;
    if (!responseData?.success) {
      throw new Error(responseData?.message || i18next.t('workbench:workbenchApi.get_app_config_failed', 'Failed to get app configuration'));
    }
    return responseData.data?.config;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.get_app_config_failed', 'Failed to get app configuration'), error);
    throw error;
  }
};

export const updateWorkbenchAppConfig = async (workbenchId: string, config: unknown) => {
  try {
    const response = await apiClient.put<{
      success: boolean;
      data?: {
        config: unknown;
      };
      message?: string;
    }>(`/workbenches/${workbenchId}`, {
      config
    });
    const responseData = response.data;
    if (!responseData?.success) {
      throw new Error(responseData?.message || i18next.t('workbench:workbenchApi.update_app_config_failed', 'Failed to update app configuration'));
    }
    return responseData.data?.config;
  } catch (error) {
    console.error(i18next.t('workbench:workbenchApi.update_app_config_failed', 'Failed to update app configuration'), error);
    throw error;
  }
};

export const getWorkbenchVersions = async (workbenchId: string): Promise<WorkbenchVersionResponse> => {
  try {

    const response = await apiClient.get<WorkbenchVersionResponse>(`/workbenches/${workbenchId}/versions`);

    if ('success' in response && 'items' in response) {

      if (!response.success) {
        return {
          success: false,
          items: [],
          message: response.message || i18next.t('workbench:workbenchApi.get_versions_failed', 'Failed to get workbench version list')
        };
      }
      return response as WorkbenchVersionResponse;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as WorkbenchVersionResponse;
      if (!data.success) {
        return {
          success: false,
          items: [],
          message: data.message || i18next.t('workbench:workbenchApi.get_versions_failed', 'Failed to get workbench version list')
        };
      }
      return data;
    }

    return {
      success: false,
      items: [],
      message: i18next.t('workbench:workbenchApi.response_data_empty', 'Response data is empty')
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : i18next.t('workbench:workbenchApi.get_versions_failed', 'Failed to get workbench version list');
    return {
      success: false,
      items: [],
      message: errorMessage
    };
  }
};

export const restoreWorkbenchVersion = async (
  workbenchId: string,
  versionId: string
): Promise<WorkbenchVersionRestoreResponse> => {
  try {

    const response = await apiClient.post<WorkbenchVersionRestoreResponse>(
      `/workbenches/${workbenchId}/versions/${versionId}/restore`,
      {}
    );

    if ('success' in response && 'data' in response) {

      if (!response.success) {
        return {
          success: false,
          data: {} as Workbench,
          message: response.message || i18next.t('workbench:workbenchApi.restore_workbench_version_failed', 'Failed to restore workbench version')
        };
      }
      return response as unknown as WorkbenchVersionRestoreResponse;
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const data = response.data as unknown as WorkbenchVersionRestoreResponse;
      if (!data.success) {
        return {
          success: false,
          data: {} as Workbench,
          message: data.message || i18next.t('workbench:workbenchApi.restore_workbench_version_failed', 'Failed to restore workbench version')
        };
      }
      return data;
    }

    return {
      success: false,
      data: {} as Workbench,
      message: i18next.t('workbench:workbenchApi.response_data_empty', 'Response data is empty')
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : i18next.t('workbench:workbenchApi.restore_workbench_version_failed', 'Failed to restore workbench version');
    return {
      success: false,
      data: {} as Workbench,
      message: errorMessage
    };
  }
}; 
