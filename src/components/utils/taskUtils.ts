import apiClient from '@/lib/api/apiClient';

export interface TaskSchema {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, TaskNodeInput>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskNodeInput {
  params: Record<string, TaskInputParam>;
  nodeType: string;
  nodeName: string;
  description?: string;
}

export interface TaskInputParam {
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: unknown[];
  arrayType?: string;
  maxItems?: number;
  maxSize?: number;
  accept?: string;
}

export async function getTaskSchema(taskId: string): Promise<TaskSchema> {
  const response = await apiClient.get<TaskSchema>(`/tasks/${taskId}/schema`);
  return response.data;
}

export function getRequiredAndOptionalInputs(schema: TaskSchema): {
  required: Array<[string, string, TaskInputParam]>;
  optional: Array<[string, string, TaskInputParam]>;
} {
  const required: Array<[string, string, TaskInputParam]> = [];
  const optional: Array<[string, string, TaskInputParam]> = [];

  if (schema?.inputs) {
    Object.entries(schema.inputs).forEach(([nodeId, nodeInfo]) => {
      Object.entries(nodeInfo.params).forEach(([paramName, paramSchema]) => {
        const fieldInfo = [nodeId, paramName, paramSchema] as [string, string, TaskInputParam];

        if (paramSchema.required && paramSchema.default === undefined) {
          required.push(fieldInfo);
        } else {
          optional.push(fieldInfo);
        }
      });
    });
  }

  return { required, optional };
}

export function checkTaskParamsFilled(
  params: Record<string, unknown>,
  schema: TaskSchema
): Array<[string, string, TaskInputParam]> {
  const { required } = getRequiredAndOptionalInputs(schema);
  const missing: Array<[string, string, TaskInputParam]> = [];

  for (const [nodeId, paramName, paramSchema] of required) {
    const fieldId = `${nodeId}.${paramName}`;
    const value = params[fieldId];

    if (paramSchema.type === 'file') {

      const fileValue = value as { status?: string } | null;
      if (!fileValue || !fileValue.status || fileValue.status !== 'uploaded') {
        missing.push([nodeId, paramName, paramSchema]);
      }
    } else if (paramSchema.type === 'array') {

      if (!Array.isArray(value) || value.length === 0) {
        missing.push([nodeId, paramName, paramSchema]);
      }
    } else if (value === undefined || value === null || value === '') {
      missing.push([nodeId, paramName, paramSchema]);
    }
  }

  return missing;
}

export function formatTaskParamsForAPI(formData: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const apiFormData: Record<string, Record<string, unknown>> = {};

  Object.entries(formData).forEach(([key, value]) => {
    const [nodeId, paramName] = key.split('.');
    if (!apiFormData[nodeId]) {
      apiFormData[nodeId] = {};
    }
    apiFormData[nodeId][paramName] = value;
  });

  return apiFormData;
}

export async function executeTask(
  taskId: string,
  params: Record<string, Record<string, unknown>>
): Promise<{ id?: string; executionId?: string; [key: string]: unknown }> {
  const response = await apiClient.post(`/tasks/${taskId}/execute`, params);
  return (response.data ?? {}) as { id?: string; executionId?: string; [key: string]: unknown };
}

