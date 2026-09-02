import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { themes, ThemeId, defaultThemeId, resolveThemeId } from '@/themes'
import type { Theme } from '@/themes'
import { buildWorkbenchPaletteCss } from '@/lib/theme/themeUtils'
import { toast } from '@genispace/shared-ui'
import { tabIsolation } from '@/utils/tabIsolation'
import inkOnyxCss from '@/themes/inkOnyx.css?inline'

const STYLE_EL_ID = 'workbench-theme-variables'
const STORAGE_PREFIX = 'workbench-theme-preferences:'

interface WorkbenchThemeContextValue {
  themeId: ThemeId
  setThemeId: (id: ThemeId) => Promise<void>
  theme: Theme
  isDark: boolean
}

const WorkbenchThemeContext = createContext<WorkbenchThemeContextValue | null>(null)

function readLocalThemePreference(workbenchId: string | undefined): ThemeId | undefined {
  if (!workbenchId) return undefined
  try {
    const raw = tabIsolation.getItem(`${STORAGE_PREFIX}${workbenchId}`)
    return raw ? resolveThemeId(raw) : undefined
  } catch {
    return undefined
  }
}

function writeLocalThemePreference(workbenchId: string | undefined, id: ThemeId) {
  if (!workbenchId) return
  try {
    tabIsolation.setItem(`${STORAGE_PREFIX}${workbenchId}`, id)
  } catch {
    /* ignore quota */
  }
}

/** Observes `.dark` on `<html>` (shared-ui color scheme toggle). */
function useWorkbenchHtmlDarkPreference(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  )

  useEffect(() => {
    const el = document.documentElement
    const sync = () => setIsDark(el.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export interface WorkbenchThemeProviderProps {
  children: ReactNode
  workbenchId?: string
  serverThemeId?: string | undefined
  /**
   * Persist theme into `Workbench.config` (merge `{ ...config, themeId }`).
   * When omitted, viewers prefer locally saved preferences before server defaults.
   */
  onPersistTheme?: (themeId: ThemeId) => Promise<void>
}

export function WorkbenchThemeProvider({
  children,
  workbenchId,
  serverThemeId,
  onPersistTheme,
}: WorkbenchThemeProviderProps) {
  const persistEnabled = typeof onPersistTheme === 'function'
  const isDarkPref = useWorkbenchHtmlDarkPreference()

  const [themeId, setThemeIdState] = useState<ThemeId>(defaultThemeId)

  /** Resolve theme when navigating workbenches or when server pushes `themeId`. */
  useEffect(() => {
    const fromServer =
      typeof serverThemeId === 'string' && serverThemeId.trim() !== ''
        ? resolveThemeId(serverThemeId)
        : undefined
    const fromLocal = readLocalThemePreference(workbenchId)

    const next = persistEnabled
      ? resolveThemeId(fromServer ?? fromLocal ?? defaultThemeId)
      : resolveThemeId(fromLocal ?? fromServer ?? defaultThemeId)

    setThemeIdState(next)
    writeLocalThemePreference(workbenchId, next)
  }, [serverThemeId, workbenchId, persistEnabled])

  const resolvedThemeId = resolveThemeId(themeId)
  const theme = themes[resolvedThemeId] ?? themes[defaultThemeId]

  useEffect(() => {
    document.documentElement.setAttribute('data-workbench-appearance', resolvedThemeId)
    return () => {
      document.documentElement.removeAttribute('data-workbench-appearance')
    }
  }, [resolvedThemeId])

  useEffect(() => {
    const palette = themes[resolvedThemeId] ?? themes[defaultThemeId]
    let styleEl = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_EL_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = buildWorkbenchPaletteCss(palette)

    return () => {
      const existing = document.getElementById(STYLE_EL_ID)
      existing?.parentNode?.removeChild(existing)
    }
  }, [resolvedThemeId])

  useEffect(() => {
    const INK_ONYX_CSS_ID = 'inkOnyx-theme-css'
    const isInkOnyx = resolvedThemeId === 'inkOnyx'

    if (isInkOnyx) {
      let styleEl = document.getElementById(INK_ONYX_CSS_ID) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = INK_ONYX_CSS_ID
        styleEl.textContent = inkOnyxCss
        document.head.appendChild(styleEl)
      }
    } else {
      const existing = document.getElementById(INK_ONYX_CSS_ID)
      existing?.parentNode?.removeChild(existing)
    }

    return () => {
      const existing = document.getElementById(INK_ONYX_CSS_ID)
      existing?.parentNode?.removeChild(existing)
    }
  }, [resolvedThemeId])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedThemeId)
    return () => document.documentElement.removeAttribute('data-theme')
  }, [resolvedThemeId])

  const setThemeId = useCallback(
    async (nextRaw: ThemeId) => {
      const next = resolveThemeId(nextRaw)
      setThemeIdState(next)
      writeLocalThemePreference(workbenchId, next)

      if (onPersistTheme) {
        try {
          await onPersistTheme(next)
        } catch (e: unknown) {
          console.warn('[WorkbenchTheme] persist theme failed', e)
          const message =
            typeof e === 'object' &&
            e &&
            'response' in e &&
            (e as { response?: { data?: { message?: string } } }).response?.data?.message

          toast({
            variant: 'destructive',
            title: 'Theme',
            description:
              typeof message === 'string'
                ? message
                : 'Could not save theme to the server. Preference kept locally for this browser.',
          })
        }
      }
    },
    [onPersistTheme, workbenchId],
  )

  const value = useMemo(
    (): WorkbenchThemeContextValue => ({
      themeId: resolvedThemeId,
      setThemeId,
      theme,
      isDark: isDarkPref,
    }),
    [resolvedThemeId, setThemeId, theme, isDarkPref],
  )

  return <WorkbenchThemeContext.Provider value={value}>{children}</WorkbenchThemeContext.Provider>
}

/** Appearance package (`classic` / `inkOnyx`, …); unrelated to `@genispace/shared-ui` light/dark controls. */
export function useWorkbenchTheme(): WorkbenchThemeContextValue {
  const ctx = useContext(WorkbenchThemeContext)
  if (!ctx) {
    throw new Error('useWorkbenchTheme must be used within WorkbenchThemeProvider')
  }
  return ctx
}
