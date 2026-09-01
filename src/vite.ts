import { copyFileSync, cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export type GeniAppBundlePluginOptions = {
  appRoot: string;
  outDir?: string;
};

function contentTypeForDataFile(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.json': return 'application/json; charset=utf-8';
    case '.sql': return 'application/sql; charset=utf-8';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.mp4': return 'video/mp4';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function safeBundleFile(appRoot: string, requestPath: string) {
  const cleanPath = requestPath.split('?')[0].replace(/^\/+/, '');
  if (cleanPath === 'manifest.json') return path.join(appRoot, 'manifest.json');
  if (!cleanPath.startsWith('data/')) return null;

  const dataRoot = path.resolve(appRoot, 'data');
  const candidate = path.resolve(appRoot, cleanPath);
  if (candidate !== dataRoot && !candidate.startsWith(`${dataRoot}${path.sep}`)) return null;
  return candidate;
}

/** Serves and copies the complete, installable GeniApp contract bundle. */
export function copyGeniAppBundle({ appRoot, outDir = 'dist' }: GeniAppBundlePluginOptions): Plugin {
  const normalizedRoot = path.resolve(appRoot);
  const manifest = path.join(normalizedRoot, 'manifest.json');
  const data = path.join(normalizedRoot, 'data');

  return {
    name: 'genispace-copy-geniapp-bundle',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const filePath = safeBundleFile(normalizedRoot, request.url || '');
        if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) return next();
        try {
          response.setHeader('Content-Type', contentTypeForDataFile(filePath));
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.statusCode = 200;
          response.end(readFileSync(filePath));
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      const output = path.resolve(normalizedRoot, outDir);
      if (!existsSync(output)) return;
      if (existsSync(manifest)) copyFileSync(manifest, path.join(output, 'manifest.json'));
      if (existsSync(data)) cpSync(data, path.join(output, 'data'), { recursive: true });
    },
  };
}

/** Backward-compatible name used by the existing GeniApp scaffolds. */
export function copyManifestToDist(appRoot: string): Plugin {
  return copyGeniAppBundle({ appRoot });
}

export function geniappBasePath(options: {
  command: 'build' | 'serve';
  mode: string;
  identifier: string;
  version: string;
}) {
  return options.command === 'serve' && options.mode === 'development'
    ? '/'
    : `/${options.identifier}/${options.version}/`;
}

/** Dependencies that should remain host-resolved instead of pre-bundled in dev. */
export const geniappOptimizeDeps = {
  exclude: ['lucide-react', '@genispace/sdk', '@genispace/geniapp'],
};

/** Stable chunk grouping without repository-path aliases. */
export function geniappManualChunks(id: string) {
  if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router')) return 'react-runtime';
  if (id.includes('/node_modules/i18next') || id.includes('/node_modules/react-i18next')) return 'localization';
  if (id.includes('/node_modules/lucide-react/')) return 'icons';
  if (id.includes('/node_modules/@genispace/geniapp/') || id.includes('/node_modules/@genispace/sdk/')) return 'genispace-runtime';
  return undefined;
}
