import { Template, TemplateCategory, TemplateMetadata, LocalizedText, getLocalizedText, getLocalizedTags } from './types';

import educationPlanningZh from './templates/zh/education/education-planning.json';
import recruitingZh from './templates/zh/recruiting/recruiting.json';
import logisticsDashboardZh from './templates/zh/logistics/logistics-dashboard.json';
import invoiceRecognitionZh from './templates/zh/finance/invoice-recognition.json';
import reconciliationZh from './templates/zh/finance/reconciliation.json';
import ecommerceZh from './templates/zh/retail/ecommerce.json';
import hospitalZh from './templates/zh/healthcare/hospital.json';
import propertyManagementZh from './templates/zh/real-estate/property-management.json';
import restaurantManagementZh from './templates/zh/restaurant/restaurant-management.json';
import productionManagementZh from './templates/zh/manufacturing/production-management.json';
import exampleZh from './templates/zh/general/example.json';
import radarChartZh from './templates/zh/general/radar-chart.json';

import educationPlanningEn from './templates/en/education/education-planning.json';
import recruitingEn from './templates/en/recruiting/recruiting.json';
import logisticsDashboardEn from './templates/en/logistics/logistics-dashboard.json';
import invoiceRecognitionEn from './templates/en/finance/invoice-recognition.json';
import reconciliationEn from './templates/en/finance/reconciliation.json';
import ecommerceEn from './templates/en/retail/ecommerce.json';
import hospitalEn from './templates/en/healthcare/hospital.json';
import propertyManagementEn from './templates/en/real-estate/property-management.json';
import restaurantManagementEn from './templates/en/restaurant/restaurant-management.json';
import productionManagementEn from './templates/en/manufacturing/production-management.json';
import exampleEn from './templates/en/general/example.json';
import radarChartEn from './templates/en/general/radar-chart.json';

const templateDataMap: Record<string, { zh: any; en: any }> = {
  'education/education-planning.json': { zh: educationPlanningZh, en: educationPlanningEn },
  'recruiting/recruiting.json': { zh: recruitingZh, en: recruitingEn },
  'logistics/logistics-dashboard.json': { zh: logisticsDashboardZh, en: logisticsDashboardEn },
  'finance/invoice-recognition.json': { zh: invoiceRecognitionZh, en: invoiceRecognitionEn },
  'finance/reconciliation.json': { zh: reconciliationZh, en: reconciliationEn },
  'retail/ecommerce.json': { zh: ecommerceZh, en: ecommerceEn },
  'healthcare/hospital.json': { zh: hospitalZh, en: hospitalEn },
  'real-estate/property-management.json': { zh: propertyManagementZh, en: propertyManagementEn },
  'restaurant/restaurant-management.json': { zh: restaurantManagementZh, en: restaurantManagementEn },
  'manufacturing/production-management.json': { zh: productionManagementZh, en: productionManagementEn },
  'general/example.json': { zh: exampleZh, en: exampleEn },
  'general/radar-chart.json': { zh: radarChartZh, en: radarChartEn },
};

interface TemplateMetadataConfig {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: TemplateCategory;
  icon?: string;
  previewImage?: string;
  tags?: LocalizedText[];
  version?: string;
  author?: string;

  filePath: string; 
}

const templateConfigs: TemplateMetadataConfig[] = [
  {
    id: 'education-planning',
    name: { en: 'Education Planning Workbench', zh: '升学规划工作台' },
    description: { 
      en: 'Education industry workbench for student planning, including student management, report generation, and school major management',
      zh: '教育行业升学规划工作台，包含学生管理、报告生成、学校专业管理等功能'
    },
    category: TemplateCategory.EDUCATION,
    icon: 'GraduationCap',
    tags: [
      { en: 'Education', zh: '教育' },
      { en: 'Planning', zh: '升学规划' },
      { en: 'Student Management', zh: '学生管理' }
    ],
    version: '1.0.0',
    filePath: 'education/education-planning.json'
  },
  {
    id: 'recruiting',
    name: { en: 'Recruiting Workbench', zh: '猎头工作台' },
    description: { 
      en: 'Recruiting industry workbench, including candidate search, client management, job management, and report analysis',
      zh: '招聘行业工作台，包含候选人搜索、客户管理、职位管理、报表分析等功能'
    },
    category: TemplateCategory.RECRUITING,
    icon: 'Users',
    tags: [
      { en: 'Recruiting', zh: '招聘' },
      { en: 'Headhunting', zh: '猎头' },
      { en: 'HR', zh: 'HR' }
    ],
    version: '1.0.0',
    filePath: 'recruiting/recruiting.json'
  },
  {
    id: 'logistics-dashboard',
    name: { en: 'Logistics Analytics Dashboard', zh: '物流数据分析看板' },
    description: { 
      en: 'Logistics industry dashboard system, including pickup time analysis, B2B/B2C business statistics',
      zh: '物流行业看板系统，包含揽收时效分析、B2B/B2C业务统计等功能'
    },
    category: TemplateCategory.LOGISTICS,
    icon: 'Truck',
    tags: [
      { en: 'Logistics', zh: '物流' },
      { en: 'Dashboard', zh: '看板' },
      { en: 'Analytics', zh: '数据分析' }
    ],
    version: '1.0.0',
    filePath: 'logistics/logistics-dashboard.json'
  },
  {
    id: 'invoice-recognition',
    name: { en: 'Invoice Recognition System', zh: '发票识别系统' },
    description: { 
      en: 'Financial automation system supporting invoice recognition and structured data extraction',
      zh: '财务自动化处理系统，支持发票识别和结构化数据提取'
    },
    category: TemplateCategory.FINANCE,
    icon: 'FileText',
    tags: [
      { en: 'Finance', zh: '财务' },
      { en: 'Invoice', zh: '发票' },
      { en: 'OCR', zh: 'OCR' }
    ],
    version: '1.0.0',
    filePath: 'finance/invoice-recognition.json'
  },
  {
    id: 'reconciliation',
    name: { en: 'Financial Reconciliation System', zh: '财务智能对账系统' },
    description: { 
      en: 'Financial reconciliation system supporting automatic matching and variance analysis of bank journals and bank statements',
      zh: '财务智能对账系统，支持银行日记账和银行流水的自动匹配和差异分析'
    },
    category: TemplateCategory.FINANCE,
    icon: 'Calculator',
    tags: [
      { en: 'Finance', zh: '财务' },
      { en: 'Reconciliation', zh: '对账' },
      { en: 'Banking', zh: '银行' }
    ],
    version: '1.0.0',
    filePath: 'finance/reconciliation.json'
  },
  {
    id: 'example',
    name: { en: 'Example Workbench', zh: '示例工作台' },
    description: { 
      en: 'General example workbench demonstrating basic components and layout features',
      zh: '通用示例工作台，展示基本组件和布局功能'
    },
    category: TemplateCategory.GENERAL,
    icon: 'LayoutDashboard',
    tags: [
      { en: 'Example', zh: '示例' },
      { en: 'General', zh: '通用' }
    ],
    version: '1.0.0',
    filePath: 'general/example.json'
  },
  {
    id: 'ecommerce',
    name: { en: 'E-commerce Operations Workbench', zh: '电商运营工作台' },
    description: { 
      en: 'E-commerce industry operations management platform, including product management, order processing, inventory management, and data analysis',
      zh: '电商行业运营管理平台，包含商品管理、订单处理、库存管理、数据分析等功能'
    },
    category: TemplateCategory.RETAIL,
    icon: 'ShoppingCart',
    tags: [
      { en: 'E-commerce', zh: '电商' },
      { en: 'Retail', zh: '零售' },
      { en: 'Order Management', zh: '订单管理' }
    ],
    version: '1.0.0',
    filePath: 'retail/ecommerce.json'
  },
  {
    id: 'hospital',
    name: { en: 'Hospital Management System', zh: '医院管理系统' },
    description: { 
      en: 'Healthcare industry management system, including patient management, appointment scheduling, medical records, and drug inventory',
      zh: '医疗健康行业管理系统，包含患者管理、预约挂号、病历管理、药品库存等功能'
    },
    category: TemplateCategory.HEALTHCARE,
    icon: 'Stethoscope',
    tags: [
      { en: 'Healthcare', zh: '医疗' },
      { en: 'Hospital', zh: '医院' },
      { en: 'Patient Management', zh: '患者管理' }
    ],
    version: '1.0.0',
    filePath: 'healthcare/hospital.json'
  },
  {
    id: 'property-management',
    name: { en: 'Property Management System', zh: '房地产管理系统' },
    description: { 
      en: 'Real estate industry management system, including property management, client management, contract management, and financial management',
      zh: '房地产行业管理系统，包含房源管理、客户管理、合同管理、财务管理等功能'
    },
    category: TemplateCategory.REAL_ESTATE,
    icon: 'Building',
    tags: [
      { en: 'Real Estate', zh: '房地产' },
      { en: 'Property', zh: '房源' },
      { en: 'Contract Management', zh: '合同管理' }
    ],
    version: '1.0.0',
    filePath: 'real-estate/property-management.json'
  },
  {
    id: 'restaurant-management',
    name: { en: 'Restaurant Management System', zh: '餐饮管理系统' },
    description: { 
      en: 'Restaurant industry management system, including menu management, order management, inventory management, and staff management',
      zh: '餐饮行业管理系统，包含菜品管理、订单管理、库存管理、员工管理等功能'
    },
    category: TemplateCategory.RESTAURANT,
    icon: 'Utensils',
    tags: [
      { en: 'Restaurant', zh: '餐饮' },
      { en: 'Menu', zh: '菜品' },
      { en: 'Orders', zh: '订单' }
    ],
    version: '1.0.0',
    filePath: 'restaurant/restaurant-management.json'
  },
  {
    id: 'production-management',
    name: { en: 'Production Management System', zh: '生产管理系统' },
    description: { 
      en: 'Manufacturing production management system, including production planning, equipment management, quality management, and inventory management',
      zh: '制造业生产管理系统，包含生产计划、设备管理、质量管理、库存管理等功能'
    },
    category: TemplateCategory.MANUFACTURING,
    icon: 'Factory',
    tags: [
      { en: 'Manufacturing', zh: '制造业' },
      { en: 'Production', zh: '生产' },
      { en: 'Equipment Management', zh: '设备管理' }
    ],
    version: '1.0.0',
    filePath: 'manufacturing/production-management.json'
  },
  {
    id: 'radar-chart',
    name: { en: 'Radar Chart Demo', zh: '雷达图演示' },
    description: { 
      en: 'Chart component demo workbench showcasing radar chart and other chart features',
      zh: '图表组件演示工作台，展示雷达图等图表功能'
    },
    category: TemplateCategory.GENERAL,
    icon: 'Radar',
    tags: [
      { en: 'Charts', zh: '图表' },
      { en: 'Demo', zh: '演示' }
    ],
    version: '1.0.0',
    filePath: 'general/radar-chart.json'
  }
];

const templateCache: Map<string, Map<string, Template>> = new Map();

function loadTemplateData(lang: string, filePath: string): any {
  const templateData = templateDataMap[filePath];
  if (!templateData) {
    return null;
  }

  return templateData[lang as 'zh' | 'en'] || templateData.zh;
}

let defaultLanguage: 'zh' | 'en' = 'zh';

export function normalizeTemplateLanguage(lang?: string): 'zh' | 'en' {
  if (!lang) return defaultLanguage;
  return lang.startsWith('zh') ? 'zh' : 'en';
}

export function setDefaultTemplateLanguage(lang: string): void {
  defaultLanguage = normalizeTemplateLanguage(lang);
}

function getCurrentLanguage(explicitLang?: string): 'zh' | 'en' {
  return normalizeTemplateLanguage(explicitLang ?? defaultLanguage);
}

function createLocalizedMetadata(config: TemplateMetadataConfig): TemplateMetadata {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    category: config.category,
    icon: config.icon,
    previewImage: config.previewImage,
    tags: config.tags,
    version: config.version,
    author: config.author
  };
}

function loadTemplate(config: TemplateMetadataConfig, lang: string): Template {

  const langCache = templateCache.get(lang) || new Map();
  if (langCache.has(config.id)) {
    return langCache.get(config.id)!;
  }

  const mockData = loadTemplateData(lang, config.filePath);

  if (!mockData) {
    throw new Error(`Failed to load template: ${config.id} (${lang})`);
  }

  const template: Template = {
    metadata: createLocalizedMetadata(config),
    mockData,
    lang
  };

  if (!templateCache.has(lang)) {
    templateCache.set(lang, new Map());
  }
  templateCache.get(lang)!.set(config.id, template);

  return template;
}

export function getAllTemplates(lang?: string): Template[] {
  const resolvedLang = getCurrentLanguage(lang);
  return templateConfigs.map(config => loadTemplate(config, resolvedLang));
}

export function getTemplatesByCategory(category: TemplateCategory, lang?: string): Template[] {
  const allTemplates = getAllTemplates(lang);
  return allTemplates.filter(template => template.metadata.category === category);
}

export function getTemplateById(id: string, lang?: string): Template | undefined {
  const resolvedLang = getCurrentLanguage(lang);
  const config = templateConfigs.find(c => c.id === id);
  if (!config) {
    return undefined;
  }
  return loadTemplate(config, resolvedLang);
}

export function searchTemplates(keyword: string, lang?: string): Template[] {
  const resolvedLang = getCurrentLanguage(lang);
  const lowerKeyword = keyword.toLowerCase();
  const allTemplates = getAllTemplates(resolvedLang);

  return allTemplates.filter(template => {
    const name = getLocalizedText(template.metadata.name, resolvedLang);
    const description = getLocalizedText(template.metadata.description, resolvedLang);
    const tags = getLocalizedTags(template.metadata.tags, resolvedLang);

    return (
      name.toLowerCase().includes(lowerKeyword) ||
      description.toLowerCase().includes(lowerKeyword) ||
      tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  });
}

export function getAllCategories(): TemplateCategory[] {
  return Object.values(TemplateCategory);
}

export function createWorkbenchConfigFromTemplate(
  templateId: string, 
  customName?: string,
  lang?: string
): {
  name: string;
  description: string;
  config: {
    appConfig: any;
    pages: Record<string, any>;
  };
} {
  const resolvedLang = getCurrentLanguage(lang);
  const template = getTemplateById(templateId, resolvedLang);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const name = customName || getLocalizedText(template.metadata.name, resolvedLang);
  const description = getLocalizedText(template.metadata.description, resolvedLang);

  return {
    name,
    description,
    config: {
      appConfig: template.mockData.appConfig,
      pages: template.mockData.pages
    }
  };
}

export function clearTemplateCache(): void {
  templateCache.clear();
}
