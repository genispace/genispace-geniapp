const MOBILE_UA_PATTERNS = [
  /MicroMessenger/i,
  /WeChat/i,
  /WXWork/i,
  /Windows Phone/i,
  /Android/i,
  /iPhone/i,
  /iPad/i,
  /Mobile Safari/i,
  /Touch/i,
];

export function isMobileUserAgent(userAgent = navigator.userAgent): boolean {
  return MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
