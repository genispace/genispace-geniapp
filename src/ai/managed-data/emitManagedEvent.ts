export type EmittedEventEnvelope = {
  id: string;
  status: string;
  eventName: string;
  [k: string]: unknown;
};

/**
 * Emit a Space-level event from a GeniApp. The app's installed events.json must
 * declare the event; the payload is validated server-side against its schema.
 */
export async function emitManagedEvent(
  apiRoot: string,
  accessToken: string | null,
  geniappIdentifier: string,
  eventName: string,
  payload: Record<string, unknown>,
  opts?: { idempotencyKey?: string }
): Promise<EmittedEventEnvelope> {
  if (!apiRoot?.trim()) {
    throw new Error('API root is not configured.');
  }
  if (!accessToken?.trim()) {
    throw new Error('Authentication required to emit event.');
  }

  const body: Record<string, unknown> = {
    appIdentifier: geniappIdentifier,
    event: eventName,
    payload,
  };
  if (opts?.idempotencyKey) {
    body.idempotencyKey = opts.idempotencyKey;
  }

  const baseURL = apiRoot.replace(/\/$/, '');
  const res = await fetch(`${baseURL}/events/emit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: { success?: boolean; data?: EmittedEventEnvelope; message?: string } = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new Error(text || `Event emit failed (${res.status})`);
    }
  }

  if (!res.ok) {
    const msg = parsed.message || text || `Event emit failed (${res.status})`;
    throw new Error(msg);
  }

  return parsed.data ?? ({} as EmittedEventEnvelope);
}

export type ManagedEventClient = (
  eventName: string,
  payload: Record<string, unknown>,
  opts?: { idempotencyKey?: string }
) => Promise<EmittedEventEnvelope>;

/** Factory for per-app event emitters. */
export function createManagedEventClient(
  geniappIdentifier: string,
  resolveApiRoot: () => string,
  resolveAccessToken: () => string | null = () => {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }
): ManagedEventClient {
  return (eventName, payload, opts) =>
    emitManagedEvent(
      resolveApiRoot(),
      resolveAccessToken(),
      geniappIdentifier,
      eventName,
      payload,
      opts
    );
}
