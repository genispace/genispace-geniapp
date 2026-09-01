export type PartnerFields = {
  partner_id?: string | null;
  partner_name?: string | null;
};

function normalizePartnerId(partnerId: string | null | undefined): string | null {
  if (partnerId == null || partnerId === '') return null;
  return partnerId;
}

/** Weak-dependency save: persist FK only when partner picker is available. */
export function applyPartnerPayload<T extends PartnerFields>(
  payload: T,
  pickerAvailable: boolean,
  pickerLoading = false,
  pickerLoadError: string | null = null,
): T {
  if (pickerLoading || pickerLoadError != null) return { ...payload };

  const next = { ...payload };

  if (pickerAvailable) {
    next.partner_id = normalizePartnerId(next.partner_id);
    if (next.partner_id == null) {
      next.partner_id = null;
      next.partner_name = null;
    }
    return next;
  }

  // Picker unavailable: preserve server FK — do not write partner_id.
  delete next.partner_id;
  if (next.partner_name === '') next.partner_name = null;
  return next;
}
