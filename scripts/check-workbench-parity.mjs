import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = path.resolve(
  process.env.GENISPACE_FRONTEND_ROOT || path.join(packageRoot, '..', 'frontend'),
);

const sourceRoot = path.join(frontendRoot, 'apps/workbench/src');
const runtimeRoot = path.join(packageRoot, 'src/components/internal/workbench');

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Workbench source not found at ${sourceRoot}. Set GENISPACE_FRONTEND_ROOT.`);
}

const exactDirectories = [
  'components/renderers',
  'components/dialogs',
  'components/inputs',
  'components/ui',
  'components/shared',
  'components/skeleton',
  'hooks',
  'contexts',
  'types',
  'utils',
  'mobile',
  'app',
  'assets',
  'locales',
  'constants',
  'config',
  'styles',
  'themes',
  'mocks',
  'lib',
];

const exactFiles = [
  'components/PageComponentRenderer.tsx',
  'components/PageLayoutRenderer.tsx',
  'components/Grid24Renderer.tsx',
  'components/MultiPageRenderer.tsx',
  'components/PageComingSoonOverlay.tsx',
  'components/Loading.tsx',
  'components/TabManager.tsx',
  'components/grid24CellContext.ts',
  'components/mobileFlowLayoutContext.ts',
  'components/componentTypes.ts',
  'components/editor/common/types.ts',
  'types.ts',
  'vite-env.d.ts',
];

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relativeFiles = (root) => {
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else result.push(path.relative(root, fullPath));
    }
  };
  visit(root);
  return result.sort();
};

const failures = [];
const compareFile = (sourceFile, runtimeFile, label) => {
  if (!fs.existsSync(runtimeFile)) {
    failures.push(`${label}: missing runtime file`);
    return;
  }
  if (hash(sourceFile) !== hash(runtimeFile)) failures.push(`${label}: content differs`);
};

for (const directory of exactDirectories) {
  const sourceDirectory = path.join(sourceRoot, directory);
  const runtimeDirectory = path.join(runtimeRoot, directory);
  const sourceFiles = relativeFiles(sourceDirectory);
  const runtimeFiles = relativeFiles(runtimeDirectory);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(runtimeFiles)) {
    failures.push(`${directory}: file inventory differs`);
    continue;
  }
  for (const file of sourceFiles) {
    compareFile(path.join(sourceDirectory, file), path.join(runtimeDirectory, file), `${directory}/${file}`);
  }
}

for (const file of exactFiles) {
  compareFile(path.join(sourceRoot, file), path.join(runtimeRoot, file), file);
}

for (const packageName of ['shared-api', 'shared-types', 'shared-ui', 'shared-utils', 'workbench-templates']) {
  const sourceDirectory = path.join(frontendRoot, 'packages', packageName, 'src');
  const runtimeDirectory = path.join(packageRoot, 'src/components/internal', packageName);
  const sourceFiles = relativeFiles(sourceDirectory);
  const runtimeFiles = relativeFiles(runtimeDirectory);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(runtimeFiles)) {
    failures.push(`packages/${packageName}: file inventory differs`);
    continue;
  }
  for (const file of sourceFiles) {
    compareFile(
      path.join(sourceDirectory, file),
      path.join(runtimeDirectory, file),
      `packages/${packageName}/${file}`,
    );
  }
}

for (const locale of ['en', 'zh']) {
  const sourceDirectory = path.join(frontendRoot, 'apps/workbench/public/locales', locale);
  const runtimeDirectory = path.join(packageRoot, 'src/components/internal/public/locales', locale);
  for (const file of relativeFiles(sourceDirectory)) {
    compareFile(
      path.join(sourceDirectory, file),
      path.join(runtimeDirectory, file),
      `public/locales/${locale}/${file}`,
    );
  }
}

if (failures.length) {
  console.error(`Workbench parity failed (${failures.length} mismatch${failures.length === 1 ? '' : 'es'}):`);
  failures.slice(0, 50).forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Workbench parity passed: public renderers and all copied runtime dependencies are byte-identical.');
