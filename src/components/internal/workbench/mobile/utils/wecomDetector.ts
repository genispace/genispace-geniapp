declare global {
  interface Window {
    __WECOM_DEVICE__?: string;
    WxWork?: { jsENV?: unknown };
  }
}

export function isWeComEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return Boolean(window.__WECOM_DEVICE__) || Boolean(window.WxWork);
}
