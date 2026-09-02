import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../internal/public/locales/en/common.json';
import enWorkbench from '../internal/public/locales/en/workbench.json';
import enEditor from '../internal/public/locales/en/editor.json';
import enEditMode from '../internal/public/locales/en/editMode.json';
import enWorkbenchApi from '../internal/public/locales/en/workbenchApi.json';
import enSpaceSwitchSuccess from '../internal/public/locales/en/spaceSwitchSuccess.json';
import enSpaceContext from '../internal/public/locales/en/spaceContext.json';
import enPermissions from '../internal/public/locales/en/permissions.json';
import enForm from '../internal/public/locales/en/form.json';
import enTask from '../internal/public/locales/en/task.json';
import enExecution from '../internal/public/locales/en/execution.json';
import enFile from '../internal/public/locales/en/file.json';
import enApiKey from '../internal/public/locales/en/apiKey.json';
import enConfigMap from '../internal/public/locales/en/configMap.json';
import enRenderers from '../internal/public/locales/en/renderers.json';
import zhCommon from '../internal/public/locales/zh/common.json';
import zhWorkbench from '../internal/public/locales/zh/workbench.json';
import zhEditor from '../internal/public/locales/zh/editor.json';
import zhEditMode from '../internal/public/locales/zh/editMode.json';
import zhWorkbenchApi from '../internal/public/locales/zh/workbenchApi.json';
import zhSpaceSwitchSuccess from '../internal/public/locales/zh/spaceSwitchSuccess.json';
import zhSpaceContext from '../internal/public/locales/zh/spaceContext.json';
import zhPermissions from '../internal/public/locales/zh/permissions.json';
import zhForm from '../internal/public/locales/zh/form.json';
import zhTask from '../internal/public/locales/zh/task.json';
import zhExecution from '../internal/public/locales/zh/execution.json';
import zhFile from '../internal/public/locales/zh/file.json';
import zhApiKey from '../internal/public/locales/zh/apiKey.json';
import zhConfigMap from '../internal/public/locales/zh/configMap.json';
import zhRenderers from '../internal/public/locales/zh/renderers.json';

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

