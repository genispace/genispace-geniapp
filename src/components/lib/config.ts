import type { ReleaseEdition } from './config/deployment';

interface AppConfig {
  RELEASE_EDITION?: ReleaseEdition;
  API_BASE_URL: string;
  WEBSITE_URL: string;
  APP_TITLE: string;
  APP_DESCRIPTION: string;
  /** Hub / platform base (login / account / identity), e.g. https://www.genispace.ai */
  APP_URL?: string;
  /** Console (management) base, e.g. https://www.genispace.ai/console */
  CONSOLE_URL?: string;
  CHAT_URL?: string;
  WORKBENCH_URL?: string;
  PARTNER_URL?: string;
  /** App Shell origin for built-in GeniApp shortcuts in the header */
  SHELL_URL?: string;
  BRAND_CHANNEL?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
    __CONFIG_LOADED__?: boolean;
    onConfigReady?: (callback: () => void) => void;
  }
}

export const isConfigLoaded = (): boolean => {
  return window.__CONFIG_LOADED__ === true;
};

export const waitForConfig = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isConfigLoaded()) {
      resolve();
    } else if (window.onConfigReady) {
      window.onConfigReady(() => resolve());
    } else {

      console.warn('onConfigReady not available, resolving immediately');
      resolve();
    }
  });
};

const getApiBaseUrl = (): string => {

  if (window.__APP_CONFIG__?.API_BASE_URL) {
    return window.__APP_CONFIG__.API_BASE_URL;
  }

  if (!isConfigLoaded()) {
    console.warn('Config not loaded yet, using default API_BASE_URL. This might cause issues.');
  }

  return 'https://api.genispace.ai';
};

const getWebUrl = (): string => {
  if (window.__APP_CONFIG__?.WEBSITE_URL) {
    return window.__APP_CONFIG__.WEBSITE_URL;
  }
  return 'https://www.genispace.com';
};

const getAppUrl = (): string => {
  if (window.__APP_CONFIG__?.APP_URL) {
    return window.__APP_CONFIG__.APP_URL;
  }
  return 'https://www.genispace.ai';
};

const getConsoleUrl = (): string => {
  const raw = window.__APP_CONFIG__?.CONSOLE_URL;
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.replace(/\/$/, '');
  }
  return '';
};

const getChatUrl = (): string => {
  if (window.__APP_CONFIG__?.CHAT_URL) {
    return window.__APP_CONFIG__.CHAT_URL;
  }
  return 'https://chat.genispace.ai';
};

const getWorkbenchUrl = (): string => {
  if (window.__APP_CONFIG__?.WORKBENCH_URL) {
    return window.__APP_CONFIG__.WORKBENCH_URL;
  }
  return window.location.origin;
};

const getPartnerUrl = (): string => {
  if (window.__APP_CONFIG__?.PARTNER_URL) {
    return window.__APP_CONFIG__.PARTNER_URL;
  }
  return 'https://partner.genispace.ai';
};

const getBrandChannel = (): string | undefined => {
  return window.__APP_CONFIG__?.BRAND_CHANNEL;
};

const getShellUrl = (): string => {
  const raw = window.__APP_CONFIG__?.SHELL_URL;
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.replace(/\/$/, '');
  }
  return '';
};

const getAppTitle = (): string => {

  if (window.__APP_CONFIG__?.APP_TITLE) {
    return window.__APP_CONFIG__.APP_TITLE;
  }

  return 'GeniSpace: Artificial Intelligence Platform';
};

const getAppDescription = (): string => {

  if (window.__APP_CONFIG__?.APP_DESCRIPTION) {
    return window.__APP_CONFIG__.APP_DESCRIPTION;
  }

  return 'Build and manage AI agents, workflows, applications and knowledge bases in one unified workspace.';
};

export const API_BASE_URL = getApiBaseUrl();
export const APP_TITLE = getAppTitle();
export const APP_DESCRIPTION = getAppDescription();

export const getConfig = () => ({
  API_BASE_URL: getApiBaseUrl(),
  WEBSITE_URL: getWebUrl(),
  APP_TITLE: getAppTitle(),
  APP_DESCRIPTION: getAppDescription(),
  APP_URL: getAppUrl(),
  CONSOLE_URL: getConsoleUrl(),
  CHAT_URL: getChatUrl(),
  WORKBENCH_URL: getWorkbenchUrl(),
  PARTNER_URL: getPartnerUrl(),
  SHELL_URL: getShellUrl(),
  BRAND_CHANNEL: getBrandChannel(),
});

export type { AppConfig };
