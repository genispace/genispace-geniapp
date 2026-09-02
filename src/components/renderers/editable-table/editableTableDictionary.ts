import type { CSSProperties } from 'react';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import type { DictionaryDataSourceConfig, TableColumnType } from '@/types/renderers';

export async function fetchDictionaryRows(
  config: DictionaryDataSourceConfig | undefined
): Promise<Record<string, unknown>[]> {
  if (!config || config.type !== 'database' || !config.datasourceId) return [];
  try {
    const response = await apiClient.post(
      withDatasourceVersion(
        `/datasources/${config.datasourceId}/data`,
        resolveRuntimeDatasourceVersion(config.datasourceId, config.version)
      ),
      {
      limit: 10000,
      offset: 0,
    });
    const dictionaryData = Array.isArray((response.data as { data?: unknown })?.data)
      ? ((response.data as { data: Record<string, unknown>[] }).data)
      : Array.isArray(response.data)
        ? (response.data as Record<string, unknown>[])
        : [];
    return Array.isArray(dictionaryData) ? dictionaryData : [];
  } catch (error) {
    console.error('加载字典数据失败:', error);
    return [];
  }
}

function formatCellFallback(raw: unknown): string {
  if (raw === null || raw === undefined) return '-';
  if (typeof raw === 'boolean') return String(raw);
  return String(raw);
}

export function findMatchedDictionaryItem(
  record: Record<string, unknown>,
  column: TableColumnType,
  dictionaryRows: Record<string, unknown>[] | undefined
): Record<string, unknown> | null {
  if (!column.dictionaryDataSource || !dictionaryRows?.length) return null;
  const { matchConditions } = column.dictionaryDataSource;
  if (!matchConditions?.length) return null;
  const matched = dictionaryRows.find((item) =>
    matchConditions.every((condition) => {
      const tableValue = record[condition.tableField];
      const dictValue = item[condition.dictionaryField];
      return tableValue === dictValue;
    })
  );
  return matched ?? null;
}

export function getDictionaryCellPresentation(
  record: Record<string, unknown>,
  column: TableColumnType,
  dictionaryRows: Record<string, unknown>[] | undefined
): { text: string; style: CSSProperties } {
  const ds = column.dictionaryDataSource;
  const matched = findMatchedDictionaryItem(record, column, dictionaryRows);
  const displayField = ds?.displayField;
  let text: string;
  if (matched && displayField && displayField in matched) {
    text = formatCellFallback(matched[displayField]);
  } else {
    text = formatCellFallback(record[column.dataIndex]);
  }
  const style: CSSProperties = {};
  if (matched && ds?.backgroundColorField) {
    const bg = matched[ds.backgroundColorField];
    const s = bg != null ? String(bg).trim() : '';
    if (s) style.backgroundColor = s;
  }
  if (matched && ds?.textColorField) {
    const c = matched[ds.textColorField];
    const s = c != null ? String(c).trim() : '';
    if (s) style.color = s;
  }
  return { text, style };
}

export function getDictionarySelectStaticOptions(
  column: TableColumnType,
  dictionaryRows: Record<string, unknown>[] | undefined
): { value: string; label: string }[] {
  if (!column.dictionaryDataSource || !dictionaryRows?.length) return [];
  const { matchConditions, displayField } = column.dictionaryDataSource;
  if (!matchConditions?.length || !displayField) return [];
  const matchForColumn = matchConditions.find((c) => c.tableField === column.dataIndex);
  const dictionaryField =
    matchForColumn?.dictionaryField ?? matchConditions[0]?.dictionaryField;
  if (!dictionaryField) return [];
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const item of dictionaryRows) {
    const val = item[dictionaryField];
    const displayVal = item[displayField];
    const valueStr = val != null ? String(val) : '';
    if (!valueStr || seen.has(valueStr)) continue;
    seen.add(valueStr);
    out.push({
      value: valueStr,
      label: displayVal != null ? String(displayVal) : valueStr,
    });
  }
  return out;
}
