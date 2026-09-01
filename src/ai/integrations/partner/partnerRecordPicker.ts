import {
  createGeniSpaceClient,
  findManagedAppDataSourceId,
  queryManagedDatasourceRows,
} from '../../managed-data/queryManagedDatasource';

export const PARTNER_GENIAPP = 'partner';
export const PARTNER_RECORD_PICKER_DS = 'partner_record_picker';

export type PartnerRecordRole =
  | 'customer'
  | 'supplier'
  | 'prospect'
  | 'service_provider'
  | 'manufacturer'
  | 'carrier'
  | 'franchisee'
  | 'equipment_owner';

export type PartnerRecordOption = {
  id: string;
  label: string;
  secondary?: string;
  /** Read-only business details published by Partner for directory and picker experiences. */
  snapshot?: Record<string, unknown>;
};

export type LoadPartnerRecordOptionsParams = {
  role?: PartnerRecordRole;
  partyType?: 'organization' | 'person';
  legalEntityRef?: string;
  limit?: number;
  offset?: number;
  ensureIds?: string[];
};

export async function probePartnerRecordPicker(apiRoot: string, token: string | null): Promise<boolean> {
  if (!apiRoot || !token) return false;
  const gs = createGeniSpaceClient(apiRoot, token);
  return (await findManagedAppDataSourceId(gs, PARTNER_RECORD_PICKER_DS, PARTNER_GENIAPP)) != null;
}

function mapPartnerRecord(row: Record<string, unknown>): PartnerRecordOption | null {
  const id = String(row.id ?? '').trim();
  const label = String(row.primary ?? row.display_name ?? row.legal_name ?? '').trim();
  if (!id || !label) return null;
  const secondary = String(row.secondary ?? row.partner_number ?? '').trim();
  const snapshot = parseSnapshot(row.snapshot);
  return {
    id,
    label,
    ...(secondary ? { secondary } : {}),
    ...(snapshot ? { snapshot } : {}),
  };
}

function parseSnapshot(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

async function queryPartnerRecords(
  apiRoot: string,
  token: string,
  params: LoadPartnerRecordOptionsParams,
  extra: { id?: string; limit: number; offset: number },
): Promise<Record<string, unknown>[]> {
  return queryManagedDatasourceRows(apiRoot, token, PARTNER_GENIAPP, PARTNER_RECORD_PICKER_DS, {
    role: params.role ?? '',
    party_type: params.partyType ?? '',
    legal_entity_ref: params.legalEntityRef ?? '',
    id: extra.id ?? '',
    search: '',
    limit: extra.limit,
    offset: extra.offset,
  });
}

export async function loadPartnerRecordOptions(
  apiRoot: string,
  token: string | null,
  params: LoadPartnerRecordOptionsParams = {},
): Promise<PartnerRecordOption[]> {
  if (!apiRoot || !token || !(await probePartnerRecordPicker(apiRoot, token))) return [];

  const pageSize = Math.min(Math.max(params.limit ?? 100, 1), 100);
  const byId = new Map<string, PartnerRecordOption>();
  let offset = Math.max(params.offset ?? 0, 0);
  while (true) {
    const rows = await queryPartnerRecords(apiRoot, token, params, { limit: pageSize, offset });
    for (const row of rows) {
      const option = mapPartnerRecord(row);
      if (option) byId.set(option.id, option);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
    if (offset > 5000) break;
  }

  await Promise.all((params.ensureIds ?? []).filter((id) => id && !byId.has(id)).map(async (id) => {
    const rows = await queryPartnerRecords(apiRoot, token, params, { id, limit: 1, offset: 0 });
    const option = rows.length > 0 ? mapPartnerRecord(rows[0]) : null;
    if (option) byId.set(option.id, option);
  }));
  return [...byId.values()];
}
