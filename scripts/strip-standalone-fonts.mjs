import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stylesheet = path.join(root, 'dist', 'components', 'standalone.css');
const source = readFileSync(stylesheet, 'utf8');

// Vite library mode always inlines imported font assets. The standalone bundle
// is embedded in every downloaded GeniApp, so keeping all Noto CJK subsets here
// would add more than 30 MB per download. The exact Workbench font-family stack
// remains intact and resolves through system fonts; package consumers building
// from source still receive the self-hosted fonts through components/styles.css.
const stripped = source.replace(/@font-face\{[^{}]*\}/g, '');

if (stripped.includes('data:font/')) {
  throw new Error('Standalone font stripping left embedded font data behind.');
}

writeFileSync(stylesheet, stripped);
const size = statSync(stylesheet).size;
if (size > 1_000_000) {
  throw new Error(`Standalone stylesheet is unexpectedly large (${size} bytes).`);
}

console.log(`Standalone stylesheet optimized to ${size} bytes.`);
