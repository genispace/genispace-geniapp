import i18n from '@/locales/i18n';

export type LayoutPreset = 'all-vertical' | 'top1-bottom2' | 'top1-bottom2-equal' | 'left1-right2' | 'top1-bottom3' | 'top1-bottom2-left-large' | 'dashboard-layout' | 'left3-right1';

export type GridArea = 
  | 'top'           
  | 'bottom'        
  | 'bottom-left'   
  | 'bottom-center' 
  | 'bottom-right'  
  | 'bottom-second' 
  | 'left'          
  | 'left-top'      
  | 'left-center'   
  | 'left-bottom'   
  | 'right'         
  | 'right-top'     
  | 'right-bottom'  
  | 'header'        
  | 'middle-left'   
  | 'middle-center' 
  | 'middle-right'  
  | 'middle';       

export interface LayoutConfig {
  type: 'default' | 'custom';
  preset: LayoutPreset;
  componentPositions?: Record<string, {
    area: GridArea;
    order: number;
    span?: number; 
  }>;
}

export interface ComponentItem {
  id: string;
  type: string;
  title?: string;
  area: GridArea;
  order: number;
}

export const getLayoutPresets = () => ({
  'all-vertical': {
    name: i18n.t('workbench:layout_system.presets.all_vertical.name', 'All Vertical'),
    description: i18n.t('workbench:layout_system.presets.all_vertical.description', 'All components arranged vertically, suitable for single column display'),
    areas: ['top'] as GridArea[],
    gridTemplate: {
      columns: '1fr',
      rows: 'auto',
      areas: '"top"'
    }
  },
  'top1-bottom3': {
    name: i18n.t('workbench:layout_system.presets.top1_bottom3.name', 'Top 1 Bottom 3'),
    description: i18n.t('workbench:layout_system.presets.top1_bottom3.description', 'One area on top, three horizontal areas below'),
    areas: ['top', 'bottom-left', 'bottom-center', 'bottom-right'] as GridArea[],
    gridTemplate: {
      columns: '1fr 1fr 1fr',
      rows: 'auto auto',
      areas: `
        "top top top"
        "bottom-left bottom-center bottom-right"
      `
    }
  },
  'top1-bottom2': {
    name: i18n.t('workbench:layout_system.presets.top1_bottom2.name', 'Top 1 Bottom 2'),
    description: i18n.t('workbench:layout_system.presets.top1_bottom2.description', 'One area on top, two horizontal areas below'),
    areas: ['top', 'bottom-left', 'bottom-right'] as GridArea[],
    gridTemplate: {
      columns: '1fr 1fr 1fr',
      rows: 'auto auto',
      areas: `
        "top top top"
        "bottom-left bottom-left bottom-right"
      `
    }
  },
  'top1-bottom2-equal': {
    name: i18n.t('workbench:layout_system.presets.top1_bottom2_equal.name', 'Top 1 Bottom 2 - Equal Split'),
    description: i18n.t('workbench:layout_system.presets.top1_bottom2_equal.description', 'One area on top, two equal areas below (50-50 split)'),
    areas: ['top', 'bottom-left', 'bottom-right'] as GridArea[],
    gridTemplate: {
      columns: '1fr 1fr',
      rows: 'auto auto',
      areas: `
        "top top"
        "bottom-left bottom-right"
      `
    }
  },
  'left1-right2': {
    name: i18n.t('workbench:layout_system.presets.left1_right2.name', 'Left 1 Right 2'),
    description: i18n.t('workbench:layout_system.presets.left1_right2.description', 'One area on the left, two vertical areas on the right'),
    areas: ['left', 'right-top', 'right-bottom'] as GridArea[],
    gridTemplate: {
      columns: '1fr 1fr 1fr',
      rows: 'auto auto',
      areas: `
        "left right-top right-top"
        "left right-bottom right-bottom"
      `
    }
  },
  'top1-bottom2-left-large': {
    name: i18n.t('workbench:layout_system.presets.top1_bottom2_left_large.name', 'Top 1 Bottom 2 - Left Small Right Large'),
    description: i18n.t('workbench:layout_system.presets.top1_bottom2_left_large.description', 'One area on top, small area on bottom left, large area on bottom right'),
    areas: ['top', 'bottom-left', 'bottom-right'] as GridArea[],
    gridTemplate: {
      columns: '1fr 2fr',
      rows: 'auto auto',
      areas: `
        "top top"
        "bottom-left bottom-right"
      `
    }
  },
  'dashboard-layout': {
    name: i18n.t('workbench:layout_system.presets.dashboard_layout.name', 'Dashboard Layout'),
    description: i18n.t('workbench:layout_system.presets.dashboard_layout.description', 'Header area, top KPI cards, middle 3-column charts, bottom left and right columns, bottommost spanning all columns'),
    areas: ['header', 'top', 'middle-left', 'middle-center', 'middle-right', 'middle', 'bottom-left', 'bottom-right', 'bottom-second'] as GridArea[],
    gridTemplate: {
      columns: '1fr 1fr 1fr',
      rows: 'auto auto auto auto auto',
      areas: `
        "header header header"
        "top top top"
        "middle-left middle-center middle-right"
        "bottom-left bottom-left bottom-right"
        "bottom-second bottom-second bottom-second"
      `
    }
  },
  'left3-right1': {
    name: i18n.t('workbench:layout_system.presets.left3_right1.name', 'Left Large Right Small'),
    description: i18n.t('workbench:layout_system.presets.left3_right1.description', 'Top and bottom spanning full width, left area takes 3/4, right area takes 1/4'),
    areas: ['top', 'left', 'right', 'bottom'] as GridArea[],
    gridTemplate: {
      columns: '3fr 1fr',
      rows: 'auto 1fr auto',
      areas: `
        "top top"
        "left right"
        "bottom bottom"
      `
    }
  }
} as const);

export const LAYOUT_PRESETS = getLayoutPresets();

const DEFAULT_LAYOUT_PRESET: LayoutPreset = 'all-vertical';

export function normalizeLayoutPreset(preset?: string | null): LayoutPreset {
  if (!preset) {
    return DEFAULT_LAYOUT_PRESET;
  }

  const presets = getLayoutPresets();
  if (preset in presets) {
    return preset as LayoutPreset;
  }

  console.warn(`[layoutSystem] Unknown layout preset "${preset}", fallback to "${DEFAULT_LAYOUT_PRESET}"`);
  return DEFAULT_LAYOUT_PRESET;
}

export function getVisibleAreas(preset: LayoutPreset): GridArea[] {
  const safePreset = normalizeLayoutPreset(preset);
  return getLayoutPresets()[safePreset].areas;
}

export function getAreaDisplayName(area: GridArea): string {
  const areaKeyMap: Record<GridArea, string> = {
    'top': 'top',
    'bottom': 'bottom',
    'bottom-left': 'bottom_left',
    'bottom-center': 'bottom_center',
    'bottom-right': 'bottom_right',
    'bottom-second': 'bottom_second',
    'left': 'left',
    'left-top': 'left_top',
    'left-center': 'left_center',
    'left-bottom': 'left_bottom',
    'right': 'right',
    'right-top': 'right_top',
    'right-bottom': 'right_bottom',
    'header': 'header',
    'middle-left': 'middle_left',
    'middle-center': 'middle_center',
    'middle-right': 'middle_right',
    'middle': 'middle'
  };
  const key = areaKeyMap[area];
  return i18n.t(`workbench:layout_system.areas.${key}`, area);
}

export function getAreaDescription(area: GridArea): string {
  const areaKeyMap: Record<GridArea, string> = {
    'top': 'top',
    'bottom': 'bottom',
    'bottom-left': 'bottom_left',
    'bottom-center': 'bottom_center',
    'bottom-right': 'bottom_right',
    'bottom-second': 'bottom_second',
    'left': 'left',
    'left-top': 'left_top',
    'left-center': 'left_center',
    'left-bottom': 'left_bottom',
    'right': 'right',
    'right-top': 'right_top',
    'right-bottom': 'right_bottom',
    'header': 'header',
    'middle-left': 'middle_left',
    'middle-center': 'middle_center',
    'middle-right': 'middle_right',
    'middle': 'middle'
  };
  const key = areaKeyMap[area];
  return i18n.t(`workbench:layout_system.area_descriptions.${key}`, area);
}

export function distributeComponentsToAreas(
  components: any[], 
  preset: LayoutPreset
): ComponentItem[] {
  const safePreset = normalizeLayoutPreset(preset);
  const areas = getVisibleAreas(safePreset);
  const defaultArea = areas[0];

  return components.map((component, index) => {
    let area: GridArea;
    let order: number;

    switch (safePreset) {
      case 'all-vertical':
        area = 'top';
        order = index;
        break;
      case 'top1-bottom3':

        const areaIndex4 = index % 4;
        if (areaIndex4 === 0) {
          area = 'top';
          order = Math.floor(index / 4);
        } else if (areaIndex4 === 1) {
          area = 'bottom-left';
          order = Math.floor(index / 4);
        } else if (areaIndex4 === 2) {
          area = 'bottom-center';
          order = Math.floor(index / 4);
        } else {
          area = 'bottom-right';
          order = Math.floor(index / 4);
        }
        break;
      case 'top1-bottom2':
      case 'top1-bottom2-equal':

        const areaIndex3 = index % 3;
        if (areaIndex3 === 0) {
          area = 'top';
          order = Math.floor(index / 3);
        } else if (areaIndex3 === 1) {
          area = 'bottom-left';
          order = Math.floor(index / 3);
        } else {
          area = 'bottom-right';
          order = Math.floor(index / 3);
        }
        break;
      case 'left1-right2':

        const areaIndex3_lr = index % 3;
        if (areaIndex3_lr === 0) {
          area = 'left';
          order = Math.floor(index / 3);
        } else if (areaIndex3_lr === 1) {
          area = 'right-top';
          order = Math.floor(index / 3);
        } else {
          area = 'right-bottom';
          order = Math.floor(index / 3);
        }
        break;
      case 'top1-bottom2-left-large':

        const areaIndex3_tb = index % 3;
        if (areaIndex3_tb === 0) {
          area = 'top';
          order = Math.floor(index / 3);
        } else if (areaIndex3_tb === 1) {
          area = 'bottom-left';
          order = Math.floor(index / 3);
        } else {
          area = 'bottom-right';
          order = Math.floor(index / 3);
        }
        break;
      case 'left3-right1':

        const areaIndex4_l3r1 = index % 4;
        if (areaIndex4_l3r1 === 0) {
          area = 'top';
          order = Math.floor(index / 4);
        } else if (areaIndex4_l3r1 === 1) {
          area = 'left';
          order = Math.floor(index / 4);
        } else if (areaIndex4_l3r1 === 2) {
          area = 'right';
          order = Math.floor(index / 4);
        } else {
          area = 'bottom';
          order = Math.floor(index / 4);
        }
        break;
      default:
        area = defaultArea;
        order = index;
    }

    return {
      id: component.id || `component-${index}`,
      type: component.type || 'unknown',
      title: component.title || component.name || i18n.t('workbench:layout_system.unnamed_component', 'Unnamed Component'),
      area,
      order
    };
  });
}

export function getLayoutContainerClass(preset: LayoutPreset): string {
  return `layout-grid layout-${preset}`;
}

export function getAreaClass(area: GridArea): string {
  return `layout-area layout-area-${area}`;
} 