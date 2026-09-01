import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const root = path.dirname(fileURLToPath(import.meta.url));
const entry = (name: string) => path.resolve(root, `src/${name}`);

const externalPackage = /^(?:@[^/]+\/[^/]+|[^./][^/]*)/u;

export default defineConfig({
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
        vite: entry('vite.ts'),
        'ai/errors/userFacingError': entry('ai/errors/userFacingError.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external(id) {
        return externalPackage.test(id);
      },
    },
  },
});
