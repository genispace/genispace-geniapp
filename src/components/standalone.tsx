import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setLanguage, setTheme } from '../utils';
import { GeniAppComponentProvider } from './runtime/GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './runtime/GeniAppWorkbench';
import { createPlatformHostAdapters } from './adapters/platform';
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

  const root = createRoot(element);
  root.render(
    <BrowserRouter>
      <GeniAppComponentProvider
        adapters={options.adapters ?? createPlatformHostAdapters({
          apiRoot: options.apiRoot,
          applicationIdentifier: options.identifier,
          datasourceIdentifiers: config.geniappRuntime?.datasourceIdentifiers,
        })}
        locale={locale}
        localeMetadata={config.metadata}
        applicationId={options.identifier}
        themeId={config.themeId}
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
