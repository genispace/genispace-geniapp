import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'ui');
const output = path.join(root, 'dist');

mkdirSync(path.join(output, 'styles'), { recursive: true });
mkdirSync(path.join(output, 'components', 'ui'), { recursive: true });
for (const file of ['base.css', 'reduced-motion.css', 'tailwind-preset.js']) {
  copyFileSync(path.join(source, 'styles', file), path.join(output, 'styles', file));
}
copyFileSync(path.join(source, 'fonts.css'), path.join(output, 'fonts.css'));
copyFileSync(
  path.join(source, 'components', 'ui', 'calendar.css'),
  path.join(output, 'components', 'ui', 'calendar.css'),
);
