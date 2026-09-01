import { GeniSpace } from '@genispace/sdk';

function metaBool(v: unknown): boolean {
  return v === true || v === 'true';
}

/**
 * Max datasources per list page. `GET /datasources` on older/deployed API
 * versions validates `limit` as 1-100 (a single `limit: 500` call 400s there —
 * the message even reads "between 1-100"), so we page in bounded 100-row
 * windows rather than one oversized request. This mirrors the agent-resolution
 * pattern (precheck/aiDraft/scheduleAdvisor) and keeps cross-app datasource
 * resolution working in spaces that publish 500+ datasources (e.g. retail-crm
 * alone ships 240+), where the target row falls past the first page.
 */
const DS_LIST_PAGE = 100;
/** Hard ceiling on pages scanned so a mis-provisioned space can't loop forever. */
const DS_LIST_MAX_PAGES = 50;

function matchesManaged(
  x: { identifier?: string | null; metadata?: unknown },
  seedIdentifier: string,
  geniappIdentifier: string
): boolean {
  const meta = x.metadata as Record<string, unknown> | null | undefined;
  return (
    String(x.identifier || '') === seedIdentifier &&
    metaBool(meta?.managedByGeniapp) &&
    String(meta?.geniappIdentifier || '') === geniappIdentifier
  );
}

export async function findManagedAppDataSourceId(
  client: GeniSpace,
  seedIdentifier: string,
  geniappIdentifier: string
): Promise<string | null> {
  // Fast path: server-side name search narrows to the handful of datasources
  // whose name/description contain the identifier (managed datasource names are
  // seeded from the identifier), so the match is almost always on page 1.
  try {
    const { items } = await client.dataSources.listDataSources({ search: seedIdentifier, limit: DS_LIST_PAGE });
    const hit = items.find((x) => matchesManaged(x, seedIdentifier, geniappIdentifier));
    if (hit?.id != null) return String(hit.id);
  } catch {
    // Search unsupported on this API version — fall through to full paging.
  }

  // Fallback: page through the space's datasources in bounded windows. Stop as
  // soon as a page is short (last page) so we never over-fetch.
  for (let page = 1; page <= DS_LIST_MAX_PAGES; page += 1) {
    const { items } = await client.dataSources.listDataSources({ page, limit: DS_LIST_PAGE });
    const hit = items.find((x) => matchesManaged(x, seedIdentifier, geniappIdentifier));
    if (hit?.id != null) return String(hit.id);
    if (items.length < DS_LIST_PAGE) break;
  }
  return null;
}

export function createGeniSpaceClient(apiRoot: string, accessToken: string | null): GeniSpace {
  const baseURL = apiRoot.replace(/\/$/, '');
  const client = new GeniSpace({ baseURL, apiKey: accessToken || '' });
  if (accessToken) client.updateAccessToken(accessToken);
  return client;
}

type DsQueryParams = Record<string, string | number | boolean | undefined>;

function asNonNegativeInt(v: string | number | boolean | undefined): number | null {
  if (typeof v === 'boolean' || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function rowsOf(payload: { data?: unknown[] | null }): Record<string, unknown>[] {
  return (payload.data || []).filter((r): r is Record<string, unknown> => r != null && typeof r === 'object');
}

/** Mirrors the API's default page size when the request carries no `limit`. */
const API_DEFAULT_LIMIT = 20;

/**
 * Run one READ query with pagination expressed in a way EVERY API version
 * honors.
 *
 * Why this exists: `GET /datasources/:id/data` derives the `{{offset}}` SQL
 * binding from `(page - 1) * limit` and OVERWRITES any `offset` sent as a plain
 * query param (see api datasource.service `getDataSourceData`). So a bare
 * `{ limit, offset }` GET silently pins `{{offset}}` to 0 — page turns fetch
 * the same first page. Newer API branches may honor the `offset` param
 * directly, so every request here keeps `page`, `limit` and `offset` mutually
 * consistent (`offset === (page - 1) * limit`); both interpretations then
 * yield the same window.
 *
 * - `offset` aligned to `limit` → one request with the matching `page`.
 * - misaligned `offset` (e.g. ServerDataTable's `limit = pageSize + 1`,
 *   `offset = pageIndex * pageSize`) → stitch the two aligned windows that
 *   cover the requested range.
 */
export async function queryReadRowsPaged(
  gs: GeniSpace,
  datasourceId: string,
  params: DsQueryParams
): Promise<Record<string, unknown>[]> {
  const { offset: rawOffset, ...rest } = params;
  const offset = asNonNegativeInt(rawOffset);

  // No usable offset (absent/0/non-numeric): page 1 on every API version.
  if (!offset) {
    return rowsOf(await gs.dataSources.queryDataSourceRead(datasourceId, params));
  }

  const limit = asNonNegativeInt(params.limit);
  const windowSize = limit && limit > 0 ? limit : API_DEFAULT_LIMIT;

  const fetchWindow = async (windowIndex: number): Promise<Record<string, unknown>[]> => {
    const windowOffset = windowIndex * windowSize;
    const payload = await gs.dataSources.queryDataSourceRead(datasourceId, {
      ...rest,
      page: windowIndex + 1,
      limit: windowSize,
      offset: windowOffset,
    });
    return rowsOf(payload);
  };

  // Aligned: the requested range IS one window.
  if (offset % windowSize === 0) {
    return fetchWindow(offset / windowSize);
  }

  // Misaligned: stitch the two adjacent aligned windows covering
  // [offset, offset + windowSize).
  const firstWindow = Math.floor(offset / windowSize);
  const skip = offset - firstWindow * windowSize;
  const head = (await fetchWindow(firstWindow)).slice(skip);
  // Only fetch the next window when the first was full (i.e. more rows may exist).
  if (head.length + skip < windowSize) return head;
  const tail = await fetchWindow(firstWindow + 1);
  return head.concat(tail.slice(0, windowSize - head.length));
}

export async function queryManagedDatasourceRows(
  apiRoot: string,
  accessToken: string | null,
  geniappIdentifier: string,
  seedIdentifier: string,
  params: DsQueryParams = { limit: 50 }
): Promise<Record<string, unknown>[]> {
  if (!apiRoot || !accessToken) return [];
  const gs = createGeniSpaceClient(apiRoot, accessToken);
  const id = await findManagedAppDataSourceId(gs, seedIdentifier, geniappIdentifier);
  if (!id) return [];
  return queryReadRowsPaged(gs, id, params);
}

const DATASOURCE_PAGE_SIZE = 1000;

/** Fetch all rows from a managed datasource, paginating at the API max limit (1000). */
export async function queryManagedDatasourceRowsAll(
  apiRoot: string,
  accessToken: string | null,
  geniappIdentifier: string,
  seedIdentifier: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const rows = await queryManagedDatasourceRows(apiRoot, accessToken, geniappIdentifier, seedIdentifier, {
      ...params,
      limit: DATASOURCE_PAGE_SIZE,
      offset,
    });
    all.push(...rows);
    if (rows.length < DATASOURCE_PAGE_SIZE) break;
    offset += DATASOURCE_PAGE_SIZE;
  }
  return all;
}
