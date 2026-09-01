export interface WorkflowResultRow {
  id: string;
  run_no?: string | null;
  source_record_key?: string | null;
  summary?: string | null;
  status?: string | null;
  owner?: string | null;
  created_at?: string | null;
}

export interface AdoptFieldConfig {
  /** i18n key or plain label */
  label: string;
  /** Dot path in parsed summary JSON */
  summaryPath: string;
  /** Target column on the business record */
  targetField: string;
  /** Optional transform before PATCH */
  toValue?: (
    raw: unknown,
    parsed: Record<string, unknown> | null,
    language?: 'en' | 'zh',
  ) => unknown;
}

export interface AppTableClient {
  list<T>(
    table: string,
    options?: { filters?: Record<string, string | number | boolean | null>; limit?: number; offset?: number }
  ): Promise<{ items: T[] }>;
  update(table: string, id: string, payload: Record<string, unknown>): Promise<unknown>;
}
