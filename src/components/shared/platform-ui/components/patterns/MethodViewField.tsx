import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MethodView } from '@genispace/shared-types';
import type { HostPort, McpAppDescriptor, ReadResourceResult } from '@genispace/mcp-app-host/core';
import { webMcpAppSandbox } from '@genispace/shared-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';

const McpAppView = lazy(() => import('@genispace/mcp-app-host/react').then(module => ({ default: module.McpAppView })));

/** Shared configuration field. Preview reads HTML only; no business receipts,
 * sample model requests, live credentials or callable tools enter this Host. */
export function MethodViewField({ value, onChange, preview, sandboxUrl, environment }: {
  value?: MethodView | null;
  onChange(value: MethodView | null): void;
  preview(value: MethodView): Promise<ReadResourceResult>;
  sandboxUrl?: string;
  environment: string;
}) {
  const { t, i18n } = useTranslation('common');
  const id = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [resource, setResource] = useState<ReadResourceResult>();
  const revision = useRef(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { revision.current++; setOpen(false); setResource(undefined); setError(false); setBusy(false); }, [value?.url]);
  useEffect(() => () => { revision.current++; }, []);
  const load = async () => {
    if (!value?.url) return;
    const current = ++revision.current;
    setBusy(true); setError(false);
    try {
      const result = await preview(value);
      if (current !== revision.current) return;
      setResource(result); setOpen(true);
    } catch { if (current === revision.current) setError(true); }
    finally { if (current === revision.current) setBusy(false); }
  };
  const sandbox = useMemo(() => {
    const url = sandboxUrl || (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:5020' : undefined);
    try { return url ? webMcpAppSandbox(url) : undefined; } catch { return undefined; }
  }, [sandboxUrl]);
  const view = useMemo(() => {
    const uri = resource?.contents[0]?.uri;
    if (!uri || !resource) return undefined;
    const scope = { principalId: 'configuration-preview', serverIdentity: 'configuration-preview', environment,
      sessionId: id, readOnly: true, toolsEnabled: false };
    const descriptor: McpAppDescriptor = { schemaVersion: 1, kind: 'mcp-app', ...scope,
      threadId: id, messageId: id, toolCallId: id, arguments: {}, result: { content: [] }, resourceUri: uri,
      tool: { name: 'view-preview', inputSchema: { type: 'object' }, _meta: { ui: { resourceUri: uri } } } };
    const port: HostPort = { scope,
      readResource: async requested => { if (requested !== uri) throw new Error('Read-only preview'); return resource; },
      listTools: async () => [], authorizeToolCall: async () => false,
      callTool: async () => { throw new Error('Read-only preview'); }, openLink: async () => { throw new Error('Read-only preview'); } };
    return { descriptor, port };
  }, [environment, id, resource]);
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">{t('methodView.label', 'Result view')}</label>
    <div className="flex items-center gap-2">
      <Input id={id} type="url" value={value?.url || ''} placeholder="https://…/view.html"
        onChange={event => onChange(event.target.value ? { ...value, url: event.target.value } : null)} />
      <button type="button" className="btn btn-secondary btn-sm shrink-0" disabled={!value?.url || busy} onClick={() => void load()}>
        {busy ? t('methodView.checking', 'Checking…') : t('methodView.preview', 'Preview')}
      </button>
    </div>
    <p className="text-xs text-muted-foreground">{t('methodView.optional', 'Leave empty for default presentation.')}</p>
    {error && <p role="alert" className="text-sm text-destructive">{t('methodView.unavailable', 'Unable to load this view.')}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent nested closeLabel={t('close', 'Close')} aria-describedby={undefined} className="max-w-3xl">
      <DialogHeader><DialogTitle>{t('methodView.label', 'Result view')}</DialogTitle></DialogHeader>
      <p className="text-xs text-muted-foreground">{t('methodView.readonly', 'Read-only preview · no tool actions')}</p>
      {view && sandbox ? <Suspense fallback={<p role="status" className="h-[420px] py-10 text-center text-sm text-muted-foreground">{t('methodView.checking', 'Checking…')}</p>}><McpAppView {...view} sandboxUrl={sandbox} title={t('methodView.label', 'Result view')}
        context={{ locale: i18n.language, theme, containerDimensions: { width: 640, height: 420 } }}
        className="h-[420px] w-full border-0" onState={state => { if (state.phase === 'error') setError(true); }} /></Suspense>
        : <p role="status" className="py-10 text-center text-sm text-muted-foreground">{t('methodView.unavailable', 'Unable to load this view.')}</p>}
    </DialogContent></Dialog>
  </div>;
}
