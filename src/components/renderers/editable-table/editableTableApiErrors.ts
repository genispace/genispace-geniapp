import type { TFunction } from 'i18next';

type ThrownApiError = {
  message?: string;
  errorDetails?: { code?: string; message?: string };
  code?: string | number;
};

function getBusinessErrorCode(e: ThrownApiError): string | undefined {
  if (typeof e.errorDetails?.code === 'string') {
    return e.errorDetails.code;
  }
  if (typeof e.code === 'string' && !e.code.startsWith('ERR_')) {
    return e.code;
  }
  return undefined;
}

export function getDataSourceTableApiErrorMessage(
  error: unknown,
  t: TFunction
): string {
  const e = error as ThrownApiError;
  const msg = typeof e?.message === 'string' ? e.message : '';
  const businessCode =
    getBusinessErrorCode(e) ?? (msg.includes('INVALID_OPERATION_TYPE') ? 'INVALID_OPERATION_TYPE' : undefined);

  if (businessCode === 'INVALID_OPERATION_TYPE') {
    if (/READ|read operation|只读|查询|configured for READ/i.test(msg)) {
      return t(
        'table.error_read_datasource_cannot_write',
        'This data source is read-only (READ) and cannot be used for updates. In Data Management, bind inline editing to an update-type data source (operationType: UPDATE, e.g. UPDATE or MERGE), or create a separate data source for writes.'
      );
    }
    return t(
      'table.error_invalid_operation_type',
      'The current request does not match this data source operationType. Check the data source configuration.'
    );
  }

  if (msg) return msg;
  if (error instanceof Error) return error.message;
  return t('table.request_failed', 'Request failed');
}
