/** Shell iframe bridge event (must match each app's AppIframeBridge). */
export const GENISPACE_SHELL_INIT_APPLIED_EVENT = 'genispace-shell-init-applied';

/** Session key for injected platform API public base URL (Shell GENISPACE_SHELL_INIT). */
export const GENISPACE_SHELL_SESSION_API_KEY = '__genispace_shell_api_public_base__';

/** Session key for the installed Application instance id injected by Shell. */
export const GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY = '__genispace_shell_application_id__';
/** Identifier distinguishes this app from cross-application resource consumers. */
export const GENISPACE_SHELL_SESSION_IDENTIFIER_KEY = '__genispace_shell_application_identifier__';
/** Server only honors the lower-privilege `stable` override. */
export const GENISPACE_SHELL_SESSION_RELEASE_CHANNEL_KEY = '__genispace_shell_release_channel__';
/** Effective application version supplied by the trusted platform shell. */
export const GENISPACE_SHELL_SESSION_VERSION_KEY = '__genispace_shell_application_version__';
