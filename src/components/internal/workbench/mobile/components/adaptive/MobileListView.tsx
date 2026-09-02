import React from 'react';
import { ListRenderer } from '@/components/renderers/ListRenderers';
import type { ListRendererProps } from '@/types/renderers';

/** Mobile-optimized List wrapper. */
export const MobileListView: React.FC<ListRendererProps> = (props) => {
  return <ListRenderer {...props} itemLayoutConfig={props.itemLayoutConfig} />;
};

export default MobileListView;
