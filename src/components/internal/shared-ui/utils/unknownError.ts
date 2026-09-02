export function getHttpErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
}

export function getApiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as {
    response?: { data?: { error?: { message?: string }; message?: string } };
    message?: string;
  };
  const fromBody =
    typeof e.response?.data?.error?.message === 'string'
      ? e.response.data.error.message
      : typeof e.response?.data?.message === 'string'
        ? e.response.data.message
        : undefined;
  if (fromBody) return fromBody;
  if (typeof e.message === 'string') return e.message;
  return undefined;
}
