import type { Theme, ThemeTokenSet } from '@/themes'
import { classicTheme } from '@/themes/classic'

/**
 * Parses `hsl(h, s%, l%)` / `hsl(h s l)` into Tailwind-compatible channel triplets `"h s l"`.
 */
export function hslFunctionalToChannels(fn: string): string | null {
  const trimmed = fn.trim()
  const m = trimmed.match(
    /^hsl\(\s*([\d.]+)\s*(?:[,]\s*|\s+)([\d.]+%)\s*(?:[,]\s*|\s+)([\d.]+%)\s*\)$/i,
  )
  if (!m) return null
  return `${m[1]} ${m[2]} ${m[3]}`.replace(/,/g, '').trim()
}

function tokenSetToDeclarations(tokens: ThemeTokenSet): Record<string, string> {
  const ch = {
    bg: hslFunctionalToChannels(tokens['--color-background']),
    fg: hslFunctionalToChannels(tokens['--color-foreground']),
    card: hslFunctionalToChannels(tokens['--color-card']),
    cardFg: hslFunctionalToChannels(tokens['--color-card-foreground']),
    pop: hslFunctionalToChannels(tokens['--color-popover']),
    popFg: hslFunctionalToChannels(tokens['--color-popover-foreground']),
    primary: hslFunctionalToChannels(tokens['--color-primary']),
    priFg: hslFunctionalToChannels(tokens['--color-primary-foreground']),
    secondary: hslFunctionalToChannels(tokens['--color-secondary']),
    secFg: hslFunctionalToChannels(tokens['--color-secondary-foreground']),
    muted: hslFunctionalToChannels(tokens['--color-muted']),
    mutFg: hslFunctionalToChannels(tokens['--color-muted-foreground']),
    accent: hslFunctionalToChannels(tokens['--color-accent']),
    accFg: hslFunctionalToChannels(tokens['--color-accent-foreground']),
    destructive: hslFunctionalToChannels(tokens['--color-destructive']),
    desFg: hslFunctionalToChannels(tokens['--color-destructive-foreground']),
    border: hslFunctionalToChannels(tokens['--color-border']),
    input: hslFunctionalToChannels(tokens['--color-input']),
    ring: hslFunctionalToChannels(tokens['--color-ring']),
  }
  const out: Record<string, string> = {
    ...Object.fromEntries(
      (Object.entries(tokens) as [string, string][]).filter(([k]) => k.startsWith('--color')),
    ),
    ...(ch.bg ? { '--background': ch.bg } : {}),
    ...(ch.fg ? { '--foreground': ch.fg } : {}),
    ...(ch.card ? { '--card': ch.card } : {}),
    ...(ch.cardFg ? { '--card-foreground': ch.cardFg } : {}),
    ...(ch.pop ? { '--popover': ch.pop } : {}),
    ...(ch.popFg ? { '--popover-foreground': ch.popFg } : {}),
    ...(ch.primary ? { '--primary': ch.primary } : {}),
    ...(ch.priFg ? { '--primary-foreground': ch.priFg } : {}),
    ...(ch.secondary ? { '--secondary': ch.secondary } : {}),
    ...(ch.secFg ? { '--secondary-foreground': ch.secFg } : {}),
    ...(ch.muted ? { '--muted': ch.muted } : {}),
    ...(ch.mutFg ? { '--muted-foreground': ch.mutFg } : {}),
    ...(ch.accent ? { '--accent': ch.accent } : {}),
    ...(ch.accFg ? { '--accent-foreground': ch.accFg } : {}),
    ...(ch.destructive ? { '--destructive': ch.destructive } : {}),
    ...(ch.desFg ? { '--destructive-foreground': ch.desFg } : {}),
    ...(ch.border ? { '--border': ch.border } : {}),
    ...(ch.input ? { '--input': ch.input } : {}),
    ...(ch.ring ? { '--ring': ch.ring } : {}),
    '--radius': tokens['--radius'],
  }

  const sbBg = ch.muted ?? ch.secondary
  const sbFg = ch.fg ?? ch.secFg
  const sbAccent = ch.accent ?? ch.muted
  const sbAccentFg = ch.accFg ?? ch.fg

  Object.assign(out, {
    ...(sbBg ? { '--sidebar-background': sbBg } : {}),
    ...(sbFg ? { '--sidebar-foreground': sbFg } : {}),
    ...(ch.primary ? { '--sidebar-primary': ch.primary } : {}),
    ...(ch.priFg ? { '--sidebar-primary-foreground': ch.priFg } : {}),
    ...(sbAccent ? { '--sidebar-accent': sbAccent } : {}),
    ...(sbAccentFg ? { '--sidebar-accent-foreground': sbAccentFg } : {}),
    ...(ch.border ? { '--sidebar-border': ch.border } : {}),
    ...(ch.ring ? { '--sidebar-ring': ch.ring } : {}),
    ...(ch.primary
      ? {
          '--chart-1': ch.primary,
          ...(ch.ring ? { '--chart-2': ch.ring } : {}),
          ...(ch.accent ? { '--chart-3': ch.accent } : {}),
          ...(ch.secondary ? { '--chart-4': ch.secondary } : {}),
          ...(ch.muted ? { '--chart-5': ch.muted } : {}),
        }
      : {}),
  })

  return out
}

/**
 * Same as {@link tokenSetToDeclarations} but keeps sidebar + chart tokens aligned with
 * `packages/shared-ui/src/styles/base.css` (pre–multi-theme workbench look).
 */
function tokenSetToDeclarationsSharedUiBase(
  tokens: ThemeTokenSet,
  mode: 'light' | 'dark',
): Record<string, string> {
  const ch = {
    bg: hslFunctionalToChannels(tokens['--color-background']),
    fg: hslFunctionalToChannels(tokens['--color-foreground']),
    card: hslFunctionalToChannels(tokens['--color-card']),
    cardFg: hslFunctionalToChannels(tokens['--color-card-foreground']),
    pop: hslFunctionalToChannels(tokens['--color-popover']),
    popFg: hslFunctionalToChannels(tokens['--color-popover-foreground']),
    primary: hslFunctionalToChannels(tokens['--color-primary']),
    priFg: hslFunctionalToChannels(tokens['--color-primary-foreground']),
    secondary: hslFunctionalToChannels(tokens['--color-secondary']),
    secFg: hslFunctionalToChannels(tokens['--color-secondary-foreground']),
    muted: hslFunctionalToChannels(tokens['--color-muted']),
    mutFg: hslFunctionalToChannels(tokens['--color-muted-foreground']),
    accent: hslFunctionalToChannels(tokens['--color-accent']),
    accFg: hslFunctionalToChannels(tokens['--color-accent-foreground']),
    destructive: hslFunctionalToChannels(tokens['--color-destructive']),
    desFg: hslFunctionalToChannels(tokens['--color-destructive-foreground']),
    border: hslFunctionalToChannels(tokens['--color-border']),
    input: hslFunctionalToChannels(tokens['--color-input']),
    ring: hslFunctionalToChannels(tokens['--color-ring']),
  }
  const out: Record<string, string> = {
    ...Object.fromEntries(
      (Object.entries(tokens) as [string, string][]).filter(([k]) => k.startsWith('--color')),
    ),
    ...(ch.bg ? { '--background': ch.bg } : {}),
    ...(ch.fg ? { '--foreground': ch.fg } : {}),
    ...(ch.card ? { '--card': ch.card } : {}),
    ...(ch.cardFg ? { '--card-foreground': ch.cardFg } : {}),
    ...(ch.pop ? { '--popover': ch.pop } : {}),
    ...(ch.popFg ? { '--popover-foreground': ch.popFg } : {}),
    ...(ch.primary ? { '--primary': ch.primary } : {}),
    ...(ch.priFg ? { '--primary-foreground': ch.priFg } : {}),
    ...(ch.secondary ? { '--secondary': ch.secondary } : {}),
    ...(ch.secFg ? { '--secondary-foreground': ch.secFg } : {}),
    ...(ch.muted ? { '--muted': ch.muted } : {}),
    ...(ch.mutFg ? { '--muted-foreground': ch.mutFg } : {}),
    ...(ch.accent ? { '--accent': ch.accent } : {}),
    ...(ch.accFg ? { '--accent-foreground': ch.accFg } : {}),
    ...(ch.destructive ? { '--destructive': ch.destructive } : {}),
    ...(ch.desFg ? { '--destructive-foreground': ch.desFg } : {}),
    ...(ch.border ? { '--border': ch.border } : {}),
    ...(ch.input ? { '--input': ch.input } : {}),
    ...(ch.ring ? { '--ring': ch.ring } : {}),
    '--radius': tokens['--radius'],
  }

  if (mode === 'light') {
    Object.assign(out, {
      '--sidebar-background': '0 0% 98%',
      '--sidebar-foreground': '0 0% 9%',
      '--sidebar-primary': '0 0% 9%',
      '--sidebar-primary-foreground': '0 0% 98%',
      '--sidebar-accent': '0 0% 96.1%',
      '--sidebar-accent-foreground': '0 0% 9%',
      '--sidebar-border': '0 0% 89.8%',
      '--sidebar-ring': '0 0% 9%',
    })
  } else {
    Object.assign(out, {
      '--sidebar-background': '0 0% 9%',
      '--sidebar-foreground': '0 0% 98%',
      '--sidebar-primary': '0 0% 98%',
      '--sidebar-primary-foreground': '0 0% 9%',
      '--sidebar-accent': '0 0% 14.9%',
      '--sidebar-accent-foreground': '0 0% 98%',
      '--sidebar-border': '0 0% 14.9%',
      '--sidebar-ring': '0 0% 83.1%',
    })
  }

  if (ch.primary) {
    Object.assign(out, {
      '--chart-1': ch.primary,
      ...(ch.ring ? { '--chart-2': ch.ring } : {}),
      ...(ch.accent ? { '--chart-3': ch.accent } : {}),
      ...(ch.secondary ? { '--chart-4': ch.secondary } : {}),
      ...(ch.muted ? { '--chart-5': ch.muted } : {}),
    })
  }

  return out
}

export function flattenDeclarations(decl: Record<string, string>): string {
  return Object.entries(decl)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
}

/**
 * Builds CSS for injecting into `#workbench-theme-variables`.
 * Overrides base semantic tokens (`--primary`, ...) and keeps `--color-*` for themed CSS such as inkOnyx.css.
 */
export function buildWorkbenchPaletteCss(theme: Theme): string {
  if (theme.id === classicTheme.id) {
    const light = flattenDeclarations(
      tokenSetToDeclarationsSharedUiBase(theme.tokens.light, 'light'),
    )
    const dark = flattenDeclarations(tokenSetToDeclarationsSharedUiBase(theme.tokens.dark, 'dark'))
    return `:root { ${light} }\n:root.dark { ${dark} }\n.dark { ${dark} }\n`
  }
  const light = flattenDeclarations(tokenSetToDeclarations(theme.tokens.light))
  const dark = flattenDeclarations(tokenSetToDeclarations(theme.tokens.dark))
  return `:root { ${light} }\n:root.dark { ${dark} }\n.dark { ${dark} }\n`
}

export function listRegisteredThemes(themeMap: Record<string, Theme>): Theme[] {
  return Object.values(themeMap)
}
