import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import apiClient from '@/lib/api/apiClient';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { applyCustomStyles } from '@/utils/styleUtils';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/formatting';
import type { CustomStylesConfig } from '@/types/components';
import {
  createInitialPublishHistoryState,
  formatVersionBadge,
  publishHistoryReducer,
  type PublishHistoryItem,
} from './publishHistoryHelpers';

type Bi = string | { zh?: string; en?: string };

export interface PublishHistoryRendererProps {
  id?: string;
  /** Card title; defaults to the localized "Publish History". */
  title?: Bi;
  /** Page size for the timeline (1–50), default 10. */
  maxItems?: number;
  showVersion?: boolean;
  showPublisher?: boolean;
  /** 'relative' shows "x ago" with the absolute time as tooltip; 'absolute' shows the locale datetime. */
  timeStyle?: 'relative' | 'absolute';
  customStyles?: CustomStylesConfig;
}

const PublishHistoryRenderer: React.FC<PublishHistoryRendererProps> = ({
  id = 'publish-history',
  title,
  maxItems = 10,
  showVersion = true,
  showPublisher = true,
  timeStyle = 'relative',
  customStyles,
}) => {
  const { t } = useTranslation('renderers');
  const { resolveBilingualText: bi } = useWorkbenchConfigLocale();
  // Always the CURRENT workbench — same route-param sourcing as FilterPanelRenderer.
  const { workbenchId } = useParams();
  const fillCell = useGrid24FillCell();

  const [state, dispatch] = useReducer(publishHistoryReducer, undefined, createInitialPublishHistoryState);
  const abortRef = useRef<AbortController | null>(null);

  const pageSize = Math.max(1, Math.min(50, Math.floor(Number(maxItems)) || 10));

  const load = useCallback(
    async (offset: number) => {
      if (!workbenchId) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: 'load-start', append: offset > 0 });
      try {
        const res = await apiClient.get<{ items: PublishHistoryItem[]; total: number }>(
          `/workbenches/${workbenchId}/publish-history`,
          { limit: pageSize, offset },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const total = Number(res.data?.total) || 0;
        dispatch({ type: 'load-success', items, total, offset });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          (err as { message?: string })?.message ||
          t('publish_history.load_failed', 'Failed to load publish history');
        dispatch({ type: 'load-error', message });
      }
    },
    [workbenchId, pageSize, t]
  );

  useEffect(() => {
    dispatch({ type: 'reset' });
    void load(0);
    return () => abortRef.current?.abort();
  }, [load]);

  const timeNode = (iso: string) => {
    const absolute = formatDateTime(iso);
    const text = timeStyle === 'absolute' ? absolute : formatRelativeTime(iso);
    return (
      <span
        className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-neutral-500"
        title={timeStyle === 'relative' ? absolute : undefined}
      >
        {text}
      </span>
    );
  };

  const skeleton = (
    <div className="space-y-5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-neutral-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
          </div>
        </div>
      ))}
    </div>
  );

  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-8 text-slate-400 dark:text-neutral-500">
      <History className="h-6 w-6" />
      <span className="text-sm">{t('publish_history.empty', 'No publish records yet')}</span>
    </div>
  );

  const errorBlock = (
    <div className="flex flex-col items-center gap-2 py-4">
      <span className="text-sm text-slate-400 dark:text-neutral-500">{state.error}</span>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        onClick={() => void load(state.items.length)}
      >
        {t('publish_history.retry', 'Retry')}
      </button>
    </div>
  );

  const timeline = (
    <ol className="publish-history-timeline">
      {state.items.map((item, idx) => {
        const isLive = idx === 0; // items are newest-first; first entry = current online version
        const isLast = idx === state.items.length - 1;
        return (
          <li key={`${item.version}-${idx}`} className={cn('relative flex gap-3', !isLast && 'pb-5')}>
            {/* dot column: solid primary dot for the live entry, hollow muted for older; hairline connector */}
            <div className="relative flex w-3 flex-shrink-0 justify-center">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 top-4 w-px -translate-x-1/2 bg-slate-200 dark:bg-neutral-800"
                />
              )}
              <span
                className={cn(
                  'mt-1 h-2.5 w-2.5 rounded-full',
                  isLive
                    ? 'bg-emerald-500'
                    : 'border-2 border-slate-300 bg-white dark:border-neutral-600 dark:bg-neutral-900'
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {showVersion && (
                  <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] leading-none text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {formatVersionBadge(item.version)}
                  </span>
                )}
                {isLive && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] leading-none text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {t('publish_history.live', 'Live')}
                  </span>
                )}
                {timeNode(item.createdAt)}
              </div>
              {item.description !== '' && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-neutral-200">
                  {item.description}
                </p>
              )}
              {showPublisher && item.publishedByName !== '' && (
                <div className="mt-1 text-xs text-slate-400 dark:text-neutral-500">{item.publishedByName}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );

  const hasMore = state.items.length < state.total;

  let body: React.ReactNode;
  if (state.loading && state.items.length === 0) {
    body = skeleton;
  } else if (state.error && state.items.length === 0) {
    body = errorBlock;
  } else if (state.items.length === 0) {
    body = emptyState;
  } else {
    body = (
      <>
        {timeline}
        {state.error && errorBlock}
        {!state.error && hasMore && (
          <button
            type="button"
            disabled={state.loadingMore}
            className="mt-3 w-full rounded-md border border-slate-200 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            onClick={() => void load(state.items.length)}
          >
            {state.loadingMore
              ? t('publish_history.loading', 'Loading...')
              : t('publish_history.load_more', 'Load more')}
          </button>
        )}
      </>
    );
  }

  const styleProps = applyCustomStyles(
    id,
    customStyles,
    cn(
      'publish-history-renderer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
      // 'fill' capability: stretch to the grid band with internal scroll; natural height otherwise
      fillCell && 'flex h-full min-h-0 flex-col'
    )
  );

  return (
    <div className={styleProps.className} style={styleProps.style}>
      <div className={cn('mb-3 text-slate-700 dark:text-neutral-300', fillCell && 'shrink-0')} style={{ fontWeight: 500 }}>
        {bi(title) || t('publish_history.title', 'Publish History')}
      </div>
      <div className={cn(fillCell && 'min-h-0 flex-1 overflow-y-auto')}>{body}</div>
    </div>
  );
};

export default PublishHistoryRenderer;
