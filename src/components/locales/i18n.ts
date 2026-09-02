import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import type { Namespace } from './types';
import { getCookie, setLanguage } from '@genispace/shared-utils';

/** Matches language folder names under public/locales; avoids wrong language on first paint if LanguageDetector misses query */
const SUPPORTED_APP_LANGS = ['en', 'zh'] as const;
type SupportedAppLang = (typeof SUPPORTED_APP_LANGS)[number];

export function readSupportedAppLngFromSearch(search: string): SupportedAppLang | undefined {
  const q = new URLSearchParams(search).get('lng');
  if (q === 'en' || q === 'zh') return q;
  return undefined;
}

if (typeof window !== 'undefined') {
  const cookieLang = getCookie('lang');
  // Seed from cookie only when the user has no saved UI language; avoids cookie overwriting i18nextLng in localStorage on every refresh/new tab
  if (
    cookieLang &&
    (cookieLang === 'zh' || cookieLang === 'en') &&
    !localStorage.getItem('i18nextLng')
  ) {
    localStorage.setItem('i18nextLng', cookieLang);
  }
}

export const ALL_NAMESPACES: Namespace[] = [
  'common',
  'workbench',
  'editor',
  'editMode',
  'workbenchApi',
  'spaceSwitchSuccess',
  'spaceContext',
  'permissions',
  'form',
  'task',
  'execution',
  'file',
  'apiKey',
  'configMap',
  'renderers',
];

export const INITIAL_NS: readonly Namespace[] = ['common', 'workbench'];

const lngFromUrlOnBoot =
  typeof window !== 'undefined' ? readSupportedAppLngFromSearch(window.location.search) : undefined;

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // First paint follows ?lng= in the URL (avoids detector + http-backend sometimes sticking to zh from localStorage)
    ...(lngFromUrlOnBoot ? { lng: lngFromUrlOnBoot } : {}),
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_APP_LANGS],
    nonExplicitSupportedLngs: true,
    ns: [...INITIAL_NS],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Prefer ?lng=: opening /help/...?lng= in a new tab matches the workbench language
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    backend: {
      loadPath: (lng: string, ns: string) => {
        return `/locales/${lng}/${ns}.json`;
      },
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  localStorage.setItem('i18nextLng', lng);
  setLanguage(lng);
});

export default i18n;
