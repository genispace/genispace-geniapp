import type { PropsWithChildren, ReactNode } from 'react';

export type ViewModePermissions = {
  canEdit: false;
  canManage: false;
  canView: true;
};

const permissions: ViewModePermissions = {
  canEdit: false,
  canManage: false,
  canView: true,
};

/**
 * Public GeniApps always execute the published/view branch of Workbench
 * renderers. The Workbench editor continues to provide its own edit context.
 */
export const useEditMode = () => ({
  isEditMode: false as const,
  permissions,
  permissionsLoading: false,
  permissionsError: undefined,
  draggedComponentType: null as string | null,
  isAddingComponent: false,
  previewOnly: false,
  currentWorkbench: null as any,
  openComponentEditor: () => undefined,
  refreshComponent: () => undefined,
  updatePageConfig: async () => undefined,
  deletePage: async () => undefined,
});

export function EditModeProvider({ children }: PropsWithChildren): ReactNode {
  return children;
}
