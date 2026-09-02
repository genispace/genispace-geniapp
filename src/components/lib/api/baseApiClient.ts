import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, HttpMethod, PaginatedResponse } from '../types/api';

import { getConfig, waitForConfig, isConfigLoaded } from '../config';
import { getWorkbenchHostAdapters } from './hostAdapterBridge';

const baseAxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, 
});

baseAxiosInstance.interceptors.request.use(async (config) => {

  if (!isConfigLoaded()) {
    await waitForConfig();
  }

  const currentConfig = getConfig();
  config.baseURL = currentConfig.API_BASE_URL;

  const currentLanguage = localStorage.getItem('i18nextLng') || 'en';
  config.headers['X-Language'] = currentLanguage;

  return config;
});

function isBenignCanceledRequest(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  const e = error as { code?: string; message?: string; name?: string };
  if (e?.code === 'ERR_CANCELED') return true;
  if (typeof e?.message === 'string' && e.message.toLowerCase() === 'canceled') return true;
  if (e?.name === 'CanceledError' || e?.name === 'AbortError') return true;
  return false;
}

baseAxiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (!isBenignCanceledRequest(error)) {
      console.error('非流式响应处理失败:', error.response?.data || {
        message: error.message,
        code: error.code,
        timeout: error.code === 'ECONNABORTED' && error.message.includes('timeout')
      });
    }
    return Promise.reject(error);
  }
);

baseAxiosInstance.interceptors.request.use(
  (config) => {

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

class BaseApiClient {
  private axiosInstance = baseAxiosInstance;

  constructor() {}

  public getInstance() {
    return this.axiosInstance;
  }

  private async request<T>(
    url: string, 
    method: HttpMethod, 
    body?: any, 
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const hostRequest = getWorkbenchHostAdapters().request;
      if (hostRequest) {
        return await hostRequest<T>({
          url,
          method,
          body,
          headers: config?.headers as Record<string, string> | undefined,
          signal: config?.signal as AbortSignal | undefined,
          responseType: config?.responseType === 'blob' ? 'blob' : 'json',
        }) as ApiResponse<T>;
      }
      const response = await this.axiosInstance.request({
        url,
        method,
        data: body,
        ...config
      });

      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }

      return {
        success: true,
        data: response.data,
        code: response.status,
        message: response.statusText || 'Success',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {

      const msg = error.response?.data?.message || error.message || 'Request failed';
      const errorResponse = Object.assign(new Error(msg), {
        success: false as const,
        code: error.response?.status || 500,
        error: error.response?.data?.error || 'Unknown error',
        errorDetails: error.response?.data,
        response: { status: error.response?.status, data: error.response?.data },
        timestamp: new Date().toISOString(),
      });

      throw errorResponse;
    }
  }

  public get<T>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    let finalUrl = url;

    if (params && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}${queryParams.toString()}`;
    }

    return this.request<T>(finalUrl, 'GET', undefined, config);
  }

  public post<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, 'POST', body, config);
  }

  public put<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, 'PUT', body, config);
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, 'DELETE', undefined, config);
  }

  public patch<T>(url: string, body?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(url, 'PATCH', body, config);
  }

  public async getWithPagination<T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (!['page', 'limit'].includes(key) && value !== undefined && value !== null) {
          query.append(key, value.toString());
        }
      });
    }
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}${query.toString()}`;

    const hostRequest = getWorkbenchHostAdapters().request;
    if (hostRequest) {
      return await hostRequest<T>({
        url: finalUrl,
        method: 'GET',
        headers: config?.headers as Record<string, string> | undefined,
        signal: config?.signal as AbortSignal | undefined,
      }) as unknown as PaginatedResponse<T>;
    }

    const response = await this.axiosInstance.get(finalUrl, config);
    return response.data;
  }

  public uploadFile<T>(url: string, file: File, additionalData?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(url, 'POST', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    });
  }

  public async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const hostRequest = getWorkbenchHostAdapters().request;
      const response = hostRequest
        ? await hostRequest<Blob>({ url, method: 'GET', responseType: 'blob' })
        : await this.axiosInstance.get(url, { responseType: 'blob' });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw error;
    }
  }
}

export const baseApiClient = new BaseApiClient();

export { BaseApiClient };

export { baseAxiosInstance };
