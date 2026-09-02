import { useEffect, useMemo, useRef } from 'react';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useParameterContext } from '@/contexts/ParameterContext';
import type { ParameterConfig } from '@/types';

interface UseListSelectionEmitOptions {
  componentId?: string;
  rowKey: string;
  selectionType: 'none' | 'single' | 'multiple';
  selectedRowIds: (string | number)[];
  allData: Record<string, unknown>[];
  parameterConfig?: ParameterConfig;
  componentParameterConfig?: {
    enableParameterReceiving?: boolean;
    listenToParameters?: string[];
    enableCommunication?: boolean;
    enableEmit?: boolean;
    triggers?: Record<
      string,
      { enabled?: boolean; parameters?: string[] }
    >;
  };
}

export function useListSelectionEmit({
  componentId,
  rowKey,
  selectionType,
  selectedRowIds,
  allData,
  parameterConfig,
  componentParameterConfig,
}: UseListSelectionEmitOptions) {
  const { emit, emitBatch } = useComponentCommunication({
    componentId: componentId || 'list',
    listenParameters: [],
    autoCleanup: true,
  });
  const { markParametersReady } = useParameterContext();
  const previousSelectedRowDataRef = useRef<Record<string, unknown> | null>(null);
  const previousEmitSignatureRef = useRef<string>('');

  const selectedRowIdsKey = useMemo(
    () => selectedRowIds.map(String).sort().join(','),
    [selectedRowIds]
  );

  useEffect(() => {
    if (selectionType === 'none') return;

    const commConfig = componentParameterConfig || (parameterConfig as typeof componentParameterConfig);
    if (!commConfig?.enableCommunication || !commConfig?.enableEmit) return;
    if (!commConfig.triggers?.onRowSelect?.enabled) return;

    const selectedRows = allData.filter((row, idx) => {
      const rowId = row[rowKey] ?? idx;
      return selectedRowIds.some((id) => String(id) === String(rowId));
    });

    const selectedRowData =
      selectedRows.length === 0
        ? null
        : selectedRows.length === 1
          ? selectedRows[0]
          : selectedRows;

    const emitSignature = JSON.stringify({
      ids: selectedRowIdsKey,
      data: selectedRowData,
    });
    if (emitSignature === previousEmitSignatureRef.current) {
      return;
    }
    previousEmitSignatureRef.current = emitSignature;

    const triggerParams =
      commConfig.triggers.onRowSelect.parameters ?? ['selectedRowData', 'selectedRowIds'];
    const listId = componentId || 'list';

    const timer = window.setTimeout(() => {
      const paramsToEmit: Record<string, unknown> = {};

      if (triggerParams.includes('selectedRowData')) {
        emit('selectedRowData', selectedRowData);

        if (
          selectedRowData &&
          typeof selectedRowData === 'object' &&
          !Array.isArray(selectedRowData)
        ) {
          Object.entries(selectedRowData).forEach(([fieldName, fieldValue]) => {
            paramsToEmit[`list_${listId}_selectedRowData_${fieldName}`] = fieldValue;
          });
          previousSelectedRowDataRef.current = selectedRowData as Record<string, unknown>;
        } else if (selectedRowData === null && previousSelectedRowDataRef.current) {
          Object.keys(previousSelectedRowDataRef.current).forEach((fieldName) => {
            paramsToEmit[`list_${listId}_selectedRowData_${fieldName}`] = null;
          });
          previousSelectedRowDataRef.current = null;
        }
      }

      if (triggerParams.includes('selectedRowIds')) {
        emit('selectedRowIds', selectedRowIds);
      }

      if (Object.keys(paramsToEmit).length > 0) {
        emitBatch(paramsToEmit);
        markParametersReady(Object.keys(paramsToEmit));
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    selectionType,
    selectedRowIdsKey,
    allData,
    rowKey,
    componentParameterConfig,
    parameterConfig,
    emit,
    emitBatch,
    markParametersReady,
    componentId,
  ]);
}
