import { Component } from './renderers/types';
import i18n from '../locales/i18n';

const t = (key: string, defaultValue: string): string => {
  return i18n.t(`workbench:component_types.${key}`, defaultValue);
};

type ComponentTypeName =
  | 'Form'
  | 'Table'
  | 'EditableTable'
  | 'Chart'
  | 'StatisticGroup'
  | 'DataGridCard'
  | 'Container'
  | 'Tabs'
  | 'Typography'
  | 'Card'
  | 'List'
  | 'TaskInput'
  | 'ServiceDeskReporter'
  | 'Tree'
  | 'FilterPanel'
  | 'EChartsChart'
  | 'MapChart'
  | 'RadarChart'
  | 'HeroCard'
  | 'MetricCarousel'
  | 'CollapsePanel'
  | 'AnalyticsTable'
  | 'ProductReport'
  | 'ProductDetail'
  | 'TileGrid'
  | 'RingStat'
  | 'PublishHistory'
  | 'PublishPreviewEntry'
  | 'NavTile'
  | 'AppIdentityList'
  | 'IdentityAttributeAssign'
  | 'WorkflowComponent'
  | 'CustomContent';

type ValueType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface OptionType {
  label: string;
  value: any;
}

type ValidatorFn = (value: any) => boolean;

export interface BasePropertyConfig {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string | number }>;
}

export interface OptionPropertyConfig extends BasePropertyConfig {
  type: 'string' | 'number';
  options: Array<{ label: string; value: string | number }>;
}

export interface ArrayPropertyConfig extends BasePropertyConfig {
  type: 'array';
  itemType: 'string' | 'number' | 'object';
  itemConfig?: PropertyConfig;
}

export interface ObjectPropertyConfig extends BasePropertyConfig {
  type: 'object';
  properties: Record<string, PropertyConfig>;
}

export type PropertyConfig = 
  | BasePropertyConfig 
  | OptionPropertyConfig 
  | ArrayPropertyConfig 
  | ObjectPropertyConfig;

interface RecursivePropertyConfig extends BasePropertyConfig {
  itemType?: 'string' | 'number' | 'object';
  itemConfig?: RecursivePropertyConfig;
  properties?: Record<string, RecursivePropertyConfig>;
  additionalProperties?: boolean | RecursivePropertyConfig;

  enum?: string[];
  children?: {
    [key: string]: RecursivePropertyConfig;
  };
}

type PropType = RecursivePropertyConfig;

interface DataSourceConfig {
  type: 'dataset';
  datasetId: string;
  datasetName?: string; 
  params: {
    filter?: string;
    limit?: number;
    offset?: number;
    outputFields: string[];
    [key: string]: any;
  };
}

export interface ComponentType {
  type: ComponentTypeName;
  title: string;
  description: string;
  icon: string;
  propTypes: {
    [key: string]: PropType;
  };
  dataSourceTypes?: {
    [key: string]: {
      label: string;
      description?: string;
      required?: boolean;
      children: {
        [key: string]: PropType;
      };
    };
  };
  mockData?: {
    type: 'array' | 'object';
    label: string;
    description: string;
    defaultValue: any;
  };
  createComponent: () => Component;
}

const getDefaultProps = (propTypes: ComponentType['propTypes']) => {
  const defaultProps: Record<string, any> = {};

  const processProperty = (prop: PropType): any => {
    if (prop.defaultValue !== undefined) {
      return prop.defaultValue;
    }

    if (prop.type === 'object' && prop.children) {
      const childDefaults: Record<string, any> = {};
      Object.entries(prop.children).forEach(([childKey, childProp]) => {
        const childValue = processProperty(childProp);
        if (childValue !== undefined) {
          childDefaults[childKey] = childValue;
        }
      });
      return Object.keys(childDefaults).length > 0 ? childDefaults : undefined;
    }

    if (prop.type === 'array' && prop.defaultValue === undefined) {
      return [];
    }

    return undefined;
  };

  Object.entries(propTypes).forEach(([key, prop]) => {
    const value = processProperty(prop);
    if (value !== undefined) {
      defaultProps[key] = value;
    }
  });

  return defaultProps;
};

const createComponent = <T extends ComponentTypeName>(type: T, propTypes: ComponentType['propTypes']): Component => {
  const defaultProps = getDefaultProps(propTypes);

  if (type === 'Table') {

    const paginationConfig = defaultProps.pagination || {};
    defaultProps.pagination = {
      pageSize: 10,
      current: 1,
      showSizeChanger: true,
      showQuickJumper: false,
      showTotal: true,
      ...paginationConfig
    };
  }

  return {
    type,
    id: `${type.toLowerCase()}_${Date.now()}`,
    props: defaultProps
  } as Component;
};

export const componentTypes: ComponentType[] = [
  {
    type: 'Form',
    title: t('form.title', 'Form'),
    description: t('form.description', 'For data input and editing, supports multiple field types and validation'),
    icon: 'form-input',
    propTypes: {
      title: {
        type: 'string',
        label: t('form.prop_types.title.label', 'Form Title'),
        required: true,
        defaultValue: t('form.prop_types.title.default_value', 'Form')
      },
      description: {
        type: 'string',
        label: t('form.prop_types.description.label', 'Form Description'),
        defaultValue: ''
      },
      mode: {
        type: 'string',
        label: t('form.prop_types.mode.label', 'Form Mode'),
        defaultValue: 'edit',
        options: [
          { label: t('form.prop_types.mode.options.edit', 'Edit Mode'), value: 'edit' },
          { label: t('form.prop_types.mode.options.display', 'Display Mode'), value: 'display' },
          { label: t('form.prop_types.mode.options.mixed', 'Mixed Mode'), value: 'mixed' }
        ]
      },
      layout: {
        type: 'string',
        label: t('form.prop_types.layout.label', 'Layout'),
        defaultValue: 'vertical',
        options: [
          { label: t('form.prop_types.layout.options.vertical', 'Vertical Layout'), value: 'vertical' },
          { label: t('form.prop_types.layout.options.horizontal', 'Horizontal Layout'), value: 'horizontal' },
          { label: t('form.prop_types.layout.options.grid', 'Grid Layout'), value: 'grid' }
        ]
      },
      fields: {
        type: 'array',
        label: t('form.prop_types.fields.label', 'Form Fields'),
        itemType: 'object',
        defaultValue: [],
        itemConfig: {
          type: 'object',
          label: t('form.prop_types.fields.item_config.label', 'Field Configuration'),
          children: {
            name: {
              type: 'string',
              label: t('form.prop_types.fields.item_config.children.name.label', 'Field Name'),
              required: true
            },
            label: {
              type: 'string',
              label: t('form.prop_types.fields.item_config.children.label.label', 'Field Label'),
              required: true
            },
            type: {
              type: 'string',
              label: t('form.prop_types.fields.item_config.children.type.label', 'Field Type'),
              defaultValue: 'text',
              options: [
                { label: t('form.prop_types.fields.item_config.children.type.options.text', 'Text'), value: 'text' },
                { label: t('form.prop_types.fields.item_config.children.type.options.number', 'Number'), value: 'number' },
                { label: t('form.prop_types.fields.item_config.children.type.options.textarea', 'Multi-line Text'), value: 'textarea' },
                { label: t('form.prop_types.fields.item_config.children.type.options.select', 'Dropdown'), value: 'select' },
                { label: t('form.prop_types.fields.item_config.children.type.options.checkbox', 'Checkbox'), value: 'checkbox' },
                { label: t('form.prop_types.fields.item_config.children.type.options.radio', 'Radio'), value: 'radio' },
                { label: t('form.prop_types.fields.item_config.children.type.options.switch', 'Switch'), value: 'switch' },
                { label: t('form.prop_types.fields.item_config.children.type.options.date', 'Date'), value: 'date' }
              ]
            },
            mode: {
              type: 'string',
              label: t('form.prop_types.fields.item_config.children.mode.label', 'Field Mode'),
              defaultValue: 'editable',
              options: [
                { label: t('form.prop_types.fields.item_config.children.mode.options.editable', 'Editable'), value: 'editable' },
                { label: t('form.prop_types.fields.item_config.children.mode.options.readonly', 'Read-only'), value: 'readonly' },
                { label: t('form.prop_types.fields.item_config.children.mode.options.hidden', 'Hidden'), value: 'hidden' }
              ]
            },
            required: {
              type: 'boolean',
              label: t('form.prop_types.fields.item_config.children.required.label', 'Required'),
              defaultValue: false
            },
            placeholder: {
              type: 'string',
              label: t('form.prop_types.fields.item_config.children.placeholder.label', 'Placeholder'),
              defaultValue: ''
            }
          }
        }
      },
      actions: {
        type: 'array',
        label: t('form.prop_types.actions.label', 'Action Buttons'),
        itemType: 'object',
        defaultValue: [],
        itemConfig: {
          type: 'object',
          label: t('form.prop_types.actions.item_config.label', 'Action Button Configuration'),
          children: {
            id: {
              type: 'string',
              label: t('form.prop_types.actions.item_config.children.id.label', 'Button ID'),
              required: true
            },
            label: {
              type: 'string',
              label: t('form.prop_types.actions.item_config.children.label.label', 'Button Label'),
              required: true
            },
            type: {
              type: 'string',
              label: t('form.prop_types.actions.item_config.children.type.label', 'Action Type'),
              defaultValue: 'navigate',
              options: [
                { label: t('form.prop_types.actions.item_config.children.type.options.navigate', 'Navigate'), value: 'navigate' },
                { label: t('form.prop_types.actions.item_config.children.type.options.api', 'API Call'), value: 'api' },
                { label: t('form.prop_types.actions.item_config.children.type.options.confirm', 'Confirm Action'), value: 'confirm' },
                { label: t('form.prop_types.actions.item_config.children.type.options.update_dataset', 'Update Dataset'), value: 'updateDataset' },
                { label: t('form.prop_types.actions.item_config.children.type.options.insert_dataset', 'Insert Dataset'), value: 'insertDataset' },
                { label: t('form.prop_types.actions.item_config.children.type.options.delete_dataset', 'Delete Dataset'), value: 'deleteDataset' },
                { label: t('form.prop_types.actions.item_config.children.type.options.download', 'File Download'), value: 'download' },
                { label: t('form.prop_types.actions.item_config.children.type.options.task_call', 'Task Call'), value: 'taskCall' }
              ]
            },
            icon: {
              type: 'string',
              label: t('form.prop_types.actions.item_config.children.icon.label', 'Icon'),
              defaultValue: ''
            },
            variant: {
              type: 'string',
              label: t('form.prop_types.actions.item_config.children.variant.label', 'Button Style'),
              defaultValue: 'default',
              options: [
                { label: t('form.prop_types.actions.item_config.children.variant.options.default', 'Default'), value: 'default' },
                { label: t('form.prop_types.actions.item_config.children.variant.options.destructive', 'Destructive'), value: 'destructive' },
                { label: t('form.prop_types.actions.item_config.children.variant.options.outline', 'Outline'), value: 'outline' },
                { label: t('form.prop_types.actions.item_config.children.variant.options.secondary', 'Secondary'), value: 'secondary' }
              ]
            },
            config: {
              type: 'object',
              label: t('form.prop_types.actions.item_config.children.config.label', 'Action Configuration'),
              defaultValue: {},
              children: {
                targetPage: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.target_page.label', 'Target Page'),
                  defaultValue: ''
                },
                endpoint: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.endpoint.label', 'API Endpoint'),
                  defaultValue: ''
                },
                method: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.method.label', 'Request Method'),
                  defaultValue: 'POST',
                  options: [
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'DELETE', value: 'DELETE' }
                  ]
                },
                successMessage: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.success_message.label', 'Success Message'),
                  defaultValue: t('form.prop_types.actions.item_config.children.config.children.success_message.default_value', 'Operation successful')
                },
                errorMessage: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.error_message.label', 'Error Message'),
                  defaultValue: t('form.prop_types.actions.item_config.children.config.children.error_message.default_value', 'Operation failed')
                },
                confirmMessage: {
                  type: 'string',
                  label: t('form.prop_types.actions.item_config.children.config.children.confirm_message.label', 'Confirm Message'),
                  defaultValue: t('form.prop_types.actions.item_config.children.config.children.confirm_message.default_value', 'Confirm to execute this operation?')
                },
                requireValidation: {
                  type: 'boolean',
                  label: t('form.prop_types.actions.item_config.children.config.children.require_validation.label', 'Validate Form'),
                  defaultValue: true
                },
                taskCall: {
                  type: 'object',
                  label: t('form.prop_types.actions.item_config.children.config.children.task_call.label', 'Task Call Configuration'),
                  defaultValue: {},
                  children: {
                    taskId: {
                      type: 'string',
                      label: t('form.prop_types.actions.item_config.children.config.children.task_call.children.task_id.label', 'Task ID'),
                      defaultValue: '',
                      required: true
                    },
                    requireConfirmation: {
                      type: 'boolean',
                      label: t('form.prop_types.actions.item_config.children.config.children.task_call.children.require_confirmation.label', 'Require Confirmation'),
                      defaultValue: false
                    },
                    confirmMessage: {
                      type: 'string',
                      label: t('form.prop_types.actions.item_config.children.config.children.task_call.children.confirm_message.label', 'Confirm Message'),
                      defaultValue: t('form.prop_types.actions.item_config.children.config.children.task_call.children.confirm_message.default_value', 'Confirm to execute this task?')
                    },
                    successMessage: {
                      type: 'string',
                      label: t('form.prop_types.actions.item_config.children.config.children.task_call.children.success_message.label', 'Success Message'),
                      defaultValue: t('form.prop_types.actions.item_config.children.config.children.task_call.children.success_message.default_value', 'Task executed successfully')
                    },
                    errorMessage: {
                      type: 'string',
                      label: t('form.prop_types.actions.item_config.children.config.children.task_call.children.error_message.label', 'Error Message'),
                      defaultValue: t('form.prop_types.actions.item_config.children.config.children.task_call.children.error_message.default_value', 'Task execution failed')
                    }
                  }
                }
              }
            }
          }
        }
      },
      displayConfig: {
        type: 'object',
        label: t('form.prop_types.display_config.label', 'Display Configuration'),
        defaultValue: { showTitle: true },
        children: {
          showTitle: {
            type: 'boolean',
            label: t('form.prop_types.display_config.children.show_title.label', 'Show Title'),
            defaultValue: true
          },
          groupFields: {
            type: 'boolean',
            label: t('form.prop_types.display_config.children.group_fields.label', 'Group Fields'),
            defaultValue: false
          },
          cardLayout: {
            type: 'boolean',
            label: t('form.prop_types.display_config.children.card_layout.label', 'Card Layout'),
            defaultValue: false
          },
          columnsPerRow: {
            type: 'number',
            label: t('form.prop_types.display_config.children.columns_per_row.label', 'Columns Per Row'),
            defaultValue: 1
          }
        }
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('form.data_source_types.dataset.label', 'Dataset'),
        required: false,
        children: {
          datasetId: {
            type: 'string',
            label: t('form.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true
          },
          params: {
            type: 'object',
            label: t('form.data_source_types.dataset.children.params.label', 'Query Parameters'),
            required: true,
            children: {
              filter: {
                type: 'string',
                label: t('form.data_source_types.dataset.children.params.children.filter.label', 'Filter Condition'),
                description: t('form.data_source_types.dataset.children.params.children.filter.description', 'Example: id = "123"')
              },
              limit: {
                type: 'number',
                label: t('form.data_source_types.dataset.children.params.children.limit.label', 'Limit'),
                defaultValue: 1
              },
              offset: {
                type: 'number',
                label: t('form.data_source_types.dataset.children.params.children.offset.label', 'Offset'),
                defaultValue: 0
              },
              outputFields: {
                type: 'array',
                label: t('form.data_source_types.dataset.children.params.children.output_fields.label', 'Output Fields'),
                required: true,
                defaultValue: ['*']
              }
            }
          }
        }
      }
    },
    mockData: {
      type: 'object',
      label: t('form.mock_data.label', 'Mock Data'),
      description: t('form.mock_data.description', 'Mock data for forms, used for preview and testing'),
      defaultValue: {
        name: t('form.mock_data.default_value.name', 'Zhang San'),
        email: 'zhangsan@example.com',
        age: 25,
        gender: 'male',
        bio: t('form.mock_data.default_value.bio', 'This is an example description')
      }
    },
    createComponent: () => createComponent('Form', {
      title: {
        type: 'string',
        label: t('form.create_component.title.label', 'Form Title'),
        required: true,
        defaultValue: t('form.create_component.title.default_value', 'Form')
      },
      mode: {
        type: 'string',
        label: t('form.create_component.mode.label', 'Form Mode'),
        defaultValue: 'edit'
      },
      layout: {
        type: 'string',
        label: t('form.create_component.layout.label', 'Layout'),
        defaultValue: 'vertical'
      },
      fields: {
        type: 'array',
        label: t('form.create_component.fields.label', 'Form Fields'),
        defaultValue: [
          {
            name: 'name',
            label: t('form.create_component.fields.default_value.name.label', 'Name'),
            type: 'text',
            mode: 'editable',
            required: true,
            placeholder: t('form.create_component.fields.default_value.name.placeholder', 'Please enter name')
          },
          {
            name: 'email',
            label: t('form.create_component.fields.default_value.email.label', 'Email'),
            type: 'text',
            mode: 'editable',
            required: true,
            placeholder: t('form.create_component.fields.default_value.email.placeholder', 'Please enter email address')
          }
        ]
      },
      actions: {
        type: 'array',
        label: t('form.create_component.actions.label', 'Action Buttons'),
        defaultValue: []
      }
    })
  },
  {
    type: 'Table',
    title: t('table.title', 'Table'),
    description: t('table.description', 'For displaying structured data, supports sorting, filtering, search and other functions'),
    icon: 'table',
    propTypes: {
      title: {
        type: 'string',
        label: t('table.prop_types.title.label', 'Title'),
        required: true,
        defaultValue: t('table.prop_types.title.default_value', 'Table')
      },
      pagination: {
        type: 'object',
        label: t('table.prop_types.pagination.label', 'Pagination Configuration'),
        defaultValue: { 
          pageSize: 10,
          current: 1,
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: true,
          style: 'default'
        },
        children: {
          pageSize: {
            type: 'number',
            label: t('table.prop_types.pagination.children.page_size.label', 'Items Per Page'),
            defaultValue: 10
          },
          current: {
            type: 'number',
            label: t('table.prop_types.pagination.children.current.label', 'Current Page'),
            defaultValue: 1
          },
          showSizeChanger: {
            type: 'boolean',
            label: t('table.prop_types.pagination.children.show_size_changer.label', 'Show Size Changer'),
            defaultValue: true
          },
          showQuickJumper: {
            type: 'boolean',
            label: t('table.prop_types.pagination.children.show_quick_jumper.label', 'Show Quick Jumper'),
            defaultValue: false
          },
          showTotal: {
            type: 'boolean',
            label: t('table.prop_types.pagination.children.show_total.label', 'Show Total'),
            defaultValue: true
          },
          style: {
            type: 'string',
            label: t('table.prop_types.pagination.children.style.label', 'Pagination Style'),
            defaultValue: 'default'
          }
        }
      },
      rowKey: {
        type: 'string',
        label: t('table.prop_types.row_key.label', 'Row Key'),
        required: true,
        defaultValue: 'id'
      },
      showSearch: {
        type: 'boolean',
        label: t('table.prop_types.show_search.label', 'Show Search'),
        defaultValue: true
      },
      showRefresh: {
        type: 'boolean',
        label: t('table.prop_types.show_refresh.label', 'Show Refresh'),
        defaultValue: true
      },
      showSettings: {
        type: 'boolean',
        label: t('table.prop_types.show_settings.label', 'Show Settings'),
        defaultValue: true
      },
      searchPlaceholder: {
        type: 'string',
        label: t('table.prop_types.search_placeholder.label', 'Search Placeholder'),
        defaultValue: t('table.prop_types.search_placeholder.default_value', 'Search...')
      },
      showToolbar: {
        type: 'boolean',
        label: t('table.prop_types.show_toolbar.label', 'Show Toolbar'),
        defaultValue: true
      },
      searchable: {
        type: 'boolean',
        label: t('table.prop_types.searchable.label', 'Searchable'),
        defaultValue: true
      },
      filterable: {
        type: 'boolean',
        label: t('table.prop_types.filterable.label', 'Filterable'),
        defaultValue: true
      },
      sortable: {
        type: 'boolean',
        label: t('table.prop_types.sortable.label', 'Sortable'),
        defaultValue: true
      },
      addable: {
        type: 'boolean',
        label: t('table.prop_types.addable.label', 'Addable'),
        defaultValue: true
      },
      editable: {
        type: 'boolean',
        label: t('table.prop_types.editable.label', 'Editable'),
        defaultValue: true
      },
      deletable: {
        type: 'boolean',
        label: t('table.prop_types.deletable.label', 'Deletable'),
        defaultValue: true
      },
      enableExport: {
        type: 'boolean',
        label: t('table.prop_types.enable_export.label', 'Enable Export'),
        defaultValue: false
      },
      columns: {
        type: 'array',
        label: t('table.prop_types.columns.label', 'Column Configuration'),
        required: true,
        defaultValue: [],
        children: {
          title: {
            type: 'string',
            label: t('table.prop_types.columns.children.title.label', 'Column Title'),
            required: true
          },
          dataIndex: {
            type: 'string',
            label: t('table.prop_types.columns.children.data_index.label', 'Data Field'),
            required: true
          },
          key: {
            type: 'string',
            label: t('table.prop_types.columns.children.key.label', 'Unique Identifier'),
            required: true
          },
          width: {
            type: 'number',
            label: t('table.prop_types.columns.children.width.label', 'Column Width')
          },
          fixed: {
            type: 'string',
            label: t('table.prop_types.columns.children.fixed.label', 'Fixed Position'),
            options: [
              { label: t('table.prop_types.columns.children.fixed.options.left', 'Left'), value: 'left' },
              { label: t('table.prop_types.columns.children.fixed.options.right', 'Right'), value: 'right' }
            ]
          },
          align: {
            type: 'string',
            label: t('table.prop_types.columns.children.align.label', 'Alignment'),
            options: [
              { label: t('table.prop_types.columns.children.align.options.left', 'Left'), value: 'left' },
              { label: t('table.prop_types.columns.children.align.options.center', 'Center'), value: 'center' },
              { label: t('table.prop_types.columns.children.align.options.right', 'Right'), value: 'right' }
            ]
          },
          ellipsis: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.ellipsis.label', 'Ellipsis'),
            defaultValue: false
          },
          filterSearch: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.filter_search.label', 'Filter Searchable'),
            defaultValue: false
          },
          searchable: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.searchable.label', 'Searchable'),
            defaultValue: false
          },
          editable: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.editable.label', 'Editable'),
            defaultValue: false
          },
          sorter: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.sorter.label', 'Sortable'),
            defaultValue: false
          },
          filterable: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.filterable.label', 'Filterable'),
            defaultValue: false
          },
          hidden: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.hidden.label', 'Hidden'),
            defaultValue: false
          },
          frozen: {
            type: 'boolean',
            label: t('table.prop_types.columns.children.frozen.label', 'Freeze'),
            defaultValue: false,
            description: t('table.prop_types.columns.children.frozen.description', 'Pinned on the left; stays visible when scrolling horizontally')
          },
          filterOptions: {
            type: 'array',
            label: t('table.prop_types.columns.children.filter_options.label', 'Filter Options'),
            children: {
              text: {
                type: 'string',
                label: t('table.prop_types.columns.children.filter_options.children.text.label', 'Display Text'),
                required: true
              },
              value: {
                type: 'string',
                label: t('table.prop_types.columns.children.filter_options.children.value.label', 'Option Value'),
                required: true
              }
            }
          },
          render: {
            type: 'object',
            label: t('table.prop_types.columns.children.render.label', 'Render Configuration'),
            children: {
              type: {
                type: 'string',
                label: t('table.prop_types.columns.children.render.children.type.label', 'Render Type'),
                options: [
                  { label: t('table.prop_types.columns.children.render.children.type.options.tag', 'Tag'), value: 'Tag' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.button', 'Button'), value: 'Button' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.link', 'Link'), value: 'Link' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.custom', 'Custom (color/weight/font)'), value: 'Custom' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.image', 'Image'), value: 'Image' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.rank_badge', 'Rank Badge'), value: 'RankBadge' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.currency', 'Currency'), value: 'Currency' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.number', 'Number'), value: 'Number' },
                  { label: t('table.prop_types.columns.children.render.children.type.options.progress', 'Progress'), value: 'Progress' }
                ]
              },
              props: {
                type: 'object',
                label: t('table.prop_types.columns.children.render.children.props.label', 'Property Configuration'),
                children: {
                  color: {
                    type: 'object',
                    label: t('table.prop_types.columns.children.render.children.props.children.color.label', 'Color Mapping'),
                    children: {
                      '*': {
                        type: 'string',
                        label: t('table.prop_types.columns.children.render.children.props.children.color.children.color_value.label', 'Color Value')
                      }
                    }
                  },
                  customColor: {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.props.children.custom_color.label', 'Text Color (Custom)'),
                    description: t('table.prop_types.columns.children.render.children.props.children.custom_color.description', 'CSS color (#hex / red / green / gold) or expression'),
                  },
                  fontWeight: {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.props.children.font_weight.label', 'Font Weight'),
                    options: [
                      { label: 'normal', value: 'normal' },
                      { label: 'bold', value: 'bold' },
                      { label: '100', value: '100' },
                      { label: '300', value: '300' },
                      { label: '500', value: '500' },
                      { label: '700', value: '700' },
                      { label: '900', value: '900' },
                    ],
                  },
                  fontFamily: {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.props.children.font_family.label', 'Font Family'),
                    description: t('table.prop_types.columns.children.render.children.props.children.font_family.description', 'CSS font-family, e.g. monospace or "Microsoft YaHei"'),
                  },
                  fontStyle: {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.props.children.font_style.label', 'Font Style'),
                    options: [
                      { label: 'normal', value: 'normal' },
                      { label: 'italic', value: 'italic' },
                    ],
                  },
                  textDecoration: {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.props.children.text_decoration.label', 'Text Decoration'),
                    options: [
                      { label: 'none', value: 'none' },
                      { label: 'underline', value: 'underline' },
                      { label: 'line-through', value: 'line-through' },
                    ],
                  },
                }
              },
              text: {
                type: 'object',
                label: t('table.prop_types.columns.children.render.children.text.label', 'Text Mapping'),
                children: {
                  '*': {
                    type: 'string',
                    label: t('table.prop_types.columns.children.render.children.text.children.display_text.label', 'Display Text')
                  }
                }
              }
            }
          }
        }
      },
      useMockData: {
        type: 'boolean',
        label: t('table.prop_types.use_mock_data.label', 'Use Mock Data'),
        defaultValue: false,
        description: t('table.prop_types.use_mock_data.description', 'When enabled, display sample data for development and testing')
      },
      rowStriped: {
        type: 'boolean',
        label: t('table.prop_types.row_striped.label', 'Zebra Stripes'),
        defaultValue: false
      },
      tableStyle: {
        type: 'object',
        label: t('table.prop_types.table_style.label', 'Table style'),
        description: t('table.prop_types.table_style.description', '{ headerVariant?: muted | default } — muted gives the header a grey background'),
        children: {
          headerVariant: {
            type: 'string',
            label: t('table.prop_types.table_style.children.header_variant.label', 'Header variant'),
            options: [
              { label: t('table.prop_types.table_style.children.header_variant.options.default', 'Default'), value: 'default' },
              { label: t('table.prop_types.table_style.children.header_variant.options.muted', 'Muted'), value: 'muted' }
            ]
          }
        }
      },
      freezeFirstColumn: {
        type: 'boolean',
        label: t('table.prop_types.freeze_first_column.label', 'Freeze first column'),
        defaultValue: false,
        description: t('table.prop_types.freeze_first_column.description', 'Only in narrow/flow layouts: pin the first column and sticky the header')
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('table.data_source_types.dataset.label', 'Dataset'),
        required: true,
        children: {
          datasetId: {
            type: 'string',
            label: t('table.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true
          },
          params: {
            type: 'object',
            label: t('table.data_source_types.dataset.children.params.label', 'Query Parameters'),
            required: true,
            children: {
              filter: {
                type: 'string',
                label: t('table.data_source_types.dataset.children.params.children.filter.label', 'Filter Condition'),
                description: t('table.data_source_types.dataset.children.params.children.filter.description', 'Example: status = "active"')
              },
              limit: {
                type: 'number',
                label: t('table.data_source_types.dataset.children.params.children.limit.label', 'Items Per Page'),
                defaultValue: 10
              },
              offset: {
                type: 'number',
                label: t('table.data_source_types.dataset.children.params.children.offset.label', 'Offset'),
                defaultValue: 0
              },
              outputFields: {
                type: 'array',
                label: t('table.data_source_types.dataset.children.params.children.output_fields.label', 'Output Fields'),
                required: true,
                defaultValue: []
              }
            }
          }
        }
      }
    },
    mockData: {
      type: 'object',
      label: t('table.mock_data.label', 'Mock Data'),
      description: t('table.mock_data.description', 'Mock data for development and testing, includes table data and column configuration'),
      defaultValue: {
        dataSource: [
          {
            id: 1,
            name: t('table.mock_data.default_value.data_source.name_1', 'Zhang San'),
            position: t('table.mock_data.default_value.data_source.position_1', 'Frontend Developer'),
            experience: 3,
            education: t('table.mock_data.default_value.data_source.education_1', 'Bachelor'),
            skills: ['React', 'TypeScript', 'Vue'],
            status: 'active'
          },
          {
            id: 2,
            name: t('table.mock_data.default_value.data_source.name_2', 'Li Si'),
            position: t('table.mock_data.default_value.data_source.position_2', 'Backend Developer'),
            experience: 5,
            education: t('table.mock_data.default_value.data_source.education_2', 'Master'),
            skills: ['Java', 'Spring', 'MySQL'],
            status: 'interviewing'
          },
          {
            id: 3,
            name: t('table.mock_data.default_value.data_source.name_3', 'Wang Wu'),
            position: t('table.mock_data.default_value.data_source.position_3', 'Full-stack Developer'),
            experience: 4,
            education: t('table.mock_data.default_value.data_source.education_3', 'Bachelor'),
            skills: ['Node.js', 'React', 'MongoDB'],
            status: 'offered'
          }
        ],
        columns: [
          {
            title: t('table.mock_data.default_value.columns.name.title', 'Name'),
            dataIndex: 'name',
            key: 'name',
            filterSearch: true,
            searchable: true,
            editable: true
          },
          {
            title: t('table.mock_data.default_value.columns.position.title', 'Position'),
            dataIndex: 'position',
            key: 'position',
            searchable: true,
            editable: true
          },
          {
            title: t('table.mock_data.default_value.columns.experience.title', 'Experience'),
            dataIndex: 'experience',
            key: 'experience',
            sorter: true,
            editable: true
          },
          {
            title: t('table.mock_data.default_value.columns.education.title', 'Education'),
            dataIndex: 'education',
            key: 'education',
            editable: true,
            filterable: true,
            filterOptions: [
              { text: t('table.mock_data.default_value.columns.education.filter_options.bachelor', 'Bachelor'), value: t('table.mock_data.default_value.columns.education.filter_options.bachelor', 'Bachelor') },
              { text: t('table.mock_data.default_value.columns.education.filter_options.master', 'Master'), value: t('table.mock_data.default_value.columns.education.filter_options.master', 'Master') }
            ]
          },
          {
            title: t('table.mock_data.default_value.columns.skills.title', 'Skills'),
            dataIndex: 'skills',
            key: 'skills',
            searchable: true,
            editable: true
          },
          {
            title: t('table.mock_data.default_value.columns.status.title', 'Status'),
            dataIndex: 'status',
            key: 'status',
            render: {
              type: 'Tag',
              props: {
                color: {
                  active: 'green',
                  interviewing: 'blue',
                  offered: 'gold'
                }
              },
              text: {
                active: t('table.mock_data.default_value.columns.status.render.text.active', 'Active'),
                interviewing: t('table.mock_data.default_value.columns.status.render.text.interviewing', 'Interviewing'),
                offered: t('table.mock_data.default_value.columns.status.render.text.offered', 'Offer Sent')
              }
            }
          }
        ]
      }
    },
    createComponent: function () {
      const component = createComponent(this.type, this.propTypes);
      const props = component.props as unknown as Record<string, unknown>;

      if (
        props.useMockData &&
        (!props.columns || !(Array.isArray(props.columns) && props.columns.length > 0))
      ) {
        const dv = this.mockData?.defaultValue as { columns?: unknown[] } | undefined;
        props.columns = dv?.columns || [];
      }

      return component;
    }
  },
  {
    type: 'EditableTable',
    title: t('editable_table.title', 'Editable Table'),
    description: t('editable_table.description', 'Table with inline editing, supports add, edit, delete operations'),
    icon: 'table',
    propTypes: {
      title: {
        type: 'string',
        label: t('editable_table.prop_types.title.label', 'Title'),
        defaultValue: t('editable_table.prop_types.title.default_value', 'Editable Table')
      },
      rowKey: {
        type: 'string',
        label: t('editable_table.prop_types.row_key.label', 'Row Key'),
        required: true,
        defaultValue: 'id'
      },
      pagination: {
        type: 'object',
        label: t('editable_table.prop_types.pagination.label', 'Pagination Configuration'),
        defaultValue: { 
          pageSize: 10,
          current: 1,
          showSizeChanger: true,
          showQuickJumper: false,
          showTotal: true
        },
        children: {
          pageSize: {
            type: 'number',
            label: t('editable_table.prop_types.pagination.children.page_size.label', 'Items Per Page'),
            defaultValue: 10
          },
          current: {
            type: 'number',
            label: t('editable_table.prop_types.pagination.children.current.label', 'Current Page'),
            defaultValue: 1
          },
          showSizeChanger: {
            type: 'boolean',
            label: t('editable_table.prop_types.pagination.children.show_size_changer.label', 'Show Size Changer'),
            defaultValue: true
          },
          showQuickJumper: {
            type: 'boolean',
            label: t('editable_table.prop_types.pagination.children.show_quick_jumper.label', 'Show Quick Jumper'),
            defaultValue: false
          },
          showTotal: {
            type: 'boolean',
            label: t('editable_table.prop_types.pagination.children.show_total.label', 'Show Total'),
            defaultValue: true
          }
        }
      },
      columns: {
        type: 'array',
        label: t('editable_table.prop_types.columns.label', 'Column Configuration'),
        required: true,
        defaultValue: [],
        children: {
          title: {
            type: 'string',
            label: t('editable_table.prop_types.columns.children.title.label', 'Column Title'),
            required: true
          },
          dataIndex: {
            type: 'string',
            label: t('editable_table.prop_types.columns.children.data_index.label', 'Data Field'),
            required: true
          },
          key: {
            type: 'string',
            label: t('editable_table.prop_types.columns.children.key.label', 'Unique Identifier'),
            required: true
          },
          width: {
            type: 'number',
            label: t('editable_table.prop_types.columns.children.width.label', 'Column Width')
          },
          editable: {
            type: 'boolean',
            label: t('editable_table.prop_types.columns.children.editable.label', 'Editable'),
            defaultValue: false
          },
          fieldType: {
            type: 'string',
            label: t('editable_table.prop_types.columns.children.field_type.label', 'Field Type'),
            defaultValue: 'VARCHAR',
            options: [
              { label: t('editable_table.prop_types.columns.children.field_type.options.varchar', 'Text'), value: 'VARCHAR' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.int32', 'Integer'), value: 'INT32' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.float', 'Decimal'), value: 'FLOAT' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.bool', 'Boolean'), value: 'BOOL' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.date', 'Date'), value: 'DATE' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.switch', 'Switch'), value: 'SWITCH' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.array', 'Array'), value: 'ARRAY' },
              { label: t('editable_table.prop_types.columns.children.field_type.options.image', 'Image'), value: 'IMAGE' }
            ]
          },
          hidden: {
            type: 'boolean',
            label: t('editable_table.prop_types.columns.children.hidden.label', 'Hidden'),
            defaultValue: false
          },
          frozen: {
            type: 'boolean',
            label: t('editable_table.prop_types.columns.children.frozen.label', 'Freeze'),
            defaultValue: false,
            description: t('editable_table.prop_types.columns.children.frozen.description', 'Pinned on the left; stays visible when scrolling horizontally')
          }
        }
      },
      showToolbar: {
        type: 'boolean',
        label: t('editable_table.prop_types.show_toolbar.label', 'Show Toolbar'),
        defaultValue: true
      },
      showRefresh: {
        type: 'boolean',
        label: t('editable_table.prop_types.show_refresh.label', 'Show Refresh'),
        defaultValue: true
      },
      enableExport: {
        type: 'boolean',
        label: t('editable_table.prop_types.enable_export.label', 'Enable Export'),
        defaultValue: false
      },
      useMockData: {
        type: 'boolean',
        label: t('editable_table.prop_types.use_mock_data.label', 'Use Mock Data'),
        defaultValue: false,
        description: t('editable_table.prop_types.use_mock_data.description', 'When enabled, display sample data for development and testing')
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('editable_table.data_source_types.dataset.label', 'Dataset'),
        required: true,
        children: {
          datasetId: {
            type: 'string',
            label: t('editable_table.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true
          },
          params: {
            type: 'object',
            label: t('editable_table.data_source_types.dataset.children.params.label', 'Query Parameters'),
            required: true,
            children: {
              filter: {
                type: 'string',
                label: t('editable_table.data_source_types.dataset.children.params.children.filter.label', 'Filter Condition'),
                description: t('editable_table.data_source_types.dataset.children.params.children.filter.description', 'Example: status = "active"')
              },
              limit: {
                type: 'number',
                label: t('editable_table.data_source_types.dataset.children.params.children.limit.label', 'Items Per Page'),
                defaultValue: 10
              },
              offset: {
                type: 'number',
                label: t('editable_table.data_source_types.dataset.children.params.children.offset.label', 'Offset'),
                defaultValue: 0
              },
              outputFields: {
                type: 'array',
                label: t('editable_table.data_source_types.dataset.children.params.children.output_fields.label', 'Output Fields'),
                required: true,
                defaultValue: []
              }
            }
          }
        }
      }
    },
    mockData: {
      type: 'object',
      label: t('editable_table.mock_data.label', 'Mock Data'),
      description: t('editable_table.mock_data.description', 'Mock data for development and testing'),
      defaultValue: {
        dataSource: [
          {
            id: 1,
            name: t('editable_table.mock_data.default_value.data_source.name_1', 'Product A'),
            quantity: 100,
            price: 99.99,
            status: 'active'
          },
          {
            id: 2,
            name: t('editable_table.mock_data.default_value.data_source.name_2', 'Product B'),
            quantity: 50,
            price: 149.99,
            status: 'inactive'
          },
          {
            id: 3,
            name: t('editable_table.mock_data.default_value.data_source.name_3', 'Product C'),
            quantity: 200,
            price: 49.99,
            status: 'active'
          }
        ],
        columns: [
          {
            title: t('editable_table.mock_data.default_value.columns.name.title', 'Name'),
            dataIndex: 'name',
            key: 'name',
            editable: true,
            fieldType: 'VARCHAR'
          },
          {
            title: t('editable_table.mock_data.default_value.columns.quantity.title', 'Quantity'),
            dataIndex: 'quantity',
            key: 'quantity',
            editable: true,
            fieldType: 'INT32'
          },
          {
            title: t('editable_table.mock_data.default_value.columns.price.title', 'Price'),
            dataIndex: 'price',
            key: 'price',
            editable: true,
            fieldType: 'FLOAT'
          },
          {
            title: t('editable_table.mock_data.default_value.columns.status.title', 'Status'),
            dataIndex: 'status',
            key: 'status',
            editable: true,
            fieldType: 'VARCHAR'
          }
        ]
      }
    },
    createComponent: function () {
      const component = createComponent(this.type, this.propTypes);
      const props = component.props as unknown as Record<string, unknown>;
      if (
        props.useMockData &&
        (!props.columns || !(Array.isArray(props.columns) && props.columns.length > 0))
      ) {
        const dv = this.mockData?.defaultValue as { columns?: unknown[] } | undefined;
        props.columns = dv?.columns || [];
      }
      return component;
    }
  },
  {
    type: 'Chart',
    title: t('chart.title', 'Chart'),
    description: t('chart.description', 'For displaying data visualization, supports multiple chart types'),
    icon: 'bar-chart',
    propTypes: {
      chartType: {
        type: 'string',
        label: t('chart.prop_types.chart_type.label', 'Chart Type'),
        required: true,
        defaultValue: 'line',
        options: [
          { label: t('chart.prop_types.chart_type.options.line', 'Line Chart'), value: 'line' },
          { label: t('chart.prop_types.chart_type.options.bar', 'Bar Chart'), value: 'bar' },
          { label: t('chart.prop_types.chart_type.options.pie', 'Pie Chart'), value: 'pie' },
          { label: t('chart.prop_types.chart_type.options.scatter', 'Scatter Chart'), value: 'scatter' },
          { label: t('chart.prop_types.chart_type.options.overlap_bar', 'Overlap Bar'), value: 'overlapBar' }
        ]
      },
      title: { type: 'string', label: t('chart.prop_types.title.label', 'Title'), defaultValue: t('chart.prop_types.title.default_value', 'Chart') },
      height: {
        type: 'number',
        label: t('chart.prop_types.height.label', 'Component height'),
        description: t('chart.prop_types.height.description', 'Minimum height of the entire chart card including title and toolbar'),
        defaultValue: 300
      },
      chartHeight: {
        type: 'number',
        label: t('chart.prop_types.chart_height.label', 'Chart area height'),
        description: t('chart.prop_types.chart_height.description', 'Height of the plot area (Recharts). If unset, uses the same value as component height for backward compatibility')
      },
      xField: { type: 'string', label: t('chart.prop_types.x_field.label', 'X-axis Field'), required: true, defaultValue: 'date' },
      yField: { type: 'string', label: t('chart.prop_types.y_field.label', 'Y-axis Field'), required: true, defaultValue: 'value' },
      meta: {
        type: 'object',
        label: t('chart.prop_types.meta.label', 'Field Metadata'),
        defaultValue: {
          date: { alias: t('chart.prop_types.meta.default_value.date.alias', 'Date') },
          value: { alias: t('chart.prop_types.meta.default_value.value.alias', 'Value') }
        }
      },
      additionalStats: {
        type: 'array',
        label: t('chart.prop_types.additional_stats.label', 'Additional Statistics Labels'),
        description: t('chart.prop_types.additional_stats.description', 'Configure stat items with optional ratio for line chart')
      },
      additionalStatsLabelFontSize: {
        type: 'number',
        label: t('chart.prop_types.additional_stats_label_font_size.label', 'Additional Stats Font Size')
      },
      barSizePx: {
        type: 'number',
        label: t('chart.prop_types.bar_size_px.label', 'Bar width (px)'),
        description: t(
          'chart.prop_types.bar_size_px.description',
          'Column/bar chart: fixed bar width in pixels; when unset, width is derived from column width ratio'
        )
      },
      columnWidthRatio: {
        type: 'number',
        label: t('chart.prop_types.column_width_ratio.label', 'Column width ratio'),
        defaultValue: 0.8,
        description: t(
          'chart.prop_types.column_width_ratio.description',
          'Used when barSizePx is not set (multiplier for default bar size)'
        )
      },
      grid: {
        type: 'boolean',
        label: t('chart.prop_types.grid.label', 'Show grid'),
        defaultValue: true
      },
      showValueAxisGrid: {
        type: 'boolean',
        label: t('chart.prop_types.show_value_axis_grid.label', 'Value axis grid lines'),
        defaultValue: true,
        description: t(
          'chart.prop_types.show_value_axis_grid.description',
          'Bar chart: draw grid lines on the value axis (horizontal for column, vertical for horizontal bar)'
        )
      },
      barLengthAdjustment: {
        type: 'boolean',
        label: t('chart.prop_types.bar_length_adjustment.label', 'Bar length adjustment'),
        defaultValue: false,
        description: t(
          'chart.prop_types.bar_length_adjustment.description',
          'Bar chart: sqrt scale on value axis when all values are non-negative; otherwise linear'
        )
      },
      showBarNumber: {
        type: 'boolean',
        label: t('chart.prop_types.show_bar_number.label', 'Show values on bars'),
        defaultValue: false,
        description: t(
          'chart.prop_types.show_bar_number.description',
          'Column/bar chart: show numeric labels and extend value axis max for label clearance'
        )
      },
      scrollable: {
        type: 'boolean',
        label: t('chart.prop_types.scrollable.label', 'Horizontal scroll'),
        defaultValue: false,
        description: t(
          'chart.prop_types.scrollable.description',
          'Column/bar chart: keep a minimum width per category group and scroll horizontally when the groups overflow (e.g. many stores selected)'
        )
      },
      scrollMinWidthPerGroup: {
        type: 'number',
        label: t('chart.prop_types.scroll_min_width_per_group.label', 'Scroll min width per group (px)'),
        description: t(
          'chart.prop_types.scroll_min_width_per_group.description',
          'Column/bar chart with horizontal scroll: minimum width per x-category group; when unset, auto-sized from the series count'
        )
      },
      barCompField: {
        type: 'string',
        label: t('chart.prop_types.bar_comp_field.label', 'Bar comparison (YoY) field'),
        description: t(
          'chart.prop_types.bar_comp_field.description',
          'Column/bar chart with seriesField + showBarNumber: also pivots this field per series and renders a second YoY% line under each bar-top value label (+ green / − red); empty or non-numeric values show no second line'
        )
      },
      seriesSameColor: {
        type: 'boolean',
        label: t('chart.prop_types.series_same_color.label', 'Same color for all series bars'),
        defaultValue: false,
        description: t(
          'chart.prop_types.series_same_color.description',
          'Overlap bar with seriesField (multi-store comparison) only: paint every store bar with the overlap value color instead of walking the chart palette per store'
        )
      },
      seriesLegendVisible: {
        type: 'boolean',
        label: t('chart.prop_types.series_legend_visible.label', 'Show series (store) legend row'),
        defaultValue: true,
        description: t(
          'chart.prop_types.series_legend_visible.description',
          'Overlap bar with seriesField (multi-store comparison) only: the store swatches render on their own legend row above the target/comp row; turn off to hide just that row'
        )
      },
      showMode: {
        type: 'string',
        label: t('chart.prop_types.show_mode.label', 'Display mode'),
        defaultValue: 'value',
        description: t(
          'chart.prop_types.show_mode.description',
          'Column/bar chart: show absolute values or percentage share'
        )
      },
      barNumberFontSize: {
        type: 'number',
        label: t('chart.prop_types.bar_number_font_size.label', 'Bar value label font size (px)'),
        description: t(
          'chart.prop_types.bar_number_font_size.description',
          'Font size for on-bar numeric labels; when unset, matches axis label size or 12'
        )
      },
      showDataView: {
        type: 'boolean',
        label: t('chart.prop_types.show_data_view.label', 'Show “View data” button'),
        defaultValue: true,
        description: t(
          'chart.prop_types.show_data_view.description',
          'When off, hides the chart/table toggle in the title bar and shows only the chart.'
        )
      },
      colorScheme: {
        type: 'string',
        label: t('chart.prop_types.color_scheme.label', 'Color scheme'),
        description: t(
          'chart.prop_types.color_scheme.description',
          'Applies when no custom colors array is set; aligned with ECharts palette presets.'
        ),
        defaultValue: 'default',
        options: [
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.default', 'Default (soft)'),
            value: 'default'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.vivid', 'Vivid'),
            value: 'vivid'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.ocean', 'Ocean'),
            value: 'ocean'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.sunset', 'Sunset'),
            value: 'sunset'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.forest', 'Forest'),
            value: 'forest'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.contrast', 'High contrast'),
            value: 'contrast'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.logistics', 'Logistics'),
            value: 'logistics'
          }
        ]
      },
      showLegend: {
        type: 'boolean',
        label: t('chart.prop_types.show_legend.label', 'Show legend'),
        defaultValue: true
      },
      bordered: {
        type: 'boolean',
        label: t('chart.prop_types.bordered.label', 'Card border'),
        defaultValue: true
      },
      yAxisFontSize: {
        type: 'number',
        label: t('chart.prop_types.y_axis_font_size.label', 'Y-axis font size (px)'),
        description: t('chart.prop_types.y_axis_font_size.description', 'When unset, each chart type uses its own default (12 for most, 10 for composed bar)')
      },
      innerRadius: {
        type: 'number',
        label: t('chart.prop_types.inner_radius.label', 'Inner radius (0-1 ratio)'),
        defaultValue: 0,
        description: t('chart.prop_types.inner_radius.description', 'Pie chart inner radius as a ratio of the outer radius; 0 = solid pie')
      },
      overlapCompKey: {
        type: 'string',
        label: t('chart.prop_types.overlap_comp_key.label', 'Overlap comp field'),
        description: t('chart.prop_types.overlap_comp_key.description', 'Overlap bar only: field holding the comparison delta %, shown as a label above bars; with seriesField it is pivoted per store')
      },
      overlapSummary: {
        type: 'array',
        label: t('chart.prop_types.overlap_summary.label', 'Overlap summary cells'),
        defaultValue: [],
        description: t('chart.prop_types.overlap_summary.description', 'Overlap bar and column/bar: top summary strip cells { label?, field?, ratioNum?, ratioDen?, textField?, subTextField?, color?, fontSize? }; column/bar with seriesField sums over the pre-pivot rows')
      },
      overlapBarWidth: {
        type: 'number',
        label: t('chart.prop_types.overlap_bar_width.label', 'Overlap bar width (px)'),
        description: t('chart.prop_types.overlap_bar_width.description', 'Overlap bar only: fixed main bar width; unset = ~66% of band width, capped at 52px')
      },
      overlapLineKey: {
        type: 'string',
        label: t('chart.prop_types.overlap_line_key.label', 'Overlap line field'),
        description: t('chart.prop_types.overlap_line_key.description', 'Overlap bar only: cumulative value field (e.g. cum_sales) drawn as a line over the bars; rendered only when at least one row has a non-null value')
      },
      overlapLineName: {
        type: 'object',
        label: t('chart.prop_types.overlap_line_name.label', 'Overlap line name ({zh,en})'),
        description: t('chart.prop_types.overlap_line_name.description', 'Legend/tooltip name of the cumulative line; falls back to meta alias or the field name')
      },
      overlapLineColor: {
        type: 'string',
        label: t('chart.prop_types.overlap_line_color.label', 'Overlap line color'),
        description: t('chart.prop_types.overlap_line_color.description', 'Cumulative line stroke color; default #10b981')
      },
      overlapValueKey: {
        type: 'string',
        label: t('chart.prop_types.overlap_value_key.label', 'Overlap value field'),
        defaultValue: 'sales_amt',
        description: t('chart.prop_types.overlap_value_key.description', 'Main bar value field; with seriesField (multi-store comparison), each store gets one bar per bucket and targets are summed per bucket')
      },
      overlapValueName: {
        type: 'object',
        label: t('chart.prop_types.overlap_value_name.label', 'Overlap value name ({zh,en})'),
        description: t('chart.prop_types.overlap_value_name.description', 'Legend/tooltip name of the main bar; falls back to meta alias or the field name')
      },
      overlapSideMargin: {
        type: 'number',
        label: t('chart.prop_types.overlap_side_margin.label', 'Overlap side margin (px)'),
        description: t('chart.prop_types.overlap_side_margin.description', 'Overlap bar only: chart left/right margin; 0 = flush to the edge')
      },
      overlapValueColor: {
        type: 'string',
        label: t('chart.prop_types.overlap_value_color.label', 'Overlap bar color'),
        description: t('chart.prop_types.overlap_value_color.description', 'Main bar fill color; falls back to the first chart palette color')
      },
      overlapHideTargets: {
        type: 'boolean',
        label: t('chart.prop_types.overlap_hide_targets.label', 'Hide overlap targets'),
        defaultValue: false
      },
      overlapTargets: {
        type: 'array',
        label: t('chart.prop_types.overlap_targets.label', 'Overlap target bars'),
        defaultValue: [],
        description: t('chart.prop_types.overlap_targets.description', 'Overlap bar only: target bars { dataKey, color?, name?, hideWithLine? } drawn as translucent overlay + dashed line; hideWithLine drops the target in hourly (cumulative-line) mode')
      },
      overlapTargetAchievement: {
        type: 'boolean',
        label: t('chart.prop_types.overlap_target_achievement.label', 'Target achievement in tooltip'),
        defaultValue: false
      },
      drillKeyField: {
        type: 'string',
        label: t('chart.prop_types.drill_key_field.label', 'Drill key field'),
        defaultValue: 'drill_key'
      },
      drillParamKey: {
        type: 'string',
        label: t('chart.prop_types.drill_param_key.label', 'Drill param key'),
        defaultValue: 'region'
      },
      drillBreadcrumbLabel: {
        type: 'object',
        label: t('chart.prop_types.drill_breadcrumb_label.label', 'Drill breadcrumb label ({zh,en})'),
        description: t('chart.prop_types.drill_breadcrumb_label.description', 'Breadcrumb prefix while drilled in; falls back to the chart title')
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('chart.data_source_types.dataset.label', 'Dataset'),
        required: true,
        children: {
          datasetId: {
            type: 'string',
            label: t('chart.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true
          },
          params: {
            type: 'object',
            label: t('chart.data_source_types.dataset.children.params.label', 'Query Parameters'),
            required: true,
            children: {
              filter: {
                type: 'string',
                label: t('chart.data_source_types.dataset.children.params.children.filter.label', 'Filter Condition'),
                description: t('chart.data_source_types.dataset.children.params.children.filter.description', 'Example: date >= "2024-01-01"')
              },
              limit: {
                type: 'number',
                label: t('chart.data_source_types.dataset.children.params.children.limit.label', 'Data Count'),
                defaultValue: 100
              },
              outputFields: {
                type: 'array',
                label: t('chart.data_source_types.dataset.children.params.children.output_fields.label', 'Output Fields'),
                required: true,
                defaultValue: []
              }
            }
          }
        }
      }
    },
    mockData: {
      type: 'array',
      label: t('chart.mock_data.label', 'Mock Data'),
      description: t('chart.mock_data.description', 'Mock data for development and testing, format is array of objects'),
      defaultValue: [
        { date: '2024-01', value: 100 },
        { date: '2024-02', value: 200 },
        { date: '2024-03', value: 150 }
      ]
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'StatisticGroup',
    title: t('statistic_group.title', 'Statistic Cards'),
    description: t('statistic_group.description', 'For displaying key indicator data'),
    icon: 'line-chart',
    propTypes: {
      grid: {
        type: 'object',
        label: t('statistic_group.prop_types.grid.label', 'Grid Configuration'),
        children: {
          cols: {
            type: 'number',
            label: t('statistic_group.prop_types.grid.children.cols.label', 'Columns'),
            defaultValue: 4
          },
          gutter: {
            type: 'number',
            label: t('statistic_group.prop_types.grid.children.gutter.label', 'Gutter (px)'),
            description: t('statistic_group.prop_types.grid.children.gutter.description', 'Gap between cards in px; unset = default gap (16px)')
          }
        }
      },
      items: {
        type: 'array',
        label: t('statistic_group.prop_types.items.label', 'Statistic Items'),
        defaultValue: [
          {
            key: 'total_users',
            title: t('statistic_group.prop_types.items.default_value.total_users.title', 'Total Users'),
            value: 12847,
            precision: 0,
            prefix: '',
            suffix: '',
            icon: 'users',
            iconSize: 6,
            color: 'blue',
            statisticType: 'manual',
            trend: {
              enabled: true,
              value: 8.5,
              type: 'up',
              suffix: '%',
              status: 'success',
              description: t('statistic_group.prop_types.items.default_value.total_users.trend.description', 'Increased by 8.5% compared to last month')
            }
          },
          {
            key: 'revenue',
            title: t('statistic_group.prop_types.items.default_value.revenue.title', 'Total Revenue'),
            value: 245689.67,
            precision: 2,
            prefix: '¥',
            suffix: '',
            icon: 'dollar-sign',
            iconSize: 6,
            color: 'green',
            statisticType: 'manual',
            trend: {
              enabled: true,
              value: 12.3,
              type: 'up',
              suffix: '%',
              status: 'success',
              description: t('statistic_group.prop_types.items.default_value.revenue.trend.description', 'Increased by 12.3% compared to last month')
            }
          },
          {
            key: 'orders',
            title: t('statistic_group.prop_types.items.default_value.orders.title', 'Order Count'),
            value: 3456,
            precision: 0,
            prefix: '',
            suffix: t('statistic_group.prop_types.items.default_value.orders.suffix', ' orders'),
            icon: 'shopping-cart',
            iconSize: 6,
            color: 'orange',
            statisticType: 'manual',
            trend: {
              enabled: true,
              value: 2.1,
              type: 'down',
              suffix: '%',
              status: 'warning',
              description: t('statistic_group.prop_types.items.default_value.orders.trend.description', 'Decreased by 2.1% compared to last month')
            }
          },
          {
            key: 'conversion_rate',
            title: t('statistic_group.prop_types.items.default_value.conversion_rate.title', 'Conversion Rate'),
            value: 18.42,
            precision: 2,
            prefix: '',
            suffix: '%',
            icon: 'trending-up',
            iconSize: 6,
            color: 'purple',
            statisticType: 'manual',
            trend: {
              enabled: true,
              value: 5.7,
              type: 'up',
              suffix: '%',
              status: 'success',
              description: t('statistic_group.prop_types.items.default_value.conversion_rate.trend.description', 'Increased by 5.7% compared to last month')
            }
          }
        ],
        children: {
          key: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.key.label', 'Unique Identifier'),
            required: true
          },
          title: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.title.label', 'Title'),
            required: true
          },
          value: {
            type: 'number',
            label: t('statistic_group.prop_types.items.children.value.label', 'Value'),
            required: true
          },
          precision: {
            type: 'number',
            label: t('statistic_group.prop_types.items.children.precision.label', 'Decimal Places'),
            defaultValue: 0
          },
          prefix: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.prefix.label', 'Prefix'),
            defaultValue: ''
          },
          suffix: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.suffix.label', 'Suffix'),
            defaultValue: ''
          },
          icon: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.icon.label', 'Icon'),
            required: true
          },
          iconSize: {
            type: 'number',
            label: t('statistic_group.prop_types.items.children.icon_size.label', 'Icon Size'),
            defaultValue: 6
          },
          color: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.color.label', 'Icon color (legacy)'),
            options: [
              { label: t('statistic_group.prop_types.items.children.color.options.blue', 'Blue'), value: 'blue' },
              { label: t('statistic_group.prop_types.items.children.color.options.green', 'Green'), value: 'green' },
              { label: t('statistic_group.prop_types.items.children.color.options.orange', 'Orange'), value: 'orange' },
              { label: t('statistic_group.prop_types.items.children.color.options.purple', 'Purple'), value: 'purple' },
              { label: t('statistic_group.prop_types.items.children.color.options.red', 'Red'), value: 'red' },
              { label: t('statistic_group.prop_types.items.children.color.options.gray', 'Gray'), value: 'gray' }
            ],
            defaultValue: 'blue'
          },
          iconColor: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.icon_color.label', 'Icon color'),
            defaultValue: ''
          },
          valueColor: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.value_color.label', 'Value color'),
            defaultValue: ''
          },
          format: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.format.label', 'Value format'),
            options: [
              { label: t('statistic_group.prop_types.items.children.format.options.number', 'Number'), value: 'number' },
              { label: t('statistic_group.prop_types.items.children.format.options.percent', 'Percent'), value: 'percent' },
              { label: t('statistic_group.prop_types.items.children.format.options.currency_compact', 'Currency compact'), value: 'currency-compact' },
              { label: t('statistic_group.prop_types.items.children.format.options.compact_k', 'Compact (K)'), value: 'compact-k' }
            ],
            description: t('statistic_group.prop_types.items.children.format.description', 'Unset = generic locale string formatting')
          },
          accent: {
            type: 'boolean',
            label: t('statistic_group.prop_types.items.children.accent.label', 'Accent card'),
            defaultValue: false,
            description: t('statistic_group.prop_types.items.children.accent.description', 'Highlight the card with the indigo accent background/foreground')
          },
          statisticType: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.statistic_type.label', 'Statistic Type'),
            options: [
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.manual', 'Manual'), value: 'manual' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.count', 'Count'), value: 'count' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.sum', 'Sum'), value: 'sum' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.avg', 'Average'), value: 'avg' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.max', 'Maximum'), value: 'max' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.min', 'Minimum'), value: 'min' },
              { label: t('statistic_group.prop_types.items.children.statistic_type.options.column', 'Column'), value: 'column' }
            ],
            defaultValue: 'manual'
          },
          datasetId: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.dataset_id.label', 'Dataset ID')
          },
          statisticField: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.statistic_field.label', 'Statistic Field')
          },
          statisticCondition: {
            type: 'string',
            label: t('statistic_group.prop_types.items.children.statistic_condition.label', 'Statistic Condition')
          },
          trend: {
            type: 'object',
            label: t('statistic_group.prop_types.items.children.trend.label', 'Trend'),
            children: {
              enabled: {
                type: 'boolean',
                label: t('statistic_group.prop_types.items.children.trend.children.enabled.label', 'Enable Trend'),
                defaultValue: false
              },
              value: {
                type: 'number',
                label: t('statistic_group.prop_types.items.children.trend.children.value.label', 'Change Value')
              },
              type: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.type.label', 'Change Type'),
                options: [
                  { label: t('statistic_group.prop_types.items.children.trend.children.type.options.up', 'Up'), value: 'up' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.type.options.down', 'Down'), value: 'down' }
                ],
                defaultValue: 'up'
              },
              suffix: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.suffix.label', 'Suffix'),
                defaultValue: '%'
              },
              status: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.status.label', 'Status'),
                options: [
                  { label: t('statistic_group.prop_types.items.children.trend.children.status.options.success', 'Success'), value: 'success' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.status.options.warning', 'Warning'), value: 'warning' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.status.options.error', 'Error'), value: 'error' }
                ],
                defaultValue: 'success'
              },
              description: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.description.label', 'Description')
              },
              trendCondition: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.trend_condition.label', 'Trend Statistic Condition')
              },
              upStyle: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.up_style.label', 'Up Style'),
                options: [
                  { label: t('statistic_group.prop_types.items.children.trend.children.up_style.options.success', 'Success'), value: 'success' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.up_style.options.warning', 'Warning'), value: 'warning' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.up_style.options.error', 'Error'), value: 'error' }
                ],
                defaultValue: 'success'
              },
              downStyle: {
                type: 'string',
                label: t('statistic_group.prop_types.items.children.trend.children.down_style.label', 'Down Style'),
                options: [
                  { label: t('statistic_group.prop_types.items.children.trend.children.down_style.options.success', 'Success'), value: 'success' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.down_style.options.warning', 'Warning'), value: 'warning' },
                  { label: t('statistic_group.prop_types.items.children.trend.children.down_style.options.error', 'Error'), value: 'error' }
                ],
                defaultValue: 'error'
              }
            }
          }
        }
      },
      itemStyle: {
        type: 'object',
        label: t('statistic_group.prop_types.item_style.label', 'Item style overrides'),
        description: t('statistic_group.prop_types.item_style.description', '{ padding?, height?, titleStyle?, valueStyle? } — per-card style overrides')
      },
      titleFontSize: {
        type: 'number',
        label: t('statistic_group.prop_types.title_font_size.label', 'Title font size (px)'),
        defaultValue: 14
      },
      valueFontSize: {
        type: 'number',
        label: t('statistic_group.prop_types.value_font_size.label', 'Value font size (px)'),
        defaultValue: 30
      },
      labelFontSize: {
        type: 'number',
        label: t('statistic_group.prop_types.label_font_size.label', 'Label font size (px)'),
        defaultValue: 13
      }
    },
    mockData: {
      type: 'array',
      label: t('statistic_group.mock_data.label', 'Mock Data'),
      description: t('statistic_group.mock_data.description', 'Mock data for development and testing, format is array of objects, each object contains complete statistic item configuration'),
      defaultValue: [
        {
          key: 'total_users',
          title: t('statistic_group.mock_data.default_value.total_users.title', 'Total Users'),
          value: 12847,
          precision: 0,
          prefix: '',
          suffix: '',
          icon: 'users',
          iconSize: 6,
          color: 'blue',
          statisticType: 'manual',
          trend: {
            enabled: true,
            value: 8.5,
            type: 'up',
            suffix: '%',
            status: 'success',
            description: t('statistic_group.mock_data.default_value.total_users.trend.description', 'Increased by 8.5% compared to last month')
          }
        },
        {
          key: 'revenue',
          title: t('statistic_group.mock_data.default_value.revenue.title', 'Total Revenue'),
          value: 245689.67,
          precision: 2,
          prefix: '¥',
          suffix: '',
          icon: 'dollar-sign',
          iconSize: 6,
          color: 'green',
          statisticType: 'manual',
          trend: {
            enabled: true,
            value: 12.3,
            type: 'up',
            suffix: '%',
            status: 'success',
            description: t('statistic_group.mock_data.default_value.revenue.trend.description', 'Increased by 12.3% compared to last month')
          }
        },
        {
          key: 'orders',
          title: t('statistic_group.mock_data.default_value.orders.title', 'Order Count'),
          value: 3456,
          precision: 0,
          prefix: '',
          suffix: t('statistic_group.mock_data.default_value.orders.suffix', ' orders'),
          icon: 'shopping-cart',
          iconSize: 6,
          color: 'orange',
          statisticType: 'manual',
          trend: {
            enabled: true,
            value: 2.1,
            type: 'down',
            suffix: '%',
            status: 'warning',
            description: t('statistic_group.mock_data.default_value.orders.trend.description', 'Decreased by 2.1% compared to last month')
          }
        },
        {
          key: 'conversion_rate',
          title: t('statistic_group.mock_data.default_value.conversion_rate.title', 'Conversion Rate'),
          value: 18.42,
          precision: 2,
          prefix: '',
          suffix: '%',
          icon: 'trending-up',
          iconSize: 6,
          color: 'purple',
          statisticType: 'manual',
          trend: {
            enabled: true,
            value: 5.7,
            type: 'up',
            suffix: '%',
            status: 'success',
            description: t('statistic_group.mock_data.default_value.conversion_rate.trend.description', 'Increased by 5.7% compared to last month')
          }
        }
      ]
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'DataGridCard',
    title: t('data_grid_card.title', 'Data Card'),
    description: t('data_grid_card.description', 'For displaying data lists, supports search and operations'),
    icon: 'grid',
    propTypes: {
      title: {
        type: 'string',
        label: t('data_grid_card.prop_types.title.label', 'Title'),
        defaultValue: t('data_grid_card.prop_types.title.default_value', 'Data Card')
      },
      pagination: {
        type: 'boolean',
        label: t('data_grid_card.prop_types.pagination.label', 'Pagination'),
        defaultValue: false
      },
      rowKey: {
        type: 'string',
        label: t('data_grid_card.prop_types.row_key.label', 'Row Key'),
        required: true,
        defaultValue: 'id'
      },
      columns: {
        type: 'array',
        label: t('data_grid_card.prop_types.columns.label', 'Column Configuration'),
        required: true,
        children: {
          title: {
            type: 'string',
            label: t('data_grid_card.prop_types.columns.children.title.label', 'Column Title'),
            required: true
          },
          dataIndex: {
            type: 'string',
            label: t('data_grid_card.prop_types.columns.children.data_index.label', 'Data Field'),
            required: true
          },
          key: {
            type: 'string',
            label: t('data_grid_card.prop_types.columns.children.key.label', 'Unique Identifier'),
            required: true
          },
          primary: {
            type: 'boolean',
            label: t('data_grid_card.prop_types.columns.children.primary.label', 'Primary Column'),
            defaultValue: false
          },
          secondary: {
            type: 'boolean',
            label: t('data_grid_card.prop_types.columns.children.secondary.label', 'Secondary Column'),
            defaultValue: false
          },
          searchable: {
            type: 'boolean',
            label: t('data_grid_card.prop_types.columns.children.searchable.label', 'Searchable'),
            defaultValue: false
          },
          render: {
            type: 'object',
            label: t('data_grid_card.prop_types.columns.children.render.label', 'Render Configuration'),
            children: {
              type: {
                type: 'string',
                label: t('data_grid_card.prop_types.columns.children.render.children.type.label', 'Render Type'),
                options: [
                  { label: t('data_grid_card.prop_types.columns.children.render.children.type.options.tag', 'Tag'), value: 'Tag' },
                  { label: t('data_grid_card.prop_types.columns.children.render.children.type.options.progress', 'Progress'), value: 'Progress' }
                ]
              },
              props: {
                type: 'object',
                label: t('data_grid_card.prop_types.columns.children.render.children.props.label', 'Property Configuration'),
                children: {
                  color: {
                    type: 'object',
                    label: t('data_grid_card.prop_types.columns.children.render.children.props.children.color.label', 'Color Mapping'),
                    children: {
                      '*': {
                        type: 'string',
                        label: t('data_grid_card.prop_types.columns.children.render.children.props.children.color.children.color_value.label', 'Color Value')
                      }
                    }
                  },
                  status: {
                    type: 'string',
                    label: t('data_grid_card.prop_types.columns.children.render.children.props.children.status.label', 'Status Expression')
                  },
                  showInfo: {
                    type: 'boolean',
                    label: t('data_grid_card.prop_types.columns.children.render.children.props.children.show_info.label', 'Show Info'),
                    defaultValue: true
                  },
                  size: {
                    type: 'string',
                    label: t('data_grid_card.prop_types.columns.children.render.children.props.children.size.label', 'Size'),
                    options: [
                      { label: t('data_grid_card.prop_types.columns.children.render.children.props.children.size.options.small', 'Small'), value: 'small' },
                      { label: t('data_grid_card.prop_types.columns.children.render.children.props.children.size.options.default', 'Medium'), value: 'default' },
                      { label: t('data_grid_card.prop_types.columns.children.render.children.props.children.size.options.large', 'Large'), value: 'large' }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('data_grid_card.data_source_types.dataset.label', 'Dataset'),
        required: true,
        children: {
          datasetId: {
            type: 'string',
            label: t('data_grid_card.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true
          },
          params: {
            type: 'object',
            label: t('data_grid_card.data_source_types.dataset.children.params.label', 'Query Parameters'),
            required: true,
            children: {
              filter: {
                type: 'string',
                label: t('data_grid_card.data_source_types.dataset.children.params.children.filter.label', 'Filter Condition'),
                description: t('data_grid_card.data_source_types.dataset.children.params.children.filter.description', 'Example: status = "active"')
              },
              limit: {
                type: 'number',
                label: t('data_grid_card.data_source_types.dataset.children.params.children.limit.label', 'Items Per Page'),
                defaultValue: 5
              },
              offset: {
                type: 'number',
                label: t('data_grid_card.data_source_types.dataset.children.params.children.offset.label', 'Offset'),
                defaultValue: 0
              },
              outputFields: {
                type: 'array',
                label: t('data_grid_card.data_source_types.dataset.children.params.children.output_fields.label', 'Output Fields'),
                required: true,
                defaultValue: []
              }
            }
          }
        }
      }
    },
    mockData: {
      type: 'array',
      label: t('data_grid_card.mock_data.label', 'Mock Data'),
      description: t('data_grid_card.mock_data.description', 'Mock data for development and testing, format is array of objects'),
      defaultValue: [
        { id: 1, title: t('data_grid_card.mock_data.default_value.card_1.title', 'Card 1'), content: t('data_grid_card.mock_data.default_value.card_1.content', 'Content 1') },
        { id: 2, title: t('data_grid_card.mock_data.default_value.card_2.title', 'Card 2'), content: t('data_grid_card.mock_data.default_value.card_2.content', 'Content 2') }
      ]
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'Container',
    title: t('container.title', 'Container'),
    description: t('container.description', 'For organizing other components, supports grid and flex layouts'),
    icon: 'layout',
    propTypes: {
      layout: {
        type: 'string',
        label: t('container.prop_types.layout.label', 'Layout Type'),
        options: [
          { label: t('container.prop_types.layout.options.grid', 'Grid Layout'), value: 'grid' },
          { label: t('container.prop_types.layout.options.flex', 'Flex Layout'), value: 'flex' }
        ],
        defaultValue: 'grid'
      },
      cols: {
        type: 'array',
        label: t('container.prop_types.cols.label', 'Column Configuration'),
        children: {
          colWidth: {
            type: 'number',
            label: t('container.prop_types.cols.children.col_width.label', 'Column Width'),
            defaultValue: 1
          }
        }
      },
      gutter: {
        type: 'number',
        label: t('container.prop_types.gutter.label', 'Gutter'),
        defaultValue: 16
      },
      children: {
        type: 'array',
        label: t('container.prop_types.children.label', 'Child Components'),
        defaultValue: []
      }
    },
    mockData: {
      type: 'object',
      label: t('container.mock_data.label', 'Mock Data'),
      description: t('container.mock_data.description', 'Mock data for development and testing, format is object'),
      defaultValue: {
        layout: 'grid',
        cols: [1, 1],
        gutter: 16,
        children: []
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'MetricCarousel',
    title: t('metric_carousel.title', 'Metric Carousel'),
    description: t('metric_carousel.description', 'Horizontal-scroll / grid container for any components (KPI cards, charts, tables)'),
    icon: 'layout',
    propTypes: {
      layout: {
        type: 'string',
        label: t('metric_carousel.prop_types.layout.label', 'Layout mode'),
        options: [
          { label: t('metric_carousel.prop_types.layout.options.scroll', 'Horizontal scroll'), value: 'scroll' },
          { label: t('metric_carousel.prop_types.layout.options.grid', 'Grid'), value: 'grid' }
        ],
        defaultValue: 'scroll'
      },
      gap: { type: 'number', label: t('metric_carousel.prop_types.gap.label', 'Gap (px)'), defaultValue: 12 },
      itemWidthPct: { type: 'number', label: t('metric_carousel.prop_types.item_width_pct.label', 'Item width (%)'), defaultValue: 90 },
      hideScrollbar: { type: 'boolean', label: t('metric_carousel.prop_types.hide_scrollbar.label', 'Hide scrollbar'), defaultValue: true },
      showSwipeHint: { type: 'boolean', label: t('metric_carousel.prop_types.show_swipe_hint.label', 'Show swipe hint'), defaultValue: false },
      itemWidth: {
        type: 'number',
        label: t('metric_carousel.prop_types.item_width.label', 'Item width (px, fixed)'),
        description: t('metric_carousel.prop_types.item_width.description', 'Fixed card width in px; when > 0 it overrides the percentage width. Leave unset/0 to use item width (%)')
      },
      showDots: {
        type: 'boolean',
        label: t('metric_carousel.prop_types.show_dots.label', 'Show pagination dots'),
        defaultValue: false,
        description: t('metric_carousel.prop_types.show_dots.description', 'Only applies to the horizontal scroll layout')
      },
      edgeBleed: {
        type: 'object',
        label: t('metric_carousel.prop_types.edge_bleed.label', 'Edge bleed (full-bleed cards)'),
        description: t('metric_carousel.prop_types.edge_bleed.description', 'Let cards bleed to the screen edge via negative margin + compensating padding'),
        children: {
          enabled: {
            type: 'boolean',
            label: t('metric_carousel.prop_types.edge_bleed.children.enabled.label', 'Enabled'),
            defaultValue: false
          },
          mx: {
            type: 'number',
            label: t('metric_carousel.prop_types.edge_bleed.children.mx.label', 'Negative margin mx (px)'),
            defaultValue: 16
          },
          px: {
            type: 'number',
            label: t('metric_carousel.prop_types.edge_bleed.children.px.label', 'Compensating padding px (px)'),
            defaultValue: 16
          }
        }
      },
      children: {
        type: 'array',
        label: t('metric_carousel.prop_types.children.label', 'Child Components'),
        defaultValue: []
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'Tabs',
    title: t('tabs.title', 'Tabs'),
    description: t('tabs.description', 'For organizing content, supports multiple tab switching'),
    icon: 'layout',
    propTypes: {
      defaultActiveKey: {
        type: 'string',
        label: t('tabs.prop_types.default_active_key.label', 'Default Active Tab'),
        required: true
      },
      type: {
        type: 'string',
        label: t('tabs.prop_types.type.label', 'Tab Type'),
        options: [
          { label: t('tabs.prop_types.type.options.line', 'Line'), value: 'line' },
          { label: t('tabs.prop_types.type.options.card', 'Card'), value: 'card' },
          { label: t('tabs.prop_types.type.options.editable_card', 'Editable Card'), value: 'editable-card' },
          { label: t('tabs.prop_types.type.options.pill', 'Pill'), value: 'pill' },
          { label: t('tabs.prop_types.type.options.boxed', 'Boxed'), value: 'boxed' },
          { label: t('tabs.prop_types.type.options.segmented', 'Segmented'), value: 'segmented' },
          { label: t('tabs.prop_types.type.options.vertical_line', 'Vertical Line'), value: 'vertical-line' }
        ],
        defaultValue: 'line'
      },
      size: {
        type: 'string',
        label: t('tabs.prop_types.size.label', 'Size'),
        options: [
          { label: t('tabs.prop_types.size.options.small', 'Small'), value: 'small' },
          { label: t('tabs.prop_types.size.options.default', 'Default'), value: 'default' },
          { label: t('tabs.prop_types.size.options.large', 'Large'), value: 'large' }
        ],
        defaultValue: 'default'
      },
      tabBarToContentGap: {
        type: 'string',
        label: t('tabs.prop_types.tab_bar_to_content_gap.label', 'Tab Bar to Content Gap'),
        description: t('tabs.prop_types.tab_bar_to_content_gap.description', 'Vertical spacing between tab bar and tab content, e.g. 8 or 16px')
      },
      title: {
        type: 'object',
        label: t('tabs.prop_types.title.label', 'Section title ({zh,en})'),
        description: t('tabs.prop_types.title.description', 'Optional bilingual title shown above the tabs; leave empty to hide')
      },
      tabPosition: {
        type: 'string',
        label: t('tabs.prop_types.tab_position.label', 'Tab Position'),
        options: [
          { label: t('tabs.prop_types.tab_position.options.top', 'Top'), value: 'top' },
          { label: t('tabs.prop_types.tab_position.options.bottom', 'Bottom'), value: 'bottom' },
          { label: t('tabs.prop_types.tab_position.options.left', 'Left'), value: 'left' },
          { label: t('tabs.prop_types.tab_position.options.right', 'Right'), value: 'right' }
        ],
        defaultValue: 'top'
      },
      showBorder: {
        type: 'boolean',
        label: t('tabs.prop_types.show_border.label', 'Show Border'),
        defaultValue: true
      },
      destroyInactiveTabPane: {
        type: 'boolean',
        label: t('tabs.prop_types.destroy_inactive_tab_pane.label', 'Destroy Inactive Tab Pane'),
        defaultValue: false,
        description: t('tabs.prop_types.destroy_inactive_tab_pane.description', 'When on, a tab pane is only rendered after its first activation; inactive panes stay unmounted')
      },
      headerLayout: {
        type: 'string',
        label: t('tabs.prop_types.header_layout.label', 'Header Layout'),
        options: [
          { label: t('tabs.prop_types.header_layout.options.default', 'Default (title above tabs)'), value: 'default' },
          { label: t('tabs.prop_types.header_layout.options.split', 'Split (title left, tabs right)'), value: 'split' }
        ]
      },
      tabBarAlign: {
        type: 'string',
        label: t('tabs.prop_types.tab_bar_align.label', 'Tab Bar Align'),
        options: [
          { label: t('tabs.prop_types.tab_bar_align.options.start', 'Start'), value: 'start' },
          { label: t('tabs.prop_types.tab_bar_align.options.end', 'End'), value: 'end' }
        ],
        description: t('tabs.prop_types.tab_bar_align.description', 'Only applies when header layout is split')
      },
      className: {
        type: 'string',
        label: t('tabs.prop_types.class_name.label', 'Custom Class Name')
      },
      titleFontSize: {
        type: 'number',
        label: t('tabs.prop_types.title_font_size.label', 'Title font size (px)'),
        defaultValue: 14
      },
      labelFontSize: {
        type: 'number',
        label: t('tabs.prop_types.label_font_size.label', 'Tab label font size (px)'),
        defaultValue: 14
      },
      badgeFontSize: {
        type: 'number',
        label: t('tabs.prop_types.badge_font_size.label', 'Badge font size (px)'),
        defaultValue: 13
      },
      items: {
        type: 'array',
        label: t('tabs.prop_types.items.label', 'Tab Items'),
        children: {
          key: {
            type: 'string',
            label: t('tabs.prop_types.items.children.key.label', 'Unique Identifier'),
            required: true
          },
          label: {
            type: 'string',
            label: t('tabs.prop_types.items.children.label.label', 'Tab Label'),
            required: true
          },
          icon: {
            type: 'string',
            label: t('tabs.prop_types.items.children.icon.label', 'Icon (lucide name)')
          },
          badge: {
            type: 'string',
            label: t('tabs.prop_types.items.children.badge.label', 'Badge/Count')
          },
          disabled: {
            type: 'boolean',
            label: t('tabs.prop_types.items.children.disabled.label', 'Disabled'),
            defaultValue: false
          },
          closable: {
            type: 'boolean',
            label: t('tabs.prop_types.items.children.closable.label', 'Closable'),
            defaultValue: false
          }
        }
      }
    },
    mockData: {
      type: 'object',
      label: t('tabs.mock_data.label', 'Mock Data'),
      description: t('tabs.mock_data.description', 'Mock data for development and testing, format is object'),
      defaultValue: {
        defaultActiveKey: 'tab1',
        type: 'line',
        size: 'default',
        items: [
          { key: 'tab1', label: t('tabs.mock_data.default_value.tab_1.label', 'Tab 1') },
          { key: 'tab2', label: t('tabs.mock_data.default_value.tab_2.label', 'Tab 2') }
        ]
      }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'CustomContent',
    title: t('custom_content.title', 'Custom Content'),
    description: t(
      'custom_content.description',
      'Safe custom HTML content with component-scoped CSS; scripts and inline event handlers are not allowed'
    ),
    icon: 'code',
    propTypes: {
      html: {
        type: 'string',
        label: t('custom_content.prop_types.html.label', 'HTML Content'),
        description: t(
          'custom_content.prop_types.html.description',
          'Semantic HTML only. Use custom styles for appearance; scripts, forms and inline events are removed.'
        ),
        required: true,
        defaultValue:
          '<section class="content-section"><h2>Custom content</h2><p>Add semantic content here.</p></section>'
      },
      emptyText: {
        type: 'string',
        label: t('custom_content.prop_types.empty_text.label', 'Empty State Text'),
        defaultValue: t(
          'custom_content.prop_types.empty_text.default_value',
          'Custom content'
        )
      },
      ariaLabel: {
        type: 'string',
        label: t('custom_content.prop_types.aria_label.label', 'Accessibility Label')
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'WorkflowComponent',
    title: t('workflow_component.title', 'AI Workflow'),
    description: t(
      'workflow_component.description',
      'Upload, agent/task processing, human review and result workflow'
    ),
    icon: 'workflow',
    propTypes: {
      agentId: {
        type: 'string',
        label: t('workflow_component.prop_types.agent_id.label', 'Agent ID'),
        description: t(
          'workflow_component.prop_types.agent_id.description',
          'Agent discovered from platform resources. Prefer a task pipeline when one is available.'
        )
      },
      parseTaskId: {
        type: 'string',
        label: t('workflow_component.prop_types.parse_task_id.label', 'Parse Task ID')
      },
      saveTaskId: {
        type: 'string',
        label: t('workflow_component.prop_types.save_task_id.label', 'Save Task ID')
      },
      fileInput: {
        type: 'object',
        label: t('workflow_component.prop_types.file_input.label', 'File Input Mapping'),
        defaultValue: {},
        children: {
          urlNode: { type: 'string', label: 'URL node' },
          urlPort: { type: 'string', label: 'URL port' },
          metaNode: { type: 'string', label: 'Metadata node' },
          metaPort: { type: 'string', label: 'Metadata port' }
        }
      },
      saveInput: {
        type: 'object',
        label: t('workflow_component.prop_types.save_input.label', 'Save Input Mapping'),
        defaultValue: {},
        children: {
          recordNode: { type: 'string', label: 'Record node' },
          recordPort: { type: 'string', label: 'Record port' }
        }
      },
      steps: {
        type: 'array',
        label: t('workflow_component.prop_types.steps.label', 'Workflow Steps'),
        itemType: 'object',
        required: true,
        defaultValue: [
          {
            id: 'upload',
            title: 'Upload',
            description: 'Upload a file for processing',
            component: 'upload',
            config: {
              upload: {
                accept: 'image/*,.pdf',
                maxSize: 10485760,
                preview: true
              }
            }
          },
          {
            id: 'proposal',
            title: 'Review',
            description: 'Review the structured result',
            component: 'proposal',
            config: {
              proposal: {
                renderer: 'form',
                rendererConfig: {
                  type: 'form',
                  form: {
                    schema: { type: 'object', properties: {} },
                    layout: 'vertical'
                  }
                },
                actions: [
                  { id: 'approve', label: 'Approve', variant: 'primary', action: 'approve' }
                ],
                editable: true
              }
            }
          },
          {
            id: 'result',
            title: 'Complete',
            description: 'Processing result',
            component: 'result',
            config: {
              result: {
                displayFormat: 'json',
                showCopy: true,
                successMessage: 'Completed'
              }
            }
          }
        ]
      },
      useMockData: {
        type: 'boolean',
        label: t('workflow_component.prop_types.use_mock_data.label', 'Use Mock Data'),
        defaultValue: false
      },
      mockData: {
        type: 'object',
        label: t('workflow_component.prop_types.mock_data.label', 'Mock Data'),
        defaultValue: {}
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'Typography',
    title: t('typography.title', 'Typography'),
    description: t('typography.description', 'For displaying text content, supports multiple styles'),
    icon: 'text',
    propTypes: {
      type: {
        type: 'string',
        label: t('typography.prop_types.type.label', 'Type'),
        required: true,
        defaultValue: 'paragraph',
        options: [
          { label: t('typography.prop_types.type.options.paragraph', 'Paragraph'), value: 'paragraph' },
          { label: t('typography.prop_types.type.options.title', 'Title'), value: 'title' },
          { label: t('typography.prop_types.type.options.text', 'Text'), value: 'text' },
          { label: t('typography.prop_types.type.options.blockquote', 'Blockquote'), value: 'blockquote' }
        ]
      },
      content: { type: 'string', label: t('typography.prop_types.content.label', 'Content'), required: true, defaultValue: t('typography.prop_types.content.default_value', 'Text Content') },
      contentSegments: {
        type: 'object',
        label: t('typography.prop_types.content_segments.label', 'Content segments'),
        description: t('typography.prop_types.content_segments.description', 'Optional: inline segments with colors and parameter bindings; when non-empty, overrides plain content at runtime.'),
        defaultValue: []
      },
      level: {
        type: 'number',
        label: t('typography.prop_types.level.label', 'Title Level'),
        defaultValue: 1,
        options: [
          { label: 'H1', value: 1 },
          { label: 'H2', value: 2 },
          { label: 'H3', value: 3 },
          { label: 'H4', value: 4 },
          { label: 'H5', value: 5 },
          { label: 'H6', value: 6 }
        ]
      }
    },
    mockData: {
      type: 'object',
      label: t('typography.mock_data.label', 'Mock Data'),
      description: t('typography.mock_data.description', 'Mock data for development and testing, format is object'),
      defaultValue: {
        type: 'paragraph',
        content: t('typography.mock_data.default_value.content', 'This is an example text'),
        level: 1,
        contentSegments: [
          { kind: 'text', value: t('typography.mock_data.default_value.segment_static', 'Total: ') },
          {
            kind: 'parameter',
            source: 'demoTypographyParam',
            color: '#15803d',
            fallback: '—'
          }
        ],
        demoTypographyParam: '42'
      }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'Card',
    title: t('card.title', 'Card'),
    description: t('card.description', 'For displaying content blocks, supports title and content'),
    icon: 'square',
    propTypes: {
      title: { type: 'string', label: t('card.prop_types.title.label', 'Title'), defaultValue: t('card.prop_types.title.default_value', 'Card Title') },
      content: { type: 'string', label: t('card.prop_types.content.label', 'Content'), defaultValue: t('card.prop_types.content.default_value', 'Card Content') },
      titleToContentGap: {
        type: 'string',
        label: t('card.prop_types.title_to_content_gap.label', 'Title to Content Gap'),
        description: t('card.prop_types.title_to_content_gap.description', 'Vertical spacing between card title and content, e.g. 8 or 12px')
      }
    },
    mockData: {
      type: 'object',
      label: t('card.mock_data.label', 'Mock Data'),
      description: t('card.mock_data.description', 'Mock data for development and testing, format is object'),
      defaultValue: {
        title: t('card.mock_data.default_value.title', 'Card Title'),
        content: t('card.mock_data.default_value.content', 'Card Content')
      }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'HeroCard',
    title: t('hero_card.title_component', 'Hero Card'),
    description: t('hero_card.description', 'Gradient KPI hero card with configurable rows'),
    icon: 'sparkles',
    propTypes: {
      shell: { type: 'string', label: t('hero_card.shell', 'Shell'), defaultValue: 'gradient' },
      cardWidth: { type: 'string', label: t('hero_card.card_width', 'Card width'), defaultValue: 'full' },
      cardPerRow: {
        type: 'boolean',
        label: t('hero_card.card_per_row', 'Card per row'),
        defaultValue: false,
        description: t('hero_card.card_per_row_description', 'Render one card per datasource row (N rows -> N sibling cards) instead of only the first row')
      },
      rows: {
        type: 'array',
        label: t('hero_card.rows', 'Rows'),
        defaultValue: [
          { type: 'text', field: '', text: 'Member Sales Share', size: 'sm' },
          { type: 'metric', field: 'member_sales_share_pct', format: 'percent', label: '' },
          { type: 'progress', field: 'member_sales_share_pct', max: 100 },
        ],
      },
      banner: {
        type: 'object',
        label: t('hero_card.banner', 'Banner'),
        description: t('hero_card.banner_description', 'Top banner config (imageField/colorField/emojiField/colorMap/emojiMap/fallbackColor/fallbackEmoji/height/imageFit/imageBg)')
      },
      gradientPreset: {
        type: 'string',
        label: t('hero_card.gradient_preset', 'Gradient preset'),
        options: [
          { label: t('hero_card.gradient_preset_indigo_violet', 'Indigo → Violet'), value: 'indigo-violet' },
          { label: t('hero_card.gradient_preset_purple_pink', 'Purple → Pink'), value: 'purple-pink' },
          { label: t('hero_card.gradient_preset_sky_blue', 'Sky → Blue'), value: 'sky-blue' },
        ],
        description: t('hero_card.gradient_preset_description', 'Lowest priority: row fields override static colors, which override the preset')
      },
      gradientFrom: {
        type: 'string',
        label: t('hero_card.gradient_from', 'Gradient from (CSS color)'),
        description: t('hero_card.gradient_from_description', 'Custom gradient only applies when both gradientFrom and gradientTo are set')
      },
      gradientTo: {
        type: 'string',
        label: t('hero_card.gradient_to', 'Gradient to (CSS color)')
      },
      gradientFromField: {
        type: 'string',
        label: t('hero_card.gradient_from_field', 'Gradient from field'),
        description: t('hero_card.gradient_from_field_description', 'Row data field holding the gradient start color; highest priority')
      },
      gradientToField: {
        type: 'string',
        label: t('hero_card.gradient_to_field', 'Gradient to field')
      },
      titleFontSize: { type: 'number', label: t('hero_card.title_font_size', 'Title font size (px)'), defaultValue: 18 },
      valueFontSize: { type: 'number', label: t('hero_card.value_font_size', 'Value font size (px)'), defaultValue: 22 },
      labelFontSize: { type: 'number', label: t('hero_card.label_font_size', 'Label font size (px)'), defaultValue: 13 },
      numberFontSize: { type: 'number', label: t('hero_card.number_font_size', 'Number font size (px)'), defaultValue: 14 },
      badgeFontSize: { type: 'number', label: t('hero_card.badge_font_size', 'Badge font size (px)'), defaultValue: 13 },
    },
    mockData: {
      type: 'object',
      label: t('hero_card.mock_data.label', 'Mock Data'),
      description: t('hero_card.mock_data.description', 'Single-row mock data for hero card'),
      defaultValue: [
        {
          promo_share_pct: 34.2,
          promo_sales_amount: 98000,
          mom_promo_pct: 6.8,
          promo_footer_left: 'Promo Sales 34.2%',
          promo_footer_right: 'Regular Sales 65.8%',
          member_sales_share_pct: 64.2,
          store_name: t('hero_card.mock_data.default_value.store_name', 'Sanlitun Store, Beijing'),
          region: t('hero_card.mock_data.default_value.region', 'North China'),
          sales_wan: 4.5,
          achievement_pct: 91,
          achievement_label: 'Target Achievement 91%',
          done_count: 470,
          task_total: 600,
          task_footer: '470 / 600',
        },
      ],
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'NavTile',
    title: t('nav_tile.title_component', 'Nav Tile'),
    description: t('nav_tile.description', 'Compact navigation entry cards with chevron links'),
    icon: 'external-link',
    propTypes: {
      columns: {
        type: 'number',
        label: t('nav_tile.columns', 'Columns per row'),
        defaultValue: 2,
      },
      gap: {
        type: 'number',
        label: t('nav_tile.gap', 'Gap (px)'),
        defaultValue: 12,
      },
      itemHeight: {
        type: 'number',
        label: t('nav_tile.item_height', 'Item height (px)'),
        defaultValue: 110,
      },
      variant: {
        type: 'string',
        label: t('nav_tile.variant', 'Variant'),
        defaultValue: 'default',
      },
      showArrow: {
        type: 'boolean',
        label: t('nav_tile.show_arrow', 'Show arrow'),
        defaultValue: true,
      },
      items: {
        type: 'array',
        label: t('nav_tile.items', 'Navigation items'),
        defaultValue: [],
      },
    },
    mockData: {
      type: 'object',
      label: t('nav_tile.mock_data.label', 'Mock Data'),
      description: t('nav_tile.mock_data.description', 'Static navigation tile items'),
      defaultValue: {
        items: [
          {
            id: 'nav-1',
            title: t('nav_tile.mock_data.item_1', 'Ranking'),
            targetPage: '',
          },
          {
            id: 'nav-2',
            title: t('nav_tile.mock_data.item_2', 'Subtasks'),
            targetPage: '',
          },
        ],
      },
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'RingStat',
    title: t('ring_stat.title', 'Ring Stat'),
    description: t('ring_stat.description', 'Progress ring with center value, legend and total (part-of-whole)'),
    icon: 'pie-chart',
    propTypes: {
      title: { type: 'object', label: t('ring_stat.prop.title', 'Title'), defaultValue: { zh: '环形占比', en: 'Ring Stat' } },
      segments: {
        type: 'array', label: t('ring_stat.prop.segments', 'Segments'),
        defaultValue: [
          { key: 'done', label: { zh: '已完成', en: 'Done' }, color: '#10b981', value: 75 },
          { key: 'pending', label: { zh: '待办', en: 'Pending' }, color: '#e2e8f0', value: 25 },
        ],
      },
      primarySegmentKey: { type: 'string', label: t('ring_stat.prop.primary', 'Primary segment'), defaultValue: 'done' },
      matchField: { type: 'string', label: t('ring_stat.prop.match_field', 'Match field'), defaultValue: 'key' },
      valueField: { type: 'string', label: t('ring_stat.prop.value_field', 'Value field'), defaultValue: 'value' },
      ringSize: { type: 'number', label: t('ring_stat.prop.ring_size', 'Ring size'), defaultValue: 112 },
      ringThickness: { type: 'number', label: t('ring_stat.prop.ring_thickness', 'Ring thickness'), defaultValue: 3.5 },
      trackColor: { type: 'string', label: t('ring_stat.prop.track_color', 'Track color'), defaultValue: '#f1f5f9' },
      roundCap: { type: 'boolean', label: t('ring_stat.prop.round_cap', 'Rounded cap'), defaultValue: true },
      centerValue: { type: 'object', label: t('ring_stat.prop.center_value', 'Center value'), defaultValue: { mode: 'ratio' } },
      centerSuffix: { type: 'string', label: t('ring_stat.prop.center_suffix', 'Center suffix'), defaultValue: '%' },
      centerPrecision: { type: 'number', label: t('ring_stat.prop.center_precision', 'Center decimals'), defaultValue: 0 },
      centerTitle: { type: 'object', label: t('ring_stat.prop.center_title', 'Center sub-title'), defaultValue: { zh: '完成率', en: 'Rate' } },
      showLegend: { type: 'boolean', label: t('ring_stat.prop.show_legend', 'Legend'), defaultValue: true },
      legendValueFormat: { type: 'string', label: t('ring_stat.prop.legend_format', 'Legend format'), defaultValue: 'plain' },
      showTotal: { type: 'boolean', label: t('ring_stat.prop.show_total', 'Total row'), defaultValue: true },
      totalLabel: { type: 'object', label: t('ring_stat.prop.total_label', 'Total label'), defaultValue: { zh: '总数', en: 'Total' } },
      totalValue: { type: 'object', label: t('ring_stat.prop.total_value', 'Total value'), defaultValue: { mode: 'sum' } },
      showDataView: { type: 'boolean', label: t('ring_stat.prop.show_data_view', 'Chart/table toggle'), defaultValue: true },
      bordered: { type: 'boolean', label: t('ring_stat.prop.bordered', 'Card border'), defaultValue: true },
      labelField: {
        type: 'string',
        label: t('ring_stat.prop.label_field', 'Label field'),
        defaultValue: 'label',
        description: t('ring_stat.prop.label_field_description', 'Row field used as segment name when segments are not provided')
      },
      tableColumns: {
        type: 'array',
        label: t('ring_stat.prop.table_columns', 'Table view columns'),
        defaultValue: [
          { key: 'label', align: 'left' },
          { key: 'value', align: 'right' }
        ],
        description: t('ring_stat.prop.table_columns_description', 'Columns of the data (table) view: { key, label?, align? }')
      },
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'PublishHistory',
    title: t('publish_history.title', 'Publish History'),
    description: t('publish_history.description', 'Read-only timeline of workbench publish records (version, note, publisher, time)'),
    icon: 'history',
    propTypes: {
      title: { type: 'object', label: t('publish_history.prop.title', 'Title'), defaultValue: { zh: '发布历史', en: 'Publish History' } },
      maxItems: { type: 'number', label: t('publish_history.prop.max_items', 'Items per page (1-50)'), defaultValue: 10 },
      showVersion: { type: 'boolean', label: t('publish_history.prop.show_version', 'Show version badge'), defaultValue: true },
      showPublisher: { type: 'boolean', label: t('publish_history.prop.show_publisher', 'Show publisher'), defaultValue: true },
      timeStyle: {
        type: 'string',
        label: t('publish_history.prop.time_style', 'Time style'),
        defaultValue: 'relative',
        options: [
          { label: t('publish_history.prop.time_relative', 'Relative (x ago)'), value: 'relative' },
          { label: t('publish_history.prop.time_absolute', 'Absolute date-time'), value: 'absolute' },
        ],
      },
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'PublishPreviewEntry',
    title: t('publish_preview_entry.title', 'Preview Entry'),
    description: t('publish_preview_entry.description', 'Read-only card showing unpublished-change status with an entry into preview mode (fixed copy, self-sourced)'),
    icon: 'eye',
    // No text props: all copy is fixed via i18n (renderers.json publish_preview_entry.*)
    propTypes: {},
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'List',
    title: t('list.title', 'List'),
    description: t('list.description', 'For displaying list data'),
    icon: 'list',
    propTypes: {
      title: { type: 'string', label: t('list.prop_types.title.label', 'Title'), defaultValue: t('list.prop_types.title.default_value', 'List') },
      showDataView: {
        type: 'boolean',
        label: t('list.prop_types.show_data_view.label', 'Show data view toggle'),
        defaultValue: false,
        description: t(
          'list.prop_types.show_data_view.description',
          'When on, shows the chart/data toggle in the header (same as Chart components).'
        ),
      },
      items: { type: 'array', label: t('list.prop_types.items.label', 'List Items'), defaultValue: [] },
      columns: {
        type: 'array',
        label: t('list.prop_types.columns.label', 'Columns / slots'),
        defaultValue: [],
        description: t('list.prop_types.columns.description', 'Column/slot config: { dataIndex, title, slotType, render, hidden, slotIndex, showLabel, lineRole }')
      },
      itemLayoutConfig: {
        type: 'object',
        label: t('list.prop_types.item_layout_config.label', 'Item layout config'),
        description: t('list.prop_types.item_layout_config.description', 'Row template & layout: { template: default|ranking|progress-task|product-card, rowClickAction?, rowGap?, itemSpacing? }')
      },
      toolbar: {
        type: 'object',
        label: t('list.prop_types.toolbar.label', 'Toolbar (search / pills)'),
        description: t('list.prop_types.toolbar.description', '{ search?, searchFields?, pills?, pillParam?, searchParam? }')
      },
      split: {
        type: 'boolean',
        label: t('list.prop_types.split.label', 'Row divider'),
        defaultValue: true
      },
      rowKey: {
        type: 'string',
        label: t('list.prop_types.row_key.label', 'Row Key'),
        defaultValue: 'id'
      },
      pageSize: {
        type: 'number',
        label: t('list.prop_types.page_size.label', 'Page Size'),
        defaultValue: 10
      },
      pagination: {
        type: 'boolean',
        label: t('list.prop_types.pagination.label', 'Pagination'),
        defaultValue: false
      },
      statusDots: {
        type: 'array',
        label: t('list.prop_types.status_dots.label', 'Status dots'),
        defaultValue: [],
        description: t('list.prop_types.status_dots.description', 'Per-row status dots: { field, eq?, color? }')
      },
      showRefresh: {
        type: 'boolean',
        label: t('list.prop_types.show_refresh.label', 'Show Refresh'),
        defaultValue: true
      },
      highlightRow: {
        type: 'object',
        label: t('list.prop_types.highlight_row.label', 'Highlight row'),
        description: t('list.prop_types.highlight_row.description', '{ field, value?, valueParam?, memberField?, badge? }')
      },
      titleFontSize: { type: 'number', label: t('list.prop_types.title_font_size.label', 'Title font size (px)'), defaultValue: 16 },
      valueFontSize: { type: 'number', label: t('list.prop_types.value_font_size.label', 'Value font size (px)'), defaultValue: 14 },
      labelFontSize: { type: 'number', label: t('list.prop_types.label_font_size.label', 'Label font size (px)'), defaultValue: 13 },
      badgeFontSize: { type: 'number', label: t('list.prop_types.badge_font_size.label', 'Badge font size (px)'), defaultValue: 12 }
    },
    mockData: {
      type: 'object',
      label: t('list.mock_data.label', 'Mock Data'),
      description: t('list.mock_data.description', 'Mock data for development and testing, format is object'),
      defaultValue: {
        title: t('list.mock_data.default_value.title', 'List Title'),
        items: [
          { id: 1, text: t('list.mock_data.default_value.items.item_1', 'List Item 1') },
          { id: 2, text: t('list.mock_data.default_value.items.item_2', 'List Item 2') }
        ]
      }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'TaskInput',
    title: t('task_input.title', 'Task Input'),
    description: t('task_input.description', 'Input form component for executing tasks'),
    icon: 'play',
    propTypes: {
      taskId: {
        type: 'string',
        label: t('task_input.prop_types.task_id.label', 'Task ID'),
        required: true,
        description: t('task_input.prop_types.task_id.description', 'Unique identifier of the task to execute')
      },
      title: {
        type: 'string',
        label: t('task_input.prop_types.title.label', 'Component Title'),
        defaultValue: t('task_input.prop_types.title.default_value', 'Task Execution'),
        description: t('task_input.prop_types.title.description', 'Title displayed at the top of the component')
      },
      description: {
        type: 'string',
        label: t('task_input.prop_types.description.label', 'Component Description'),
        defaultValue: t('task_input.prop_types.description.default_value', 'Please fill in task parameters and execute'),
        description: t('task_input.prop_types.description.description', 'Description text displayed below the component title')
      },
      showTitle: {
        type: 'boolean',
        label: t('task_input.prop_types.show_title.label', 'Show Title'),
        defaultValue: true,
        description: t('task_input.prop_types.show_title.description', 'Whether to show component title')
      },
      showDescription: {
        type: 'boolean',
        label: t('task_input.prop_types.show_description.label', 'Show Description'),
        defaultValue: true,
        description: t('task_input.prop_types.show_description.description', 'Whether to show component description')
      },
      autoSubmit: {
        type: 'boolean',
        label: t('task_input.prop_types.auto_submit.label', 'Auto Submit'),
        defaultValue: false,
        description: t('task_input.prop_types.auto_submit.description', 'Automatically submit task when all required parameters are filled')
      },
      submitButtonText: {
        type: 'string',
        label: t('task_input.prop_types.submit_button_text.label', 'Submit Button Text'),
        defaultValue: t('task_input.prop_types.submit_button_text.default_value', 'Execute Task'),
        description: t('task_input.prop_types.submit_button_text.description', 'Text displayed on the submit button')
      },
      showOptionalInputs: {
        type: 'boolean',
        label: t('task_input.prop_types.show_optional_inputs.label', 'Show Optional Inputs by Default'),
        defaultValue: false,
        description: t('task_input.prop_types.show_optional_inputs.description', 'Whether to expand and show optional parameters by default')
      },
      compact: {
        type: 'boolean',
        label: t('task_input.prop_types.compact.label', 'Compact Mode'),
        defaultValue: false,
        description: t('task_input.prop_types.compact.description', 'Use compact layout style')
      },
      useMockData: {
        type: 'boolean',
        label: t('task_input.prop_types.use_mock_data.label', 'Enable Mock Mode'),
        defaultValue: false,
        description: t('task_input.prop_types.use_mock_data.description', 'When enabled, use mock data instead of real backend service')
      },
      mockFileData: {
        type: 'object',
        label: t('task_input.prop_types.mock_file_data.label', 'Mock File Data'),
        defaultValue: {
          enabled: true,
          files: []
        },
        description: t('task_input.prop_types.mock_file_data.description', 'Configure mock file data for testing file upload functionality')
      }
    },
    mockData: {
      type: 'object',
      label: t('task_input.mock_data.label', 'Mock Data'),
      description: t('task_input.mock_data.description', 'Mock data for development and testing'),
      defaultValue: {
        taskId: 'sample-task-id',
        title: t('task_input.mock_data.default_value.title', 'Sample Task'),
        description: t('task_input.mock_data.default_value.description', 'This is a sample task input component'),
        showTitle: true,
        showDescription: true,
        autoSubmit: false,
        submitButtonText: t('task_input.mock_data.default_value.submit_button_text', 'Execute Task'),
        showOptionalInputs: false,
        compact: false,
        useMockData: false,
        mockFileData: {
          enabled: true,
          files: [
            {
              name: 'sample-document.pdf',
              size: 1024000,
              type: 'application/pdf',
              content: t('task_input.mock_data.default_value.mock_file_data.files.sample_document.content', 'This is mock PDF document content.\n\nDocument contains the following information:\n- Project Overview\n- Technical Specifications\n- Implementation Plan\n- Risk Assessment'),
              url: '/mock-files/sample-document.pdf',
              lastModified: new Date().toISOString()
            },
            {
              name: 'data.csv',
              size: 512000,
              type: 'text/csv',
              content: 'name,age,city,department\nJohn,25,New York,Engineering\nJane,30,London,Marketing\nBob,35,Tokyo,Sales\nAlice,28,Paris,Design',
              url: '/mock-files/data.csv',
              lastModified: new Date().toISOString()
            }
          ]
        }
      }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'ServiceDeskReporter',
    title: t('service_desk_reporter.title', 'Service Desk Reporter'),
    description: t('service_desk_reporter.description', 'Submit dashboard and store IT issues to an installed Service Desk GeniApp'),
    icon: 'life-buoy',
    propTypes: {
      applicationId: { type: 'string', label: 'Service Desk application ID', required: true },
      intakeDatasourceId: { type: 'string', label: 'Intake configuration datasource', required: true },
      submitDatasourceId: { type: 'string', label: 'Ticket submission datasource', required: true },
      myTicketsDatasourceId: { type: 'string', label: 'Requester tickets datasource' },
      requesterDetailDatasourceId: { type: 'string', label: 'Requester ticket detail datasource' },
      addActivityDatasourceId: { type: 'string', label: 'Requester public reply datasource' },
      requesterActionDatasourceId: { type: 'string', label: 'Requester resolution/reopen datasource' },
      title: { type: 'string', label: 'Title', defaultValue: t('service_desk_reporter.prop_types.title.default_value', 'Report a Problem') },
      description: { type: 'string', label: 'Description', defaultValue: t('service_desk_reporter.prop_types.description.default_value', 'Report dashboard or store IT issues to the support team.') },
      submitButtonText: { type: 'string', label: 'Submit button text', defaultValue: t('service_desk_reporter.prop_types.submit_button_text.default_value', 'Submit Ticket') },
      showRecentTickets: { type: 'boolean', label: 'Show recent tickets', defaultValue: true },
      allowAttachments: { type: 'boolean', label: 'Allow attachments', defaultValue: true },
      maxFiles: { type: 'number', label: 'Maximum files', defaultValue: 5 },
      maxFileSizeMb: { type: 'number', label: 'Maximum file size (MB)', defaultValue: 10 },
      acceptedFileTypes: { type: 'string', label: 'Accepted file types', defaultValue: 'image/*,.pdf,.txt,.csv,.xlsx' },
      defaultCategoryId: { type: 'string', label: 'Default category ID', defaultValue: '' },
      defaultImpact: { type: 'string', label: 'Default impact', defaultValue: 'medium', options: [{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] },
      defaultUrgency: { type: 'string', label: 'Default urgency', defaultValue: 'medium', options: [{ label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }] },
      contextParams: {
        type: 'array',
        label: 'Context parameter mappings',
        defaultValue: [
          { pageParam: 'storeId', contextKey: 'store_id' },
          { pageParam: 'brand', contextKey: 'brand' },
          { pageParam: 'dashboardId', contextKey: 'dashboard_id' },
          { pageParam: 'widgetId', contextKey: 'widget_id' }
        ]
      },
      // Deprecated: kept so existing pages continue to resolve their context via the fallback logic.
      contextStoreParam: { type: 'string', label: 'Store context parameter (deprecated, use contextParams)', defaultValue: 'storeId' },
      contextBrandParam: { type: 'string', label: 'Brand context parameter (deprecated, use contextParams)', defaultValue: 'brand' },
      contextDashboardParam: { type: 'string', label: 'Dashboard context parameter (deprecated, use contextParams)', defaultValue: 'dashboardId' },
      contextWidgetParam: { type: 'string', label: 'Widget context parameter (deprecated, use contextParams)', defaultValue: 'widgetId' }
    },
    createComponent: function () { return createComponent(this.type, this.propTypes); }
  },
  {
    type: 'Tree',
    title: t('tree.title', 'Tree Structure'),
    description: t('tree.description', 'For displaying hierarchical data, supports expand/collapse, search, CRUD operations'),
    icon: 'tree-pine',
    propTypes: {
      title: {
        type: 'string',
        label: t('tree.prop_types.title.label', 'Component Title'),
        defaultValue: t('tree.prop_types.title.default_value', 'Tree Structure'),
        description: t('tree.prop_types.title.description', 'Title displayed at the top of the component')
      },

      key: {
        type: 'string',
        label: t('tree.prop_types.key.label', 'Unique Identifier Field'),
        defaultValue: 'id',
        description: t('tree.prop_types.key.description', 'Field name used as unique identifier for nodes in data')
      },
      label: {
        type: 'string',
        label: t('tree.prop_types.label.label', 'Display Name Field'),
        defaultValue: 'name',
        description: t('tree.prop_types.label.description', 'Field name used as display name for nodes in data')
      },
      parentKey: {
        type: 'string',
        label: t('tree.prop_types.parent_key.label', 'Parent Field'),
        defaultValue: 'parentId',
        description: t('tree.prop_types.parent_key.description', 'Field name used as parent node identifier in data')
      },
      sortKey: {
        type: 'string',
        label: t('tree.prop_types.sort_key.label', 'Sort Field'),
        defaultValue: 'sort',
        description: t('tree.prop_types.sort_key.description', 'Field name used for sorting sibling nodes in data')
      },

      height: {
        type: 'number',
        label: t('tree.prop_types.height.label', 'Container Height'),
        defaultValue: 400,
        description: t('tree.prop_types.height.description', 'Height of tree container in pixels')
      },
      searchable: {
        type: 'boolean',
        label: t('tree.prop_types.searchable.label', 'Enable Search'),
        defaultValue: true,
        description: t('tree.prop_types.searchable.description', 'Whether to show search box, supports node name search')
      },
      showIcon: {
        type: 'boolean',
        label: t('tree.prop_types.show_icon.label', 'Show Icon'),
        defaultValue: true,
        description: t('tree.prop_types.show_icon.description', 'Whether to show folder and file icons')
      },
      showCount: {
        type: 'boolean',
        label: t('tree.prop_types.show_count.label', 'Show Child Count'),
        defaultValue: true,
        description: t('tree.prop_types.show_count.description', 'Whether to show child node count next to parent nodes')
      },
      defaultExpandLevel: {
        type: 'number',
        label: t('tree.prop_types.default_expand_level.label', 'Default Expand Level'),
        defaultValue: 1,
        description: t('tree.prop_types.default_expand_level.description', 'Number of levels to automatically expand on initial load (0-5)'),
        options: [
          { label: t('tree.prop_types.default_expand_level.options.none', 'No Expand'), value: 0 },
          { label: t('tree.prop_types.default_expand_level.options.level_1', 'Expand Level 1'), value: 1 },
          { label: t('tree.prop_types.default_expand_level.options.level_2', 'Expand Level 2'), value: 2 },
          { label: t('tree.prop_types.default_expand_level.options.level_3', 'Expand Level 3'), value: 3 },
          { label: t('tree.prop_types.default_expand_level.options.level_4', 'Expand Level 4'), value: 4 },
          { label: t('tree.prop_types.default_expand_level.options.all', 'Expand All'), value: 5 }
        ]
      },

      addable: {
        type: 'boolean',
        label: t('tree.prop_types.addable.label', 'Allow Add'),
        defaultValue: true,
        description: t('tree.prop_types.addable.description', 'Whether to show add node action button')
      },
      editable: {
        type: 'boolean',
        label: t('tree.prop_types.editable.label', 'Allow Edit'),
        defaultValue: true,
        description: t('tree.prop_types.editable.description', 'Whether to show edit node action button')
      },
      deletable: {
        type: 'boolean',
        label: t('tree.prop_types.deletable.label', 'Allow Delete'),
        defaultValue: true,
        description: t('tree.prop_types.deletable.description', 'Whether to show delete node action button')
      },

      insertDatasetConfig: {
        type: 'object',
        label: t('tree.prop_types.insert_dataset_config.label', 'Add Node Configuration'),
        description: t('tree.prop_types.insert_dataset_config.description', 'Configure data insertion method when adding nodes'),
        properties: {
          targetDatasetId: {
            type: 'string',
            label: t('tree.prop_types.insert_dataset_config.properties.target_dataset_id.label', 'Target Dataset ID'),
            description: t('tree.prop_types.insert_dataset_config.properties.target_dataset_id.description', 'Target dataset for inserting new node data')
          },
          insertFields: {
            type: 'object',
            label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.label', 'Insert Field Mapping'),
            description: t('tree.prop_types.insert_dataset_config.properties.insert_fields.description', 'Configure data source for each field'),
            additionalProperties: {
              type: 'object',
              label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.field_entry.label', 'Field mapping'),
              properties: {
                source: {
                  type: 'string',
                  enum: ['column', 'static', 'parameter', 'computed', 'field', 'datasource'],
                  label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.additional_properties.properties.source.label', 'Data Source')
                },
                value: {
                  type: 'string',
                  label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.additional_properties.properties.value.label', 'Value')
                },
                required: {
                  type: 'boolean',
                  label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.additional_properties.properties.required.label', 'Required')
                },
                fieldType: {
                  type: 'string',
                  enum: ['VARCHAR', 'INT32', 'FLOAT', 'BOOL', 'JSON', 'ARRAY'],
                  label: t('tree.prop_types.insert_dataset_config.properties.insert_fields.additional_properties.properties.field_type.label', 'Field Type')
                }
              }
            }
          }
        }
      },

      updateDatasetConfig: {
        type: 'object',
        label: t('tree.prop_types.update_dataset_config.label', 'Edit Node Configuration'),
        description: t('tree.prop_types.update_dataset_config.description', 'Configure data update method when editing nodes'),
        properties: {
          targetDatasetId: {
            type: 'string',
            label: t('tree.prop_types.update_dataset_config.properties.target_dataset_id.label', 'Target Dataset ID'),
            description: t('tree.prop_types.update_dataset_config.properties.target_dataset_id.description', 'Target dataset for updating edited node data')
          },
          updateFields: {
            type: 'object',
            label: t('tree.prop_types.update_dataset_config.properties.update_fields.label', 'Update Field Mapping'),
            description: t('tree.prop_types.update_dataset_config.properties.update_fields.description', 'Configure data source for each field'),
            additionalProperties: {
              type: 'object',
              label: t('tree.prop_types.update_dataset_config.properties.update_fields.field_entry.label', 'Field mapping'),
              properties: {
                source: {
                  type: 'string',
                  enum: ['column', 'static', 'parameter', 'computed', 'field', 'datasource'],
                  label: t('tree.prop_types.update_dataset_config.properties.update_fields.additional_properties.properties.source.label', 'Data Source')
                },
                value: {
                  type: 'string',
                  label: t('tree.prop_types.update_dataset_config.properties.update_fields.additional_properties.properties.value.label', 'Value')
                },
                required: {
                  type: 'boolean',
                  label: t('tree.prop_types.update_dataset_config.properties.update_fields.additional_properties.properties.required.label', 'Required')
                },
                fieldType: {
                  type: 'string',
                  enum: ['VARCHAR', 'INT32', 'FLOAT', 'BOOL', 'JSON', 'ARRAY'],
                  label: t('tree.prop_types.update_dataset_config.properties.update_fields.additional_properties.properties.field_type.label', 'Field Type')
                }
              }
            }
          },
          updateConditions: {
            type: 'object',
            label: t('tree.prop_types.update_dataset_config.properties.update_conditions.label', 'Update Condition Mapping'),
            description: t('tree.prop_types.update_dataset_config.properties.update_conditions.description', 'Configure field mapping for update conditions'),
            additionalProperties: {
              type: 'object',
              label: t('tree.prop_types.update_dataset_config.properties.update_conditions.field_entry.label', 'Condition mapping'),
              properties: {
                source: {
                  type: 'string',
                  enum: ['column', 'static', 'parameter', 'computed', 'field', 'datasource'],
                  label: t('tree.prop_types.update_dataset_config.properties.update_conditions.additional_properties.properties.source.label', 'Data Source')
                },
                value: {
                  type: 'string',
                  label: t('tree.prop_types.update_dataset_config.properties.update_conditions.additional_properties.properties.value.label', 'Value')
                },
                fieldType: {
                  type: 'string',
                  enum: ['VARCHAR', 'INT32', 'FLOAT', 'BOOL', 'JSON', 'ARRAY'],
                  label: t('tree.prop_types.update_dataset_config.properties.update_conditions.additional_properties.properties.field_type.label', 'Field Type')
                }
              }
            }
          }
        }
      }
    },
    dataSourceTypes: {
      dataset: {
        label: t('tree.data_source_types.dataset.label', 'Dataset'),
        description: t('tree.data_source_types.dataset.description', 'Get tree data from dataset'),
        required: false,
        children: {
          datasetId: {
            type: 'string',
            label: t('tree.data_source_types.dataset.children.dataset_id.label', 'Dataset ID'),
            required: true,
            description: t('tree.data_source_types.dataset.children.dataset_id.description', 'Unique identifier of target dataset')
          },
          outputFields: {
            type: 'array',
            label: t('tree.data_source_types.dataset.children.output_fields.label', 'Output Fields'),
            itemType: 'string',
            defaultValue: ['id', 'name', 'parentId', 'sort'],
            description: t('tree.data_source_types.dataset.children.output_fields.description', 'List of fields to retrieve from dataset')
          },
          filter: {
            type: 'string',
            label: t('tree.data_source_types.dataset.children.filter.label', 'Filter Condition'),
            description: t('tree.data_source_types.dataset.children.filter.description', 'Condition expression for data filtering')
          },
          limit: {
            type: 'number',
            label: t('tree.data_source_types.dataset.children.limit.label', 'Data Limit'),
            defaultValue: 1000,
            description: t('tree.data_source_types.dataset.children.limit.description', 'Maximum number of data records to retrieve')
          }
        }
      }
    },
    mockData: {
      type: 'array',
      label: t('tree.mock_data.label', 'Mock Data'),
      description: t('tree.mock_data.description', 'Mock tree data for development and testing, default uses enterprise organizational structure data'),
      defaultValue: [

        { id: 1, name: t('tree.mock_data.default_value.headquarters.name', 'Tech Group Headquarters'), parentId: null, sort: 1, type: "company", employeeCount: 5000, description: t('tree.mock_data.default_value.headquarters.description', 'Group Headquarters') },

        { id: 10, name: t('tree.mock_data.default_value.departments.tech_center.name', 'Technology Center'), parentId: 1, sort: 1, type: "department", employeeCount: 800, description: t('tree.mock_data.default_value.departments.tech_center.description', 'Responsible for technology R&D') },
        { id: 20, name: t('tree.mock_data.default_value.departments.product_center.name', 'Product Center'), parentId: 1, sort: 2, type: "department", employeeCount: 200, description: t('tree.mock_data.default_value.departments.product_center.description', 'Responsible for product planning') },
        { id: 30, name: t('tree.mock_data.default_value.departments.marketing_center.name', 'Marketing Center'), parentId: 1, sort: 3, type: "department", employeeCount: 150, description: t('tree.mock_data.default_value.departments.marketing_center.description', 'Responsible for marketing') },
        { id: 40, name: t('tree.mock_data.default_value.departments.hr.name', 'Human Resources Department'), parentId: 1, sort: 4, type: "department", employeeCount: 50, description: t('tree.mock_data.default_value.departments.hr.description', 'Responsible for human resources management') },
        { id: 50, name: t('tree.mock_data.default_value.departments.finance.name', 'Finance Department'), parentId: 1, sort: 5, type: "department", employeeCount: 30, description: t('tree.mock_data.default_value.departments.finance.description', 'Responsible for financial management') },

        { id: 101, name: t('tree.mock_data.default_value.sub_departments.frontend.name', 'Frontend Development Department'), parentId: 10, sort: 1, type: "department", employeeCount: 120, description: t('tree.mock_data.default_value.sub_departments.frontend.description', 'Web and mobile development') },
        { id: 102, name: t('tree.mock_data.default_value.sub_departments.backend.name', 'Backend Development Department'), parentId: 10, sort: 2, type: "department", employeeCount: 150, description: t('tree.mock_data.default_value.sub_departments.backend.description', 'Server-side development') },
        { id: 103, name: t('tree.mock_data.default_value.sub_departments.data_center.name', 'Data Center'), parentId: 10, sort: 3, type: "department", employeeCount: 80, description: t('tree.mock_data.default_value.sub_departments.data_center.description', 'Big data and AI') },
        { id: 104, name: t('tree.mock_data.default_value.sub_departments.test_center.name', 'Testing Center'), parentId: 10, sort: 4, type: "department", employeeCount: 60, description: t('tree.mock_data.default_value.sub_departments.test_center.description', 'Quality assurance') },

        { id: 1011, name: t('tree.mock_data.default_value.teams.web_frontend.name', 'Web Frontend Team'), parentId: 101, sort: 1, type: "team", employeeCount: 45, description: t('tree.mock_data.default_value.teams.web_frontend.description', 'PC Web development') },
        { id: 1012, name: t('tree.mock_data.default_value.teams.mobile.name', 'Mobile Team'), parentId: 101, sort: 2, type: "team", employeeCount: 35, description: t('tree.mock_data.default_value.teams.mobile.description', 'iOS/Android development') },
        { id: 1013, name: t('tree.mock_data.default_value.teams.miniprogram.name', 'Mini Program Team'), parentId: 101, sort: 3, type: "team", employeeCount: 25, description: t('tree.mock_data.default_value.teams.miniprogram.description', 'WeChat mini program development') },

        { id: 1021, name: t('tree.mock_data.default_value.teams.business_backend.name', 'Business Backend Team'), parentId: 102, sort: 1, type: "team", employeeCount: 60, description: t('tree.mock_data.default_value.teams.business_backend.description', 'Business logic development') },
        { id: 1022, name: t('tree.mock_data.default_value.teams.base_service.name', 'Base Service Team'), parentId: 102, sort: 2, type: "team", employeeCount: 40, description: t('tree.mock_data.default_value.teams.base_service.description', 'Base service development') },

        { id: 201, name: t('tree.mock_data.default_value.sub_departments.product_planning.name', 'Product Planning Department'), parentId: 20, sort: 1, type: "department", employeeCount: 40, description: t('tree.mock_data.default_value.sub_departments.product_planning.description', 'Product strategy planning') },
        { id: 202, name: t('tree.mock_data.default_value.sub_departments.ux.name', 'User Experience Department'), parentId: 20, sort: 2, type: "department", employeeCount: 35, description: t('tree.mock_data.default_value.sub_departments.ux.description', 'UI/UX design') },

        { id: 2011, name: t('tree.mock_data.default_value.teams.b2b_product.name', 'B2B Product Team'), parentId: 201, sort: 1, type: "team", employeeCount: 20, description: t('tree.mock_data.default_value.teams.b2b_product.description', 'B2B product design') },
        { id: 2012, name: t('tree.mock_data.default_value.teams.b2c_product.name', 'B2C Product Team'), parentId: 201, sort: 2, type: "team", employeeCount: 20, description: t('tree.mock_data.default_value.teams.b2c_product.description', 'B2C product design') }
      ]
    },
    createComponent: function () { 
      const component = createComponent(this.type, this.propTypes);
      const props = (component.props || {}) as Record<string, unknown>;
      (component as unknown as { props: Record<string, unknown> }).props = props;
      props.insertDatasetConfig = {
        targetDatasetId: '',
        insertFields: {}
      };
      props.updateDatasetConfig = {
        targetDatasetId: '',
        updateFields: {},
        updateConditions: {}
      };

      return component;
    }
  },
  {
    type: 'FilterPanel',
    title: t('filter_panel.title', 'Filter Panel'),
    description: t('filter_panel.description', 'For page data filtering, supports dropdown, date range, radio button group, text input, number input and other filter methods, can bind database data source'),
    icon: 'filter',
    propTypes: {
      title: {
        type: 'string',
        label: t('filter_panel.prop_types.title.label', 'Title'),
        defaultValue: t('filter_panel.prop_types.title.default_value', 'Filter Conditions')
      },
      filters: {
        type: 'array',
        label: t('filter_panel.prop_types.filters.label', 'Filter Configuration'),
        defaultValue: [],
        itemType: 'object',
        itemConfig: {
          type: 'object',
          label: t('filter_panel.prop_types.filters.item_config.label', 'Filter Item'),
          children: {
            key: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.key.label', 'Identifier'),
              required: true,
              description: t('filter_panel.prop_types.filters.item_config.children.key.description', 'Unique identifier of filter item, used for component communication')
            },
            type: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.type.label', 'Filter Type'),
              required: true,
              defaultValue: 'select',
              options: [
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.select', 'Dropdown'), value: 'select' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.date_range', 'Date Range'), value: 'dateRange' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.radio', 'Radio Button Group'), value: 'radio' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.text', 'Text Input'), value: 'text' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.number', 'Number Input'), value: 'number' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.tag_input', 'Tag Input'), value: 'tagInput' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.segmented', 'Segmented'), value: 'segmented' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.preset_date_range', 'Preset Date Range'), value: 'presetDateRange' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.pill_select', 'Pill Select'), value: 'pillSelect' },
                { label: t('filter_panel.prop_types.filters.item_config.children.type.options.filter_sheet', 'Filter Sheet'), value: 'filterSheet' }
              ]
            },
            label: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.label.label', 'Label'),
              required: true,
              defaultValue: t('filter_panel.prop_types.filters.item_config.children.label.default_value', 'Filter Item')
            },
            options: {
              type: 'array',
              label: t('filter_panel.prop_types.filters.item_config.children.options.label', 'Option List (Static)'),
              defaultValue: [],
              itemType: 'object',
              itemConfig: {
                type: 'object',
                label: t('filter_panel.prop_types.filters.item_config.children.options.item_config.label', 'Option'),
                children: {
                  label: {
                    type: 'string',
                    label: t('filter_panel.prop_types.filters.item_config.children.options.item_config.children.label.label', 'Display Text'),
                    required: true
                  },
                  value: {
                    type: 'string',
                    label: t('filter_panel.prop_types.filters.item_config.children.options.item_config.children.value.label', 'Option Value'),
                    required: true
                  }
                }
              }
            },
            dataSource: {
              type: 'object',
              label: t('filter_panel.prop_types.filters.item_config.children.data_source.label', 'Data Source Configuration (Dynamic)'),
              defaultValue: {},
              children: {
                datasetId: {
                  type: 'string',
                  label: t('filter_panel.prop_types.filters.item_config.children.data_source.children.dataset_id.label', 'Dataset ID'),
                  description: t('filter_panel.prop_types.filters.item_config.children.data_source.children.dataset_id.description', 'Bind database dataset to dynamically load options')
                },
                valueField: {
                  type: 'string',
                  label: t('filter_panel.prop_types.filters.item_config.children.data_source.children.value_field.label', 'Value Field'),
                  defaultValue: 'value',
                  description: t('filter_panel.prop_types.filters.item_config.children.data_source.children.value_field.description', 'Field name used as option value in dataset')
                },
                labelField: {
                  type: 'string',
                  label: t('filter_panel.prop_types.filters.item_config.children.data_source.children.label_field.label', 'Label Field'),
                  defaultValue: 'label',
                  description: t('filter_panel.prop_types.filters.item_config.children.data_source.children.label_field.description', 'Field name used as option label in dataset')
                }
              }
            },
            multiple: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.multiple.label', 'Support Multiple Selection'),
              defaultValue: false,
              description: t('filter_panel.prop_types.filters.item_config.children.multiple.description', 'Whether to support multiple selection (only for dropdown and radio button group)')
            },
            quickSelect: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.quick_select.label', 'Show Quick Select'),
              defaultValue: true,
              description: t('filter_panel.prop_types.filters.item_config.children.quick_select.description', 'Whether date range shows quick select buttons (Today, Yesterday, Last 7 Days, Last 30 Days)')
            },
            quickSelectItems: {
              type: 'object',
              label: t('filter_panel.prop_types.filters.item_config.children.quick_select_items.label', 'Quick select button visibility'),
              defaultValue: {},
              description: t(
                'filter_panel.prop_types.filters.item_config.children.quick_select_items.description',
                'Per-preset visibility: set a key (today, yesterday, yesterdayToToday, last7days, last30days) to false to hide that button'
              )
            },
            useSpecifiedTime: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.use_specified_time.label', 'Specified time (HMS)'),
              defaultValue: false,
              description: t(
                'filter_panel.prop_types.filters.item_config.children.use_specified_time.description',
                'When enabled, parameters use the configured time-of-day on the selected dates; default range presets and calendar are unchanged. When off, use 00:00:00 and 23:59:59 on those dates.'
              )
            },
            showTimePicker: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.show_time_picker.label', 'Show time picker (HMS)'),
              defaultValue: false,
              description: t(
                'filter_panel.prop_types.filters.item_config.children.show_time_picker.description',
                'Controls HMS in the picker UI. When Specified time is on and this is off, parameters still use configured start/end times on selected dates.'
              )
            },
            specifiedStartTime: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.specified_start_time.label', 'Start time of day'),
              defaultValue: '',
              description: t(
                'filter_panel.prop_types.filters.item_config.children.specified_start_time.description',
                'Time only (HH:mm or HH:mm:ss) applied to the range start date when emitting parameters'
              )
            },
            specifiedEndTime: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.specified_end_time.label', 'End time of day'),
              defaultValue: '',
              description: t(
                'filter_panel.prop_types.filters.item_config.children.specified_end_time.description',
                'Time only (HH:mm or HH:mm:ss) applied to the range end date when emitting parameters'
              )
            },
            buttons: {
              type: 'array',
              label: t('filter_panel.prop_types.filters.item_config.children.buttons.label', 'Button Configuration (Radio Button Group)'),
              defaultValue: [],
              itemType: 'object',
              itemConfig: {
                type: 'object',
                label: t('filter_panel.prop_types.filters.item_config.children.buttons.item_config.label', 'Button'),
                children: {
                  label: {
                    type: 'string',
                    label: t('filter_panel.prop_types.filters.item_config.children.buttons.item_config.children.label.label', 'Button Text'),
                    required: true
                  },
                  value: {
                    type: 'string',
                    label: t('filter_panel.prop_types.filters.item_config.children.buttons.item_config.children.value.label', 'Button Value'),
                    required: true
                  }
                }
              }
            },
            defaultValue: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.default_value.label', 'Default Value'),
              description: t('filter_panel.prop_types.filters.item_config.children.default_value.description', 'Default value of filter item')
            },
            placeholder: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.placeholder.label', 'Placeholder'),
              defaultValue: ''
            },
            displayWidth: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.display_width.label', 'Display Width'),
              defaultValue: '',
              description: t(
                'filter_panel.prop_types.filters.item_config.children.display_width.description',
                'Controls filter item width in renderer (all types supported), for example: 280px / 18rem / 100%'
              )
            },
            maxTags: {
              type: 'number',
              label: t('filter_panel.prop_types.filters.item_config.children.max_tags.label', 'Max Tags'),
              defaultValue: 5,
              description: t('filter_panel.prop_types.filters.item_config.children.max_tags.description', 'Maximum number of tags allowed (only for Tag Input type)')
            },
            keepAtLeastOne: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.keep_at_least_one.label', 'Keep at least one selected'),
              defaultValue: false,
              description: t('filter_panel.prop_types.filters.item_config.children.keep_at_least_one.description', 'Pill Select (multi) only: forbid clearing to zero; clearing falls back to the first option')
            },
            groupCountField: {
              type: 'string',
              label: t('filter_panel.prop_types.filters.item_config.children.group_count_field.label', 'Group count field'),
              defaultValue: '',
              description: t('filter_panel.prop_types.filters.item_config.children.group_count_field.description', 'Pill Select (multi) only: option-row field (e.g. main_store_code) used to dedupe the selection into groups; publishes the distinct count as the numeric page param {componentId}_{key}GroupCount')
            },
            rememberSelection: {
              type: 'boolean',
              label: t('filter_panel.prop_types.filters.item_config.children.remember_selection.label', 'Remember selection'),
              defaultValue: false,
              description: t('filter_panel.prop_types.filters.item_config.children.remember_selection.description', 'Preset Date Range only: persist the committed choice in localStorage and restore it on the next visit')
            },
            updateTime: {
              type: 'object',
              label: t('filter_panel.prop_types.filters.item_config.children.update_time.label', 'Last update time label'),
              description: t('filter_panel.prop_types.filters.item_config.children.update_time.description', 'Preset Date Range only: show the datasource last-update time on the right of the date bar'),
              children: {
                refreshOnQuery: {
                  type: 'boolean',
                  label: t('filter_panel.prop_types.filters.item_config.children.update_time.children.refresh_on_query.label', 'Refresh on query'),
                  defaultValue: false,
                  description: t(
                    'filter_panel.prop_types.filters.item_config.children.update_time.children.refresh_on_query.description',
                    'Refetch the update time every time filter values are committed (a single filter change or clicking Apply in the filter sheet)'
                  )
                }
              }
            }
          }
        }
      },
      presets: {
        type: 'array',
        label: t('filter_panel.prop_types.presets.label', 'Preset Filters'),
        defaultValue: [],
        itemType: 'object',
        itemConfig: {
          type: 'object',
          label: t('filter_panel.prop_types.presets.item_config.label', 'Preset'),
          children: {
            label: {
              type: 'string',
              label: t('filter_panel.prop_types.presets.item_config.children.label.label', 'Preset Name'),
              required: true
            },
            value: {
              type: 'object',
              label: t('filter_panel.prop_types.presets.item_config.children.value.label', 'Preset Value'),
              defaultValue: {},
              description: t('filter_panel.prop_types.presets.item_config.children.value.description', 'Preset filter values, format: { filterKey: filterValue }')
            }
          }
        }
      },
      mobileLayout: {
        type: 'string',
        label: t('filter_panel.prop_types.mobile_layout.label', 'Mobile layout'),
        defaultValue: 'stack',
        options: [
          { label: t('filter_panel.prop_types.mobile_layout.options.stack', 'Stack (one filter per row)'), value: 'stack' },
          { label: t('filter_panel.prop_types.mobile_layout.options.header', 'Header (inline wrapping row)'), value: 'header' }
        ]
      },
      sticky: {
        type: 'boolean',
        label: t('filter_panel.prop_types.sticky.label', 'Sticky panel'),
        defaultValue: false,
        description: t('filter_panel.prop_types.sticky.description', 'Pin the panel to the top of the scrolling page area')
      },
      stickyTop: {
        type: 'string',
        label: t('filter_panel.prop_types.sticky_top.label', 'Sticky top offset'),
        defaultValue: '0px',
        description: t('filter_panel.prop_types.sticky_top.description', 'CSS offset used when sticky is on, e.g. 0px or 3rem')
      },
      cache: {
        type: 'object',
        label: t('filter_panel.prop_types.cache.label', 'Option caching'),
        description: t('filter_panel.prop_types.cache.description', '{ enabled?, ttlMs?, stampDatasourceId? } — cache filter options (memory + sessionStorage) to avoid re-querying on every open'),
        children: {
          enabled: {
            type: 'boolean',
            label: t('filter_panel.prop_types.cache.children.enabled.label', 'Enabled'),
            defaultValue: false
          }
        }
      },
      layout: {
        type: 'object',
        label: t('filter_panel.prop_types.layout.label', 'Custom layout (rows)'),
        description: t('filter_panel.prop_types.layout.description', '{ rows: [{ keys: string[], grow?: string[] }] } — filters not listed are appended in a final row; overrides mobile layout')
      },
      partition: {
        type: 'object',
        label: t('filter_panel.prop_types.partition.label', 'Partition (value isolation)'),
        description: t('filter_panel.prop_types.partition.description', '{ key: filterKey } — filters marked as partitioned keep separate values per value of this filter'),
        children: {
          key: {
            type: 'string',
            label: t('filter_panel.prop_types.partition.children.key.label', 'Partition filter key')
          }
        }
      },
      roleFilterRules: {
        type: 'object',
        label: t('filter_panel.prop_types.role_filter_rules.label', 'Role-based filter rules'),
        description: t('filter_panel.prop_types.role_filter_rules.description', '{ roles?, selectAllFilters?, hideFilters?, forceValues?, restrictOptions?, pinnedChipsFilters? } — UX-only gating for users with the selected application roles')
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },

  {
    type: 'EChartsChart',
    title: t('echarts_chart.title', 'ECharts Chart'),
    description: t('echarts_chart.description', 'Advanced ECharts visualization including funnel, gauge, treemap, wordcloud, sankey, scatter and more'),
    icon: 'trending-up',
    propTypes: {
      title: {
        type: 'string',
        label: t('echarts_chart.prop_types.title.label', 'Title'),
        defaultValue: t('echarts_chart.prop_types.title.default_value', 'Chart')
      },
      titleFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.title_font_size.label', 'Title font size (px)'),
        defaultValue: undefined
      },
      chartType: {
        type: 'string',
        label: t('echarts_chart.prop_types.chart_type.label', 'Chart Type'),
        required: true,
        defaultValue: 'funnel',
        options: [
          { label: t('echarts_chart.prop_types.chart_type.options.funnel', 'Funnel'), value: 'funnel' },
          { label: t('echarts_chart.prop_types.chart_type.options.gauge', 'Gauge'), value: 'gauge' },
          {
            label: t('echarts_chart.prop_types.chart_type.options.gauge_progress_ring', 'Ring progress gauge'),
            value: 'gaugeProgressRing'
          },
          { label: t('echarts_chart.prop_types.chart_type.options.pie', 'Ring chart (Pie)'), value: 'pie' },
          { label: t('echarts_chart.prop_types.chart_type.options.bar', 'Bar chart'), value: 'bar' },
          { label: t('echarts_chart.prop_types.chart_type.options.horizontal_bar', 'Horizontal bar chart'), value: 'horizontalBar' },
          { label: t('echarts_chart.prop_types.chart_type.options.treemap', 'Treemap'), value: 'treemap' },
          { label: t('echarts_chart.prop_types.chart_type.options.sankey', 'Sankey'), value: 'sankey' },
          { label: t('echarts_chart.prop_types.chart_type.options.wordcloud', 'Word Cloud'), value: 'wordcloud' },
          { label: t('echarts_chart.prop_types.chart_type.options.scatter', 'Scatter'), value: 'scatter' },
          { label: t('echarts_chart.prop_types.chart_type.options.line', 'Line'), value: 'line' },
          { label: t('echarts_chart.prop_types.chart_type.options.multi_line', 'Multi-series line'), value: 'multiLine' },
          { label: t('echarts_chart.prop_types.chart_type.options.heatmap', 'Heatmap'), value: 'heatmap' },
          { label: t('echarts_chart.prop_types.chart_type.options.cluster', 'Cluster chart'), value: 'cluster' }
        ]
      },
      height: {
        type: 'number',
        label: t('echarts_chart.prop_types.height.label', 'Height'),
        defaultValue: 400
      },
      data: {
        type: 'array',
        label: t('echarts_chart.prop_types.data.label', 'Chart Data'),
        defaultValue: []
      },
      nameField: {
        type: 'string',
        label: t('echarts_chart.prop_types.name_field.label', 'Name Field'),
        defaultValue: 'name'
      },
      valueField: {
        type: 'string',
        label: t('echarts_chart.prop_types.value_field.label', 'Value Field'),
        defaultValue: 'value'
      },
      categoryField: {
        type: 'string',
        label: t('echarts_chart.prop_types.category_field.label', 'Category Field'),
        defaultValue: 'category'
      },

      funnelSort: {
        type: 'string',
        label: t('echarts_chart.prop_types.funnel_sort.label', 'Funnel Sort'),
        defaultValue: 'descending',
        options: [
          { label: t('echarts_chart.prop_types.funnel_sort.options.descending', 'Descending'), value: 'descending' },
          { label: t('echarts_chart.prop_types.funnel_sort.options.ascending', 'Ascending'), value: 'ascending' },
          { label: t('echarts_chart.prop_types.funnel_sort.options.none', 'None'), value: 'none' }
        ]
      },
      funnelGap: {
        type: 'number',
        label: t('echarts_chart.prop_types.funnel_gap.label', 'Funnel Gap'),
        defaultValue: 2
      },
      horizontalBarPercentBaseField: {
        type: 'string',
        label: t(
          'echarts_chart.prop_types.horizontal_bar_percent_base_field.label',
          'Percent base field (column name, value ÷ this field per row)'
        ),
        defaultValue: undefined
      },
      horizontalBarShowPercent: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.horizontal_bar_show_percent.label', 'Show value and % (value ÷ base field) on bar'),
        defaultValue: true
      },
      barValueDisplayMode: {
        type: 'string',
        label: t('echarts_chart.prop_types.bar_value_display_mode.label', 'Value display mode'),
        defaultValue: 'value',
        options: [
          { label: t('echarts_chart.prop_types.bar_value_display_mode.options.value', 'Show value'), value: 'value' },
          { label: t('echarts_chart.prop_types.bar_value_display_mode.options.percent', 'Show percent'), value: 'percent' },
          {
            label: t('echarts_chart.prop_types.bar_value_display_mode.options.value_and_percent', 'Show value + percent'),
            value: 'valueAndPercent'
          }
        ]
      },
      barNumberFormat: {
        type: 'string',
        label: t('echarts_chart.prop_types.bar_number_format.label', 'Bar number format'),
        defaultValue: 'thousands',
        options: [
          { label: t('echarts_chart.prop_types.bar_number_format.options.thousands', 'Thousands separator'), value: 'thousands' },
          { label: t('echarts_chart.prop_types.bar_number_format.options.plain', 'Plain number'), value: 'plain' }
        ]
      },
      horizontalBarValueUnit: {
        type: 'string',
        label: t('echarts_chart.prop_types.horizontal_bar_value_unit.label', 'Quantity unit suffix (e.g. pieces, orders)'),
        defaultValue: undefined
      },
      horizontalBarLabelPosition: {
        type: 'string',
        label: t('echarts_chart.prop_types.horizontal_bar_label_position.label', 'Bar label position'),
        defaultValue: 'follow',
        options: [
          {
            label: t('echarts_chart.prop_types.horizontal_bar_label_position.options.follow', 'Follow bar end (outside)'),
            value: 'follow'
          },
          {
            label: t('echarts_chart.prop_types.horizontal_bar_label_position.options.inside_left', 'Inside left'),
            value: 'insideLeft'
          },
          {
            label: t('echarts_chart.prop_types.horizontal_bar_label_position.options.inside', 'Inside center'),
            value: 'inside'
          },
          {
            label: t('echarts_chart.prop_types.horizontal_bar_label_position.options.inside_right', 'Inside right'),
            value: 'insideRight'
          }
        ]
      },
      horizontalBarLabelFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.horizontal_bar_label_font_size.label', 'Bar label font size (px)'),
        defaultValue: undefined
      },
      barOrientation: {
        type: 'string',
        label: t('echarts_chart.prop_types.bar_orientation.label', 'Bar orientation'),
        defaultValue: 'vertical',
        options: [
          { label: t('echarts_chart.prop_types.bar_orientation.options.horizontal', 'Horizontal'), value: 'horizontal' },
          { label: t('echarts_chart.prop_types.bar_orientation.options.vertical', 'Vertical'), value: 'vertical' }
        ]
      },
      barLayout: {
        type: 'string',
        label: t('echarts_chart.prop_types.bar_layout.label', 'Bar layout'),
        defaultValue: 'default',
        options: [
          { label: t('echarts_chart.prop_types.bar_layout.options.default', 'Default chart'), value: 'default' },
          { label: t('echarts_chart.prop_types.bar_layout.options.progress', 'Progress list'), value: 'progress' }
        ]
      },
      showCategoryLabels: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.show_category_labels.label', 'Show category labels'),
        defaultValue: true
      },
      categoryLabelPosition: {
        type: 'string',
        label: t('echarts_chart.prop_types.category_label_position.label', 'Category label position'),
        defaultValue: 'axis',
        options: [
          {
            label: t('echarts_chart.prop_types.category_label_position.options.axis', 'On axis'),
            value: 'axis'
          },
          {
            label: t(
              'echarts_chart.prop_types.category_label_position.options.above_bar',
              'Above bar, left-aligned'
            ),
            value: 'aboveBar'
          }
        ]
      },
      barGradientMode: {
        type: 'string',
        label: t('echarts_chart.prop_types.bar_gradient_mode.label', 'Bar fill'),
        defaultValue: 'none',
        options: [
          { label: t('echarts_chart.prop_types.bar_gradient_mode.options.none', 'Solid color'), value: 'none' },
          { label: t('echarts_chart.prop_types.bar_gradient_mode.options.top_to_bottom', 'Top to bottom gradient'), value: 'topToBottom' }
        ]
      },
      xAxisLabelRotate: {
        type: 'string',
        label: t('echarts_chart.prop_types.x_axis_label_rotate.label', 'X axis label rotate'),
        defaultValue: 'auto',
        options: [
          { label: t('echarts_chart.prop_types.x_axis_label_rotate.options.auto', 'Auto'), value: 'auto' },
          { label: '0°', value: '0' },
          { label: '30°', value: '30' },
          { label: '45°', value: '45' },
          { label: '60°', value: '60' }
        ]
      },
      xAxisLabelInterval: {
        type: 'string',
        label: t('echarts_chart.prop_types.x_axis_label_interval.label', 'X axis label interval'),
        defaultValue: 'auto',
        options: [
          { label: t('echarts_chart.prop_types.x_axis_label_interval.options.auto', 'Auto'), value: 'auto' },
          { label: t('echarts_chart.prop_types.x_axis_label_interval.options.all', 'Show all'), value: '0' },
          { label: t('echarts_chart.prop_types.x_axis_label_interval.options.skip_1', 'Skip every 1'), value: '1' },
          { label: t('echarts_chart.prop_types.x_axis_label_interval.options.skip_2', 'Skip every 2'), value: '2' }
        ]
      },
      xAxisLabelMaxLength: {
        type: 'number',
        label: t('echarts_chart.prop_types.x_axis_label_max_length.label', 'Axis label max length'),
        defaultValue: 12
      },
      xAxisFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.x_axis_font_size.label', 'X axis font size (px)'),
        defaultValue: undefined
      },
      yAxisFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.y_axis_font_size.label', 'Y axis font size (px)'),
        defaultValue: undefined
      },

      gaugeMin: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_min.label', 'Gauge Min'),
        defaultValue: 0
      },
      gaugeMax: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_max.label', 'Gauge Max'),
        defaultValue: 100
      },
      gaugeSplitNumber: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_split_number.label', 'Gauge Split Number'),
        defaultValue: 10
      },
      gaugeRadius: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_radius.label', 'Gauge Radius (%)'),
        defaultValue: 95
      },
      gaugeCenterX: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_center_x.label', 'Gauge Center X (%)'),
        defaultValue: 50
      },
      gaugeCenterY: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_center_y.label', 'Gauge Center Y (%)'),
        defaultValue: 65
      },
      gaugeProgressRingCenterY: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_progress_ring_center_y.label', 'Ring gauge center Y (%)'),
        defaultValue: 50
      },
      gaugeProgressRingCanvasLabelPosition: {
        type: 'string',
        label: t(
          'echarts_chart.prop_types.gauge_progress_ring_canvas_label_position.label',
          'Canvas label position (ring gauge)'
        ),
        defaultValue: 'ringCenter',
        options: [
          {
            label: t(
              'echarts_chart.prop_types.gauge_progress_ring_canvas_label_position.options.ring_center',
              'Ring center (with value)'
            ),
            value: 'ringCenter'
          },
          {
            label: t(
              'echarts_chart.prop_types.gauge_progress_ring_canvas_label_position.options.chart_top',
              'Above chart'
            ),
            value: 'chartTop'
          },
          {
            label: t(
              'echarts_chart.prop_types.gauge_progress_ring_canvas_label_position.options.chart_bottom',
              'Below chart'
            ),
            value: 'chartBottom'
          }
        ]
      },
      gaugeProgressRingCanvasLabelEdgePercent: {
        type: 'number',
        label: t(
          'echarts_chart.prop_types.gauge_progress_ring_canvas_label_edge_percent.label',
          'Canvas label inset from edge (%)'
        ),
        defaultValue: 8
      },
      gaugeDetailColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.gauge_detail_color.label', 'Gauge center value color'),
        defaultValue: undefined
      },
      gaugeLabelField: {
        type: 'string',
        label: t('echarts_chart.prop_types.gauge_label_field.label', 'Gauge Label Field'),
        defaultValue: undefined
      },
      gaugeLabelColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.gauge_label_color.label', 'Gauge Label Color'),
        defaultValue: undefined
      },
      gaugeLabelFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_label_font_size.label', 'Gauge Label Font Size'),
        defaultValue: 14
      },
      gaugeLabelFontWeight: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_label_font_weight.label', 'Gauge label font weight'),
        defaultValue: 400
      },
      gaugeLabelX: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_label_x.label', 'Gauge Label X (%)'),
        defaultValue: 50
      },
      gaugeLabelY: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_label_y.label', 'Gauge Label Y (%)'),
        defaultValue: 90
      },
      gaugeShowDetail: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.gauge_show_detail.label', 'Show center value (detail)'),
        defaultValue: true
      },
      gaugeDetailOffsetCenterX: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_detail_offset_center_x.label', 'Gauge Value Offset X (%)'),
        defaultValue: 0
      },
      gaugeDetailOffsetCenterY: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_detail_offset_center_y.label', 'Gauge Value Offset Y (%)'),
        defaultValue: 0
      },
      gaugeTitleOffsetCenterX: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_title_offset_center_x.label', 'Gauge Title Offset X (%)'),
        defaultValue: 0
      },
      gaugeTitleOffsetCenterY: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_title_offset_center_y.label', 'Gauge Title Offset Y (%)'),
        defaultValue: -20
      },
      gaugeTitleFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_title_font_size.label', 'Gauge dial title font size (px)'),
        defaultValue: 20
      },
      gaugeTitleFontWeight: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_title_font_weight.label', 'Gauge dial title font weight'),
        defaultValue: 400
      },
      gaugeDetailFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_detail_font_size.label', 'Gauge center value font size (px)'),
        defaultValue: undefined
      },
      gaugeDetailFontWeight: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_detail_font_weight.label', 'Gauge center value font weight'),
        defaultValue: 400
      },
      gaugeArcStartAngle: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_arc_start_angle.label', 'Ring gauge start angle (deg)'),
        defaultValue: 225
      },
      gaugeArcEndAngle: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_arc_end_angle.label', 'Ring gauge end angle (deg)'),
        defaultValue: -45
      },
      gaugeProgressRingLineWidth: {
        type: 'number',
        label: t('echarts_chart.prop_types.gauge_progress_ring_line_width.label', 'Ring track width (px)'),
        defaultValue: 18
      },
      gaugeProgressRingDrawOffsetPercent: {
        type: 'number',
        label: t(
          'echarts_chart.prop_types.gauge_progress_ring_draw_offset_percent.label',
          'Ring progress draw offset (% of range)'
        ),
        description: t(
          'echarts_chart.prop_types.gauge_progress_ring_draw_offset_percent.description',
          'Subtract from drawn progress only (not the center label), applied when progress is above 50%. Tune with ring width when roundCap looks early-full; 0 = off. Full range still closes at 100%.'
        ),
        defaultValue: 0
      },
      gaugeTrackColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.gauge_track_color.label', 'Ring track color'),
        defaultValue: '#94a3b8'
      },
      gaugeTrackGradient: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.gauge_track_gradient.label', 'Ring track gradient'),
        defaultValue: false
      },
      gaugeProgressBarColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.gauge_progress_bar_color.label', 'Ring progress color'),
        defaultValue: '#3B82F6'
      },
      headerLabelField: {
        type: 'string',
        label: t('echarts_chart.prop_types.header_label_field.label', 'Header Label Field'),
        defaultValue: undefined
      },
      headerLabelFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.header_label_font_size.label', 'Header Label Font Size'),
        defaultValue: 14
      },
      headerLabelFontWeight: {
        type: 'number',
        label: t('echarts_chart.prop_types.header_label_font_weight.label', 'Header Label Font Weight'),
        defaultValue: 400
      },
      headerLabelColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.header_label_color.label', 'Header Label Color'),
        defaultValue: undefined
      },
      headerLabelPosition: {
        type: 'string',
        label: t('echarts_chart.prop_types.header_label_position.label', 'Header Label Position'),
        defaultValue: 'header',
        options: [
          { value: 'header', label: t('echarts_chart.prop_types.header_label_position.header', 'Beside title') },
          { value: 'chartTopRight', label: t('echarts_chart.prop_types.header_label_position.chart_top_right', 'Chart top right') },
        ],
      },

      lineSmooth: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.line_smooth.label', 'Line Smooth'),
        defaultValue: false
      },
      lineAreaStyle: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.line_area_style.label', 'Line Area Style'),
        defaultValue: false
      },
      lineStack: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.line_stack.label', 'Line Stack'),
        defaultValue: false
      },
      lineCumulative: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.line_cumulative.label', 'Line cumulative'),
        description: t(
          'echarts_chart.prop_types.line_cumulative.description',
          'Current point equals running total up to this point.'
        ),
        defaultValue: false
      },
      lineQuantityUnitSuffix: {
        type: 'string',
        label: t('echarts_chart.prop_types.line_quantity_unit_suffix.label', 'Quantity unit suffix'),
        description: t(
          'echarts_chart.prop_types.line_quantity_unit_suffix.description',
          'Appended to data point values and tooltip (line / multi-series line).'
        ),
        defaultValue: undefined
      },
      lineYAxisValueUnit: {
        type: 'string',
        label: t('echarts_chart.prop_types.line_y_axis_value_unit.label', 'Y-axis value unit'),
        description: t(
          'echarts_chart.prop_types.line_y_axis_value_unit.description',
          'Appended to Y-axis tick labels (value / log axis only).'
        ),
        defaultValue: undefined
      },
      linePointLabelFontFamily: {
        type: 'string',
        label: t('echarts_chart.prop_types.line_point_label_font_family.label', 'Line point label font'),
        description: t(
          'echarts_chart.prop_types.line_point_label_font_family.description',
          'Font family for values beside line points (when quantity suffix is set).'
        ),
        defaultValue: undefined
      },
      linePointLabelFontSize: {
        type: 'number',
        label: t('echarts_chart.prop_types.line_point_label_font_size.label', 'Line point label font size (px)'),
        defaultValue: undefined
      },
      linePointLabelFontWeight: {
        type: 'number',
        label: t('echarts_chart.prop_types.line_point_label_font_weight.label', 'Line point label font weight'),
        defaultValue: undefined
      },
      linePointLabelColor: {
        type: 'string',
        label: t('echarts_chart.prop_types.line_point_label_color.label', 'Line point label color'),
        defaultValue: undefined
      },
      multiLineStack: {
        type: 'boolean',
        label: t('echarts_chart.prop_types.multi_line_stack.label', 'Multi-series stack'),
        description: t(
          'echarts_chart.prop_types.multi_line_stack.description',
          'Only for multi-series line: stack Y values. When unset, falls back to Line Stack for older templates.'
        ),
        defaultValue: false
      },
      heatmapXField: {
        type: 'string',
        label: t('echarts_chart.prop_types.heatmap_x_field.label', 'Heatmap X field'),
        defaultValue: 'x'
      },
      heatmapYField: {
        type: 'string',
        label: t('echarts_chart.prop_types.heatmap_y_field.label', 'Heatmap Y field'),
        defaultValue: 'y'
      },
      heatmapValueField: {
        type: 'string',
        label: t('echarts_chart.prop_types.heatmap_value_field.label', 'Heatmap value field'),
        defaultValue: 'value'
      },
      heatmapColorLow: {
        type: 'string',
        label: t('echarts_chart.prop_types.heatmap_color_low.label', 'Heatmap color (low)'),
        defaultValue: '#f7faff'
      },
      heatmapColorHigh: {
        type: 'string',
        label: t('echarts_chart.prop_types.heatmap_color_high.label', 'Heatmap color (high)'),
        defaultValue: '#004a8f'
      },
      clusterGroupField: {
        type: 'string',
        label: t('echarts_chart.prop_types.cluster_group_field.label', 'Cluster group field'),
        defaultValue: 'group'
      },
      clusterXField: {
        type: 'string',
        label: t('echarts_chart.prop_types.cluster_x_field.label', 'Cluster X field'),
        defaultValue: 'x'
      },
      clusterYField: {
        type: 'string',
        label: t('echarts_chart.prop_types.cluster_y_field.label', 'Cluster Y field'),
        defaultValue: 'y'
      },
      clusterSizeField: {
        type: 'string',
        label: t('echarts_chart.prop_types.cluster_size_field.label', 'Cluster size field'),
        defaultValue: 'value'
      },
      additionalStats: {
        type: 'array',
        label: t('chart.prop_types.additional_stats.label', 'Additional Statistics Labels'),
        description: t('chart.prop_types.additional_stats.description', 'Configure stat items with optional ratio for line chart')
      },
      additionalStatsLabelFontSize: {
        type: 'number',
        label: t('chart.prop_types.additional_stats_label_font_size.label', 'Additional Stats Font Size')
      },
      additionalStatsFontFamily: {
        type: 'string',
        label: t('chart.prop_types.additional_stats_font_family.label', 'Additional stats font'),
        defaultValue: 'Noto Sans SC',
        options: [
          { label: 'Noto Sans SC', value: 'Noto Sans SC' },
          { label: 'PingFang SC', value: 'PingFang SC' },
          { label: 'Hiragino Sans GB', value: 'Hiragino Sans GB' },
          { label: 'Microsoft YaHei', value: 'Microsoft YaHei' },
          { label: t('chart.prop_types.additional_stats_font_family.options.sans_serif', 'sans-serif'), value: 'sans-serif' }
        ]
      },
      additionalStatsFontWeight: {
        type: 'number',
        label: t('chart.prop_types.additional_stats_font_weight.label', 'Additional stats font weight'),
        defaultValue: 500,
        options: [
          { label: t('echarts_chart_property_editor.font_weight_normal', 'Regular (400)'), value: 400 },
          { label: t('echarts_chart_property_editor.font_weight_medium', 'Medium (500)'), value: 500 },
          { label: t('echarts_chart_property_editor.font_weight_semibold', 'Semibold (600)'), value: 600 },
          { label: t('echarts_chart_property_editor.font_weight_bold', 'Bold (700)'), value: 700 }
        ]
      },
      additionalStatsNumberFormat: {
        type: 'string',
        label: t('chart.prop_types.additional_stats_number_format.label', 'Additional stats number format'),
        defaultValue: 'thousands',
        options: [
          { label: t('chart.prop_types.additional_stats_number_format.options.thousands', 'Thousands separator'), value: 'thousands' },
          { label: t('chart.prop_types.additional_stats_number_format.options.plain', 'Plain number'), value: 'plain' }
        ]
      },
      additionalStatsShowLegendSquare: {
        type: 'boolean',
        label: t('chart.prop_types.additional_stats_show_legend_square.label', 'Show legend square for additional stats'),
        defaultValue: false
      },
      additionalStatsPosition: {
        type: 'string',
        label: t('chart.prop_types.additional_stats_position.label', 'Additional Stats Position'),
        defaultValue: 'chartTopLeft',
        options: [
          { label: t('chart.prop_types.additional_stats_position.options.header_right', 'Right of title row'), value: 'headerRight' },
          { label: t('chart.prop_types.additional_stats_position.options.header_center', 'Centered on title row'), value: 'headerCenter' },
          { label: t('chart.prop_types.additional_stats_position.options.chart_top_right', 'Above chart, right'), value: 'chartTopRight' },
          { label: t('chart.prop_types.additional_stats_position.options.chart_top_left', 'Above chart, left'), value: 'chartTopLeft' },
          { label: t('chart.prop_types.additional_stats_position.options.chart_top_center', 'Above chart, center'), value: 'chartTopCenter' }
        ]
      },
      chartColorScheme: {
        type: 'string',
        label: t('echarts_chart.prop_types.chart_color_scheme.label', 'Color scheme'),
        description: t(
          'echarts_chart.prop_types.chart_color_scheme.description',
          'Applies when no custom colors array is set; cycles colors by data order.'
        ),
        defaultValue: 'default',
        options: [
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.default', 'Default (soft)'),
            value: 'default'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.vivid', 'Vivid'),
            value: 'vivid'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.ocean', 'Ocean'),
            value: 'ocean'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.sunset', 'Sunset'),
            value: 'sunset'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.forest', 'Forest'),
            value: 'forest'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.contrast', 'High contrast'),
            value: 'contrast'
          },
          {
            label: t('echarts_chart.prop_types.chart_color_scheme.options.logistics', 'Logistics (dashboard)'),
            value: 'logistics'
          }
        ]
      },

      databaseDataSourceConfig: {
        type: 'object',
        label: t('common.prop_types.database_data_source.label', 'Database Data Source'),
        defaultValue: null
      },

      customStyles: {
        type: 'object',
        label: t('common.prop_types.custom_styles.label', 'Custom Styles'),
        defaultValue: {}
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },

  {
    type: 'MapChart',
    title: t('map_chart.title', 'Map Chart'),
    description: t('map_chart.description', 'Geographic map visualization, supporting China map and province maps'),
    icon: 'map',
    propTypes: {
      title: {
        type: 'string',
        label: t('map_chart.prop_types.title.label', 'Title'),
        defaultValue: t('map_chart.prop_types.title.default_value', 'Map')
      },
      height: {
        type: 'number',
        label: t('map_chart.prop_types.height.label', 'Height'),
        defaultValue: 400
      },
      data: {
        type: 'array',
        label: t('map_chart.prop_types.data.label', 'Map Data'),
        defaultValue: []
      },
      nameField: {
        type: 'string',
        label: t('map_chart.prop_types.name_field.label', 'Name Field'),
        defaultValue: 'name',
        description: t('map_chart.prop_types.name_field.description', 'Province/city name field')
      },
      valueField: {
        type: 'string',
        label: t('map_chart.prop_types.value_field.label', 'Value Field'),
        defaultValue: 'value',
        description: t('map_chart.prop_types.value_field.description', 'Data value field')
      },
      mapType: {
        type: 'string',
        label: t('map_chart.prop_types.map_type.label', 'Map Type'),
        defaultValue: 'china',
        options: [
          { label: t('map_chart.prop_types.map_type.options.china', 'China Map'), value: 'china' },
          { label: t('map_chart.prop_types.map_type.options.province', 'Province Map'), value: 'province' },
          { label: t('map_chart.prop_types.map_type.options.usa', 'United States'), value: 'usa' },
          { label: t('map_chart.prop_types.map_type.options.europe', 'Europe (EU)'), value: 'europe' }
        ]
      },
      province: {
        type: 'string',
        label: t('map_chart.prop_types.province.label', 'Province'),
        defaultValue: '',
        description: t('map_chart.prop_types.province.description', 'Province name when mapType is province')
      },
      color: {
        type: 'string',
        label: t('map_chart.prop_types.color.label', 'Color'),
        defaultValue: '#3b82f6'
      },
      showLabel: {
        type: 'boolean',
        label: t('map_chart.prop_types.show_label.label', 'Show Label'),
        defaultValue: true
      },
      visualMapMin: {
        type: 'number',
        label: t('map_chart.prop_types.visual_map_min.label', 'Visual Map Min'),
        defaultValue: 0
      },
      visualMapMax: {
        type: 'number',
        label: t('map_chart.prop_types.visual_map_max.label', 'Visual Map Max'),
        defaultValue: 100
      },

      databaseDataSourceConfig: {
        type: 'object',
        label: t('common.prop_types.database_data_source.label', 'Database Data Source'),
        defaultValue: null
      },

      customStyles: {
        type: 'object',
        label: t('common.prop_types.custom_styles.label', 'Custom Styles'),
        defaultValue: {}
      }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'AnalyticsTable',
    title: t('analytics_table.title_component', 'Analytics Table'),
    description: t('analytics_table.description', 'Config-driven analytics table: comparison cells, summary row, pills & client-side derived fields'),
    icon: 'table-2',
    propTypes: {
      dimLabel: {
        type: 'object',
        label: t('analytics_table.prop_types.dim_label.label', 'Dimension Header'),
        defaultValue: { zh: '项目', en: 'Item' }
      },
      columns: {
        type: 'array',
        label: t('analytics_table.prop_types.columns.label', 'Columns'),
        defaultValue: [
          { key: '__label', kind: 'label', sticky: true, align: 'left' },
          { key: 'value', label: { zh: '数值', en: 'Value' }, kind: 'text', field: 'value', format: 'number', sortField: 'value' },
          { key: 'comp', label: { zh: '同比', en: 'Comp' }, kind: 'Delta', field: 'comp_pct' }
        ]
      },
      derivedFields: {
        type: 'array',
        label: t('analytics_table.prop_types.derived_fields.label', 'Derived Fields'),
        defaultValue: []
      },
      toolbar: {
        type: 'object',
        label: t('analytics_table.prop_types.toolbar.label', 'Toolbar (search / pills)'),
        defaultValue: {}
      },
      maxHeight: {
        type: 'number',
        label: t('analytics_table.prop_types.max_height.label', 'Max Height'),
        defaultValue: 420
      },
      showIndex: {
        type: 'boolean',
        label: t('analytics_table.prop_types.show_index.label', 'Index Column'),
        defaultValue: true
      },
      zebra: {
        type: 'boolean',
        label: t('analytics_table.prop_types.zebra.label', 'Zebra Stripes'),
        defaultValue: true
      },
      bare: {
        type: 'boolean',
        label: t('analytics_table.prop_types.bare.label', 'No Card Shell'),
        defaultValue: false
      },
      summaryLabel: {
        type: 'object',
        label: t('analytics_table.prop_types.summary_label.label', 'Summary Row Label'),
        defaultValue: { zh: '合计', en: 'Total' }
      },
      databaseDataSourceConfig: {
        type: 'object',
        label: t('common.prop_types.database_data_source.label', 'Database Data Source'),
        defaultValue: null
      },
      summaryDataSourceConfig: {
        type: 'object',
        label: t('analytics_table.prop_types.summary_ds.label', 'Summary Data Source'),
        defaultValue: null
      },
      rowMarkers: {
        type: 'boolean',
        label: t('analytics_table.prop_types.row_markers.label', 'Row Color Dots'),
        defaultValue: false
      },
      highlightRow: {
        type: 'object',
        label: t('analytics_table.prop_types.highlight_row.label', 'Highlight Row'),
        defaultValue: null
      },
      // Style overrides: omit defaultValue so the renderer's own defaults apply to new components
      // (an explicit '' would blank the styled header/zebra look).
      headerClassName: {
        type: 'string',
        label: t('analytics_table.prop_types.header_class.label', 'Header Row Style')
      },
      indexHeaderClass: {
        type: 'string',
        label: t('analytics_table.prop_types.index_header_class.label', 'Index Header Style')
      },
      zebraClassName: {
        type: 'string',
        label: t('analytics_table.prop_types.zebra_class.label', 'Zebra Row Style')
      },
      indexPadX: {
        type: 'number',
        label: t('analytics_table.prop_types.index_pad_x.label', 'Index column padding X (px)'),
        defaultValue: 8
      },
      indexField: {
        type: 'string',
        label: t('analytics_table.prop_types.index_field.label', 'Index column field'),
        description: t('analytics_table.prop_types.index_field.description', 'Row field shown in the # column instead of the row number (e.g. national_rank); empty = row number')
      },
      indexWidth: {
        type: 'number',
        label: t('analytics_table.prop_types.index_width.label', 'Index column width (px)'),
        description: t('analytics_table.prop_types.index_width.description', 'Fixed width for the # column; unset = auto-sized to the row-number digits')
      },
      labelWidth: {
        type: 'number',
        label: t('analytics_table.prop_types.label_width.label', 'Label column width (px)'),
        description: t('analytics_table.prop_types.label_width.description', 'Fixed width for the first (label/dimension) column; unset = auto')
      },
      freezeFirstColumn: {
        type: 'boolean',
        label: t('analytics_table.prop_types.freeze_first_column.label', 'Freeze first column'),
        defaultValue: false,
        description: t('analytics_table.prop_types.freeze_first_column.description', 'Mobile only: pin the first column and sticky the header')
      },
      summaryShowSub: {
        type: 'boolean',
        label: t('analytics_table.prop_types.summary_show_sub.label', 'Summary sub values'),
        defaultValue: true,
        description: t('analytics_table.prop_types.summary_show_sub.description', 'Show LY sub values in the summary row')
      },
      wrapLabel: {
        type: 'boolean',
        label: t('analytics_table.prop_types.wrap_label.label', 'Wrap label column text'),
        defaultValue: false,
        description: t('analytics_table.prop_types.wrap_label.description', 'Wrap the first column onto multiple lines instead of truncating with an ellipsis; row height grows to fit')
      },
      headerFontSize: {
        type: 'number',
        label: t('analytics_table.prop_types.header_font_size.label', 'Header font size (px)'),
        defaultValue: 13
      },
      cellFontSize: {
        type: 'number',
        label: t('analytics_table.prop_types.cell_font_size.label', 'Cell font size (px)'),
        defaultValue: 13
      },
      badgeFontSize: {
        type: 'number',
        label: t('analytics_table.prop_types.badge_font_size.label', 'Badge font size (px)'),
        defaultValue: 12
      },
      fetchLimit: {
        type: 'number',
        label: t('analytics_table.prop_types.fetch_limit.label', 'Fetch limit (rows)'),
        defaultValue: 1000
      },
      headerColors: {
        type: 'object',
        label: t('analytics_table.prop_types.header_colors.label', 'Header colors by column'),
        description: t('analytics_table.prop_types.header_colors.description', '{ [columnKey]: Tailwind text class } — per-column header text color')
      },
      customStyles: {
        type: 'object',
        label: t('common.prop_types.custom_styles.label', 'Custom Styles'),
        defaultValue: {}
      }
    },
    mockData: {
      type: 'array',
      label: t('analytics_table.mock_data.label', 'Mock Data'),
      description: t('analytics_table.mock_data.description', 'Sample rows for preview'),
      defaultValue: [
        { label_zh: t('analytics_table.mock_data.retail', 'Channel · Retail'), label_en: 'Retail', value: 1234, comp_pct: 8.3 },
        { label_zh: t('analytics_table.mock_data.outlet', 'Channel · Outlet'), label_en: 'Outlet', value: 820, comp_pct: -4.7 },
        { label_zh: t('analytics_table.mock_data.ecommerce', 'Channel · E-commerce'), label_en: 'E-commerce', value: 540, comp_pct: 31.7 }
      ]
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'ProductReport',
    title: t('product_report.title', 'Product Report'),
    description: t('product_report.description', 'Dimension-driven product report: summary cards, dimension tabs, list/table views, sorting and filter chips'),
    icon: 'file-text',
    propTypes: {
      title: {
        type: 'object',
        label: t('product_report.prop.title', 'Title ({zh,en})'),
        description: t('product_report.prop.title_description', 'Bilingual report title; leave empty to hide')
      },
      filterComponentId: {
        type: 'string',
        label: t('product_report.prop.filter_component_id', 'Filter component id'),
        defaultValue: '',
        description: t('product_report.prop.filter_component_id_description', 'Bus parameters are read as {filterComponentId}_{filterKey}')
      },
      enabledViews: {
        type: 'array',
        label: t('product_report.prop.enabled_views', 'Enabled views'),
        defaultValue: ['list', 'table'],
        description: t('product_report.prop.enabled_views_description', 'Subset of ["list","table"]; the view toggle shows only when more than one view is enabled')
      },
      defaultViewMode: {
        type: 'string',
        label: t('product_report.prop.default_view_mode', 'Default view mode'),
        options: [
          { label: t('product_report.prop.default_view_mode_list', 'List'), value: 'list' },
          { label: t('product_report.prop.default_view_mode_table', 'Table'), value: 'table' }
        ],
        description: t('product_report.prop.default_view_mode_description', 'Unset = first enabled view')
      },
      primaryKeyField: {
        type: 'string',
        label: t('product_report.prop.primary_key_field', 'Primary key field'),
        defaultValue: 'plu'
      },
      dimKeyField: {
        type: 'string',
        label: t('product_report.prop.dim_key_field', 'Dimension key field'),
        defaultValue: 'dim_key'
      },
      pageSize: {
        type: 'number',
        label: t('product_report.prop.page_size', 'Page size (rows per page)'),
        defaultValue: 20
      },
      freezeFirstColumn: {
        type: 'boolean',
        label: t('product_report.prop.freeze_first_column', 'Freeze first column'),
        defaultValue: false,
        description: t('product_report.prop.freeze_first_column_description', 'Pin the first column and sticky the header on mobile')
      },
      detailNav: {
        type: 'object',
        label: t('product_report.prop.detail_nav', 'Detail navigation (primary row click)'),
        description: t('product_report.prop.detail_nav_description', '{ pageId?, idField, urlParam, emitParam?, titleField?, icon? } — unset = row click does nothing')
      },
      summaryCards: {
        type: 'array',
        label: t('product_report.prop.summary_cards', 'Summary cards'),
        defaultValue: [],
        description: t('product_report.prop.summary_cards_description', '{ key?, label: {zh,en}, field, format?, currencyField?, color? }')
      },
      dimensions: {
        type: 'array',
        label: t('product_report.prop.dimensions', 'Dimensions'),
        defaultValue: [],
        description: t('product_report.prop.dimensions_description', '{ key, label: {zh,en}, source: primary|dimension, dimension?, groupBy?, subTabs?, drill?, defaultSubTab?, labelWidth?, hiddenFields? }')
      },
      sortOptions: {
        type: 'array',
        label: t('product_report.prop.sort_options', 'Sort options'),
        defaultValue: [],
        description: t('product_report.prop.sort_options_description', '{ key, label: {zh,en}, field, defaultDir?: asc|desc }')
      },
      filterKeys: {
        type: 'array',
        label: t('product_report.prop.filter_keys', 'Filter keys'),
        defaultValue: [],
        description: t('product_report.prop.filter_keys_description', 'Bus filter keys shown as chips: { key, kind: csv|text, valueLabels?, textGroup?, excludeFromChips? }')
      },
      tableColumns: {
        type: 'object',
        label: t('product_report.prop.table_columns', 'Table columns'),
        defaultValue: {},
        description: t('product_report.prop.table_columns_description', '{ primary?: ReportColumn[], dimension?: ReportColumn[] }')
      },
      listCard: {
        type: 'object',
        label: t('product_report.prop.list_card', 'List-card layout'),
        description: t('product_report.prop.list_card_description', '{ primary?: CardLayout, dimension?: CardLayout } — card layout for the list view; without it the list view falls back to the table')
      },
      titleFontSize: { type: 'number', label: t('product_report.prop.title_font_size', 'Title font size (px)'), defaultValue: 16 },
      valueFontSize: { type: 'number', label: t('product_report.prop.value_font_size', 'Value font size (px)'), defaultValue: 15 },
      labelFontSize: { type: 'number', label: t('product_report.prop.label_font_size', 'Label font size (px)'), defaultValue: 13 },
      cellFontSize: { type: 'number', label: t('product_report.prop.cell_font_size', 'Cell font size (px)'), defaultValue: 13 },
      badgeFontSize: { type: 'number', label: t('product_report.prop.badge_font_size', 'Badge font size (px)'), defaultValue: 12 }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'TileGrid',
    title: t('tile_grid.title', 'Tile Grid'),
    description: t('tile_grid.description', 'Band-colored tile grid driven by threshold bands (sizes, stores, etc.)'),
    icon: 'grid',
    propTypes: {
      title: {
        type: 'object',
        label: t('tile_grid.prop.title', 'Title ({zh,en})'),
        description: t('tile_grid.prop.title_description', 'Bilingual panel title; leave empty to hide')
      },
      cols: {
        type: 'number',
        label: t('tile_grid.prop.cols', 'Columns per row'),
        defaultValue: 4
      },
      bands: {
        type: 'array',
        label: t('tile_grid.prop.bands', 'Bands'),
        defaultValue: [],
        description: t('tile_grid.prop.bands_description', '{ key, max?, color?, heat?, label? } — first band whose key matches bandField value, or whose max >= value, wins')
      },
      topField: {
        type: 'string',
        label: t('tile_grid.prop.top_field', 'Top label field'),
        defaultValue: 'label'
      },
      valueField: {
        type: 'string',
        label: t('tile_grid.prop.value_field', 'Value field'),
        defaultValue: 'value'
      },
      bandField: {
        type: 'string',
        label: t('tile_grid.prop.band_field', 'Band key field'),
        description: t('tile_grid.prop.band_field_description', 'Row field that directly gives the band key; unset = match bands by max threshold')
      },
      showBars: {
        type: 'boolean',
        label: t('tile_grid.prop.show_bars', 'Show value bars'),
        defaultValue: false
      },
      showLegend: {
        type: 'boolean',
        label: t('tile_grid.prop.show_legend', 'Show legend'),
        defaultValue: true
      },
      bare: {
        type: 'boolean',
        label: t('tile_grid.prop.bare', 'No card shell'),
        defaultValue: false
      },
      emptyText: {
        type: 'object',
        label: t('tile_grid.prop.empty_text', 'Empty text ({zh,en})'),
        description: t('tile_grid.prop.empty_text_description', 'Placeholder shown when there is no data')
      },
      titleFontSize: { type: 'number', label: t('tile_grid.prop.title_font_size', 'Title font size (px)'), defaultValue: 14 },
      valueFontSize: { type: 'number', label: t('tile_grid.prop.value_font_size', 'Value font size (px)'), defaultValue: 14 },
      labelFontSize: { type: 'number', label: t('tile_grid.prop.label_font_size', 'Label font size (px)'), defaultValue: 13 }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'CollapsePanel',
    title: t('collapse_panel.title', 'Collapse Panel'),
    description: t('collapse_panel.description', 'Collapsible panel of titled text items, optionally fed by a datasource field'),
    icon: 'chevron-down',
    propTypes: {
      title: {
        type: 'object',
        label: t('collapse_panel.prop.title', 'Title ({zh,en})'),
        description: t('collapse_panel.prop.title_description', 'Panel header title; unset = default title')
      },
      items: {
        type: 'array',
        label: t('collapse_panel.prop.items', 'Items'),
        defaultValue: [],
        description: t('collapse_panel.prop.items_description', '{ title: {zh,en}, content?: {zh,en}, contentDataSource?: { field } } — contentDataSource.field overrides static content with the first row of the bound datasource')
      },
      defaultExpanded: {
        type: 'boolean',
        label: t('collapse_panel.prop.default_expanded', 'Expanded by default'),
        defaultValue: false
      },
      titleFontSize: { type: 'number', label: t('collapse_panel.prop.title_font_size', 'Title font size (px)'), defaultValue: 14 },
      labelFontSize: { type: 'number', label: t('collapse_panel.prop.label_font_size', 'Content font size (px)'), defaultValue: 13 }
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'AppIdentityList',
    title: t('app_identity_list.title', 'Application Identities'),
    description: t('app_identity_list.description', 'Lists application users or roles from RBAC; can inline-assign roles or edit a datasource-backed attribute merged by key'),
    icon: 'users',
    propTypes: {
      source: {
        type: 'string',
        label: t('app_identity_list.prop.source', 'Identity source'),
        defaultValue: 'users',
        options: [
          { label: t('app_identity_list.prop.source_users', 'Users'), value: 'users' },
          { label: t('app_identity_list.prop.source_roles', 'Roles'), value: 'roles' },
        ],
      },
      emitParamKey: { type: 'string', label: t('app_identity_list.prop.emit_param_key', 'Selected-identity parameter'), defaultValue: '' },
      searchable: { type: 'boolean', label: t('app_identity_list.prop.searchable', 'Searchable'), defaultValue: true },
      showEmail: { type: 'boolean', label: t('app_identity_list.prop.show_email', 'Show email (users)'), defaultValue: true },
      showPhone: { type: 'boolean', label: t('app_identity_list.prop.show_phone', 'Show phone (users)'), defaultValue: true },
      showRoles: { type: 'boolean', label: t('app_identity_list.prop.show_roles', 'Show roles (users)'), defaultValue: true },
      roleAssignable: { type: 'boolean', label: t('app_identity_list.prop.role_assignable', 'Inline role assignment (users)'), defaultValue: false },
      attributeDatasourceId: { type: 'string', label: t('app_identity_list.prop.attribute_ds', 'Attribute datasource id (roles)'), defaultValue: '' },
      attributeSaveDatasourceId: { type: 'string', label: t('app_identity_list.prop.attribute_save_ds', 'Attribute save datasource id (roles)'), defaultValue: '' },
      attributeKeyField: { type: 'string', label: t('app_identity_list.prop.attribute_key_field', 'Attribute join field'), defaultValue: 'role_code' },
      attributeValueField: { type: 'string', label: t('app_identity_list.prop.attribute_value_field', 'Attribute value field'), defaultValue: 'filter_store' },
      attributeKind: {
        type: 'string',
        label: t('app_identity_list.prop.attribute_kind', 'Attribute editor (roles)'),
        defaultValue: 'none',
        options: [
          { label: t('app_identity_list.prop.attribute_kind_none', 'None'), value: 'none' },
          { label: t('app_identity_list.prop.attribute_kind_toggle', 'Toggle'), value: 'toggle' },
          { label: t('app_identity_list.prop.attribute_kind_number', 'Number'), value: 'number' },
        ],
      },
      attributeLabel: { type: 'object', label: t('app_identity_list.prop.attribute_label', 'Attribute column header'), defaultValue: { zh: '', en: '' } },
      attributeSaveKeyParam: { type: 'string', label: t('app_identity_list.prop.attribute_save_key_param', 'Save key param'), defaultValue: 'roleCode' },
      attributeSaveValueParam: { type: 'string', label: t('app_identity_list.prop.attribute_save_value_param', 'Save value param'), defaultValue: 'filterStore' },
      emitAttributeParamKey: { type: 'string', label: t('app_identity_list.prop.emit_attribute_param_key', 'Selected-user attribute parameter (users)'), defaultValue: '' },
      showMemberCount: { type: 'boolean', label: t('app_identity_list.prop.show_member_count', 'Show member count (roles)'), defaultValue: true },
      showPermissionCount: { type: 'boolean', label: t('app_identity_list.prop.show_permission_count', 'Show permission count (roles)'), defaultValue: true },
      listHeight: { type: 'string', label: t('app_identity_list.prop.list_height', 'List height (px or CSS, empty = auto)'), defaultValue: '' },
      pageSize: { type: 'number', label: t('app_identity_list.prop.page_size', 'Users per page (0 = no pagination)'), defaultValue: 0 },
      roleFilterable: { type: 'boolean', label: t('app_identity_list.prop.role_filterable', 'Role filter dropdown (users)'), defaultValue: true },
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  },
  {
    type: 'IdentityAttributeAssign',
    title: t('identity_attribute_assign.title_component', 'Identity Attribute Assignment'),
    description: t('identity_attribute_assign.description', 'Assigns a set of datasource options (stores/regions/…) to a bus-selected identity'),
    icon: 'store',
    propTypes: {
      title: { type: 'object', label: t('identity_attribute_assign.prop.title', 'Title'), defaultValue: { zh: '门店授权', en: 'Assignment' } },
      identityParamKey: { type: 'string', label: t('identity_attribute_assign.prop.identity_param_key', 'Selected-identity parameter'), defaultValue: 'selectedUserId' },
      optionsDatasourceId: { type: 'string', label: t('identity_attribute_assign.prop.options_ds', 'Options datasource id'), defaultValue: '' },
      currentDatasourceId: { type: 'string', label: t('identity_attribute_assign.prop.current_ds', 'Current-values datasource id'), defaultValue: '' },
      saveDatasourceId: { type: 'string', label: t('identity_attribute_assign.prop.save_ds', 'Save (transaction) datasource id'), defaultValue: '' },
      optionValueField: { type: 'string', label: t('identity_attribute_assign.prop.option_value_field', 'Option value field'), defaultValue: 'store_id' },
      optionLabelFieldZh: { type: 'string', label: t('identity_attribute_assign.prop.option_label_zh', 'Option label field (zh)'), defaultValue: 'label_zh' },
      optionLabelFieldEn: { type: 'string', label: t('identity_attribute_assign.prop.option_label_en', 'Option label field (en)'), defaultValue: 'label_en' },
      optionGroupField: { type: 'string', label: t('identity_attribute_assign.prop.option_group_field', 'Option group field'), defaultValue: 'channel_code' },
      currentValueField: { type: 'string', label: t('identity_attribute_assign.prop.current_value_field', 'Current value field'), defaultValue: 'store_id' },
      identityValueParamKey: { type: 'string', label: t('identity_attribute_assign.prop.identity_value_param', 'Identity value param'), defaultValue: 'userId' },
      valuesParamKey: { type: 'string', label: t('identity_attribute_assign.prop.values_param', 'Values param'), defaultValue: 'storeIds' },
      operatorParamKey: { type: 'string', label: t('identity_attribute_assign.prop.operator_param', 'Operator param'), defaultValue: 'operatorId' },
      listHeight: { type: 'string', label: t('identity_attribute_assign.prop.list_height', 'Options height (px or CSS, empty = auto)'), defaultValue: '' },
    },
    createComponent: function () {
      return createComponent(this.type, this.propTypes);
    }
  }
];
