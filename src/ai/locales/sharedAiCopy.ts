import en from './en.json';
import zh from './zh.json';

export type SharedAiLanguage = 'en' | 'zh';
export type SharedAiCopy = typeof en;

/** English is the deterministic fallback; Chinese is used only after an explicit locale switch. */
export function sharedAiCopy(language: SharedAiLanguage): SharedAiCopy {
  return language === 'zh' ? zh : en;
}
