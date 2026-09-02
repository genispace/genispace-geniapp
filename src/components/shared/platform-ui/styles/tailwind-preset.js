/**
 * GeniSpace Tailwind CSS Preset
 *
 * Shared configuration consumed by all sub-applications via the `presets` key.
 * Keeps each app's tailwind.config.js minimal – only app-specific overrides.
 *
 * @type {import('tailwindcss').Config}
 */

import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssTypography from '@tailwindcss/typography';

const preset = {
  darkMode: ['class'],

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },

    extend: {
      // ---- Screens ----
      screens: {
        xxl: '1600px',
      },

      // ---- Typography ----
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

      // ---- Colors ----
      colors: {
        // Brand ink palette
        ink: {
          black: '#171717',
          dark: '#262626',
          medium: '#404040',
          light: '#737373',
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

        // CSS-variable-driven semantic colors (shadcn/ui)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        // Platform status tokens (defined in base.css, light + dark values).
        // Usage: text-status-warning, border-status-info/40, bg-status-success/10 (tint),
        // bg-status-warning + text-status-warning-foreground (solid fill).
        status: {
          warning: {
            DEFAULT: 'hsl(var(--status-warning))',
            foreground: 'hsl(var(--status-warning-foreground))',
          },
          success: {
            DEFAULT: 'hsl(var(--status-success))',
            foreground: 'hsl(var(--status-success-foreground))',
          },
          info: {
            DEFAULT: 'hsl(var(--status-info))',
            foreground: 'hsl(var(--status-info-foreground))',
          },
          error: {
            DEFAULT: 'hsl(var(--status-error))',
            foreground: 'hsl(var(--status-error-foreground))',
          },
        },
      },

      // ---- Border Radius ----
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ---- Keyframes ----
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blob-enhanced': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      // ---- Animations ----
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'gradient-x': 'gradient-x 15s ease infinite',
        float: 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'blob-enhanced': 'blob-enhanced 7s ease-in-out infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },

  // ---- Safelist ----
  safelist: [
    'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-5', 'col-span-6',
    'row-span-1', 'row-span-2', 'row-span-3', 'row-span-4',
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6',
    'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4', 'md:grid-cols-5', 'md:grid-cols-6',
    'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5', 'lg:grid-cols-6',
    'gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-7', 'gap-8',
    'animate-fade-in', 'animate-fade-in-up', 'animate-blob-enhanced', 'animate-shimmer',
    'animation-delay-2000', 'animation-delay-4000',
    'bg-slate-50', 'bg-slate-100', 'bg-slate-200',
    'text-slate-600', 'text-slate-700', 'text-slate-800',
    'border-slate-200', 'border-slate-300',
    'from-slate-800', 'via-blue-700', 'to-purple-700',
    'dark:text-white',
    'mix-blend-screen', 'dark:mix-blend-screen',
    'z-[100]', 'z-[150]', 'z-[200]', 'z-[250]', 'z-[300]', 'z-[400]', 'z-[500]',
    'z-[1000]', 'z-[10000]', 'z-[10001]', 'z-[10002]', 'z-[10003]', 'z-[50000]', 'z-[100000]',
    // Legacy application AI layout tokens retained for visual compatibility.
    'grid-cols-[minmax(0,1fr)_minmax(280px,320px)]',
    'lg:grid-cols-[1fr_minmax(280px,320px)]',
  ],

  // ---- Plugins ----
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};

export default preset;
