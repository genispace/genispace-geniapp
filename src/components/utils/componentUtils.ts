import i18n from '@/locales/i18n';

export const COMPONENT_TYPE_NAMES: Record<string, string> = {
  form: i18n.t('component_utils.form', 'Form'),
  table: i18n.t('component_utils.table', 'Table'),
  list: i18n.t('component_utils.list', 'List'),
  tree: i18n.t('component_utils.tree', 'Tree'),
  chart: i18n.t('component_utils.chart', 'Chart'),
  card: i18n.t('component_utils.card', 'Card'),
  container: i18n.t('component_utils.container', 'Container'),
  tabs: i18n.t('component_utils.tabs', 'Tabs'),
  typography: i18n.t('component_utils.typography', 'Typography'),
  herocard: i18n.t('component_utils.herocard', 'Hero Card'),
  statisticgroup: i18n.t('component_utils.statisticgroup', 'Statistic Group'),
  datagridcard: i18n.t('component_utils.datagridcard', 'Data Grid Card'),
  taskinput: i18n.t('component_utils.taskinput', 'Task Input'),
  servicedeskreporter: i18n.t('component_utils.service_desk_reporter', 'Service Desk Reporter'),
  button: i18n.t('component_utils.button', 'Button'),
  input: i18n.t('component_utils.input', 'Input'),
  select: i18n.t('component_utils.select', 'Select'),
  datepicker: i18n.t('component_utils.datepicker', 'Date Picker'),
  upload: i18n.t('component_utils.upload', 'Upload'),
  image: i18n.t('component_utils.image', 'Image'),
  video: i18n.t('component_utils.video', 'Video'),
  audio: i18n.t('component_utils.audio', 'Audio'),
  iframe: i18n.t('component_utils.iframe', 'Iframe'),
  divider: i18n.t('component_utils.divider', 'Divider'),
  space: i18n.t('component_utils.space', 'Space'),
  grid: i18n.t('component_utils.grid', 'Grid'),
  row: i18n.t('component_utils.row', 'Row'),
  col: i18n.t('component_utils.col', 'Col')
};

export const COMPONENT_TYPE_IDENTIFIERS: Record<string, string> = {
  'Form': 'form',
  'Table': 'table',
  'Chart': 'chart',
  'StatisticGroup': 'statisticgroup',
  'DataGridCard': 'datagridcard',
  'Container': 'container',
  'Tabs': 'tabs',
  'Typography': 'typography',
  'HeroCard': 'herocard',
  'NavTile': 'navtile',
  'Card': 'card',
  'List': 'list',
  'TaskInput': 'taskinput',
  'ServiceDeskReporter': 'servicedeskreporter',
  'Tree': 'tree',
  'Button': 'button',
  'Input': 'input',
  'Select': 'select',
  'DatePicker': 'datepicker',
  'Upload': 'upload',
  'Image': 'image',
  'Video': 'video',
  'Audio': 'audio',
  'Iframe': 'iframe',
  'Divider': 'divider',
  'Space': 'space',
  'Grid': 'grid',
  'Row': 'row',
  'Col': 'col'
};

export const getComponentDisplayName = (componentType: string): string => {
  const lowerType = componentType.toLowerCase();
  return COMPONENT_TYPE_NAMES[lowerType] || componentType;
};

export const supportsLayoutEditing = (componentType: string): boolean => {
  const supportedTypes = [
    'form', 'table', 'chart', 'statisticgroup', 'datagridcard', 
    'container', 'tabs', 'typography', 'card', 'list', 'taskinput', 'servicedeskreporter'
  ];
  return supportedTypes.includes(componentType.toLowerCase());
};
