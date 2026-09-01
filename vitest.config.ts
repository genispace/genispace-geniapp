import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['./src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['./src/ui/**/*.test.{ts,tsx}', './src/utils/**/*.test.{ts,tsx}'],
  },
});
