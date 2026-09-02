import { ComponentTypeDefinition, ParameterDefinition, ComponentTrigger } from '../types/communication';
import i18n from '@/locales/i18n';

export const COMMON_PARAMETERS: Record<string, ParameterDefinition> = {

  tableRefreshTrigger: {
    key: 'tableRefreshTrigger',
    label: i18n.t('editor.component_triggers.parameters.table_refresh_trigger.label', 'Table Refresh Trigger'),
    description: i18n.t('editor.component_triggers.parameters.table_refresh_trigger.description', 'Timestamp to notify table component to refresh data'),
    dataType: 'timestamp',
    category: 'trigger',
    isCommon: true,
    relatedTriggers: ['onSubmitSuccess', 'onTaskSuccess', 'onDataUpdate', 'onGlobalActionSuccess', 'onGlobalActionSuccess.*', 'onRowActionSuccess', 'onRowActionSuccess.*']
  },

  chartRefreshTrigger: {
    key: 'chartRefreshTrigger',
    label: i18n.t('editor.component_triggers.parameters.chart_refresh_trigger.label', 'Chart Refresh Trigger'),
    description: i18n.t('editor.component_triggers.parameters.chart_refresh_trigger.description', 'Timestamp to notify chart component to refresh data'),
    dataType: 'timestamp',
    category: 'trigger',
    isCommon: true,
    relatedTriggers: ['onSubmitSuccess', 'onTaskSuccess', 'onDataUpdate']
  },

  listRefreshTrigger: {
    key: 'listRefreshTrigger',
    label: i18n.t('editor.component_triggers.parameters.list_refresh_trigger.label', 'List Refresh Trigger'),
    description: i18n.t('editor.component_triggers.parameters.list_refresh_trigger.description', 'Timestamp to notify list component to refresh data'),
    dataType: 'timestamp',
    category: 'trigger',
    isCommon: true,
    relatedTriggers: ['onSubmitSuccess', 'onTaskSuccess', 'onDataUpdate']
  },

  dataChangeNotification: {
    key: 'dataChangeNotification',
    label: i18n.t('editor.component_triggers.parameters.data_change_notification.label', 'Data Change Notification'),
    description: i18n.t('editor.component_triggers.parameters.data_change_notification.description', 'Notify system that data has changed'),
    dataType: 'object',
    category: 'event',
    isCommon: true
  },

  lastFormResult: {
    key: 'lastFormResult',
    label: i18n.t('editor.component_triggers.parameters.last_form_result.label', 'Form Submit Result'),
    description: i18n.t('editor.component_triggers.parameters.last_form_result.description', 'Detailed result of the last form submission'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onSubmitSuccess', 'onSubmitError']
  },

  formDataChanged: {
    key: 'formDataChanged',
    label: i18n.t('editor.component_triggers.parameters.form_data_changed.label', 'Form Data Changed'),
    description: i18n.t('editor.component_triggers.parameters.form_data_changed.description', 'Details when form field data changes'),
    dataType: 'object',
    category: 'event',
    relatedTriggers: ['onFieldChange']
  },

  formValidationState: {
    key: 'formValidationState',
    label: i18n.t('editor.component_triggers.parameters.form_validation_state.label', 'Form Validation State'),
    description: i18n.t('editor.component_triggers.parameters.form_validation_state.description', 'Form field validation state information'),
    dataType: 'object',
    category: 'state',
    relatedTriggers: ['onValidationFailed', 'onValidationSuccess']
  },

  lastTaskResult: {
    key: 'lastTaskResult',
    label: i18n.t('editor.component_triggers.parameters.last_task_result.label', 'Task Execution Result'),
    description: i18n.t('editor.component_triggers.parameters.last_task_result.description', 'Detailed result of the last task execution'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onTaskSuccess', 'onTaskError']
  },

  taskStatusChanged: {
    key: 'taskStatusChanged',
    label: i18n.t('editor.component_triggers.parameters.task_status_changed.label', 'Task Status Changed'),
    description: i18n.t('editor.component_triggers.parameters.task_status_changed.description', 'Details when task execution status changes'),
    dataType: 'object',
    category: 'state',
    relatedTriggers: ['onStatusChange']
  },

  currentTaskInfo: {
    key: 'currentTaskInfo',
    label: i18n.t('editor.component_triggers.parameters.current_task_info.label', 'Current Task Info'),
    description: i18n.t('editor.component_triggers.parameters.current_task_info.description', 'Basic information of the currently executing task'),
    dataType: 'object',
    category: 'data',
    relatedTriggers: ['onTaskStart']
  },

  selectedRowData: {
    key: 'selectedRowData',
    label: i18n.t('editor.component_triggers.parameters.selected_row_data.label', 'Selected Row Data'),
    description: i18n.t('editor.component_triggers.parameters.selected_row_data.description', 'Data of the currently selected table row'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onRowSelect', 'onRowDoubleClick']
  },

  globalActionId: {
    key: 'globalActionId',
    label: i18n.t('editor.component_triggers.parameters.global_action_id.label', 'Global Action ID'),
    description: i18n.t('editor.component_triggers.parameters.global_action_id.description', 'ID of the global button that fired the trigger'),
    dataType: 'string',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onGlobalActionSuccess', 'onGlobalActionSuccess.*']
  },

  globalActionLabel: {
    key: 'globalActionLabel',
    label: i18n.t('editor.component_triggers.parameters.global_action_label.label', 'Global Action Label'),
    description: i18n.t('editor.component_triggers.parameters.global_action_label.description', 'Human-readable label of the global button that fired the trigger'),
    dataType: 'string',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onGlobalActionSuccess', 'onGlobalActionSuccess.*']
  },

  globalActionResult: {
    key: 'globalActionResult',
    label: i18n.t('editor.component_triggers.parameters.global_action_result.label', 'Global Action Result'),
    description: i18n.t('editor.component_triggers.parameters.global_action_result.description', 'Result payload of the global button action (API response, etc.)'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onGlobalActionSuccess', 'onGlobalActionSuccess.*']
  },

  rowActionId: {
    key: 'rowActionId',
    label: i18n.t('editor.component_triggers.parameters.row_action_id.label', 'Row Action ID'),
    description: i18n.t('editor.component_triggers.parameters.row_action_id.description', 'ID of the row button that fired the trigger'),
    dataType: 'string',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onRowActionSuccess', 'onRowActionSuccess.*']
  },

  rowActionLabel: {
    key: 'rowActionLabel',
    label: i18n.t('editor.component_triggers.parameters.row_action_label.label', 'Row Action Label'),
    description: i18n.t('editor.component_triggers.parameters.row_action_label.description', 'Human-readable label of the row button that fired the trigger'),
    dataType: 'string',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onRowActionSuccess', 'onRowActionSuccess.*']
  },

  rowActionResult: {
    key: 'rowActionResult',
    label: i18n.t('editor.component_triggers.parameters.row_action_result.label', 'Row Action Result'),
    description: i18n.t('editor.component_triggers.parameters.row_action_result.description', 'Result payload of the row button action (API response, etc.)'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onRowActionSuccess', 'onRowActionSuccess.*']
  },

  rowActionData: {
    key: 'rowActionData',
    label: i18n.t('editor.component_triggers.parameters.row_action_data.label', 'Row Action Data'),
    description: i18n.t('editor.component_triggers.parameters.row_action_data.description', 'Data of the table row on which the row button was clicked'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onRowActionSuccess', 'onRowActionSuccess.*']
  },

  selectedRowIds: {
    key: 'selectedRowIds',
    label: i18n.t('editor.component_triggers.parameters.selected_row_ids.label', 'Selected Row IDs'),
    description: i18n.t('editor.component_triggers.parameters.selected_row_ids.description', 'List of IDs of all currently selected rows'),
    dataType: 'array',
    category: 'data',
    relatedTriggers: ['onRowSelect', 'onSelectionChange']
  },

  tableFilters: {
    key: 'tableFilters',
    label: i18n.t('editor.component_triggers.parameters.table_filters.label', 'Table Filters'),
    description: i18n.t('editor.component_triggers.parameters.table_filters.description', 'Current table filter conditions'),
    dataType: 'object',
    category: 'state',
    relatedTriggers: ['onFilterChange']
  },

  tablePagination: {
    key: 'tablePagination',
    label: i18n.t('editor.component_triggers.parameters.table_pagination.label', 'Table Pagination'),
    description: i18n.t('editor.component_triggers.parameters.table_pagination.description', 'Current table pagination state'),
    dataType: 'object',
    category: 'state',
    relatedTriggers: ['onPageChange']
  },

  chartDataPoint: {
    key: 'chartDataPoint',
    label: i18n.t('editor.component_triggers.parameters.chart_data_point.label', 'Chart Data Point'),
    description: i18n.t('editor.component_triggers.parameters.chart_data_point.description', 'Information of the clicked chart data point'),
    dataType: 'object',
    category: 'event',
    relatedTriggers: ['onDataPointClick']
  },

  chartSelection: {
    key: 'chartSelection',
    label: i18n.t('editor.component_triggers.parameters.chart_selection.label', 'Chart Selection Area'),
    description: i18n.t('editor.component_triggers.parameters.chart_selection.description', 'Selected data area in the chart'),
    dataType: 'object',
    category: 'event',
    relatedTriggers: ['onAreaSelect']
  },

  selectedTreeNode: {
    key: 'selectedTreeNode',
    label: i18n.t('editor.component_triggers.parameters.selected_tree_node.label', 'Selected Tree Node'),
    description: i18n.t('editor.component_triggers.parameters.selected_tree_node.description', 'Information of the currently selected tree node'),
    dataType: 'object',
    category: 'data',
    isCommon: true,
    relatedTriggers: ['onNodeSelect']
  },

  treeRefreshTrigger: {
    key: 'treeRefreshTrigger',
    label: i18n.t('editor.component_triggers.parameters.tree_refresh_trigger.label', 'Tree Refresh Trigger'),
    description: i18n.t('editor.component_triggers.parameters.tree_refresh_trigger.description', 'Timestamp to notify tree component to refresh data'),
    dataType: 'timestamp',
    category: 'trigger',
    isCommon: true,
    relatedTriggers: ['onSubmitSuccess', 'onTaskSuccess', 'onDataUpdate', 'onNodeAdd', 'onNodeEdit', 'onNodeDelete']
  },

};

export const COMMUNICATION_ONLY_PARAMETERS = [
  'lastTaskResult',
  'tableRefreshTrigger',
  'chartRefreshTrigger',
  'listRefreshTrigger',
  'treeRefreshTrigger',
  'lastFormResult',
  'dataChangeNotification',
  'formValidationState',
  'formDataChanged',
  'taskStatusChanged',
  'currentTaskInfo',
  'selectedTreeNode'
] as const;

export const isCommunicationOnlyParameter = (parameterKey: string): boolean => {

  if ((COMMUNICATION_ONLY_PARAMETERS as readonly string[]).includes(parameterKey)) {
    return true;
  }

  if (parameterKey.startsWith('task_') && parameterKey.endsWith('_completed')) {
    return true;
  }

  return false;
};

export const COMPONENT_TRIGGERS: Record<string, ComponentTypeDefinition> = {

  Form: {
    type: 'Form',
    displayName: i18n.t('editor.component_triggers.components.form.display_name', 'Form Component'),
    description: i18n.t('editor.component_triggers.components.form.description', 'Data input and submission component'),
    category: 'input',
    triggers: [
      {
        key: 'onSubmitSuccess',
        label: i18n.t('editor.component_triggers.triggers.on_submit_success.label', 'Submit Success'),
        description: i18n.t('editor.component_triggers.triggers.on_submit_success.description', 'Triggered when form data is submitted successfully'),
        category: 'success',
        dataType: 'object',
        defaultParameters: ['tableRefreshTrigger', 'chartRefreshTrigger', 'lastFormResult', 'dataChangeNotification'],
        icon: 'check-circle'
      },
      {
        key: 'onSubmitError', 
        label: i18n.t('editor.component_triggers.triggers.on_submit_error.label', 'Submit Error'),
        description: i18n.t('editor.component_triggers.triggers.on_submit_error.description', 'Triggered when form data submission fails'),
        category: 'error',
        dataType: 'object',
        defaultParameters: ['lastFormResult'],
        icon: 'alert-circle'
      },
      {
        key: 'onFieldChange',
        label: i18n.t('editor.component_triggers.triggers.on_field_change.label', 'Field Value Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_field_change.description', 'Triggered when form field value changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['formDataChanged'],
        icon: 'edit'
      },
      {
        key: 'onValidationFailed',
        label: i18n.t('editor.component_triggers.triggers.on_validation_failed.label', 'Validation Failed'),
        description: i18n.t('editor.component_triggers.triggers.on_validation_failed.description', 'Triggered when form validation fails'),
        category: 'error',
        dataType: 'object',
        defaultParameters: ['formValidationState'],
        icon: 'alert-triangle'
      },
      {
        key: 'onValidationSuccess',
        label: i18n.t('editor.component_triggers.triggers.on_validation_success.label', 'Validation Success'),
        description: i18n.t('editor.component_triggers.triggers.on_validation_success.description', 'Triggered when form validation passes'),
        category: 'success',
        dataType: 'object',
        defaultParameters: ['formValidationState'],
        icon: 'CheckCircle2'
      },
      {
        key: 'onReset',
        label: i18n.t('editor.component_triggers.triggers.on_reset.label', 'Form Reset'),
        description: i18n.t('editor.component_triggers.triggers.on_reset.description', 'Triggered when form is reset'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['formDataChanged'],
        icon: 'RotateCcw'
      }
    ],
    defaultListenParameters: ['formDataPreset', 'resetFormTrigger', 'disableFormTrigger']
  },

  TaskInput: {
    type: 'TaskInput',
    displayName: i18n.t('editor.component_triggers.components.task_input.display_name', 'Task Input Component'),
    description: i18n.t('editor.component_triggers.components.task_input.description', 'Task execution and status management component'),
    category: 'action',
    triggers: [
      {
        key: 'onTaskSuccess',
        label: i18n.t('editor.component_triggers.triggers.on_task_success.label', 'Task Execution Success'),
        description: i18n.t('editor.component_triggers.triggers.on_task_success.description', 'Triggered when task execution completes successfully'),
        category: 'success',
        dataType: 'object',
        defaultParameters: ['tableRefreshTrigger', 'chartRefreshTrigger', 'lastTaskResult', 'dataChangeNotification'],
        icon: 'CheckCircle'
      },
      {
        key: 'onTaskError',
        label: i18n.t('editor.component_triggers.triggers.on_task_error.label', 'Task Execution Error'), 
        description: i18n.t('editor.component_triggers.triggers.on_task_error.description', 'Triggered when task execution fails'),
        category: 'error',
        dataType: 'object',
        defaultParameters: ['lastTaskResult'],
        icon: 'AlertCircle'
      },
      {
        key: 'onTaskStart',
        label: i18n.t('editor.component_triggers.triggers.on_task_start.label', 'Task Started'),
        description: i18n.t('editor.component_triggers.triggers.on_task_start.description', 'Triggered when task starts executing'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['currentTaskInfo', 'taskStatusChanged'],
        icon: 'Play'
      },
      {
        key: 'onTaskComplete',
        label: i18n.t('editor.component_triggers.triggers.on_task_complete.label', 'Task Completed'),
        description: i18n.t('editor.component_triggers.triggers.on_task_complete.description', 'Triggered when task execution completes (regardless of success or failure)'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['lastTaskResult', 'taskStatusChanged'],
        icon: 'Square'
      },
      {
        key: 'onStatusChange',
        label: i18n.t('editor.component_triggers.triggers.on_status_change.label', 'Status Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_status_change.description', 'Triggered when task execution status changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['taskStatusChanged'],
        icon: 'Activity'
      },
      {
        key: 'onProgressUpdate',
        label: i18n.t('editor.component_triggers.triggers.on_progress_update.label', 'Progress Updated'),
        description: i18n.t('editor.component_triggers.triggers.on_progress_update.description', 'Triggered when task execution progress updates'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['taskStatusChanged'],
        icon: 'TrendingUp'
      }
    ],
    defaultListenParameters: ['taskInputPreset', 'triggerTaskExecution', 'stopTaskExecution']
  },

  Table: {
    type: 'Table',
    displayName: i18n.t('editor.component_triggers.components.table.display_name', 'Table Component'),
    description: i18n.t('editor.component_triggers.components.table.description', 'Data display and interaction component'),
    category: 'display',
    triggers: [
      {
        key: 'onRowSelect',
        label: i18n.t('editor.component_triggers.triggers.on_row_select.label', 'Row Selected'),
        description: i18n.t('editor.component_triggers.triggers.on_row_select.description', 'Triggered when a table row is selected'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'MousePointer'
      },
      {
        key: 'onRowDoubleClick',
        label: i18n.t('editor.component_triggers.triggers.on_row_double_click.label', 'Row Double Clicked'),
        description: i18n.t('editor.component_triggers.triggers.on_row_double_click.description', 'Triggered when a table row is double-clicked'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData'],
        icon: 'MousePointer2'
      },
      {
        key: 'onSelectionChange',
        label: i18n.t('editor.component_triggers.triggers.on_selection_change.label', 'Selection Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_selection_change.description', 'Triggered when table selection state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'Check'
      },
      {
        key: 'onDataLoad',
        label: i18n.t('editor.component_triggers.triggers.on_data_load.label', 'Data Loaded'),
        description: i18n.t('editor.component_triggers.triggers.on_data_load.description', 'Triggered when table data loading completes'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['dataChangeNotification'],
        icon: 'Download'
      },
      {
        key: 'onFilterChange',
        label: i18n.t('editor.component_triggers.triggers.on_filter_change.label', 'Filter Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_filter_change.description', 'Triggered when table filter conditions change'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tableFilters'],
        icon: 'Filter'
      },
      {
        key: 'onPageChange',
        label: i18n.t('editor.component_triggers.triggers.on_page_change.label', 'Page Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_page_change.description', 'Triggered when table pagination state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tablePagination'],
        icon: 'ChevronRight'
      },
      {
        key: 'onSortChange',
        label: i18n.t('editor.component_triggers.triggers.on_sort_change.label', 'Sort Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_sort_change.description', 'Triggered when table sort state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tableFilters'],
        icon: 'ArrowUpDown'
      }
    ],
    defaultListenParameters: ['tableRefreshTrigger', 'selectedRowData', 'tableFilters', 'dataChangeNotification']
  },

  List: {
    type: 'List',
    displayName: i18n.t('editor.component_triggers.components.list.display_name', 'List Component'),
    description: i18n.t('editor.component_triggers.components.list.description', 'List data display and interaction component'),
    category: 'display',
    triggers: [
      {
        key: 'onRowSelect',
        label: i18n.t('editor.component_triggers.triggers.on_row_select.label', 'Row Selected'),
        description: i18n.t('editor.component_triggers.triggers.on_row_select.description', 'Triggered when a list row is selected'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'MousePointer'
      },
      {
        key: 'onSelectionChange',
        label: i18n.t('editor.component_triggers.triggers.on_selection_change.label', 'Selection Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_selection_change.description', 'Triggered when list selection state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'Check'
      },
      {
        key: 'onDataLoad',
        label: i18n.t('editor.component_triggers.triggers.on_data_load.label', 'Data Loaded'),
        description: i18n.t('editor.component_triggers.triggers.on_data_load.description', 'Triggered when list data loading completes'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['dataChangeNotification'],
        icon: 'Download'
      },
      {
        key: 'onPageChange',
        label: i18n.t('editor.component_triggers.triggers.on_page_change.label', 'Page Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_page_change.description', 'Triggered when list pagination state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tablePagination'],
        icon: 'ChevronRight'
      },
      {
        key: 'onSortChange',
        label: i18n.t('editor.component_triggers.triggers.on_sort_change.label', 'Sort Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_sort_change.description', 'Triggered when list sort state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tableFilters'],
        icon: 'ArrowUpDown'
      }
    ],
    defaultListenParameters: [
      'listRefreshTrigger',
      'tableRefreshTrigger',
      'chartRefreshTrigger',
      'selectedRowData',
      'dataChangeNotification'
    ]
  },

  EditableTable: {
    type: 'EditableTable',
    displayName: i18n.t('editor.component_triggers.components.editable_table.display_name', 'Editable Table Component'),
    description: i18n.t('editor.component_triggers.components.editable_table.description', 'Editable data display and interaction component'),
    category: 'display',
    triggers: [
      {
        key: 'onRowSelect',
        label: i18n.t('editor.component_triggers.triggers.on_row_select.label', 'Row Selected'),
        description: i18n.t('editor.component_triggers.triggers.on_row_select.description', 'Triggered when a table row is selected'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'MousePointer'
      },
      {
        key: 'onRowDoubleClick',
        label: i18n.t('editor.component_triggers.triggers.on_row_double_click.label', 'Row Double Clicked'),
        description: i18n.t('editor.component_triggers.triggers.on_row_double_click.description', 'Triggered when a table row is double-clicked'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData'],
        icon: 'MousePointer2'
      },
      {
        key: 'onSelectionChange',
        label: i18n.t('editor.component_triggers.triggers.on_selection_change.label', 'Selection Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_selection_change.description', 'Triggered when table selection state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['selectedRowData', 'selectedRowIds'],
        icon: 'Check'
      },
      {
        key: 'onDataLoad',
        label: i18n.t('editor.component_triggers.triggers.on_data_load.label', 'Data Loaded'),
        description: i18n.t('editor.component_triggers.triggers.on_data_load.description', 'Triggered when table data loading completes'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['dataChangeNotification'],
        icon: 'Download'
      },
      {
        key: 'onFilterChange',
        label: i18n.t('editor.component_triggers.triggers.on_filter_change.label', 'Filter Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_filter_change.description', 'Triggered when table filter conditions change'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tableFilters'],
        icon: 'Filter'
      },
      {
        key: 'onPageChange',
        label: i18n.t('editor.component_triggers.triggers.on_page_change.label', 'Page Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_page_change.description', 'Triggered when table pagination state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tablePagination'],
        icon: 'ChevronRight'
      },
      {
        key: 'onSortChange',
        label: i18n.t('editor.component_triggers.triggers.on_sort_change.label', 'Sort Changed'),
        description: i18n.t('editor.component_triggers.triggers.on_sort_change.description', 'Triggered when table sort state changes'),
        category: 'change',
        dataType: 'object',
        defaultParameters: ['tableFilters'],
        icon: 'ArrowUpDown'
      },
      {
        key: 'onDataAdd',
        label: i18n.t('editor.component_triggers.triggers.on_data_add.label', 'Data Added'),
        description: i18n.t('editor.component_triggers.triggers.on_data_add.description', 'Triggered when new data is added to the table'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['tableRefreshTrigger', 'dataChangeNotification'],
        icon: 'Plus'
      },
      {
        key: 'onDataEdit',
        label: i18n.t('editor.component_triggers.triggers.on_data_edit.label', 'Data Edited'),
        description: i18n.t('editor.component_triggers.triggers.on_data_edit.description', 'Triggered when table data is edited'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['tableRefreshTrigger', 'dataChangeNotification'],
        icon: 'Edit'
      },
      {
        key: 'onDataDelete',
        label: i18n.t('editor.component_triggers.triggers.on_data_delete.label', 'Data Deleted'),
        description: i18n.t('editor.component_triggers.triggers.on_data_delete.description', 'Triggered when table data is deleted'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['tableRefreshTrigger', 'dataChangeNotification'],
        icon: 'Trash2'
      }
    ],
    defaultListenParameters: ['tableRefreshTrigger', 'selectedRowData', 'tableFilters', 'dataChangeNotification']
  },

  Chart: {
    type: 'Chart',
    displayName: i18n.t('editor.component_triggers.components.chart.display_name', 'Chart Component'),
    description: i18n.t('editor.component_triggers.components.chart.description', 'Data visualization component'),
    category: 'display',
    triggers: [
      {
        key: 'onDataPointClick',
        label: i18n.t('editor.component_triggers.triggers.on_data_point_click.label', 'Data Point Clicked'),
        description: i18n.t('editor.component_triggers.triggers.on_data_point_click.description', 'Triggered when a chart data point is clicked'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['chartDataPoint'],
        icon: 'MousePointer'
      },
      {
        key: 'onAreaSelect',
        label: i18n.t('editor.component_triggers.triggers.on_area_select.label', 'Area Selected'),
        description: i18n.t('editor.component_triggers.triggers.on_area_select.description', 'Triggered when a data area is selected in the chart'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['chartSelection'],
        icon: 'Square'
      },
      {
        key: 'onChartLoad',
        label: i18n.t('editor.component_triggers.triggers.on_chart_load.label', 'Chart Loaded'),
        description: i18n.t('editor.component_triggers.triggers.on_chart_load.description', 'Triggered when chart data is loaded and rendered'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['dataChangeNotification'],
        icon: 'BarChart'
      },
      {
        key: 'onLegendClick',
        label: i18n.t('editor.component_triggers.triggers.on_legend_click.label', 'Legend Clicked'),
        description: i18n.t('editor.component_triggers.triggers.on_legend_click.description', 'Triggered when chart legend is clicked'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['chartDataPoint'],
        icon: 'Tag'
      }
    ],
    defaultListenParameters: ['chartRefreshTrigger', 'selectedRowData', 'dataChangeNotification']
  },

  StatisticGroup: {
    type: 'StatisticGroup',
    displayName: i18n.t('editor.component_triggers.components.statistic_group.display_name', 'Statistic Component'),
    description: i18n.t('editor.component_triggers.components.statistic_group.description', 'Data statistics display component'),
    category: 'display',
    triggers: [
      {
        key: 'onStatisticClick',
        label: i18n.t('editor.component_triggers.triggers.on_statistic_click.label', 'Statistic Clicked'),
        description: i18n.t('editor.component_triggers.triggers.on_statistic_click.description', 'Triggered when a statistic item is clicked'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedRowData'],
        icon: 'MousePointer'
      },
      {
        key: 'onStatisticLoad',
        label: i18n.t('editor.component_triggers.triggers.on_statistic_load.label', 'Statistic Loaded'),
        description: i18n.t('editor.component_triggers.triggers.on_statistic_load.description', 'Triggered when statistic data loading completes'),
        category: 'lifecycle',
        dataType: 'object',
        defaultParameters: ['dataChangeNotification'],
        icon: 'PieChart'
      }
    ],
    defaultListenParameters: ['chartRefreshTrigger', 'dataChangeNotification', 'selectedRowData']
  },

  Tree: {
    type: 'Tree',
    displayName: i18n.t('editor.component_triggers.components.tree.display_name', 'Tree Component'),
    description: i18n.t('editor.component_triggers.components.tree.description', 'Hierarchical data display and management component'),
    category: 'display',
    triggers: [
      {
        key: 'onNodeSelect',
        label: i18n.t('editor.component_triggers.triggers.on_node_select.label', 'Node Selected'),
        description: i18n.t('editor.component_triggers.triggers.on_node_select.description', 'Triggered when a tree node is selected'),
        category: 'action',
        dataType: 'object',
        defaultParameters: ['selectedTreeNode'],
        icon: 'MousePointer'
      },
      {
        key: 'onNodeAdd',
        label: i18n.t('editor.component_triggers.triggers.on_node_add.label', 'Node Added'),
        description: i18n.t('editor.component_triggers.triggers.on_node_add.description', 'Triggered when a tree node is successfully added'),
        category: 'success',
        dataType: 'object',
        defaultParameters: ['treeRefreshTrigger'],
        icon: 'Plus'
      },
      {
        key: 'onNodeEdit',
        label: i18n.t('editor.component_triggers.triggers.on_node_edit.label', 'Node Edited'),
        description: i18n.t('editor.component_triggers.triggers.on_node_edit.description', 'Triggered when a tree node is successfully edited'),
        category: 'success',
        dataType: 'object',
        defaultParameters: [],
        icon: 'Edit'
      }
    ],
    defaultListenParameters: ['treeRefreshTrigger']
  }
};

export const getComponentTriggers = (componentType: string): ComponentTypeDefinition | null => {
  return COMPONENT_TRIGGERS[componentType] || null;
};

export const getAllAvailableParameters = (): ParameterDefinition[] => {
  return Object.values(COMMON_PARAMETERS);
};

export const getParametersByCategory = (category: string): ParameterDefinition[] => {
  return Object.values(COMMON_PARAMETERS).filter(param => param.category === category);
};

export const getCommonParameters = (): ParameterDefinition[] => {
  return Object.values(COMMON_PARAMETERS).filter(param => param.isCommon);
};

export const getTriggersByComponent = (componentType: string): ComponentTrigger[] => {
  const componentDef = getComponentTriggers(componentType);
  return componentDef?.triggers || [];
};

export const getParameterDefinition = (parameterKey: string): ParameterDefinition | null => {
  return COMMON_PARAMETERS[parameterKey] || null;
};

export const getComponentTypes = (): ComponentTypeDefinition[] => {
  return Object.values(COMPONENT_TRIGGERS);
};

export const getComponentsByCategory = (category: string): ComponentTypeDefinition[] => {
  return Object.values(COMPONENT_TRIGGERS).filter(comp => comp.category === category);
};

// ============================================================================
// Per-instance dynamic triggers
// ============================================================================

/**
 * Base key for the "global action succeeded" trigger. Concrete instances
 * append a dot-separated escaped actionId (e.g. `onGlobalActionSuccess.approve`).
 * The bare base key is preserved as a fallback for callers that want to
 * subscribe once to "any global action success" without per-button config.
 */
export const ON_GLOBAL_ACTION_SUCCESS_BASE = 'onGlobalActionSuccess';

/**
 * Replace characters that would break the dot-separated trigger key with
 * `_`. Currently only `.` matters because we use dots as the separator,
 * but this function is the single source of truth — if the separator ever
 * changes, only this function needs updating.
 */
export function escapeActionIdForTrigger(actionId: string): string {
  if (!actionId) return '';
  return actionId.replace(/\./g, '_');
}

/**
 * Build the trigger key for a given global action. Use the same function on
 * both the renderer side (when emitting) and the editor side (when deriving
 * the trigger list) so they always agree.
 */
export function globalActionSuccessTriggerKey(actionId: string): string {
  const safeId = escapeActionIdForTrigger(actionId);
  return safeId ? `${ON_GLOBAL_ACTION_SUCCESS_BASE}.${safeId}` : ON_GLOBAL_ACTION_SUCCESS_BASE;
}

/**
 * Build the per-action trigger list from a Table's `actions` array.
 * Only `position: 'global'` actions are included. Returns an empty array
 * when no actions are provided so the caller can safely concatenate.
 */
export function getGlobalActionSuccessTriggers(
  actions: ReadonlyArray<{ id?: string; position?: string; label?: string }> | undefined
): ComponentTrigger[] {
  if (!actions || actions.length === 0) return [];
  return actions
    .filter((a) => a?.position === 'global' && a.id)
    .map((a) => ({
      key: globalActionSuccessTriggerKey(a.id as string),
      label: i18n.t('editor.component_triggers.triggers.on_global_action_success_per_button.label', 'On Global Action Success — {{label}}', { label: a.label || a.id }),
      description: i18n.t('editor.component_triggers.triggers.on_global_action_success_per_button.description', 'Triggered after the global button "{{label}}" succeeds. Other components can listen on this trigger to refresh or react.', { label: a.label || a.id }),
      category: 'success' as const,
      dataType: 'object' as const,
      defaultParameters: ['tableRefreshTrigger'],
      icon: 'CheckCircle',
      dynamic: true,
    }));
}

/**
 * Base key for the "row action succeeded" trigger. Concrete instances
 * append a dot-separated escaped actionId (e.g. `onRowActionSuccess.edit`).
 */
export const ON_ROW_ACTION_SUCCESS_BASE = 'onRowActionSuccess';

/**
 * Build the trigger key for a given row action.
 */
export function rowActionSuccessTriggerKey(actionId: string): string {
  const safeId = escapeActionIdForTrigger(actionId);
  return safeId ? `${ON_ROW_ACTION_SUCCESS_BASE}.${safeId}` : ON_ROW_ACTION_SUCCESS_BASE;
}

/**
 * Build the per-action trigger list from a Table's `actions` array.
 * Only non-global (`position !== 'global'`) actions are included.
 */
export function getRowActionSuccessTriggers(
  actions: ReadonlyArray<{ id?: string; position?: string; label?: string }> | undefined
): ComponentTrigger[] {
  if (!actions || actions.length === 0) return [];
  return actions
    .filter((a) => a?.position !== 'global' && a.id)
    .map((a) => ({
      key: rowActionSuccessTriggerKey(a.id as string),
      label: i18n.t('editor.component_triggers.triggers.on_row_action_success_per_button.label', 'On Row Action Success — {{label}}', { label: a.label || a.id }),
      description: i18n.t('editor.component_triggers.triggers.on_row_action_success_per_button.description', 'Triggered after the row button "{{label}}" succeeds. Other components can listen on this trigger to refresh or react.', { label: a.label || a.id }),
      category: 'success' as const,
      dataType: 'object' as const,
      defaultParameters: ['tableRefreshTrigger'],
      icon: 'CheckCircle',
      dynamic: true,
    }));
}

/**
 * Merge global and row per-button success triggers for the communication panel.
 */
export function getPerButtonActionSuccessTriggers(
  actions: ReadonlyArray<{ id?: string; position?: string; label?: string }> | undefined
): ComponentTrigger[] {
  return [
    ...getGlobalActionSuccessTriggers(actions),
    ...getRowActionSuccessTriggers(actions),
  ];
}
