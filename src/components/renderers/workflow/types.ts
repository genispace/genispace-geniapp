import { JSONSchema } from '@genispace/shared-types';

export type StepComponentType = 
  | 'upload'      
  | 'proposal'    
  | 'result'      
  | 'custom';     

export type ProposalRendererType = 
  | 'table'   
  | 'form'    
  | 'card'    
  | 'custom'; 

export type ActionType = 
  | 'approve'    
  | 'edit'       
  | 'reject'     
  | 'submit'     
  | 'cancel'     
  | 'custom';    

export type DisplayFormat = 'json' | 'table' | 'card' | 'custom';

export type AlertType = 'warning' | 'info' | 'success' | 'error';

export interface WorkflowStep {

  id: string;

  title: string;

  description: string;

  icon?: string;

  component: StepComponentType;

  config: StepConfig;

  order?: number;
}

export interface StepConfig {
  upload?: UploadStepConfig;
  proposal?: ProposalStepConfig;
  result?: ResultStepConfig;
  custom?: CustomStepConfig;
}

export interface UploadStepConfig {

  accept?: string;

  maxSize?: number;

  multiple?: boolean;

  preview?: boolean;

  buttonText?: string;

  placeholder?: string;

  onUpload?: (file: File) => Promise<any>;
}

export interface ProposalStepConfig {

  renderer: ProposalRendererType;

  rendererConfig: ProposalRendererConfig;

  actions: ActionButton[];

  metadata?: MetadataField[];

  alerts?: AlertConfig[];

  editable?: boolean;

  editMode?: 'inline' | 'form';
}

export interface ProposalRendererConfig {
  type: ProposalRendererType;

  table?: {
    columns: TableColumn[];
    dataPath?: string;           
    showHeader?: boolean;         
    striped?: boolean;           
  };

  form?: {
    schema: JSONSchema;          
    layout?: 'vertical' | 'horizontal' | 'grid';
    showOptionalFields?: boolean; 
  };

  card?: {
    fields: CardField[];
    layout?: 'grid' | 'list';   
  };

  custom?: {
    rendererId: string;          
    props?: Record<string, any>;  
  };
}

export interface TableColumn {

  key: string;

  label: string;

  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean';

  format?: string;

  align?: 'left' | 'center' | 'right';

  width?: string | number;

  render?: (value: any, record: any) => React.ReactNode;
}

export interface CardField {

  key: string;

  label: string;

  type: 'text' | 'badge' | 'progress' | 'link' | 'custom';

  valuePath?: string;

  format?: string;

  icon?: string;

  color?: string;
}

export interface ActionButton {

  id: string;

  label: string;

  variant: 'primary' | 'secondary' | 'destructive' | 'outline';

  icon?: string;

  action: ActionType;

  handler?: string;

  confirmMessage?: string;

  disabled?: boolean | ((data: any) => boolean);

  loading?: boolean;
}

export interface MetadataField {

  key: string;

  label: string;

  valuePath: string;

  icon?: string;

  format?: 'date' | 'currency' | 'percentage' | 'text' | 'number';

  color?: string;
}

export interface AlertConfig {

  type: AlertType;

  message: string;

  icon?: string;

  dismissible?: boolean;
}

export interface ResultStepConfig {

  displayFormat: DisplayFormat;

  showCopy?: boolean;

  successMessage?: string;

  errorMessage?: string;

  customRenderer?: string;
}

export interface CustomStepConfig {

  componentId: string;

  props?: Record<string, any>;
}

export interface DataTransformConfig {

  transformStepData?: (stepId: string, data: any, context?: any) => any;

  prepareStepOutput?: (stepId: string, data: any, context?: any) => any;

  validateStepData?: (stepId: string, data: any) => { valid: boolean; errors?: string[] };

  apiHandlers?: {
    [stepId: string]: (data: any, config: any) => Promise<any>;
  };
}

export interface WorkflowComponentProps {

  agentId?: string;

  /**
   * Parse task id (resolved from `parseTaskIdentifier` at install). Step 1 runs the
   * uploaded file through this task (document-reader → agent) to produce a
   * structured record for review — it does NOT save. Preferred over `agentId`.
   */
  parseTaskId?: string;

  /**
   * Save task id (resolved from `saveTaskIdentifier`). Runs on confirm to write the
   * reviewed record into the dataset (vector store). Two-phase: parse → review → save.
   */
  saveTaskId?: string;

  /**
   * Maps the uploaded file into the parse task's workflow input ports:
   * `{urlNode}.{urlPort}` receives `{ url, filename }` (fed to document-reader),
   * `{metaNode}.{metaPort}` receives `{ id, name, folderId }` (source provenance).
   */
  fileInput?: {
    urlNode: string;
    urlPort: string;
    metaNode?: string;
    metaPort?: string;
  };

  /**
   * Maps the reviewed record into the save task's workflow input port:
   * `{recordNode}.{recordPort}` receives the confirmed record object.
   */
  saveInput?: {
    recordNode: string;
    recordPort: string;
  };

  className?: string;

  steps: WorkflowStep[];

  transforms?: DataTransformConfig;

  onStepComplete?: (stepId: string, data: any) => void;

  onWorkflowComplete?: (finalData: any) => void;

  onError?: (error: Error, stepId?: string) => void;

  onAction?: (actionId: string, data: any) => void | Promise<void>;

  useMockData?: boolean;

  mockData?: Record<string, any>;

  customRenderers?: {
    [rendererId: string]: React.ComponentType<any>;
  };

  layout?: {

    columns?: number;

    gap?: string;
  };
}

export interface WorkflowState {

  currentStep: number;

  stepData: Record<string, any>;

  uploadedFile: File | null;

  isProcessing: boolean;

  error: Error | null;

  isEditing?: boolean;

  actionStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
}

