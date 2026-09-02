export type ParameterValue = string | number | boolean | null | undefined | Record<string, any> | any[];
export type ParameterRecord = Record<string, ParameterValue>;

export interface TabParameterInfo {
  tabId: string;
  pageId: string;
  parameters: ParameterRecord;
  timestamp: number;
}

export interface ParameterChangeEvent {
  key: string;
  value: ParameterValue;
  oldValue: ParameterValue;
  source: 'user' | 'component' | 'system';
  timestamp: number;
  componentId?: string;
}

export type ParameterListener = (event: ParameterChangeEvent) => void;

export interface ParameterSubscription {
  parameterKeys: string[]; 
  callback: ParameterListener;
  componentId?: string;
  immediate?: boolean; 
}

export type ParameterReadyCallback = () => void;

export interface ParameterContextValue {

  currentTabParams: ParameterRecord;

  getCurrentTabParams: () => ParameterRecord;

  globalUrlParams: ParameterRecord;

  updateTabParams: (params: Partial<ParameterRecord>, source?: 'user' | 'component' | 'system', componentId?: string) => void;

  getTabParams: (tabId: string) => ParameterRecord;

  cleanupTabParams: (activeTabIds: string[]) => void;

  subscribeToParameter: (subscription: ParameterSubscription) => () => void;

  unsubscribeFromParameter: (parameterKeys: string[], componentId?: string) => void;

  broadcastParameterChange: (key: string, value: ParameterValue, source?: 'user' | 'component' | 'system', componentId?: string) => void;

  markParametersReady: (parameterKeys: string[]) => void;

  isParametersReady: (parameterKeys: string[]) => boolean;

  subscribeToParametersReady: (
    parameterKeys: string[],
    callback: ParameterReadyCallback
  ) => () => void;
}

export interface ParameterParseConfig {

  enableJsonParsing: boolean;

  defaultValues: ParameterRecord;

  validationRules?: Record<string, (value: ParameterValue) => boolean>;
}

export interface ParameterProps {
  pageParams?: ParameterRecord;
  pageId?: string;
  tabId?: string;
}

export interface ComponentParameterConfig {

  enableParameterReceiving?: boolean;

  parameterMapping?: Record<string, {
    targetField: string;
    targetType?: 'props' | 'dataSource' | 'filterCondition';
    required?: boolean;
    defaultValue?: ParameterValue;
    transform?: (value: ParameterValue) => ParameterValue;
  }>;

  listenToParameters?: string[];

} 