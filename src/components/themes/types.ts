export interface ThemeTokenSet {
  '--color-primary': string
  '--color-primary-hover': string
  '--color-primary-foreground': string
  '--color-secondary': string
  '--color-secondary-foreground': string
  '--color-muted': string
  '--color-muted-foreground': string
  '--color-accent': string
  '--color-accent-foreground': string
  '--color-destructive': string
  '--color-destructive-foreground': string
  '--color-background': string
  '--color-foreground': string
  '--color-card': string
  '--color-card-foreground': string
  '--color-popover': string
  '--color-popover-foreground': string
  '--color-border': string
  '--color-input': string
  '--color-ring': string
  '--radius': string
  '--shadow-card': string
  '--shadow-dropdown': string
}

export interface ThemeTokens {
  light: ThemeTokenSet
  dark: ThemeTokenSet
}

export interface Theme {
  id: string
  name: string
  nameEn: string
  preview: string
  tokens: ThemeTokens
}
