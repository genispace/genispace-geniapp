import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import tailwindPreset from './src/ui/styles/tailwind-preset.js';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src/components'),
      '@genispace/geniapp/utils': path.resolve(root, 'src/utils.ts'),
      '@genispace/shared-api': path.resolve(root, 'src/components/shared/platform-api/index.ts'),
      '@genispace/shared-types': path.resolve(root, 'src/components/shared/platform-types/index.ts'),
      '@genispace/shared-ui': path.resolve(root, 'src/components/shared/platform-ui/index.ts'),
      '@genispace/shared-utils': path.resolve(root, 'src/components/shared/platform-utils/index.ts'),
      '@genispace/workbench-templates': path.resolve(
        root,
        'src/components/shared/templates/index.ts',
      ),
      '@genispace/geniapp/components/adapters/host': path.resolve(
        root,
        'src/components/adapters/host.ts',
      ),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          presets: [tailwindPreset],
          content: [path.resolve(root, 'src/**/*.{ts,tsx,js,jsx}')],
        }),
      ],
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
    outDir: path.resolve(root, 'dist/components'),
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(root, 'src/components/standalone.tsx'),
      formats: ['es'],
      fileName: () => 'standalone.js',
      cssFileName: 'standalone',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames(assetInfo) {
          if (assetInfo.name === 'style.css') return 'standalone.css';
          return 'standalone-assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
