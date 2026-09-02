import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import {
  useBuiltInApps,
  mapNavAppsToHeaderItems,
  type BuiltInAppsApiClient,
} from '@genispace/shared-ui';
import { getConfig } from '@/lib/config';
import i18n from '@/locales/i18n';
import apiClient from '@/lib/api/apiClient';

/**
 * Enabled built-in nav apps + active id for AppHeader (pinned shortcuts, team apps menu).
 */
export function useWorkbenchHeaderNavApps(displayLanguage?: string) {
  const location = useLocation();
  const { data: builtInApps = [] } = useBuiltInApps(apiClient as BuiltInAppsApiClient);

  const shellOrigin = useMemo(() => {
    const s = getConfig().SHELL_URL;
    return (s && s.trim() !== '' ? s : 'http://localhost:5017').replace(/\/$/, '');
  }, []);

  const workbenchUrl = useMemo(
    () => (getConfig().WORKBENCH_URL || window.location.origin).replace(/\/$/, ''),
    [],
  );

  const enabledBuiltInApps = useMemo(
    () =>
      mapNavAppsToHeaderItems(builtInApps, {
        shellOrigin,
        workbenchUrl,
        fallbackIcon: LayoutGrid,
        displayLanguage: displayLanguage ?? i18n.language,
      }),
    [builtInApps, shellOrigin, workbenchUrl, displayLanguage],
  );

  const activeBuiltInAppId = useMemo(() => {
    const first = location.pathname.split('/').filter(Boolean)[0];
    return builtInApps.find((a) => a.identifier === first)?.id ?? null;
  }, [location.pathname, builtInApps]);

  return { enabledBuiltInApps, activeBuiltInAppId };
}
