import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Download, Eye, FileUp, LifeBuoy,
  Link2, Loader2, MessageSquareText, Paperclip, RotateCcw, Send, Star, X
} from 'lucide-react';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Label, Textarea, toast
} from '@genispace/shared-ui';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import apiClient from '@/lib/api/apiClient';

export interface ServiceDeskReporterProps {
  applicationId?: string;
  intakeDatasourceId?: string;
  submitDatasourceId?: string;
  myTicketsDatasourceId?: string;
  requesterDetailDatasourceId?: string;
  addActivityDatasourceId?: string;
  requesterActionDatasourceId?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  showRecentTickets?: boolean;
  allowAttachments?: boolean;
  maxFiles?: number;
  maxFileSizeMb?: number;
  acceptedFileTypes?: string;
  defaultCategoryId?: string;
  defaultImpact?: 'high' | 'medium' | 'low';
  defaultUrgency?: 'high' | 'medium' | 'low';
  contextParams?: Array<{ pageParam: string; contextKey: string }>;
  /** @deprecated Use contextParams instead. Kept as fallback for existing pages. */
  contextStoreParam?: string;
  /** @deprecated Use contextParams instead. Kept as fallback for existing pages. */
  contextBrandParam?: string;
  /** @deprecated Use contextParams instead. Kept as fallback for existing pages. */
  contextDashboardParam?: string;
  /** @deprecated Use contextParams instead. Kept as fallback for existing pages. */
  contextWidgetParam?: string;
  pageParams?: Record<string, unknown>;
}

type Category = { id: string; code: string; name: string; description?: string };
type RecentTicket = {
  id: string;
  number: string;
  title: string;
  state: string;
  priority: string;
  resolution_summary?: string | null;
  auto_close_at?: string | null;
  reopen_until?: string | null;
  record_version: number;
  created_at: string;
};
type PublicActivity = {
  id: string;
  activity_type: string;
  body?: string | null;
  author_user_id?: string | null;
  created_at: string;
};
type PublicAttachment = {
  id: string;
  storage_file_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  activity_id?: string | null;
};
type PublicRelatedRecord = {
  id: string;
  record_type: string;
  number: string;
  label: string;
  state?: string | null;
  state_label?: string | null;
  last_verified_at?: string | null;
};
type RequesterDetail = RecentTicket & {
  description: string;
  record_version: number;
  activities: PublicActivity[];
  attachments: PublicAttachment[];
  related_records: PublicRelatedRecord[];
  csat?: { score: number; comment?: string; submitted_at: string } | null;
  updated_at: string;
};
type UploadedAttachment = {
  storage_file_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

function rowsFromResponse(response: unknown): Record<string, unknown>[] {
  const root = response as { data?: unknown };
  const data = root?.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const nested = data as { data?: unknown; items?: unknown };
    if (Array.isArray(nested.data)) return nested.data as Record<string, unknown>[];
    if (Array.isArray(nested.items)) return nested.items as Record<string, unknown>[];
    if (nested.data && typeof nested.data === 'object') {
      const envelope = nested.data as { data?: unknown; items?: unknown };
      if (Array.isArray(envelope.data)) return envelope.data as Record<string, unknown>[];
      if (Array.isArray(envelope.items)) return envelope.items as Record<string, unknown>[];
    }
  }
  return [];
}

function accessCodes(response: unknown): string[] {
  const root = response as { data?: unknown };
  const data = root?.data;
  if (data && typeof data === 'object') {
    const payload = data as { permissionCodes?: unknown; data?: { permissionCodes?: unknown } };
    const codes = payload.permissionCodes ?? payload.data?.permissionCodes;
    return Array.isArray(codes) ? codes.filter((value): value is string => typeof value === 'string') : [];
  }
  return [];
}

type StatusTranslate = (key: string, fallback: string) => string;

function statusLabel(state: string, t?: StatusTranslate) {
  const labels: Record<string, [string, string]> = {
    new: ['service_desk_reporter.status.new', 'New'],
    assigned: ['service_desk_reporter.status.assigned', 'Submitted'],
    in_progress: ['service_desk_reporter.status.in_progress', 'In progress'],
    pending: ['service_desk_reporter.status.pending', 'Waiting for info'],
    resolved: ['service_desk_reporter.status.resolved', 'Awaiting resolution confirmation'],
    closed: ['service_desk_reporter.status.closed', 'Closed'],
    cancelled: ['service_desk_reporter.status.cancelled', 'Cancelled']
  };
  const entry = labels[state];
  if (!entry) return state;
  return t ? t(entry[0], entry[1]) : entry[1];
}

function relatedRecordStatusLabel(
  state?: string | null,
  fallback?: string | null,
  t?: StatusTranslate
) {
  const labels: Record<string, [string, string]> = {
    active: ['service_desk_reporter.related.status.active', 'Active'],
    open: ['service_desk_reporter.related.status.open', 'In progress'],
    done: ['service_desk_reporter.related.status.done', 'Completed'],
    archived: ['service_desk_reporter.related.status.archived', 'Archived'],
    draft: ['service_desk_reporter.related.status.draft', 'Draft'],
    confirmed: ['service_desk_reporter.related.status.confirmed', 'Confirmed'],
    under_repair: ['service_desk_reporter.related.status.under_repair', 'Under repair'],
    cancel: ['service_desk_reporter.related.status.cancelled', 'Cancelled'],
    cancelled: ['service_desk_reporter.related.status.cancelled', 'Cancelled']
  };
  const entry = labels[String(state || '')];
  if (entry) return t ? t(entry[0], entry[1]) : entry[1];
  if (fallback || state) return fallback || state;
  return t
    ? t('service_desk_reporter.related.status.confirmed', 'Confirmed')
    : 'Confirmed';
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function isImageAttachment(attachment: PublicAttachment) {
  return attachment.mime_type?.startsWith('image/');
}

// Attachments without an activity link are shown on the ticket-creation node.
function isCreatedActivity(activity: PublicActivity) {
  return activity.activity_type === 'created'
    || (activity as PublicActivity & { type?: string }).type === 'created';
}

export default function ServiceDeskReporterRenderer(props: ServiceDeskReporterProps) {
  const { t, i18n } = useTranslation('renderers');
  const {
    applicationId,
    intakeDatasourceId,
    submitDatasourceId,
    myTicketsDatasourceId,
    requesterDetailDatasourceId,
    addActivityDatasourceId,
    requesterActionDatasourceId,
    title = t('service_desk_reporter.defaults.title', 'Report an issue'),
    description = t('service_desk_reporter.defaults.description', 'Report dashboard or store IT issues to the support team.'),
    submitButtonText = t('service_desk_reporter.defaults.submit_button', 'Submit ticket'),
    showRecentTickets = true,
    allowAttachments = true,
    maxFiles = 5,
    maxFileSizeMb = 10,
    acceptedFileTypes = 'image/*,.pdf,.txt,.csv,.xlsx',
    defaultCategoryId = '',
    defaultImpact = 'medium',
    defaultUrgency = 'medium',
    contextParams,
    contextStoreParam = 'storeId',
    contextBrandParam = 'brand',
    contextDashboardParam = 'dashboardId',
    contextWidgetParam = 'widgetId',
    pageParams = {}
  } = props;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<RecentTicket[]>([]);
  const [selected, setSelected] = useState<RequesterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [reply, setReply] = useState('');
  const [reopenComment, setReopenComment] = useState('');
  const [csatScore, setCsatScore] = useState(5);
  const [csatComment, setCsatComment] = useState('');
  const [receipt, setReceipt] = useState('');
  const [preview, setPreview] = useState<{
    attachment: PublicAttachment;
    url?: string;
    loading: boolean;
    failed?: boolean;
  } | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category_id: defaultCategoryId, impact: defaultImpact, urgency: defaultUrgency
  });

  // Re-apply the configured defaults when they change (e.g. edited in the property panel).
  useEffect(() => {
    setForm((current) => ({ ...current, category_id: defaultCategoryId, impact: defaultImpact, urgency: defaultUrgency }));
  }, [defaultCategoryId, defaultImpact, defaultUrgency]);

  const configured = Boolean(applicationId && intakeDatasourceId && submitDatasourceId);
  const detailConfigured = Boolean(
    requesterDetailDatasourceId && addActivityDatasourceId && requesterActionDatasourceId
  );
  const canUseDetail = detailConfigured
    && permissionCodes.includes('service-desk.public_comment.add')
    && permissionCodes.includes('service-desk.requester.action')
    && permissionCodes.includes('service-desk.attachment.read.own');
  const formIsValid = form.title.trim().length >= 3 && form.description.trim().length >= 3;
  const context = useMemo(() => {
    // Auto-inject the current workbench language so notification emails follow it.
    // An explicit contextParams mapping for the `locale` key wins over the injected value.
    const base: Record<string, unknown> = i18n?.language ? { locale: i18n.language } : {};
    // Dynamic mapping wins; fall back to the legacy four fixed props so existing
    // pages keep working without any migration.
    if (Array.isArray(contextParams) && contextParams.length > 0) {
      return contextParams
        .filter((mapping) => mapping?.pageParam && mapping?.contextKey)
        .reduce<Record<string, unknown>>(
          (acc, mapping) => ({ ...acc, [mapping.contextKey]: pageParams[mapping.pageParam] ?? null }),
          base
        );
    }
    return {
      ...base,
      store_id: pageParams[contextStoreParam] ?? null,
      brand: pageParams[contextBrandParam] ?? null,
      dashboard_id: pageParams[contextDashboardParam] ?? null,
      widget_id: pageParams[contextWidgetParam] ?? null
    };
  }, [contextParams, contextBrandParam, contextDashboardParam, contextStoreParam, contextWidgetParam, i18n?.language, pageParams]);

  const load = async (silent = false) => {
    if (!configured || !applicationId) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const access = await apiClient.get(`/applications/${applicationId}/users/me/access`);
      const codes = accessCodes(access);
      const canSubmit = codes.includes('service-desk.intake.submit');
      setPermissionCodes(codes);
      setAllowed(canSubmit);
      if (!canSubmit) return;
      const requests: Promise<unknown>[] = [apiClient.get(`/datasources/${intakeDatasourceId}/data`)];
      if (showRecentTickets && myTicketsDatasourceId) {
        requests.push(apiClient.get(`/datasources/${myTicketsDatasourceId}/data`, { limit: 10, offset: 0 }));
      }
      const [categoryResponse, recentResponse] = await Promise.all(requests);
      const categoryRows = rowsFromResponse(categoryResponse).map((row) => ({
        id: String(row.id), code: String(row.code || ''), name: String(row.name || ''),
        description: row.description ? String(row.description) : undefined
      }));
      setCategories(categoryRows);
      // Drop the configured default category if it no longer exists in the intake config.
      setForm((current) => (
        current.category_id && current.category_id === defaultCategoryId
          && !categoryRows.some((category) => category.id === current.category_id)
          ? { ...current, category_id: '' }
          : current
      ));
      setRecent(rowsFromResponse(recentResponse).map((row) => ({
        id: String(row.id), number: String(row.number), title: String(row.title),
        state: String(row.state), priority: String(row.priority),
        resolution_summary: row.resolution_summary ? String(row.resolution_summary) : null,
        auto_close_at: row.auto_close_at ? String(row.auto_close_at) : null,
        reopen_until: row.reopen_until ? String(row.reopen_until) : null,
        record_version: Number(row.record_version),
        created_at: String(row.created_at)
      })));
    } catch {
      setAllowed(false);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const refreshVisibleTickets = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const interval = window.setInterval(refreshVisibleTickets, 30_000);
    window.addEventListener('focus', refreshVisibleTickets);
    document.addEventListener('visibilitychange', refreshVisibleTickets);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisibleTickets);
      document.removeEventListener('visibilitychange', refreshVisibleTickets);
    };
  }, [applicationId, intakeDatasourceId, myTicketsDatasourceId, showRecentTickets, defaultCategoryId]);

  const loadDetail = async (ticketId: string) => {
    if (!requesterDetailDatasourceId) return;
    setDetailLoading(true);
    try {
      const response = await apiClient.get(`/datasources/${requesterDetailDatasourceId}/data`, { ticket_id: ticketId });
      const row = rowsFromResponse(response)[0];
      if (!row) throw new Error(t('service_desk_reporter.error.ticket_not_found', 'Ticket not found or no permission to view it'));
      setSelected({
        id: String(row.id), number: String(row.number), title: String(row.title),
        description: String(row.description || ''), state: String(row.state),
        priority: String(row.priority), resolution_summary: row.resolution_summary ? String(row.resolution_summary) : null,
        auto_close_at: row.auto_close_at ? String(row.auto_close_at) : null,
        reopen_until: row.reopen_until ? String(row.reopen_until) : null,
        record_version: Number(row.record_version),
        created_at: String(row.created_at), updated_at: String(row.updated_at),
        activities: parseJsonField<PublicActivity[]>(row.activities, []),
        attachments: parseJsonField<PublicAttachment[]>(row.attachments, []),
        related_records: parseJsonField<PublicRelatedRecord[]>(row.related_records, []),
        csat: parseJsonField<RequesterDetail['csat']>(row.csat, null)
      });
    } catch (reason) {
      toast({ variant: 'destructive', title: t('service_desk_reporter.toast.open_failed', 'Unable to open ticket'), description: (reason as Error).message });
    } finally {
      setDetailLoading(false);
    }
  };

  const addFiles = (
    selectedFiles: FileList | null,
    setter: Dispatch<SetStateAction<File[]>>
  ) => {
    if (!selectedFiles) return;
    const incoming = Array.from(selectedFiles);
    const oversized = incoming.find((file) => file.size > maxFileSizeMb * 1024 * 1024);
    if (oversized) {
      toast({
        variant: 'destructive',
        title: t('service_desk_reporter.toast.file_too_large', 'Attachment too large'),
        description: t('service_desk_reporter.toast.file_too_large_desc', '{{name}} exceeds {{max}} MB.', { name: oversized.name, max: maxFileSizeMb })
      });
      return;
    }
    setter((current) => [...current, ...incoming].slice(0, maxFiles));
  };

  const uploadAttachment = async (file: File): Promise<UploadedAttachment> => {
    const grant = await apiClient.post<{ id: string }>('/storage/upload-grants', {
      applicationId,
      permissionCode: 'service-desk.attachment.upload',
      purpose: 'ticket-attachments',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size
    });
    const grantData = grant.data as unknown as { id?: string; data?: { id?: string } };
    const grantId = grantData?.id || grantData?.data?.id;
    if (!grantId) throw new Error(t('service_desk_reporter.error.upload_grant_failed', 'Failed to create the attachment upload grant'));
    const uploaded = await apiClient.uploadFile<{ id: string; name: string; mimeType: string; size: number }>(
      '/storage/files/upload', file, { uploadGrantId: grantId }
    );
    const uploadData = uploaded.data as unknown as {
      id?: string; name?: string; mimeType?: string; size?: number;
      data?: { id: string; name: string; mimeType: string; size: number };
    };
    const row = uploadData?.data || uploadData;
    if (!row.id) throw new Error(t('service_desk_reporter.error.upload_missing_file_id', 'The attachment upload response is missing a file identifier'));
    return {
      storage_file_id: row.id,
      file_name: row.name || file.name,
      mime_type: row.mimeType || file.type || 'application/octet-stream',
      size_bytes: Number(row.size || file.size)
    };
  };

  const submit = async () => {
    if (!submitDatasourceId || !form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    setReceipt('');
    try {
      const attachments = await Promise.all(files.map(uploadAttachment));
      const response = await apiClient.post(`/datasources/${submitDatasourceId}/data`, {
        payload: JSON.stringify({
          ...form,
          category_id: form.category_id || null,
          source: 'workbench',
          context,
          attachments
        })
      });
      const rows = rowsFromResponse(response);
      const raw = rows[0]?.result;
      const result = typeof raw === 'string'
        ? JSON.parse(raw) as { id?: string; number?: string }
        : raw as { id?: string; number?: string } | undefined;
      setReceipt(result?.number || t('service_desk_reporter.submit.receipt_fallback', 'Ticket submitted'));
      setForm({ title: '', description: '', category_id: defaultCategoryId, impact: defaultImpact, urgency: defaultUrgency });
      setFiles([]);
      await load();
      if (result?.id && canUseDetail) await loadDetail(result.id);
    } catch (reason) {
      toast({ variant: 'destructive', title: t('service_desk_reporter.toast.submit_failed', 'Submission failed'), description: (reason as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const addReply = async () => {
    if (!selected || !addActivityDatasourceId || (!reply.trim() && !replyFiles.length)) return;
    setSubmitting(true);
    try {
      const attachments = await Promise.all(replyFiles.map(uploadAttachment));
      await apiClient.post(`/datasources/${addActivityDatasourceId}/data`, {
        payload: JSON.stringify({
          ticket_id: selected.id,
          activity_type: 'comment',
          visibility: 'public',
          body: reply.trim(),
          attachments
        })
      });
      setReply('');
      setReplyFiles([]);
      await loadDetail(selected.id);
      await load();
    } catch (reason) {
      toast({ variant: 'destructive', title: t('service_desk_reporter.toast.reply_failed', 'Reply failed'), description: (reason as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const requesterAction = async (action: 'confirm_resolution' | 'reopen') => {
    if (!selected || !requesterActionDatasourceId) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/datasources/${requesterActionDatasourceId}/data`, {
        payload: JSON.stringify({
          ticket_id: selected.id,
          action,
          expected_record_version: selected.record_version,
          comment: action === 'reopen' ? reopenComment.trim() : undefined,
          score: action === 'confirm_resolution' ? csatScore : undefined,
          csat_comment: action === 'confirm_resolution' ? csatComment.trim() : undefined
        })
      });
      setReopenComment('');
      await loadDetail(selected.id);
      await load();
    } catch (reason) {
      toast({ variant: 'destructive', title: t('service_desk_reporter.toast.action_failed', 'Action failed'), description: (reason as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAccessUrl = async (attachment: PublicAttachment, disposition: 'download' | 'inline') => {
    const response = await apiClient.post('/storage/access-grants', {
      applicationId,
      fileId: attachment.storage_file_id,
      permissionCode: 'service-desk.attachment.read.own',
      disposition
    });
    const data = response.data as unknown as { url?: string; data?: { url?: string } };
    return data.url || data.data?.url;
  };

  const download = async (attachment: PublicAttachment) => {
    try {
      const url = await fetchAccessUrl(attachment, 'download');
      if (!url) throw new Error(t('service_desk_reporter.error.download_missing_url', 'The access grant response is missing a download URL'));
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (reason) {
      toast({ variant: 'destructive', title: t('service_desk_reporter.toast.download_failed', 'Unable to download attachment'), description: (reason as Error).message });
    }
  };

  const openPreview = async (attachment: PublicAttachment) => {
    setPreview({ attachment, loading: true });
    try {
      const url = await fetchAccessUrl(attachment, 'inline');
      if (!url) throw new Error(t('service_desk_reporter.error.preview_missing_url', 'The access grant response is missing a preview URL'));
      setPreview({ attachment, url, loading: false });
    } catch {
      setPreview({ attachment, loading: false, failed: true });
    }
  };

  const renderAttachmentCard = (attachment: PublicAttachment) => {
    if (isImageAttachment(attachment)) {
      return (
        <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/50">
          <Paperclip className="h-4 w-4" />
          <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => void openPreview(attachment)}>{attachment.file_name}</button>
          <button type="button" aria-label={t('service_desk_reporter.detail.view_attachment', 'View')} onClick={() => void openPreview(attachment)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
          <button type="button" aria-label={t('service_desk_reporter.detail.download_attachment', 'Download')} onClick={() => void download(attachment)}><Download className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      );
    }
    return <button key={attachment.id} type="button" className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:border-primary/50" onClick={() => void download(attachment)}><Paperclip className="h-4 w-4" /><span className="min-w-0 flex-1 truncate text-sm">{attachment.file_name}</span><Download className="h-4 w-4 text-muted-foreground" /></button>;
  };

  if (loading) {
    return <Card><CardContent className="flex min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  }
  if (!configured) {
    return <Card className="border-dashed"><CardContent className="flex min-h-48 items-center gap-3 p-6 text-sm text-muted-foreground"><AlertCircle className="h-5 w-5" />{t('service_desk_reporter.not_configured', 'Bind the Service Desk application and data sources in the component properties.')}</CardContent></Card>;
  }
  if (!allowed) return null;

  if (selected) {
    const canReopen = ['resolved', 'closed'].includes(selected.state)
      && Boolean(selected.reopen_until)
      && new Date(selected.reopen_until as string).getTime() > Date.now();
    // Attachments linked to a listed activity render inside that activity; the rest
    // fall back to the creation node, or a ticket-level group when there is none.
    const createdActivity = selected.activities.find(isCreatedActivity);
    const orphanAttachments = selected.attachments.filter(
      (attachment) => !attachment.activity_id
        || !selected.activities.some((activity) => activity.id === attachment.activity_id)
    );
    return (
      <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><MessageSquareText className="h-5 w-5" /></span><div><CardTitle className="text-lg">{selected.number} · {selected.title}</CardTitle><CardDescription className="mt-1">{statusLabel(selected.state, t)} · {selected.priority.toUpperCase()}</CardDescription></div></div>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" />{t('service_desk_reporter.detail.back', 'Back to submit')}</Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {detailLoading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{selected.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.description}</p></section>
                {selected.resolution_summary && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />{t('service_desk_reporter.detail.resolution_summary', 'Resolution summary')}</div><p className="mt-2 text-sm">{selected.resolution_summary}</p>{selected.auto_close_at && <p className="mt-2 text-xs">{t('service_desk_reporter.detail.auto_close_hint', 'If not confirmed, the ticket will close automatically at {{time}}.', { time: new Date(selected.auto_close_at).toLocaleString() })}</p>}</section>}
                {selected.related_records.length > 0 && <section className="rounded-xl border border-border p-4"><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><h3 className="font-semibold">{t('service_desk_reporter.related.title', 'Related work progress')}</h3></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{t('service_desk_reporter.related.description', 'Only work explicitly shared by the support team is shown here. You do not need access to internal support tools.')}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.related_records.map((record) => <article key={record.id} className="rounded-lg border border-border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">{record.number}</span><span className="rounded-full bg-background px-2 py-0.5 text-[11px]">{relatedRecordStatusLabel(record.state, record.state_label, t)}</span></div><p className="mt-2 text-sm font-medium">{record.label}</p>{record.last_verified_at && <p className="mt-1 text-xs text-muted-foreground">{t('service_desk_reporter.related.last_verified', 'Last confirmed {{time}}', { time: new Date(record.last_verified_at).toLocaleString() })}</p>}</article>)}</div></section>}
                <section>
                  <h3 className="font-semibold">{t('service_desk_reporter.detail.public_progress', 'Public progress')}</h3>
                  <div className="mt-3 space-y-3 border-l border-border pl-5">
                    {!createdActivity && orphanAttachments.length > 0 && <article className="relative"><span className="absolute -left-[24px] top-1.5 h-2 w-2 rounded-full bg-primary" /><div className="text-xs text-muted-foreground">{t('service_desk_reporter.detail.ticket_attachments', 'Ticket attachments')}</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{orphanAttachments.map(renderAttachmentCard)}</div></article>}
                    {selected.activities.map((activity) => {
                      const activityAttachments = selected.attachments.filter((attachment) => attachment.activity_id === activity.id);
                      const shownAttachments = activity.id === createdActivity?.id
                        ? [...activityAttachments, ...orphanAttachments]
                        : activityAttachments;
                      return <article key={activity.id} className="relative"><span className="absolute -left-[24px] top-1.5 h-2 w-2 rounded-full bg-primary" /><div className="text-xs text-muted-foreground">{activity.activity_type} · {new Date(activity.created_at).toLocaleString()}</div>{activity.body && <p className="mt-1 text-sm">{activity.body}</p>}{shownAttachments.length > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-2">{shownAttachments.map(renderAttachmentCard)}</div>}</article>;
                    })}
                    {!selected.activities.length && <p className="text-sm text-muted-foreground">{t('service_desk_reporter.detail.no_progress', 'No public progress yet')}</p>}
                  </div>
                </section>
                {!['closed', 'cancelled'].includes(selected.state) && <section className="rounded-xl border border-border bg-muted/20 p-4"><Label htmlFor="service-desk-public-reply">{t('service_desk_reporter.detail.reply_label', 'Add information or reply to the support team')}</Label><Textarea id="service-desk-public-reply" className="mt-2 min-h-24 bg-background" value={reply} onChange={(event) => setReply(event.target.value)} /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><FileUp className="h-4 w-4" />{t('service_desk_reporter.detail.add_attachment', 'Add attachment')}<input className="sr-only" type="file" multiple accept={acceptedFileTypes} onChange={(event) => addFiles(event.target.files, setReplyFiles)} /></label><Button disabled={submitting || (!reply.trim() && !replyFiles.length)} onClick={() => void addReply()}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{t('service_desk_reporter.detail.submit_reply', 'Submit reply')}</Button></div>{replyFiles.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('service_desk_reporter.detail.attachments_selected', '{{count}} attachments selected', { count: replyFiles.length })}</p>}</section>}
              </div>
              <aside className="space-y-4">
                {selected.state === 'resolved' && !selected.csat && <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{t('service_desk_reporter.confirm.title', 'Confirm resolution')}</h3><p className="mt-1 text-sm text-muted-foreground">{t('service_desk_reporter.confirm.description', 'Confirm to close the ticket and submit your satisfaction rating.')}</p><div className="mt-4 flex gap-1">{[1,2,3,4,5].map((score) => <button key={score} type="button" aria-label={t('service_desk_reporter.confirm.star_label', '{{score}} stars', { score })} onClick={() => setCsatScore(score)} className="p-1"><Star className={`h-5 w-5 ${score <= csatScore ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} /></button>)}</div><Textarea className="mt-3 min-h-20" value={csatComment} onChange={(event) => setCsatComment(event.target.value)} placeholder={t('service_desk_reporter.confirm.comment_placeholder', 'Optional: tell us how we did')} /><Button className="mt-3 w-full" disabled={submitting} onClick={() => void requesterAction('confirm_resolution')}><CheckCircle2 className="mr-2 h-4 w-4" />{t('service_desk_reporter.confirm.button', 'Confirm and close')}</Button></section>}
                {selected.csat && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-900">{t('service_desk_reporter.csat.submitted', 'Satisfaction submitted')}</h3><p className="mt-2 text-sm text-emerald-800">{selected.csat.score} / 5{selected.csat.comment ? ` · ${selected.csat.comment}` : ''}</p></section>}
                {canReopen && <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{t('service_desk_reporter.reopen.title', 'Still need help?')}</h3><p className="mt-1 text-sm text-muted-foreground">{t('service_desk_reporter.reopen.deadline_hint', 'You can reopen it before {{time}}.', { time: new Date(selected.reopen_until as string).toLocaleString() })}</p><Textarea className="mt-3 min-h-20" value={reopenComment} onChange={(event) => setReopenComment(event.target.value)} placeholder={t('service_desk_reporter.reopen.placeholder', 'Describe the issue that still exists')} /><Button variant="outline" className="mt-3 w-full" disabled={submitting} onClick={() => void requesterAction('reopen')}><RotateCcw className="mr-2 h-4 w-4" />{t('service_desk_reporter.reopen.button', 'Reopen')}</Button></section>}
                <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">{t('service_desk_reporter.email.title', 'About email notifications')}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{t('service_desk_reporter.email.description', 'Emails are sent automatically as the ticket progresses. You can reply to the Reply-To address from your regular mailbox, but email replies are not written back to the ticket. Please add updates here.')}</p></section>
              </aside>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-3xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{preview?.attachment.file_name}</DialogTitle></DialogHeader>
          <div className="flex min-h-48 items-center justify-center">
            {preview?.loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {!preview?.loading && preview?.failed && <p className="text-sm text-muted-foreground">{t('service_desk_reporter.detail.preview_failed', 'Unable to load the image preview')}</p>}
            {!preview?.loading && !preview?.failed && preview?.url && <img src={preview.url} alt={preview.attachment.file_name} className="max-h-[70vh] max-w-full rounded-md object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><LifeBuoy className="h-5 w-5" /></span><div><CardTitle className="text-lg">{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {receipt && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{t('service_desk_reporter.submit.receipt_created', 'Created {{receipt}}', { receipt })}</div>}
          <div className="space-y-2"><Label>{t('service_desk_reporter.form.subject_label', 'Subject')}</Label><Input value={form.title} maxLength={160} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('service_desk_reporter.form.subject_placeholder', 'Briefly describe the issue that needs support')} /><p className="text-xs text-muted-foreground">{t('service_desk_reporter.form.subject_hint', 'Enter at least 3 non-space characters.')}</p></div>
          <div className="space-y-2"><Label>{t('service_desk_reporter.form.description_label', 'Detailed description')}</Label><Textarea className="min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t('service_desk_reporter.form.description_placeholder', 'Describe the symptoms, the expected result, and what you have already tried')} /><p className="text-xs text-muted-foreground">{t('service_desk_reporter.form.description_hint', 'Enter at least 3 non-space characters so support can understand the issue.')}</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm"><Label>{t('service_desk_reporter.form.category_label', 'Category')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">{t('service_desk_reporter.form.category_placeholder', 'Select')}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="space-y-2 text-sm"><Label>{t('service_desk_reporter.form.impact_label', 'Impact')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value as typeof form.impact })}><option value="high">{t('service_desk_reporter.form.level_high', 'High')}</option><option value="medium">{t('service_desk_reporter.form.level_medium', 'Medium')}</option><option value="low">{t('service_desk_reporter.form.level_low', 'Low')}</option></select></label>
            <label className="space-y-2 text-sm"><Label>{t('service_desk_reporter.form.urgency_label', 'Urgency')}</Label><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value as typeof form.urgency })}><option value="high">{t('service_desk_reporter.form.level_high', 'High')}</option><option value="medium">{t('service_desk_reporter.form.level_medium', 'Medium')}</option><option value="low">{t('service_desk_reporter.form.level_low', 'Low')}</option></select></label>
          </div>
          {allowAttachments && <div className="space-y-2"><Label>{t('service_desk_reporter.form.attachments_label', 'Attachments')}</Label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"><FileUp className="h-4 w-4" />{t('service_desk_reporter.form.choose_files', 'Choose files')}<input className="sr-only" type="file" multiple accept={acceptedFileTypes} onChange={(event) => addFiles(event.target.files, setFiles)} /></label>{files.length > 0 && <div className="space-y-1">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"><Paperclip className="h-3.5 w-3.5" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3.5 w-3.5" /></button></div>)}</div>}</div>}
          <Button className="w-full sm:w-auto" disabled={submitting || !formIsValid} onClick={() => void submit()}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{submitting ? t('service_desk_reporter.submit.submitting', 'Submitting…') : submitButtonText}</Button>
        </div>
        {showRecentTickets && <aside className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><h3 className="text-sm font-semibold">{t('service_desk_reporter.recent.title', 'My recent tickets')}</h3><p className="mt-1 text-xs text-muted-foreground">{canUseDetail ? t('service_desk_reporter.recent.hint_enabled', 'Click to view progress, reply, and confirm resolution') : t('service_desk_reporter.recent.hint_disabled', 'Detail data sources and requester permissions must also be configured')}</p><div className="mt-3 space-y-2">{recent.map((ticket) => <button type="button" disabled={!canUseDetail || detailLoading} onClick={() => void loadDetail(ticket.id)} key={ticket.id} className="w-full rounded-lg border border-border p-3 text-left transition enabled:hover:border-primary/50"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted-foreground">{ticket.number}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{statusLabel(ticket.state, t)}</span></div><p className="mt-2 line-clamp-2 text-sm font-medium">{ticket.title}</p><p className="mt-1 text-xs uppercase text-muted-foreground">{ticket.priority}</p></button>)}{!recent.length && <p className="py-6 text-center text-sm text-muted-foreground">{t('service_desk_reporter.recent.empty', 'No submissions yet')}</p>}</div></aside>}
      </CardContent>
    </Card>
  );
}

export const serviceDeskReporterTestUtils = {
  accessCodes,
  parseJsonField,
  relatedRecordStatusLabel,
  rowsFromResponse,
  statusLabel
};
