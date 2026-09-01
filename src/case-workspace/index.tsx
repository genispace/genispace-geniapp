import { formatBusinessDateTime } from '@genispace/geniapp/hooks';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Inbox,
  MessageSquarePlus,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppPage, AppPageStates } from "@genispace/geniapp/ui";
import {
  CrossAppRecordPicker,
  type CrossAppRecordOption,
  type CrossAppRecordPage,
} from "@genispace/geniapp/hooks";
export type CaseRow = {
  id: string;
  number: string;
  subject: string;
  description?: string;
  case_type: string;
  state: string;
  priority: string;
  requester_name?: string;
  owner_name?: string;
  due_at: string;
  privacy_level: string;
  context_snapshot?: Record<string, unknown>;
  provider_receipt?: Record<string, unknown>;
};
export type CaseContext = {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  emptyText: string;
  unavailableText: string;
  forbiddenText: string;
  loadPage: (input: {
    search: string;
    limit: number;
    offset: number;
  }) => Promise<CrossAppRecordPage>;
};
export type CaseWorkspaceCopy = {
  title: string;
  description: string;
  helpTitle: string;
  help: string[];
  tabs: { queue: string; create: string };
  metrics: { open: string; urgent: string; waiting: string; overdue: string };
  fields: {
    subject: string;
    description: string;
    type: string;
    priority: string;
    privacy: string;
    communication: string;
    resolution: string;
  };
  actions: {
    help: string;
    close: string;
    create: string;
    addCommunication: string;
    resolve: string;
    handoff: string;
  };
  empty: string;
  loading: string;
  loadError: string;
  saveError: string;
  notice: string;
  priorities: Record<string, string>;
  privacy: Record<string, string>;
  states: Record<string, string>;
};
export type CaseWorkspaceProps = {
  icon?: LucideIcon;
  copy: CaseWorkspaceCopy;
  caseTypes: Array<{ value: string; label: string }>;
  contexts: CaseContext[];
  queryCases: () => Promise<CaseRow[]>;
  createCase: (payload: Record<string, unknown>) => Promise<unknown>;
  addCommunication: (payload: Record<string, unknown>) => Promise<unknown>;
  resolveCase: (payload: Record<string, unknown>) => Promise<unknown>;
  handoffCase: (payload: Record<string, unknown>) => Promise<unknown>;
  defaultPrivacy?: "standard" | "restricted" | "sensitive";
  extraActions?: ReactNode;
};
export function CaseWorkspace({
  icon = Inbox,
  copy,
  caseTypes,
  contexts,
  queryCases,
  createCase,
  addCommunication,
  resolveCase,
  handoffCase,
  defaultPrivacy = "standard",
  extraActions,
}: CaseWorkspaceProps) {
  const [tab, setTab] = useState<"queue" | "create">("queue");
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [draft, setDraft] = useState<{
    subject: string;
    description: string;
    case_type: string;
    priority: string;
    privacy_level: string;
  }>({
    subject: "",
    description: "",
    case_type: caseTypes[0]?.value || "general",
    priority: "normal",
    privacy_level: defaultPrivacy,
  });
  const [selected, setSelected] = useState<
    Record<string, CrossAppRecordOption | null>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await queryCases());
    } catch (reason) {
      setError(`${copy.loadError}: ${(reason as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, queryCases]);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (operation: () => Promise<unknown>) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(copy.notice);
      await load();
    } catch (reason) {
      setError(`${copy.saveError}: ${(reason as Error).message}`);
    } finally {
      setSaving(false);
    }
  };
  const metrics = useMemo(
    () => ({
      open: rows.filter(
        (row) => !["resolved", "closed", "cancelled"].includes(row.state),
      ).length,
      urgent: rows.filter(
        (row) =>
          row.priority === "urgent" &&
          !["resolved", "closed"].includes(row.state),
      ).length,
      waiting: rows.filter((row) => row.state === "waiting").length,
      overdue: rows.filter(
        (row) =>
          !["resolved", "closed", "cancelled"].includes(row.state) &&
          new Date(row.due_at).getTime() < Date.now(),
      ).length,
    }),
    [rows],
  );
  const create = () =>
    run(async () => {
      const context = Object.fromEntries(
        Object.entries(selected)
          .filter(([, value]) => value)
          .map(([key, value]) => [
            key,
            {
              id: value!.id,
              primary: value!.primary,
              snapshot: value!.snapshot || {},
            },
          ]),
      );
      await createCase({ ...draft, contexts: context });
      setDraft({ ...draft, subject: "", description: "" });
      setSelected({});
      setTab("queue");
    });
  return (
    <AppPage
      title={copy.title}
      description={copy.description}
      icon={icon}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3"
            onClick={() => setHelp(true)}
          >
            <HelpCircle className="h-4 w-4" />
            {copy.actions.help}
          </button>
        </div>
      }
    >
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(metrics).map(([key, value]) => (
          <Metric
            key={key}
            label={copy.metrics[key as keyof typeof copy.metrics]}
            value={value}
          />
        ))}
      </section>
      <div
        className="my-4 flex gap-2 rounded-xl border bg-muted/30 p-1"
        role="tablist"
      >
        {(["queue", "create"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={`min-h-11 rounded-lg px-4 text-sm ${tab === value ? "bg-background font-semibold shadow-sm" : ""}`}
            onClick={() => setTab(value)}
          >
            {copy.tabs[value]}
          </button>
        ))}
      </div>
      {error && (
        <Banner icon={<AlertCircle className="h-4 w-4" />} tone="error">
          {error}
        </Banner>
      )}
      {notice && (
        <Banner icon={<CheckCircle2 className="h-4 w-4" />} tone="success">
          {notice}
        </Banner>
      )}
      <AppPageStates loading={loading} error={null}>
        {tab === "queue" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rows.length ? (
              rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {row.number} ·{" "}
                        {caseTypes.find((item) => item.value === row.case_type)
                          ?.label || row.case_type}
                      </p>
                      <h2 className="mt-1 font-semibold">{row.subject}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.requester_name || "—"} ·{" "}
                        {formatBusinessDateTime(new Date(row.due_at))}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {copy.states[row.state] || row.state}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{row.description}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Field
                      label={copy.fields.communication}
                      value={notes[row.id] || ""}
                      set={(value) => setNotes({ ...notes, [row.id]: value })}
                    />
                    <button
                      className="case-secondary self-end"
                      disabled={
                        saving || (notes[row.id] || "").trim().length < 2
                      }
                      onClick={() =>
                        void run(() =>
                          addCommunication({
                            case_id: row.id,
                            body: notes[row.id],
                            idempotency_key: `note:${row.id}:${notes[row.id]}`,
                          }),
                        )
                      }
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      {copy.actions.addCommunication}
                    </button>
                    <Field
                      label={copy.fields.resolution}
                      value={resolutions[row.id] || ""}
                      set={(value) =>
                        setResolutions({ ...resolutions, [row.id]: value })
                      }
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <button
                        className="case-secondary"
                        disabled={saving}
                        onClick={() =>
                          void run(() =>
                            handoffCase({
                              case_id: row.id,
                              idempotency_key: `handoff:${row.id}`,
                            }),
                          )
                        }
                      >
                        {copy.actions.handoff}
                      </button>
                      <button
                        className="case-primary"
                        disabled={
                          saving ||
                          (resolutions[row.id] || "").trim().length < 10
                        }
                        onClick={() =>
                          void run(() =>
                            resolveCase({
                              case_id: row.id,
                              resolution: resolutions[row.id],
                              idempotency_key: `resolve:${row.id}`,
                            }),
                          )
                        }
                      >
                        {copy.actions.resolve}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                {copy.empty}
              </div>
            )}
          </div>
        ) : (
          <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={copy.fields.subject}
                value={draft.subject}
                set={(value) => setDraft({ ...draft, subject: value })}
              />
              <Select
                label={copy.fields.type}
                value={draft.case_type}
                options={caseTypes}
                set={(value) => setDraft({ ...draft, case_type: value })}
              />
              <Select
                label={copy.fields.priority}
                value={draft.priority}
                options={Object.entries(copy.priorities).map(
                  ([value, label]) => ({ value, label }),
                )}
                set={(value) => setDraft({ ...draft, priority: value })}
              />
              <Select
                label={copy.fields.privacy}
                value={draft.privacy_level}
                options={Object.entries(copy.privacy).map(([value, label]) => ({
                  value,
                  label,
                }))}
                set={(value) => setDraft({ ...draft, privacy_level: value })}
              />
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                <span>{copy.fields.description}</span>
                <textarea
                  className="min-h-28 rounded-lg border bg-background p-3"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </label>
              {contexts.map((context) => (
                <div className="sm:col-span-2" key={context.key}>
                  <CrossAppRecordPicker
                    label={context.label}
                    description={context.description}
                    placeholder={context.placeholder}
                    emptyText={context.emptyText}
                    unavailableText={context.unavailableText}
                    forbiddenText={context.forbiddenText}
                    selected={selected[context.key] || null}
                    onSelect={(value) =>
                      setSelected({ ...selected, [context.key]: value })
                    }
                    loadPage={context.loadPage}
                  />
                </div>
              ))}
              <button
                className="case-primary sm:col-span-2"
                disabled={
                  saving ||
                  draft.subject.trim().length < 3 ||
                  draft.description.trim().length < 5 ||
                  contexts.some((context) => !selected[context.key])
                }
                onClick={() => void create()}
              >
                <Plus className="h-4 w-4" />
                {copy.actions.create}
              </button>
            </div>
          </section>
        )}
      </AppPageStates>
      {help && (
        <aside
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-auto border-l bg-background p-5 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-help-title"
        >
          <header className="flex items-center justify-between">
            <h2 id="case-help-title" className="text-xl font-semibold">
              {copy.helpTitle}
            </h2>
            <button
              aria-label={copy.actions.close}
              onClick={() => setHelp(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          {copy.help.map((paragraph, index) => (
            <p
              className="mt-4 text-sm leading-6 text-muted-foreground"
              key={index}
            >
              {paragraph}
            </p>
          ))}
        </aside>
      )}
    </AppPage>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <strong className="text-2xl">{value}</strong>
      <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
    </article>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span>{label}</span>
      <input
        className="min-h-11 rounded-lg border bg-background px-3"
        value={value}
        onChange={(event) => set(event.target.value)}
      />
    </label>
  );
}
function Select({
  label,
  value,
  options,
  set,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  set: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span>{label}</span>
      <select
        className="min-h-11 rounded-lg border bg-background px-3"
        value={value}
        onChange={(event) => set(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Banner({
  icon,
  tone,
  children,
}: {
  icon: ReactNode;
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${tone === "error" ? "border-destructive/30 text-destructive" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
    >
      {icon}
      {children}
    </div>
  );
}
