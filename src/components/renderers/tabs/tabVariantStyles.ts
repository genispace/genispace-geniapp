/**
 * Tab variant definitions for the Tabs renderer.
 *
 * Each variant is the source of truth for both the runtime Tabs renderer
 * (`TabsRenderer.tsx`) and the property-editor preview cards
 * (`TabsPropertyEditor.tsx`). Every Tailwind utility referenced here is
 * written as a complete string literal so the JIT content scanner picks
 * them up and ships them in the final CSS bundle.
 *
 * Seven variants, intentionally visually distinct so they can be told apart
 * at a glance (card/editable-card share the rail but differ in triggers;
 * vertical-line intentionally reuses `line` for horizontal orientation):
 *   - `line`:           underline-style tabs (no pill background)
 *   - `card`:           segmented-pill tabs (single, immutable tab strip)
 *   - `editable-card`:  segmented-pill tabs with per-tab × close button
 *                       and a trailing "+ Add" button for adding tabs
 *   - `pill`:           each tab is its own floating rounded pill,
 *                       no shared container
 *   - `boxed`:          tabs sit on top of a bordered container; the
 *                       active tab "punches through" the bottom border
 *                       so the tab appears connected to the panel below
 *   - `segmented`:      full-width iOS-style segmented control — grey
 *                       rounded rail, equal-width segments, active
 *                       segment lifts to a white card with indigo text
 *   - `vertical-line`:  underline-style for top/bottom tabPosition,
 *                       flips to a left vertical line for left/right
 *                       tabPosition so vertical tab strips no longer
 *                       look like a misplaced horizontal underline
 */

export type TabVariant =
  | 'line'
  | 'card'
  | 'editable-card'
  | 'pill'
  | 'boxed'
  | 'segmented'
  | 'vertical-line';

export type TabOrientation = 'horizontal' | 'vertical';

export const DEFAULT_TAB_VARIANT: TabVariant = 'line';

export const TAB_VARIANTS: ReadonlyArray<TabVariant> = [
  'line',
  'card',
  'editable-card',
  'pill',
  'boxed',
  'segmented',
  'vertical-line',
];

export interface TabVariantClasses {
  /** Class string applied to the TabsList container. */
  list: string;
  /**
   * Class string applied to each TabsTrigger. Variant-specific active-state
   * styling is folded in via `data-[state=active]:*` selectors so consumers
   * don't need to switch classes when active state changes.
   */
  trigger: string;
  /** Class string for the × close button rendered on editable-card tabs. */
  closableButton: string;
  /** Class string for the trailing "+ Add" button on editable-card tabs. */
  addButton: string;
}

const BASE_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const LINE: TabVariantClasses = {
  list:
    'inline-flex h-10 items-center justify-start gap-0 bg-transparent ' +
    'border-b border-border p-0 text-muted-foreground',
  trigger:
    'relative inline-flex items-center justify-center whitespace-nowrap ' +
    'px-4 py-2 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent border-b-2 border-transparent -mb-px rounded-none ' +
    'text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:border-primary data-[state=active]:text-foreground ' +
    'data-[state=active]:shadow-none',
  closableButton: 'hidden',
  addButton: 'hidden',
};

const CARD: TabVariantClasses = {
  list:
    'inline-flex h-10 items-center justify-center gap-1 ' +
    'rounded-lg bg-muted p-1 text-muted-foreground',
  trigger:
    'inline-flex items-center justify-center whitespace-nowrap rounded-md ' +
    'px-3 py-1 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:bg-card data-[state=active]:text-foreground ' +
    'data-[state=active]:shadow-sm',
  closableButton: 'hidden',
  addButton: 'hidden',
};

const EDITABLE_CARD: TabVariantClasses = {
  list:
    'inline-flex h-10 items-center justify-center gap-1 ' +
    'rounded-lg bg-muted p-1 text-muted-foreground',
  trigger:
    'inline-flex items-center justify-center whitespace-nowrap rounded-md ' +
    'px-3 py-1 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:bg-card data-[state=active]:text-foreground ' +
    'data-[state=active]:shadow-sm data-[state=active]:ring-1 ' +
    'data-[state=active]:ring-primary/30',
  closableButton:
    'ml-1 inline-flex h-4 w-4 items-center justify-center rounded ' +
    'text-muted-foreground hover:bg-destructive/15 hover:text-destructive ' +
    '-mr-1',
  addButton:
    'ml-1 inline-flex h-7 items-center rounded-md px-2 text-xs font-medium ' +
    'text-muted-foreground hover:bg-background hover:text-foreground ' +
    'hover:shadow-sm transition-colors',
};

/**
 * Each tab is its own floating button. The container is transparent (no
 * shared grey rail), inactive tabs hover-tint to muted, active tab fills
 * with primary color and inverts text. Corner radius uses `rounded-md`
 * to match the inner-element radius used elsewhere in the system
 * (card / editable-card triggers, inputs, buttons) rather than the
 * fully-circular `rounded-full`.
 */
const PILL: TabVariantClasses = {
  list:
    'inline-flex items-center gap-2 bg-transparent p-0 text-muted-foreground',
  trigger:
    'inline-flex items-center justify-center whitespace-nowrap rounded-md ' +
    'px-4 py-1.5 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent text-muted-foreground ' +
    'hover:bg-muted hover:text-foreground ' +
    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ' +
    'data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary',
  closableButton: 'hidden',
  addButton: 'hidden',
};

/**
 * Ant Design style "boxed" tab strip. TabsList is bordered at the bottom
 * only; the active tab grows a top + side border and shifts down 1px so
 * its bottom edge replaces the container's bottom border. The active
 * background matches `bg-background` so the panel below visually
 * connects to the active tab.
 */
const BOXED: TabVariantClasses = {
  list:
    'inline-flex items-end gap-0 bg-background ' +
    'border-b border-border p-0',
  trigger:
    'inline-flex items-center justify-center whitespace-nowrap ' +
    'rounded-t-md px-4 py-2 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent border border-transparent ' +
    'text-muted-foreground hover:text-foreground ' +
    'data-[state=active]:bg-background data-[state=active]:text-foreground ' +
    'data-[state=active]:border-border data-[state=active]:shadow-sm',
  closableButton: 'hidden',
  addButton: 'hidden',
};

/**
 * Variant intended for vertical `tabPosition`. Falls back to a horizontal
 * underline when used with a top/bottom tabPosition so the renderer
 * never renders broken-looking UI. The vertical-line style adds a 2px
 * primary-colored left border plus a soft primary tint to the active
 * tab, which is the conventional sidebar-nav active-state pattern.
 */


const SEGMENTED: TabVariantClasses = {
  list:
    'flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 text-slate-500 ' +
    'dark:bg-neutral-800',
  trigger:
    'flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-lg ' +
    'px-2 py-1.5 text-xs font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent text-slate-500 hover:text-slate-700 ' +
    'data-[state=active]:bg-white data-[state=active]:text-indigo-600 ' +
    'data-[state=active]:shadow-sm dark:data-[state=active]:bg-neutral-900',
  closableButton: 'hidden',
  addButton: 'hidden',
};

const VERTICAL_LINE_HORIZONTAL: TabVariantClasses = LINE;
const VERTICAL_LINE_VERTICAL: TabVariantClasses = {
  list:
    'inline-flex items-stretch gap-0 bg-transparent p-0 ' +
    'border-border',
  trigger:
    'inline-flex items-center justify-start whitespace-nowrap ' +
    'px-4 py-2 text-sm font-medium transition-all ' +
    `${BASE_FOCUS_RING} ` +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'bg-transparent border-l-2 border-transparent text-muted-foreground ' +
    'hover:text-foreground hover:bg-muted/50 ' +
    'data-[state=active]:border-primary data-[state=active]:text-primary ' +
    'data-[state=active]:bg-primary/5 data-[state=active]:font-semibold',
  closableButton: 'hidden',
  addButton: 'hidden',
};

const TAB_VARIANT_CLASSES: Record<TabVariant, TabVariantClasses> = {
  line: LINE,
  card: CARD,
  'editable-card': EDITABLE_CARD,
  pill: PILL,
  boxed: BOXED,
  segmented: SEGMENTED,
  'vertical-line': VERTICAL_LINE_HORIZONTAL,
};

export function normalizeTabVariant(type?: string | null): TabVariant {
  if (
    type === 'line' ||
    type === 'card' ||
    type === 'editable-card' ||
    type === 'pill' ||
    type === 'boxed' ||
    type === 'segmented' ||
    type === 'vertical-line'
  ) {
    return type;
  }
  return DEFAULT_TAB_VARIANT;
}

export function resolveTabVariantClasses(
  type?: string | null,
  orientation: TabOrientation = 'horizontal'
): TabVariantClasses {
  const variant = normalizeTabVariant(type);
  if (variant === 'vertical-line' && orientation === 'vertical') {
    return VERTICAL_LINE_VERTICAL;
  }
  return TAB_VARIANT_CLASSES[variant];
}

export function isEditableTabVariant(type?: string | null): boolean {
  return normalizeTabVariant(type) === 'editable-card';
}