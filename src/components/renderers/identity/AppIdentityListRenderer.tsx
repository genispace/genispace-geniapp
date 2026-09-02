import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@genispace/shared-utils';
import { Input, Switch, toast } from '@genispace/shared-ui';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/ui/pagination';
import apiClient from '@/lib/api/apiClient';
import { transactionDatabaseData, withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useWorkbenchAppAccess } from '@/hooks/useWorkbenchAppAccess';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';

/**
 * The one component that touches the platform RBAC API. Lists the workbench application's
 * identities — users or roles — and composes over the page bus (row click emits the selected
 * identity for a downstream IdentityAttributeAssign).
 *
 * Because identity (platform RBAC DB, via API) and its tenant-side attributes (business DB, via
 * datasource) live in DIFFERENT databases, a SQL JOIN is impossible; this component MERGES them
 * on the client by join key. So for roles it can show name/code/member-count from the API AND an
 * inline-editable extension column (e.g. ds_roles_ex.filter_store) pulled from a datasource, keyed
 * by role code. For users it can inline-assign application roles (a platform RBAC write).
 */
export interface AppIdentityListRendererProps {
  id?: string;
  /** Which identity set to list. */
  source?: 'users' | 'roles';
  /** Row click emits the selected identity id/code under this bus key. Empty → rows not selectable. */
  emitParamKey?: string;
  searchable?: boolean;
  /** users: show the email column. */
  showEmail?: boolean;
  /** users: show the phone column. */
  showPhone?: boolean;
  /** users: show role badges (read-only) — ignored when roleAssignable is on. */
  showRoles?: boolean;
  /** users: render an inline role picker per row and write it via the RBAC assign API. */
  roleAssignable?: boolean;
  /** users: show the role filter dropdown next to search (default true). */
  roleFilterable?: boolean;
  /** roles: READ datasource holding the extension attribute rows (merged by attributeKeyField).
   *  users: same datasource, loaded when emitAttributeParamKey is set. */
  attributeDatasourceId?: string;
  /** roles: TRANSACTION datasource that upserts one identity's attribute value. */
  attributeSaveDatasourceId?: string;
  /** roles: join field in the attribute rows (default 'role_code'). */
  attributeKeyField?: string;
  /** roles: value field in the attribute rows (default 'filter_store'). */
  attributeValueField?: string;
  /** roles: inline editor kind for the attribute column. */
  attributeKind?: 'none' | 'toggle' | 'number';
  /** roles: attribute column header (plain string or bilingual { zh, en }). */
  attributeLabel?: unknown;
  /** roles: SQL param name carrying the identity code in the save body (default 'roleCode'). */
  attributeSaveKeyParam?: string;
  /** roles: SQL param name carrying the value in the save body (default 'filterStore'). */
  attributeSaveValueParam?: string;
  /** users: bus key carrying the selected user's role attribute value ('true'/'false', looked up
   *  from attributeDatasourceId by roles[0].code). Lets listeners (e.g. via visibleWhen) react to
   *  whether the selected identity needs the attribute-gated workflow. Empty → not emitted. */
  emitAttributeParamKey?: string;
  showMemberCount?: boolean;
  showPermissionCount?: boolean;
  /** users: table box fixed height (px number or CSS e.g. calc(100vh - 200px); scrolls beyond). Unset → hug content. */
  listHeight?: number | string;
  /** users: rows per page (client-side pagination). 0/unset → single page. */
  pageSize?: number;
}

interface AppUser {
  id: string;
  platformUserId: string;
  email?: string;
  phoneNumber?: string | null;
  name?: string;
  roles?: Array<{ id: string; code: string; name: string }>;
}
interface AppRole {
  id: string;
  code: string;
  name: string;
  memberCount?: number;
  permissions?: unknown[];
}

function asArray<T>(res: unknown): T[] {
  const body = res as { success?: boolean; data?: unknown };
  if (!body || body.success === false) return [];
  return Array.isArray(body.data) ? (body.data as T[]) : [];
}

function extractRows(res: unknown): Record<string, unknown>[] {
  const body = res as { success?: boolean; data?: unknown };
  if (!body || body.success === false) return [];
  const d = body.data;
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

const initials = (n: string) => (n || '?').trim().slice(0, 1).toUpperCase();

// Same page-number windowing as TableRenderer's default pagination (max 7 items with ellipsis).
function getPaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = [];
  const maxItems = 7;
  if (totalPages <= maxItems) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else {
    const leftSide = Math.floor(maxItems / 2);
    const rightSide = maxItems - leftSide - 1;
    if (currentPage - leftSide <= 1) {
      for (let i = 1; i <= leftSide + rightSide + 1; i++) items.push(i);
      items.push('ellipsis');
      items.push(totalPages);
    } else if (currentPage + rightSide >= totalPages) {
      items.push(1);
      items.push('ellipsis');
      for (let i = totalPages - (leftSide + rightSide); i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      items.push('ellipsis');
      for (let i = currentPage - leftSide; i <= currentPage + rightSide; i++) items.push(i);
      items.push('ellipsis');
      items.push(totalPages);
    }
  }
  return items;
}

/**
 * Workbench-standard table pagination footer (mirrors TableRenderer's default style):
 * left "Showing x-y of n", center prev/numbered/next, right page-size changer.
 */
const IdentityListPagination: React.FC<{
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({ total, page, pageSize, onPageChange, onPageSizeChange }) => {
  const { t } = useTranslation(['renderers', 'common']);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap border-t border-neutral-200 dark:border-neutral-700 px-3 py-2">
      <div className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
        {t('common:pagination.showing_range_total', 'Showing {{start}}-{{end}} of {{total}} items', { start, end, total })}
      </div>
      {totalPages > 1 && (
        <Pagination className="justify-center mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            {getPaginationItems(page, totalPages).map((item, i) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={page === item}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
          {t('common:pagination.items_per_page', 'Items per page')}
        </span>
        <select
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 20, 50, 100, 500, 1000].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{t('common:pagination.items', 'items')}</span>
      </div>
    </div>
  );
};

export function AppIdentityListRenderer({
  id = 'app-identity-list',
  source = 'users',
  emitParamKey,
  searchable = true,
  showEmail = true,
  showPhone = true,
  showRoles = true,
  roleAssignable = false,
  roleFilterable = true,
  attributeDatasourceId,
  attributeSaveDatasourceId,
  attributeKeyField = 'role_code',
  attributeValueField = 'filter_store',
  attributeKind = 'none',
  attributeLabel,
  attributeSaveKeyParam = 'roleCode',
  attributeSaveValueParam = 'filterStore',
  emitAttributeParamKey,
  showMemberCount = true,
  showPermissionCount = true,
  listHeight,
  pageSize = 0,
}: AppIdentityListRendererProps) {
  const { t } = useTranslation('renderers');
  const { resolveBilingualText: bi } = useWorkbenchConfigLocale();
  const { applicationId } = useWorkbenchAppAccess();
  const effectiveEmitKey = emitParamKey ?? (source === 'users' ? 'selectedUserId' : '');

  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [roleOptions, setRoleOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [attrMap, setAttrMap] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { emit } = useComponentCommunication({
    componentId: id,
    emitParameters: [effectiveEmitKey, emitAttributeParamKey].filter((k): k is string => !!k),
  });

  // Load identities (users or roles) from the RBAC API.
  useEffect(() => {
    if (!applicationId) return;
    let active = true;
    setLoading(true);
    setError(null);
    const url = source === 'users' ? `/applications/${applicationId}/users` : `/applications/${applicationId}/rbac/roles`;
    (async () => {
      try {
        // The users endpoint paginates server-side (default limit 10, cap 100) — walk every
        // page so client-side pagination/search/role-filter operate on the full identity list.
        const PAGE_LIMIT = 100;
        const all: Array<AppUser | AppRole> = [];
        for (let page = 1; ; page += 1) {
          const res = await apiClient.get(url, { page, limit: PAGE_LIMIT });
          const rows = asArray<AppUser | AppRole>(res);
          all.push(...rows);
          const total = Number((res as { pagination?: { total?: number } } | null)?.pagination?.total ?? 0);
          if (rows.length < PAGE_LIMIT || (total > 0 && all.length >= total)) break;
        }
        if (!active) return;
        if (source === 'users') setUsers(all as AppUser[]);
        else setRoles(all as AppRole[]);
      } catch (e: unknown) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applicationId, source]);

  // users + (roleAssignable | showRoles): fetch the FULL role list — powers both the inline
  // picker and the role filter (the filter must list every role, even ones nobody has yet).
  useEffect(() => {
    if (!applicationId || source !== 'users' || (!roleAssignable && !showRoles)) return;
    let active = true;
    apiClient
      .get(`/applications/${applicationId}/rbac/roles`)
      .then((res) => {
        if (!active) return;
        setRoleOptions(asArray<AppRole>(res).map((r) => ({ code: r.code, name: r.name })));
      })
      .catch(() => active && setRoleOptions([]));
    return () => {
      active = false;
    };
  }, [applicationId, source, roleAssignable, showRoles]);

  // roles: fetch the extension rows and index by join key (powers the inline attribute column).
  // users: same rows, fetched when emitAttributeParamKey is set (powers the per-select attribute emit).
  const loadAttributes = useCallback(() => {
    if (!attributeDatasourceId) return;
    if (source === 'users' && !emitAttributeParamKey) return;
    apiClient
      .post(withDatasourceVersion(`/datasources/${attributeDatasourceId}/data`, resolveRuntimeDatasourceVersion(attributeDatasourceId)), { page: 1, limit: 2000 })
      .then((res) => {
        const map: Record<string, unknown> = {};
        extractRows(res).forEach((r) => {
          const key = String(r[attributeKeyField] ?? '');
          if (key) map[key] = r[attributeValueField];
        });
        setAttrMap(map);
      })
      .catch(() => setAttrMap({}));
  }, [source, attributeDatasourceId, attributeKeyField, attributeValueField, emitAttributeParamKey]);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  const handleSelect = (identityId: string) => {
    if (!effectiveEmitKey) return;
    setSelectedId(identityId);
    emit(effectiveEmitKey, identityId);
    if (emitAttributeParamKey && source === 'users') {
      const u = users.find((x) => x.platformUserId === identityId);
      const raw = attrMap[u?.roles?.[0]?.code || ''];
      const boolVal = raw === true || raw === 'true' || raw === 't' || raw === 1 || raw === '1';
      emit(emitAttributeParamKey, boolVal ? 'true' : 'false');
    }
  };

  const handleRoleChange = useCallback(
    async (u: AppUser, code: string) => {
      if (!applicationId) return;
      const roleCodes = code ? [code] : [];
      try {
        const res = await apiClient.put(`/applications/${applicationId}/users/${u.platformUserId}/roles`, { roleCodes });
        if ((res as { success?: boolean })?.success === false) throw new Error('failed');
        setUsers((prev) =>
          prev.map((x) =>
            x.platformUserId === u.platformUserId
              ? { ...x, roles: code ? [{ id: code, code, name: roleOptions.find((r) => r.code === code)?.name || code }] : [] }
              : x,
          ),
        );
        toast({ title: t('app_identity_list.role_saved', 'Role updated') });
      } catch {
        toast({ variant: 'destructive', title: t('app_identity_list.role_save_failed', 'Failed to update role') });
      }
    },
    [applicationId, roleOptions, t],
  );

  const handleAttrChange = useCallback(
    async (code: string, value: unknown) => {
      setAttrMap((prev) => ({ ...prev, [code]: value }));
      if (!attributeSaveDatasourceId) return;
      try {
        const res = await transactionDatabaseData(attributeSaveDatasourceId, {
          [attributeSaveKeyParam]: code,
          [attributeSaveValueParam]: typeof value === 'boolean' ? String(value) : String(value ?? ''),
        });
        if (res?.success === false) throw new Error('failed');
        toast({ title: t('app_identity_list.attr_saved', 'Saved') });
      } catch {
        toast({ variant: 'destructive', title: t('app_identity_list.attr_save_failed', 'Save failed') });
        loadAttributes();
      }
    },
    [attributeSaveDatasourceId, attributeSaveKeyParam, attributeSaveValueParam, loadAttributes, t],
  );

  // Role filter: '' = all, '__none__' = users with no role assigned. Options come from the
  // full RBAC role list (so empty roles are filterable too); fall back to roles seen on the
  // loaded users if the role list failed to load.
  const [roleFilter, setRoleFilter] = useState('');
  const filterRoleOptions = useMemo(() => {
    if (roleOptions.length > 0) return roleOptions;
    const map = new Map<string, string>();
    users.forEach((u) =>
      (u.roles || []).forEach((r) => {
        if (r.code && !map.has(r.code)) map.set(r.code, r.name || r.code);
      }),
    );
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  }, [users, roleOptions]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (
        q &&
        !(u.name || '').toLowerCase().includes(q) &&
        !(u.email || '').toLowerCase().includes(q) &&
        !(u.phoneNumber || '').toLowerCase().includes(q)
      )
        return false;
      if (roleFilter === '__none__') return !(u.roles && u.roles.length > 0);
      if (roleFilter) return u.roles?.[0]?.code === roleFilter;
      return true;
    });
  }, [users, search, roleFilter]);

  // Client-side pagination (shared by users/roles views). Page size is user-adjustable,
  // seeded by the pageSize prop; page resets on filter or page-size change.
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  useEffect(() => setPageSizeState(pageSize), [pageSize]);
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);
  const effectivePageSize = pageSizeState;
  const handlePageSizeChange = useCallback((n: number) => {
    setPageSizeState(n);
    setPage(1);
  }, []);

  // Pure-digit strings are treated as px; anything else (e.g. calc(...)) passes through as CSS.
  const listHeightCss =
    typeof listHeight === 'string' && /^\d+(\.\d+)?$/.test(listHeight.trim()) ? Number(listHeight) : listHeight;

  if (!applicationId) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        {t('app_identity_list.no_application', 'This workbench is not linked to an application.')}
      </div>
    );
  }

  const thCls = 'text-left font-medium px-3 py-2 text-neutral-500';
  const attrHeader = bi(attributeLabel) || t('app_identity_list.attribute', 'Attribute');

  // ── roles view ──
  if (source === 'roles') {
    const colCount = 2 + (showMemberCount ? 1 : 0) + (showPermissionCount ? 1 : 0) + (attributeKind !== 'none' ? 1 : 0);
    const roleTotalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(roles.length / effectivePageSize)) : 1;
    const rolePage = Math.min(page, roleTotalPages);
    const pagedRoles =
      effectivePageSize > 0 ? roles.slice((rolePage - 1) * effectivePageSize, rolePage * effectivePageSize) : roles;
    return (
      <div className="space-y-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div
          className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-col', !listHeight && 'overflow-x-auto')}
          style={listHeight ? { height: listHeightCss } : undefined}
        >
          <div className={listHeight ? 'flex-1 min-h-0 overflow-auto' : undefined}>
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                <th className={cn(thCls, 'w-[32%]')}>{t('app_identity_list.col_role', 'Role')}</th>
                <th className={thCls}>{t('app_identity_list.col_code', 'Code')}</th>
                {showMemberCount && <th className={cn(thCls, 'text-right w-[12%]')}>{t('app_identity_list.col_members', 'Members')}</th>}
                {showPermissionCount && <th className={cn(thCls, 'text-right w-[12%]')}>{t('app_identity_list.col_permissions', 'Permissions')}</th>}
                {attributeKind !== 'none' && <th className={cn(thCls, 'text-right w-[18%]')}>{attrHeader}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="px-3 py-3 text-neutral-400" colSpan={colCount}>{t('app_identity_list.loading', 'Loading…')}</td></tr>
              )}
              {!loading && roles.length === 0 && (
                <tr><td className="px-3 py-3 text-neutral-400" colSpan={colCount}>{t('app_identity_list.no_roles', 'No roles')}</td></tr>
              )}
              {!loading && pagedRoles.map((r) => {
                const has = Object.prototype.hasOwnProperty.call(attrMap, r.code);
                const raw = attrMap[r.code];
                const boolVal = raw === true || raw === 'true' || raw === 't' || raw === 1 || raw === '1';
                return (
                  <tr key={r.id || r.code} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium truncate">{r.name || r.code}</td>
                    <td className="px-3 py-2 text-neutral-500 font-mono text-xs truncate">{r.code}</td>
                    {showMemberCount && <td className="px-3 py-2 text-right text-neutral-500 tabular-nums">{r.memberCount ?? 0}</td>}
                    {showPermissionCount && <td className="px-3 py-2 text-right text-neutral-500 tabular-nums">{(r.permissions || []).length}</td>}
                    {attributeKind === 'toggle' && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {!has && <span className="text-[11px] text-amber-600 whitespace-nowrap">{t('app_identity_list.unregistered', 'Unregistered · hidden')}</span>}
                          <Switch checked={boolVal} onCheckedChange={(v) => handleAttrChange(r.code, v)} />
                        </div>
                      </td>
                    )}
                    {attributeKind === 'number' && (
                      <td className="px-3 py-2 text-right">
                        <input
                          key={`${r.code}:${String(raw ?? '')}`}
                          type="number"
                          defaultValue={raw != null ? String(raw) : ''}
                          onBlur={(e) => handleAttrChange(r.code, e.target.value === '' ? null : Number(e.target.value))}
                          className="w-20 text-right px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent font-mono text-sm tabular-nums"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {effectivePageSize > 0 && (
            <IdentityListPagination
              total={roles.length}
              page={rolePage}
              pageSize={effectivePageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>
    );
  }

  // ── users view ──
  const userColCount = 1 + (showEmail ? 1 : 0) + (showPhone ? 1 : 0) + (showRoles || roleAssignable ? 1 : 0);
  const userTotalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(filteredUsers.length / effectivePageSize)) : 1;
  const currentPage = Math.min(page, userTotalPages);
  const pagedUsers =
    effectivePageSize > 0
      ? filteredUsers.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize)
      : filteredUsers;
  return (
    <div className="space-y-2">
      {searchable && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('app_identity_list.search_placeholder', 'Search name, email or phone')}
            className="h-8 text-sm max-w-xs"
          />
          {roleFilterable && (showRoles || roleAssignable) && filterRoleOptions.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 max-w-[180px]"
            >
              <option value="">{t('app_identity_list.filter_all_roles', 'All roles')}</option>
              <option value="__none__">{t('app_identity_list.role_none', 'Unassigned')}</option>
              {filterRoleOptions.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div
        className={cn('rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-col', !listHeight && 'overflow-x-auto')}
        style={listHeight ? { height: listHeightCss } : undefined}
      >
        <div className={listHeight ? 'flex-1 min-h-0 overflow-auto' : undefined}>
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className={cn(thCls, 'w-[30%]')}>{t('app_identity_list.col_name', 'Name')}</th>
              {showEmail && <th className={thCls}>{t('app_identity_list.col_email', 'Email')}</th>}
              {showPhone && <th className={cn(thCls, 'w-[16%]')}>{t('app_identity_list.col_phone', 'Phone')}</th>}
              {(showRoles || roleAssignable) && <th className={cn(thCls, 'w-[26%]')}>{t('app_identity_list.col_roles', 'Role')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="px-3 py-3 text-neutral-400" colSpan={userColCount}>{t('app_identity_list.loading', 'Loading…')}</td></tr>
            )}
            {!loading && filteredUsers.length === 0 && (
              <tr><td className="px-3 py-3 text-neutral-400" colSpan={userColCount}>{t('app_identity_list.no_members', 'No members')}</td></tr>
            )}
            {!loading && pagedUsers.map((u) => {
              const current = u.roles?.[0]?.code || '';
              const active = selectedId === u.platformUserId;
              return (
                <tr
                  key={u.platformUserId || u.id}
                  onClick={() => handleSelect(u.platformUserId)}
                  className={cn(
                    'border-t border-neutral-100 dark:border-neutral-800',
                    effectiveEmitKey && 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
                    active && 'bg-primary/5',
                  )}
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                        {initials(u.name || u.email || '?')}
                      </span>
                      <span className="font-medium truncate">{u.name || u.email || u.platformUserId}</span>
                    </span>
                  </td>
                  {showEmail && <td className="px-3 py-2 text-neutral-500 font-mono text-xs truncate">{u.email || '—'}</td>}
                  {showPhone && <td className="px-3 py-2 text-neutral-500 font-mono text-xs truncate">{u.phoneNumber || '—'}</td>}
                  {(showRoles || roleAssignable) && (
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {roleAssignable ? (
                        <select
                          value={current}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="w-full text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent"
                        >
                          <option value="">{t('app_identity_list.role_none', 'Unassigned')}</option>
                          {roleOptions.map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-neutral-500">{(u.roles || []).map((r) => r.name).join(', ') || '—'}</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {effectivePageSize > 0 && (
          <IdentityListPagination
            total={filteredUsers.length}
            page={currentPage}
            pageSize={effectivePageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
}

export default AppIdentityListRenderer;
