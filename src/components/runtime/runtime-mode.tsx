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

/**
 * GeniApps execute the immutable published/view branch of the renderer. These
 * compatibility surfaces let the exact Workbench renderer source compile
 * without bundling editor state, drag-and-drop, or authoring controls.
 */
export function ComponentEditOverlay({
  children,
}: PropsWithChildren<Record<string, unknown>>): ReactNode {
  return children;
}

export function ContainerDropZoneOverlay(_props: Record<string, unknown>): null {
  return null;
}

export function WorkbenchEditMode({
  children,
}: PropsWithChildren<Record<string, unknown>>): ReactNode {
  return children;
}

export function Grid24EditableCanvas(_props: Record<string, unknown>): null {
  return null;
}

export function MobileFlowCanvas(_props: Record<string, unknown>): null {
  return null;
}

export const useGridCanvasGate = (): false => false;
export const useStudioPreview = () => ({ previewOnly: false as const });
