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
  common: typeof import('../../public/locales/en/common.json');
  workbench: typeof import('../../public/locales/en/workbench.json');
  editor: typeof import('../../public/locales/en/editor.json');
  editMode: typeof import('../../public/locales/en/editMode.json');
  workbenchApi: typeof import('../../public/locales/en/workbenchApi.json');
  spaceSwitchSuccess: typeof import('../../public/locales/en/spaceSwitchSuccess.json');
  spaceContext: typeof import('../../public/locales/en/spaceContext.json');
  permissions: typeof import('../../public/locales/en/permissions.json');
  form: typeof import('../../public/locales/en/form.json');
  task: typeof import('../../public/locales/en/task.json');
  execution: typeof import('../../public/locales/en/execution.json');
  file: typeof import('../../public/locales/en/file.json');
  apiKey: typeof import('../../public/locales/en/apiKey.json');
  configMap: typeof import('../../public/locales/en/configMap.json');
  renderers: typeof import('../../public/locales/en/renderers.json');
}; 