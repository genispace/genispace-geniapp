export type UserFacingErrorKind = 'permission' | 'validation' | 'unavailable' | 'unknown';

export type UserFacingErrorMessages = Record<UserFacingErrorKind, string>;

type ErrorLike = {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
};

const PERMISSION_PATTERN = /\b(?:401|403|forbidden|unauthori[sz]ed|permission|access denied|not[_ -]?visible|missing (?:api )?auth(?:entication)?|session token)\b/i;
const VALIDATION_PATTERN = /\b(?:400|409|422|validation|invalid|required|conflict|duplicate|already exists|business rule|not applicable)\b/i;
const UNAVAILABLE_PATTERN = /\b(?:408|429|5\d\d|timeout|timed out|network|failed to fetch|service unavailable|bad gateway|gateway timeout|api returned html|invalid json|unexpected token|vite_|api_base|shell_init|datasource not found|managed datasource|agent not found|collector failed)\b/i;

export class UserFacingError extends Error {
  readonly kind: UserFacingErrorKind;

  constructor(kind: UserFacingErrorKind, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'UserFacingError';
    this.kind = kind;
  }
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    const value = error as Error & ErrorLike;
    return [value.status, value.statusCode, value.code, value.message].filter(Boolean).join(' ');
  }
  if (error && typeof error === 'object') {
    const value = error as ErrorLike;
    return [value.status, value.statusCode, value.code, value.message].filter(Boolean).join(' ');
  }
  return String(error ?? '');
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = error as ErrorLike;
  const candidate = value.status ?? value.statusCode;
  const status = typeof candidate === 'number' ? candidate : Number(candidate);
  return Number.isInteger(status) ? status : null;
}

/** Read the original failure for branching or telemetry; never render this value. */
export function diagnosticErrorText(error: unknown): string {
  if (error instanceof UserFacingError && error.cause !== undefined) {
    return errorDetails(error.cause);
  }
  return errorDetails(error);
}

export function classifyUserFacingError(error: unknown): UserFacingErrorKind {
  if (error instanceof UserFacingError) return error.kind;
  const status = errorStatus(error);
  if (status === 401 || status === 403) return 'permission';
  if (status === 400 || status === 404 || status === 409 || status === 422) return 'validation';
  if (status === 408 || status === 429 || (status !== null && status >= 500)) return 'unavailable';
  const details = errorDetails(error);
  if (PERMISSION_PATTERN.test(details)) return 'permission';
  if (UNAVAILABLE_PATTERN.test(details)) return 'unavailable';
  if (VALIDATION_PATTERN.test(details)) return 'validation';
  return 'unknown';
}

/**
 * Converts an implementation-level failure into copy that is safe to render.
 * The original failure is retained as `cause` and written to diagnostics only.
 */
export function toUserFacingError(
  error: unknown,
  messages: UserFacingErrorMessages,
  context = 'operation'
): UserFacingError {
  if (error instanceof UserFacingError) return error;
  console.error(`[GeniApp] ${context} failed`, error);
  const kind = classifyUserFacingError(error);
  return new UserFacingError(kind, messages[kind], error);
}
