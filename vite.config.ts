import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = (name: string) => path.resolve(root, `src/${name}`);

const externalPackage = /^(?:@[^/]+\/[^/]+|[^./][^/]*)/u;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src/components'),
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
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.build.json',
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: {
        index: entry('index.ts'),
        ui: entry('ui.ts'),
        kit: entry('kit.ts'),
        page: entry('page.ts'),
        utils: entry('utils.ts'),
        hooks: entry('hooks.ts'),
        shell: entry('shell.tsx'),
        ai: entry('ai.ts'),
        storage: entry('storage.ts'),
        dashboard: entry('dashboard.ts'),
        'case-workspace': entry('case-workspace.ts'),
        'case-workspace/domain': entry('case-workspace/domain.ts'),
        'task-workspace': entry('task-workspace.ts'),
        'task-workspace/domain': entry('task-workspace/domain.ts'),
        components: entry('components/index.ts'),
        'components/renderers': entry('components/renderers/index.ts'),
        'components/renderers/table': entry('components/renderers/table/index.ts'),
        'components/renderers/editable-table': entry('components/renderers/editable-table/index.ts'),
        'components/renderers/analytics-table': entry('components/renderers/analytics-table/index.ts'),
        'components/renderers/data-grid-card': entry('components/renderers/data-grid-card/index.ts'),
        'components/renderers/form': entry('components/renderers/form/index.ts'),
        'components/renderers/chart': entry('components/renderers/chart/index.ts'),
        'components/renderers/radar-chart': entry('components/renderers/radar-chart/index.ts'),
        'components/renderers/map-chart': entry('components/renderers/map-chart/index.ts'),
        'components/renderers/echarts': entry('components/renderers/echarts/index.ts'),
        'components/renderers/statistics': entry('components/renderers/statistics/index.ts'),
        'components/renderers/typography': entry('components/renderers/typography/index.ts'),
        'components/renderers/tabs': entry('components/renderers/tabs/index.ts'),
        'components/renderers/container': entry('components/renderers/container/index.ts'),
        'components/renderers/card': entry('components/renderers/card/index.ts'),
        'components/renderers/hero-card': entry('components/renderers/hero-card/index.ts'),
        'components/renderers/metric-carousel': entry('components/renderers/metric-carousel/index.ts'),
        'components/renderers/collapse-panel': entry('components/renderers/collapse-panel/index.ts'),
        'components/renderers/product-report': entry('components/renderers/product-report/index.ts'),
        'components/renderers/product-detail': entry('components/renderers/product-detail/index.ts'),
        'components/renderers/tile-grid': entry('components/renderers/tile-grid/index.ts'),
        'components/renderers/ring-stat': entry('components/renderers/ring-stat/index.ts'),
        'components/renderers/navigation': entry('components/renderers/navigation/index.ts'),
        'components/renderers/list': entry('components/renderers/list/index.ts'),
        'components/renderers/filter-panel': entry('components/renderers/filter-panel/index.ts'),
        'components/renderers/tree': entry('components/renderers/tree/index.ts'),
        'components/renderers/task-input': entry('components/renderers/task-input/index.ts'),
        'components/renderers/workflow': entry('components/renderers/workflow/index.ts'),
        'components/renderers/identity': entry('components/renderers/identity/index.ts'),
        'components/renderers/publish': entry('components/renderers/publish/index.ts'),
        'components/renderers/service-desk': entry('components/renderers/service-desk/index.ts'),
        'components/renderers/custom-content': entry('components/renderers/custom-content/index.ts'),
        'components/layout': entry('components/layout/index.ts'),
        'components/mobile': entry('components/mobile/index.ts'),
        'components/testing': entry('components/testing/index.ts'),
        'components/adapters/host': entry('components/adapters/host.ts'),
        vite: entry('vite.ts'),
        'ai/errors/userFacingError': entry('ai/errors/userFacingError.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external(id) {
        if (
          id.startsWith('@/') ||
          id.startsWith('@genispace/shared-') ||
          id === '@genispace/workbench-templates'
        ) {
          return false;
        }
        return externalPackage.test(id);
      },
      output: {
        manualChunks(id) {
          if (
            id.includes('/src/components/runtime/ComponentRenderer')
            || id.includes('/src/components/renderers/')
          ) {
            return 'components/renderers/runtime';
          }
          return undefined;
        },
      },
    },
  },
});
