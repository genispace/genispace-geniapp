import { describe, expect, it } from 'vitest';
import defaultI18n from '../locales/i18n';
import {
  createGeniAppI18n,
  normalizeGeniAppLocale,
  seedDefaultI18nWithBundledResources,
  syncDefaultI18nLanguage,
} from './i18n';

// Task #187: exported apps serve no /locales endpoint, so the global default i18n instance's
// http-backend fails there and default-instance t() callers (plain i18n.t in renderers) fell
// back to English defaultValues. The bundled-resource seed below is the fix.
describe('geniapp runtime i18n', () => {
  it('seeds the global default instance with bundled resources', () => {
    seedDefaultI18nWithBundledResources();
    expect(defaultI18n.t('renderers:chart.tap_drill', { lng: 'zh' })).toBe('点击下钻 →');
    expect(defaultI18n.t('renderers:chart.tap_drill', { lng: 'en' })).toBe('Tap to drill →');
  });

  it('syncs the default instance language with the app locale', async () => {
    await syncDefaultI18nLanguage('zh');
    expect(defaultI18n.language).toBe('zh');
    expect(defaultI18n.t('renderers:chart.tap_drill')).toBe('点击下钻 →');
    await syncDefaultI18nLanguage('en');
    expect(defaultI18n.language).toBe('en');
    expect(defaultI18n.t('renderers:chart.tap_drill')).toBe('Tap to drill →');
  });

  it('normalizeGeniAppLocale maps zh prefixes to zh and everything else to en', () => {
    expect(normalizeGeniAppLocale('zh-CN')).toBe('zh');
    expect(normalizeGeniAppLocale('zh')).toBe('zh');
    expect(normalizeGeniAppLocale('en-US')).toBe('en');
    expect(normalizeGeniAppLocale(undefined)).toBe('en');
  });

  it('createGeniAppI18n resolves bundled resources without a backend', () => {
    const instance = createGeniAppI18n('zh');
    expect(instance.language).toBe('zh');
    expect(instance.t('renderers:chart.tap_drill')).toBe('点击下钻 →');
  });
});
