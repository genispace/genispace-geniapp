/* eslint-disable custom/no-hardcoded-text -- Registered theme catalogue labels (UI uses zh/en helpers). */

import type { Theme } from './types'

/**
 * Mirrors `packages/shared-ui/src/styles/base.css` semantic tokens.
 * Runtime injection is handled by `buildWorkbenchPaletteCss` (see themeUtils classic branch).
 */
export const classicTheme: Theme = {
  id: 'classic',
  name: '经典',
  nameEn: 'Classic',
  preview: 'hsl(217, 91%, 60%)',
  tokens: {
    light: {
      '--color-primary': 'hsl(217, 91%, 60%)',
      '--color-primary-hover': 'hsl(217, 91%, 52%)',
      '--color-primary-foreground': 'hsl(0, 0%, 100%)',
      '--color-secondary': 'hsl(0, 0%, 96.1%)',
      '--color-secondary-foreground': 'hsl(0, 0%, 14.9%)',
      '--color-muted': 'hsl(210, 40%, 96.1%)',
      '--color-muted-foreground': 'hsl(0, 0%, 25.1%)',
      '--color-accent': 'hsl(210, 40%, 96.1%)',
      '--color-accent-foreground': 'hsl(222.2, 47.4%, 11.2%)',
      '--color-destructive': 'hsl(0, 84.2%, 60.2%)',
      '--color-destructive-foreground': 'hsl(0, 0%, 100%)',
      '--color-background': 'hsl(0, 0%, 100%)',
      '--color-foreground': 'hsl(0, 0%, 9%)',
      '--color-card': 'hsl(0, 0%, 100%)',
      '--color-card-foreground': 'hsl(0, 0%, 9%)',
      '--color-popover': 'hsl(0, 0%, 100%)',
      '--color-popover-foreground': 'hsl(0, 0%, 9%)',
      '--color-border': 'hsl(214.3, 31.8%, 91.4%)',
      '--color-input': 'hsl(214.3, 31.8%, 91.4%)',
      '--color-ring': 'hsl(217, 91%, 60%)',
      '--radius': '0.5rem',
      '--shadow-card': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '--shadow-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    },
    dark: {
      '--color-primary': 'hsl(0, 0%, 98%)',
      '--color-primary-hover': 'hsl(0, 0%, 90%)',
      '--color-primary-foreground': 'hsl(0, 0%, 9%)',
      '--color-secondary': 'hsl(0, 0%, 14.9%)',
      '--color-secondary-foreground': 'hsl(0, 0%, 98%)',
      '--color-muted': 'hsl(0, 0%, 14.9%)',
      '--color-muted-foreground': 'hsl(0, 0%, 63.9%)',
      '--color-accent': 'hsl(0, 0%, 14.9%)',
      '--color-accent-foreground': 'hsl(0, 0%, 98%)',
      '--color-destructive': 'hsl(0, 84.2%, 60.2%)',
      '--color-destructive-foreground': 'hsl(0, 0%, 100%)',
      '--color-background': 'hsl(0, 0%, 3.9%)',
      '--color-foreground': 'hsl(0, 0%, 98%)',
      '--color-card': 'hsl(0, 0%, 3.9%)',
      '--color-card-foreground': 'hsl(0, 0%, 98%)',
      '--color-popover': 'hsl(0, 0%, 3.9%)',
      '--color-popover-foreground': 'hsl(0, 0%, 98%)',
      '--color-border': 'hsl(0, 0%, 14.9%)',
      '--color-input': 'hsl(0, 0%, 14.9%)',
      '--color-ring': 'hsl(0, 0%, 83.1%)',
      '--radius': '0.5rem',
      '--shadow-card': '0 2px 8px hsla(0, 0%, 0%, 0.35)',
      '--shadow-dropdown': '0 12px 40px hsla(0, 0%, 0%, 0.45)',
    },
  },
}
