export const TASK_STATUS_COLORS = {
  COMPLETED: 'text-green-600 dark:text-green-400',
  FAILED: 'text-destructive',
  TIMEOUT: 'text-destructive',
  PENDING: 'text-yellow-600 dark:text-yellow-400', 
  RUNNING: 'text-blue-600 dark:text-blue-400',
  RETRY: 'text-orange-600 dark:text-orange-400',
  CANCELED: 'text-muted-foreground'
} as const;

export const TASK_STATUS_BG_COLORS = {
  COMPLETED: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  FAILED: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  TIMEOUT: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  PENDING: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  RUNNING: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  RETRY: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  CANCELED: 'bg-muted border-muted-foreground/20'
} as const;

export const SEMANTIC_COLORS = {

  text: {
    primary: 'text-foreground',
    secondary: 'text-muted-foreground',
    muted: 'text-muted-foreground',
    error: 'text-destructive',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  },

  background: {
    primary: 'bg-background',
    secondary: 'bg-muted',
    card: 'bg-card',
    error: 'bg-red-50 dark:bg-red-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20'
  },

  border: {
    primary: 'border-border',
    muted: 'border-muted-foreground/20',
    error: 'border-red-200 dark:border-red-800',
    success: 'border-green-200 dark:border-green-800',
    warning: 'border-yellow-200 dark:border-yellow-800',
    info: 'border-blue-200 dark:border-blue-800'
  },

  hover: {
    primary: 'hover:bg-accent hover:text-accent-foreground',
    secondary: 'hover:bg-muted',
    error: 'hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600',
    success: 'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600',
    warning: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600',
    info: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600'
  }
} as const;

export const ICON_COLORS = {
  folder: 'text-blue-500 dark:text-neutral-400',
  file: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  error: 'text-destructive',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
  loading: 'text-muted-foreground'
} as const;

export const PRIORITY_COLORS = {
  high: 'text-red-600 dark:text-red-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-green-600 dark:text-green-400',
  normal: 'text-muted-foreground'
} as const;

export const CHART_CATEGORICAL_COLORS = [
  '#6B8EBF',
  '#6FA68C',
  '#B89A6B',
  '#C7897D',
  '#8B86B3',
  '#5E9D9A',
  '#A08098',
  '#8FA66F',
  '#A69484',
  '#7E9BB5'
] as const;

export const CHART_SEQUENCE_COLORS = CHART_CATEGORICAL_COLORS;

export const CHART_COLOR_SCHEME_IDS = [
  'default',
  'vivid',
  'ocean',
  'sunset',
  'forest',
  'contrast',
  'logistics'
] as const;

export const ECHARTS_CHART_COLOR_SCHEME_IDS = CHART_COLOR_SCHEME_IDS;

export type ChartColorSchemeId = (typeof CHART_COLOR_SCHEME_IDS)[number];
export type EChartsChartColorSchemeId = ChartColorSchemeId;

const CHART_COLOR_SCHEMES: Record<ChartColorSchemeId, readonly string[]> = {
  default: CHART_CATEGORICAL_COLORS,
  vivid: [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#0891b2',
    '#9333ea',
    '#db2777',
    '#ca8a04',
    '#059669',
    '#4f46e5',
    '#dc2626'
  ],
  ocean: [
    '#0e7490',
    '#0284c7',
    '#0369a1',
    '#0d9488',
    '#155e75',
    '#075985',
    '#06b6d4',
    '#38bdf8',
    '#14b8a6',
    '#5eead4'
  ],
  sunset: [
    '#fb923c',
    '#ea580c',
    '#f59e0b',
    '#eab308',
    '#c026d3',
    '#ef4444',
    '#f97316',
    '#db2777',
    '#be123c',
    '#f43f5e'

  ],
  forest: [
    '#14532d',
    '#166534',
    '#15803d',
    '#3f6212',
    '#365314',
    '#854d0e',
    '#a16207',
    '#ca8a04',
    '#4d7c0f',
    '#65a30d'
  ],
  contrast: [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc',
    '#37a2da',
    '#ee6666'
  ],

  // Flat solid palette aligned with design tokens (no neon / gradient-friendly brights)
  logistics: [
    '#3B82F6',
    '#3498DB',
    '#27AE60',
    '#F39C12',
    '#6366F1',
    '#0EA5E9',
    '#14B8A6',
    '#8B5CF6',
    '#84CC16',
    '#EC4899'
  ]
};

const LEGACY_CHART_COLOR_SCHEME_MAP: Record<string, ChartColorSchemeId> = {
  category10: 'contrast',
  category20: 'default',
  blues: 'ocean',
  greens: 'forest',
  reds: 'sunset'
};

export function normalizeChartColorSchemeId(schemeId: string | undefined): ChartColorSchemeId {
  const raw = String(schemeId ?? 'default').trim();
  if ((CHART_COLOR_SCHEME_IDS as readonly string[]).includes(raw)) {
    return raw as ChartColorSchemeId;
  }
  return LEGACY_CHART_COLOR_SCHEME_MAP[raw] ?? 'default';
}

export function resolveEchartsChartPalette(
  schemeId: string | undefined,
  customColors?: string[] | null
): string[] {
  if (Array.isArray(customColors) && customColors.length > 0) {
    return [...customColors];
  }
  const id = normalizeChartColorSchemeId(schemeId);
  return [...CHART_COLOR_SCHEMES[id]];
}

export function getPresetChartColorSchemeColors(schemeId: string | undefined): string[] {
  const id = normalizeChartColorSchemeId(schemeId);
  return [...CHART_COLOR_SCHEMES[id]];
}

export const getTaskStatusIconColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return ICON_COLORS.success;
    case 'FAILED':
    case 'TIMEOUT':
      return ICON_COLORS.error;
    case 'PENDING':
      return ICON_COLORS.warning;
    case 'RUNNING':
      return ICON_COLORS.info;
    case 'RETRY':
      return 'text-orange-600 dark:text-orange-400';
    case 'CANCELED':
      return ICON_COLORS.loading;
    default:
      return ICON_COLORS.loading;
  }
};

export const getTaskStatusTextColor = (status: string): string => {
  return TASK_STATUS_COLORS[status as keyof typeof TASK_STATUS_COLORS] || TASK_STATUS_COLORS.PENDING;
};

export const getTaskStatusBgColor = (status: string): string => {
  return TASK_STATUS_BG_COLORS[status as keyof typeof TASK_STATUS_BG_COLORS] || TASK_STATUS_BG_COLORS.PENDING;
};

export type TaskStatus = keyof typeof TASK_STATUS_COLORS;
export type SemanticColorType = keyof typeof SEMANTIC_COLORS;
export type SemanticColorVariant = keyof typeof SEMANTIC_COLORS.text; 