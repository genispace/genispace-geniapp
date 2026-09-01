/**
 * Stable compatibility runtime for GeniApps exported from Workbench.
 *
 * Applications should import only this public entry. The implementation is
 * deliberately independent from the private Workbench editor and API source.
 */
export { mountWorkbench } from './workbench/runtime';
export {
  PORTABLE_WORKBENCH_COMPONENT_TYPES,
  type PortableWorkbenchComponentType,
  type WorkbenchAppConfig,
  type WorkbenchComponentConfig,
  type WorkbenchConfig,
  type WorkbenchNavigationItem,
  type WorkbenchPageConfig,
} from './workbench/types';
