export enum TemplateCategory {
  EDUCATION = 'education',      
  RECRUITING = 'recruiting',   
  LOGISTICS = 'logistics',      
  FINANCE = 'finance',         
  RETAIL = 'retail',           
  HEALTHCARE = 'healthcare',   
  REAL_ESTATE = 'real-estate', 
  RESTAURANT = 'restaurant',   
  MANUFACTURING = 'manufacturing', 
  GENERAL = 'general'          
}

export interface LocalizedText {
  en: string;
  zh: string;
}

export interface TemplateMetadata {
  id: string;
  name: LocalizedText | string; 
  description: LocalizedText | string; 
  category: TemplateCategory;
  icon?: string;
  previewImage?: string;
  tags?: LocalizedText[] | string[]; 
  version?: string;
  author?: string;
}

export function getLocalizedText(text: LocalizedText | string, lang: string = 'zh'): string {
  if (typeof text === 'string') {
    return text; 
  }
  return text[lang as keyof LocalizedText] || text.en || text.zh;
}

export function getLocalizedTags(tags: (LocalizedText | string)[] | undefined, lang: string = 'zh'): string[] {
  if (!tags) return [];
  return tags.map(tag => getLocalizedText(tag, lang));
}

export interface Template {
  metadata: TemplateMetadata;
  mockData: {
    appConfig: any;
    pages: Record<string, any>;
  };
  lang?: string; 
}

export interface TemplateRegistryItem {
  metadata: TemplateMetadata;
  mockDataPath: string;
  loadMockData: () => Promise<any>;
}
