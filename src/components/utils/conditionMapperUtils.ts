import i18n from '@/locales/i18n';

export const getOperatorLabel = (operator: string): string => {
  switch (operator) {
    case 'equals':
      return i18n.t('editor:condition_mapper_utils.equals', 'Equals (=)');
    case 'not_equals':
      return i18n.t('editor:condition_mapper_utils.not_equals', 'Not Equals (≠)');
    case 'in':
      return i18n.t('editor:condition_mapper_utils.in', 'In (IN)');
    case 'not_in':
      return i18n.t('editor:condition_mapper_utils.not_in', 'Not In (NOT IN)');
    case 'like':
      return i18n.t('editor:condition_mapper_utils.like', 'Like (LIKE)');
    case 'between':
      return i18n.t('editor:condition_mapper_utils.between', 'Between (BETWEEN)');
    default:
      return operator;
  }
};

export const getOperatorColor = (operator: string): string => {
  switch (operator) {
    case 'equals':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
    case 'not_equals':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
    case 'in':
    case 'not_in':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
    case 'like':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
    case 'between':
      return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20';
  }
};

export const getEnhancedOperatorColor = (operator: string): string => {
  switch (operator) {
    case 'equals': 
      return 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300';
    case 'not_equals': 
      return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
    case 'in': 
    case 'not_in': 
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'like': 
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
    case 'between': 
      return 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
    default: 
      return 'bg-neutral-50 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300';
  }
};

export const findRecommendedField =<T extends { dataIndex?: string; name?: string }>(
  fields: T[],
  usedFields: string[]
): T | null => {
  const unusedFields = fields.filter(field => {
    const fieldName = field.dataIndex || field.name || '';
    return !usedFields.includes(fieldName);
  });

  if (unusedFields.length === 0) return null;

  const idField = unusedFields.find(field => {
    const fieldName = (field.dataIndex || field.name || '').toLowerCase();
    return fieldName === 'id' || 
           fieldName.endsWith('_id') ||
           fieldName.endsWith('id');
  });

  return idField || unusedFields[0];
};

export const generateConditionDescription = (
  fieldName: string,
  condition: any
): string => {
  const operatorLabel = getOperatorLabel(condition.operator || 'equals');
  let valueDisplay: string;

  switch (condition.source) {
    case 'parameter':
      valueDisplay = `{param.${condition.value}}`;
      break;
    case 'column':
      valueDisplay = `{column.${condition.value}}`;
      break;
    default:
      valueDisplay = condition.value || i18n.t('editor:condition_mapper_utils.not_set', '(Not Set)');
  }

  return i18n.t('editor:condition_mapper_utils.condition_description', 'When {{fieldName}} {{operatorLabel}} {{valueDisplay}} then execute update', { fieldName, operatorLabel, valueDisplay });
};

export const OPERATOR_OPTIONS = [
  { value: 'equals', label: i18n.t('editor:condition_mapper_utils.equals', 'Equals (=)') },
  { value: 'not_equals', label: i18n.t('editor:condition_mapper_utils.not_equals', 'Not Equals (≠)') },
  { value: 'in', label: i18n.t('editor:condition_mapper_utils.in', 'In (IN)') },
  { value: 'not_in', label: i18n.t('editor:condition_mapper_utils.not_in', 'Not In (NOT IN)') },
  { value: 'like', label: i18n.t('editor:condition_mapper_utils.like', 'Like (LIKE)') },
  { value: 'between', label: i18n.t('editor:condition_mapper_utils.between', 'Between (BETWEEN)') }
] as const;

export const SOURCE_OPTIONS = {
  BASIC: [
    { value: 'column', label: i18n.t('editor:condition_mapper_utils.column_value', 'Column Value'), icon: 'Table' },
    { value: 'input_field', label: i18n.t('editor:condition_mapper_utils.form_input_field', 'Form Input Field'), icon: 'Database' },
    { value: 'static', label: i18n.t('editor:condition_mapper_utils.static_value', 'Static Value'), icon: 'Database' },
    { value: 'parameter', label: i18n.t('editor:condition_mapper_utils.parameter_value', 'Parameter Value'), icon: 'Settings' }
  ],
  ENHANCED: [
    { value: 'column', label: i18n.t('editor:condition_mapper_utils.column_value', 'Column Value'), icon: 'Table' },
    { value: 'static', label: i18n.t('editor:condition_mapper_utils.static_value', 'Static Value'), icon: 'Database' },
    { value: 'parameter', label: i18n.t('editor:condition_mapper_utils.parameter_value', 'Parameter Value'), icon: 'Settings' }
  ]
} as const;
