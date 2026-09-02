import { getConfig } from '@/lib/config';

// APP_URL is the Hub/platform base; CONSOLE_URL is the management console base.
export function getAppBaseUrl(): string {
  return getConfig().APP_URL?.replace(/\/$/, '') || '';
}

export function getConsoleBaseUrl(): string {
  return getConfig().CONSOLE_URL?.replace(/\/$/, '') || '';
}

export function redirectToAppHome(): void {
  // Post-logout / fallback home is the Hub (owns sign-in and landing).
  const appUrl = getAppBaseUrl();
  window.location.replace(appUrl || '/');
}

export function redirectToApplications(): void {
  // Application management lives in the Console (Hub's /console mount).
  const consoleUrl = getConsoleBaseUrl();
  window.location.replace(consoleUrl ? `${consoleUrl}/applications` : '/');
}
