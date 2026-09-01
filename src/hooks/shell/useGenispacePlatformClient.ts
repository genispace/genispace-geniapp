import { useEffect, useMemo, useState } from 'react';
import GeniSpace from 'genispace';
import { GENISPACE_SHELL_INIT_APPLIED_EVENT } from './shell';

function readAccessToken(): string {
  try {
    return localStorage.getItem('token') ?? '';
  } catch {
    return '';
  }
}

/**
 * Platform GeniSpace client for `/teams/members`, `/users/profiles/batch`, etc.
 * Rebuilds when Shell posts GENISPACE_SHELL_INIT (API base + token).
 */
export function useGenispacePlatformClient(getApiRoot: () => string): GeniSpace {
  const [shellRevision, setShellRevision] = useState(0);

  useEffect(() => {
    const onShellInit = () => setShellRevision((n) => n + 1);
    window.addEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onShellInit);
    return () => window.removeEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onShellInit);
  }, []);

  return useMemo(() => {
    const token = readAccessToken();
    const baseURL = getApiRoot().replace(/\/$/, '');
    const client = new GeniSpace({
      baseURL,
      apiKey: token,
      accessToken: token || undefined,
    });
    return client;
  }, [shellRevision, getApiRoot]);
}
