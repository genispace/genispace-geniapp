import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@genispace/shared-ui';
import {
  getWorkbench,
  workbenchApi,
  type WorkbenchConfigView,
  type WorkbenchResponse,
} from '@/app/services/workbenchApi';
import { tabIsolation } from '@/utils/tabIsolation';

export interface ResolvedConfigView {
  view: WorkbenchConfigView;
  previewToken?: string;
}

export function resolveDraftLoadFallback(
  viewOptions: ResolvedConfigView,
  error: unknown
): { fallbackToPublished: boolean; exitPreview: boolean } {
  const code = (error as { code?: string } | null)?.code;
  const status = (error as { status?: number } | null)?.status;
  const fallbackToPublished =
    viewOptions.view === 'draft' && (code === 'PREVIEW_TOKEN_INVALID' || status === 403);

  return {
    fallbackToPublished,
    exitPreview: fallbackToPublished && Boolean(viewOptions.previewToken),
  };
}

/**
 * Shared draft-preview state for the publish flow, consumed by both the desktop
 * (WorkbenchLayout) and mobile (WorkbenchMobileLayout) shells: resolves which
 * config view to load (preview link / edit mode / published), tracks whether a
 * preview is on screen, and handles exiting preview — manually or when the
 * backend rejects an expired preview token (403 PREVIEW_TOKEN_INVALID).
 */
export function useWorkbenchPreview() {
  const { t } = useTranslation('workbench');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  // Owned here so exitPreview can force the next load to refetch; layouts use
  // this ref as their "already loaded" marker.
  const lastLoadedWorkbenchIdRef = useRef<string | null>(null);

  /**
   * Publish flow view resolution: preview link (?preview=token, persisted per
   * tab) and edit mode read the DRAFT; everyone else gets the PUBLISHED snapshot.
   */
  const resolveConfigView = useCallback((id: string): ResolvedConfigView => {
    try {
      const urlToken = new URLSearchParams(window.location.search).get('preview');
      if (urlToken) {
        tabIsolation.setItem(`workbench-preview-token-${id}`, urlToken);
      }
      const previewToken = tabIsolation.getItem(`workbench-preview-token-${id}`) || undefined;
      if (previewToken) {
        return { view: 'draft', previewToken };
      }
      if (tabIsolation.getItem(`workbench-edit-mode-${id}`) === 'true') {
        return { view: 'draft' };
      }
    } catch {
      /* storage unavailable → published */
    }
    return { view: 'published' };
  }, []);

  const exitPreview = useCallback((id: string) => {
    tabIsolation.removeItem(`workbench-preview-token-${id}`);
    setIsPreviewActive(false);
    workbenchApi.clearWorkbenchCache(id);
    lastLoadedWorkbenchIdRef.current = null;
    // Strip the preview param so a refresh doesn't re-enter preview.
    const url = new URL(window.location.href);
    if (url.searchParams.has('preview')) {
      url.searchParams.delete('preview');
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  /**
   * Fetch the workbench with the resolved view. An invalid/expired preview
   * token (403 PREVIEW_TOKEN_INVALID) exits preview, toasts, and silently
   * falls back to the published view; any other error is rethrown for the
   * caller to handle.
   */
  const loadWorkbenchWithPreview = useCallback(
    async (id: string): Promise<WorkbenchResponse> => {
      const viewOptions = resolveConfigView(id);
      let response: WorkbenchResponse;
      try {
        response = await getWorkbench(id, viewOptions);
      } catch (error) {
        // Invalid/expired preview token or stale edit flag without permission:
        // drop the draft request and fall back to the published view.
        const fallback = resolveDraftLoadFallback(viewOptions, error);
        if (fallback.fallbackToPublished) {
          if (fallback.exitPreview) {
            exitPreview(id);
            toast({
              variant: 'destructive',
              title: t('preview_link_invalid', 'Preview link is invalid or expired'),
            });
          }
          response = await getWorkbench(id, { view: 'published' });
        } else {
          throw error;
        }
      }
      setIsPreviewActive(
        Boolean(viewOptions.previewToken) && response.data?.configView === 'draft'
      );
      return response;
    },
    [resolveConfigView, exitPreview, t]
  );

  return {
    resolveConfigView,
    exitPreview,
    isPreviewActive,
    lastLoadedWorkbenchIdRef,
    loadWorkbenchWithPreview,
  };
}
