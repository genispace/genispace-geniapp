import { createUseManagedAppPicker } from '@genispace/geniapp/hooks';
import {
  loadPartnerRecordOptions,
  probePartnerRecordPicker,
  type PartnerRecordRole,
} from './partnerRecordPicker';

function readToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export type PartnerRecordPickerHookOptions = {
  role?: PartnerRecordRole;
  partyType?: 'organization' | 'person';
  legalEntityRef?: string;
};

export function createPartnerRecordPickerHook(
  buildApiRoot: () => string,
  hookOptions: PartnerRecordPickerHookOptions = {},
) {
  return createUseManagedAppPicker({
    providerGeniappId: 'partner',
    datasourceIdentifier: 'partner_record_picker',
    buildApiRoot,
    readToken,
    probePicker: probePartnerRecordPicker,
    loadOptions: async (apiRoot, token, ensureIds) => {
      const rows = await loadPartnerRecordOptions(apiRoot, token, { ...hookOptions, ensureIds });
      return rows.map(({ id, label }) => ({ id, label }));
    },
  });
}
