export { cn } from './utils/cn';

export {
  getPlaneBaseUrl,
  buildCrossAppUrl,
  crossAppNav,
  getAppLaunchUrl,
  resolveLanding,
  type AppPlane,
  type LaunchableApp,
  type ResolveLandingInput,
  type LandingTarget,
} from './utils/crossApp';

export {
  formatDate,
  formatNumber,
  formatBytes,
  formatLargeNumber,
  formatTokens,
  formatDuration,
  formatDurationFromMs,
  formatDateTime,
  formatLocalDate,
  formatLocalDateTime,
  formatRelativeTime,
} from './utils/formatting';

export { formatUserLabel, type UserLabelSource } from './utils/formatUserLabel';
export { toDateInputValue } from './utils/toDateInputValue';

export { debounce } from './utils/debounce';
export { throttle } from './utils/throttle';

export {
  isChunkLoadError,
  reloadOnceIfChunkError,
  setupChunkLoadRecovery,
} from './utils/chunkLoadRecovery';

export {
  namespacesForPath,
  type RouteLocaleRule,
} from './utils/routeLocalePrefetch';

export {
  createSSOClient,
  type SSOClient,
  type SSOClientConfig,
  type ApplicationConfig,
  type SSOCallbackResult,
  type StateData,
} from './utils/sso';

export {
  LOGOUT_NOTIFICATION_PATH,
  LOGOUT_COMPLETED_MESSAGE,
  collectLogoutNotificationUrls,
  broadcastLogoutNotifications,
  isLogoutBroadcastInProgress,
} from './utils/logoutNotification';

export {
  setCookie,
  getCookie,
  removeCookie,
  setTheme,
  getTheme,
  setLanguage,
  getLanguage,
  setTimeZone,
  getTimeZone,
  setSpaceId,
  getSpaceId,
  initializeSettings,
} from './cookieSettings';

export {
  getAllIanaTimeZoneIds,
  buildTimeZoneSelectOptions,
  type TimeZoneSelectOption,
} from './utils/timezones';

export {
  normalizeOperatorLang,
  mergeSchemaLocale,
  mergeImportedOperatorDefinitionLocale,
  getOperatorDefinitionDisplay,
  prepareTenantOperatorApiResponseForConsole,
  stripTenantOperatorSystemConfigurationDeep,
  syncSchemaLocalePatchWithCanonical,
  syncOperatorMetadataLocalesWithCanonicalSchemas,
  type OperatorLang,
  type OperatorDefinitionDisplay,
  type CanonicalMethodForLocaleSync,
} from './utils/operatorLocale';

export {
  COUNTRY_CODES,
  GREATER_CHINA_COUNTRY_CODES,
  getCountryByCode,
  getCountriesByDialCode,
  getAllCountries,
  getGreaterChinaCountries,
  searchCountries,
  validateNationalNumber,
  formatPhoneNumber,
  parsePhoneNumber,
  getChinaCountry,
  type CountryCode,
  type GreaterChinaCountryCode,
} from './data/countryCodes';

export {
  normalizeIframeBaseUrl,
  buildAppIframeSrc,
  shellPathnameToInnerPath,
} from './utils/shellIframeUrl';

export { pathnameWithinBase } from './utils/appPath';

export {
  GENISPACE_APP_IDS,
  DEFAULT_SPACE_SETTINGS,
  normalizeSpaceSettings,
  isSpaceWatermarkEnabled,
  readStoredUserPhone,
  buildWatermarkLabel,
  type GenispaceAppId,
  type SpaceSettings,
  type SpaceWatermarkApps,
  type WatermarkLabelInput,
} from './utils/watermark';
