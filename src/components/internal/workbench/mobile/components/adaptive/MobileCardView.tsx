import React from 'react';
import { CardRenderer } from '@/components/renderers';

type MobileCardViewProps = React.ComponentProps<typeof CardRenderer>;

export function MobileCardView({ children, ...props }: MobileCardViewProps) {
  return (
    <div className="mobile-card-view w-full">
      <CardRenderer {...props}>{children}</CardRenderer>
    </div>
  );
}
