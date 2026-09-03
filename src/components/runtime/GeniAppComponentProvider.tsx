import { useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { configureGeniAppHostAdapters } from '../adapters/host';
import type { GeniAppHostAdapters } from '../types/host-adapters';
import { WorkbenchConfigLocaleProvider } from '../contexts/WorkbenchConfigLocaleContext';
import { WorkbenchThemeProvider } from '../contexts/WorkbenchThemeContext';
import { ViewportProvider } from '../contexts/ViewportContext';
import { PageFullscreenProvider } from '../contexts/PageFullscreenContext';
import { MobileFlowLayoutProvider } from '../mobile/mobileFlowLayoutContext';
import { createGeniAppI18n, normalizeGeniAppLocale } from './i18n';
import { useViewport } from '../contexts/ViewportContext';
import { useSyncRuntimeDatasourceVersions } from '../utils/datasourceVersion';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface GeniAppComponentProviderProps {
  children: ReactNode;
  adapters?: GeniAppHostAdapters;
  locale?: string;
  i18n?: I18nInstance;
  localeMetadata?: Record<string, unknown>;
  applicationId?: string;
  themeId?: string;
  /**
   * Workbench-level datasource version pins (`config.datasourceVersions`).
   * The host passes the map here so the package's own runtime registry is
   * populated — renderer data hooks inside this tree resolve `?version=N`
   * from it. Omit/undefined means "follow each datasource's default version".
   */
  datasourceVersions?: Record<string, number>;
  /** Override the detected Workbench viewport. Omit for automatic mobile/desktop behavior. */
  mobile?: boolean;
  fullscreen?: boolean;
  /** Set false when the host already owns the document-level Workbench appearance. */
  provideAppearance?: boolean;
}

function RuntimeContexts({
  children,
  mobile,
  fullscreen,
}: Pick<GeniAppComponentProviderProps, 'children' | 'mobile' | 'fullscreen'>) {
  const viewport = useViewport();
  return (
    <MobileFlowLayoutProvider value={mobile ?? viewport.isMobile}>
      <PageFullscreenProvider value={fullscreen ?? false}>
        {children}
      </PageFullscreenProvider>
    </MobileFlowLayoutProvider>
  );
}

/**
 * Runtime boundary shared by Workbench view mode and standalone GeniApps.
 * It provides the exact locale, appearance, viewport and platform adapter
 * contexts consumed by the public renderer tree.
 */
export function GeniAppComponentProvider({
  children,
  adapters = {},
  locale = 'en',
  i18n,
  localeMetadata,
  applicationId,
  themeId,
  datasourceVersions,
  mobile,
  fullscreen = false,
  provideAppearance = true,
}: GeniAppComponentProviderProps) {
  const ownedI18n = useMemo(() => i18n ?? createGeniAppI18n(locale), [i18n]);

  useIsomorphicLayoutEffect(
    () => configureGeniAppHostAdapters(adapters),
    [adapters],
  );

  // Sync host-supplied version pins into this package's module registry
  // (cleared on unmount), so renderer data hooks resolve pinned versions.
  useSyncRuntimeDatasourceVersions({ datasourceVersions });

  useEffect(() => {
    const nextLocale = normalizeGeniAppLocale(locale);
    if (ownedI18n.language !== nextLocale) void ownedI18n.changeLanguage(nextLocale);
  }, [locale, ownedI18n]);

  const localizedRuntime = (
    <WorkbenchConfigLocaleProvider metadata={localeMetadata as never}>
      <RuntimeContexts mobile={mobile} fullscreen={fullscreen}>
        {children}
      </RuntimeContexts>
    </WorkbenchConfigLocaleProvider>
  );

  return (
    <I18nextProvider i18n={ownedI18n}>
      <ViewportProvider>
        {provideAppearance ? (
          <WorkbenchThemeProvider
            workbenchId={applicationId}
            serverThemeId={themeId}
          >
            {localizedRuntime}
          </WorkbenchThemeProvider>
        ) : localizedRuntime}
      </ViewportProvider>
    </I18nextProvider>
  );
}
