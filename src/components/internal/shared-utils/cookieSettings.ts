const COOKIE_PREFIX = 'gs_';
const COOKIE_MAX_AGE = 31536000; 

function getParentDomain(): string | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }

  return null;
}

export function setCookie(key: string, value: string): void {
  if (typeof document === 'undefined') return;

  const parentDomain = getParentDomain();

  const domain = parentDomain ? `; domain=${parentDomain}` : '';
  const cookie = `${COOKIE_PREFIX}${key}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${domain}`;
  document.cookie = cookie;
}

export function getCookie(key: string): string | null {
  if (typeof document === 'undefined') return null;

  const name = `${COOKIE_PREFIX}${key}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      try {
        const value = decodeURIComponent(cookie.substring(name.length));

        if (typeof value === 'string' && value.length > 0) {
          return value;
        }
      } catch (e) {

        console.warn(`Failed to decode cookie value for key "${key}":`, e);
        return null;
      }
    }
  }

  return null;
}

export function removeCookie(key: string): void {
  if (typeof document === 'undefined') return;

  const parentDomain = getParentDomain();
  const domain = parentDomain ? `; domain=${parentDomain}` : '';
  document.cookie = `${COOKIE_PREFIX}${key}=; path=/; max-age=0${domain}`;
}

export function setTheme(theme: string): void {

  if (typeof theme !== 'string' || (theme !== 'light' && theme !== 'dark')) {
    console.warn('Invalid theme value:', theme, 'falling back to light');
    theme = 'light';
  }

  setCookie('theme', theme);

  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
}

export function getTheme(): string {
  const cookieTheme = getCookie('theme');

  if (cookieTheme && (cookieTheme === 'light' || cookieTheme === 'dark')) {
    return cookieTheme;
  }

  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    if (document.documentElement.classList.contains('light')) return 'light';
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }

  return 'light';
}

export function setLanguage(language: string): void {
  setCookie('lang', language);
}

export function getLanguage(): string {

  const cookieLang = getCookie('lang');
  if (cookieLang && (cookieLang === 'zh' || cookieLang === 'en')) {
    return cookieLang;
  }

  return 'zh';
}

export function setTimeZone(timeZone: string): void {
  setCookie('tz', timeZone);
}

export function getTimeZone(): string {
  const cookieTz = getCookie('tz');
  if (cookieTz) return cookieTz;

  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return systemTz || 'Asia/Shanghai';
    }
  } catch {

  }

  return 'Asia/Shanghai';
}

export function setSpaceId(spaceId: string | null): void {
  if (spaceId) {
    setCookie('space', spaceId);
  } else {
    removeCookie('space');
    removeCookie('team');
  }
}

export function getSpaceId(): string | null {
  return getCookie('space');
}

export function initializeSettings(
  onThemeChange?: (theme: string) => void,
  onLanguageChange?: (language: string) => void,
  onTimeZoneChange?: (timeZone: string) => void,
  onSpaceIdChange?: (spaceId: string | null) => void
): void {
  const theme = getTheme();
  const language = getLanguage();
  const timeZone = getTimeZone();
  const spaceId = getSpaceId();

  if (theme && (theme === 'light' || theme === 'dark')) {
    if (onThemeChange) {
      onThemeChange(theme);
    } else if (typeof document !== 'undefined') {

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  } else {

    const defaultTheme = 'light';
    if (onThemeChange) {
      onThemeChange(defaultTheme);
    } else if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(defaultTheme);
    }
  }

  if (language && onLanguageChange) {
    onLanguageChange(language);
  }

  if (timeZone && onTimeZoneChange) {
    onTimeZoneChange(timeZone);
  }

  if (onSpaceIdChange) {
    onSpaceIdChange(spaceId);
  }
}
