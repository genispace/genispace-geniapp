import apiClient from '@/lib/api/apiClient';
import i18n from '@/locales/i18n';

export interface ConfigMap {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isDeleted: boolean;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    configVariables: number;
  };
}

export interface ConfigVariable {
  id: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  configMapId: string;
  spaceId: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigMapData {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateConfigMapData {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface ConfigMapListResponse {
  data: ConfigMap[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface YamlImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: unknown;
}

export interface CreateConfigVariableData {
  key: string;
  value: string;
  description?: string;
  isSecret?: boolean;
}

export interface UpdateConfigVariableData {
  key?: string;
  value?: string;
  description?: string;
  isSecret?: boolean;
}

export class ConfigMapService {
  private baseUrl = '/config-maps';

  async getConfigMaps(params?: {
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ConfigMapListResponse> {
    const response = await apiClient.get<ConfigMapListResponse>(this.baseUrl, params);
    if (!response.data) {
      throw new Error(i18n.t('configMap:errors.get_list_failed', 'Failed to get ConfigMap list'));
    }
    return response.data;
  }

  async getConfigMapById(id: string, includeVariables?: boolean): Promise<ConfigMap> {
    const params = includeVariables ? { includeVariables: true } : undefined;
    const response = await apiClient.get<ConfigMap>(`${this.baseUrl}/${id}`, params);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.get_failed', 'Failed to get ConfigMap'));
    }
    return response.data;
  }

  async getConfigMapByName(name: string, includeVariables?: boolean): Promise<ConfigMap> {
    const params = includeVariables ? { includeVariables: true } : undefined;
    const response = await apiClient.get<ConfigMap>(`${this.baseUrl}/name/${name}`, params);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.get_failed', 'Failed to get ConfigMap'));
    }
    return response.data;
  }

  async createConfigMap(data: CreateConfigMapData): Promise<ConfigMap> {
    const response = await apiClient.post<ConfigMap>(this.baseUrl, data);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.create_failed', 'Failed to create ConfigMap'));
    }
    return response.data;
  }

  async updateConfigMap(id: string, data: UpdateConfigMapData): Promise<ConfigMap> {
    const response = await apiClient.put<ConfigMap>(`${this.baseUrl}/${id}`, data);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.update_failed', 'Failed to update ConfigMap'));
    }
    return response.data;
  }

  async deleteConfigMap(id: string): Promise<void> {
    await apiClient.delete<void>(`${this.baseUrl}/${id}`);
  }

  async getDefaultConfigMap(): Promise<ConfigMap> {
    const response = await apiClient.get<ConfigMap>(`${this.baseUrl}/default`);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.get_default_failed', 'Failed to get default ConfigMap'));
    }
    return response.data;
  }

  async ensureDefaultConfigMap(): Promise<ConfigMap> {
    const response = await apiClient.post<ConfigMap>(`${this.baseUrl}/default/ensure`, {});

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.ensure_default_failed', 'Failed to ensure default ConfigMap'));
    }
    return response.data;
  }

  async duplicateConfigMap(sourceId: string, newName: string, description?: string): Promise<ConfigMap> {
    const response = await apiClient.post<ConfigMap>(`${this.baseUrl}/${sourceId}/duplicate`, {
      newName,
      description
    });

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.duplicate_failed', 'Failed to duplicate ConfigMap'));
    }
    return response.data;
  }

  async setDefaultConfigMap(id: string): Promise<ConfigMap> {
    const response = await apiClient.post<ConfigMap>(`${this.baseUrl}/${id}/set-default`, {});

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.set_default_failed', 'Failed to set default ConfigMap'));
    }
    return response.data;
  }

  async unsetDefaultConfigMap(id: string): Promise<ConfigMap> {
    const response = await apiClient.post<ConfigMap>(`${this.baseUrl}/${id}/unset-default`, {});

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.unset_default_failed', 'Failed to unset default ConfigMap'));
    }
    return response.data;
  }

  async exportConfigMapYaml(id: string, format: 'k8s' | 'simple' = 'simple'): Promise<string> {
    const response = await apiClient.get<string>(`${this.baseUrl}/${id}/yaml`, { format });
    if (!response.data) {
      throw new Error(i18n.t('configMap:errors.export_yaml_failed', 'Failed to export YAML'));
    }
    return response.data;
  }

  async importConfigMapYaml(
    id: string, 
    yaml: string, 
    options: {
      overwrite?: boolean;
      format?: 'k8s' | 'simple';
    } = {}
  ): Promise<YamlImportResult> {
    const response = await apiClient.post<YamlImportResult>(`${this.baseUrl}/${id}/yaml`, {
      yaml,
      overwrite: options.overwrite || false,
      format: options.format || 'simple'
    });

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.import_yaml_failed', 'Failed to import YAML'));
    }
    return response.data;
  }

  async getConfigVariables(configMapId: string, showSecrets?: boolean): Promise<ConfigVariable[]> {
    const params = showSecrets ? { showSecrets: true } : undefined;
    const response = await apiClient.get<ConfigVariable[]>(`/config-variables/config-map/${configMapId}`, params);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.get_variables_failed', 'Failed to get config variables'));
    }
    return response.data;
  }

    async getConfigVariable(id: string, showSecrets?: boolean): Promise<ConfigVariable> {
      const params = showSecrets ? { showSecrets: true } : undefined;
      const response = await apiClient.get<ConfigVariable>(`/config-variables/${id}`, params);

      if (!response.success || !response.data) {
        throw new Error(i18n.t('configMap:errors.get_variable_failed', 'Failed to get config variable'));
      }
      return response.data;
    }

  async createConfigVariable(configMapId: string, data: CreateConfigVariableData): Promise<ConfigVariable> {
    const response = await apiClient.post<ConfigVariable>('/config-variables', {
      configMapId,
      ...data
    });

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.create_variable_failed', 'Failed to create config variable'));
    }
    return response.data;
  }

  async updateConfigVariable(id: string, data: UpdateConfigVariableData): Promise<ConfigVariable> {
    const response = await apiClient.put<ConfigVariable>(`/config-variables/${id}`, data);

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.update_variable_failed', 'Failed to update config variable'));
    }
    return response.data;
  }

  async deleteConfigVariable(id: string): Promise<void> {
    await apiClient.delete<void>(`/config-variables/${id}`);
  }

  async batchUpsertConfigVariables(
    configMapId: string, 
    variables: CreateConfigVariableData[]
  ): Promise<YamlImportResult> {
    const response = await apiClient.post<YamlImportResult>('/config-variables/batch', {
      configMapId,
      variables
    });

    if (!response.success || !response.data) {
      throw new Error(i18n.t('configMap:errors.batch_upsert_failed', 'Failed to batch upsert config variables'));
    }
    return response.data;
  }
}

export const configMapService = new ConfigMapService();
export default configMapService;