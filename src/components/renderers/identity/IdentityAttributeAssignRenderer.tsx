import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@genispace/shared-utils';
import { Button, Input, toast } from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { transactionDatabaseData, withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';

/**
 * Generic "assign many options to a bus-selected identity" editor.
 *
 * Not welded to any domain: an admin picks a set of options (stores / regions / categories …)
 * for whichever identity was emitted onto the page bus (by AppIdentityList), then overwrites the
 * identity↔option rows via a TRANSACTION datasource. Everything is datasource-bound, so a different
 * space reuses this component verbatim and only swaps the three datasource ids.
 *
 * Data flow (all params travel at the request BODY top level — the /data endpoint reads {{param}}
 * substitutions from top-level keys, never a nested object):
 *   options  = READ  optionsDatasourceId (no params) — the universe of assignable options
 *   current  = READ  currentDatasourceId { [identityValueParamKey]: <identity> } — what it has now
 *   save     = TRANSACTION saveDatasourceId { [identityValueParamKey], [valuesParamKey](array), [operatorParamKey] }
 */
export interface IdentityAttributeAssignRendererProps {
  id?: string;
  /** Section title (plain string or bilingual { zh, en }). */
  title?: unknown;
  /** Bus param carrying the selected identity id (emitted by AppIdentityList). */
  identityParamKey?: string;
  optionsDatasourceId?: string;
  currentDatasourceId?: string;
  saveDatasourceId?: string;
  /** Row field names in the options datasource. */
  optionValueField?: string;
  optionLabelFieldZh?: string;
  optionLabelFieldEn?: string;
  /** Optional field rendered as a small group chip on each option (e.g. channel). */
  optionGroupField?: string;
  /** Row field holding the option id in the current-authorization datasource. */
  currentValueField?: string;
  /** SQL param name carrying the identity id in the current-read and save bodies. */
  identityValueParamKey?: string;
  /** SQL param name carrying the selected-option id array in the save body. */
  valuesParamKey?: string;
  /** SQL param name carrying the operator id in the save body. */
  operatorParamKey?: string;
  /** Options box fixed height (px number or CSS e.g. calc(100vh - 200px); scrolls beyond). Unset → max-h-80. */
  listHeight?: number | string;
}

interface Option {
  value: string;
  label: string;
  group?: string;
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

async function readRows(datasourceId: string, params: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  // Flat body — the /data endpoint substitutes {{param}} from top-level keys.
  // Workbench-level version pins (config.datasourceVersions) apply to reads too.
  const res = await apiClient.post(withDatasourceVersion(`/datasources/${datasourceId}/data`, resolveRuntimeDatasourceVersion(datasourceId)), { page: 1, limit: 2000, ...params });
  return extractRows(res);
}

export function IdentityAttributeAssignRenderer({
  id = 'identity-attribute-assign',
  title,
  identityParamKey = 'selectedUserId',
  optionsDatasourceId,
  currentDatasourceId,
  saveDatasourceId,
  optionValueField = 'store_id',
  optionLabelFieldZh = 'label_zh',
  optionLabelFieldEn = 'label_en',
  optionGroupField = 'channel_code',
  currentValueField = 'store_id',
  identityValueParamKey = 'userId',
  valuesParamKey = 'storeIds',
  operatorParamKey = 'operatorId',
  listHeight,
}: IdentityAttributeAssignRendererProps) {
  const { t } = useTranslation('renderers');
  const { resolveBilingualText: bi, language } = useWorkbenchConfigLocale();
  const { currentUser } = useCurrentUser();

  const [identity, setIdentity] = useState<string>('');
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Listen for the identity emitted by AppIdentityList.
  const { getCurrentParameter } = useComponentCommunication({
    componentId: id,
    listenParameters: [identityParamKey],
    onParameterChange: (key, value) => {
      if (key === identityParamKey) setIdentity(value == null ? '' : String(value));
    },
  });

  // Hydrate from any identity already on the bus at mount.
  useEffect(() => {
    const initial = getCurrentParameter(identityParamKey);
    if (initial != null && initial !== '') setIdentity(String(initial));
  }, [getCurrentParameter, identityParamKey]);

  // Load the option universe once.
  useEffect(() => {
    if (!optionsDatasourceId) return;
    let active = true;
    setLoadingOptions(true);
    readRows(optionsDatasourceId, {})
      .then((rows) => {
        if (!active) return;
        const zhLang = (language || 'zh').startsWith('zh');
        setOptions(
          rows
            .map((r) => {
              const value = String(r[optionValueField] ?? '');
              const zh = r[optionLabelFieldZh];
              const en = r[optionLabelFieldEn];
              const label = String((zhLang ? zh ?? en : en ?? zh) ?? value);
              const group = r[optionGroupField] != null ? String(r[optionGroupField]) : undefined;
              return { value, label, group };
            })
            .filter((o) => o.value !== ''),
        );
      })
      .catch(() => active && setOptions([]))
      .finally(() => active && setLoadingOptions(false));
    return () => {
      active = false;
    };
  }, [optionsDatasourceId, optionValueField, optionLabelFieldZh, optionLabelFieldEn, optionGroupField, language]);

  // Load the selected identity's current options whenever the identity changes.
  useEffect(() => {
    if (!currentDatasourceId || !identity) {
      setSelected(new Set());
      return;
    }
    let active = true;
    setLoadingCurrent(true);
    readRows(currentDatasourceId, { [identityValueParamKey]: identity })
      .then((rows) => {
        if (!active) return;
        setSelected(new Set(rows.map((r) => String(r[currentValueField] ?? '')).filter(Boolean)));
      })
      .catch(() => active && setSelected(new Set()))
      .finally(() => active && setLoadingCurrent(false));
    return () => {
      active = false;
    };
  }, [currentDatasourceId, identity, identityValueParamKey, currentValueField]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    // Match by name or by option id (store id). The id match is space-insensitive so that e.g.
    // "PCEHK" still finds "PCE HK" — fuzzy id search over ids that may contain spaces.
    const qNoSpace = q.replace(/\s+/g, '');
    return options.filter((o) => {
      const label = o.label.toLowerCase();
      const val = o.value.toLowerCase();
      return label.includes(q) || val.includes(q) || val.replace(/\s+/g, '').includes(qNoSpace);
    });
  }, [options, search]);

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((o) => next.add(o.value));
      return next;
    });
  }, [filtered]);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const handleSave = useCallback(async () => {
    if (!saveDatasourceId || !identity) return;
    setSaving(true);
    try {
      const res = await transactionDatabaseData(saveDatasourceId, {
        [identityValueParamKey]: identity,
        // Multi-value array param: the API expands {{param}} in IN (...) guards server-side.
        [valuesParamKey]: [...selected],
        [operatorParamKey]: currentUser?.id ?? '',
      });
      if (res?.success !== false) {
        toast({ title: t('identity_attribute_assign.saved', 'Saved') });
      } else {
        toast({ variant: 'destructive', title: t('identity_attribute_assign.save_failed', 'Save failed') });
      }
    } catch {
      toast({ variant: 'destructive', title: t('identity_attribute_assign.save_failed', 'Save failed') });
    } finally {
      setSaving(false);
    }
  }, [saveDatasourceId, identity, identityValueParamKey, valuesParamKey, operatorParamKey, selected, currentUser?.id, t]);

  const heading = bi(title) || t('identity_attribute_assign.title', 'Assignment');

  // Pure-digit strings are treated as px; anything else (e.g. calc(...)) passes through as CSS.
  const listHeightCss =
    typeof listHeight === 'string' && /^\d+(\.\d+)?$/.test(listHeight.trim()) ? Number(listHeight) : listHeight;

  if (!identity) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        {t('identity_attribute_assign.pick_identity', 'Select a user above to assign.')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Single toolbar row: title + search + actions + count. Keeps the search box on the
          same baseline as the sibling AppIdentityList search box in a left/right grid. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium shrink-0">{heading}</span>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('identity_attribute_assign.search_placeholder', 'Search')}
          className="h-8 text-sm max-w-xs flex-1 min-w-[140px]"
        />
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllVisible} disabled={loadingCurrent}>
          {t('identity_attribute_assign.select_all', 'Select all')}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearAll} disabled={loadingCurrent}>
          {t('identity_attribute_assign.clear', 'Clear')}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || loadingCurrent || !saveDatasourceId}>
          {saving ? t('identity_attribute_assign.saving', 'Saving…') : t('identity_attribute_assign.save', 'Save')}
        </Button>
        <span className="text-xs text-neutral-500 tabular-nums ml-auto">
          {t('identity_attribute_assign.selected_count', 'Selected: {{count}}', { count: selected.size })}
          {loadingCurrent && ` · ${t('identity_attribute_assign.loading', 'Loading…')}`}
        </span>
      </div>
      <div
        className={cn(
          'rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-y-auto p-1 grid gap-1 content-start',
          !listHeight && 'max-h-80',
        )}
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          ...(listHeight ? { height: listHeightCss } : {}),
        }}
      >
        {loadingOptions && (
          <div className="p-3 text-xs text-neutral-400">{t('identity_attribute_assign.loading', 'Loading…')}</div>
        )}
        {!loadingOptions && filtered.length === 0 && (
          <div className="p-3 text-xs text-neutral-400">{t('identity_attribute_assign.no_options', 'No options')}</div>
        )}
        {filtered.map((o) => {
          const checked = selected.has(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm border border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
                checked && 'bg-primary/5 border-primary/30',
              )}
            >
              <input type="checkbox" checked={checked} disabled={loadingCurrent} onChange={() => toggle(o.value)} />
              <span className="flex-1 min-w-0 break-words">{o.label}</span>
              <span className="text-[11px] text-neutral-400 font-mono shrink-0">{o.value}</span>
              {o.group && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">
                  {o.group}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default IdentityAttributeAssignRenderer;
