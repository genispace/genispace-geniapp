/**
 * Standalone substitute for `@genispace/mcp-app-host/react`.
 *
 * `vite.standalone.config.ts` builds a self-contained bundle that is served raw in the
 * browser and inlines every dynamic import, so the platform mirror's lazy
 * `import('@genispace/mcp-app-host/react')` in `components/patterns/MethodViewField.tsx`
 * cannot be left unresolved there. The standalone GeniApp runtime never hosts MCP Apps,
 * so this module stands in for the real `McpAppView` and reports the preview as
 * unavailable instead of breaking the bundle (or the surrounding dialog at runtime).
 *
 * The library build (`vite.config.ts`) keeps the real specifier external, so consumers
 * that provide the MCP Apps host still get the working preview.
 */
export function McpAppView() {
  return (
    <p role="status" className="py-10 text-center text-sm text-muted-foreground">
      MCP App preview is not available in the standalone runtime.
    </p>
  );
}
