/**
 * Shared Table / List / EditableTable action button visual mapping.
 * Must stay aligned with help: /help/table-action-button-style
 */

export type TableActionButtonPlacement = 'toolbar' | 'row';

type TableActionButtonVisualVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'subtle'
  | 'link';

export function getTableActionButtonVariant(
  placement: TableActionButtonPlacement,
  variant?: string
): TableActionButtonVisualVariant {
  if (placement === 'toolbar') {
    switch (variant) {
      case 'destructive':
        return 'ghost';
      case 'outline':
        return 'outline';
      case 'secondary':
        return 'secondary';
      case 'primary':
      case 'default':
        return 'default';
      case 'approve':
      case 'reject':
      case 'success':
      case 'warning':
      case 'info':
        return 'ghost';
      default:
        return 'default';
    }
  }
  switch (variant) {
    case 'destructive':
      return 'ghost';
    case 'outline':
      return 'ghost';
    case 'secondary':
      return 'subtle';
    case 'primary':
    case 'default':
      return 'ghost';
    case 'approve':
    case 'reject':
    case 'success':
    case 'warning':
    case 'info':
      return 'ghost';
    default:
      return 'ghost';
  }
}

export function getSemanticActionButtonTextColor(variant?: string): string {
  switch (variant) {
    case 'approve':
      return 'text-primary hover:text-primary/90 hover:bg-primary/10 dark:hover:bg-primary/15';
    case 'reject':
      return 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20';
    case 'success':
      return 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20';
    case 'warning':
      return 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20';
    case 'info':
      return 'text-primary hover:text-primary/90 hover:bg-primary/10 dark:hover:bg-primary/15';
    default:
      return '';
  }
}

export function getTableActionButtonExtraClassName(
  placement: TableActionButtonPlacement,
  variant: string | undefined,
  hasIcon: boolean,
  hasLabel: boolean
): string {
  if (variant === 'destructive') {
    if (hasIcon && hasLabel) {
      return '[&_svg]:text-destructive hover:[&_svg]:text-destructive/90 text-foreground';
    }
    if (hasIcon) {
      return 'text-destructive hover:text-destructive/90';
    }
    if (hasLabel) {
      return 'text-destructive hover:text-destructive/90';
    }
    return '';
  }
  if (placement === 'row') {
    if (variant === 'primary' || variant === 'default') {
      return 'font-medium text-foreground';
    }
    if (variant === 'outline') {
      return 'border border-border bg-transparent shadow-none hover:bg-muted/50';
    }
  }
  return getSemanticActionButtonTextColor(variant);
}

export function getTableActionButtonSize(
  placement: TableActionButtonPlacement,
  hasIcon: boolean,
  hasLabel: boolean
): 'sm' | 'icon' {
  if (placement === 'row') {
    return !hasIcon && hasLabel ? 'sm' : 'icon';
  }
  return 'sm';
}

export function getTableActionButtonLayoutClassName(
  placement: TableActionButtonPlacement,
  hasIcon: boolean,
  hasLabel: boolean
): string {
  if (!hasIcon || !hasLabel) return '';
  return placement === 'row' ? 'gap-1.5 w-auto px-3' : 'gap-1.5';
}
