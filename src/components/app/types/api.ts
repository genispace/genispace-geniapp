export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: number;
  timestamp?: string;
  error?: string;
  errorDetails?: unknown;
}
