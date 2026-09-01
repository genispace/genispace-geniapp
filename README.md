# `@genispace/geniapp`

Public, versioned developer contract for building a GeniApp. This package is intentionally independent from the private GeniSpace frontend monorepo.

## Ownership boundary

```text
frontend/                         geniapp/                         applications/
├── apps/*                        └── @genispace/geniapp           └── apps/*
└── packages/shared-* (private)      ├── ui + kit                      ├── genispace SDK
                                      ├── Shell bridge                  └── @genispace/geniapp
                                      ├── hooks + runtime
                                      ├── theme + i18n contract
                                      └── Vite bundle plugin
```

- `frontend/packages/shared-*` belongs only to the platform frontend and is never a GeniApp dependency.
- `@genispace/geniapp` is the public UI/runtime/build contract used by built-in, custom and Workbench-exported GeniApps.
- [`genispace`](../sdk-javascript) remains the public platform API SDK. This package does not duplicate its HTTP/SSE clients.
- `@genispace/geniapp@0.1.0` requires exactly `genispace@3.1.0`. The SDK version is part of the GeniApp runtime contract and is checked before packing or publishing.

## Install

The package is publish-ready but must not be published until the npm scope, package name, repository and release credentials are approved.

```bash
pnpm add @genispace/geniapp genispace react react-dom react-router-dom i18next react-i18next
```

During local migration before the first npm release:

```json
{
  "dependencies": {
    "@genispace/geniapp": "file:../../../geniapp"
  }
}
```

## Public entries

| Entry | Stability | Purpose |
|---|---|---|
| `@genispace/geniapp` | stable | App layout, hooks and Shell bridge |
| `@genispace/geniapp/ui` | stable | App sidebar/page/state/form primitives |
| `@genispace/geniapp/kit` | stable | Curated shadcn-style component kit |
| `@genispace/geniapp/hooks` | stable | RBAC, routing, locale and platform-client helpers |
| `@genispace/geniapp/shell` | stable | Secure iframe context, theme, locale and route synchronization |
| `@genispace/geniapp/vite` | stable | Manifest/data bundle copying and versioned base-path helpers |
| `@genispace/geniapp/ai` | stable | Managed datasource and AI-assisted application patterns |
| `@genispace/geniapp/storage` | stable | Authenticated platform storage UI/helpers |
| `@genispace/geniapp/dashboard` | stable | Dashboard filters, KPI and chart patterns |
| `@genispace/geniapp/case-workspace` | stable | Case workspace contract |
| `@genispace/geniapp/task-workspace` | stable | Task workspace contract |

Only symbols exported by these entries are public. Files below `src/` and `dist/` are implementation details and cannot be imported through package exports.

Build tooling that creates a separately hosted shared font bundle may resolve
`@genispace/geniapp/fonts.css`; applications should continue importing
`@genispace/geniapp/styles.css`.

## Application setup

```tsx
import { AppPage, AppSidebar } from '@genispace/geniapp/ui';
import { Button, Card } from '@genispace/geniapp/kit';
import { GeniAppShellBridge } from '@genispace/geniapp/shell';
import '@genispace/geniapp/styles.css';

export function App() {
  return (
    <>
      <GeniAppShellBridge
        identifier="customer-operations"
        allowedShellOrigins={['https://app.genispace.ai']}
      />
      <AppSidebar groups={[]} />
      <AppPage title="Customer operations">
        <Card><Button>New customer</Button></Card>
      </AppPage>
    </>
  );
}
```

`allowedShellOrigins` should list production Shell origins. The bridge also accepts the iframe document referrer and falls back to the local Shell origins only when no production origin is available. A message cannot grant trust to its own sender.

## Tailwind

```js
// tailwind.config.js
import geniappPreset from '@genispace/geniapp/tailwind-preset';

export default {
  presets: [geniappPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@genispace/geniapp/dist/**/*.{js,mjs}',
  ],
};
```

The stylesheet contains the platform light/dark semantic tokens, local fonts, responsive application layout rules and component CSS. Locale text remains owned by each application; shared components accept labels or use the host `react-i18next` provider.

## Vite

```ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  copyGeniAppBundle,
  geniappBasePath,
  geniappManualChunks,
  geniappOptimizeDeps,
} from '@genispace/geniapp/vite';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));

export default defineConfig(({ command, mode }) => ({
  base: geniappBasePath({ command, mode, identifier: 'customer-operations', version: pkg.version }),
  plugins: [react(), copyGeniAppBundle({ appRoot })],
  optimizeDeps: geniappOptimizeDeps,
  build: { rollupOptions: { output: { manualChunks: geniappManualChunks } } },
}));
```

The plugin copies `manifest.json` and the entire `data/` contract into `dist/`, and serves the same files during local development. It does not create aliases to any GeniSpace source repository.

## Local quality gates

```bash
pnpm install
pnpm check:sdk-version
pnpm type-check
pnpm test
pnpm pack:check
```

`pack:check` builds the actual npm artifact into `.pack/`. Consumer acceptance tests must install that tarball, rather than importing this repository's source, to catch missing exports and undeclared dependencies.

## Release policy

- Follow semantic versioning. Removing or changing an exported symbol, Shell message, CSS token or manifest/build behavior is a breaking change.
- Applications pin an exact version in release lockfiles. Renovation is explicit and tested.
- Each GeniApp package release pins one exact `genispace` SDK peer version. Supporting another SDK version requires a reviewed GeniApp release, even when the SDK change is otherwise backward compatible.
- Publish from a clean Git tag with npm provenance after CI, package-name ownership and the MIT license are approved.
- The old `frontend-packages` repository is retired and retained only as a read-only historical checkout. No active application or platform frontend resolves code from it.
- The complete ownership decision, cutover procedure and acceptance evidence are documented in [`docs/ARCHITECTURE_AND_MIGRATION.md`](docs/ARCHITECTURE_AND_MIGRATION.md).
