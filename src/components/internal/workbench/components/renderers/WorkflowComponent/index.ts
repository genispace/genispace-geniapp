export { WorkflowComponent } from './WorkflowComponent';
export { default as WorkflowComponentDefault } from './WorkflowComponent';

export type {
  WorkflowStep,
  StepConfig,
  UploadStepConfig,
  ProposalStepConfig,
  ProposalRendererConfig,
  ResultStepConfig,
  ActionButton,
  MetadataField,
  AlertConfig,
  DataTransformConfig,
  WorkflowComponentProps,
  WorkflowState
} from './types';

export type { JSONSchema, JSONSchemaProperty } from '@genispace/shared-types';

export { UploadStep } from './steps/UploadStep';
export { ProposalStep } from './steps/ProposalStep';
export { ResultStep } from './steps/ResultStep';

export { ProposalRendererFactory } from './renderers/ProposalRendererFactory';
export { SimpleSchemaForm } from './SimpleSchemaForm';

