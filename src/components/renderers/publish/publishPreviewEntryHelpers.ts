/**
 * Pure state helpers for PublishPreviewEntryRenderer — kept free of
 * React/i18n/api imports so the status state machine can be unit-tested in
 * isolation.
 *
 * The component self-sources its data from `GET /workbenches/:id` (default
 * published view), which returns `hasUnpublishedChanges` plus a
 * `permissions: { canView, canEdit, canManage }` block.
 */

export interface PublishPreviewPermissions {
  canView?: boolean;
  canEdit?: boolean;
  canManage?: boolean;
}

/** The subset of the `GET /workbenches/:id` payload this component reads. */
export interface WorkbenchPublishStatus {
  hasUnpublishedChanges?: boolean;
  permissions?: PublishPreviewPermissions;
}

export type PublishPreviewEntryStatus =
  | 'loading'
  | 'error'
  | 'no-changes'
  | 'can-preview'
  | 'no-permission';

export type PublishPreviewEntryMode = 'preview' | 'edit' | null;

/**
 * Mode overrides the three-state display: while previewing (a preview token
 * exists for this tab) or editing, the "Enter preview" button makes no sense,
 * so the card shows a fixed mode note instead. Preview wins over edit when
 * both flags are somehow set — being inside a preview is the more specific
 * state, and it matches resolveConfigView's token-first order.
 */
export function resolveEntryMode(input: {
  isPreviewMode: boolean;
  isEditMode: boolean;
}): PublishPreviewEntryMode {
  if (input.isPreviewMode) return 'preview';
  if (input.isEditMode) return 'edit';
  return null;
}

/** i18n key (renderers.json publish_preview_entry.*) for the fixed mode note. */
export function entryModeNoteKey(mode: PublishPreviewEntryMode): 'mode_preview' | 'mode_edit' | null {
  if (mode === 'preview') return 'mode_preview';
  if (mode === 'edit') return 'mode_edit';
  return null;
}

/** Write access for preview-token creation: edit or manage on the workbench. */
export function canWriteWorkbench(permissions?: PublishPreviewPermissions | null): boolean {
  return Boolean(permissions && (permissions.canEdit || permissions.canManage));
}

/**
 * Resolve the card's display state. Loading and error dominate; without
 * unpublished changes the entry is informational only; otherwise the button
 * shows only for users who can create a preview token (write permission).
 */
export function resolvePublishPreviewEntryStatus(input: {
  loading: boolean;
  error: string | null;
  workbench?: WorkbenchPublishStatus | null;
}): PublishPreviewEntryStatus {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (!input.workbench?.hasUnpublishedChanges) return 'no-changes';
  return canWriteWorkbench(input.workbench.permissions) ? 'can-preview' : 'no-permission';
}

/** Preview entry URL — navigating here puts the whole current page into preview mode. */
export function buildWorkbenchPreviewUrl(origin: string, workbenchId: string, token: string): string {
  return `${origin}/${workbenchId}?preview=${token}`;
}

/** Pull the token out of `createWorkbenchPreviewToken`'s ApiResponse, or null. */
export function extractPreviewToken(response: unknown): string | null {
  const data = (response as { data?: { token?: unknown } } | null)?.data;
  return typeof data?.token === 'string' && data.token !== '' ? data.token : null;
}
