/**
 * GeniSpace Design Tokens
 *
 * Single source of truth for all design values across the platform.
 * Aligned with DESIGN_GUIDELINE.html v2.0 and GeniSpace_Design_Guideline.md v1.1.0.
 */

// ---------------------------------------------------------------------------
// CSS Variable Tokens (HSL values without "hsl()" wrapper, consumed via CSS vars)
// ---------------------------------------------------------------------------

export const CSS_VARS = {
  light: {
    background: '0 0% 100%',
    foreground: '0 0% 9%',                // #171717 (neutral-900)
    card: '0 0% 100%',
    cardForeground: '0 0% 9%',
    popover: '0 0% 100%',
    popoverForeground: '0 0% 9%',
    primary: '217 91% 60%',               // #3B82F6 (blue-500)
    primaryForeground: '0 0% 100%',       // white
    secondary: '0 0% 96.1%',              // #F5F5F5 (neutral-100)
    secondaryForeground: '0 0% 14.9%',    // #262626 (neutral-800)
    muted: '210 40% 96.1%',
    mutedForeground: '0 0% 25.1%',        // #404040 (ink-medium, neutral-700)
    accent: '210 40% 96.1%',
    accentForeground: '222.2 47.4% 11.2%',
    destructive: '0 84.2% 60.2%',         // #ef4444 (red-500)
    destructiveForeground: '0 0% 100%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '217 91% 60%',                  // blue-500
    radius: '0.5rem',
    // Sidebar
    sidebarBackground: '0 0% 98%',
    sidebarForeground: '0 0% 9%',
    sidebarPrimary: '0 0% 9%',
    sidebarPrimaryForeground: '0 0% 98%',
    sidebarAccent: '0 0% 96.1%',
    sidebarAccentForeground: '0 0% 9%',
    sidebarBorder: '0 0% 89.8%',
    sidebarRing: '0 0% 9%',
  },
  dark: {
    background: '0 0% 3.9%',              // #0a0a0a (neutral-950)
    foreground: '0 0% 98%',               // #fafafa (neutral-50)
    card: '0 0% 3.9%',
    cardForeground: '0 0% 98%',
    popover: '0 0% 3.9%',
    popoverForeground: '0 0% 98%',
    primary: '0 0% 98%',                  // #FAFAFA (neutral-50)
    primaryForeground: '0 0% 9%',         // #171717 (neutral-900)
    secondary: '0 0% 14.9%',              // #262626 (neutral-800)
    secondaryForeground: '0 0% 98%',
    muted: '0 0% 14.9%',
    mutedForeground: '0 0% 63.9%',        // #a3a3a3 (neutral-400)
    accent: '0 0% 14.9%',
    accentForeground: '0 0% 98%',
    destructive: '0 84.2% 60.2%',         // keep red-500 in dark mode
    destructiveForeground: '0 0% 100%',
    border: '0 0% 14.9%',                 // #262626 (neutral-800)
    input: '0 0% 14.9%',
    ring: '0 0% 83.1%',
    // Sidebar
    sidebarBackground: '0 0% 9%',
    sidebarForeground: '0 0% 98%',
    sidebarPrimary: '0 0% 98%',
    sidebarPrimaryForeground: '0 0% 9%',
    sidebarAccent: '0 0% 14.9%',
    sidebarAccentForeground: '0 0% 98%',
    sidebarBorder: '0 0% 14.9%',
    sidebarRing: '0 0% 83.1%',
  },
} as const;

// ---------------------------------------------------------------------------
// Brand Colors (static hex values, used in Tailwind config extend)
// ---------------------------------------------------------------------------

export const BRAND_COLORS = {
  ink: {
    black: '#171717',   // neutral-900, primary text
    dark: '#262626',    // neutral-800, secondary text
    medium: '#404040',  // neutral-700, body text
    light: '#737373',   // neutral-500, muted text
  },
  brand: {
    primary: '#262626',
    'primary-light': '#525252',
    'primary-dark': '#171717',
  },
  paper: {
    light: '#FFFCF7',
    medium: '#FDF7EF',
    dark: '#FBF1E4',
  },
  surface: {
    DEFAULT: '#ffffff',
    dark: '#0a0a0a',
    darker: '#171717',
    light: '#f3f4f6',
  },
  content: {
    DEFAULT: '#111827',
    dark: '#fafafa',
    muted: '#4b5563',
    'dark-muted': '#d1d5db',
  },
  accent: {
    DEFAULT: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    foreground: '#ffffff',
  },
  functional: {
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
  },
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const TYPOGRAPHY = {
  fontFamily: {
    sans: [
      'Inter',
      'Noto Sans SC',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'PingFang SC',
      'Microsoft YaHei',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    mono: [
      'Geist Mono',
      'Noto Sans SC',
      'Consolas',
      'Monaco',
      'Courier New',
      'monospace',
    ],
    display: [
      'Space Grotesk',
      'Noto Sans SC',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'sans-serif',
    ],
  },
  fontSize: {
    xs: '0.75rem',     // 10.5px  (at 14px root)
    sm: '0.875rem',    // 12.25px
    base: '1rem',      // 14px
    lg: '1.125rem',    // 15.75px
    xl: '1.25rem',     // 17.5px
    '2xl': '1.5rem',   // 21px
    '3xl': '1.75rem',  // 24.5px
    '4xl': '2rem',     // 28px
  },
  lineHeight: {
    tight: '1.1',
    normal: '1.3',
    relaxed: '1.5',
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing (4px base grid)
// ---------------------------------------------------------------------------

export const SPACING = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const SHADOWS = {
  sm: '0 2px 4px rgba(10, 10, 10, 0.08)',
  md: '0 4px 12px rgba(10, 10, 10, 0.12)',
  lg: '0 8px 24px rgba(10, 10, 10, 0.16)',
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export const TRANSITIONS = {
  fast: '150ms',
  standard: '300ms',
  slow: '500ms',
} as const;

// ---------------------------------------------------------------------------
// Modal Dimensions
// ---------------------------------------------------------------------------

export const MODAL_DIMENSIONS = {
  sm: { width: '480px', maxHeight: '90vh' },
  md: { width: '640px', maxHeight: '90vh' },
  lg: { width: '896px', maxHeight: '90vh' },
  xl: { width: '1000px', maxHeight: '90vh' },

  wide: { width: 'min(1152px, 95vw)', maxHeight: '90vh' },
  full: { width: '95vw', maxHeight: '95vh' },
} as const;
