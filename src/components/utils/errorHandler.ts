import i18n from '../locales/i18n';

type TranslationParams = Record<string, unknown>;

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  originalError?: unknown;
}

const getI18nErrorMessage = (
  errorCode: string,
  defaultMessage?: string,
  params?: TranslationParams,
  namespaceHint?: string
): string => {

  const errorCodeLower = errorCode.toLowerCase();

  const namespacesToTry: string[] = [];

  if (namespaceHint) {

    namespacesToTry.push(namespaceHint, 'common');
  } else {

    namespacesToTry.push('common');
  }

  for (const namespace of namespacesToTry) {
    const translationKey = `${namespace}:errors.${errorCodeLower}`;

    try {
      const translated = i18n.t(translationKey, { 
        defaultValue: undefined, 
        ...params 
      });

      if (translated && translated !== translationKey) {
        return translated;
      }
    } catch {

      continue;
    }
  }

  return defaultMessage || errorCode;
};

const getDefaultErrorMessage = (): string =>
  i18n.t('common:errors.operation_failed', {
    defaultValue: 'Operation failed'
  });

/**
 * Generic HTTP-style codes shared by many errors. For these the backend `message` is the
 * specific, already-localized text (resolved from X-Language), so prefer it over a generic
 * frontend `errors.{code}` translation that would mask it. Specific codes still prefer an
 * intentional frontend translation, falling back to the server message.
 */
const GENERIC_ERROR_CODES = new Set([
  'VALIDATION_ERROR', 'NOT_FOUND', 'FORBIDDEN', 'BAD_REQUEST', 'UNAUTHORIZED',
  'CONFLICT', 'PAYMENT_ERROR', 'SERVER_ERROR', 'INTERNAL_SERVER_ERROR', 'UNKNOWN_ERROR',
]);

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null;

const resolveErrorMessage = (
  code: string,
  serverMessage: string,
  fallback: string,
  namespaceHint?: string
): string => {
  const hasServerMessage =
    typeof serverMessage === 'string' && serverMessage.trim() !== '' && serverMessage !== fallback;
  if (GENERIC_ERROR_CODES.has(code)) {
    return hasServerMessage ? serverMessage : getI18nErrorMessage(code, serverMessage, undefined, namespaceHint);
  }
  if (code && code !== 'UNKNOWN_ERROR') {
    return getI18nErrorMessage(code, serverMessage, undefined, namespaceHint);
  }
  return serverMessage;
};

export const extractApiError = (error: unknown, namespaceHint?: string): ApiError => {
  const fallback = getDefaultErrorMessage();
  let message = fallback;
  let code = 'UNKNOWN_ERROR';
  let status = 500;

  const rec = asRecord(error);

  // 1) baseApiClient throws a plain { success:false, message, code, errorDetails } object
  if (rec && rec.success === false) {
    const errorDetails = asRecord(rec.errorDetails) ?? {};
    const rawCode = errorDetails.code ?? rec.code;
    code = typeof rawCode === 'string' ? rawCode : code;
    const rawStatus = errorDetails.status ?? rec.code;
    status = typeof rawStatus === 'number' ? rawStatus : status;
    const originalMessage =
      (typeof rec.message === 'string' ? rec.message : undefined) ??
      (typeof errorDetails.message === 'string' ? errorDetails.message : undefined) ??
      fallback;
    message = resolveErrorMessage(code, originalMessage, fallback, namespaceHint);
  } else if (
    rec &&
    'response' in rec &&
    typeof rec.response === 'object' &&
    (rec as { response?: { data?: unknown } }).response?.data
  ) {
    const response = (error as { response: { data: Record<string, unknown>; status?: number } }).response;
    const responseData = response.data;
    code = typeof responseData.code === 'string' ? responseData.code : code;
    status = typeof response.status === 'number' ? response.status : status;
    const originalMessage =
      typeof responseData.message === 'string' ? responseData.message : fallback;
    message = resolveErrorMessage(code, originalMessage, fallback, namespaceHint);
  } else if (rec && typeof rec.message === 'string') {
    message = rec.message;
  }

  return {
    message,
    code,
    status,
    originalError: error
  };
};

export const getFriendlyErrorMessage = (
  error: ApiError, 
  context: string = '',
  namespaceHint?: string
): string => {
  const defaultMessage = getDefaultErrorMessage();

  if (error.message && error.message !== defaultMessage) {
    return error.message;
  }

  if (error.code) {
    const params = context ? { context } : undefined;
    return getI18nErrorMessage(error.code, defaultMessage, params, namespaceHint);
  }

  return defaultMessage;
};

const ERROR_TITLE_KEYS: Record<
  string,
  { translationKey: string; defaultValue: string }
> = {
  SERVER_ERROR: { translationKey: 'error_titles.server_error', defaultValue: 'Server Error' },
  FORBIDDEN: { translationKey: 'error_titles.forbidden', defaultValue: 'Access Denied' },
  NOT_FOUND: { translationKey: 'error_titles.not_found', defaultValue: 'Resource Not Found' },
  UNAUTHORIZED: { translationKey: 'error_titles.unauthorized', defaultValue: 'Authentication Required' },
  VALIDATION_ERROR: { translationKey: 'error_titles.validation_error', defaultValue: 'Validation Error' },
  NETWORK_ERROR: { translationKey: 'error_titles.network_error', defaultValue: 'Network Error' },
  TIMEOUT: { translationKey: 'error_titles.timeout', defaultValue: 'Request Timeout' },
  DEFAULT: { translationKey: 'error_titles.operation_failed', defaultValue: 'Operation Failed' }
};

const translateErrorTitle = (code?: string): string => {
  const keyConfig = (code && ERROR_TITLE_KEYS[code]) || ERROR_TITLE_KEYS.DEFAULT;
  return i18n.t(`common:${keyConfig.translationKey}`, {
    defaultValue: keyConfig.defaultValue
  });
};

export const getErrorTitle = (error: ApiError): string => translateErrorTitle(error.code);

export const handleApiError = (error: unknown, context: string = '', namespaceHint?: string): ApiError => {
  const apiError = extractApiError(error, namespaceHint);
  const friendlyMessage = getFriendlyErrorMessage(apiError, context, namespaceHint);

  return {
    ...apiError,
    message: friendlyMessage
  };
};
