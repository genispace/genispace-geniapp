import type { Theme } from './types'
import { classicTheme } from './classic'
import { inkOnyxTheme } from './inkOnyx'

/** @deprecated Use `inkOnyxTheme`. */
export const financeTheme = inkOnyxTheme

export { classicTheme, inkOnyxTheme }
export type { Theme, ThemeTokenSet, ThemeTokens } from './types'

const LEGACY_THEME_ID_MAP: Record<string, string> = {
  /** Persisted before canonical id `inkOnyx`. */
  finance: inkOnyxTheme.id,
}

export const themes: Record<string, Theme> = {
  [classicTheme.id]: classicTheme,
  [inkOnyxTheme.id]: inkOnyxTheme,
}

export type ThemeId = string

export const defaultThemeId: ThemeId = classicTheme.id

/** Normalize server/local persisted `themeId` (maps deprecated keys to the built-in registry). */
export function resolveThemeId(id: string | undefined | null): ThemeId {
  if (!id || id.trim() === '') return defaultThemeId
  const mapped = LEGACY_THEME_ID_MAP[id] ?? id
  return themes[mapped] ? mapped : defaultThemeId
}

/** Mirrors spec `GET /api/themes`; runs fully client-side against the built-in registry. */
export function listRegisteredThemes(): Theme[] {
  return Object.values(themes)
}
