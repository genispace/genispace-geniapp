import educationPlanningMockData from './templates/zh/education/education-planning.json';
import workbenchMockData from './templates/zh/recruiting/recruiting.json';
import exampleMockData from './templates/zh/general/example.json';
import radarChartMockData from './templates/zh/general/radar-chart.json';
import pieLayoutLabMockData from './templates/zh/general/pie-layout-lab.json';
import logisticsDashboardMockData from './templates/zh/logistics/logistics-dashboard.json';
import lianyaWorkbenchMockData from './lianya.json';
import invoiceRecognitionMockData from './templates/zh/finance/invoice-recognition.json';
import reconciliationMockData from './templates/zh/finance/reconciliation.json';
import ecommerceMockData from './templates/zh/retail/ecommerce.json';
import hospitalMockData from './templates/zh/healthcare/hospital.json';
import propertyManagementMockData from './templates/zh/real-estate/property-management.json';
import restaurantManagementMockData from './templates/zh/restaurant/restaurant-management.json';
import productionManagementMockData from './templates/zh/manufacturing/production-management.json';
import listDashboardDemoMockData from './list-dashboard-demo.json';
import geniappExportAcceptanceMockData from './geniapp-export-acceptance.json';

export * from './templateRegistry';
export * from './types';

export interface MockDataRegistry {
  [key: string]: any;
}

export const mockRegistry: MockDataRegistry = {
  'education-planning': educationPlanningMockData,
  'yueyang': educationPlanningMockData, 
  'yueyangjiaoyu': educationPlanningMockData, 
  'workbench': workbenchMockData,
  'recruiting': workbenchMockData, 
  'example': exampleMockData, 
  'radarChart': radarChartMockData, 
  'pie-layout-lab': pieLayoutLabMockData, 
  'logistics-dashboard': logisticsDashboardMockData, 
  'lianya': lianyaWorkbenchMockData, 
  'invoiceRecognition': invoiceRecognitionMockData, 
  'reconciliation': reconciliationMockData, 
  'ecommerce': ecommerceMockData, 
  'hospital': hospitalMockData, 
  'property-management': propertyManagementMockData, 
  'restaurant-management': restaurantManagementMockData, 
  'production-management': productionManagementMockData,
  'list-dashboard': listDashboardDemoMockData,
  'geniapp-export-acceptance': geniappExportAcceptanceMockData,
};

export function getMockData(workbenchId: string): any | null {

  if (workbenchId.startsWith('demo-')) {
    const name = workbenchId.replace('demo-', '');
    const mockData = mockRegistry[name];
    if (mockData) {
      return mockData;
    }
    return null;
  }

  if (workbenchId.endsWith('-demo')) {
    const name = workbenchId.replace('-demo', '');
    const mockData = mockRegistry[name];
    if (mockData) {
      return mockData;
    }
  }

  return null;
}

export function isDemoWorkbench(workbenchId: string | undefined): boolean {
  if (!workbenchId) return false;

  if (workbenchId.startsWith('demo-')) {
    return true;
  }

  if (workbenchId.endsWith('-demo')) {
    const name = workbenchId.replace('-demo', '');
    return !!mockRegistry[name];
  }

  return false;
}

export function getAvailableDemos(): Array<{ id: string; name: string; url: string }> {
  return Object.keys(mockRegistry).map(key => {
    const mockData = mockRegistry[key];
    const demoId = `demo-${key}`;
    const name = mockData?.appConfig?.name || `${key} Demo`;
    const defaultPage = mockData?.appConfig?.defaultPage || Object.keys(mockData?.pages || {})[0] || 'dashboard';

    return {
      id: demoId,
      name: name,
      url: `/workbench/${demoId}/${defaultPage}`
    };
  });
}
