import type { SpaceModel } from '@genispace/shared-ui';
import { getSpaceId } from '@genispace/shared-utils';
import {
  fetchUserCurrentSpaceIdStrict,
  waitForUserSpaceId,
} from '@/mobile/utils/fetchUserCurrentSpaceId';

export type MobileWorkbenchSpaceSyncResult =
  | { action: 'proceed' }
  | { action: 'pending' }
  | { action: 'switch'; targetSpaceId: string }
  | { action: 'denied' };

export interface MobileWorkbenchSpaceSyncInput {
  workbenchSpaceId: string;
  serverSpaceId?: string | null;
  currentSpaceId?: string | null;
  persistedSpaceId?: string | null;
  userSpaceIds: string[];
  isDemoWorkbench: boolean;
  alreadyAttemptedSwitch: boolean;
  /** When false, mismatched space may still be valid once the list loads. */
  spacesReady?: boolean;
}

export type AlignMobileWorkbenchSpaceResult =
  | { status: 'aligned' }
  | { status: 'pending' }
  | { status: 'switched' }
  | { status: 'denied' }
  | { status: 'switch_failed' };

export interface AlignMobileWorkbenchSpaceParams {
  workbenchId: string;
  workbenchSpaceId: string;
  currentSpaceId: string | null | undefined;
  spaces: SpaceModel[];
  spacesReady?: boolean;
  isDemoWorkbench: boolean;
  switchSpace: (space: SpaceModel, options?: { skipNavigation?: boolean }) => Promise<void>;
  fetchUserCurrentSpaceId?: () => Promise<string | null>;
}

const attemptedWorkbenchIds = new Set<string>();

/** Server settings first, then cookie, then React context. */
export function resolveEffectiveCurrentSpaceId(input: {
  serverSpaceId?: string | null;
  persistedSpaceId?: string | null;
  currentSpaceId?: string | null;
}): string | null | undefined {
  return input.serverSpaceId ?? input.persistedSpaceId ?? input.currentSpaceId;
}

export function markMobileWorkbenchSpaceSyncAttempted(workbenchId: string): void {
  attemptedWorkbenchIds.add(workbenchId);
}

export function hasMobileWorkbenchSpaceSyncAttempted(workbenchId: string): boolean {
  return attemptedWorkbenchIds.has(workbenchId);
}

export function clearMobileWorkbenchSpaceSyncAttempts(workbenchId?: string): void {
  if (workbenchId) {
    attemptedWorkbenchIds.delete(workbenchId);
    return;
  }
  attemptedWorkbenchIds.clear();
}

/**
 * Decide whether mobile workbench entry should proceed, switch space, or deny access.
 */
export function resolveMobileWorkbenchSpaceSync(
  input: MobileWorkbenchSpaceSyncInput
): MobileWorkbenchSpaceSyncResult {
  if (input.isDemoWorkbench) {
    return { action: 'proceed' };
  }

  const effectiveCurrentSpaceId = resolveEffectiveCurrentSpaceId(input);

  if (!effectiveCurrentSpaceId) {
    return { action: 'proceed' };
  }

  if (input.workbenchSpaceId === effectiveCurrentSpaceId) {
    return { action: 'proceed' };
  }

  if (!input.userSpaceIds.includes(input.workbenchSpaceId)) {
    if (input.spacesReady === false) {
      return { action: 'pending' };
    }
    return { action: 'denied' };
  }

  if (input.alreadyAttemptedSwitch) {
    return { action: 'denied' };
  }

  return { action: 'switch', targetSpaceId: input.workbenchSpaceId };
}

async function verifyStrictWorkbenchSpace(
  workbenchSpaceId: string,
  fetchStrict: () => Promise<string | null>
): Promise<AlignMobileWorkbenchSpaceResult | null> {
  const strictSpaceId = await fetchStrict();
  if (!strictSpaceId) {
    return { status: 'pending' };
  }

  if (strictSpaceId === workbenchSpaceId) {
    return { status: 'aligned' };
  }

  return null;
}

async function syncClientToWorkbenchSpace(
  params: AlignMobileWorkbenchSpaceParams,
  fetchStrict: () => Promise<string | null>
): Promise<AlignMobileWorkbenchSpaceResult | null> {
  const clientSpaceId = params.currentSpaceId ?? getSpaceId();
  if (clientSpaceId === params.workbenchSpaceId) {
    return null;
  }

  const targetSpace = params.spaces.find((space) => space.id === params.workbenchSpaceId);
  if (!targetSpace) {
    return { status: 'denied' };
  }

  try {
    await params.switchSpace(targetSpace, { skipNavigation: true });

    const verified = await waitForUserSpaceId(params.workbenchSpaceId, {
      fetchUserCurrentSpaceId: fetchStrict,
    });
    if (!verified) {
      return { status: 'switch_failed' };
    }

    return { status: 'switched' };
  } catch {
    return { status: 'switch_failed' };
  }
}

async function finalizeStrictAlignment(
  params: AlignMobileWorkbenchSpaceParams,
  fetchStrict: () => Promise<string | null>
): Promise<AlignMobileWorkbenchSpaceResult | null> {
  const verified = await verifyStrictWorkbenchSpace(params.workbenchSpaceId, fetchStrict);
  if (!verified) {
    return null;
  }

  if (verified.status === 'pending') {
    return verified;
  }

  const clientSync = await syncClientToWorkbenchSpace(params, fetchStrict);
  if (clientSync) {
    return clientSync;
  }

  return verified;
}

export async function alignMobileWorkbenchSpace(
  params: AlignMobileWorkbenchSpaceParams
): Promise<AlignMobileWorkbenchSpaceResult> {
  const fetchStrict = params.fetchUserCurrentSpaceId ?? fetchUserCurrentSpaceIdStrict;

  const resolveSync = (serverSpaceId: string | null | undefined) =>
    resolveMobileWorkbenchSpaceSync({
      workbenchSpaceId: params.workbenchSpaceId,
      serverSpaceId,
      currentSpaceId: params.currentSpaceId,
      persistedSpaceId: getSpaceId(),
      userSpaceIds: params.spaces.map((space) => space.id),
      isDemoWorkbench: params.isDemoWorkbench,
      alreadyAttemptedSwitch: hasMobileWorkbenchSpaceSyncAttempted(params.workbenchId),
      spacesReady: params.spacesReady,
    });

  const attemptAlign = async (
    serverSpaceId: string | null | undefined,
    depth = 0
  ): Promise<AlignMobileWorkbenchSpaceResult> => {
    const syncResult = resolveSync(serverSpaceId);

    if (syncResult.action === 'pending') {
      return { status: 'pending' };
    }

    if (syncResult.action === 'denied') {
      return { status: 'denied' };
    }

    if (syncResult.action === 'proceed') {
      const finalized = await finalizeStrictAlignment(params, fetchStrict);
      if (finalized) {
        return finalized;
      }

      const strictSpaceId = await fetchStrict();
      if (!strictSpaceId) {
        return { status: 'pending' };
      }

      return attemptAlign(strictSpaceId, depth + 1);
    }

    const targetSpace = params.spaces.find((space) => space.id === syncResult.targetSpaceId);
    if (!targetSpace) {
      return { status: 'denied' };
    }

    markMobileWorkbenchSpaceSyncAttempted(params.workbenchId);
    try {
      await params.switchSpace(targetSpace, { skipNavigation: true });

      const verified = await waitForUserSpaceId(params.workbenchSpaceId, {
        fetchUserCurrentSpaceId: fetchStrict,
      });
      if (!verified) {
        clearMobileWorkbenchSpaceSyncAttempts(params.workbenchId);
        return { status: 'switch_failed' };
      }

      return { status: 'switched' };
    } catch {
      clearMobileWorkbenchSpaceSyncAttempts(params.workbenchId);
      return { status: 'switch_failed' };
    }
  };

  const initialServerSpaceId = await fetchStrict();
  return attemptAlign(initialServerSpaceId);
}
