import { DataTransformConfig } from '../components/renderers/WorkflowComponent/types';

export function createTransformsFromConfig(config: any): DataTransformConfig | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }

  // Legacy `*.code` fields used dynamic function compilation in the main application realm.
  // They are intentionally inert. Future transforms must use a versioned,
  // declarative operation schema that can be validated by the API.
  if (
    config.transformStepData?.code ||
    config.prepareStepOutput?.code ||
    config.validateStepData?.code
  ) {
    console.warn('[Workbench] Executable workflow transforms are disabled');
  }
  return undefined;
}
