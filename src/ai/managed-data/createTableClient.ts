import type { AppTableClient } from '../types';

/** Adapter for apps using apiList / apiUpdate style helpers. */
export function createTableClient(handlers: {
  list: <T>(table: string, params?: Record<string, string | number | boolean | null>) => Promise<T[]>;
  update: (table: string, id: string, payload: Record<string, unknown>) => Promise<unknown>;
}): AppTableClient {
  return {
    async list<T>(
      table: string,
      options?: { filters?: Record<string, string | number | boolean | null>; limit?: number; offset?: number }
    ) {
      const params: Record<string, string | number | boolean | null> = {
        ...(options?.filters ?? {}),
      };
      if (options?.limit != null) params.limit = options.limit;
      if (options?.offset != null) params.offset = options.offset;
      const items = await handlers.list<T>(table, params);
      return { items };
    },
    update: handlers.update,
  };
}
