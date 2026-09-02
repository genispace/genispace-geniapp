import apiClient from '../api/apiClient';
import {
  Application,
  ApplicationFilter,
  ApplicationStatus,
  CreateApplicationData,
  ApplicationCategory,
  ApplicationTemplate,
  ApplicationDeployment,
  ApplicationReview,
  ApplicationOrder,
  ApplicationApiKey
} from '@/types';

export interface ApplicationListResponse {
  success: boolean;
  data: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApplicationDetailResponse {
  success: boolean;
  data: Application;
}

export interface ApplicationStatsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    growth: number;
    breakdown: {
      containerized: number;
      lowcode: number;
    };
  };
}

class ApplicationApiService {

  async getMyApplications(filters: Partial<ApplicationFilter> = {}, page = 1, limit = 20): Promise<ApplicationListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const search = filters.search;
    if (typeof search === 'string' && search) {
      params.append('search', search);
    }
    const category = filters.category;
    if (typeof category === 'string' && category && category !== 'all') {
      params.append('category', category);
    }
    const status = filters.status;
    if (typeof status === 'string' && status && status !== 'all') {
      params.append('status', status);
    }

    const response = await apiClient.get<{
      success: boolean;
      data: Application[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/applications/my?${params.toString()}`);

    return {
      success: response.data?.success || false,
      data: response.data?.data || [],
      pagination: response.data?.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    };
  }

  async getApplicationById(id: string): Promise<Application> {
    const response = await apiClient.get<ApplicationDetailResponse>(`/applications/${id}`);
    return response.data!.data;
  }

  async createApplication(data: CreateApplicationData): Promise<Application> {
    const response = await apiClient.post<ApplicationDetailResponse>('/applications', data);
    return response.data!.data;
  }

  async updateApplication(id: string, data: Partial<CreateApplicationData>): Promise<Application> {
    const response = await apiClient.put<ApplicationDetailResponse>(`/applications/${id}`, data);
    return response.data!.data;
  }

  async deleteApplication(id: string): Promise<void> {
    await apiClient.delete(`/applications/${id}`);
  }

  async toggleApplicationStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const response = await apiClient.put<ApplicationDetailResponse>(`/applications/${id}`, { status });
    return response.data!.data;
  }

  async deployApplication(id: string, versionId?: string, environment = 'production'): Promise<ApplicationDeployment> {
    const data: any = { environment };
    if (versionId) {
      data.versionId = versionId;
    }

    const response = await apiClient.post<{ success: boolean; data: ApplicationDeployment }>(`/applications/${id}/deploy`, data);
    return response.data!.data;
  }

  async stopApplication(id: string): Promise<void> {
    await apiClient.post(`/applications/${id}/stop`);
  }

  async getApplicationDeployments(id: string): Promise<ApplicationDeployment[]> {
    const response = await apiClient.get<{ success: boolean; data: ApplicationDeployment[] }>(`/applications/${id}/deployments`);
    return response.data!.data;
  }

  async getApplicationLogs(id: string, options: { lines?: number; since?: string; level?: string } = {}): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.lines) params.append('lines', options.lines.toString());
    if (options.since) params.append('since', options.since);
    if (options.level) params.append('level', options.level);

    const response = await apiClient.get<{ success: boolean; data: any[] }>(`/applications/${id}/logs?${params.toString()}`);
    return response.data!.data;
  }

  async getApplicationStats(id: string, timeRange = '7d'): Promise<any> {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/applications/${id}/stats?timeRange=${timeRange}`);
    return response.data!.data;
  }

  async getApplicationTemplates(framework?: string): Promise<ApplicationTemplate[]> {
    const params = new URLSearchParams();
    if (framework) params.append('framework', framework);

    const response = await apiClient.get<{ success: boolean; data: ApplicationTemplate[] }>(`/applications/templates?${params.toString()}`);
    return response.data!.data;
  }

  async getApplicationCategories(): Promise<ApplicationCategory[]> {
    const response = await apiClient.get<{ success: boolean; data: ApplicationCategory[] }>('/applications/categories');
    return response.data!.data;
  }

  async purchaseApplication(id: string, data: {
    planType: string;
    authorizedUsers?: number;
    authorizedTeams?: number;
  }): Promise<ApplicationOrder> {
    const response = await apiClient.post<{ success: boolean; data: ApplicationOrder }>(`/applications/${id}/purchase`, data);
    return response.data!.data;
  }

  async installFreeApplication(id: string): Promise<void> {
    await apiClient.post(`/applications/${id}/install`);
  }

  async getMyApplicationOrders(page = 1, limit = 20, status?: string): Promise<{
    orders: ApplicationOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const response = await apiClient.get<{
      success: boolean;
      data: ApplicationOrder[];
      pagination: any;
    }>(`/applications/orders/my?${params.toString()}`);

    return {
      orders: response.data!.data,
      pagination: response.data!.pagination
    };
  }

  async getApplicationStatistics(): Promise<{
    total: number;
    active: number;
    growth: number;
    breakdown: {
      containerized: number;
      lowcode: number;
    };
  }> {
    const response = await apiClient.get<ApplicationStatsResponse>('/applications/statistics');
    return response.data!.data;
  }

  async getMyDashboardApplications(): Promise<Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    lastUsed: string;
    usage: string;
    link: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    const response = await apiClient.get<{
      success: boolean;
      data: Array<{
        id: string;
        title: string;
        description: string;
        type: string;
        status: string;
        lastUsed: string;
        usage: string;
        link: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/applications/my-dashboard');
    return response.data!.data;
  }

  async createApplicationReview(id: string, data: {
    rating: number;
    comment?: string;
    version?: string;
  }): Promise<ApplicationReview> {
    const response = await apiClient.post<{ success: boolean; data: ApplicationReview }>(`/applications/${id}/reviews`, data);
    return response.data!.data;
  }

  async updateApplicationReview(id: string, data: {
    rating: number;
    comment?: string;
    version?: string;
  }): Promise<ApplicationReview> {
    const response = await apiClient.put<{ success: boolean; data: ApplicationReview }>(`/applications/${id}/reviews`, data);
    return response.data!.data;
  }

  async deleteApplicationReview(id: string): Promise<void> {
    await apiClient.delete(`/applications/${id}/reviews`);
  }

  async createApiKey(id: string, data: {
    keyName: string;
    permissions?: Record<string, any>;
    rateLimit?: number;
    expiresAt?: string;
  }): Promise<ApplicationApiKey> {
    const response = await apiClient.post<{ success: boolean; data: ApplicationApiKey }>(`/applications/${id}/api-keys`, data);
    return response.data!.data;
  }

  async updateApiKey(appId: string, keyId: string, data: {
    keyName?: string;
    permissions?: Record<string, any>;
    rateLimit?: number;
    isActive?: boolean;
    expiresAt?: string;
  }): Promise<ApplicationApiKey> {
    const response = await apiClient.put<{ success: boolean; data: ApplicationApiKey }>(`/applications/${appId}/api-keys/${keyId}`, data);
    return response.data!.data;
  }

  async deleteApiKey(appId: string, keyId: string): Promise<void> {
    await apiClient.delete(`/applications/${appId}/api-keys/${keyId}`);
  }
}

export const applicationApi = new ApplicationApiService();

export { ApplicationApiService };

export default applicationApi;
