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
const targetRoot = path.join(packageRoot, 'src/components');

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Workbench source not found at ${sourceRoot}. Set GENISPACE_FRONTEND_ROOT.`);
}

const failures = [];
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const relativeFiles = (root) => {
  const result = [];
  if (!fs.existsSync(root)) return result;
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

const normalizeRuntimeSource = (file, content) => {
  if (!codeExtensions.has(path.extname(file))) return content;
  return content
    .replace(/\r\n/gu, '\n')
    .replace(/^\s*import(?:[\s\S]*?)from\s+['"][^'"]+['"];?\s*$/gmu, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gmu, '')
    .replace(/import\(\s*['"][^'"]+['"]\s*\)/gu, "import('__PUBLIC_MODULE__')")
    .replace(/^\s*const (?:Grid24EditableCanvas|MobileFlowCanvas) = React\.lazy\([^\n]+\);\s*$/gmu, '')
    .replace(/\s+/gu, ' ')
    .trim();
};

const digest = (file) => {
  const content = fs.readFileSync(file, 'utf8');
  return crypto.createHash('sha256').update(normalizeRuntimeSource(file, content)).digest('hex');
};

const compareFile = (sourceFile, targetFile, label) => {
  if (!fs.existsSync(sourceFile)) {
    failures.push(`${label}: missing Workbench source`);
    return;
  }
  if (!fs.existsSync(targetFile)) {
    failures.push(`${label}: missing public implementation`);
    return;
  }
  if (digest(sourceFile) !== digest(targetFile)) failures.push(`${label}: implementation differs`);
};

const mirroredDirectories = [
  ['components/dialogs', 'dialogs'],
  ['components/inputs', 'inputs'],
  ['components/ui', 'ui'],
  ['components/shared', 'shared'],
  ['components/skeleton', 'skeleton'],
  ['hooks', 'hooks'],
  ['contexts', 'contexts'],
  ['types', 'types'],
  ['utils', 'utils'],
  ['mobile', 'mobile'],
  ['app', 'app'],
  ['assets', 'assets'],
  ['locales', 'locales'],
  ['constants', 'constants'],
  ['config', 'config'],
  ['styles', 'styles'],
  ['themes', 'themes'],
  ['mocks', 'mocks'],
  ['lib', 'lib'],
];

for (const [sourceDirectory, targetDirectory] of mirroredDirectories) {
  const sourceDirectoryPath = path.join(sourceRoot, sourceDirectory);
  const targetDirectoryPath = path.join(targetRoot, targetDirectory);
  for (const file of relativeFiles(sourceDirectoryPath)) {
    if (sourceDirectory === 'mobile' && file === 'index.ts') continue;
    compareFile(
      path.join(sourceDirectoryPath, file),
      path.join(targetDirectoryPath, file),
      `${sourceDirectory}/${file}`,
    );
  }
}

const rendererSourceRoot = path.join(sourceRoot, 'components/renderers');
const rendererTargetRoot = path.join(targetRoot, 'renderers');
const rendererTargetsByName = new Map();
for (const file of relativeFiles(rendererTargetRoot)) {
  const basename = path.basename(file);
  if (basename === 'index.ts') continue;
  const matches = rendererTargetsByName.get(basename) || [];
  matches.push(file);
  rendererTargetsByName.set(basename, matches);
}

for (const file of relativeFiles(rendererSourceRoot)) {
  const basename = path.basename(file);
  if (basename === 'index.ts' || !codeExtensions.has(path.extname(file))) continue;
  const sourceFile = path.join(rendererSourceRoot, file);
  let targetFile;
  if (file === 'index.tsx') targetFile = path.join(rendererTargetRoot, 'registry.tsx');
  else if (file === 'types.ts') targetFile = path.join(rendererTargetRoot, 'types.ts');
  else if (file === 'WorkflowComponent/types.ts') targetFile = path.join(rendererTargetRoot, 'workflow/types.ts');
  else {
    const matches = rendererTargetsByName.get(basename) || [];
    if (matches.length !== 1) {
      failures.push(`components/renderers/${file}: expected one public file named ${basename}, found ${matches.length}`);
      continue;
    }
    targetFile = path.join(rendererTargetRoot, matches[0]);
  }
  compareFile(sourceFile, targetFile, `components/renderers/${file}`);
}

const coreFiles = [
  ['components/PageComponentRenderer.tsx', 'runtime/ComponentRenderer.tsx'],
  ['components/PageLayoutRenderer.tsx', 'runtime/PageRenderer.tsx'],
  ['components/Grid24Renderer.tsx', 'layout/Grid24Renderer.tsx'],
  ['components/MultiPageRenderer.tsx', 'runtime/MultiPageRenderer.tsx'],
  ['components/PageComingSoonOverlay.tsx', 'runtime/PageComingSoonOverlay.tsx'],
  ['components/Loading.tsx', 'runtime/Loading.tsx'],
  ['components/TabManager.tsx', 'runtime/TabManager.tsx'],
  ['components/grid24CellContext.ts', 'layout/grid24CellContext.ts'],
  ['components/mobileFlowLayoutContext.ts', 'mobile/mobileFlowLayoutContext.ts'],
  ['components/componentTypes.ts', 'runtime/componentTypes.ts'],
  ['mobile/index.ts', 'mobile/runtime-index.ts'],
  ['components/editor/common/types.ts', 'types/editor.ts'],
  ['types.ts', 'types.ts'],
  ['vite-env.d.ts', 'vite-env.d.ts'],
];
for (const [sourceFile, targetFile] of coreFiles) {
  compareFile(path.join(sourceRoot, sourceFile), path.join(targetRoot, targetFile), sourceFile);
}

const sharedPackageTargets = {
  'shared-api': 'shared/platform-api',
  'shared-types': 'shared/platform-types',
  'shared-ui': 'shared/platform-ui',
  'shared-utils': 'shared/platform-utils',
  'workbench-templates': 'shared/templates',
};
for (const [packageName, targetDirectory] of Object.entries(sharedPackageTargets)) {
  const sourceDirectory = path.join(frontendRoot, 'packages', packageName, 'src');
  const targetDirectoryPath = path.join(targetRoot, targetDirectory);
  for (const file of relativeFiles(sourceDirectory)) {
    compareFile(
      path.join(sourceDirectory, file),
      path.join(targetDirectoryPath, file),
      `packages/${packageName}/${file}`,
    );
  }
}

for (const locale of ['en', 'zh']) {
  const sourceDirectory = path.join(frontendRoot, 'apps/workbench/public/locales', locale);
  const targetDirectory = path.join(targetRoot, 'locales/resources/locales', locale);
  for (const file of relativeFiles(sourceDirectory)) {
    compareFile(
      path.join(sourceDirectory, file),
      path.join(targetDirectory, file),
      `public/locales/${locale}/${file}`,
    );
  }
}

const requiredFamilies = [
  'form', 'table', 'editable-table', 'analytics-table', 'data-grid-card',
  'chart', 'echarts', 'radar-chart', 'map-chart', 'statistics', 'typography',
  'list', 'tabs', 'card', 'container', 'filter-panel', 'tree', 'task-input',
  'workflow', 'hero-card', 'metric-carousel', 'collapse-panel', 'product-report',
  'product-detail', 'tile-grid', 'ring-stat', 'navigation', 'identity', 'publish',
  'service-desk', 'custom-content',
];
for (const family of requiredFamilies) {
  if (!fs.existsSync(path.join(rendererTargetRoot, family, 'index.ts'))) {
    failures.push(`components/renderers/${family}: missing public index.ts`);
  }
}

for (const forbiddenDirectory of ['internal', 'editor', 'edit-mode']) {
  if (fs.existsSync(path.join(targetRoot, forbiddenDirectory))) {
    failures.push(`components/${forbiddenDirectory}: forbidden public source directory`);
  }
}
for (const file of relativeFiles(targetRoot)) {
  const segments = file.split(path.sep);
  if (segments.includes('internal') || segments.includes('editor') || segments.includes('edit-mode')) {
    failures.push(`components/${file}: forbidden private/editor path`);
  }
}

const runtimeMode = fs.readFileSync(path.join(targetRoot, 'runtime/runtime-mode.tsx'), 'utf8');
for (const invariant of [
  'isEditMode: false as const',
  'canEdit: false',
  'canManage: false',
  'useGridCanvasGate = (): false => false',
]) {
  if (!runtimeMode.includes(invariant)) failures.push(`runtime/runtime-mode.tsx: missing invariant ${invariant}`);
}

if (failures.length) {
  console.error(`Workbench parity failed (${failures.length} mismatch${failures.length === 1 ? '' : 'es'}):`);
  failures.slice(0, 80).forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Workbench parity passed: public component families match the Workbench runtime and contain no private/editor implementation.');
