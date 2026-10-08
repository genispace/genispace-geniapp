import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setLanguage, setTheme } from '../utils';
import { GeniAppComponentProvider } from './runtime/GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './runtime/GeniAppWorkbench';
import { createPlatformHostAdapters } from './adapters/platform';
import { createResolveApiRoot } from '../hooks/shell/resolveApiRoot';
import type { GeniAppHostAdapters } from './types/host-adapters';
import './styles.css';

export interface MountGeniAppOptions {
  identifier: string;
  name?: string;
  locale?: string;
  theme?: 'light' | 'dark';
  apiRoot?: string | (() => string);
  adapters?: GeniAppHostAdapters;
  allowedShellOrigins?: string[];
  showRuntimeControls?: boolean;
}

export interface MountedGeniApp {
  root: Root;
  unmount: () => void;
}

/** Mount the self-contained prebuilt runtime shipped in downloaded GeniApps. */
export function mountGeniApp(
  element: Element,
  config: GeniAppWorkbenchConfig,
  options: MountGeniAppOptions,
): MountedGeniApp {
  const locale = options.locale || localStorage.getItem('i18nextLng') || navigator.language || 'en';
  const theme = options.theme
    || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  setLanguage(locale);
  setTheme(theme);

  // Defense in depth: any transport that bypasses the host adapter (bare axios fallbacks in
  // BaseApiClient) reads window.__APP_CONFIG__.API_BASE_URL and otherwise defaults to the
  // CLOUD api — fatal for a self-contained static app (wrong-host 401 → global login jump).
  // Seed it from the same root the adapter resolves, unless a real config.js already set one.
  if (!window.__APP_CONFIG__?.API_BASE_URL) {
    const resolvedApiRoot = typeof options.apiRoot === 'function'
      ? options.apiRoot()
      : options.apiRoot ?? createResolveApiRoot()();
    if (resolvedApiRoot) {
      window.__APP_CONFIG__ = { ...window.__APP_CONFIG__, API_BASE_URL: resolvedApiRoot };
    }
  }

  const root = createRoot(element);
  root.render(
    <BrowserRouter>
      <GeniAppComponentProvider
        adapters={options.adapters ?? createPlatformHostAdapters({
          apiRoot: options.apiRoot,
          applicationIdentifier: options.identifier,
          datasourceIdentifiers: config.geniappRuntime?.datasourceIdentifiers,
          resourceIdentifiers: {
            datasource: config.geniappRuntime?.datasourceIdentifiers,
            dataset: config.geniappRuntime?.datasetIdentifiers,
            agent: config.geniappRuntime?.agentIdentifiers,
            task: config.geniappRuntime?.taskIdentifiers,
            workflow: config.geniappRuntime?.workflowIdentifiers,
            operator: config.geniappRuntime?.operatorIdentifiers,
            knowledge_base: config.geniappRuntime?.knowledgeBaseIdentifiers,
            skill: config.geniappRuntime?.skillIdentifiers,
          },
        })}
        locale={locale}
        localeMetadata={config.metadata}
        applicationId={options.identifier}
        themeId={config.themeId}
        datasourceVersions={config.datasourceVersions}
      >
        <GeniAppWorkbench
          identifier={options.identifier}
          config={config}
          name={options.name}
          allowedShellOrigins={options.allowedShellOrigins}
          showRuntimeControls={options.showRuntimeControls}
        />
      </GeniAppComponentProvider>
    </BrowserRouter>,
  );

  return { root, unmount: () => root.unmount() };
}

export type { GeniAppWorkbenchConfig } from './runtime/GeniAppWorkbench';
