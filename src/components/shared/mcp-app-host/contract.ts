/**
 * Structural copy of the public surface of the private `@genispace/mcp-app-host`
 * workspace package (frontend monorepo, `packages/mcp-app-host/src/core/types.ts`).
 *
 * Why this exists: the MCP Apps host is distributed inside the GeniSpace frontend through
 * a git release and is therefore not installable from npm, so it cannot be a dependency of
 * this public package. The platform mirror (`src/components/shared/platform-ui`) does
 * reference it — `components/patterns/MethodViewField.tsx` renders a read-only App preview —
 * and the parity contract requires those files to remain byte-identical with their upstream
 * source, so the import cannot be rewritten away either.
 *
 * `tsconfig.json` maps `@genispace/mcp-app-host/core` here. That keeps the mirror
 * type-checking without the package installed, and lets the declaration build rewrite the
 * reference to a real relative `.d.ts` instead of an unresolvable bare specifier.
 *
 * Refresh these declarations whenever the upstream host contracts change. This module must
 * stay type-only: no runtime import of `@genispace/mcp-app-host` resolves to a
 * package this build can execute.
 */

export type DisplayMode = 'inline' | 'fullscreen';

export interface Tool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CallToolResult {
  content: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** Host-owned invocation snapshot. Never constructed from an App message. */
export interface McpAppDescriptor {
  schemaVersion: 1;
  kind: 'mcp-app';
  serverIdentity: string;
  principalId: string;
  environment: string;
  spaceId?: string;
  sessionId: string;
  threadId: string;
  messageId: string;
  toolCallId: string;
  mcpRequestId?: string | number;
  tool: Tool;
  arguments: Record<string, unknown>;
  result: CallToolResult;
  resourceUri: string;
  resourceHash?: string;
  resultHash?: string;
  readOnly?: boolean;
}

export interface HostScope {
  serverIdentity: string;
  principalId: string;
  environment: string;
  spaceId?: string;
  sessionId: string;
  toolsEnabled: boolean;
  readOnly: boolean;
}

export interface OperationContext {
  signal: AbortSignal;
  actionId: string;
  parentToolCallId: string;
}

/** All authority stays behind this port. There is no client/fetch/native handle. */
export interface HostPort {
  readonly scope: HostScope;
  readResource(url: string, options?: { signal?: AbortSignal }): Promise<ReadResourceResult>;
  listTools(options?: { signal?: AbortSignal }): Promise<Tool[]>;
  authorizeToolCall(
    tool: Tool,
    args: Record<string, unknown>,
    context?: OperationContext,
  ): Promise<boolean>;
  callTool(
    params: { name: string; arguments: Record<string, unknown> },
    context?: OperationContext,
  ): Promise<CallToolResult>;
  openLink(url: string): Promise<void>;
  acceptMessage?(params: unknown): Promise<boolean>;
  updateModelContext?(params: unknown): Promise<void>;
  close?(): Promise<void>;
}

export interface HostPolicy {
  maxHtmlBytes?: number;
  maxResultBytes?: number;
  maxMessageBytes?: number;
  maxContextBytes?: number;
  initializeTimeoutMs?: number;
  resourceTimeoutMs?: number;
  allowedCsp?: Record<string, unknown>;
}

export interface VerifiedResource {
  uri: string;
  html: string;
  mimeType: 'text/html;profile=mcp-app';
  hash: string;
  csp: Record<string, string[] | undefined>;
  permissions?: Record<string, Record<string, never>>;
}

export interface SandboxHandle {
  url: string;
  /** Native adapters provide the real WebView message origin explicitly. */
  origin?: string;
  release?: () => void | Promise<void>;
}

export type SandboxSource =
  | string
  | ((resource: VerifiedResource) => Promise<SandboxHandle> | SandboxHandle);

export interface HostState {
  phase: 'idle' | 'loading' | 'initializing' | 'ready' | 'closed' | 'error';
  mode: DisplayMode;
  availableDisplayModes?: DisplayMode[];
  error?: string;
  resourceHash?: string;
}

export interface CreateAppHostOptions {
  descriptor: McpAppDescriptor;
  port: HostPort;
  frame?: HTMLIFrameElement;
  sandboxUrl?: SandboxSource;
  context?: Record<string, unknown>;
  policy?: HostPolicy;
  onState?: (state: HostState) => void;
  onModeChange?: (mode: DisplayMode) => void;
  onSizeChange?: (size: { width?: number; height?: number }) => void;
  onDescriptorVerified?: (descriptor: McpAppDescriptor) => void;
}

/** Props of the host's `McpAppView` React entry (`@genispace/mcp-app-host/react`). */
export type McpAppViewProps = Omit<CreateAppHostOptions, 'frame'> & {
  title: string;
  className?: string;
  hidden?: boolean;
};

export interface McpAppViewHandle {
  setDisplayMode: (mode: DisplayMode) => Promise<void> | void;
  close: () => Promise<void> | void;
}
