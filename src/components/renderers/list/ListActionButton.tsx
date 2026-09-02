import React from 'react';
import { Button } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { renderLucideIcon } from '@/utils/iconUtils';
import type { TableAction } from '@/types';
import {
  getTableActionButtonExtraClassName,
  getTableActionButtonLayoutClassName,
  getTableActionButtonSize,
  getTableActionButtonVariant,
  type TableActionButtonPlacement,
} from '@/utils/tableActionButtonRender';

interface ListActionButtonProps {
  action: TableAction;
  placement: TableActionButtonPlacement;
  onClick: (e: React.MouseEvent) => void;
}

export const ListActionButton: React.FC<ListActionButtonProps> = ({
  action,
  placement,
  onClick,
}) => {
  const hasIcon = Boolean(action.icon?.trim());
  const hasLabel = Boolean(action.label?.trim());

  if (!hasLabel && !hasIcon) return null;

  return (
    <Button
      type="button"
      size={getTableActionButtonSize(placement, hasIcon, hasLabel)}
      variant={getTableActionButtonVariant(placement, action.variant)}
      title={action.label}
      className={cn(
        getTableActionButtonLayoutClassName(placement, hasIcon, hasLabel),
        getTableActionButtonExtraClassName(placement, action.variant, hasIcon, hasLabel)
      )}
      onClick={onClick}
    >
      {hasIcon && renderLucideIcon(action.icon || '', 'w-4 h-4')}
      {hasLabel && (
        <span className={placement === 'row' ? 'text-xs whitespace-nowrap' : 'text-sm'}>
          {action.label}
        </span>
      )}
    </Button>
  );
};
