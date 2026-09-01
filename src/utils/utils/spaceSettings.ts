export const GENISPACE_APP_IDS = [
  'workbench',
  'console',
  'hub',
  'chat',
  'shell',
  'admin',
  'ebook',
  'partner',
] as const;

export type GenispaceAppId = (typeof GENISPACE_APP_IDS)[number];

export type SpaceWatermarkApps = Record<GenispaceAppId, boolean>;

export interface SpaceSettings {
  watermark: {
    apps: SpaceWatermarkApps;
  };
}

const DEFAULT_WATERMARK_APPS: SpaceWatermarkApps = {
  workbench: false,
  console: false,
  hub: false,
  chat: false,
  shell: false,
  admin: false,
  ebook: false,
  partner: false,
};

export const DEFAULT_SPACE_SETTINGS: SpaceSettings = {
  watermark: {
    apps: { ...DEFAULT_WATERMARK_APPS },
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeSettings(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    const patchVal = patch[key];
    const baseVal = base[key];
    if (isPlainObject(patchVal) && isPlainObject(baseVal)) {
      result[key] = deepMergeSettings(baseVal, patchVal);
    } else {
      result[key] = patchVal;
    }
  }
  return result;
}

export function normalizeSpaceSettings(raw?: unknown): SpaceSettings {
  const merged = deepMergeSettings(
    structuredClone(DEFAULT_SPACE_SETTINGS) as unknown as Record<string, unknown>,
    isPlainObject(raw) ? raw : {},
  );

  const apps = { ...DEFAULT_WATERMARK_APPS };
  const watermark = merged.watermark;
  if (isPlainObject(watermark) && isPlainObject(watermark.apps)) {
    for (const id of GENISPACE_APP_IDS) {
      if (typeof watermark.apps[id] === 'boolean') {
        apps[id] = watermark.apps[id];
      }
    }
  }

  return {
    ...merged,
    watermark: {
      ...(isPlainObject(watermark) ? watermark : {}),
      apps,
    },
  } as SpaceSettings;
}

export function isSpaceWatermarkEnabled(
  appId: GenispaceAppId,
  settings?: unknown,
): boolean {
  return normalizeSpaceSettings(settings).watermark.apps[appId] === true;
}

export function readStoredUserPhone(): string | null {
  try {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    const user = JSON.parse(storedUser) as Record<string, unknown>;
    const phone = user.phone ?? user.phoneNumber;
    if (typeof phone === 'string' && phone.trim()) {
      return phone.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export interface WatermarkLabelInput {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  spaceName?: string | null;
}

/** Build watermark text: `{identifier}@{spaceName}` (name → phone → email local-part). */
export function buildWatermarkLabel(input: WatermarkLabelInput): string | null {
  const spaceName = input.spaceName?.trim();
  if (!spaceName) return null;

  const name = input.name?.trim();
  if (name) return `${name}@${spaceName}`;

  const phone = input.phone?.trim();
  if (phone) return `${phone}@${spaceName}`;

  const email = input.email?.trim();
  if (email) {
    const localPart = email.includes('@') ? email.split('@')[0] : email;
    if (localPart) return `${localPart}@${spaceName}`;
  }

  return null;
}
