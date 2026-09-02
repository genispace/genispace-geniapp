import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';

type ComponentLike = {
  databaseDataSourceConfig?: unknown;
  props?: Record<string, unknown>;
};

/** Resolve database datasource config from component root or props (legacy configs may store it under props) */
export function resolveDatabaseDataSourceConfig(
  component: ComponentLike | null | undefined
): DatabaseDataSourceConfig | null {
  if (!component) return null;

  const top = component.databaseDataSourceConfig;
  if (isValidDbConfig(top)) {
    return top;
  }

  const fromProps = component.props?.databaseDataSourceConfig;
  if (isValidDbConfig(fromProps)) {
    return fromProps;
  }

  return null;
}

function isValidDbConfig(value: unknown): value is DatabaseDataSourceConfig {
  return (
    value !== null &&
    typeof value === 'object' &&
    'datasourceId' in value &&
    Boolean((value as DatabaseDataSourceConfig).datasourceId)
  );
}
