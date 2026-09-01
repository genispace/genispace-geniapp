/**
 * @genispace/geniapp/ai — shared AI adopt UI, workflow results, managed datasource, integrations.
 * Import only from this barrel in application code.
 */

// Managed platform datasources (read / write / transaction)
export { createTableClient } from './managed-data/createTableClient';
export {
  queryManagedDatasourceRows,
  queryManagedDatasourceRowsAll,
  findManagedAppDataSourceId,
  createGeniSpaceClient,
} from './managed-data/queryManagedDatasource';
export {
  executeManagedDatasourceOperation,
  executeManagedDatasourceTransaction,
  createTransactionDatasourceClient,
  type ManagedDatasourceOperationResult,
  type ExecuteManagedDatasourceParams,
  type TransactionDatasourceClient,
} from './managed-data/executeManagedDatasource';
export {
  emitManagedEvent,
  createManagedEventClient,
  type EmittedEventEnvelope,
  type ManagedEventClient,
} from './managed-data/emitManagedEvent';
export { DatasourceReadonlyTable } from './managed-data/DatasourceReadonlyTable';

// Scale-safe, server-driven UI primitives (shared by all GeniApps)
export {
  ServerDataTable,
  type ServerDataTableProps,
  type ServerColumn,
  type ServerDataTableLabels,
  type SortDir,
} from './components/ServerDataTable';
export {
  AsyncCombobox,
  type AsyncComboboxProps,
  type AsyncOption,
  type AsyncComboboxLabels,
} from './components/AsyncCombobox';
export { useInfiniteRows, type UseInfiniteRowsResult } from './components/useInfiniteRows';
export { Timeline, TimelineItem, type TimelineProps, type TimelineItemProps } from './components/Timeline';

// Generic, i18n-agnostic UI building blocks (all user-facing text injected via props)
export {
  EntityRef,
  useEntityNames,
  type EntityRefProps,
  type UseEntityNamesResult,
} from './components/EntityRef';
export {
  BulkActionBar,
  type BulkActionBarProps,
  type BulkAction,
  type BulkActionBarLabels,
} from './components/BulkActionBar';
export {
  AgentJobProgressInline,
  useAgentJobRunner,
  type AgentJobProgressInlineProps,
  type AgentJobProgressLabels,
  type AgentRunState,
  type AgentJobLike,
  type AgentTaskContext,
  type AgentJobStartOptions,
  type UseAgentJobRunnerResult,
} from './components/AgentJobProgress';
export {
  JobProgress,
  useAsyncJob,
  type JobProgressProps,
  type JobProgressLabels,
  type JobStatus,
  type JobProgressState,
  type JobResult,
  type JobRunner,
  type UseAsyncJobResult,
} from './components/JobProgress';

// Consistent, localized application error mapping
export {
  UserFacingError,
  classifyUserFacingError,
  diagnosticErrorText,
  toUserFacingError,
  type UserFacingErrorKind,
  type UserFacingErrorMessages,
} from './errors/userFacingError';

// App shell providers
export { AppUiProviders } from './providers/AppUiProviders';

// AI panel layout & modal sizing
export {
  AI_SIDEBAR_MIN,
  AI_SIDEBAR_MAX,
  MODAL_SIZE_WITH_AI,
  AI_ADOPT_MODAL_GRID_STYLE,
  AI_ADOPT_GRID_CLASS,
  AI_ADOPT_PAGE_GRID_CLASS,
} from './layout/layoutConstants';
export { ModalWithAiLayout } from './layout/ModalWithAiLayout';
export { modalSizeForAi } from './layout/modalSizeForAi';

// AI adopt (detail sidebar, presets, parsing)
export { DetailPageAiLayout } from './adopt/DetailPageAiLayout';
export { AiSuggestionPanel, productDescriptionAdoptFields } from './adopt/AiSuggestionPanel';
export type { AiSuggestionPanelProps } from './adopt/AiSuggestionPanel';
export { BusinessGuidancePanel } from './adopt/BusinessGuidancePanel';
export type { BusinessGuidancePanelProps } from './adopt/BusinessGuidancePanel';
export { guidanceContentFromSummary, guidanceStatus } from './adopt/guidanceContent';
export type { GuidanceContent, GuidanceLanguage } from './adopt/guidanceContent';
export { parseAiSummary, getByPath, formatDisplayValue, localizedText } from './adopt/parseAiSummary';
export {
  genericSummaryField,
  narrationAdoptField,
  recommendationAdoptField,
  descriptionAdoptField,
  synopsisAdoptField,
  noteAdoptField,
  internalNotesAdoptField,
  jobTitleAdoptField,
  appendTextAdoptField,
} from './adopt/adoptPresets';

// Cross-app integrations
export {
  PARTNER_GENIAPP,
  PARTNER_RECORD_PICKER_DS,
  probePartnerRecordPicker,
  loadPartnerRecordOptions,
  type PartnerRecordOption,
  type PartnerRecordRole,
  type LoadPartnerRecordOptionsParams,
} from './integrations/partner/partnerRecordPicker';
export {
  createPartnerRecordPickerHook,
  type PartnerRecordPickerHookOptions,
} from './integrations/partner/createPartnerRecordPickerHook';

// Shared types
export type { AdoptFieldConfig, AppTableClient, WorkflowResultRow } from './types';
