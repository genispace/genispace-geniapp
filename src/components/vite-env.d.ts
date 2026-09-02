/// <reference types="vite/client" />

// Extend HTML attributes to include the inert attribute
declare global {
  namespace React {
    interface HTMLAttributes<T> {
      inert?: string;
    }
  }

  interface Window {
    /** Last saved component config (for dialog mock restore; no console logging) */
    __wbLastComponentConfig?: {
      componentId: string;
      config: Record<string, unknown> & {
        useMockData?: boolean;
        mockData?: unknown;
        props?: Record<string, unknown>;
      };
      at: string;
    };
  }
}

export {};
