interface UserAgentKnowledgeBase {
  userAgentId: string;
  knowledgeBaseId: string;
  permissionLevel: 'read' | 'write';
}

export interface UserAgent {
  name: string;
  description: string;
  model: string;
  modelId: string;
  modelConfig: Record<string, unknown>;
  knowledgeBases: UserAgentKnowledgeBase[];
  promptTemplate: string;
  inputSchema: Record<string, unknown> | string;
  outputSchema: Record<string, unknown> | string;
  rateLimit: number;
  retryAttempts: number;
  contextWindow: number;
  fallbackBehavior: string;
  systemPrompt: string;
  enableStreaming: boolean;
  logLevel: string;
  timeoutSeconds: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  tags: string[];
  customHeaders: Record<string, string>;
  webhooks: string[];
  security: {
    enableRateLimit: boolean;
    requireAuthentication: boolean;
    allowedOrigins: string[];
    ipWhitelist: string[];
  };
  agentType: 'conversational' | 'response';
  conversationConfig?: {
    maxTurns: number;
    contextWindow: number;
    sessionTimeout: number;
    welcomeMessage?: string;
  };
  responseConfig?: {
    strictSchema: boolean;
    validateInput: boolean;
    validateOutput: boolean;
    cacheable: boolean;
  };
  mcpConfig?: {
    enabled: boolean;
    builtinEnabled?: boolean;
    operatorSelection?: {
      strategy: 'all' | 'specific';
      operatorIds: string[];
    };
    taskSelection?: {
      strategy: 'all' | 'specific';
      taskIds: string[];
    };
    servers: Array<{
      name: string;
      command: string;
      args: string[];
      env: Record<string, string>;
      tools: string[];
    }>;
  };
  memoryConfig?: {
    enabled: boolean;
    isolation: string;
    retrieval?: {
      layer_limits?: {
        session: number;
        user: number;
        agent: number;
      };
      layer_weights?: {
        session: number;
        user: number;
        agent: number;
      };
    };
    storage?: {
      importance_thresholds?: {
        session: number;
        user: number;
        agent: number;
      };
    };
  };
  webSearchConfig?: {
    enabled: boolean;
    maxSearches: number;
    maxResultsPerSearch: number;
  };
  thinkingChainConfig?: {
    enabled: boolean;
    maxIterations: number;
  };
}