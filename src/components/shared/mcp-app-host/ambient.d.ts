/**
 * Ambient declaration for the lazy React entry of the private `@genispace/mcp-app-host`
 * workspace package. Only `MethodViewField.tsx` in the platform mirror loads it, through
 * `import('@genispace/mcp-app-host/react')`, which the declaration build never emits — so
 * unlike `@genispace/mcp-app-host/core` this specifier needs no `paths` mapping, just types
 * so the mirror compiles.
 *
 * The specifier stays external in the library build (the host application provides it) and
 * resolves to `./standalone-unavailable.tsx` in the standalone and test configs. See
 * `./contract.ts` for the matching `core` declarations.
 */
declare module '@genispace/mcp-app-host/react' {
  import type { ComponentType } from 'react';
  import type { McpAppViewProps } from './contract';

  export type { McpAppViewProps };

  export const McpAppView: ComponentType<McpAppViewProps>;
}
