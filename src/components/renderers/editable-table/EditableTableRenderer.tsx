import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, toast } from '@genispace/shared-ui';
import { Loader2 } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import TableRenderer from '../table/TableRenderer';
import { useEditableTableController } from './EditableTableController';
import {
  getEditableTableWriteDatasourceId,
  getEditableTableWriteDatasourceVersion,
} from './editableTableWriteDatasourceId';
import {
  TextEditor,
  NumberEditor,
  ColorEditor,
  DateEditor,
  SelectEditor,
  SwitchEditor,
  FileEditor,
} from './cell-editors';
import type { EditableTableColumnConfig, CellEditorType } from './EditableTable.types';
import type {
  ApplyFilterButtonPlacement,
  DictionaryDataSourceConfig,
  FilterPanelGridColumns,
  TableColumnType,
} from '../../types/renderers';
import type { TableAction } from '../../types';
import {
  formatDateForEditableTable,
  formatNumberDisplay,
  getDateInputMode,
  getDateRenderFormat,
  getSwitchChecked,
  normalizeColorDisplay,
} from './editableTableFormatters';
import { getDataSourceTableApiErrorMessage } from './editableTableApiErrors';
import { buildDatabaseUpdateData, buildDatabaseUpdateConditions } from '@/utils/dataConfigUtils';
import {
  fetchDictionaryRows,
  getDictionaryCellPresentation,
  getDictionarySelectStaticOptions,
} from './editableTableDictionary';

function isEventTargetInFloatingOverlay(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const el = target;
  return Boolean(
    el.closest('[data-radix-select-content]') ||
      el.closest('[data-radix-select-viewport]') ||
      el.closest('[data-radix-popper-content-wrapper]') ||
      el.closest('[data-radix-menu-content]') ||
      el.closest('[data-radix-combobox-content]') ||
      el.closest('[data-radix-focus-guard]') ||
      el.closest('[data-radix-popover-content]') ||
      el.closest('[data-radix-dialog-content]') ||
      el.closest('[role="listbox"]')
  );
}

function shouldSkipOutsidePointerForActiveNativeDateInput(
  container: Element,
  eventTarget: EventTarget | null
): boolean {
  if (eventTarget instanceof Node && container.contains(eventTarget)) {
    return false;
  }
  const ae = document.activeElement;
  if (!ae || !(ae instanceof HTMLInputElement)) return false;
  if (ae.type !== 'date' && ae.type !== 'datetime-local') return false;
  return container.contains(ae);
}

function shouldInjectReadOnlyDateCellRender(col: EditableTableColumnConfig): boolean {
  if ((col.inputType || 'text') !== 'date') return false;
  const r = (col as { render?: unknown }).render;
  if (typeof r === 'function') return false;
  if (r == null) return true;
  if (typeof r === 'object' && r !== null && 'type' in r) {
    const t = (r as { type: string }).type;
    return t === 'yyyy-MM-dd' || t === 'yyyy-MM-dd HH:mm:ss';
  }
  return false;
}

const CELL_EDITOR_MAP: Record<CellEditorType, React.ComponentType<any>> = {
  text: TextEditor,
  number: NumberEditor,
  color: ColorEditor,
  date: DateEditor,
  select: SelectEditor,
  switch: SwitchEditor,
  file: FileEditor,
};

interface EditableTableRendererProps {
  columns: EditableTableColumnConfig[];
  dataSource?: Record<string, unknown>[];
  rowKey?: string;
  title?: string;
  enableExport?: boolean;
  pagination?: {
    pageSize?: number;
    current?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: boolean;
  };
  showToolbar?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;
  databaseDataSourceConfig?: any;
  dataSourceConfig?: {
    datasetId?: string;
    databaseDataSourceConfig?: any;
  };
  onUpdateSuccess?: () => void;
  actions?: TableAction[];
  /** Match Table: allow mock rows when there is no data source (dev/demo) */
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];
  /** Legacy saved pages only; ignored at runtime */
  editableConfig?: unknown;
  filterPanelGridColumns?: FilterPanelGridColumns;
  applyFilterButtonPlacement?: ApplyFilterButtonPlacement;
}

const EditableTableRendererInner: React.FC<EditableTableRendererProps> = ({
  columns,
  dataSource = [],
  rowKey = 'id',
  title,
  enableExport,
  pagination,
  showToolbar = true,
  showRefresh = false,
  showSettings = false,
  databaseDataSourceConfig,
  dataSourceConfig,
  onUpdateSuccess,
  actions,
  editableConfig: _legacyEditableConfig,
  ...tableRendererProps
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const fillCell = useGrid24FillCell();
  const isNarrowFlow = useMobileFlowLayout();

  const effectiveDataSourceConfig = databaseDataSourceConfig || dataSourceConfig;

  const resolvedDatabaseDataSourceConfig =
    effectiveDataSourceConfig?.databaseDataSourceConfig || effectiveDataSourceConfig;

  const dataSourceList = useMemo(
    () => (Array.isArray(dataSource) ? dataSource : []),
    [dataSource]
  );

  const [rowDisplayPatches, setRowDisplayPatches] = useState<Record<string, Record<string, unknown>>>({});
  const [isWriteSaving, setIsWriteSaving] = useState(false);
  const dataSourceListRef = useRef<Record<string, unknown>[]>(dataSourceList);
  const dataSourceListStr = useMemo(() => JSON.stringify(dataSourceList), [dataSourceList]);

  useEffect(() => {
    const prevStr = JSON.stringify(dataSourceListRef.current);
    if (prevStr !== dataSourceListStr) {
      setRowDisplayPatches({});
      dataSourceListRef.current = dataSourceList;
    }
  }, [dataSourceListStr]);

  const applyRowDisplayPatch = useCallback((rowId: string, fields: Record<string, unknown>) => {
    setRowDisplayPatches((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), ...fields },
    }));
  }, []);

  const controller = useEditableTableController({
    columns,
    actions,
    onRowEditComplete: async (rowId, editedData, action, rowForDatabaseWrite) => {
      const dsId = getEditableTableWriteDatasourceId(resolvedDatabaseDataSourceConfig, action);
      if (!dsId) {
        return;
      }
      const dsVersion = getEditableTableWriteDatasourceVersion(
        resolvedDatabaseDataSourceConfig,
        action
      );

      const rowCtx =
        rowForDatabaseWrite && typeof rowForDatabaseWrite === 'object'
          ? rowForDatabaseWrite
          : editedData;

      const updateFields = action.config?.updateDatabase?.updateFields ?? {};
      const updateData = buildDatabaseUpdateData(
        updateFields as Parameters<typeof buildDatabaseUpdateData>[0],
        rowCtx,
        {}
      );

      const updateConditions = action.config?.updateDatabase?.updateConditions ?? {};
      const whereConditions = buildDatabaseUpdateConditions(
        updateConditions as Parameters<typeof buildDatabaseUpdateConditions>[0],
        rowCtx,
        {}
      );
      if (whereConditions === null) {
        throw new Error(
          t(
            'table.update_conditions_unresolved',
            'Could not resolve update conditions (missing row value, parameter, or static value). Check configuration.'
          )
        );
      }

      applyRowDisplayPatch(rowId, editedData as Record<string, unknown>);

      setIsWriteSaving(true);
      try {
        const response = await apiClient.put(
          withDatasourceVersion(`/datasources/${dsId}/data`, resolveRuntimeDatasourceVersion(dsId, dsVersion)),
          {
          ...whereConditions,
          ...updateData,
        });
        if (response.success !== false) {
          toast({ title: t('table.edit_success', 'Edit Successful') });
          onUpdateSuccess?.();
        } else {
          throw new Error(response.message || 'Update failed');
        }
      } catch (error) {
        console.error('Row edit save failed:', error);
        toast({
          variant: 'destructive',
          title: t('table.edit_failed', 'Edit Failed'),
          description: getDataSourceTableApiErrorMessage(error, t),
        });
      } finally {
        setIsWriteSaving(false);
      }
    },
  });

  const {
    editingCell,
    editingRow,
    editedRowData,
    rowClickActions,
    columnToRowClickActionMap,
    rowClickConflicts,
    handleStartRowEdit,
    handleRowEditCellChange,
    handleRowEditCellFocus,
    handleRowEditComplete,
    handleCancelRowEdit,
    getNextEditableColumn,
  } = controller;

  const dictionaryLoadKey = useMemo(
    () =>
      columns
        .filter((c) => {
          const ds = c.dictionaryDataSource as DictionaryDataSourceConfig | undefined;
          return c.inputType === 'select' && Boolean(ds?.datasourceId);
        })
        .map((c) => {
          const ds = c.dictionaryDataSource as DictionaryDataSourceConfig | undefined;
          return `${c.dataIndex}:${String(ds?.datasourceId ?? '')}`;
        })
        .sort()
        .join('|'),
    [columns]
  );

  const [dictionaryDataMap, setDictionaryDataMap] = useState<
    Map<string, Record<string, unknown>[]>
  >(() => new Map());
  const [dictionaryLoading, setDictionaryLoading] = useState(false);

  useEffect(() => {
    const dictCols = columns.filter((c) => {
      const ds = c.dictionaryDataSource as DictionaryDataSourceConfig | undefined;
      return c.inputType === 'select' && Boolean(ds?.datasourceId);
    });
    if (dictCols.length === 0) {
      setDictionaryDataMap(new Map());
      setDictionaryLoading(false);
      return;
    }
    let cancelled = false;
    setDictionaryLoading(true);
    void (async () => {
      try {
        const entries = await Promise.all(
          dictCols.map(async (col) => {
            const rows = await fetchDictionaryRows(
              col.dictionaryDataSource as DictionaryDataSourceConfig
            );
            return [col.dataIndex, rows] as const;
          })
        );
        if (!cancelled) {
          setDictionaryDataMap(new Map(entries));
        }
      } finally {
        if (!cancelled) {
          setDictionaryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dictionaryLoadKey]);

  const tableRootRef = useRef<HTMLDivElement>(null);
  const editingRowRef = useRef(editingRow);
  const handleRowEditCompleteRef = useRef(handleRowEditComplete);
  useEffect(() => {
    editingRowRef.current = editingRow;
  }, [editingRow]);
  handleRowEditCompleteRef.current = handleRowEditComplete;

  useEffect(() => {
    if (columnToRowClickActionMap.size === 0 || !editingRow) return;

    const afterInputFlush = (fn: () => void) => {
      window.setTimeout(fn, 0);
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (isEventTargetInFloatingOverlay(e.target)) return;
      const root = tableRootRef.current;
      const t = e.target;
      if (!(t instanceof Node) || !root) return;

      if (!editingRowRef.current) return;
      const editingTr = root.querySelector('tr[data-editing="true"]');
      if (!editingTr) return;
      if (editingTr.contains(t)) return;
      const otherDataRow = t instanceof Element ? t.closest('tr.data-row') : null;
      if (otherDataRow && otherDataRow !== editingTr) return;
      if (shouldSkipOutsidePointerForActiveNativeDateInput(editingTr, t)) {
        return;
      }
      afterInputFlush(() => {
        void handleRowEditCompleteRef.current();
      });
    };

    document.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true);
  }, [editingRow, columnToRowClickActionMap]);

  const isRowActionVisible = useCallback(
    (record: Record<string, unknown>, action: TableAction): boolean => {
      if (!action.visibilityCondition) return true;
      const { field, operator, value } = action.visibilityCondition;
      const recordValue = record[field];
      switch (operator) {
        case 'equals': return recordValue === value;
        case 'not_equals': return recordValue !== value;
        case 'contains': return String(recordValue).includes(String(value));
        case 'gt': return Number(recordValue) > Number(value);
        case 'lt': return Number(recordValue) < Number(value);
        default: return true;
      }
    },
    []
  );

  const handleRowClick = useCallback(
    async (record: Record<string, unknown>, columnKey?: string) => {
      if (columnKey) {
        if (!columnToRowClickActionMap.has(columnKey)) return;
      } else {
        if (columnToRowClickActionMap.size === 0) return;
      }
      if (editingRow) {
        if (editingRow === String(record[rowKey] ?? '')) return;
        await new Promise<void>((r) => {
          setTimeout(r, 0);
        });
        const success = await handleRowEditComplete();
        if (!success) return;
      }
      const actionToCheck = columnKey
        ? columnToRowClickActionMap.get(columnKey)
        : rowClickActions[0];
      if (!actionToCheck) return;
      if (!isRowActionVisible(record, actionToCheck)) return;
      const recordId = String(record[rowKey] ?? '');
      handleStartRowEdit(recordId, record, columnKey);
    },
    [rowClickActions, columnToRowClickActionMap, editingRow, rowKey, handleStartRowEdit, handleRowEditComplete, isRowActionVisible]
  );

  const renderEditableCell = useCallback(
    (
      column: EditableTableColumnConfig,
      record: Record<string, unknown>,
      recordId: string | number
    ) => {
      const cellKey = String(recordId);
      const isRowEditing = editingRow === cellKey;
      const isCurrentlyEditing =
        editingCell?.rowId === cellKey &&
        editingCell?.columnKey === column.dataIndex;
      const inputType = (column.inputType || 'text') as CellEditorType;
      const sw = column.switchConfig;

      const buildRowEditEditor = () => {
        const EditorComponent = CELL_EDITOR_MAP[column.inputType || 'text'];
        const currentValue = editedRowData[column.dataIndex];

        const handleEditorSave = () => {
          const nextColumn = getNextEditableColumn(column.dataIndex);
          if (nextColumn) {
            handleRowEditCellFocus(nextColumn);
          } else {
            void handleRowEditComplete();
          }
        };

        const handleEditorKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const nextColumn = getNextEditableColumn(column.dataIndex);
            if (nextColumn) {
              handleRowEditCellFocus(nextColumn);
            } else {
              void handleRowEditComplete();
            }
          } else if (e.key === 'Escape') {
            handleCancelRowEdit();
          }
        };

        const baseEditorProps: Record<string, unknown> = {
          value: currentValue,
          onChange: (val: unknown) => handleRowEditCellChange(column.dataIndex, val),
          onSave: handleEditorSave,
          onKeyDown: handleEditorKeyDown,
          autoFocus: true,
        };

        if (inputType === 'switch') {
          baseEditorProps.showText = sw?.showText;
          baseEditorProps.onText = sw?.onText;
          baseEditorProps.offText = sw?.offText;
        }
        if (inputType === 'date') {
          baseEditorProps.dateMode = getDateInputMode(column);
        }

        const dictRowsForEdit =
          column.inputType === 'select' && column.dictionaryDataSource
            ? dictionaryDataMap.get(column.dataIndex)
            : undefined;

        const editorProps =
          column.inputType === 'select' && column.dictionaryDataSource
            ? {
                ...baseEditorProps,
                staticOptions: getDictionarySelectStaticOptions(
                  column as TableColumnType,
                  dictRowsForEdit
                ),
                commitOnSelect: false,
              }
            : column.inputType === 'select' && column.datasource
            ? {
                ...baseEditorProps,
                datasourceId: column.datasource.datasourceId,
                version: column.datasource.version,
                valueField: column.datasource.valueField,
                labelField: column.datasource.labelField,
              }
            : baseEditorProps;

        return (
          <div
            data-editing-cell-row={cellKey}
            data-editing-cell-col={String(column.dataIndex)}
            className="min-h-[32px] w-full min-w-0 max-w-full overflow-hidden"
          >
            <EditorComponent {...(editorProps as any)} />
          </div>
        );
      };

      const defaultTextFromRaw = (raw: unknown) => {
        if (raw === null || raw === undefined) return '-';
        if (typeof raw === 'boolean') return String(raw);
        if (typeof raw === 'number') return String(raw);
        return String(raw);
      };

      const renderReadVisual = (raw: unknown, rowForDictionary?: Record<string, unknown>) => {
        const rowSnap = rowForDictionary ?? record;
        if (inputType === 'select' && column.dictionaryDataSource) {
          const rows = dictionaryDataMap.get(column.dataIndex);
          if (dictionaryLoading && (!rows || rows.length === 0)) {
            return (
              <span className="text-muted-foreground text-xs tabular-nums">…</span>
            );
          }
          const { text, style } = getDictionaryCellPresentation(
            rowSnap,
            column as TableColumnType,
            rows
          );
          const hasColor =
            Boolean(style.backgroundColor) || Boolean(style.color);
          return (
            <span
              className={cn(
                'truncate min-w-0 inline-block max-w-full',
                hasColor && 'rounded px-1.5 py-0.5'
              )}
              style={Object.keys(style).length ? style : undefined}
              title={text}
            >
              {text}
            </span>
          );
        }
        if (inputType === 'color') {
          const hex = normalizeColorDisplay(raw);
          return (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <div
                className="h-6 w-6 rounded border border-border shadow-sm shrink-0"
                style={{ backgroundColor: hex }}
                title={String(raw ?? '')}
              />
              <span className="text-xs font-mono text-muted-foreground truncate">
                {raw === null || raw === undefined || raw === '' ? '—' : String(raw)}
              </span>
            </div>
          );
        }
        if (inputType === 'number') {
          return <span className="tabular-nums">{formatNumberDisplay(raw)}</span>;
        }
        if (inputType === 'date') {
          return (
            <span>
              {formatDateForEditableTable(raw, getDateRenderFormat(column))}
            </span>
          );
        }
        return <span>{defaultTextFromRaw(raw)}</span>;
      };

      const cellFocusClass =
        'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 px-2 py-1 rounded min-h-[32px] flex items-center w-full min-w-0';

      if (isRowEditing) {
        if (isCurrentlyEditing) {
          return buildRowEditEditor();
        }

        if (inputType === 'switch') {
          const c = getSwitchChecked(editedRowData[column.dataIndex]);
          return (
            <div
              className={cn(cellFocusClass, 'gap-2')}
              onClick={(e) => e.stopPropagation()}
            >
              {sw?.showText ? (
                <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                  {c ? sw?.onText || 'On' : sw?.offText || 'Off'}
                </span>
              ) : null}
              <Switch
                checked={c}
                onCheckedChange={(next) => {
                  handleRowEditCellChange(column.dataIndex, next);
                }}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          );
        }

        return (
          <div
            className={cellFocusClass}
            onClick={(e) => {
              e.stopPropagation();
              handleRowEditCellFocus(column.dataIndex);
            }}
          >
            {renderReadVisual(editedRowData[column.dataIndex], editedRowData)}
          </div>
        );
      }

      const raw = record[column.dataIndex];
      const readOnlyCellWrap = (node: React.ReactNode) => (
        <div
          className="min-h-[32px] flex items-center px-2 py-1 w-full min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          {node}
        </div>
      );

      if (inputType === 'switch') {
        const c = getSwitchChecked(raw);
        if (columnToRowClickActionMap.has(String(column.dataIndex))) {
          return (
            <div
              className={cellFocusClass}
              onClick={(e) => {
                e.stopPropagation();
                void handleRowClick(record, String(column.dataIndex));
              }}
              title={t('table.click_to_edit', 'Click to edit')}
            >
              {sw?.showText ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {c ? sw?.onText || 'On' : sw?.offText || 'Off'}
                </span>
              ) : null}
              <Switch
                checked={c}
                className="data-[state=checked]:bg-primary pointer-events-none opacity-90"
              />
            </div>
          );
        }
        return readOnlyCellWrap(
          <>
            {sw?.showText ? (
              <span className="text-sm text-muted-foreground tabular-nums">
                {c ? sw?.onText || 'On' : sw?.offText || 'Off'}
              </span>
            ) : null}
            <Switch checked={c} disabled className="data-[state=checked]:bg-primary" />
          </>
        );
      }

      if (columnToRowClickActionMap.has(String(column.dataIndex))) {
        return (
          <div
            className={cellFocusClass}
            onClick={(e) => {
              e.stopPropagation();
              void handleRowClick(record, String(column.dataIndex));
            }}
            title={t('table.click_to_edit', 'Click to edit')}
          >
            {renderReadVisual(raw, record)}
          </div>
        );
      }

      return readOnlyCellWrap(renderReadVisual(raw, record));
    },
    [
      editingRow,
      editingCell,
      editedRowData,
      handleRowEditCellChange,
      handleRowEditCellFocus,
      handleRowEditComplete,
      handleCancelRowEdit,
      getNextEditableColumn,
      handleRowClick,
      rowClickActions,
      columnToRowClickActionMap,
      t,
      dictionaryDataMap,
      dictionaryLoading,
    ]
  );

  const tableColumns: TableColumnType[] = useMemo(() => {
    return columns.map((col) => {
      if (!col.editable) {
        const inputType = (col.inputType || 'text') as CellEditorType;
        const existingRender = (col as { render?: unknown }).render;
        const hasFunctionRender = typeof existingRender === 'function';
        const hasObjectRender =
          existingRender != null && typeof existingRender === 'object';
        if (shouldInjectReadOnlyDateCellRender(col)) {
          const column = { ...col };
          return {
            ...col,
            render: (
              _value: unknown,
              record: Record<string, unknown>
            ) => (
              <span className="break-words whitespace-pre-line">
                {formatDateForEditableTable(
                  record[column.dataIndex],
                  getDateRenderFormat(column)
                )}
              </span>
            ),
          } as unknown as TableColumnType;
        }
        if (inputType === 'switch' && !hasFunctionRender && !hasObjectRender) {
          const column = { ...col };
          return {
            ...col,
            render: (
              _value: unknown,
              record: Record<string, unknown>
            ) => {
              const raw = record[column.dataIndex];
              const c = getSwitchChecked(raw);
              const sw = column.switchConfig;
              return (
                <div
                  className="flex items-center gap-2 min-h-[32px] px-2 py-1 w-full min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sw?.showText ? (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {c ? sw?.onText || 'On' : sw?.offText || 'Off'}
                    </span>
                  ) : null}
                  <Switch
                    checked={c}
                    disabled
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              );
            },
          } as unknown as TableColumnType;
        }
        return { ...col } as unknown as TableColumnType;
      }

      const column = { ...col };
      return {
        ...column,
        render: (
          value: unknown,
          record: Record<string, unknown>,
          index: number
        ) => {
          const recId = (record[rowKey] as string | number) ?? `row-${index}`;
          return renderEditableCell(column, record, recId);
        },
      } as unknown as TableColumnType;
    });
  }, [columns, rowKey, renderEditableCell]);

  return (
    <div ref={tableRootRef} className={cn('relative', fillCell && 'h-full min-h-0')}>
      {isWriteSaving && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-background/70 backdrop-blur-[1px] pointer-events-auto"
          aria-busy
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-5 py-4 shadow-md">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {t('table.saving', 'Saving...')}
            </span>
          </div>
        </div>
      )}
      {/* same action variant rendering as Table (TableRenderer); see constants/tableActionButtonStyle */}
      <TableRenderer
        {...tableRendererProps}
        // md:1 is mandatory when narrow — mergeFilterPanelGridColumns hard-defaults md to 3
        filterPanelGridColumns={isNarrowFlow ? { base: 1, md: 1 } : tableRendererProps.filterPanelGridColumns}
        dataSource={dataSource ?? []}
        rowDisplayPatches={rowDisplayPatches}
        columns={tableColumns}
        rowKey={rowKey}
        title={title}
        showToolbar={showToolbar}
        showRefresh={showRefresh}
        showSettings={showSettings}
        enableExport={enableExport}
        databaseDataSourceConfig={effectiveDataSourceConfig}
        showTotal={false}
        addable={false}
        editable={false}
        deletable={false}
        actions={actions || []}
        pagination={pagination as any}
        skipDefaultRowSelection={columnToRowClickActionMap.size === 0}
        onRowClick={columnToRowClickActionMap.size > 0 ? handleRowClick : undefined}
        onCellClick={columnToRowClickActionMap.size > 0 ? handleRowClick : undefined}
        editingRowId={editingRow}
      />
    </div>
  );
};

const EditableTableRenderer: React.FC<EditableTableRendererProps> = (props) => {
  return <EditableTableRendererInner {...props} />;
};

export default EditableTableRenderer;
