import React, { useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  MODAL_DIMENSIONS,
  ScrollArea,
  toast,
} from '@genispace/shared-ui';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TaskInputRenderer, { type TaskInputRendererHandle } from '@/components/renderers/TaskInputRenderer';
import { renderLucideIcon } from '@/utils/iconUtils';
import type { TableAction } from '@/types';
import type { TableDataType } from '@/types/renderers';

export interface ListTaskExecuteDialogState {
  isOpen: boolean;
  action: TableAction | null;
  record: TableDataType | null;
}

interface ListTaskExecuteDialogProps {
  dialog: ListTaskExecuteDialogState;
  pageParams?: Record<string, unknown>;
  onClose: () => void;
  onRefresh?: () => void;
}

export const ListTaskExecuteDialog: React.FC<ListTaskExecuteDialogProps> = ({
  dialog,
  pageParams = {},
  onClose,
  onRefresh,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const taskExecuteInputRef = useRef<TaskInputRendererHandle>(null);
  const [isTaskExecuting, setIsTaskExecuting] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setIsTaskExecuting(false);
    }
  };

  const action = dialog.action;
  const config = action?.config.taskExecute;

  return (
    <Dialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }}
        className="px-8 overflow-y-auto"
      >
        {!action || !config ? (
          <>
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                {action?.icon ? (
                  <span className="inline-flex shrink-0 items-center" aria-hidden>
                    {renderLucideIcon(action.icon, 'w-4 h-4')}
                  </span>
                ) : null}
                <span>{action?.label?.trim() || t('list.execute_task', 'Execute Task')}</span>
              </DialogTitle>
              <DialogDescription>
                {t('list.task_execute_config_missing', 'Task execution is not configured')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end border-t pt-6">
              <Button variant="outline" onClick={onClose}>
                {t('list.cancel', 'Cancel')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          (() => {
            const isNormalMode = (config.interactiveMode || 'professional') === 'normal';

            let resolvedTaskId = '';
            if (typeof config.taskId === 'string') {
              resolvedTaskId = config.taskId;
            } else if (config.taskId?.source === 'parameter') {
              const paramName = config.taskId.paramName || '';
              resolvedTaskId = String(
                (dialog.record?.[paramName] as string) ?? pageParams[paramName] ?? ''
              );
            } else {
              resolvedTaskId = config.taskId?.value ?? '';
            }

            const parameterMapping: Record<
              string,
              {
                source?: string;
                value?: string;
                labelText?: string;
                requiredInTaskInput?: boolean;
                sortOrder?: number;
              }
            > = {};

            if (config.parameterMapping) {
              Object.entries(config.parameterMapping).forEach(([paramKey, mapping]) => {
                parameterMapping[paramKey] = {
                  source: mapping.source,
                  value: mapping.value,
                  labelText: mapping.labelText,
                  requiredInTaskInput: mapping.requiredInTaskInput,
                  sortOrder: mapping.sortOrder,
                };
              });
            }

            return (
              <>
                <DialogHeader className="pb-6">
                  <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                    {action.icon ? (
                      <span className="inline-flex shrink-0 items-center" aria-hidden>
                        {renderLucideIcon(action.icon, 'w-4 h-4')}
                      </span>
                    ) : null}
                    <span>{action.label?.trim() || t('list.execute_task', 'Execute Task')}</span>
                    {isTaskExecuting && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                    )}
                  </DialogTitle>
                  <DialogDescription className={isNormalMode ? 'sr-only' : undefined}>
                    {isNormalMode
                      ? t('list.task_execute_dialog_a11y', 'Fill in task parameters, then click execute')
                      : t(
                          'common:action_form_dialog.description',
                          'Please fill in the following information to complete the operation'
                        )}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-2 px-2">
                    {!resolvedTaskId ? (
                      <div className="text-center text-sm text-red-500">
                        {t('list.task_id_required', 'Task ID is required')}
                      </div>
                    ) : (
                      <TaskInputRenderer
                        ref={taskExecuteInputRef}
                        taskId={resolvedTaskId}
                        embedded
                        embeddedFieldLayout="plain"
                        interactiveMode={config.interactiveMode || 'professional'}
                        submitButtonPlacement={isNormalMode ? 'dialogFooter' : 'default'}
                        isDialogExecuting={isTaskExecuting}
                        onDialogExecutingChange={setIsTaskExecuting}
                        mappingContext={{
                          formFieldValues: (dialog.record ?? {}) as Record<string, unknown>,
                          pageParams,
                        }}
                        parameterConfig={{ parameterMapping }}
                        onSuccess={() => {
                          onClose();
                          setIsTaskExecuting(false);
                          toast({
                            title: t('list.task_execution_success', 'Task execution successful'),
                            description:
                              config.successMessage ??
                              t('list.task_executed_successfully', 'Task executed successfully'),
                          });
                          if (config.refreshAfterSuccess !== false) {
                            onRefresh?.();
                          }
                        }}
                        onError={(error) => {
                          setIsTaskExecuting(false);
                          toast({
                            variant: 'destructive',
                            title: t('list.task_execution_failed', 'Task execution failed'),
                            description:
                              error.message ||
                              config.errorMessage ||
                              t('list.network_error_retry', 'Network error, please retry'),
                          });
                        }}
                      />
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="flex justify-end space-x-3 border-t pt-6">
                  <Button variant="outline" type="button" onClick={onClose} disabled={isTaskExecuting}>
                    {t('list.cancel', 'Cancel')}
                  </Button>
                  {isNormalMode && resolvedTaskId && (
                    <Button
                      type="button"
                      className="min-w-[100px] px-6"
                      onClick={() => void taskExecuteInputRef.current?.submitTask()}
                      disabled={isTaskExecuting}
                    >
                      {isTaskExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('task_input.execute_task', 'Execute Task')}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()
        )}
      </DialogContent>
    </Dialog>
  );
};
