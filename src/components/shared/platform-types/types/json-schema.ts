export interface JSONSchemaProperty {

  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | string;

  title?: string;

  description?: string;

  default?: unknown;

  enum?: unknown[];

  format?: string;

  minimum?: number;

  maximum?: number;

  minLength?: number;

  maxLength?: number;

  pattern?: string;

  items?: JSONSchema | { type: string };

  properties?: Record<string, JSONSchemaProperty>;

  required?: string[];

  additionalProperties?: boolean | JSONSchema;

  'x-component'?: string;

  'x-component-props'?: Record<string, unknown>;

  'x-enum-descriptions'?: Record<string, string>;

  'x-display'?: string;

  'x-validator'?: unknown;

  [key: string]: unknown;
}

export interface JSONSchema {

  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | string;

  title?: string;

  description?: string;

  properties?: Record<string, JSONSchemaProperty>;

  required?: string[];

  items?: JSONSchema | { type: string };

  additionalProperties?: boolean | JSONSchema;

  enum?: unknown[];

  default?: unknown;

  format?: string;

  minimum?: number;

  maximum?: number;

  minLength?: number;

  maxLength?: number;

  pattern?: string;

  'x-component'?: string;

  'x-component-props'?: Record<string, unknown>;

  'x-enum-descriptions'?: Record<string, string>;

  'x-display'?: string;

  'x-validator'?: unknown;

  [key: string]: unknown;
}

