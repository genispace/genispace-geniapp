import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from '@genispace/shared-ui';
import {
  updateDatabaseData,
  deleteDatabaseData,
  insertDatabaseData,
} from '@/app/services/workbenchApi';
import apiClient from '@/lib/api/apiClient';
import { buildDatabaseUpdateData, buildDatabaseUpdateConditions } from '@/utils/dataConfigUtils';
import { executeDatasetOperation } from '@/utils/datasetOperationUtils';
import type { TableAction } from '@/types';
import type { NavigationItem } from '@/types';
import type { TableDataType } from '@/types/renderers';
import type { ParameterRecord } from '@/types/parameters';
import { executeListNavigate } from './listActionUtils';

interface UseListActionsOptions {
  onRefresh: () => void;
  pageParams?: ParameterRecord;
  navigationItems?: NavigationItem[];
}

export function useListActions({
  onRefresh,
  pageParams = {},
  navigationItems,
}: UseListActionsOptions) {
  const { t } = useTranslation('renderers');
  const navigate = useNavigate();
  const location = useLocation();
  const { workbenchId } = useParams<{ workbenchId?: string }>();

  const [actionFormDialog, setActionFormDialog] = useState<{
    isOpen: boolean;
    action: TableAction | null;
    record: TableDataType | null;
  }>({ isOpen: false, action: null, record: null });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: (() => void) | null;
  }>({ isOpen: false, message: '', onConfirm: null });

  const [taskExecuteDialog, setTaskExecuteDialog] = useState<{
    isOpen: boolean;
    action: TableAction | null;
    record: TableDataType | null;
  }>({ isOpen: false, action: null, record: null });

  const runDatabaseUpdate = useCallback(
    async (action: TableAction, record: TableDataType, formValues?: Record<string, unknown>) => {
      const config = action.config.updateDatabase;
      if (!config?.targetDatasourceId) return;
      const updateData = buildDatabaseUpdateData(
        (config.updateFields ?? {}) as Parameters<typeof buildDatabaseUpdateData>[0],
        record,
        formValues
      );
      const conditions = buildDatabaseUpdateConditions(
        (config.updateConditions ?? {}) as Parameters<typeof buildDatabaseUpdateConditions>[0],
        record,
        formValues
      );
      const res = await updateDatabaseData(
        config.targetDatasourceId,
        updateData,
        conditions ?? undefined,
        config.targetDatasourceVersion
      );
      if (res.success) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error(res.message);
      }
    },
    [onRefresh, t]
  );

  const runDatabaseDelete = useCallback(
    async (action: TableAction, record: TableDataType, formValues?: Record<string, unknown>) => {
      const config = action.config.deleteDatabase;
      if (!config?.targetDatasourceId) return;
      const conditions = buildDatabaseUpdateConditions(
        (config.deleteConditions ?? {}) as Parameters<typeof buildDatabaseUpdateConditions>[0],
        record,
        formValues
      );
      const res = await deleteDatabaseData(
        config.targetDatasourceId,
        conditions ?? {},
        config.targetDatasourceVersion
      );
      if (res.success) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error(res.message);
      }
    },
    [onRefresh, t]
  );

  const runDatabaseInsert = useCallback(
    async (action: TableAction, record: TableDataType, formValues?: Record<string, unknown>) => {
      const config = action.config.insertDatabase;
      if (!config?.targetDatasourceId) return;
      const insertData = buildDatabaseUpdateData(
        (config.insertFields ?? {}) as Parameters<typeof buildDatabaseUpdateData>[0],
        record,
        formValues
      );
      const res = await insertDatabaseData(
        config.targetDatasourceId,
        insertData,
        config.targetDatasourceVersion
      );
      if (res.success) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error(res.message);
      }
    },
    [onRefresh, t]
  );

  const runDatasetUpdate = useCallback(
    async (
      action: TableAction,
      record: TableDataType,
      formValues?: Record<string, unknown>
    ) => {
      const config = action.config.updateDataset;
      if (!config) return;
      const res = await executeDatasetOperation(
        'update',
        config as Parameters<typeof executeDatasetOperation>[1],
        record,
        formValues ?? {},
        pageParams,
        formValues
      );
      if (res?.success !== false) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error((res as { message?: string }).message);
      }
    },
    [onRefresh, pageParams, t]
  );

  const runDatasetInsert = useCallback(
    async (
      action: TableAction,
      record: TableDataType,
      formValues?: Record<string, unknown>
    ) => {
      const config = action.config.insertDataset;
      if (!config) return;
      const res = await executeDatasetOperation(
        'insert',
        config as Parameters<typeof executeDatasetOperation>[1],
        record,
        formValues ?? {},
        pageParams,
        formValues
      );
      if (res?.success !== false) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error((res as { message?: string }).message);
      }
    },
    [onRefresh, pageParams, t]
  );

  const runDatasetDelete = useCallback(
    async (
      action: TableAction,
      record: TableDataType,
      formValues?: Record<string, unknown>
    ) => {
      const config = action.config.deleteDataset;
      if (!config) return;
      const res = await executeDatasetOperation(
        'delete',
        config as Parameters<typeof executeDatasetOperation>[1],
        record,
        formValues ?? {},
        pageParams,
        formValues
      );
      if (res?.success !== false) {
        toast({ title: t('list.action_success', 'Operation successful') });
        onRefresh();
      } else {
        throw new Error((res as { message?: string }).message);
      }
    },
    [onRefresh, pageParams, t]
  );

  const runTaskCall = useCallback(
    async (action: TableAction, record: TableDataType) => {
      const config = action.config.taskCall;
      if (!config?.taskId) return;
      const taskId =
        typeof config.taskId === 'string'
          ? config.taskId
          : config.taskId.source === 'parameter'
            ? String(pageParams[config.taskId.paramName || ''] ?? '')
            : config.taskId.value || '';
      if (!taskId) return;
      const taskParams: Record<string, unknown> = { ...pageParams };
      if (config.parameterMapping) {
        Object.entries(config.parameterMapping).forEach(([taskParam, mapping]) => {
          if (!mapping || typeof mapping !== 'object') return;
          const m = mapping as { source: string; value: string };
          if ((m.source === 'formField' || m.source === 'column') && m.value in record) {
            taskParams[taskParam] = record[m.value];
          } else if (m.source === 'parameter' && m.value in pageParams) {
            taskParams[taskParam] = pageParams[m.value];
          } else if (m.source === 'static') {
            taskParams[taskParam] = m.value;
          }
        });
      }
      const response = await apiClient.post(`/tasks/${taskId}/execute`, taskParams);
      if (response.success) {
        toast({
          title: t('list.action_success', 'Operation successful'),
          description:
            config.successMessage ??
            t('list.task_executed_successfully', 'Task executed successfully'),
        });
        onRefresh();
      } else {
        throw new Error(
          config.errorMessage ?? t('list.task_execution_failed', 'Task execution failed')
        );
      }
    },
    [onRefresh, pageParams, t]
  );

  const runActionCore = useCallback(
    async (
      action: TableAction,
      record: TableDataType,
      formValues?: Record<string, unknown>
    ) => {
      switch (action.type) {
        case 'navigate': {
          if (!action.config?.targetPage) {
            toast({
              variant: 'destructive',
              title: t('list.action_failed', 'Operation failed'),
              description: t('list.navigate_target_required', 'Target page is not configured'),
            });
            break;
          }
          executeListNavigate({
            action,
            record,
            pageParams,
            workbenchId,
            pathname: location.pathname,
            navigate,
            navigationItems,
          });
          break;
        }
        case 'updateDatabase':
          await runDatabaseUpdate(action, record, formValues);
          break;
        case 'deleteDatabase':
          await runDatabaseDelete(action, record, formValues);
          break;
        case 'insertDatabase':
          await runDatabaseInsert(action, record, formValues);
          break;
        case 'updateDataset':
          await runDatasetUpdate(action, record, formValues);
          break;
        case 'insertDataset':
          await runDatasetInsert(action, record, formValues);
          break;
        case 'deleteDataset':
          await runDatasetDelete(action, record, formValues);
          break;
        case 'taskCall':
          await runTaskCall(action, record);
          break;
        case 'taskExecute': {
          const { taskExecute: taskConfig } = action.config;
          if (!taskConfig?.taskId) {
            toast({
              variant: 'destructive',
              title: t('list.task_execution_failed', 'Task execution failed'),
              description: t('list.task_id_required', 'Task ID is required'),
            });
            break;
          }
          let resolvedTaskId: string;
          if (typeof taskConfig.taskId === 'string') {
            resolvedTaskId = taskConfig.taskId;
          } else if (taskConfig.taskId.source === 'parameter') {
            resolvedTaskId = String(
              record[taskConfig.taskId.paramName || ''] ??
                pageParams[taskConfig.taskId.paramName || ''] ??
                ''
            );
          } else {
            resolvedTaskId = taskConfig.taskId.value || '';
          }
          if (!resolvedTaskId) {
            toast({
              variant: 'destructive',
              title: t('list.task_execution_failed', 'Task execution failed'),
              description: t('list.task_id_required', 'Task ID is required'),
            });
            break;
          }
          setTaskExecuteDialog({ isOpen: true, action, record });
          break;
        }
        default:
          toast({
            variant: 'destructive',
            title: t('list.unsupported_action', 'This action type is not supported in List yet'),
            description: action.type,
          });
      }
    },
    [
      navigate,
      workbenchId,
      location.pathname,
      pageParams,
      navigationItems,
      runDatabaseUpdate,
      runDatabaseDelete,
      runDatabaseInsert,
      runDatasetUpdate,
      runDatasetInsert,
      runDatasetDelete,
      runTaskCall,
      t,
    ]
  );

  const executeAction = useCallback(
    async (action: TableAction, record: TableDataType) => {
      const formTypes = [
        'updateDataset',
        'insertDataset',
        'deleteDataset',
        'updateDatabase',
        'insertDatabase',
        'deleteDatabase',
      ] as const;

      if (
        action.inputMode === 'form' &&
        formTypes.includes(action.type as (typeof formTypes)[number])
      ) {
        setActionFormDialog({ isOpen: true, action, record });
        return;
      }

      const confirmMessage =
        (action.config as { confirmMessage?: string }).confirmMessage ??
        action.config.taskCall?.confirmMessage;

      const run = async () => {
        try {
          await runActionCore(action, record);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : t('list.action_failed', 'Operation failed');
          toast({
            variant: 'destructive',
            title: t('list.action_failed', 'Operation failed'),
            description: msg,
          });
        }
      };

      if (
        (action.config as { requireConfirmation?: boolean }).requireConfirmation ||
        confirmMessage
      ) {
        setConfirmDialog({
          isOpen: true,
          message: confirmMessage ?? t('list.confirm_action', 'Confirm this action?'),
          onConfirm: () => {
            setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            void run();
          },
        });
        return;
      }

      await run();
    },
    [runActionCore, t]
  );

  const closeActionForm = useCallback(() => {
    setActionFormDialog({ isOpen: false, action: null, record: null });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
  }, []);

  const closeTaskExecute = useCallback(() => {
    setTaskExecuteDialog({ isOpen: false, action: null, record: null });
  }, []);

  const submitActionForm = useCallback(
    async (formValues: Record<string, unknown>) => {
      const { action, record } = actionFormDialog;
      if (!action || !record) return;
      try {
        await runActionCore(action, record, formValues);
        closeActionForm();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t('list.action_failed', 'Operation failed');
        toast({
          variant: 'destructive',
          title: t('list.action_failed', 'Operation failed'),
          description: msg,
        });
      }
    },
    [actionFormDialog, runActionCore, closeActionForm, t]
  );

  return {
    executeAction,
    actionFormDialog,
    closeActionForm,
    submitActionForm,
    confirmDialog,
    closeConfirm,
    taskExecuteDialog,
    closeTaskExecute,
    runDatabaseUpdate,
    runDatabaseDelete,
    runDatabaseInsert,
    runDatasetUpdate,
    runDatasetInsert,
    runDatasetDelete,
  };
}
