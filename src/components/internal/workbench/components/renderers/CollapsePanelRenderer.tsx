import React, { useMemo, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import { ChevronDown } from 'lucide-react';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import {
  extractParameterNamesFromDatasourceParameters,
  extractStrictWaitParameterKeysFromDatasourceParameters,
  processDataSourceParametersForQuery,
} from '@/utils/databaseDatasourceParams';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useTranslation } from 'react-i18next';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';

interface CollapseItem {
  title: unknown; // string | { zh, en }
  content?: unknown; // string | { zh, en }
  contentDataSource?: { field: string }; 
}

export interface CollapsePanelRendererProps {
  title?: unknown;
  items?: CollapseItem[];
  defaultExpanded?: boolean;
  id?: string;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[] | Record<string, unknown>;
  /** Panel header title font size (px). Default 14. */
  titleFontSize?: number;
  /** Item label + content/description font size (px). Default 13. */
  labelFontSize?: number;
}

function resolveBi(v: unknown, lang: string): string {
  return resolveBilingualText(v, lang);
}

const CollapsePanelRenderer: React.FC<CollapsePanelRendererProps> = ({
  title,
  items = [],
  defaultExpanded = false,
  id,
  databaseDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  useMockData = false,
  mockData,
  titleFontSize,
  labelFontSize,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const lang = language === 'zh' ? 'zh' : 'en';
  const titleFs = titleFontSize ?? 14;
  const labelFs = labelFontSize ?? 13;
  const [open, setOpen] = useState(defaultExpanded);

  const { rawParams } = useParameterHandler({ componentParameterConfig, pageParams, componentId: id });
  const boundParams = useMemo(
    () => extractParameterNamesFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );
  const additionalParams = useMemo(
    () =>
      processDataSourceParametersForQuery(
        databaseDataSourceConfig?.parameters,
        databaseDataSourceConfig?.parameterTypes,
        // useParameterHandler exposes only rawParams (no getCurrentParameter); resolve bound
        // `{type:'parameter', source}` values from it (the same store the resolver falls back to).
        (name: string) => rawParams[name],
        rawParams
      ),
    [databaseDataSourceConfig?.parameters, databaseDataSourceConfig?.parameterTypes, rawParams]
  );

  // waitForValue: bindings marked waitForValue:true must have resolved into the request body
  // (built from rawParams above) before the first fetch. autoFetch is reactive to this flag,
  // so the fetch fires once the values land via a context re-render.
  const strictWaitKeys = useMemo(
    () => extractStrictWaitParameterKeysFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );
  const strictParamsSatisfied = useMemo(
    () => strictWaitKeys.every(k => additionalParams[k] !== undefined && additionalParams[k] !== null),
    [strictWaitKeys, additionalParams]
  );

  const needsData = !useMockData && !!databaseDataSourceConfig?.datasourceId && items.some(it => it.contentDataSource);
  const { data: dbRows } = useDatabaseDataSource(
    needsData ? databaseDataSourceConfig ?? null : null,
    'HeroCard',
    additionalParams,
    { autoFetch: strictParamsSatisfied }
  );
  void boundParams;

  const row = useMemo<Record<string, unknown> | null>(() => {
    if (useMockData) return Array.isArray(mockData) ? (mockData[0] ?? null) : (mockData ?? null);
    return (dbRows?.[0] as Record<string, unknown>) ?? null;
  }, [useMockData, mockData, dbRows]);

  const itemContent = (it: CollapseItem): string => {
    if (it.contentDataSource?.field) return resolveBi(row?.[it.contentDataSource.field], lang);
    return resolveBi(it.content, lang);
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="font-medium text-foreground" style={{ fontSize: titleFs }}>{resolveBi(title, lang) || t('collapse_panel.default_title', 'Metric definitions')}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {items.map((it, i) => {
            const content = itemContent(it);
            return (
              <div key={i} className="space-y-0.5">
                <p className="font-semibold text-foreground" style={{ fontSize: labelFs }}>{resolveBi(it.title, lang)}</p>
                {content && <p className="leading-relaxed text-muted-foreground" style={{ fontSize: labelFs }}>{content}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollapsePanelRenderer;
