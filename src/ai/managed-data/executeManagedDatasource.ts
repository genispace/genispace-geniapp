import {
  createGeniSpaceClient,
  findManagedAppDataSourceId,
} from './queryManagedDatasource';

/** Result from POST /datasources/:id/data for TRANSACTION / CREATE / UPDATE operations. */
export type ManagedDatasourceOperationResult = {
  operationType?: string;
  affectedRows?: number;
  insertId?: number | string;
  executionTime?: number;
  statementCount?: number;
  [key: string]: unknown;
};

export type ExecuteManagedDatasourceParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Execute a managed GeniApp datasource write operation (TRANSACTION, CREATE, UPDATE, etc.)
 * via POST /datasources/:id/data. For TRANSACTION datasources with JSON payloads, pass
 * `payload` as a JSON string (SQL uses `{{payload}}::jsonb`).
 */
export async function executeManagedDatasourceOperation(
  apiRoot: string,
  accessToken: string | null,
  geniappIdentifier: string,
  seedIdentifier: string,
  params: ExecuteManagedDatasourceParams
): Promise<ManagedDatasourceOperationResult> {
  if (!apiRoot?.trim()) {
    throw new Error('API root is not configured.');
  }
  if (!accessToken?.trim()) {
    throw new Error('Authentication required to execute datasource operation.');
  }

  const gs = createGeniSpaceClient(apiRoot, accessToken);
  const id = await findManagedAppDataSourceId(gs, seedIdentifier, geniappIdentifier);
  if (!id) {
    throw new Error(`Managed datasource "${seedIdentifier}" is not installed for app "${geniappIdentifier}". Upgrade the application.`);
  }

  const body: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body[k] = v;
  }

  const baseURL = apiRoot.replace(/\/$/, '');
  const res = await fetch(`${baseURL}/datasources/${encodeURIComponent(id)}/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: { success?: boolean; data?: ManagedDatasourceOperationResult; message?: string } = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new Error(text || `Datasource operation failed (${res.status})`);
    }
  }

  if (!res.ok) {
    const msg = parsed.message || text || `Datasource operation failed (${res.status})`;
    throw new Error(msg);
  }

  return parsed.data ?? {};
}

/** Convenience wrapper for TRANSACTION datasources that accept a single JSON payload parameter. */
export async function executeManagedDatasourceTransaction(
  apiRoot: string,
  accessToken: string | null,
  geniappIdentifier: string,
  seedIdentifier: string,
  payload: unknown,
  payloadParamName = 'payload'
): Promise<ManagedDatasourceOperationResult> {
  return executeManagedDatasourceOperation(apiRoot, accessToken, geniappIdentifier, seedIdentifier, {
    [payloadParamName]: JSON.stringify(payload),
  });
}

export type TransactionDatasourceClient = (
  seedIdentifier: string,
  payload: unknown
) => Promise<ManagedDatasourceOperationResult>;

/** Factory for per-app transaction executors. */
export function createTransactionDatasourceClient(
  geniappIdentifier: string,
  resolveApiRoot: () => string,
  resolveAccessToken: () => string | null = () => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }
): TransactionDatasourceClient {
  return (seedIdentifier, payload) =>
    executeManagedDatasourceTransaction(
      resolveApiRoot(),
      resolveAccessToken(),
      geniappIdentifier,
      seedIdentifier,
      payload
    );
}
