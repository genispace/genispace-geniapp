import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Loader2 } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import { toast } from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { createWorkbenchPreviewToken } from '@/app/services/workbenchApi';
import { useEditMode } from '@/runtime/runtime-mode';
import { tabIsolation } from '@/utils/tabIsolation';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { applyCustomStyles } from '@/utils/styleUtils';
import type { CustomStylesConfig } from '@/types/components';
import {
  buildWorkbenchPreviewUrl,
  entryModeNoteKey,
  extractPreviewToken,
  resolveEntryMode,
  resolvePublishPreviewEntryStatus,
  type WorkbenchPublishStatus,
} from './publishPreviewEntryHelpers';

export interface PublishPreviewEntryRendererProps {
  id?: string;
  customStyles?: CustomStylesConfig;
}

/**
 * PublishPreviewEntry — self-sourced, read-only info card. It fetches the
 * CURRENT workbench (same route-param sourcing as PublishHistoryRenderer) to
 * read `hasUnpublishedChanges` + `permissions`, and offers a "Enter preview"
 * button that navigates the whole current page into preview mode. All copy is
 * fixed via i18n (no configurable text props).
 */
const PublishPreviewEntryRenderer: React.FC<PublishPreviewEntryRendererProps> = ({
  id = 'publish-preview-entry',
  customStyles,
}) => {
  const { t } = useTranslation('renderers');
  const { workbenchId } = useParams();
  const fillCell = useGrid24FillCell();

  const [workbench, setWorkbench] = useState<WorkbenchPublishStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!workbenchId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      // Default published view already returns hasUnpublishedChanges + permissions.
      const res = await apiClient.get<WorkbenchPublishStatus>(
        `/workbenches/${workbenchId}`,
        undefined,
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;
      setWorkbench(res.data ?? null);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        (err as { message?: string })?.message ||
          t('publish_preview_entry.load_failed', 'Failed to load publish status')
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [workbenchId, t]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const status = resolvePublishPreviewEntryStatus({ loading, error, workbench });

  // Mode override (hides the button above all three states): edit mode comes
  // from the EditModeProvider context (safe default outside a provider, e.g.
  // the mobile tree); preview mode from the tab-isolated preview token, same
  // source as useWorkbenchPreview.resolveConfigView. Recomputed per render —
  // entering preview is a full navigation, so the token is fresh on mount.
  const { isEditMode } = useEditMode();
  const isPreviewMode = workbenchId
    ? Boolean(tabIsolation.getItem(`workbench-preview-token-${workbenchId}`))
    : false;
  const modeNoteKey = entryModeNoteKey(resolveEntryMode({ isPreviewMode, isEditMode }));

  const handleEnterPreview = async () => {
    if (!workbenchId || entering) return;
    setEntering(true);
    try {
      const token = extractPreviewToken(await createWorkbenchPreviewToken(workbenchId));
      if (!token) throw new Error('missing preview token');
      window.location.href = buildWorkbenchPreviewUrl(window.location.origin, workbenchId, token);
    } catch {
      toast({
        variant: 'destructive',
        title: t('publish_preview_entry.preview_create_failed', 'Failed to create preview'),
      });
      setEntering(false);
    }
  };

  const descriptionKey =
    status === 'no-changes'
      ? 'desc_none'
      : status === 'no-permission'
        ? 'desc_no_permission'
        : 'desc_has_changes';

  const skeleton = (
    <div className="space-y-3" aria-hidden>
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
    </div>
  );

  const errorBlock = (
    <div className="flex flex-col items-start gap-2 py-2">
      <span className="text-sm text-slate-400 dark:text-neutral-500">{error}</span>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        onClick={() => void load()}
      >
        {t('publish_preview_entry.retry', 'Retry')}
      </button>
    </div>
  );

  const hasChanges = status === 'can-preview' || status === 'no-permission';

  const infoBody = (
    <>
      <p className="text-sm text-slate-500 dark:text-neutral-400">
        {t(`publish_preview_entry.${descriptionKey}`)}
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className={cn(
            'h-2 w-2 flex-shrink-0 rounded-full',
            hasChanges ? 'bg-amber-500' : 'bg-emerald-500'
          )}
        />
        <span className="text-slate-600 dark:text-neutral-300">
          {hasChanges
            ? t('publish_preview_entry.status_has_changes', 'Unpublished changes')
            : t('publish_preview_entry.status_none', 'No unpublished changes')}
        </span>
      </div>
      {modeNoteKey ? (
        <p className="mt-3 text-xs text-slate-400 dark:text-neutral-500">
          {t(`publish_preview_entry.${modeNoteKey}`)}
        </p>
      ) : (
        status === 'can-preview' && (
          <button
            type="button"
            disabled={entering}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            onClick={() => void handleEnterPreview()}
          >
            {entering && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {entering
              ? t('publish_preview_entry.button_entering', 'Entering preview...')
              : t('publish_preview_entry.button_enter', 'Enter Preview')}
          </button>
        )
      )}
    </>
  );

  let body: React.ReactNode;
  if (status === 'loading') {
    body = skeleton;
  } else if (status === 'error') {
    body = errorBlock;
  } else {
    body = infoBody;
  }

  const styleProps = applyCustomStyles(
    id,
    customStyles,
    cn(
      'publish-preview-entry-renderer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
      fillCell && 'flex h-full min-h-0 flex-col'
    )
  );

  return (
    <div className={styleProps.className} style={styleProps.style}>
      <div
        className={cn('mb-3 flex items-center gap-2 text-slate-700 dark:text-neutral-300', fillCell && 'shrink-0')}
        style={{ fontWeight: 500 }}
      >
        <Eye className="h-4 w-4 text-slate-400 dark:text-neutral-500" />
        {t('publish_preview_entry.title', 'Preview Unpublished Changes')}
      </div>
      <div className={cn(fillCell && 'min-h-0 flex-1 overflow-y-auto')}>{body}</div>
    </div>
  );
};

export default PublishPreviewEntryRenderer;
