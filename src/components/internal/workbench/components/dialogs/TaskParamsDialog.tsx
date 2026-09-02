import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button, MODAL_DIMENSIONS } from '@genispace/shared-ui';
import { toast } from '@genispace/shared-ui';
import { useTranslation } from 'react-i18next';
import TaskInputField from '@/components/renderers/TaskInputField';
import { 
  getTaskSchema, 
  getRequiredAndOptionalInputs, 
  checkTaskParamsFilled,
  formatTaskParamsForAPI,
  executeTask,
  type TaskSchema,
  type TaskInputParam
} from '@/utils/taskUtils';
import apiClient from '@/lib/api/apiClient';

interface FileUploadValue {
  name: string;
  size: number;
  type: string;
  url: string;
  fileId: string;
  status: 'uploaded';
}

interface TaskParamsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  initialParams?: Record<string, unknown>;
  onSuccess?: (result: { id?: string; executionId?: string; [key: string]: unknown }) => void;
  onError?: (error: Error) => void;
  title?: string;
  description?: string;
}

const EMPTY_INITIAL_PARAMS: Record<string, unknown> = {};

const TaskParamsDialog: React.FC<TaskParamsDialogProps> = ({
  open,
  onOpenChange,
  taskId,
  initialParams = EMPTY_INITIAL_PARAMS,
  onSuccess,
  onError,
  title,
  description
}) => {
  const { t } = useTranslation(['workbench', 'form', 'task', 'file', 'common']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schema, setSchema] = useState<TaskSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, { file: File; progress: number }>>({});
  const [arrayFilePreviews, setArrayFilePreviews] = useState<Record<string, Array<{ id: string; name: string; url: string; type: string; size: number }>>>({});
  const [copiedCode, setCopiedCode] = useState<Record<string, boolean>>({});
  const [isFormatting, setIsFormatting] = useState<Record<string, boolean>>({});
  const [showOptionalInputs, setShowOptionalInputs] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;

    const fetchSchema = async () => {
      setIsLoading(true);
      try {
        const taskSchema = await getTaskSchema(taskId);
        setSchema(taskSchema);

        const initialFormData: Record<string, unknown> = { ...initialParams };

        Object.entries(taskSchema.inputs || {}).forEach(([nodeId, nodeInfo]) => {
          Object.entries(nodeInfo.params || {}).forEach(([paramName, paramSchema]) => {
            const fieldId = `${nodeId}.${paramName}`;

            if (initialFormData[fieldId] === undefined) {
              if (paramSchema.default !== undefined) {
                initialFormData[fieldId] = paramSchema.default;
              } else if (paramSchema.type === 'boolean') {
                initialFormData[fieldId] = false;
              }
            }
          });
        });

        setFormData(initialFormData);
      } catch (error: unknown) {
        const errorObj = error as { response?: { data?: { message?: string } } };
        const errorMessage = errorObj?.response?.data?.message || t('execution:load_task_failed', 'Failed to load task definition');
        toast({
          variant: "destructive",
          title: t('task:error', 'Error'),
          description: errorMessage
        });
        if (onError) {
          onError(error as Error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchema();
  }, [open, taskId, initialParams, t, onError]);

  const handleInputChange = useCallback((fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const handleFileUpload = useCallback(async (fieldId: string, file: File) => {
    setFileUploads(prev => ({ ...prev, [fieldId]: { file, progress: 0 } }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post<{
        filename?: string;
        size?: number;
        url: string;
        fileId?: string;
      }>('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFileUploads(prev => ({ ...prev, [fieldId]: { file, progress } }));
          }
        },
      });

      const fileValue: FileUploadValue = {
        name: response.data.filename || file.name,
        size: response.data.size || file.size,
        type: file.type,
        url: response.data.url,
        fileId: response.data.fileId || '',
        status: 'uploaded'
      };

      setFormData(prev => ({
        ...prev,
        [fieldId]: fileValue
      }));

      setFileUploads(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });
    } catch (error) {
      console.error('文件上传失败:', error);
      toast({
        variant: "destructive",
        title: t('file:upload_failed', 'Upload Failed'),
        description: t('file:upload_error', 'Failed to upload file')
      });
      setFileUploads(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });
    }
  }, [t]);

  const handleArrayFileChange = useCallback((fieldId: string, files: FileList | null, arrayType: string, maxItems?: number, maxSize?: number) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const previews: Array<{ id: string; name: string; url: string; type: string; size: number }> = [];

    fileArray.forEach((file, index) => {
      const id = `${fieldId}-${Date.now()}-${index}`;
      const url = URL.createObjectURL(file);
      previews.push({
        id,
        name: file.name,
        url,
        type: file.type,
        size: file.size
      });
    });

    setArrayFilePreviews(prev => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), ...previews]
    }));
  }, []);

  const handleRemoveArrayFile = useCallback((fieldId: string, index: number) => {
    setArrayFilePreviews(prev => {
      const current = prev[fieldId] || [];
      const removedPreview = current[index];
      if (removedPreview) {
        URL.revokeObjectURL(removedPreview.url);
      }
      const newPreviews = current.filter((_, i) => i !== index);
      return { ...prev, [fieldId]: newPreviews };
    });
  }, []);

  const handleFormatJSON = useCallback((fieldId: string, value: unknown) => {
    setIsFormatting(prev => ({ ...prev, [fieldId]: true }));
    try {
      const formatted = JSON.stringify(value, null, 2);
      setFormData(prev => ({ ...prev, [fieldId]: formatted }));
    } catch (error) {
      console.error('JSON格式化失败:', error);
    } finally {
      setTimeout(() => {
        setIsFormatting(prev => ({ ...prev, [fieldId]: false }));
      }, 500);
    }
  }, []);

  const handleCopyToClipboard = useCallback(async (fieldId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(prev => ({ ...prev, [fieldId]: true }));
      setTimeout(() => {
        setCopiedCode(prev => ({ ...prev, [fieldId]: false }));
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, []);

  const { required, optional } = schema ? getRequiredAndOptionalInputs(schema) : { required: [], optional: [] };

  const validateForm = useCallback(() => {
    if (!schema) return false;

    const missing = checkTaskParamsFilled(formData, schema);
    if (missing.length > 0) {
      const [nodeId, paramName, paramSchema] = missing[0];
      toast({
        variant: "destructive",
        title: t('form:validation_error', 'Validation Failed'),
        description: t('form:field_required', 'Please fill in {{field}}', { 
          field: paramSchema.description || paramName 
        })
      });
      return false;
    }
    return true;
  }, [schema, formData, t]);

  const handleSubmit = useCallback(async () => {
    if (!schema || !validateForm()) return;

    setIsSubmitting(true);
    try {
      const apiFormData = formatTaskParamsForAPI(formData);
      const result = await executeTask(taskId, apiFormData);

      toast({
        title: t('task:submit_success', 'Submit Success'),
        description: t('task:submit_success_message', 'Task submitted successfully')
      });

      if (onSuccess) {
        onSuccess(result);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      const errorObj = error as { response?: { data?: { message?: string } } };
      const errorMessage = errorObj?.response?.data?.message || t('task:submit_failed', 'Failed to submit task');
      toast({
        variant: "destructive",
        title: t('task:error', 'Error'),
        description: errorMessage
      });
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, formData, taskId, validateForm, onSuccess, onError, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.md.width, maxHeight: MODAL_DIMENSIONS.md.maxHeight }} className="overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{title || schema?.name || t('task:task_params', 'Task Parameters')}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {schema?.description && !description && (
            <DialogDescription>{schema.description}</DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t('task:loading_schema', 'Loading task definition...')}</p>
          </div>
        ) : schema ? (
          <div className="space-y-4 py-4">
            {required.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">{t('task:required_params', 'Required Parameters')}</h4>
                {required.map(([nodeId, paramName, paramSchema]) => {
                  const fieldId = `${nodeId}.${paramName}`;
                  return (
                    <TaskInputField
                      key={fieldId}
                      fieldId={fieldId}
                      paramName={paramName}
                      paramSchema={paramSchema}
                      value={formData[fieldId]}
                      isUploading={fileUploads[fieldId]}
                      arrayPreviews={arrayFilePreviews[fieldId] || []}
                      compact={false}
                      onInputChange={handleInputChange}
                      onFileUpload={handleFileUpload}
                      onArrayFileChange={handleArrayFileChange}
                      onRemoveArrayFile={handleRemoveArrayFile}
                      onFormatJSON={handleFormatJSON}
                      onCopyToClipboard={handleCopyToClipboard}
                      isFormatting={isFormatting}
                      copiedCode={copiedCode}
                    />
                  );
                })}
              </div>
            )}

            {optional.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t('task:optional_params', 'Optional Parameters')}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptionalInputs(!showOptionalInputs)}
                  >
                    {showOptionalInputs ? t('task:hide_optional', 'Hide Optional') : t('task:show_optional', 'Show Optional')}
                  </Button>
                </div>
                {showOptionalInputs && (
                  <div className="space-y-4">
                    {optional.map(([nodeId, paramName, paramSchema]) => {
                      const fieldId = `${nodeId}.${paramName}`;
                      return (
                        <TaskInputField
                          key={fieldId}
                          fieldId={fieldId}
                          paramName={paramName}
                          paramSchema={paramSchema}
                          value={formData[fieldId]}
                          isUploading={fileUploads[fieldId]}
                          arrayPreviews={arrayFilePreviews[fieldId] || []}
                          compact={false}
                          onInputChange={handleInputChange}
                          onFileUpload={handleFileUpload}
                          onArrayFileChange={handleArrayFileChange}
                          onRemoveArrayFile={handleRemoveArrayFile}
                          onFormatJSON={handleFormatJSON}
                          onCopyToClipboard={handleCopyToClipboard}
                          isFormatting={isFormatting}
                          copiedCode={copiedCode}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {required.length === 0 && optional.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('task:no_params', 'This task has no parameters')}
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('task:load_failed', 'Failed to load task definition')}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || !schema}>
            {isSubmitting ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('task:submitting', 'Submitting...')}
              </>
            ) : (
              t('task:submit', 'Submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskParamsDialog;
