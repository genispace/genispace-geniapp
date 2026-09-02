export * from './types';
export * from './slugify';
export {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplateById,
  searchTemplates,
  getAllCategories,
  createWorkbenchConfigFromTemplate,
  clearTemplateCache,
  setDefaultTemplateLanguage,
  normalizeTemplateLanguage,
} from './templateRegistry';
