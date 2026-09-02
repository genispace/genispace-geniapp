import React from 'react';
import TableRenderer from '@/renderers/table/TableRenderer';

export type MobileTableViewProps = React.ComponentProps<typeof TableRenderer>;

/**
 * Mobile wrapper around TableRenderer.
 * Reuses mock / dataset / database data loading so tables render on mobile.
 */
export function MobileTableView(props: MobileTableViewProps) {
  return (
    <div className="mobile-table-view w-full min-w-0 overflow-hidden">
      <TableRenderer {...props} />
    </div>
  );
}
