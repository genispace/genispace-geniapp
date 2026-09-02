import React, { useState, useEffect, useCallback, useRef, useMemo, useContext, forwardRef, useImperativeHandle } from 'react';
import { Play, ChevronDown, ChevronUp, Loader2, X, History } from 'lucide-react';
import { toast, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { useTranslation } from 'react-i18next';
import { ParameterContext } from '@/contexts/ParameterContext';
import type { ParameterValue } from '@/types/parameters';
import apiClient from '@/lib/api/apiClient';
import { Button } from '@genispace/shared-ui';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, FormFieldSkeleton } from '@genispace/shared-ui';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import ExecutionHistoryModal from './ExecutionHistoryModal';
import TaskInputField from './TaskInputField';
import TaskExecutionOutputs from './TaskExecutionOutputs';
import { useTaskInputDataSourceCache } from '@/hooks/useTaskInputDataSourceCache';
import Loading from '../Loading';

interface WorkbenchOutput {
  nodeId: string;
  output: Record<string, unknown>;
  success: boolean;
}

interface TaskExecutionResult {
  success: boolean;
  data?: unknown;
  message?: string;
  executionId?: string;
}

interface TaskExecutionError {
  message: string;
  code?: string;
  details?: unknown;
}

interface FileUploadValue {
  name: string;
  size: number;
  type: string;
  url: string;
  fileId: string;
  publicUrl?: string;
  storageKey?: string;
  status: 'uploaded';
}

interface TaskInputRendererProps {

  taskId?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;

  showTitle?: boolean;
  showDescription?: boolean;
  showOptionalInputs?: boolean;
  compact?: boolean;

  embedded?: boolean;

  embeddedFieldLayout?: 'card' | 'plain';

  autoSubmit?: boolean;

  className?: string;

  onSuccessCode?: string;
  onErrorCode?: string;

  onSuccess?: (result: TaskExecutionResult) => void;
  onError?: (error: TaskExecutionError) => void;

  onParameterChange?: (key: string, value: any) => void;
  componentId?: string;

  parameterConfig?: {
    parameterMapping?: Record<string, {
      source?: string;
      value?: string;
      labelText?: string;
      requiredInTaskInput?: boolean;
      sortOrder?: number;
    }>;
  };

  useMockData?: boolean;
  mockFileData?: {
    enabled: boolean;
    files: Array<{
      name: string;
      size: number;
      type: string;
      content: string;
      url: string;
      lastModified: string;
    }>;
  };

  interactiveMode?: 'professional' | 'normal';

  submitButtonPlacement?: 'default' | 'dialogFooter';

  isDialogExecuting?: boolean;
  onDialogExecutingChange?: (executing: boolean) => void;

  initialParams?: Record<string, unknown>;

  mappingContext?: {
    formFieldValues?: Record<string, unknown>;
    pageParams?: Record<string, unknown>;
  };
}

export interface TaskInputRendererHandle {
  submitTask: () => Promise<void>;
}

interface TaskSchema {
  id: string;
  name: string;
  description: string;
  inputs: Record<string, TaskNodeInput>;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskNodeInput {
  params: Record<string, TaskInputParam>;
  nodeType: string;
  nodeName: string;
  description?: string;
}

interface TaskInputParam {
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

interface FileUploadResponse {
  filename?: string;
  size?: number;
  url: string;
  publicUrl?: string;
  fileId?: string;
  storageKey?: string;
}

interface LogEntry {
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  executionId: string;
}

interface ExecutionStatus {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'RETRY' | 'TIMEOUT';

  startTime?: string | null;
  endTime?: string | null;
  duration?: number;
  logs: LogEntry[];
  outputs?: Record<string, unknown>;
  error?: string;
  task: {
    id: string;
    name: string;
    type: string;
  };

  [key: string]: unknown;
}

const generateMockTaskId = (): string => {
  return 'mock-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const EXECUTION_OVERLAY_STATUSES: ExecutionStatus['status'][] = ['PENDING', 'RUNNING', 'RETRY'];

function peelTaskRunApiPayload(raw: unknown): unknown {
  let cur: unknown = raw;
  for (let depth = 0; depth < 4; depth++) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) break;
    const o = cur as Record<string, unknown>;
    if (o.success === true && 'data' in o) {
      const next = o.data;
      if (next !== null && next !== undefined && typeof next === 'object' && !Array.isArray(next)) {
        cur = next;
        continue;
      }
    }
    break;
  }
  return cur;
}

function isTaskRunRecordShape(o: Record<string, unknown>): boolean {
  if (typeof o.id !== 'string' || typeof o.status !== 'string') return false;
  if (typeof o.taskId === 'string') return true;
  if (o.task && typeof o.task === 'object' && !Array.isArray(o.task)) return true;
  if (typeof o.taskType === 'string') return true;
  return false;
}

function unwrapExecutionRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const o = payload as Record<string, unknown>;

  if (isTaskRunRecordShape(o)) {
    return o;
  }

  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const innerObj = inner as Record<string, unknown>;
    if (typeof innerObj.id === 'string' && typeof innerObj.status === 'string') {
      return innerObj;
    }
  }
  return o;
}

const TERMINAL_EXECUTION_STATUSES: ExecutionStatus['status'][] = [
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'TIMEOUT'
];

function normalizeRunStatus(raw: unknown): ExecutionStatus['status'] | undefined {
  if (typeof raw !== 'string') return undefined;
  const u = raw.toUpperCase();
  if (
    u === 'PENDING' ||
    u === 'RUNNING' ||
    u === 'COMPLETED' ||
    u === 'FAILED' ||
    u === 'CANCELED' ||
    u === 'RETRY' ||
    u === 'TIMEOUT'
  ) {
    return u as ExecutionStatus['status'];
  }
  return undefined;
}

function pickExecutionIdFromExecuteResponse(payload: unknown): string | undefined {
  const peeled = peelTaskRunApiPayload(payload);
  const top =
    unwrapExecutionRecord(peeled) ??
    (peeled && typeof peeled === 'object' && !Array.isArray(peeled) ? (peeled as Record<string, unknown>) : null);
  if (!top) return undefined;
  const tryId = (o: Record<string, unknown>): string | undefined => {
    const id = o.id ?? o.executionId ?? o.runId;
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  };
  const direct = tryId(top);
  if (direct) return direct;
  const inner = top.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return tryId(inner as Record<string, unknown>);
  }
  return undefined;
}

function coerceExecutionFromPollPayload(payload: unknown): ExecutionStatus | null {
  const peeled = peelTaskRunApiPayload(payload);
  const rec = unwrapExecutionRecord(peeled);
  if (!rec || typeof rec.id !== 'string') return null;
  const status = normalizeRunStatus(rec.status);
  if (!status) return null;
  return { ...rec, status } as ExecutionStatus;
}

function isResolvedValueFilledForParam(paramSchema: TaskInputParam, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (paramSchema.type === 'file') {
    const fv = value as FileUploadValue | null;
    return Boolean(fv && fv.status === 'uploaded');
  }
  if (paramSchema.type === 'array') {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

const TaskInputRenderer = forwardRef<TaskInputRendererHandle, TaskInputRendererProps>(function TaskInputRenderer(
  {

    taskId,
    title,
    description,
    submitButtonText,

    showTitle = true,
    showDescription = true,
    showOptionalInputs: defaultShowOptionalInputs = false,
    compact = false,
    embedded = false,
    embeddedFieldLayout = 'card',

    interactiveMode = 'professional',
    submitButtonPlacement = 'default',

    autoSubmit = false,

    className,

    onSuccessCode,
    onErrorCode,

    onSuccess,
    onError,

    onParameterChange,
    componentId,

    parameterConfig,

    useMockData = false,
    mockFileData,

    isDialogExecuting: _isDialogExecuting = false,
    onDialogExecutingChange,

    initialParams,
    mappingContext
  },
  ref
) {
  const { t } = useTranslation(['workbench', 'form', 'task', 'file', 'common', 'renderers', 'execution']);
  const isNormalMode = interactiveMode === 'normal';
  const showCardHeader = Boolean(showTitle && !isNormalMode);
  const hideInternalSubmitFooter = submitButtonPlacement === 'dialogFooter';
  const plainEmbeddedFields = embedded && embeddedFieldLayout === 'plain';
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [schema, setSchema] = useState<TaskSchema | null>(null);
  const [schemaRetryKey, setSchemaRetryKey] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showOptionalInputs, setShowOptionalInputs] = useState(defaultShowOptionalInputs);
  const [fileUploads, setFileUploads] = useState<Record<string, { file: File, progress: number }>>({});
  const [arrayFilePreviews, setArrayFilePreviews] = useState<Record<string, Array<{ id: string; name: string; url: string; type: string; size: number }>>>({});
  const [copiedCode, setCopiedCode] = useState<Record<string, boolean>>({});
  const [isFormatting, setIsFormatting] = useState<Record<string, boolean>>({});

  const [mockMode, setMockMode] = useState(useMockData);
  const [mockFiles, setMockFiles] = useState<Array<{
    name: string;
    size: number;
    type: string;
    content: string;
    url: string;
    lastModified: string;
  }>>([]);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (useMockData && mockFileData?.enabled && mockFileData.files) {
      setMockMode(true);
      setMockFiles(mockFileData.files);
    } else {
      setMockMode(false);
      setMockFiles([]);
    }
  }, [useMockData, mockFileData, taskId]);

  const [showExecutionHistory, setShowExecutionHistory] = useState(false);

  const [formSectionExpanded, setFormSectionExpanded] = useState(true);

  // const [showExecutionLogs, setShowExecutionLogs] = useState(false);
  const [currentExecutionStatus, setCurrentExecutionStatus] = useState<ExecutionStatus | null>(null);

  useEffect(() => {
    if (!onDialogExecutingChange) return;
    const busy =
      (!mockMode && isSubmitting) ||
      (currentExecutionStatus !== null &&
        ['PENDING', 'RUNNING', 'RETRY'].includes(currentExecutionStatus.status));
    onDialogExecutingChange(busy);
  }, [onDialogExecutingChange, isSubmitting, mockMode, currentExecutionStatus]);

  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeCustomCode = useCallback((code: string, context: Record<string, unknown>) => {
    // Persisted callbacks are untrusted configuration and must never execute in
    // the application realm. Keep legacy props inert until a declarative action
    // contract replaces them.
    void code;
    void context;
    console.warn('[Workbench] Executable task callbacks are disabled');
  }, []);

  const parseWorkbenchOutputs = useCallback((executionData: Record<string, unknown>) => {
    const outputs: WorkbenchOutput[] = [];

    if (executionData.outputs && typeof executionData.outputs === 'object') {
      const outputsData = executionData.outputs as Record<string, unknown>;

      Object.entries(outputsData).forEach(([nodeId, nodeData]) => {
        if (typeof nodeData === 'object' && nodeData !== null) {
          const data = nodeData as Record<string, unknown>;

          if (data.data && typeof data.data === 'object') {
            const dataObj = data.data as Record<string, unknown>;
            if (dataObj.to_workbench === true && dataObj.output) {
              outputs.push({
                nodeId,
                output: dataObj.output as Record<string, unknown>,
                success: Boolean(data.success)
              });
            }
          }
        }
      });
    }

    return outputs;
  }, []);

  const parameterContext = useContext(ParameterContext);
  const broadcastTaskCompleted = useCallback((executionId: string, workbenchOutputs: WorkbenchOutput[] = []) => {
    const emit = (key: string, value: ParameterValue) => {
      if (onParameterChange) {
        onParameterChange(key, value);
      } else if (parameterContext?.broadcastParameterChange) {
        parameterContext.broadcastParameterChange(key, value, 'component', componentId);
      }
    };
    if (!onParameterChange && !parameterContext?.broadcastParameterChange) return;
    const refreshTimestamp = Date.now();
    const taskResult = {
      taskId: taskId,
      executionId,
      status: 'COMPLETED' as const,
      timestamp: refreshTimestamp,
      componentId: componentId,
      workbenchOutputs
    };
    emit('tableRefreshTrigger', refreshTimestamp);
    emit('lastTaskResult', taskResult);
    if (taskId) {
      emit(`task_${taskId}_completed`, taskResult);
    }
  }, [onParameterChange, parameterContext, taskId, componentId]);

  const applyExecutionPollResult = useCallback(
    (execution: ExecutionStatus) => {
      setCurrentExecutionStatus(execution);
      const outputs = parseWorkbenchOutputs(execution);

      if (TERMINAL_EXECUTION_STATUSES.includes(execution.status)) {
        if (statusPollIntervalRef.current) {
          clearInterval(statusPollIntervalRef.current);
          statusPollIntervalRef.current = null;
        }

        if (execution.status === 'COMPLETED') {
          toast({
            title: t('execution:task_completed', 'Task Execution Completed'),
            description: t('execution:task_completed_description', 'Task has been successfully completed')
          });
          broadcastTaskCompleted(execution.id, outputs);
        } else if (execution.status === 'FAILED' || execution.status === 'TIMEOUT') {
          toast({
            variant: 'destructive',
            title:
              execution.status === 'TIMEOUT'
                ? t('execution:task_timeout', 'Task Execution Timed Out')
                : t('execution:task_failed', 'Task Execution Failed'),
            description:
              execution.error ||
              (execution.status === 'TIMEOUT'
                ? t('execution:task_timeout_description', 'The task exceeded the allowed execution time')
                : t('execution:task_failed_description', 'An error occurred during task execution'))
          });
        }
      }
    },
    [parseWorkbenchOutputs, broadcastTaskCompleted, t]
  );

  const fetchExecutionStatus = useCallback(
    async (executionId: string) => {
      try {
        const response = await apiClient.get<ExecutionStatus>(`/tasks/runs/${executionId}`);
        const rawPayload = response.data ?? response;
        if (rawPayload === undefined || rawPayload === null) return;

        const execution = coerceExecutionFromPollPayload(rawPayload);
        if (!execution) {
          console.warn('[TaskInputRenderer] 无法解析运行状态，保留当前 UI 状态', response.data);
          return;
        }

        applyExecutionPollResult(execution);
      } catch (error: unknown) {
        console.error('获取执行状态失败:', error);
      }
    },
    [applyExecutionPollResult]
  );

  const startStatusPolling = useCallback(
    (executionId: string) => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
        statusPollIntervalRef.current = null;
      }
      fetchExecutionStatus(executionId);
      statusPollIntervalRef.current = setInterval(() => {
        fetchExecutionStatus(executionId);
      }, 1000);
    },
    [fetchExecutionStatus]
  );

  const stopStatusPolling = useCallback(() => {
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current);
      statusPollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {

    if (mockMode) {

      const effectiveTaskId = taskId || generateMockTaskId();

      const mockSchema: TaskSchema = {
        id: effectiveTaskId,
        name: title || t('renderers:task_input.mock_task', 'Mock Task'),
        description: description || t('renderers:task_input.mock_task_description', 'This is a mock task'),
        inputs: {
          'file-input': {
            params: {
              'file': {
                type: 'file',
                required: true,
                description: t('renderers:task_input.select_file', 'Select file to process')
              }
            },
            nodeType: 'file-input',
            nodeName: t('renderers:task_input.file_input', 'File Input'),
            description: t('renderers:task_input.upload_file', 'Upload file for processing')
          }
        }
      };

      setSchema(mockSchema);
      setFormData({});
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!taskId) {
      setError(t('task:missing_id', 'Missing task ID'));
      return;
    }

    const fetchTaskSchema = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<TaskSchema>(`/tasks/${taskId}/schema`);
        if (response.data) {
          setSchema(response.data);

          const initialFormData: Record<string, unknown> = {};

          Object.entries(response.data.inputs || {}).forEach(([nodeId, nodeInfo]) => {
            Object.entries(nodeInfo.params || {}).forEach(([paramName, paramSchema]) => {

              if (paramSchema.default !== undefined) {
                initialFormData[`${nodeId}.${paramName}`] = paramSchema.default;
              } else if (paramSchema.type === 'boolean') {
                initialFormData[`${nodeId}.${paramName}`] = false;
              }
            });
          });

          Object.entries(initialParams || {}).forEach(([key, val]) => {
            if (val !== undefined) {
              initialFormData[key] = val;
            }
          });

          setFormData(initialFormData);
        }
      } catch (error: unknown) {
        const errorObj = error as { response?: { data?: { message?: string } } };
        const errorMessage = errorObj?.response?.data?.message || t('execution:load_task_failed', 'Failed to load task definition');
        setError(errorMessage);
        if (onErrorRef.current) {
          onErrorRef.current({
            message: errorMessage,
            details: error
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskSchema();
  }, [taskId, mockMode, title, description, initialParams, schemaRetryKey]);

  const handleInputChange = useCallback((fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const getResolvedMappingValue = useCallback(
    (fieldId: string): unknown | undefined => {
      const mapping = parameterConfig?.parameterMapping?.[fieldId];
      if (!mapping?.source) return undefined;
      switch (mapping.source) {
        case 'static': {
          const raw = mapping.value;
          if (typeof raw !== 'string') return undefined;
          return raw.trim() === '' ? undefined : raw;
        }
        case 'formField':
        case 'column': {
          const key = mapping.value;
          if (!key) return undefined;
          return mappingContext?.formFieldValues?.[key];
        }
        case 'parameter': {
          const key = mapping.value;
          if (!key) return undefined;
          return mappingContext?.pageParams?.[key];
        }
        case 'database':
        default:
          return undefined;
      }
    },
    [parameterConfig?.parameterMapping, mappingContext]
  );

  const isFieldFilledByMapping = useCallback(
    (fieldId: string, paramSchema: TaskInputParam): boolean => {
      const mapping = parameterConfig?.parameterMapping?.[fieldId];
      if (!mapping?.source || mapping.source === 'database') return false;
      const resolved = getResolvedMappingValue(fieldId);
      if (resolved === undefined) return false;
      return isResolvedValueFilledForParam(paramSchema, resolved);
    },
    [parameterConfig?.parameterMapping, getResolvedMappingValue]
  );

  const getRequiredAndOptionalInputs = useCallback(() => {
    const required: Array<[string, string, TaskInputParam]> = [];
    const optional: Array<[string, string, TaskInputParam]> = [];

    if (schema?.inputs) {
      Object.entries(schema.inputs).forEach(([nodeId, nodeInfo]) => {
        Object.entries(nodeInfo.params).forEach(([paramName, paramSchema]) => {
          const fieldInfo = [nodeId, paramName, paramSchema] as [string, string, TaskInputParam];
          const fieldId = `${nodeId}.${paramName}`;
          if (isFieldFilledByMapping(fieldId, paramSchema)) {
            return;
          }

          if (paramSchema.required && paramSchema.default === undefined) {
            required.push(fieldInfo);
          } else {
            optional.push(fieldInfo);
          }
        });
      });
    }

    return { required, optional };
  }, [schema, isFieldFilledByMapping]);

  const getEffectiveRequiredFields = useCallback(() => {
    const { required, optional } = getRequiredAndOptionalInputs();
    const paramMapping = parameterConfig?.parameterMapping || {};
    const requiredOverrides = optional.filter(([nodeId, paramName, paramSchema]) => {
      const paramId = `${nodeId}.${paramName}`;
      if (isFieldFilledByMapping(paramId, paramSchema)) {
        return false;
      }
      return paramMapping[paramId]?.requiredInTaskInput === true;
    });
    return [...required, ...requiredOverrides];
  }, [getRequiredAndOptionalInputs, parameterConfig?.parameterMapping, isFieldFilledByMapping]);

  const validateForm = useCallback(() => {
    const effectiveRequired = getEffectiveRequiredFields();

    for (const [nodeId, paramName, paramSchema] of effectiveRequired) {
      const fieldId = `${nodeId}.${paramName}`;
      const value = formData[fieldId];

      if (paramSchema.type === 'file') {
        const fileValue = value as FileUploadValue | null;
        if (!fileValue || !fileValue.status || fileValue.status !== 'uploaded') {
          toast({
            variant: "destructive",
            title: t('form:validation_error', 'Validation Failed'),
            description: t('form:upload_required', 'Please upload {{field}}', { field: paramSchema.description || paramName })
          });
          return false;
        }
      } else if (paramSchema.type === 'array') {

        if (!Array.isArray(value) || value.length === 0) {
          toast({
            variant: "destructive",
            title: t('form:validation_error', 'Validation Failed'),
            description: t('form:field_required', 'Please fill in {{field}}', { field: paramSchema.description || paramName })
          });
          return false;
        }
      } else if (value === undefined || value === null || value === '') {
        toast({
          variant: "destructive",
          title: t('form:validation_error', 'Validation Failed'),
          description: t('form:field_required', 'Please fill in {{field}}', { field: paramSchema.description || paramName })
        });
        return false;
      }
    }

    return true;
  }, [getEffectiveRequiredFields, formData, t]);

  const handleSubmit = useCallback(async () => {

    if (!mockMode && !taskId) {
      toast({
        variant: "destructive",
        title: t('task:error', 'Error'),
        description: t('task:missing_id', 'Missing task ID')
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    setExecutionError(null); 
    stopStatusPolling();
    setCurrentExecutionStatus(null); 

    try {

      if (mockMode && mockFiles.length > 0) {
        const mockExecutionId = `mock-execution-${Date.now()}`;
        const startTime = new Date().toISOString();
        const baseLogs: LogEntry[] = [
          { id: `log-${Date.now()}-1`, executionId: mockExecutionId, timestamp: startTime, level: 'INFO', message: t('renderers:task_input.mock_task_started', 'Mock task started') },
          { id: `log-${Date.now()}-2`, executionId: mockExecutionId, timestamp: startTime, level: 'INFO', message: t('renderers:task_input.mock_files_loaded', 'Loaded {{count}} mock files', { count: mockFiles.length }) },
          { id: `log-${Date.now()}-3`, executionId: mockExecutionId, timestamp: startTime, level: 'INFO', message: t('renderers:task_input.file_processing_completed', 'File processing completed') },
          { id: `log-${Date.now()}-4`, executionId: mockExecutionId, timestamp: startTime, level: 'INFO', message: t('renderers:task_input.mock_execution_success', 'Mock task execution successful') }
        ];
        const taskInfo = { id: schema?.id || generateMockTaskId(), name: schema?.name || t('renderers:task_input.mock_task', 'Mock Task'), type: 'TASK' as const };

        setCurrentExecutionStatus({
          id: mockExecutionId,
          status: 'PENDING',
          startTime,
          logs: baseLogs,
          task: taskInfo
        });

        setTimeout(() => {
          setCurrentExecutionStatus(prev => prev ? { ...prev, status: 'RUNNING' as const } : prev);
        }, 500);

        setIsSubmitting(false);

        setTimeout(() => {
          const endTime = new Date().toISOString();
          setCurrentExecutionStatus({
            id: mockExecutionId,
            status: 'COMPLETED',
            startTime,
            endTime,
            duration: 10000,
            logs: baseLogs,
            outputs: { result: { message: t('renderers:task_input.mock_execution_success', 'Mock task execution successful'), files: mockFiles.map(f => ({ name: f.name, processed: true })) } },
            task: taskInfo
          });

          toast({
            title: t('execution:task_completed', 'Task Execution Completed'),
            description: t('renderers:task_input.mock_files_processed', 'Successfully processed {{count}} mock files', { count: mockFiles.length })
          });

          broadcastTaskCompleted(mockExecutionId);

          if (onSuccess) {
            onSuccess({
              success: true,
              data: { id: mockExecutionId, status: 'COMPLETED', result: { files: mockFiles.map(f => ({ name: f.name, processed: true })) } },
              message: t('renderers:task_input.mock_execution_success', 'Mock task execution successful'),
              executionId: mockExecutionId
            });
          }
        }, 10000);

        return;
      }

      const apiFormData: Record<string, unknown> = {};

      Object.entries(formData).forEach(([key, value]) => {
        const [nodeId, paramName] = key.split('.');
        if (!apiFormData[nodeId]) {
          apiFormData[nodeId] = {};
        }
        (apiFormData[nodeId] as Record<string, unknown>)[paramName] = value;
      });

      Object.entries(parameterConfig?.parameterMapping || {}).forEach(([fieldId, mapping]) => {
        if (!mapping || mapping.source === 'database') return;
        const resolved = getResolvedMappingValue(fieldId);
        if (resolved === undefined) return;
        const [nodeId, paramName] = fieldId.split('.');
        if (!nodeId || !paramName) return;
        if (!apiFormData[nodeId]) {
          apiFormData[nodeId] = {};
        }
        (apiFormData[nodeId] as Record<string, unknown>)[paramName] = resolved;
      });

      const response = await apiClient.post(`/tasks/${taskId}/execute`, apiFormData);

      const resolvedExecutionId = pickExecutionIdFromExecuteResponse(response.data);

      const result: TaskExecutionResult = {
        success: true,
        data: response.data,
        message: t('task:submit_success_message', 'Task submitted successfully'),
        executionId: resolvedExecutionId
      };

      if (!resolvedExecutionId) {
        toast({
          title: t('task:submit_success', 'Submit Success'),
          description: result.message
        });
      }

      if (resolvedExecutionId) {
        const initialFromApi = coerceExecutionFromPollPayload(response.data);
        const taskInfo = {
          id: taskId || generateMockTaskId(),
          name: schema?.name || t('execution:unknown_task', 'Unknown Task'),
          type: 'TASK' as const
        };

        if (initialFromApi?.id === resolvedExecutionId) {
          const mergedTask =
            initialFromApi.task &&
            typeof initialFromApi.task === 'object' &&
            typeof (initialFromApi.task as { id?: unknown }).id === 'string'
              ? (initialFromApi.task as ExecutionStatus['task'])
              : taskInfo;
          applyExecutionPollResult({
            ...initialFromApi,
            task: mergedTask
          });
          if (!TERMINAL_EXECUTION_STATUSES.includes(initialFromApi.status)) {
            startStatusPolling(resolvedExecutionId);
          }
        } else {
          setCurrentExecutionStatus({
            id: resolvedExecutionId,
            status: 'PENDING',
            startTime: new Date().toISOString(),
            logs: [],
            task: taskInfo
          });
          startStatusPolling(resolvedExecutionId);
        }
      }

      if (onSuccessCode) {
        executeCustomCode(onSuccessCode, { result, response: response.data });
      }

      if (onSuccess && !resolvedExecutionId) {
        onSuccess(result);
      }

      setIsSubmitting(false);
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { data?: { message?: string } } };
      const errorMessage =
        err?.message || err?.response?.data?.message || t('task:submit_error_message', 'Task submission failed');

      const taskError: TaskExecutionError = {
        message: errorMessage,
        details: error
      };

      toast({
        variant: "destructive",
        title: t('task:submit_error', 'Submit Failed'),
        description: errorMessage
      });

      setExecutionError(errorMessage);

      if (onErrorCode) {
        executeCustomCode(onErrorCode, { error: taskError });
      }

      if (onError) onError(taskError);

      setIsSubmitting(false);
    }
  }, [
    taskId,
    formData,
    parameterConfig?.parameterMapping,
    getResolvedMappingValue,
    validateForm,
    t,
    onSuccessCode,
    executeCustomCode,
    onSuccess,
    onErrorCode,
    onError,
    startStatusPolling,
    applyExecutionPollResult,
    stopStatusPolling,
    schema?.name,
    mockMode,
    mockFiles.length,
    broadcastTaskCompleted
  ]);

  useEffect(() => {
    if (!schema?.inputs) return;
    setFormData(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(schema.inputs).forEach(([nodeId, nodeInfo]) => {
        Object.keys(nodeInfo.params || {}).forEach((paramName) => {
          const fieldId = `${nodeId}.${paramName}`;
          const resolved = getResolvedMappingValue(fieldId);
          if (resolved === undefined) return;
          if (next[fieldId] !== resolved) {
            next[fieldId] = resolved;
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [schema, getResolvedMappingValue]);

  useImperativeHandle(
    ref,
    () => ({
      submitTask: async () => {
        await handleSubmit();
      }
    }),
    [handleSubmit]
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setExecutionError(null);
    setIsSubmitting(false);
    setCurrentExecutionStatus(null);
    stopStatusPolling();
    setSchemaRetryKey((key) => key + 1);
  }, [stopStatusPolling]);

  useEffect(() => {
    return () => {
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current);
      }
    };
  }, []);

  const isExecuting =
    currentExecutionStatus !== null &&
    EXECUTION_OVERLAY_STATUSES.includes(currentExecutionStatus.status);

  const showExecutionOverlay = Boolean(isExecuting || (!mockMode && isSubmitting));
  const overlayPhase:
    | 'submitting'
    | 'pending'
    | 'running'
    | 'retry'
    | 'other' =
    !mockMode && isSubmitting && !isExecuting
      ? 'submitting'
      : currentExecutionStatus?.status === 'PENDING'
        ? 'pending'
        : currentExecutionStatus?.status === 'RUNNING'
          ? 'running'
          : currentExecutionStatus?.status === 'RETRY'
            ? 'retry'
            : 'other';
  const showOverlayWaitHint = ['submitting', 'pending', 'running', 'retry'].includes(overlayPhase);
  const prevIsExecutingRef = useRef(false);
  useEffect(() => {
    if (isExecuting && !prevIsExecutingRef.current) {
      setFormSectionExpanded(false);
    }
    prevIsExecutingRef.current = Boolean(isExecuting);
  }, [isExecuting]);

  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentExecutionStatus) return;

    const status = currentExecutionStatus.status;
    const prevStatus = prevStatusRef.current;

    if (status === 'COMPLETED' && prevStatus !== 'COMPLETED') {

      setTimeout(() => {
        if (onSuccess) {
          onSuccess({
            success: true,
            data: {
              id: currentExecutionStatus.id,
              status: 'COMPLETED',
              result: currentExecutionStatus.outputs,
              duration: currentExecutionStatus.duration
            },
            message: t('execution:task_completed', 'Task completed successfully'),
            executionId: currentExecutionStatus.id
          });
        }
      }, 1000);
    }

    prevStatusRef.current = status;
  }, [currentExecutionStatus, onSuccess, t]);

  useEffect(() => {
    return () => {
      Object.values(arrayFilePreviews).forEach(previews => {
        previews.forEach(preview => {
          if (preview.url.startsWith('blob:')) {
            URL.revokeObjectURL(preview.url);
          }
        });
      });
    };
  }, [arrayFilePreviews]);

  useEffect(() => {
    if (!autoSubmit || !schema || isSubmitting) return;

    const required = getEffectiveRequiredFields();
    const allRequiredFilled = required.every(([nodeId, paramName, paramSchema]) => {
      const fieldId = `${nodeId}.${paramName}`;
      const value = formData[fieldId];

      if (paramSchema.type === 'file') {
        return value && (value as FileUploadValue)?.status === 'uploaded';
      }
      return value !== undefined && value !== null && value !== '';
    });

    if (allRequiredFilled) {
      handleSubmit();
    }
  }, [formData, autoSubmit, schema, isSubmitting, handleSubmit, getEffectiveRequiredFields]);

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!file) return;

    if (mockMode && mockFiles.length > 0) {

      setFileUploads(prev => ({
        ...prev,
        [fieldId]: { file, progress: 0 }
      }));

      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setFileUploads(prev => ({
          ...prev,
          [fieldId]: { ...prev[fieldId], progress }
        }));
      }

      const mockFile = mockFiles.find(f => f.name === file.name) || mockFiles[0];
      const mockUploadValue: FileUploadValue = {
        name: mockFile.name,
        size: mockFile.size,
        type: mockFile.type,
        url: mockFile.url,
        fileId: `mock-${Date.now()}`,
        status: 'uploaded'
      };

      setFormData(prev => ({
        ...prev,
        [fieldId]: mockUploadValue
      }));

      setFileUploads(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });

      toast({
        title: t('renderers:task_input.mock_upload_success', 'File upload successful (Mock mode)'),
        description: t('renderers:task_input.mock_file_uploaded', 'Mock uploaded file: {{fileName}}', { fileName: mockFile.name }),
      });

      return;
    }

    setFileUploads(prev => ({
      ...prev,
      [fieldId]: { file, progress: 0 }
    }));

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('fieldId', fieldId);

    try {
      const response = await apiClient.post<FileUploadResponse>('/tasks/upload-file', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setFileUploads(prev => ({
            ...prev,
            [fieldId]: { ...prev[fieldId], progress: percentCompleted }
          }));
        }
      });

      if (response.success) {
        const uploadData = (response.data || response) as {
          filename?: string;
          size?: number;
          url?: string;
          publicUrl?: string;
          fileId?: string;
          storageKey?: string;
        };

        if (uploadData.url) {

          handleInputChange(fieldId, {
            name: uploadData.filename || file.name,
            size: uploadData.size || file.size,
            type: file.type,
            url: uploadData.url,
            fileId: uploadData.fileId || fieldId,
            publicUrl: uploadData.publicUrl,
            storageKey: uploadData.storageKey,
            status: 'uploaded'
          });
        } else {
          console.error('上传响应中缺少 URL:', response);
          throw new Error(t('file:upload_response_missing_url', 'Upload response format error: missing URL'));
        }
      } else {
        throw new Error(t('file:upload_failed_success_false', 'Upload failed: response success is false'));
      }

      setFileUploads(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });

      toast({
        title: t('file:upload_success', 'File Upload Success'),
        description: t('file:upload_success_message', 'File uploaded successfully')
      });
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: t('file:upload_error', 'File Upload Failed'),
        description: errorObj?.response?.data?.message || t('file:upload_error_message', 'File upload failed, please try again')
      });

      setFileUploads(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });
    }
  };

  const handleArrayFileChange = useCallback(async (fieldId: string, files: FileList | null, _arrayType: string, maxItems?: number, maxSize?: number) => {
    if (!files || files.length === 0) return;

    setFormData(prev => {
      const currentValue = (prev[fieldId] as unknown[]) || [];

      if (maxItems && (currentValue.length + files.length) > maxItems) {
        toast({
          variant: "destructive",
          title: t('renderers:task_input.max_files_exceeded', 'Maximum file limit exceeded'),
          description: t('renderers:task_input.max_files_message', 'Maximum {{count}} files allowed', { count: maxItems })
        });
        return prev;
      }

      const newPreviews: Array<{ id: string; name: string; url: string; type: string; size: number }> = [];
      const newValues: (string | File)[] = [...currentValue] as (string | File)[];

      Array.from(files).forEach(file => {

        if (maxSize && file.size > maxSize * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: t('renderers:task_input.file_too_large', 'File too large'),
            description: t('renderers:task_input.file_size_limit_message', 'File size cannot exceed {{size}}MB', { size: maxSize })
          });
          return;
        }

        const previewUrl = URL.createObjectURL(file);
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        newPreviews.push({
          id: fileId,
          name: file.name,
          url: previewUrl,
          type: file.type,
          size: file.size
        });

        newValues.push(file);
      });

      setArrayFilePreviews(prevPreviews => ({
        ...prevPreviews,
        [fieldId]: [...(prevPreviews[fieldId] || []), ...newPreviews]
      }));

      return {
        ...prev,
        [fieldId]: newValues
      };
    });
  }, []);

  const removeArrayFile = useCallback((fieldId: string, index: number) => {
    setFormData(prev => {
      const currentValue = (prev[fieldId] as unknown[]) || [];
      const newValues = [...currentValue];
      newValues.splice(index, 1);
      return {
        ...prev,
        [fieldId]: newValues
      };
    });

    setArrayFilePreviews(prev => {
      const previews = prev[fieldId] || [];

      if (previews[index] && previews[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(previews[index].url);
      }

      const newPreviews = [...previews];
      newPreviews.splice(index, 1);

      return {
        ...prev,
        [fieldId]: newPreviews
      };
    });
  }, []);

  const handleCopyToClipboard = useCallback(async (fieldId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(prev => ({ ...prev, [fieldId]: true }));
      toast({
        title: t('renderers:task_input.copy_success', 'Copy successful'),
        description: t('renderers:task_input.copied_to_clipboard', 'Content copied to clipboard')
      });
      setTimeout(() => {
        setCopiedCode(prev => {
          const newState = { ...prev };
          delete newState[fieldId];
          return newState;
        });
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
      toast({
        variant: "destructive",
        title: t('renderers:task_input.copy_failed', 'Copy failed'),
        description: t('renderers:task_input.copy_failed_message', 'Unable to copy to clipboard, please copy manually')
      });
    }
  }, []);

  const handleFormatJSON = useCallback((fieldId: string, value: unknown) => {
    setIsFormatting(prev => ({ ...prev, [fieldId]: true }));
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      const formatted = JSON.stringify(parsed, null, 2);
      handleInputChange(fieldId, formatted);
      toast({
        title: t('renderers:task_input.json_format_success', 'JSON formatted successfully'),
        description: t('renderers:task_input.json_formatted', 'JSON has been successfully formatted')
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t('renderers:task_input.invalid_json', 'Invalid JSON'),
        description: t('renderers:task_input.check_json_format', 'Please check if the JSON format is correct')
      });
    } finally {
      setIsFormatting(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });
    }
  }, [handleInputChange]);

  const { getOptionsForConfig, parseDataSourceConfig } = useTaskInputDataSourceCache(
    parameterConfig?.parameterMapping,
    !!schema
  );

  const { required, optional } = getRequiredAndOptionalInputs();
  const paramMapping = parameterConfig?.parameterMapping || {};

  const sortByOrder = <T extends [string, string, any][]>(items: T): T => {
    const withOrder: T[number][] = [];
    const withoutOrder: T[number][] = [];

    items.forEach(item => {
      const [nodeId, paramName] = item;
      const paramId = `${nodeId}.${paramName}`;
      const order = paramMapping[paramId]?.sortOrder;

      if (order !== undefined && order !== null && order > 0) {
        withOrder.push(item);
      } else {
        withoutOrder.push(item);
      }
    });

    withOrder.sort((a, b) => {
      const orderA = paramMapping[`${a[0]}.${a[1]}`]?.sortOrder || 0;
      const orderB = paramMapping[`${b[0]}.${b[1]}`]?.sortOrder || 0;
      return orderA - orderB;
    });

    return [...withOrder, ...withoutOrder] as T;
  };

  const displayRequired = useMemo(() => {
    const requiredOverrides = optional.filter(([nodeId, paramName]) => {
      const paramId = `${nodeId}.${paramName}`;
      return paramMapping[paramId]?.requiredInTaskInput === true;
    });
    return sortByOrder([...required, ...requiredOverrides]);
  }, [required, optional, parameterConfig?.parameterMapping]);

  const displayOptional = useMemo(() => {
    const filtered = optional.filter(([nodeId, paramName]) => {
      const paramId = `${nodeId}.${paramName}`;
      return paramMapping[paramId]?.requiredInTaskInput !== true;
    });
    return sortByOrder(filtered);
  }, [optional, parameterConfig?.parameterMapping]);

  const renderField = (nodeId: string, paramName: string, paramSchema: TaskInputParam) => {
    const fieldId = `${nodeId}.${paramName}`;
    const value = formData[fieldId];
    const isUploading = fileUploads[fieldId];
    const arrayPreviews = arrayFilePreviews[fieldId] || [];
    const paramMapping = parameterConfig?.parameterMapping?.[fieldId];
    const dataSourceConfig = parseDataSourceConfig(paramMapping);
    const dataSourceOptions = dataSourceConfig ? getOptionsForConfig(dataSourceConfig) : undefined;
    const requiredOverride = paramMapping?.requiredInTaskInput === true;
    const labelText = paramMapping?.labelText?.trim() || undefined;

    return (
      <TaskInputField
        fieldId={fieldId}
        paramName={paramName}
        labelText={labelText}
        paramSchema={paramSchema}
        value={value}
        isUploading={isUploading}
        arrayPreviews={arrayPreviews}
        compact={compact}
        dataSourceConfig={dataSourceConfig}
        dataSourceOptions={dataSourceOptions}
        requiredOverride={requiredOverride}
        suppressSchemaHints={isNormalMode}
        onInputChange={handleInputChange}
        onFileUpload={handleFileUpload}
        onArrayFileChange={handleArrayFileChange}
        onRemoveArrayFile={removeArrayFile}
        onFormatJSON={handleFormatJSON}
        onCopyToClipboard={handleCopyToClipboard}
        isFormatting={isFormatting}
        copiedCode={copiedCode}
      />
    );
  };

  if (isLoading) {
    const loadingText = t('renderers:task_input.loading_task', 'Loading task...');
    const loadingBody = (
      <div className="space-y-4 px-4 py-6" role="status" aria-busy="true" aria-label={loadingText}>
        {Array.from({ length: 3 }).map((_, i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>
    );
    if (embedded) {
      return <div className={cn('w-full', className)}>{loadingBody}</div>;
    }
    return (
      <Card className={cn('w-full bg-white dark:bg-neutral-800', className)}>
        <CardContent className="pt-6">{loadingBody}</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>{t('renderers:task_input.error', 'Error')}</CardTitle>
          <CardDescription>{t('renderers:task_input.load_task_error', 'Error loading task definition')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-md">
            {error}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={handleRetry}
          >
            {t('common:retry', 'Retry')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!schema) {
    return null;
  }

  const displayTitle = title || schema.name;
  const displayDescription = description || schema.description;

  const Wrapper = embedded ? 'div' : Card;
  const wrapperClassName = embedded ? cn("w-full", className) : cn("w-full", className);

  return (
    <Wrapper className={cn(wrapperClassName, showExecutionOverlay && 'relative overflow-hidden')}>
      {showCardHeader && (
        <CardHeader className={cn(compact ? "pb-3" : undefined, "relative")}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className={compact ? "text-lg" : undefined}>{displayTitle}</CardTitle>
              </div>
              {showDescription && displayDescription && (
                <CardDescription className="mt-1">{displayDescription}</CardDescription>
              )}
            </div>
            {taskId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExecutionHistory(true)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-primary ml-2"
                title={t('execution.history.title')}
              >
                <History className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent
        className={cn(
          'space-y-6',
          compact && 'space-y-4',
          embedded ? 'px-0 pt-0 pb-0' : !showCardHeader && 'pt-6'
        )}
      >
        {currentExecutionStatus && ['FAILED', 'CANCELED', 'TIMEOUT'].includes(currentExecutionStatus.status) && (
          <div className={cn(
            "p-4 rounded-md border mb-4",
            (currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
            currentExecutionStatus.status === 'CANCELED' && "bg-neutral-100 dark:bg-neutral-800/20 border-neutral-300 dark:border-neutral-700"
          )}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {(currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && <X className="w-5 h-5 text-red-500" />}
                {currentExecutionStatus.status === 'CANCELED' && <X className="w-5 h-5 text-neutral-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "font-medium text-sm",
                    (currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && "text-red-600 dark:text-red-400",
                    currentExecutionStatus.status === 'CANCELED' && "text-neutral-600 dark:text-neutral-400"
                  )}>
                    {currentExecutionStatus.status === 'FAILED' && t('execution:status.failed', 'Failed')}
                    {currentExecutionStatus.status === 'TIMEOUT' && t('execution:status.timeout', 'Timed out')}
                    {currentExecutionStatus.status === 'CANCELED' && t('execution:status.canceled', 'Canceled')}
                  </p>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setCurrentExecutionStatus(null)}
                    className={cn(
                      "h-6 px-2",
                      (currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && "text-red-500 hover:text-red-700 dark:text-red-400",
                      currentExecutionStatus.status === 'CANCELED' && "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                    )}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {(currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && currentExecutionStatus.error && (
                  <p className="text-xs text-red-500 mt-1 break-words">{currentExecutionStatus.error}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {(currentExecutionStatus.status === 'FAILED' || currentExecutionStatus.status === 'TIMEOUT') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setCurrentExecutionStatus(null)}
                      >
                        {t('common:close', 'Close')}
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setCurrentExecutionStatus(null);
                          handleSubmit();
                        }}
                      >
                        {t('execution:retry', 'Retry')}
                      </Button>
                    </>
                  )}
                  {currentExecutionStatus.status === 'CANCELED' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setCurrentExecutionStatus(null)}
                    >
                      {t('common:close', 'Close')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {executionError && !currentExecutionStatus && (
          <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{t('execution:execution_failed', 'Execution Failed')}</p>
                <p className="text-sm mt-1">{executionError}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExecutionError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {currentExecutionStatus && 
         ['COMPLETED', 'FAILED', 'CANCELED'].includes(currentExecutionStatus.status) && 
         currentExecutionStatus.outputs && 
         Object.keys(currentExecutionStatus.outputs).length > 0 && (
          <TaskExecutionOutputs 
            executionStatus={currentExecutionStatus}
            taskId={taskId}
            compact={compact}
          />
        )}

        <div
          className={cn(
            plainEmbeddedFields ? 'space-y-6' : compact ? 'space-y-3' : 'space-y-4'
          )}
        >
          {displayRequired.map(([nodeId, paramName, paramSchema]) => (
            <div
              key={`${nodeId}.${paramName}`}
              className={cn(
                !plainEmbeddedFields && 'bg-neutral-50 dark:bg-neutral-800 rounded-md',
                !plainEmbeddedFields && (compact ? 'p-3' : 'p-4')
              )}
            >
              {!isNormalMode && (
                <div
                  className={cn(
                    'mb-2 font-medium text-neutral-500 dark:text-neutral-400',
                    compact ? 'text-xs' : 'text-sm'
                  )}
                >
                  {schema.inputs[nodeId].nodeName}
                </div>
              )}
              {renderField(nodeId, paramName, paramSchema)}
            </div>
          ))}
        </div>

        {!isNormalMode && displayOptional.length > 0 && (
          <Collapsible
            open={showOptionalInputs}
            onOpenChange={setShowOptionalInputs}
            className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-700"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800',
                  compact ? 'p-3' : 'p-4'
                )}
              >
                <span className={cn(
                  "font-medium text-neutral-700 dark:text-neutral-300",
                  compact ? "text-xs" : "text-sm"
                )}>{t('execution:optional_inputs', 'Optional Inputs')}</span>
                {showOptionalInputs ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent
              className={cn(
                compact ? 'p-3' : 'p-4',
                plainEmbeddedFields ? 'space-y-6' : compact ? 'space-y-3' : 'space-y-4'
              )}
            >
              {displayOptional.map(([nodeId, paramName, paramSchema]) => (
                <div
                  key={`${nodeId}.${paramName}`}
                  className={cn(
                    !plainEmbeddedFields && 'bg-neutral-50 dark:bg-neutral-800 rounded-md',
                    !plainEmbeddedFields && (compact ? 'p-3' : 'p-4')
                  )}
                >
                  <div
                    className={cn(
                      'font-medium text-neutral-500 dark:text-neutral-400 mb-2',
                      compact ? 'text-xs' : 'text-sm'
                    )}
                  >
                    {schema.inputs[nodeId].nodeName}
                  </div>
                  {renderField(nodeId, paramName, paramSchema)}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
      {!hideInternalSubmitFooter && (
        <CardFooter className={cn("flex gap-2", compact ? "pt-3" : undefined)}>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Boolean(isExecuting)}
            className={compact ? "h-8" : undefined}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('execution:submitting', 'Submitting...')}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {submitButtonText || t('renderers:task_input.execute_task', 'Execute Task')}
              </>
            )}
          </Button>

          {executionError && (
            <Button
              variant="outline"
              onClick={() => setExecutionError(null)}
              className={compact ? "h-8" : undefined}
            >
              {t('execution:clear_error', 'Clear Error')}
            </Button>
          )}
        </CardFooter>
      )}

      {showExecutionOverlay && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm pointer-events-auto',
            Z_INDEX_CLASSES.FIXED_HEADER
          )}
          role="status"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <Loading size="md" className="mx-auto shrink-0" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                {overlayPhase === 'submitting' && t('execution:submitting', 'Submitting...')}
                {overlayPhase === 'pending' && t('execution:status.pending', 'Pending')}
                {overlayPhase === 'running' && t('execution:status.running', 'Running')}
                {overlayPhase === 'retry' && t('execution:status.retry', 'Retrying')}
                {overlayPhase === 'other' && t('execution:executing_task', 'Running task...')}
              </p>
              {showOverlayWaitHint ? (
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  {t('execution:please_wait', 'Please wait')}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showExecutionHistory && taskId && (
        <ExecutionHistoryModal
          taskId={taskId}
          taskName={displayTitle}
          onClose={() => setShowExecutionHistory(false)}
        />
      )}
    </Wrapper>
  );
});

TaskInputRenderer.displayName = 'TaskInputRenderer';

export default TaskInputRenderer;
