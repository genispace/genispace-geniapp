import React from 'react';
import TabsRenderer from '@/components/renderers/TabsRenderer';

type MobileTabsViewProps = React.ComponentProps<typeof TabsRenderer>;

export function MobileTabsView(props: MobileTabsViewProps) {
  // overflow-x: clip (not auto) clips horizontal overflow WITHOUT becoming a scroll container, so a
  // sticky table header clone inside a tab pins to the page scrollport (below the FilterPanel)
  // instead of being trapped by this wrapper. Inner tables keep their own horizontal scrollers.
  return (
    <div className="mobile-tabs-view w-full overflow-x-clip">
      <TabsRenderer {...props} />
    </div>
  );
}
