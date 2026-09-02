import i18n from '@/locales/i18n';
import { getComponentDisplayName } from '@/utils/componentUtils';
import type { Grid24Preset, Grid24Component, Grid24LayoutConfig } from '@/types/components';

export const MAX_GRID24_NESTING_DEPTH = 3;

export interface Grid24PresetConfig {
  rows: Array<{ colSpan: number }>;
}

/** Preset id → i18n key under `workbench:grid24.presets.*` (underscores). */
export function grid24PresetToTranslationKey(preset: Exclude<Grid24Preset, 'custom'>): string {
  return preset.replace(/-/g, '_');
}

/** English labels for `t(..., defaultValue)` before workbench namespace loads. */
export const GRID24_PRESET_LABEL_FALLBACK: Record<Exclude<Grid24Preset, 'custom'>, string> = {
  single: 'Single column',
  'two-equal': 'Two equal',
  'three-equal': 'Three equal',
  'two-ratio-1-2': '1:2',
  'two-ratio-2-1': '2:1',
  'two-ratio-3-1': '3:1',
  'four-equal': 'Four equal',
  'top-bottom': 'Top + bottom two',
  'top-three-bottom': 'Top + bottom three',
  dashboard: 'Dashboard',
};

export const GRID24_PRESETS: Record<Exclude<Grid24Preset, 'custom'>, Grid24PresetConfig> = {
  single: {
    rows: [{ colSpan: 24 }],
  },
  'two-equal': {
    rows: [{ colSpan: 12 }, { colSpan: 12 }],
  },
  'three-equal': {
    rows: [{ colSpan: 8 }, { colSpan: 8 }, { colSpan: 8 }],
  },
  'two-ratio-1-2': {
    rows: [{ colSpan: 8 }, { colSpan: 16 }],
  },
  'two-ratio-2-1': {
    rows: [{ colSpan: 16 }, { colSpan: 8 }],
  },
  'two-ratio-3-1': {
    rows: [{ colSpan: 18 }, { colSpan: 6 }],
  },
  'four-equal': {
    rows: [{ colSpan: 6 }, { colSpan: 6 }, { colSpan: 6 }, { colSpan: 6 }],
  },
  'top-bottom': {
    rows: [{ colSpan: 24 }, { colSpan: 12 }, { colSpan: 12 }],
  },
  'top-three-bottom': {
    rows: [{ colSpan: 24 }, { colSpan: 8 }, { colSpan: 8 }, { colSpan: 8 }],
  },
  dashboard: {
    rows: [
      { colSpan: 24 },
      { colSpan: 8 },
      { colSpan: 8 },
      { colSpan: 8 },
      { colSpan: 12 },
      { colSpan: 12 },
      { colSpan: 24 },
    ],
  },
};

export function generateComponentsFromPreset(
  preset: Exclude<Grid24Preset, 'custom'>,
  componentIds: string[]
): Grid24Component[] {
  const config = GRID24_PRESETS[preset];
  const components: Grid24Component[] = [];
  let componentIndex = 0;

  config.rows.forEach((row, rowIndex) => {
    let currentCol = 0;
    while (currentCol < 24 && componentIndex < componentIds.length) {
      components.push({
        id: componentIds[componentIndex],
        colStart: currentCol,
        colSpan: row.colSpan,
        rowStart: rowIndex,
        rowSpan: 1,
      });
      currentCol += row.colSpan;
      componentIndex++;
    }
  });

  let extraRow = 0;
  while (componentIndex < componentIds.length) {
    components.push({
      id: componentIds[componentIndex],
      colStart: 0,
      colSpan: 24,
      rowStart: config.rows.length + extraRow,
      rowSpan: 1,
    });
    extraRow++;
    componentIndex++;
  }

  return components;
}

export function computeRowCount(components: Grid24Component[]): number {
  if (components.length === 0) return 0;
  return Math.max(...components.map((c) => c.rowStart + c.rowSpan));
}

export function groupComponentsByRow(components: Grid24Component[]): Grid24Component[][] {
  const rowCount = computeRowCount(components);
  if (rowCount <= 0) return [];
  const rows: Grid24Component[][] = Array.from({ length: rowCount }, () => []);

  components.forEach((comp) => {
    const r = comp.rowStart;
    if (rows[r]) {
      rows[r].push(comp);
    }
  });

  return rows;
}

export function validateRowColSpan(components: Grid24Component[]): boolean {
  const rows = groupComponentsByRow(components);
  return rows.every((row) => row.reduce((sum, c) => sum + c.colSpan, 0) <= 24);
}

function isOverlapping(a: Grid24Component, b: Grid24Component): boolean {
  const aEndCol = a.colStart + a.colSpan;
  const bEndCol = b.colStart + b.colSpan;
  const aEndRow = a.rowStart + a.rowSpan;
  const bEndRow = b.rowStart + b.rowSpan;

  const colOverlap = a.colStart < bEndCol && aEndCol > b.colStart;
  const rowOverlap = a.rowStart < bEndRow && aEndRow > b.rowStart;

  return colOverlap && rowOverlap;
}

export function detectOverlaps(components: Grid24Component[]): Grid24Component[][] {
  const overlaps: Grid24Component[][] = [];

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (isOverlapping(components[i], components[j])) {
        overlaps.push([components[i], components[j]]);
      }
    }
  }

  return overlaps;
}

export function getComponentGridRow(comp: Grid24Component): string {
  return `${comp.rowStart + 1} / span ${comp.rowSpan}`;
}

export function getComponentGridColumn(comp: Grid24Component): string {
  return `${comp.colStart + 1} / span ${comp.colSpan}`;
}

const GRID24_DEFAULT_GAP = 16;
const GRID24_DEFAULT_ROW_HEIGHT = 50;

/** Fill spacing / row metrics when absent (e.g. legacy API omitting fields). */
export function applyGrid24LayoutDefaults(
  config: Partial<Grid24LayoutConfig> & { type: 'grid-24'; components?: Grid24Component[] }
): Grid24LayoutConfig {
  const gap =
    typeof config.gap === 'number' && Number.isFinite(config.gap) ? config.gap : GRID24_DEFAULT_GAP;
  const rowGap =
    typeof config.rowGap === 'number' && Number.isFinite(config.rowGap) ? config.rowGap : GRID24_DEFAULT_GAP;
  const rowHeight =
    typeof config.rowHeight === 'number' && Number.isFinite(config.rowHeight)
      ? config.rowHeight
      : GRID24_DEFAULT_ROW_HEIGHT;

  return {
    ...config,
    type: 'grid-24',
    columns: 24,
    gap,
    rowGap,
    rowHeight,
    components: Array.isArray(config.components) ? config.components : [],
  };
}

export function createDefaultGrid24Layout(componentIds: string[]): Grid24LayoutConfig {
  return applyGrid24LayoutDefaults({
    type: 'grid-24',
    preset: 'single',
    columns: 24,
    components: generateComponentsFromPreset('single', componentIds),
  });
}

/**
 * Sizing capability model (see docs: workbench-component-sizing-plan.md).
 *
 * Height semantics per component type:
 * - 'content'      height follows content; vertical resize is DISABLED in the
 *                  canvas and the view renders its rows as auto-height.
 * - 'fill'         the component stretches/scrolls to the assigned rowSpan;
 *                  the view renders the cell at the exact band height.
 * Every type has one explicit height owner. New/unknown components fail safe
 * to content mode, so the editor never offers a vertical resize that the
 * published renderer cannot honor.
 *
 * w/h are the DEFAULT spans (kept identical to the pre-model values — zero
 * migration); min/max are enforced by canvas handles, keyboard nudge and the
 * copilot layout tools.
 */
export type Grid24SizeMode = 'content' | 'fill';

export interface Grid24SizeCapability {
  w: number;
  h: number;
  mode: Grid24SizeMode;
  minW: number;
  maxW: number;
  minH?: number;
  maxH?: number;
  widthResizable: boolean;
  heightResizable: boolean;
}

const cap = (
  w: number,
  h: number,
  mode: Grid24SizeMode,
  minW: number,
  maxW: number,
  minH?: number,
  maxH?: number,
  extra?: Partial<Grid24SizeCapability>
): Grid24SizeCapability => ({
  w,
  h,
  mode,
  minW,
  maxW,
  minH,
  maxH,
  widthResizable: true,
  heightResizable: mode !== 'content',
  ...extra,
});

export const GRID24_SIZE_CAPABILITIES: Record<string, Grid24SizeCapability> = {
  // fill — stretch/scroll to the assigned band
  // Three rows (~182px with the default grid metrics) support compact table
  // layouts; the table body scrolls within the assigned grid band.
  Table: cap(24, 7, 'fill', 12, 24, 3, 24),
  EditableTable: cap(24, 7, 'fill', 12, 24, 5, 24),
  AnalyticsTable: cap(24, 7, 'fill', 10, 24, 4, 20),
  List: cap(12, 6, 'fill', 6, 24, 3, 20),
  PublishHistory: cap(12, 8, 'fill', 6, 24, 4, 20),
  // Read-only info card (title + description + status + button) — shorter than PublishHistory
  PublishPreviewEntry: cap(12, 4, 'fill', 6, 24, 3, 8),
  DataGridCard: cap(12, 6, 'fill', 6, 24, 4, 16),
  Container: cap(24, 6, 'fill', 6, 24, 3, 24),
  Tabs: cap(24, 7, 'fill', 8, 24, 4, 24),
  // content: height hugs nested children (e.g. StatisticGroup). fill left a
  // scrollable short band or a tall empty shell — neither matches "just fit".
  Card: cap(12, 5, 'content', 4, 24),
  // fill: height is user-resizable; minH=2 keeps a full title+value card visible
  // (~100px). minH=1 clipped cards in half under the default 50px row band.
  StatisticGroup: cap(24, 2, 'fill', 6, 24, 2, 6),
  Statistic: cap(24, 2, 'fill', 6, 24, 2, 6),
  WorkflowComponent: cap(24, 8, 'fill', 12, 24, 6, 24),
  // minH=3 (~166px) — was 4 (~248px), too tall once the chart is narrowed
  EChartsChart: cap(12, 6, 'fill', 6, 24, 3, 18),
  // Grid charts share one source of truth with the edit canvas: the persisted
  // rowSpan band. Their renderers flex inside that exact band in Grid24 while
  // keeping the configured pixel height in non-grid/container contexts.
  Chart: cap(12, 6, 'fill', 6, 24, 4, 16),
  RadarChart: cap(12, 6, 'fill', 6, 24, 4, 16),

  MapChart: cap(12, 6, 'fill', 8, 24, 6, 20),
  Tree: cap(6, 6, 'fill', 4, 12, 4, 16),
  Form: cap(12, 7, 'fill', 6, 24, 4, 20),

  // content — height follows content; vertical resize disabled
  FilterPanel: cap(24, 2, 'content', 8, 24),
  TaskInput: cap(24, 3, 'content', 6, 24),
  ServiceDeskReporter: cap(24, 8, 'content', 12, 24),
  RingStat: cap(6, 3, 'content', 3, 12),
  HeroCard: cap(24, 4, 'content', 6, 24),
  NavTile: cap(6, 3, 'content', 4, 24),
  MetricCarousel: cap(24, 2, 'content', 8, 24),
  // Sanitized declarative markup follows its own document flow. Keeping it in
  // content mode avoids clipping variable-height content and preserves the
  // same sizing behavior as Typography/Card-style content blocks.
  CustomContent: cap(24, 2, 'content', 4, 24),
  // content: height hugs text (auto-fit). Default 1 row — fill@minH=2 left a
  // full empty band under a single line of copy.
  Typography: cap(24, 1, 'content', 4, 24),
  Title: cap(24, 1, 'content', 6, 24),
  Paragraph: cap(24, 1, 'content', 6, 24),
  Text: cap(24, 1, 'content', 4, 24),
  CollapsePanel: cap(24, 4, 'content', 8, 24), // expands/collapses at runtime — never clamp
  TileGrid: cap(12, 5, 'content', 6, 24),
  ProductReport: cap(24, 7, 'content', 8, 24),
  ProductDetail: cap(24, 6, 'content', 8, 24),
  AppIdentityList: cap(12, 6, 'content', 6, 24),
  IdentityAttributeAssign: cap(12, 6, 'content', 6, 24),
};

const GRID24_FALLBACK_CAPABILITY: Grid24SizeCapability = cap(12, 4, 'content', 1, 24);

export function getGrid24SizeCapability(type?: string): Grid24SizeCapability {
  return (type && GRID24_SIZE_CAPABILITIES[type]) || GRID24_FALLBACK_CAPABILITY;
}

/** Backward-compatible projections (palette drops, merge synthesis, copilot). */
export const GRID24_DEFAULT_SIZES: Record<string, { w: number; h: number }> = Object.fromEntries(
  Object.entries(GRID24_SIZE_CAPABILITIES).map(([type, capability]) => [
    type,
    { w: capability.w, h: capability.h },
  ])
);

export function getGrid24DefaultSize(type?: string): { w: number; h: number } {
  const capability = getGrid24SizeCapability(type);
  return { w: capability.w, h: capability.h };
}

/** Clamp a span patch to the type's capability (copilot layout tools, nudge).
    content-mode heights are NOT adjustable: rowSpan writes are dropped (the
    view sizes those rows to content and auto-fit maintains the nominal span). */
export function clampGrid24SpanToCapability(
  type: string | undefined,
  span: { colSpan?: number; rowSpan?: number }
): { colSpan?: number; rowSpan?: number } {
  const capability = getGrid24SizeCapability(type);
  const result: { colSpan?: number; rowSpan?: number } = { ...span };
  if (typeof result.colSpan === 'number') {
    result.colSpan = Math.max(capability.minW, Math.min(capability.maxW, result.colSpan));
  }
  if (typeof result.rowSpan === 'number') {
    if (!capability.heightResizable) {
      delete result.rowSpan;
    } else {
      result.rowSpan = Math.max(capability.minH ?? 1, Math.min(capability.maxH ?? 24, result.rowSpan));
    }
  }
  return result;
}

type Grid24Child = string | { id: string; type?: string };

/**
 * Vertical gravity compaction in grid space (classic dashboard behavior —
 * Retool/Appsmith/Gridstack default): every item floats UP until it touches
 * another item or the top. Freed space (shrink/move-away) is reclaimed
 * automatically instead of requiring manual pull-ups. Intentional vertical
 * whitespace is expressed via component padding / future Spacer components,
 * not empty rows.
 */
export function compactGrid24Vertical(components: Grid24Component[]): Grid24Component[] {
  const colsOverlap = (a: Grid24Component, b: Grid24Component) =>
    a.colStart < b.colStart + b.colSpan && b.colStart < a.colStart + a.colSpan;
  const sorted = [...components].sort(
    (a, b) => a.rowStart - b.rowStart || a.colStart - b.colStart
  );
  const resolvedRow = new Map<string, number>();
  const placed: Grid24Component[] = [];
  const collidesAt = (item: Grid24Component, row: number) =>
    placed.filter(
      (p) =>
        colsOverlap(item, p) &&
        row < resolvedRow.get(p.id)! + p.rowSpan &&
        resolvedRow.get(p.id)! < row + item.rowSpan
    );
  for (const item of sorted) {
    let row = Math.max(0, item.rowStart);
    while (row > 0 && collidesAt(item, row - 1).length === 0) {
      row -= 1;
    }
    for (let guard = 0; guard <= components.length; guard++) {
      const hits = collidesAt(item, row);
      if (hits.length === 0) break;
      row = Math.max(...hits.map((p) => resolvedRow.get(p.id)! + p.rowSpan));
    }
    resolvedRow.set(item.id, row);
    placed.push(item);
  }
  return components.map((item) => {
    const rowStart = resolvedRow.get(item.id) ?? item.rowStart;
    return rowStart === item.rowStart ? item : { ...item, rowStart };
  });
}

/**
 * Push-down overlap resolution in grid space (mirror of the canvas compactor):
 * identity when nothing overlaps; otherwise the activeId item keeps its cell
 * (insert semantics — dropping between two components pushes the ones below
 * DOWN, it never relocates the dropped item to the bottom) and later items in
 * reading order yield downward.
 */
export function resolveGrid24Push(
  components: Grid24Component[],
  activeId?: string
): Grid24Component[] {
  const overlaps = (a: Grid24Component, bRow: number, b: Grid24Component) =>
    a.colStart < b.colStart + b.colSpan &&
    b.colStart < a.colStart + a.colSpan &&
    a.rowStart < bRow + b.rowSpan &&
    bRow < a.rowStart + a.rowSpan;
  const prio = [...components].sort(
    (a, b) =>
      (b.id === activeId ? 1 : 0) - (a.id === activeId ? 1 : 0) ||
      a.rowStart - b.rowStart ||
      a.colStart - b.colStart
  );
  const placed: Array<{ item: Grid24Component; rowStart: number }> = [];
  const resolvedRow = new Map<string, number>();
  for (const item of prio) {
    let rowStart = item.rowStart;
    for (let guard = 0; guard <= components.length; guard++) {
      const hits = placed.filter((p) =>
        overlaps({ ...item, rowStart }, p.rowStart, p.item)
      );
      if (hits.length === 0) break;
      rowStart = Math.max(...hits.map((p) => p.rowStart + p.item.rowSpan));
    }
    placed.push({ item, rowStart });
    resolvedRow.set(item.id, rowStart);
  }
  return components.map((item) => {
    const rowStart = resolvedRow.get(item.id) ?? item.rowStart;
    return rowStart === item.rowStart ? item : { ...item, rowStart };
  });
}

/** Ensure every child id has a grid entry; append missing in new rows (full
    width, type-default height when the child's type is provided). */
export function mergeGrid24WithChildIds(
  config: Grid24LayoutConfig,
  children: Grid24Child[]
): Grid24LayoutConfig {
  const childIds = children.map((c) => (typeof c === 'string' ? c : c.id));
  const typeOf = new Map(
    children.flatMap((c) => (typeof c === 'string' || !c.type ? [] : [[c.id, c.type] as const]))
  );
  const base = applyGrid24LayoutDefaults(config);
  const keep = new Set(childIds);
  const next = base.components.filter((c) => keep.has(c.id));
  const known = new Set(next.map((c) => c.id));
  let maxRowEnd = computeRowCount(next);

  for (const id of childIds) {
    if (!known.has(id)) {
      const capability = getGrid24SizeCapability(typeOf.get(id));
      next.push({
        id,
        colStart: 0,
        // Full width, capped by the type's maxW (a Tree never spans 24).
        colSpan: Math.min(24, capability.maxW),
        rowStart: maxRowEnd,
        rowSpan: capability.h,
      });
      known.add(id);
      maxRowEnd += capability.h;
    }
  }
  return { ...base, components: next };
}

export function sortChildComponentsByGrid<T extends { id: string }>(
  children: T[] | undefined,
  grid: Grid24Component[]
): T[] {
  if (!children?.length) return [];
  const order = new Map(grid.map((g, i) => [g.id, i]));
  return [...children].sort((a, b) => {
    const ia = order.has(a.id) ? order.get(a.id)! : 9999;
    const ib = order.has(b.id) ? order.get(b.id)! : 9999;
    if (ia !== ib) return ia - ib;
    return a.id.localeCompare(b.id);
  });
}

function clampGrid24Component(pc: Grid24Component): Grid24Component {
  const colStart = Math.max(0, Math.min(23, Math.floor(pc.colStart)));
  let colSpan = Math.max(1, Math.min(24, Math.floor(pc.colSpan)));
  if (colStart + colSpan > 24) colSpan = 24 - colStart;
  const rowStart = Math.max(0, Math.floor(pc.rowStart));
  const rowSpan = Math.max(1, Math.floor(pc.rowSpan));
  return { ...pc, colStart, colSpan, rowStart, rowSpan };
}

export function normalizeGrid24Components(components: Grid24Component[]): Grid24Component[] {
  return components.map(clampGrid24Component);
}

/** Subtitle text for grid slot (props / content), without type prefix. */
function extractGrid24ComponentSubtitle(component: any): string | undefined {
  if (!component || typeof component !== 'object') return undefined;
  const p = component.props && typeof component.props === 'object' ? component.props : {};

  if (component.title != null && String(component.title).trim()) return String(component.title).trim();
  if (component.name != null && String(component.name).trim()) return String(component.name).trim();

  if (p.title != null && String(p.title).trim()) return String(p.title).trim();
  if (p.name != null && String(p.name).trim()) return String(p.name).trim();
  if (p.label != null && String(p.label).trim()) return String(p.label).trim();
  if (p.placeholder != null && String(p.placeholder).trim()) return String(p.placeholder).trim();

  const typ = String(component.type ?? component.componentType ?? '').toLowerCase();

  if (typ === 'typography' && p.content != null) {
    const c = String(p.content).trim();
    if (!c) return undefined;
    return c.length > 28 ? `${c.slice(0, 28)}…` : c;
  }

  if (typ === 'table' && p.dataSource && typeof p.dataSource === 'object' && p.dataSource.name) {
    return String(p.dataSource.name);
  }

  if (typ === 'chart' && p.chartConfig && typeof p.chartConfig === 'object' && p.chartConfig.title) {
    return String(p.chartConfig.title);
  }

  if ((typ === 'mapchart' || typ === 'radarchart' || typ === 'echartschart') && p.title != null && String(p.title).trim()) {
    return String(p.title).trim();
  }

  return undefined;
}

/**
 * Label shown on 24-grid editor tiles: localized type + " · " + title (or untitled).
 */
export function getGrid24ComponentSlotLabel(component: any): string {
  if (!component || typeof component !== 'object') {
    return i18n.t('workbench:grid24.unknown_component', 'Unknown');
  }

  const typeRaw = component.type ?? component.componentType ?? '';
  const typeLabel = typeRaw
    ? getComponentDisplayName(String(typeRaw))
    : i18n.t('workbench:grid24.unknown_type', 'Unknown type');

  const subtitle = extractGrid24ComponentSubtitle(component);
  if (subtitle) {
    return `${typeLabel} · ${subtitle}`;
  }

  return `${typeLabel} · ${i18n.t('workbench:grid24.no_title', 'Untitled')}`;
}
