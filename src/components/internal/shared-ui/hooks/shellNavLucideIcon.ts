import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  ListChecks,
  BarChart3,
  Timer,
  Users,
  PieChart,
  UserCircle,
  ListTodo,
  BookOpen,
  Target,
  ShoppingCart,
  ShoppingBag,
  FolderKanban,
  Package,
  Sparkles,
} from 'lucide-react';

/**
 * Lucide icons allowed for manifest `shellAppIcon` / `navigation[].icon`.
 * Keys must match `manifest.shellAppIcon` strings in each app's `applications/<slug>/manifest.json`.
 * Add entries when new GeniApp manifests reference additional names.
 */
const SHELL_NAV_LUCIDE_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  ListChecks,
  BarChart3,
  Timer,
  Users,
  PieChart,
  UserCircle,
  ListTodo,
  BookOpen,
  Target,
  ShoppingCart,
  ShoppingBag,
  FolderKanban,
  Package,
  Sparkles,
};

/**
 * Resolve a manifest icon name (e.g. `"Timer"`) to a Lucide component.
 */
export function resolveShellNavLucideIcon(
  name?: string | null,
  fallback: LucideIcon = LayoutGrid
): LucideIcon {
  if (name == null) return fallback;
  const key = String(name).trim();
  if (!key) return fallback;
  return SHELL_NAV_LUCIDE_MAP[key] ?? fallback;
}
