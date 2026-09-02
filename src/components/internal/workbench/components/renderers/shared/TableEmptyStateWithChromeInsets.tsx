import type { ComponentProps, ComponentType } from 'react';
import { TableEmptyState } from '../../skeleton';
import { useTabActivity } from '@/contexts/TabActivityContext';
import { useMobileChromeInsets } from './useMobileChromeInsets';

type TableEmptyStateBaseProps = ComponentProps<typeof TableEmptyState>;

/** Props accepted by shared-ui once topInset/bottomInset land on main. */
type TableEmptyStateWithInsetsProps = TableEmptyStateBaseProps & {
  topInset?: number;
  bottomInset?: number;
};

const TableEmptyStateWithInsets =
  TableEmptyState as ComponentType<TableEmptyStateWithInsetsProps>;

export interface TableEmptyStateWithChromeInsetsProps extends TableEmptyStateBaseProps {
  /** When true with floatBadge, keep the badge clear of mobile sticky header / bottom nav. */
  avoidMobileChrome?: boolean;
  /** Re-measure chrome insets when this changes (e.g. empty state becomes visible). */
  chromeRemeasureKey?: unknown;
}

export function TableEmptyStateWithChromeInsets({
  avoidMobileChrome = false,
  chromeRemeasureKey,
  floatBadge,
  ...rest
}: TableEmptyStateWithChromeInsetsProps) {
  // Inactive keep-alive tabs are hidden with opacity 0, which cannot hide a badge portaled
  // to document.body — fall back to the in-flow badge there so it hides with the tab.
  const tabActive = useTabActivity();
  const effectiveFloatBadge = !!floatBadge && tabActive;
  const useInsets = !!(effectiveFloatBadge && avoidMobileChrome);
  const insets = useMobileChromeInsets(useInsets, chromeRemeasureKey);

  return (
    <TableEmptyStateWithInsets
      floatBadge={effectiveFloatBadge}
      {...rest}
      {...(useInsets ? { topInset: insets.top, bottomInset: insets.bottom } : {})}
    />
  );
}
