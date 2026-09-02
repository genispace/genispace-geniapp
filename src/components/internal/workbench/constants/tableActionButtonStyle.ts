/**
 * Table / EditableTable action button styles: shared by property panel options, i18n fallbacks,
 * help route, and TableRenderer behavior. (Not help-only; help content reuses the same variant list.)
 */

export const TABLE_ACTION_BUTTON_STYLE_HELP_PATH = '/help/table-action-button-style' as const;

export const TABLE_ACTION_BUTTON_STYLE_VARIANTS = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'approve',
  'reject',
  'success',
  'warning',
  'info',
] as const;

export type TableActionButtonStyleVariant = (typeof TABLE_ACTION_BUTTON_STYLE_VARIANTS)[number];

/** English fallbacks for useTranslation('editor') keys table_property_editor.button_style_*; matches t(key, default) second arg */
export const TABLE_ACTION_BUTTON_STYLE_LABEL_FALLBACK: Record<TableActionButtonStyleVariant, string> = {
  default: 'Default',
  destructive: 'Destructive',
  outline: 'Outline',
  secondary: 'Secondary',
  approve: 'Approve',
  reject: 'Reject',
  success: 'Success',
  warning: 'Warning',
  info: 'Info',
};

/**
 * Action types that open `ActionFormDialog` when `TableRenderer` has `inputMode === 'form'`.
 * The property panel should align when showing direct vs form confirm and form options (incl. DB insert/delete, etc.).
 */
export const TABLE_ACTION_TYPES_WITH_FORM_MODE = [
  'updateDataset',
  'insertDataset',
  'updateDatabase',
  'insertDatabase',
  'deleteDatabase',
  'transactionDatabase',
] as const;

export function tableActionSupportsFormMode(type: string): boolean {
  return (TABLE_ACTION_TYPES_WITH_FORM_MODE as readonly string[]).includes(type);
}
