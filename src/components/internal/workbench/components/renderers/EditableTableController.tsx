import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@genispace/shared-ui';
import type { EditableTableColumnConfig } from './EditableTable.types';
import type { TableAction } from '../../types';
import { getDataSourceTableApiErrorMessage } from './editableTableApiErrors';

interface EditableTableControllerProps {
  columns: EditableTableColumnConfig[];
  actions?: TableAction[];
  onRowEditComplete?: (
    rowId: string,
    editedData: Record<string, any>,
    action: TableAction,
    /** Full table row merged with edits; use for DB updateFields / updateConditions (column sources). */
    rowForDatabaseWrite?: Record<string, any>
  ) => Promise<void>;
}

interface EditableState {
  editingCell: { rowId: string; columnKey: string } | null;
  editingValue: any;
  editingRow: string | null;
  editedRowData: Record<string, any>;
  originalRowData: Record<string, any>;
}

export interface EditableTableControllerReturn {
  state: EditableState;

  editingCell: { rowId: string; columnKey: string } | null;
  editingValue: any;

  editingRow: string | null;
  editedRowData: Record<string, any>;
  rowClickActions: TableAction[];
  columnToRowClickActionMap: Map<string, TableAction>;
  rowClickConflicts: Array<{ column: string; actions: TableAction[] }>;
  handleStartRowEdit: (rowId: string | number, record: Record<string, any>, initialColumnKey?: string) => void;
  handleRowEditCellChange: (columnKey: string, value: any) => void;
  handleRowEditCellFocus: (columnKey: string) => void;
  handleRowEditComplete: () => Promise<boolean>;
  handleCancelRowEdit: () => void;
  getNextEditableColumn: (currentColumnKey: string) => string | null;
}

export const useEditableTableController = ({
  columns,
  actions,
  onRowEditComplete,
}: EditableTableControllerProps): EditableTableControllerReturn => {
  const { t } = useTranslation();

  const [state, setState] = useState<EditableState>({
    editingCell: null,
    editingValue: null,
    editingRow: null,
    editedRowData: {},
    originalRowData: {},
  });

  const rowEditCompleteInFlightRef = useRef<Promise<boolean> | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const rowEditDraftRef = useRef<Record<string, unknown>>({});
  const rowEditOriginalRef = useRef<Record<string, unknown>>({});
  const rowEditSourceRecordRef = useRef<Record<string, any> | null>(null);
  const rowEditIdRef = useRef<string | null>(null);
  const currentRowClickActionRef = useRef<TableAction | null>(null);

  const rowClickActions = useMemo(
    () =>
      actions?.filter((a) => a.triggerMode === 'rowClick' && a.type === 'updateDatabase') ?? [],
    [actions]
  );

  const columnToRowClickActionMap = useMemo(() => {
    const map = new Map<string, TableAction>();
    rowClickActions.forEach((action) => {
      const updateFields = action.config?.updateDatabase?.updateFields ?? {};
      Object.entries(updateFields).forEach(([, fieldConfig]) => {
        if (fieldConfig.source === 'column' && fieldConfig.value) {
          map.set(fieldConfig.value, action);
        }
      });
    });
    return map;
  }, [rowClickActions]);

  const rowClickConflicts = useMemo(() => {
    const fieldToActions = new Map<string, TableAction[]>();
    rowClickActions.forEach((action) => {
      const updateFields = action.config?.updateDatabase?.updateFields ?? {};
      Object.entries(updateFields).forEach(([, fieldConfig]) => {
        if (fieldConfig.source === 'column' && fieldConfig.value) {
          const existing = fieldToActions.get(fieldConfig.value) ?? [];
          fieldToActions.set(fieldConfig.value, [...existing, action]);
        }
      });
    });
    return Array.from(fieldToActions.entries())
      .filter(([, actions]) => actions.length > 1)
      .map(([column, actions]) => ({ column, actions }));
  }, [rowClickActions]);

  const handleStartRowEdit = useCallback(
    (rowId: string | number, record: Record<string, any>, initialColumnKey?: string) => {
      const clickedCell =
        initialColumnKey !== undefined && initialColumnKey !== '';

      if (clickedCell) {
        if (!columnToRowClickActionMap.has(initialColumnKey)) {
          return;
        }
      } else {
        if (columnToRowClickActionMap.size === 0) {
          return;
        }
      }

      const editableColumns = columns.filter((col) => col.editable);

      let focusColumn: EditableTableColumnConfig | undefined;
      if (clickedCell) {
        focusColumn = editableColumns.find((col) => col.dataIndex === initialColumnKey);
        if (!focusColumn) {
          return;
        }
      } else {
        focusColumn = editableColumns[0];
      }

      if (!focusColumn) {
        return;
      }

      const rowData: Record<string, any> = {};
      columns.filter((col) => col.editable).forEach((col) => {
        rowData[col.dataIndex] = record[col.dataIndex] ?? '';
      });
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[EditableTableController] handleStartRowEdit',
          'editingRow:',
          String(rowId),
          'editableColumns:',
          editableColumns.length,
          'focusColumn:',
          focusColumn.dataIndex,
          'fromCellClick:',
          clickedCell
        );
      }
      const rId = String(rowId);
      const draft = { ...rowData };
      rowEditIdRef.current = rId;
      rowEditDraftRef.current = draft;
      rowEditOriginalRef.current = { ...rowData };
      rowEditSourceRecordRef.current = { ...record };
      setState((prev) => ({
        ...prev,
        editingRow: rId,
        editedRowData: draft,
        originalRowData: { ...rowData },
        editingCell: { rowId: rId, columnKey: focusColumn.dataIndex },
        editingValue: record[focusColumn.dataIndex] ?? '',
      }));
      currentRowClickActionRef.current = clickedCell
        ? columnToRowClickActionMap.get(initialColumnKey) ?? null
        : rowClickActions[0] ?? null;
    },
    [columnToRowClickActionMap, columns]
  );

  const handleRowEditCellChange = useCallback((columnKey: string, value: any) => {
    setState((prev) => {
      const next = {
        ...prev.editedRowData,
        [columnKey]: value,
      };
      rowEditDraftRef.current = next;
      return {
        ...prev,
        editedRowData: next,
        editingValue: value,
      };
    });
  }, []);

  const handleRowEditCellFocus = useCallback(
    (columnKey: string) => {
      if (!state.editingRow) return;
      const currentValue = state.editedRowData[columnKey];
      setState((prev) => ({
        ...prev,
        editingCell: { rowId: prev.editingRow!, columnKey },
        editingValue: currentValue,
      }));
    },
    [state.editingRow, state.editedRowData]
  );

  const validateRowEditData = useCallback(
    (editedRowData: Record<string, any>) => {
      const errors: { field: string; message: string }[] = [];
      columns.forEach((col) => {
        if (col.editable && col.required) {
          const value = editedRowData[col.dataIndex];
          if (value === undefined || value === null || value === '') {
            errors.push({
              field: col.dataIndex,
              message: `${col.title || col.dataIndex} ${t('table.is_required', 'is required')}`,
            });
          }
        }
      });
      return errors;
    },
    [columns, t]
  );

  const handleRowEditComplete = useCallback(async (): Promise<boolean> => {
    if (rowEditCompleteInFlightRef.current) {
      return rowEditCompleteInFlightRef.current;
    }
    if (!stateRef.current.editingRow) {
      return true;
    }

    const p = (async (): Promise<boolean> => {
      const rowId = rowEditIdRef.current ?? stateRef.current.editingRow;
      if (!rowId) {
        return true;
      }
      const edited = { ...rowEditDraftRef.current };
      const orig = { ...rowEditOriginalRef.current };
      const errors = validateRowEditData(edited as Record<string, any>);
      if (errors.length > 0) {
        toast({
          variant: 'destructive',
          title: t('table.validation_failed', 'Validation Failed'),
          description: errors.map((e) => e.message).join('; '),
        });
        const firstErrorField = errors[0].field;
        setState((prev) => ({
          ...prev,
          editingCell: { rowId: prev.editingRow!, columnKey: firstErrorField },
        }));
        return false;
      }

      const hasChanges = Object.keys(edited).some((key) => edited[key] !== orig[key]);

      if (!hasChanges) {
        rowEditIdRef.current = null;
        rowEditDraftRef.current = {};
        rowEditOriginalRef.current = {};
        rowEditSourceRecordRef.current = null;
        setState((prev) => ({
          ...prev,
          editingRow: null,
          editedRowData: {},
          originalRowData: {},
          editingCell: null,
          editingValue: null,
        }));
        return true;
      }

      if (onRowEditComplete && currentRowClickActionRef.current) {
        try {
          const snapshot = rowEditSourceRecordRef.current || {};
          const rowForDatabaseWrite = { ...snapshot, ...edited };
          await onRowEditComplete(
            rowId,
            edited as Record<string, any>,
            currentRowClickActionRef.current,
            rowForDatabaseWrite
          );
          rowEditIdRef.current = null;
          rowEditDraftRef.current = {};
          rowEditOriginalRef.current = {};
          rowEditSourceRecordRef.current = null;
          setState((prev) => ({
            ...prev,
            editingRow: null,
            editedRowData: {},
            originalRowData: {},
            editingCell: null,
            editingValue: null,
          }));
          return true;
        } catch (error) {
          console.error('Row edit save failed:', error);
          toast({
            variant: 'destructive',
            title: t('table.edit_failed', 'Edit Failed'),
            description: getDataSourceTableApiErrorMessage(error, t),
          });
          return false;
        }
      }

      rowEditIdRef.current = null;
      rowEditDraftRef.current = {};
      rowEditOriginalRef.current = {};
      rowEditSourceRecordRef.current = null;
      setState((prev) => ({
        ...prev,
        editingRow: null,
        editedRowData: {},
        originalRowData: {},
        editingCell: null,
        editingValue: null,
      }));
      return true;
    })();

    rowEditCompleteInFlightRef.current = p;
    p.finally(() => {
      if (rowEditCompleteInFlightRef.current === p) {
        rowEditCompleteInFlightRef.current = null;
      }
    });
    return p;
  }, [validateRowEditData, onRowEditComplete, t]);

  const handleCancelRowEdit = useCallback(() => {
    rowEditIdRef.current = null;
    rowEditDraftRef.current = {};
    rowEditOriginalRef.current = {};
    rowEditSourceRecordRef.current = null;
    setState((prev) => ({
      ...prev,
      editingRow: null,
      editedRowData: {},
      originalRowData: {},
      editingCell: null,
      editingValue: null,
    }));
  }, []);

  const getNextEditableColumn = useCallback(
    (currentColumnKey: string): string | null => {
      const editableColumns = columns.filter((col) => col.editable);
      const currentIndex = editableColumns.findIndex((col) => col.dataIndex === currentColumnKey);
      if (currentIndex < editableColumns.length - 1) {
        return editableColumns[currentIndex + 1].dataIndex;
      }
      return null;
    },
    [columns]
  );

  return {
    state,
    editingCell: state.editingCell,
    editingValue: state.editingValue,

    editingRow: state.editingRow,
    editedRowData: state.editedRowData,
    rowClickActions,
    columnToRowClickActionMap,
    rowClickConflicts,
    handleStartRowEdit,
    handleRowEditCellChange,
    handleRowEditCellFocus,
    handleRowEditComplete,
    handleCancelRowEdit,
    getNextEditableColumn,
  };
};
