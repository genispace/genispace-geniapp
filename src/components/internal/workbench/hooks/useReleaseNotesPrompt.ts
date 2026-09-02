import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api/apiClient';

/**
 * Release-notes prompt state ("new version published" dialog), shared by the
 * desktop (WorkbenchLayout) and mobile (WorkbenchMobileLayout) shells.
 *
 * Shows once per user per published version: the dismissal marker lives
 * server-side in `User.launcherState.releaseNoteDismissals` (a
 * `{ [workbenchId]: publishedVersion }` map) via `GET/PUT /users/me/settings`
 * — localStorage is deliberately NOT the source of truth because the WeCom
 * webview wipes it on re-entry. A bare localStorage key is only an
 * anti-flicker cache consulted before the settings GET resolves.
 *
 * Writes are deliberately narrow: `dismiss()` re-fetches settings, then PUTs
 * ONLY the merged `releaseNoteDismissals` map — echoing back mount-time
 * snapshots of sibling fields would clobber concurrent writes (e.g. hub's
 * persistLauncherState); the server preserves fields we don't send and
 * deep-merges this map per key.
 *
 * An unread version is still NOT enough to pop: the prompt only shows when
 * `GET /workbenches/:id/publish-history?limit=1` returns a real note.
 * Versions with empty history (publishes predating the history feature,
 * template/copy-created workbenches) are marked read silently; a failed
 * history fetch stays quiet without persisting, so the next visit retries.
 */

export interface UseReleaseNotesPromptOptions {
  workbenchId?: string;
  /** `currentWorkbench.publishedVersion` — absent until the workbench loads. */
  publishedVersion?: string | null;
  isEditMode: boolean;
  isPreviewActive: boolean;
  /** `UserContext.user.id` — absent until the user profile resolves. */
  userId?: string | null;
}

export interface UseReleaseNotesPromptResult {
  shouldShow: boolean;
  /** Close the dialog and persist the dismissal (best-effort, never blocks). */
  dismiss: () => void;
}

interface LauncherState {
  lastSurface?: string;
  lastAppId?: string;
  lastSpaceId?: string;
  releaseNoteDismissals?: Record<string, string>;
  [key: string]: unknown;
}

interface UserSettingsResponse {
  preferences?: {
    launcherState?: LauncherState;
  };
}

const seenCacheKey = (userId: string, workbenchId: string) =>
  `workbench_release_seen_${userId}_${workbenchId}`;

export function useReleaseNotesPrompt({
  workbenchId,
  publishedVersion,
  isEditMode,
  isPreviewActive,
  userId,
}: UseReleaseNotesPromptOptions): UseReleaseNotesPromptResult {
  const [shouldShow, setShouldShow] = useState(false);
  // Latest launcherState from the settings GET, kept for read-modify-write on
  // dismiss so sibling fields (lastSurface/lastAppId/lastSpaceId) survive.
  const launcherStateRef = useRef<LauncherState | null>(null);
  const fetchedKeyRef = useRef<string | null>(null);
  // publish-history is checked at most once per (user, workbench, version) per
  // mount — a newer publishedVersion re-arms the check.
  const historyCheckedKeyRef = useRef<string | null>(null);

  const eligible =
    Boolean(workbenchId && publishedVersion && userId) && !isEditMode && !isPreviewActive;

  // Persist the dismissal for the current version (localStorage anti-flicker
  // cache + narrow server PUT). Shared by dismiss() and the silent auto-read
  // path for versions that have NO release note to show.
  const persistDismissal = useCallback(() => {
    if (!workbenchId || !publishedVersion || !userId) return;

    try {
      localStorage.setItem(seenCacheKey(userId, workbenchId), publishedVersion);
    } catch {
      /* storage unavailable */
    }

    void (async () => {
      // Re-fetch right before writing: the mount-time map may be stale (hub's
      // persistLauncherState and other sessions write concurrently). This
      // shrinks the race window from "mount → close" to milliseconds. If the
      // refresh fails, fall back to the mount-time map and still persist.
      let baseMap: Record<string, string> =
        launcherStateRef.current?.releaseNoteDismissals ?? {};
      try {
        const res = await apiClient.get<UserSettingsResponse>('/users/me/settings');
        const latest = res.data?.preferences?.launcherState;
        if (latest) {
          launcherStateRef.current = latest;
          baseMap = latest.releaseNoteDismissals ?? {};
        }
      } catch (error) {
        console.warn(
          '[useReleaseNotesPrompt] Failed to refresh settings before dismissal, using mount-time map:',
          error
        );
      }

      // Merge (not replace) the map: dismissals for OTHER workbenches must
      // survive — the backend deep-merges this sub-field per key.
      const mergedMap = { ...baseMap, [workbenchId]: publishedVersion };
      launcherStateRef.current = {
        ...(launcherStateRef.current ?? {}),
        releaseNoteDismissals: mergedMap,
      };

      // Send ONLY releaseNoteDismissals: spreading the mount-time snapshot of
      // lastSurface/lastAppId/lastSpaceId would clobber newer values written
      // by hub's persistLauncherState between our GET and PUT. Untouched
      // sub-fields are preserved server-side. Never send `spaceId` — it would
      // trigger the team-switch branch.
      try {
        await apiClient.put('/users/me/settings', {
          preferences: { launcherState: { releaseNoteDismissals: mergedMap } },
        });
      } catch (error) {
        console.warn('[useReleaseNotesPrompt] Failed to persist release-note dismissal:', error);
      }
    })();
  }, [workbenchId, publishedVersion, userId]);

  useEffect(() => {
    if (!eligible || !workbenchId || !publishedVersion || !userId) {
      setShouldShow(false);
      return;
    }

    // Anti-flicker cache: a hit settles "don't show" immediately (WeCom may
    // have wiped it — a miss just falls through to the server check).
    let cacheHit = false;
    try {
      cacheHit = localStorage.getItem(seenCacheKey(userId, workbenchId)) === publishedVersion;
    } catch {
      /* storage unavailable */
    }
    if (cacheHit) {
      setShouldShow(false);
    }

    let active = true;

    const decide = (map: Record<string, string> | undefined) => {
      if (cacheHit) return; // local marker already settled this version
      if (map?.[workbenchId] === publishedVersion) {
        setShouldShow(false);
        return;
      }
      // The version is unread — but only pop when there is a REAL release note
      // to show. Workbenches whose latest publish predates the publish-history
      // feature (and copies/templates inheriting publishedVersion) have empty
      // history: popping would render the "failed to load" fallback, so mark
      // the version read silently instead. A failed history fetch stays quiet
      // WITHOUT persisting — next visit retries.
      const checkKey = `${userId}:${workbenchId}:${publishedVersion}`;
      if (historyCheckedKeyRef.current === checkKey) return;
      historyCheckedKeyRef.current = checkKey;
      void (async () => {
        try {
          const res = await apiClient.get<{ items?: unknown[] }>(
            `/workbenches/${workbenchId}/publish-history`,
            { limit: 1 }
          );
          if (!active) return;
          const hasNote = Array.isArray(res.data?.items) && res.data.items.length > 0;
          if (hasNote) {
            setShouldShow(true);
          } else {
            persistDismissal();
          }
        } catch (error) {
          console.warn('[useReleaseNotesPrompt] Failed to check the latest release note:', error);
        }
      })();
    };

    const fetchKey = `${userId}:${workbenchId}`;
    if (fetchedKeyRef.current === fetchKey) {
      decide(launcherStateRef.current?.releaseNoteDismissals);
      return;
    }

    // Never pop while the settings GET is in flight — wait for the server.
    if (!cacheHit) {
      setShouldShow(false);
    }

    void (async () => {
      try {
        const res = await apiClient.get<UserSettingsResponse>('/users/me/settings');
        if (!active) return;
        const launcherState = res.data?.preferences?.launcherState ?? {};
        launcherStateRef.current = launcherState;
        fetchedKeyRef.current = fetchKey;
        decide(launcherState.releaseNoteDismissals);
      } catch (error) {
        // Can't read or persist the dismissal — stay quiet rather than pop
        // a dialog every visit.
        console.warn('[useReleaseNotesPrompt] Failed to load user settings:', error);
      }
    })();

    return () => {
      active = false;
    };
  }, [eligible, workbenchId, publishedVersion, userId, persistDismissal]);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    persistDismissal();
  }, [persistDismissal]);

  return { shouldShow, dismiss };
}
