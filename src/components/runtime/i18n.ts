import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
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

