import { createPlatformHostAdapters } from '../../components/adapters/platform';
import { GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY, GENISPACE_SHELL_SESSION_IDENTIFIER_KEY } from '../../hooks/shell/shell';

/** Own-app reads and writes use the same server-authorized binding as exported components.
 * Cross-app integrations retain their existing shared-resource contract.
 */
export function managedDatasourceTransport(apiRoot: string, token: string, applicationIdentifier: string, logicalIdentifier: string) {
  try {
    if (typeof sessionStorage === 'undefined'
      || !sessionStorage.getItem(GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY)
      || sessionStorage.getItem(GENISPACE_SHELL_SESSION_IDENTIFIER_KEY) !== applicationIdentifier) return null;
  } catch { return null; }
  const adapter = createPlatformHostAdapters({ apiRoot, applicationIdentifier,
    datasourceIdentifiers: { [logicalIdentifier]: logicalIdentifier } });
  return <T>(method: 'GET' | 'POST', params: Record<string, unknown>) => adapter.request!<T>({
    url: '/datasources/' + encodeURIComponent(logicalIdentifier) + '/data', method,
    headers: { Authorization: 'Bearer ' + token },
    ...(method === 'GET' ? { params } : { body: params }),
  });
}
