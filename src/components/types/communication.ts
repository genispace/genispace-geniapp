export interface ComponentTrigger {
  key: string;
  label: string;
  description: string;
  category: 'success' | 'error' | 'change' | 'action' | 'lifecycle';
  dataType: 'timestamp' | 'object' | 'string' | 'number' | 'boolean';
  defaultParameters?: string[];
  icon?: string;
  /**
   * Marker for triggers that are derived at runtime from per-instance data
   * (e.g. one trigger per Table global action). Only the editor UI needs
   * to know; runtime consumers can ignore it.
   */
  dynamic?: boolean;
}

export interface ComponentTypeDefinition {
  type: string;
  displayName: string;
  description: string;
  triggers: ComponentTrigger[];
  defaultListenParameters?: string[];
  category: 'input' | 'display' | 'action' | 'container';
}

export interface TriggerConfig {
  enabled: boolean;
  parameters: string[];
  customParameters?: Record<string, any>;
  debounceTime?: number;
}

export interface ParameterHandler {
  action: 'refresh' | 'update' | 'custom' | 'none';
  customCode?: string;
  debounceTime?: number;
}

export type TreeCustomEmitField = {
  fieldName?: string;
  displayName?: string;
};

export interface ExtendedCommunicationConfig {

  enableCommunication?: boolean;

  enableEmit?: boolean;
  triggers?: Record<string, TriggerConfig>;

  customEmitFields?: Record<string, TreeCustomEmitField[]>;

  enableListen?: boolean;
  listenToParameters?: string[];

  parameterHandlers?: Record<string, ParameterHandler>;

  enableParameterReceiving?: boolean;
  parameterMapping?: Record<string, any>;
  dataSourceFilters?: Array<{
    field: string;
    operator: string;
    value: string | { type: string; value: string };
  }>;

  enableDebugLog?: boolean;
  customEventPrefix?: string;
}

export interface CommunicationEvent {
  eventId: string;
  timestamp: number;
  sourceComponentId: string;
  sourceComponentType: string;
  triggerKey: string;
  parameters: Record<string, any>;
  pageId?: string;
  tabId?: string;
  metadata?: Record<string, any>;
}

export interface ParameterDefinition {
  key: string;
  label: string;
  description: string;
  dataType: 'timestamp' | 'object' | 'string' | 'number' | 'boolean' | 'array';
  category: 'data' | 'trigger' | 'state' | 'event';
  isCommon?: boolean;
  relatedTriggers?: string[];
}

export interface CommunicationState {
  isEmitting: boolean;
  isListening: boolean;
  lastEmittedEvent?: CommunicationEvent;
  lastReceivedEvents?: CommunicationEvent[];
  errorCount: number;
  lastError?: Error;
}

export interface CommunicationStats {
  totalEventsSent: number;
  totalEventsReceived: number;
  triggerStats: Record<string, number>;
  parameterStats: Record<string, number>;
  errorRate: number;
}
