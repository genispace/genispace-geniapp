import i18n from '@/locales/i18n';
import {
  getAllTemplates as getAllTemplatesCore,
  getTemplatesByCategory as getTemplatesByCategoryCore,
  getTemplateById as getTemplateByIdCore,
  searchTemplates as searchTemplatesCore,
  getAllCategories,
  createWorkbenchConfigFromTemplate as createWorkbenchConfigFromTemplateCore,
  clearTemplateCache,
  setDefaultTemplateLanguage,
  TemplateCategory,
} from '@genispace/workbench-templates';

export * from '@genispace/workbench-templates';

function currentLang(): string {
  return i18n.language || 'zh';
}

export function getAllTemplates() {
  return getAllTemplatesCore(currentLang());
}

export function getTemplatesByCategory(category: TemplateCategory) {
  return getTemplatesByCategoryCore(category, currentLang());
}

export function getTemplateById(id: string) {
  return getTemplateByIdCore(id, currentLang());
}

export function searchTemplates(keyword: string) {
  return searchTemplatesCore(keyword, currentLang());
}

export function createWorkbenchConfigFromTemplate(templateId: string, customName?: string) {
  return createWorkbenchConfigFromTemplateCore(templateId, customName, currentLang());
}

export { getAllCategories, clearTemplateCache, setDefaultTemplateLanguage };

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', () => {
    clearTemplateCache();
  });
}
