/** Optional method-owned standard MCP Apps source declaration. */
export interface MethodView {
  url: string;
  visibility?: Array<'model' | 'app'>;
  csp?: Record<string, string[]>;
  permissions?: Record<string, Record<string, never>>;
}
