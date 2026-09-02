export type Namespace = 
  | 'common'
  | 'workbench'
  | 'editor'
  | 'editMode'
  | 'workbenchApi'
  | 'spaceSwitchSuccess'
  | 'spaceContext'
  | 'permissions'
  | 'form'
  | 'task'
  | 'execution'
  | 'file'
  | 'apiKey'
  | 'configMap'
  | 'renderers';

export type Resources = {
  common: typeof import('./resources/locales/en/common.json');
  workbench: typeof import('./resources/locales/en/workbench.json');
  editor: typeof import('./resources/locales/en/editor.json');
  editMode: typeof import('./resources/locales/en/editMode.json');
  workbenchApi: typeof import('./resources/locales/en/workbenchApi.json');
  spaceSwitchSuccess: typeof import('./resources/locales/en/spaceSwitchSuccess.json');
  spaceContext: typeof import('./resources/locales/en/spaceContext.json');
  permissions: typeof import('./resources/locales/en/permissions.json');
  form: typeof import('./resources/locales/en/form.json');
  task: typeof import('./resources/locales/en/task.json');
  execution: typeof import('./resources/locales/en/execution.json');
  file: typeof import('./resources/locales/en/file.json');
  apiKey: typeof import('./resources/locales/en/apiKey.json');
  configMap: typeof import('./resources/locales/en/configMap.json');
  renderers: typeof import('./resources/locales/en/renderers.json');
}; 