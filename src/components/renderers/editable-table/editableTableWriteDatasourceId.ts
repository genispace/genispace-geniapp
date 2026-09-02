import type { TableAction } from '../../types';

export function getEditableTableWriteDatasourceId(
  tableDatabaseConfig: { datasourceId?: string } | null | undefined,
  rowClickOrAction: TableAction | null | undefined
): string | undefined {
  const fromAction =
    rowClickOrAction?.type === 'updateDatabase' && rowClickOrAction.config?.updateDatabase?.targetDatasourceId
      ? String(rowClickOrAction.config.updateDatabase.targetDatasourceId).trim()
      : '';
  if (fromAction) {
    return fromAction;
  }
  return tableDatabaseConfig?.datasourceId;
}

export function getEditableTableWriteDatasourceVersion(
  tableDatabaseConfig: { version?: number } | null | undefined,
  rowClickOrAction: TableAction | null | undefined
): number | undefined {
  if (
    rowClickOrAction?.type === 'updateDatabase' &&
    rowClickOrAction.config?.updateDatabase?.targetDatasourceVersion != null
  ) {
    return rowClickOrAction.config.updateDatabase.targetDatasourceVersion;
  }
  return tableDatabaseConfig?.version;
}
