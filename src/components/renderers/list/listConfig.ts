import type { ListColumn, ListItemLayoutConfig, ListRendererProps } from '@/types/renderers';
import type { TableAction } from '@/types';
import i18n from '@/locales/i18n';

export function resolveListActions(
  actions?: TableAction[],
  rowActions?: TableAction[],
  toolbarActions?: TableAction[]
): {
  rowActions: TableAction[];
  toolbarActions: TableAction[];
  rowClickActions: TableAction[];
} {
  const explicitRow = rowActions ?? [];
  const explicitToolbar = toolbarActions ?? [];
  if (explicitRow.length > 0 || explicitToolbar.length > 0) {
    return {
      rowActions: explicitRow.filter((a) => a.triggerMode !== 'rowClick'),
      toolbarActions: explicitToolbar,
      rowClickActions: explicitRow.filter((a) => a.triggerMode === 'rowClick'),
    };
  }
  if (!actions?.length) {
    return { rowActions: [], toolbarActions: [], rowClickActions: [] };
  }
  return {
    rowActions: actions.filter(
      (a) => a.position !== 'global' && a.triggerMode !== 'rowClick'
    ),
    toolbarActions: actions.filter((a) => a.position === 'global'),
    rowClickActions: actions.filter((a) => a.triggerMode === 'rowClick'),
  };
}

export function resolveRowClickAction(
  itemLayoutConfig?: ListItemLayoutConfig,
  rowClickActions?: TableAction[]
): TableAction | undefined {
  return itemLayoutConfig?.rowClickAction ?? rowClickActions?.[0];
}

export function isListActionVisible(
  action: TableAction,
  record: Record<string, unknown>
): boolean {
  if (!action.visibilityCondition) return true;
  const { field, operator, value } = action.visibilityCondition;
  const recordValue = record[field];
  switch (operator) {
    case 'equals':
      return recordValue === value;
    case 'not_equals':
      return recordValue !== value;
    case 'in':
      return Array.isArray(value) && value.includes(recordValue);
    case 'gt':
      return Number(recordValue) > Number(value);
    case 'lt':
      return Number(recordValue) < Number(value);
    case 'contains':
      return String(recordValue).toLowerCase().includes(String(value).toLowerCase());
    default:
      return true;
  }
}

export interface ListColumnSlots {
  title?: ListColumn;
  titleSuffix: ListColumn[];
  subtitle?: ListColumn;
  description?: ListColumn;
  avatar?: ListColumn;
  icon?: ListColumn;
  tags: ListColumn[];
  custom: ListColumn[];
  hasActionsSlot: boolean;
  prefix?: ListColumn;
  meta?: ListColumn;
  progress?: ListColumn;
  extraPrimary?: ListColumn;
  extraSecondary?: ListColumn;
  extraOthers: ListColumn[];
  /** One horizontal row at the top of the row tail (ranking template right-block top row, e.g. rank-change badge group); columns sorted by slotIndex. */
  extraTop: ListColumn[];
  metrics: ListColumn[];
}

export function buildListColumnSlots(columns: ListColumn[]): ListColumnSlots {
  const visible = columns.filter((c) => !c.hidden && c.dataIndex);
  const pick = (slot: ListColumn['slotType']) =>
    visible
      .filter((c) => c.slotType === slot)
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

  const extraCols = pick('extra');
  const extraPrimary =
    extraCols.find((c) => c.lineRole === 'primary') ?? extraCols[0];
  const extraSecondary =
    extraCols.find((c) => c.lineRole === 'secondary') ??
    extraCols.find((c) => c !== extraPrimary);
  const extraOthers = extraCols.filter(
    (c) => c !== extraPrimary && c !== extraSecondary
  );

  return {
    title: pick('title')[0],
    titleSuffix: pick('titleSuffix'),
    subtitle: pick('subtitle')[0],
    description: pick('description')[0],
    avatar: pick('avatar')[0],
    icon: pick('icon')[0],
    tags: pick('tags'),
    custom: pick('custom'),
    hasActionsSlot: visible.some((c) => c.slotType === 'actions'),
    prefix: pick('prefix')[0],
    meta: pick('meta')[0],
    progress: pick('progress')[0],
    extraPrimary,
    extraSecondary,
    extraOthers,
    extraTop: pick('extraTop'),
    metrics: pick('metric'),
  };
}

export const EMPTY_DEFAULT_SORT: Array<{
  field: string;
  direction: 'asc' | 'desc';
}> = [];

export function sortStateToQuery(
  sortState: Array<{ field: string; direction: 'asc' | 'desc' }>
): string | undefined {
  if (!sortState.length) return undefined;
  return sortState
    .map(({ field, direction }) => `${field} ${direction.toUpperCase()}`)
    .join(', ');
}

export interface ListColumnPreset {
  columns: ListColumn[];
  itemLayoutConfig?: ListItemLayoutConfig;
  /** List props aligned with column slot layout (see list-dashboard-demo.json) */
  listProps?: Partial<
    Pick<
      ListRendererProps,
      'split' | 'pagination' | 'defaultSort' | 'showRefresh' | 'selectionType'
    >
  >;
}

/** Subtask List — list-dashboard-demo.json comp-subtask-list */
export const SUBTASK_LIST_PRESET: ListColumnPreset = {
  itemLayoutConfig: { template: 'progress-task' },
  listProps: {
    split: true,
    showRefresh: false,
    selectionType: 'none',
  },
  columns: [
    { dataIndex: 'taskName', slotType: 'title' },
    {
      dataIndex: 'taskType',
      slotType: 'meta',
      render: {
        type: 'Tag',
        colorMap: { 'Chat Task': 'purple', 'Moments Task': 'purple' },
        props: { variant: 'pill', tagSize: 'xs' },
      },
    },
    {
      dataIndex: 'progress',
      slotType: 'progress',
      render: {
        type: 'Progress',
        props: {
          max: 100,
          showPercent: true,
          percentPosition: 'right',
          fullWidth: true,
          barColor: 'green',
          size: 'md',
        },
      },
    },
  ],
};

/** Top 10 SKUs — list-dashboard-demo.json comp-top-skus */
export const TOP_SKUS_PRESET: ListColumnPreset = {
  itemLayoutConfig: {
    template: 'ranking',
  },
  listProps: {
    showRefresh: false,
    selectionType: 'none',
    pagination: { pageSize: 10 },
    defaultSort: [{ field: 'qty', direction: 'desc' }],
  },
  columns: [
    {
      dataIndex: '_rank',
      slotType: 'prefix',
      render: {
        type: 'Rank',
        props: {
          rankSource: 'index',
          rankStyle: 'circle',
          topHighlight: 3,
          topColor: 'orange',
        },
      },
    },
    {
      dataIndex: 'name',
      slotType: 'title',
      render: { props: { fontWeight: 'semibold' } },
    },
    {
      dataIndex: 'skuInfo',
      slotType: 'subtitle',
      render: { props: { fontSize: 'xs' } },
    },
    {
      dataIndex: 'qty',
      slotType: 'extra',
      lineRole: 'primary',
      render: {
        type: 'Number',
        props: { format: 'plain', align: 'right', fontWeight: 'semibold' },
      },
    },
    {
      dataIndex: 'amount',
      slotType: 'extra',
      lineRole: 'secondary',
      render: {
        type: 'Currency',
        props: { prefix: '¥', align: 'right', fontSize: 'xs' },
      },
    },
  ],
};

/** Top 5 Stores — list-dashboard-demo.json comp-top-stores */
export const TOP_STORES_PRESET: ListColumnPreset = {
  itemLayoutConfig: {
    template: 'ranking',
  },
  listProps: {
    showRefresh: false,
    selectionType: 'none',
    pagination: { pageSize: 5 },
    defaultSort: [{ field: 'sales', direction: 'desc' }],
  },
  columns: [
    {
      dataIndex: '_rank',
      slotType: 'prefix',
      render: {
        type: 'Rank',
        props: {
          rankSource: 'index',
          rankStyle: 'rounded-square',
          topHighlight: 3,
          topColor: 'gradient-orange',
        },
      },
    },
    {
      dataIndex: 'storeName',
      slotType: 'title',
      render: { props: { fontWeight: 'medium' } },
    },
    {
      dataIndex: 'sales',
      slotType: 'progress',
      render: {
        type: 'Progress',
        props: {
          relativeTo: 'pageMax',
          relativeField: 'sales',
          fullWidth: true,
          barColor: 'purple',
          size: 'sm',
        },
      },
    },
    {
      dataIndex: 'sales',
      slotType: 'extra',
      lineRole: 'primary',
      render: {
        type: 'Currency',
        props: {
          format: 'compact',
          prefix: '¥',
          suffix: 'w',
          decimals: 1,
          compactThreshold: 10000,
          compactDivisor: 10000,
          align: 'right',
          fontWeight: 'medium',
        },
      },
    },
  ],
};

/** Product card list — mobile SKU catalog (title + status + 4 KPI metrics) */
export const PRODUCT_CARD_PRESET: ListColumnPreset = {
  itemLayoutConfig: { template: 'product-card', rowGap: 'md' },
  listProps: {
    split: true,
    showRefresh: true,
    selectionType: 'none',
  },
  columns: [
    {
      dataIndex: 'display_name',
      slotType: 'title',
      render: { props: { fontWeight: 'semibold', fontSize: 'sm' } },
    },
    {
      dataIndex: 'product_status',
      slotType: 'meta',
      render: {
        type: 'Tag',
        colorMap: {
          新品: 'green',
          正常品: 'gray',
          清场商品: 'rose',
        },
        props: { variant: 'pill', tagSize: 'xs' },
      },
    },
    {
      dataIndex: 'subtitle',
      slotType: 'subtitle',
      render: { props: { fontSize: 'xs' } },
    },
    {
      dataIndex: 'retail_price',
      title: i18n.t('renderers:list.preset_product_card.retail_price', 'Retail Price'),
      slotType: 'metric',
      render: {
        type: 'Currency',
        props: { prefix: '¥', decimals: 0, fontWeight: 'medium', fontSize: 'xs' },
      },
    },
    {
      dataIndex: 'current_stock',
      title: i18n.t('renderers:list.preset_product_card.current_stock', 'Current Stock'),
      slotType: 'metric',
      render: { type: 'Number', props: { format: 'plain', fontWeight: 'medium', fontSize: 'xs' } },
    },
    {
      dataIndex: 'turnover_days',
      title: i18n.t('renderers:list.preset_product_card.turnover_days', 'Turnover Days'),
      slotType: 'metric',
      render: {
        type: 'Number',
        props: {
          format: 'plain',
          suffix: i18n.t('renderers:list.preset_product_card.days_suffix', 'days'),
          fontWeight: 'medium',
          fontSize: 'xs',
        },
      },
    },
    {
      dataIndex: 'mom_growth_pct',
      title: i18n.t('renderers:list.preset_product_card.mom_growth_pct', 'MoM Growth'),
      slotType: 'metric',
      render: { type: 'Trend', props: { decimals: 1 } },
    },
    {
      dataIndex: 'plu',
      title: 'PLU',
      slotType: 'custom',
      hidden: true,
      fieldType: 'VARCHAR',
    },
    {
      dataIndex: 'color_code',
      title: i18n.t('renderers:list.preset_product_card.color_code', 'Color'),
      slotType: 'custom',
      hidden: true,
      fieldType: 'VARCHAR',
    },
    {
      dataIndex: 'size',
      title: i18n.t('renderers:list.preset_product_card.size', 'Size'),
      slotType: 'custom',
      hidden: true,
      fieldType: 'VARCHAR',
    },
  ],
};

export const LIST_COLUMN_PRESETS = [
  { id: 'subtask-list', preset: SUBTASK_LIST_PRESET },
  { id: 'top-skus', preset: TOP_SKUS_PRESET },
  { id: 'top-stores', preset: TOP_STORES_PRESET },
  { id: 'product-card', preset: PRODUCT_CARD_PRESET },
] as const;

export function applyListColumnPreset(
  preset: ListColumnPreset,
  onPropChange: (key: string, value: unknown) => void
): void {
  onPropChange('itemLayoutConfig', preset.itemLayoutConfig ?? {});
  onPropChange('columns', preset.columns);
  if (preset.listProps) {
    for (const [key, value] of Object.entries(preset.listProps)) {
      onPropChange(key, value);
    }
  }
}
