import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'ui');
const output = path.join(root, 'dist');

mkdirSync(path.join(output, 'styles'), { recursive: true });
mkdirSync(path.join(output, 'components', 'ui'), { recursive: true });
mkdirSync(path.join(output, 'components', 'internal', 'workbench', 'styles'), { recursive: true });
for (const file of ['base.css', 'reduced-motion.css', 'tailwind-preset.js']) {
  copyFileSync(path.join(source, 'styles', file), path.join(output, 'styles', file));
}
copyFileSync(path.join(source, 'fonts.css'), path.join(output, 'fonts.css'));
copyFileSync(
  path.join(source, 'components', 'ui', 'calendar.css'),
  path.join(output, 'components', 'ui', 'calendar.css'),
);
for (const file of ['layoutSystem.css', 'grid24.css']) {
  copyFileSync(
    path.join(root, 'src', 'components', 'internal', 'workbench', 'styles', file),
    path.join(output, 'components', 'internal', 'workbench', 'styles', file),
  );
}
const componentsCss = readFileSync(path.join(root, 'src', 'components', 'styles.css'), 'utf8')
  .replace("../ui/styles/base.css", "../styles/base.css");
writeFileSync(path.join(output, 'components', 'styles.css'), componentsCss);
