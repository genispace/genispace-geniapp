import type { ReactNode } from 'react';
import type { VisibleWhen } from '@/utils/visibleWhen';
import type { Grid24LayoutConfig } from '@/types/components';

/** Tab item shape stored on Tabs component props.items */
export interface TabsConfigItem {
  key: string;
  label: unknown;
  visibleWhen?: VisibleWhen;
  icon?: string;
  disabled?: boolean;
  closable?: boolean;
  badge?: string | number;
  children?: ReactNode;
  component?: unknown;
  components?: unknown[];
  render?: () => ReactNode;
  componentConfig?: {
    type: 'single' | 'multiple';
    data?: unknown;
    props?: Record<string, unknown>;
  };
  layout?: Grid24LayoutConfig;
}

/** Pass through tab item fields needed at runtime (avoid dropping visibleWhen, icon, etc.). */
export function mapTabsConfigItemsForRenderer(items: TabsConfigItem[]): TabsConfigItem[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    visibleWhen: item.visibleWhen,
    icon: item.icon,
    disabled: item.disabled,
    closable: item.closable,
    badge: item.badge,
    children: item.children,
    component: item.component,
    components: item.components,
    render: item.render,
    componentConfig: item.componentConfig,
    layout: item.layout,
  }));
}
