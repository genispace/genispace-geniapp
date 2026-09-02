export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  code?: number;
  timestamp?: string;
  error?: string;
  errorDetails?: any;
}

export interface StreamMetadata {
  components_found?: Array<{
    name: string;
    type: string;
    description?: string;
    id?: string;
  }>;
  workflow_created?: {
    workflow_id?: string;
    name?: string;
    description?: string;
    nodes?: any[];
    mode?: string;
  };
  agent_created?: {
    agent_id?: string;
    name?: string;
    description?: string;
    model?: string;
    mode?: string;
  };
  operator_created?: {
    operator_id?: string;
    name?: string;
    description?: string;
    type?: string;
    mode?: string;
  };
  task_analyzed?: {
    task_id?: string;
    name?: string;
    description?: string;
    status?: string;
    mode?: string;
  };
  platform_help_provided?: {
    help_content?: string;
    topics?: string[];
  };
  intent_category?: string;
  workflow_stage?: string;
  user_mode?: 'auto' | 'manual';
  iterations?: number;
  error_details?: string;
  tools?: Record<string, any>;
  action?: string;
  iteration?: number;
  session_id?: string;
}

export interface StreamProgress {
  currentNode: string;
  progress: number;
  status: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface FileUploadOptions {
  maxSize?: number; 
  allowedTypes?: string[];
  compress?: boolean;
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: any;
  field?: string; 
}

export interface ApiRequestConfig {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

export type ApiMethod = HttpMethod;
export type ApiConfig = ApiRequestConfig;