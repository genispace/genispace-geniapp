export const MODEL_REASONING_EFFORTS = ['low', 'high', 'max'] as const;
export type ModelReasoningEffort = (typeof MODEL_REASONING_EFFORTS)[number];

export type ModelReasoningSelection =
  | { mode: 'default' | 'off' }
  | { mode: 'on'; effort?: ModelReasoningEffort };

export interface ModelReasoningCapability {
  modes: Array<'on' | 'off'>;
  efforts: ModelReasoningEffort[];
}

export function withModelReasoning<T extends Record<string, unknown>>(
  config: T,
  value: ModelReasoningSelection | undefined,
): T {
  const next = { ...config };
  if (value) Object.assign(next, { reasoning: value });
  else delete next.reasoning;
  return next;
}
