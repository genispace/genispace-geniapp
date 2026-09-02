import apiClient from '@/lib/api/apiClient';
import { toast } from '@genispace/shared-ui';
import i18next from 'i18next';

export interface ApiKey {
  id: string;
  name: string;
  key?: string;
  application?: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRevoked: boolean;
  permissions: string[];
}

export interface ApiKeyCreateParams {
  name: string;
  application?: string;
  expiresAt?: string;
  permissions: string[];
}

export interface ApiKeyUpdateParams {
  name?: string;
  application?: string | null;
  expiresAt?: string | null;
  permissions?: string[];
}

export interface ApiError {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export const getPermissionOptions = () => [
  { value: 'read:agents', label: i18next.t('apiKey.permissions.read_agents', 'Read Agents') },
  { value: 'write:agents', label: i18next.t('apiKey.permissions.write_agents', 'Create/Modify Agents') },
  { value: 'read:tasks', label: i18next.t('apiKey.permissions.read_tasks', 'Read Tasks') },
  { value: 'write:tasks', label: i18next.t('apiKey.permissions.write_tasks', 'Create/Modify Tasks') },
  { value: 'read:knowledge', label: i18next.t('apiKey.permissions.read_knowledge', 'Read Knowledge Base') },
  { value: 'write:knowledge', label: i18next.t('apiKey.permissions.write_knowledge', 'Create/Modify Knowledge Base') }
];

export const permissionOptions = getPermissionOptions();

export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return i18next.t('apiKey.status.none', 'None');
  return new Date(dateStr).toLocaleString(i18next.language || 'en-US');
};

export const getKeyStatus = (key: ApiKey) => {
  if (key.isRevoked) return { 
    label: i18next.t('apiKey.status.revoked', 'Revoked'), 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
  };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) 
    return { 
      label: i18next.t('apiKey.status.expired', 'Expired'), 
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
    };
  return { 
    label: i18next.t('apiKey.status.active', 'Active'), 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
  };
};

const handleApiError = (error: unknown, defaultMessage: string): ApiError => {

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as { response?: { data?: { message?: string }; status?: number } };
    if (apiError.response?.data?.message) {
      return {
        message: apiError.response.data.message,
        code: String(apiError.response.status),
        details: apiError.response.data
      };
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      details: error
    };
  }

  return {
    message: defaultMessage,
    details: error
  };
};

export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const response = await apiClient.get<ApiKey[]>('/api-keys');

    if (!response.success) {
      throw new Error(response.message || i18next.t('apiKey.errors.api_failed', 'API returned failed status'));
    }

    return response.data || [];
  } catch (error) {

    const apiError = handleApiError(error, i18next.t('apiKey.errors.fetch_failed', 'Failed to fetch API key list'));

    toast({
      variant: "destructive",
      title: i18next.t('apiKey:fetch_error', 'Failed to fetch'),
      description: i18next.t('apiKey:fetch_error_message', 'Unable to load API key list')
    });
    console.error('获取API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const createApiKey = async (data: ApiKeyCreateParams): Promise<{key: string, id: string}> => {
  try {
    if (!data.name.trim()) {
      throw new Error(i18next.t('apiKey.errors.name_required', 'Key name cannot be empty'));
    }

    const response = await apiClient.post<ApiKey>('/api-keys', data);

    if (!response.success) {
      throw new Error(response.message || i18next.t('apiKey.errors.create_failed', 'Failed to create API key'));
    }

    toast({
      title: i18next.t('apiKey:create_success', 'Created successfully'),
      description: i18next.t('apiKey:create_success_message', 'API key created successfully')
    });

    return {
      key: response.data?.key || '',
      id: response.data?.id || ''
    };
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.create_failed', 'Failed to create API key'));
    toast({
      variant: "destructive",
      title: i18next.t('apiKey:create_error', 'Failed to create'),
      description: i18next.t('apiKey:create_error_message', apiError.message)
    });
    console.error('创建API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const updateApiKey = async (keyId: string, data: ApiKeyUpdateParams): Promise<ApiKey> => {
  try {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error(i18next.t('apiKey.errors.name_required', 'Key name cannot be empty'));
    }

    const response = await apiClient.put<{data: ApiKey, message: string, success: boolean}>(`/api-keys/${keyId}`, data);

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.update_failed', 'Failed to update API key'));
    }

    toast({
      title: i18next.t('apiKey:update_success', 'Updated successfully'),
      description: i18next.t('apiKey:update_success_message', 'API key updated successfully')
    });
    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.update_failed', 'Failed to update API key'));
    toast({
      variant: "destructive",
      title: i18next.t('apiKey:update_error', 'Failed to update'),
      description: i18next.t('apiKey:update_error_message', apiError.message)
    });
    console.error('更新API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const revokeApiKey = async (keyId: string): Promise<ApiKey> => {
  try {
    const response = await apiClient.post<{data: ApiKey, message: string, success: boolean}>(`/api-keys/${keyId}/revoke`, {});

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.revoke_failed', 'Failed to revoke API key'));
    }

    toast({
      title: i18next.t('apiKey:revoke_success', 'Revoked successfully'),
      description: i18next.t('apiKey:revoke_success_message', 'API key revoked successfully')
    });
    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.revoke_failed', 'Failed to revoke API key'));
    toast({
      variant: "destructive",
      title: i18next.t('apiKey:revoke_error', 'Failed to revoke'),
      description: i18next.t('apiKey:revoke_error_message', apiError.message)
    });
    console.error('撤销API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const revokeMultipleApiKeys = async (keyIds: string[]): Promise<void> => {
  try {
    if (!keyIds.length) return;

    const response = await apiClient.post<ApiResponse<{success: number, failed: number}>>('/api-keys/batch-revoke', { keyIds });

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.batch_revoke_failed', 'Failed to batch revoke API keys'));
    }

    const { success, failed } = response.data!.data;

    if (failed > 0) {
      toast({
        title: i18next.t('apiKey:batch_revoke_partial', 'Partially revoked'),
        description: i18next.t('apiKey:batch_revoke_partial_message', '{{success}} keys revoked successfully, {{failed}} keys failed', { success, failed })
      });
    } else {
      toast({
        title: i18next.t('apiKey:batch_revoke_success', 'Revoked successfully'),
        description: i18next.t('apiKey:batch_revoke_success_message', 'All selected keys have been revoked')
      });
    }
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.batch_revoke_failed', 'Failed to batch revoke API keys'));
    toast({
      variant: "destructive",
      title: i18next.t('apiKey:batch_revoke_error', 'Failed to revoke'),
      description: i18next.t('apiKey:batch_revoke_error_message', apiError.message)
    });
    console.error('批量撤销API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const validateApiKey = async (keyValue: string): Promise<{ valid: boolean; details?: ApiKey }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ valid: boolean; details?: ApiKey }>>('/api-keys/validate', { key: keyValue });

    return response.data!.data;
  } catch {
    return { valid: false };
  }
};

export interface KeyUsageStats {
  requestsLastDay: number;
  requestsLastWeek: number;
  requestsLastMonth: number;
  lastUsedIp?: string;
  topEndpoints: {path: string, count: number}[];
}

export const getKeyUsageStats = async (keyId: string): Promise<KeyUsageStats> => {
  try {
    const response = await apiClient.get<ApiResponse<KeyUsageStats>>(`/api-keys/${keyId}/usage`);

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.get_stats_failed', 'Failed to get key usage statistics'));
    }

    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.get_stats_failed', 'Failed to get key usage statistics'));
    console.error('获取密钥使用统计失败:', error);

    return Promise.reject(apiError);
  }
};

export const fetchTeamApiKeys = async (spaceId: string): Promise<ApiKey[]> => {
  try {
    const response = await apiClient.get<ApiResponse<ApiKey[]>>(`/api-keys/spaces/${spaceId}`);

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.get_space_keys_failed', 'Failed to get space API keys'));
    }

    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.get_space_keys_failed', 'Failed to get space API keys'));
    console.error('获取空间API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const fetchMemberApiKeys = async (spaceId: string, memberId: string): Promise<ApiKey[]> => {
  try {
    const response = await apiClient.get<ApiResponse<ApiKey[]>>(`/api-keys/spaces/${spaceId}/members/${memberId}`);

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.get_member_keys_failed', 'Failed to get member API keys'));
    }

    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.get_member_keys_failed', 'Failed to get member API keys'));
    console.error('获取成员API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export const revokeMemberApiKey = async (spaceId: string, memberId: string, keyId: string): Promise<ApiKey> => {
  try {
    const response = await apiClient.post<ApiResponse<ApiKey>>(`/api-keys/spaces/${spaceId}/members/${memberId}/${keyId}/revoke`, {});

    if (!response.data?.success) {
      throw new Error(response.data?.message || i18next.t('apiKey.errors.revoke_member_key_failed', 'Failed to revoke member API key'));
    }

    return response.data!.data;
  } catch (error) {
    const apiError = handleApiError(error, i18next.t('apiKey.errors.revoke_member_key_failed', 'Failed to revoke member API key'));
    console.error('撤销成员API密钥失败:', error);

    return Promise.reject(apiError);
  }
};

export default {
  fetchApiKeys,
  createApiKey,
  updateApiKey,
  revokeApiKey,
  formatDateTime,
  getKeyStatus,
  permissionOptions,
  revokeMultipleApiKeys,
  fetchTeamApiKeys,
  fetchMemberApiKeys,
  revokeMemberApiKey
};
