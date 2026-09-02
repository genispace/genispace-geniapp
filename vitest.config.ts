import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src/components/internal/workbench'),
      '@genispace/shared-api': path.resolve(root, 'src/components/internal/shared-api/index.ts'),
      '@genispace/shared-types': path.resolve(root, 'src/components/internal/shared-types/index.ts'),
      '@genispace/shared-ui': path.resolve(root, 'src/components/internal/shared-ui/index.ts'),
      '@genispace/shared-utils': path.resolve(root, 'src/components/internal/shared-utils/index.ts'),
      '@genispace/workbench-templates': path.resolve(root, 'src/components/internal/workbench-templates/index.ts'),
      '@genispace/geniapp/components/adapters/host': path.resolve(root, 'src/components/adapters/host.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['./src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['./src/ui/**/*.test.{ts,tsx}', './src/utils/**/*.test.{ts,tsx}'],
  },
});
