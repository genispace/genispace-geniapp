import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
]);

const packageName = (specifier) => specifier.startsWith('@')
  ? specifier.split('/').slice(0, 2).join('/')
  : specifier.split('/')[0];

const javascriptFiles = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolutePath);
    else if (entry.name.endsWith('.js')) javascriptFiles.push(absolutePath);
  }
};
visit(path.join(repositoryRoot, 'dist'));

const imported = new Set();
const importPattern = /(?:^|\n)(?:import\s+(?:[^'"\n]+?\s+from\s+)?|export\s+[^'"\n]+?\s+from\s+)['"]([^'"]+)['"]/gu;
for (const file of javascriptFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (specifier.startsWith('.') || specifier.startsWith('node:')) continue;
    const dependency = packageName(specifier);
    if (dependency === packageJson.name) continue;
    imported.add(dependency);
  }
}

const missing = [...imported].filter((dependency) => !declared.has(dependency)).sort();
if (missing.length > 0) {
  console.error(`Undeclared runtime dependencies: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Runtime dependency contract verified: ${imported.size} external package(s) declared.`);
