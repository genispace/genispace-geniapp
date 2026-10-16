import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import defaultI18n from '../locales/i18n';
import enCommon from '../locales/resources/locales/en/common.json';
import enWorkbench from '../locales/resources/locales/en/workbench.json';
import enEditor from '../locales/resources/locales/en/editor.json';
import enEditMode from '../locales/resources/locales/en/editMode.json';
import enWorkbenchApi from '../locales/resources/locales/en/workbenchApi.json';
import enSpaceSwitchSuccess from '../locales/resources/locales/en/spaceSwitchSuccess.json';
import enSpaceContext from '../locales/resources/locales/en/spaceContext.json';
import enPermissions from '../locales/resources/locales/en/permissions.json';
import enForm from '../locales/resources/locales/en/form.json';
import enTask from '../locales/resources/locales/en/task.json';
import enExecution from '../locales/resources/locales/en/execution.json';
import enFile from '../locales/resources/locales/en/file.json';
import enApiKey from '../locales/resources/locales/en/apiKey.json';
import enConfigMap from '../locales/resources/locales/en/configMap.json';
import enRenderers from '../locales/resources/locales/en/renderers.json';
import zhCommon from '../locales/resources/locales/zh/common.json';
import zhWorkbench from '../locales/resources/locales/zh/workbench.json';
import zhEditor from '../locales/resources/locales/zh/editor.json';
import zhEditMode from '../locales/resources/locales/zh/editMode.json';
import zhWorkbenchApi from '../locales/resources/locales/zh/workbenchApi.json';
import zhSpaceSwitchSuccess from '../locales/resources/locales/zh/spaceSwitchSuccess.json';
import zhSpaceContext from '../locales/resources/locales/zh/spaceContext.json';
import zhPermissions from '../locales/resources/locales/zh/permissions.json';
import zhForm from '../locales/resources/locales/zh/form.json';
import zhTask from '../locales/resources/locales/zh/task.json';
import zhExecution from '../locales/resources/locales/zh/execution.json';
import zhFile from '../locales/resources/locales/zh/file.json';
import zhApiKey from '../locales/resources/locales/zh/apiKey.json';
import zhConfigMap from '../locales/resources/locales/zh/configMap.json';
import zhRenderers from '../locales/resources/locales/zh/renderers.json';

export type GeniAppLocale = 'en' | 'zh';

const en = {
  common: enCommon,
  workbench: enWorkbench,
  editor: enEditor,
  editMode: enEditMode,
  workbenchApi: enWorkbenchApi,
  spaceSwitchSuccess: enSpaceSwitchSuccess,
  spaceContext: enSpaceContext,
  permissions: enPermissions,
  form: enForm,
  task: enTask,
  execution: enExecution,
  file: enFile,
  apiKey: enApiKey,
  configMap: enConfigMap,
  renderers: enRenderers,
};

const zh = {
  common: zhCommon,
  workbench: zhWorkbench,
  editor: zhEditor,
  editMode: zhEditMode,
  workbenchApi: zhWorkbenchApi,
  spaceSwitchSuccess: zhSpaceSwitchSuccess,
  spaceContext: zhSpaceContext,
  permissions: zhPermissions,
  form: zhForm,
  task: zhTask,
  execution: zhExecution,
  file: zhFile,
  apiKey: zhApiKey,
  configMap: zhConfigMap,
  renderers: zhRenderers,
};

export function normalizeGeniAppLocale(locale?: string): GeniAppLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function createGeniAppI18n(locale: string = 'en'): I18nInstance {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: normalizeGeniAppLocale(locale),
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    resources: { en, zh },
    ns: Object.keys(en),
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: { escapeValue: false },
    initImmediate: false,
  });
  return instance;
}

const bundledResources: Record<GeniAppLocale, Record<string, unknown>> = { en, zh };

/**
 * Renderers that translate through the global default i18n instance (@/locales/i18n, plain
 * i18n.t calls instead of the useTranslation context) rely on its http-backend fetching
 * /locales/{lng}/{ns}.json from the site root. Exported standalone apps serve no such
 * endpoint — the fetch returns the app shell's HTML, namespace loading fails, and every one
 * of those texts falls back to its English defaultValue (task #187). Seed the default
 * instance with the same bundled resources the embedded instance uses so those lookups
 * resolve offline. Hosts with a working backend (Workbench view mode) are unaffected: the
 * seeded content is identical to what their /locales endpoint serves (parity-checked).
 */
export function seedDefaultI18nWithBundledResources(): void {
  for (const lng of Object.keys(bundledResources) as GeniAppLocale[]) {
    for (const [ns, bundle] of Object.entries(bundledResources[lng])) {
      defaultI18n.addResourceBundle(lng, ns, bundle, true, true);
    }
  }
}

/**
 * Standalone shells drive the UI language from the app config, not the default instance's
 * detector — keep the default instance in sync so default-instance t() callers follow the
 * same language as the useTranslation context. Returns the changeLanguage promise (if any)
 * so callers/tests can await the switch.
 */
export function syncDefaultI18nLanguage(locale: string): Promise<unknown> | undefined {
  const target = normalizeGeniAppLocale(locale);
  if (defaultI18n.language === target) return undefined;
  return defaultI18n.changeLanguage(target);
}

// Seed at import time (not in an effect): renderers calling the default instance's t() are
// not subscribed to it, so resources must be in the store before their first render. The
// standalone shell (GeniAppWorkbench) keeps the instance's language in sync separately.
seedDefaultI18nWithBundledResources();

