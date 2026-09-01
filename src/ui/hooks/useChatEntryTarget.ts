import { useCallback, useEffect, useState } from 'react';
import type { UserSettingsApiClient } from './useUserSettings';

/**
 * Resolves where the shared header's "Chat" entry should point — and whether it
 * should appear at all — based on what the current user can actually open in the
 * active space. Mirrors the `showConsoleEntry` pattern: each app computes the
 * decision from data it already has access to and passes the result to AppHeader,
 * so all planes (hub / console / chat / workbench / shell) stay consistent.
 *
 * Decision tree (confirmed product behaviour):
 *   1. Resume the single most recent session the user can still open — if it's a
 *      platform-assistant session (`userAgentId == null`) -> `/chat/assistant`,
 *      otherwise the specific agent -> `/chat/{userAgentId}`.
 *   2. No resumable session: the platform assistant, if accessible -> `/chat/assistant`.
 *   3. Otherwise the first accessible agent -> `/chat/{id}`.
 *   4. Nothing usable -> hide the entry (`showChatEntry = false`).
 *
 * Fails open: while resolving (and on any error) the entry stays visible and
 * points at `/chat/assistant`, matching the historical default, so a transient
 * API hiccup never hides core navigation.
 */

export const DEFAULT_CHAT_LANDING_PATH = '/chat/assistant';

export interface ChatEntryTarget {
  /** Whether the Chat entry should be shown at all. */
  showChatEntry: boolean;
  /** In-app path (relative to the chat origin) the Chat entry should open. */
  chatLandingPath: string;
}

export interface UseChatEntryTargetOptions {
  /** Client used to probe agent access. When omitted the hook fails open. */
  apiClient?: UserSettingsApiClient | null;
  /** Set false to skip resolution entirely (e.g. embed/unauthenticated shells). */
  enabled?: boolean;
}

interface AccessibleAgent {
  id: string;
}

interface RecentSession {
  agentType?: string;
  /** null marks a platform-assistant session; otherwise the specific agent. */
  userAgentId?: string | null;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const rec = payload as { data?: unknown; sessions?: unknown } | null;
  if (rec && Array.isArray(rec.data)) return rec.data;
  if (rec && Array.isArray(rec.sessions)) return rec.sessions;
  return [];
}

function chatPathFor(agentId: string): string {
  return `/chat/${encodeURIComponent(agentId)}`;
}

export function useChatEntryTarget(options?: UseChatEntryTargetOptions): ChatEntryTarget {
  const { apiClient, enabled = true } = options ?? {};
  const [target, setTarget] = useState<ChatEntryTarget>({
    showChatEntry: true,
    chatLandingPath: DEFAULT_CHAT_LANDING_PATH,
  });

  const resolve = useCallback(async () => {
    if (!enabled || !apiClient) return;

    const [assistantRes, agentsRes, sessionsRes] = await Promise.all([
      // The platform assistant is access-controlled (SPACE / specific members);
      // a non-success reply means this user can't open it.
      apiClient.get('/agents/assistant').catch(() => null),
      // accessibleOnly => owner / SPACE-scoped / explicitly granted agents only.
      apiClient
        .get('/agents', { agentType: 'CHAT', limit: 24, accessibleOnly: true })
        .catch(() => null),
      apiClient.get('/agents/sessions', { page: 1, limit: 20 }).catch(() => null),
    ]);

    const assistantAccessible = Boolean(assistantRes) && assistantRes?.success !== false;

    const agents = extractList(agentsRes?.data ?? agentsRes)
      .filter((a): a is AccessibleAgent => Boolean(a && (a as AccessibleAgent).id));
    const accessibleIds = new Set(agents.map((a) => a.id));

    // Resume the single most recent session the user can still open. A null
    // `userAgentId` marks a platform-assistant session (see assistant session
    // creation); any other value is a specific agent — regardless of the session's
    // `agentType` tag, which is just the agent's category. Sort by `updatedAt`
    // (consistent UTC); `lastMessageAt` can carry a mislabelled timezone offset.
    const sessions = extractList(sessionsRes?.data ?? sessionsRes) as RecentSession[];
    const recent = [...sessions]
      .sort((a, b) => new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime())
      .find((s) => {
        if (!s) return false;
        if (s.userAgentId == null) return assistantAccessible;
        return accessibleIds.has(s.userAgentId);
      });

    if (recent) {
      setTarget({
        showChatEntry: true,
        chatLandingPath: recent.userAgentId ? chatPathFor(recent.userAgentId) : DEFAULT_CHAT_LANDING_PATH,
      });
      return;
    }

    // No resumable session — fall back to the platform assistant when usable.
    if (assistantAccessible) {
      setTarget({ showChatEntry: true, chatLandingPath: DEFAULT_CHAT_LANDING_PATH });
      return;
    }

    if (agents[0]) {
      setTarget({ showChatEntry: true, chatLandingPath: chatPathFor(agents[0].id) });
      return;
    }

    // Neither a recent session, the assistant, nor any agent is usable — hide it.
    setTarget({ showChatEntry: false, chatLandingPath: DEFAULT_CHAT_LANDING_PATH });
  }, [apiClient, enabled]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  // Re-probe when the active space changes — access differs per space.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => {
      void resolve();
    };
    window.addEventListener('spaceSwitched', onChange);
    window.addEventListener('globalDataRefresh', onChange);
    return () => {
      window.removeEventListener('spaceSwitched', onChange);
      window.removeEventListener('globalDataRefresh', onChange);
    };
  }, [resolve]);

  return target;
}
