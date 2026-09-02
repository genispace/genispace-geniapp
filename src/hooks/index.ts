/**
 * @genispace/geniapp/hooks — Shell/RBAC/routing helpers for GeniApps.
 * Import only from this barrel in application code.
 */

export { useRefetchOnRouteMatch, isListRoutePath } from './routing/useRefetchOnRouteMatch';
export {
  ROUTE_NEW_PLACEHOLDER,
  isRouteEditMode,
  isRouteNewPlaceholder,
  resolveDraftEntityId,
} from './routing/draftEntityId';
export {
  COMMON_CURRENCY_OPTIONS,
  DEFAULT_ENABLED_CURRENCIES,
  currencyLabel,
  normalizeEnabledCurrencies,
  parseEnabledCurrenciesJson,
  type CurrencyCode,
} from './config/currencies';
export {
  formatBusinessCurrency,
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatBusinessNumber,
  resolveBusinessLocale,
  type BusinessLocale,
} from './config/businessLocale';
export {
  GENISPACE_SHELL_INIT_APPLIED_EVENT,
  GENISPACE_SHELL_SESSION_API_KEY,
  GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY,
} from './shell/shell';
export { useGenispacePlatformClient } from './shell/useGenispacePlatformClient';
export {
  useAppAccess,
  createAppAccessHook,
  setAppApplicationId,
  getAppApplicationId,
  hasAppPermission,
  isAppRbacRelaxed,
  canAccessNavItem,
  canPerformAppAction,
  resolvePlatformApiRootFromShell,
  type AppAccess,
  type UseAppAccessOptions,
} from './access/useAppAccess';
export { AppAccessNotice } from './access/AppAccessNotice';
export { AppAccessGate, AppContentSkeleton, type AppContentSkeletonVariant } from './access/AppAccessGate';
export { applyPartnerPayload, type PartnerFields } from './picker/partnerPayload';
export {
  createResolveApiRoot,
  createScopeTableClient,
  type CreateResolveApiRootOptions,
} from './shell/resolveApiRoot';
export {
  createUseManagedAppPicker,
  type ManagedPickerOption,
  type ManagedPickerConfig,
} from './picker/managedAppPicker';
export {
  CrossAppRecordPicker,
  type CrossAppRecordOption,
  type CrossAppSnapshotValue,
  type CrossAppRecordPage,
  type CrossAppRecordPickerProps,
} from './picker/CrossAppRecordPicker';
