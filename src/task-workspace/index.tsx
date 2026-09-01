import { formatBusinessDateTime } from '@genispace/geniapp/hooks';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FileCheck2,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { AppCheckboxInput, AppDatePicker, AppDateTimePicker, AppModal, AppPage, AppPageStates, AppSelectInput } from "@genispace/geniapp/ui";
import {
  CrossAppRecordPicker,
  type CrossAppRecordOption,
  type CrossAppRecordPage,
} from "@genispace/geniapp/hooks";
import {
  calculateReconciliation,
  createIdempotencyKey,
  filterBusinessRecords,
  validateRecordDraft,
  validateTransition,
  type BusinessFieldValue,
  type TransitionMap,
} from "./domain";
import {
  availableRecordTypes,
  experiencePolicyConfiguration,
  readExperienceConfiguration,
  type WorkspaceExperience,
  type WorkspaceExperienceLevel,
} from "./experience";

export {
  availableRecordTypes,
  createWorkspaceExperience,
  experiencePolicyConfiguration,
  readExperienceConfiguration,
} from "./experience";
export type { WorkspaceExperience, WorkspaceExperienceLevel, WorkspaceRecordProfile } from "./experience";

export {
  calculateReconciliation,
  createIdempotencyKey,
  filterBusinessRecords,
  validateRecordDraft,
  validateTransition,
} from "./domain";

export type WorkspaceRecord = {
  id: string;
  number: string;
  record_type: string;
  name: string;
  description: string;
  state: string;
  priority: string;
  source_label?: string;
  amount?: number | string;
  currency?: string;
  quantity?: number | string;
  unit?: string;
  due_at?: string;
  effective_from?: string;
  effective_to?: string;
  payload?: Record<string, unknown> | string;
  reconciliation_state?: string;
  open_reconciliations?: number | string;
  updated_at?: string;
};

export type WorkspacePolicy = {
  id: string;
  policy_type: string;
  code: string;
  name: string;
  region_code: string;
  version: number | string;
  state: string;
  threshold?: number | string;
  tolerance?: number | string;
  effective_from?: string;
  effective_to?: string;
  configuration?: Record<string, unknown> | string;
};

export type WorkspaceOption = {
  value: string;
  label: string;
  description?: string;
};

export type WorkspaceField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "datetime-local" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: WorkspaceOption[];
  help?: string;
};

export type WorkspaceContext = {
  providerApp: string;
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

export type TaskFlow = {
  id: string;
  title: string;
  description: string;
  recordTypes: string[];
  createLabel: string;
  emptyText: string;
};

export type TaskWorkspaceSpec = {
  locale: "en" | "zh";
  title: string;
  description: string;
  icon: LucideIcon;
  taskFlows: TaskFlow[];
  recordTypes: WorkspaceOption[];
  states: WorkspaceOption[];
  transitions: TransitionMap;
  fields: WorkspaceField[];
  policyTypes: WorkspaceOption[];
  context?: WorkspaceContext;
  finalStates: string[];
  help: Array<{ title: string; body: string; steps: string[] }>;
  experience: WorkspaceExperience;
  copy: {
    refresh: string;
    help: string;
    close: string;
    createRecord: string;
    createPolicy: string;
    queue: string;
    policies: string;
    allTypes: string;
    allStates: string;
    search: string;
    empty: string;
    loading: string;
    loadError: string;
    saveError: string;
    saved: string;
    fields: {
      type: string;
      name: string;
      description: string;
      priority: string;
      dueAt: string;
      source: string;
      state: string;
      updated: string;
      action: string;
      evidence: string;
      expected: string;
      actual: string;
      tolerance: string;
      resolution: string;
      policyType: string;
      code: string;
      region: string;
      version: string;
      effectiveFrom: string;
      threshold: string;
    };
    metrics: { active: string; review: string; exception: string; closed: string };
    metricsLabel: string;
    priorities: readonly WorkspaceOption[];
    actions: {
      save: string;
      cancel: string;
      advance: string;
      reconcile: string;
      select: string;
    };
    validation: string;
    evidenceHint: string;
    reconciliationHint: string;
    noNextAction: string;
    policyIntro: string;
  };
};

export type TaskWorkspaceApi = {
  queryRecords: () => Promise<WorkspaceRecord[]>;
  queryPolicies: () => Promise<WorkspacePolicy[]>;
  createRecord: (payload: Record<string, unknown>) => Promise<unknown>;
  transitionRecord: (payload: Record<string, unknown>) => Promise<unknown>;
  reconcileRecord: (payload: Record<string, unknown>) => Promise<unknown>;
  savePolicy: (payload: Record<string, unknown>) => Promise<unknown>;
};

type Panel = "record" | "policy" | "help" | "transition" | "reconcile" | null;

const nowRevision = () => new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

export function TaskWorkspace({
  spec,
  api,
  footer,
}: {
  spec: TaskWorkspaceSpec;
  api: TaskWorkspaceApi;
  footer?: ReactNode;
}) {
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [policies, setPolicies] = useState<WorkspacePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeFlowId, setActiveFlowId] = useState(spec.taskFlows[0]?.id || "work");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedRecord, setSelectedRecord] = useState<WorkspaceRecord | null>(null);
  const [selectedContext, setSelectedContext] = useState<CrossAppRecordOption | null>(null);
  const [filter, setFilter] = useState({ search: "", recordType: "", state: "" });
  const [draft, setDraft] = useState({
    recordType: spec.recordTypes[0]?.value || "work_item",
    name: "",
    description: "",
    priority: "normal",
    dueAt: "",
    values: Object.fromEntries(spec.fields.map((field) => [field.key, field.type === "select" ? field.options?.[0]?.value || "" : ""])) as Record<string, BusinessFieldValue>,
  });
  const [evidence, setEvidence] = useState("");
  const [transitionTarget, setTransitionTarget] = useState("");
  const [reconciliation, setReconciliation] = useState({ expected: "", actual: "", tolerance: "0", resolution: "" });
  const [policy, setPolicy] = useState({ policyType: spec.policyTypes[0]?.value || "default", code: "", name: "", region: "GLOBAL", version: "1", effectiveFrom: "", threshold: "0", tolerance: "0" });
  const [experienceLevel, setExperienceLevel] = useState<WorkspaceExperienceLevel>("standard");
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextRecords, nextPolicies] = await Promise.all([api.queryRecords(), api.queryPolicies()]);
      setRecords(nextRecords);
      setPolicies(nextPolicies);
      setActiveFlowId((current) => {
        const currentFlow = spec.taskFlows.find((flow) => flow.id === current);
        if (currentFlow && nextRecords.some((record) => currentFlow.recordTypes.includes(record.record_type))) return current;
        const flowWithWork = spec.taskFlows.find((flow) => nextRecords.some((record) => flow.recordTypes.includes(record.record_type)));
        return flowWithWork?.id || current;
      });
      const configuration = readExperienceConfiguration(nextPolicies, spec.experience);
      setExperienceLevel(configuration.experienceLevel);
      setEnabledFeatures(configuration.enabledFeatures);
    } catch (reason) {
      setError(`${spec.copy.loadError}: ${(reason as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [api, spec.copy.loadError, spec.experience, spec.taskFlows]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (operation: () => Promise<unknown>) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(spec.copy.saved);
      setPanel(null);
      setSelectedRecord(null);
      setEvidence("");
      await load();
    } catch (reason) {
      setError(`${spec.copy.saveError}: ${(reason as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const activeFlow = useMemo(
    () => spec.taskFlows.find((flow) => flow.id === activeFlowId) || spec.taskFlows[0],
    [activeFlowId, spec.taskFlows],
  );
  const flowRecords = useMemo(
    () => records.filter((record) => !activeFlow || activeFlow.recordTypes.includes(record.record_type)),
    [activeFlow, records],
  );
  const filteredRecords = useMemo(
    () => filterBusinessRecords(flowRecords, filter),
    [filter, flowRecords],
  );
  const creatableRecordTypes = useMemo(
    () => availableRecordTypes(spec.recordTypes, spec.experience, experienceLevel, enabledFeatures)
      .filter((recordType) => !activeFlow || activeFlow.recordTypes.includes(recordType.value)),
    [activeFlow, enabledFeatures, experienceLevel, spec.experience, spec.recordTypes],
  );
  useEffect(() => {
    if (creatableRecordTypes.length && !creatableRecordTypes.some((item) => item.value === draft.recordType)) {
      setDraft((current) => ({ ...current, recordType: creatableRecordTypes[0].value }));
    }
  }, [creatableRecordTypes, draft.recordType]);
  const activeThreshold = useMemo(() => policies
    .filter((item) => item.state === "active" && Number(item.threshold || 0) > 0)
    .map((item) => Number(item.threshold || 0))
    .at(-1) || 0, [policies]);
  const metrics = useMemo(() => ({
    active: flowRecords.filter((record) => !spec.finalStates.includes(record.state)).length,
    review: flowRecords.filter((record) => ["review", "submitted", "assessed", "triaged", "calculated"].includes(record.state)).length,
    exception: flowRecords.filter((record) => Number(record.open_reconciliations || 0) > 0 || ["exception", "quality_hold", "open"].includes(record.reconciliation_state || "") || (activeThreshold > 0 && Number(record.amount || record.quantity || 0) > activeThreshold)).length,
    closed: flowRecords.filter((record) => spec.finalStates.includes(record.state)).length,
  }), [activeThreshold, flowRecords, spec.finalStates]);

  const selectFlow = (flow: TaskFlow) => {
    setActiveFlowId(flow.id);
    setFilter({ search: "", recordType: "", state: "" });
    const firstType = availableRecordTypes(spec.recordTypes, spec.experience, experienceLevel, enabledFeatures)
      .find((recordType) => flow.recordTypes.includes(recordType.value));
    if (firstType) setDraft((current) => ({ ...current, recordType: firstType.value }));
  };

  const openTransition = (record: WorkspaceRecord) => {
    const target = spec.transitions[record.state]?.[0] || "";
    setSelectedRecord(record);
    setTransitionTarget(target);
    setEvidence("");
    setPanel("transition");
  };

  const openReconciliation = (record: WorkspaceRecord) => {
    setSelectedRecord(record);
    const activeTolerance = policies.filter((item) => item.state === "active").map((item) => Number(item.tolerance || 0)).at(-1) || 0;
    setReconciliation({ expected: String(record.amount || record.quantity || ""), actual: "", tolerance: String(activeTolerance), resolution: "" });
    setPanel("reconcile");
  };

  const createRecord = () => {
    const profile = spec.experience.recordProfiles[draft.recordType];
    const validation = validateRecordDraft(draft, profile?.requiredFieldKeys || spec.fields.filter((field) => field.required).map((field) => field.key));
    if (!validation.valid) {
      setError(`${spec.copy.validation}: ${validation.missing.join(", ")}`);
      return;
    }
    const revision = nowRevision();
    void run(() => api.createRecord({
      record_type: draft.recordType,
      name: draft.name.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      due_at: draft.dueAt || null,
      values: draft.values,
      source_app: selectedContext ? spec.context?.providerApp || null : null,
      source_object_ref: selectedContext?.id || null,
      source_label: selectedContext?.primary || null,
      idempotency_key: createIdempotencyKey("create", draft.name, revision),
    }));
  };

  const transition = () => {
    if (!selectedRecord) return;
    const validation = validateTransition(selectedRecord.state, transitionTarget, spec.transitions);
    if (!validation.allowed || evidence.trim().length < 10) {
      setError(spec.copy.evidenceHint);
      return;
    }
    void run(() => api.transitionRecord({
      record_id: selectedRecord.id,
      target_state: transitionTarget,
      evidence_note: evidence.trim(),
      idempotency_key: createIdempotencyKey("transition", selectedRecord.number, `${selectedRecord.state}-${transitionTarget}`),
    }));
  };

  const reconcile = () => {
    if (!selectedRecord) return;
    let result;
    try {
      result = calculateReconciliation(Number(reconciliation.expected), Number(reconciliation.actual), Number(reconciliation.tolerance), reconciliation.resolution);
    } catch (reason) {
      setError((reason as Error).message);
      return;
    }
    if (result.state === "open") {
      setError(spec.copy.reconciliationHint);
      return;
    }
    void run(() => api.reconcileRecord({
      record_id: selectedRecord.id,
      reconciliation_type: selectedRecord.record_type,
      expected_value: Number(reconciliation.expected),
      actual_value: Number(reconciliation.actual),
      tolerance: Number(reconciliation.tolerance),
      resolution: reconciliation.resolution.trim(),
      idempotency_key: createIdempotencyKey("reconcile", selectedRecord.number, nowRevision()),
    }));
  };

  const savePolicy = () => {
    const code = policy.code.trim() || `${policy.policyType}-SETTINGS`;
    if (policy.name.trim().length < 3 || !policy.effectiveFrom) {
      setError(spec.copy.validation);
      return;
    }
    void run(() => api.savePolicy({
      policy_type: policy.policyType,
      code: code.toUpperCase(),
      name: policy.name.trim(),
      region_code: policy.region.trim().toUpperCase() || "GLOBAL",
      version: Number(policy.version),
      effective_from: policy.effectiveFrom,
      threshold: Number(policy.threshold),
      tolerance: Number(policy.tolerance),
      configuration: experiencePolicyConfiguration(experienceLevel, enabledFeatures, spec.experience),
      idempotency_key: createIdempotencyKey("policy", code, policy.version),
    }));
  };

  return (
    <AppPage
      title={spec.title}
      description={spec.description}
      icon={spec.icon}
      actions={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Action onClick={() => setPanel("help")}><HelpCircle className="h-4 w-4" />{spec.copy.help}</Action>
          <Action onClick={() => void load()}><RefreshCw className="h-4 w-4" />{spec.copy.refresh}</Action>
          <Action onClick={() => setPanel("policy")}><Settings2 className="h-4 w-4" />{spec.copy.createPolicy}</Action>
          <Action primary onClick={() => setPanel("record")}><Plus className="h-4 w-4" />{activeFlow?.createLabel || spec.copy.createRecord}</Action>
        </div>
      }
    >
      {error && <Banner tone="error"><AlertCircle className="h-4 w-4" />{error}</Banner>}
      {notice && <Banner tone="success"><CheckCircle2 className="h-4 w-4" />{notice}</Banner>}
      <nav className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label={spec.title}>
        {spec.taskFlows.map((flow) => {
          const selected = flow.id === activeFlow?.id;
          const count = records.filter((record) => flow.recordTypes.includes(record.record_type) && !spec.finalStates.includes(record.state)).length;
          return <button key={flow.id} type="button" aria-current={selected ? "page" : undefined} onClick={() => selectFlow(flow)} className={`min-h-[112px] rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/35"}`}>
            <span className="flex items-start justify-between gap-3"><strong className="text-sm">{flow.title}</strong><span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">{count}</span></span>
            <span className="mt-2 block text-sm leading-6 text-muted-foreground">{flow.description}</span>
          </button>;
        })}
      </nav>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={spec.copy.metricsLabel}>
        {(Object.keys(metrics) as Array<keyof typeof metrics>).map((key) => (
          <article key={key} className="rounded-xl bg-muted/45 px-4 py-4">
            <strong className="block text-2xl tabular-nums">{metrics[key]}</strong>
            <span className="mt-1 block text-xs font-medium text-muted-foreground">{spec.copy.metrics[key]}</span>
          </article>
        ))}
      </section>
      <section className="mt-5 rounded-2xl border bg-card p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_12rem_12rem]">
          <label className="relative block">
            <span className="sr-only">{spec.copy.search}</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input className="enterprise-input min-h-[44px] pl-9" value={filter.search} placeholder={spec.copy.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} />
          </label>
          <AppSelectInput aria-label={spec.copy.allTypes} className="enterprise-input min-h-[44px]" value={filter.recordType} onChange={(event) => setFilter({ ...filter, recordType: event.target.value })}>
            <option value="">{spec.copy.allTypes}</option>
            {spec.recordTypes.filter((option) => !activeFlow || activeFlow.recordTypes.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </AppSelectInput>
          <AppSelectInput aria-label={spec.copy.allStates} className="enterprise-input min-h-[44px]" value={filter.state} onChange={(event) => setFilter({ ...filter, state: event.target.value })}>
            <option value="">{spec.copy.allStates}</option>
            {spec.states.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </AppSelectInput>
        </div>
      </section>
      <AppPageStates loading={loading} error={null}>
        <section className="mt-4 grid gap-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border bg-card">
            <div className="border-b px-4 py-3"><h2 className="font-semibold">{activeFlow?.title || spec.copy.queue}</h2>{activeFlow?.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{activeFlow.description}</p>}</div>
            {filteredRecords.length ? (
              <div className="divide-y">
                {filteredRecords.map((record) => {
                  const next = spec.transitions[record.state] || [];
                  const profile = spec.experience.recordProfiles[record.record_type];
                  return (
                    <article key={record.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums">{record.number}</span>
                          <span>{spec.recordTypes.find((item) => item.value === record.record_type)?.label || record.record_type}</span>
                          <StateBadge label={spec.states.find((item) => item.value === record.state)?.label || record.state} />
                        </div>
                        <h3 className="mt-1 truncate font-semibold">{record.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{record.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{record.source_label || "—"} · {record.updated_at ? formatBusinessDateTime(new Date(record.updated_at)) : "—"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {profile?.supportsReconciliation && <Action onClick={() => openReconciliation(record)}><FileCheck2 className="h-4 w-4" />{spec.copy.actions.reconcile}</Action>}
                        <Action primary disabled={!next.length} onClick={() => openTransition(record)}>{next.length ? spec.copy.actions.advance : spec.copy.noNextAction}<ArrowRight className="h-4 w-4" /></Action>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="p-12 text-center text-sm text-muted-foreground">{activeFlow?.emptyText || spec.copy.empty}</div>}
          </div>
          <details className="group rounded-2xl border bg-card p-4">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span><strong className="block text-sm">{spec.copy.policies}</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">{spec.copy.policyIntro}</span></span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
            <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2 xl:grid-cols-3">
              {policies.map((item) => (
                <article key={item.id} className="rounded-xl bg-muted/45 p-3">
                  <div className="flex items-center justify-between gap-2"><strong className="text-sm">{item.name}</strong><StateBadge label={item.state} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.code} · {item.region_code} · v{item.version}</p>
                </article>
              ))}
              {!policies.length && <p className="text-sm text-muted-foreground">{spec.copy.empty}</p>}
            </div>
          </details>
        </section>
      </AppPageStates>
      {footer}
      {panel === "record" && (
        <Drawer title={activeFlow?.createLabel || spec.copy.createRecord} closeLabel={spec.copy.close} close={() => setPanel(null)}>
          <div className="grid gap-4">
            <SelectField label={spec.copy.fields.type} value={draft.recordType} options={creatableRecordTypes} set={(value) => setDraft({ ...draft, recordType: value })} />
            {spec.context && <CrossAppRecordPicker label={spec.context.label} description={spec.context.description} placeholder={spec.context.placeholder} emptyText={spec.context.emptyText} unavailableText={spec.context.unavailableText} forbiddenText={spec.context.forbiddenText} loadPage={spec.context.loadPage} selected={selectedContext} onSelect={setSelectedContext} />}
            <TextField label={spec.copy.fields.name} value={draft.name} set={(value) => setDraft({ ...draft, name: value })} required />
            <TextField label={spec.copy.fields.description} type="textarea" value={draft.description} set={(value) => setDraft({ ...draft, description: value })} required />
            {(() => {
              const profile = spec.experience.recordProfiles[draft.recordType];
              const fieldKeys = new Set(profile?.fieldKeys || spec.fields.map((field) => field.key));
              const advancedKeys = new Set(profile?.advancedFieldKeys || []);
              const primaryFields = spec.fields.filter((field) => fieldKeys.has(field.key) && !advancedKeys.has(field.key));
              const advancedFields = spec.fields.filter((field) => fieldKeys.has(field.key) && advancedKeys.has(field.key));
              const renderField = (field: WorkspaceField) => <DynamicField key={field.key} locale={spec.locale} field={{ ...field, required: profile?.requiredFieldKeys.includes(field.key) ?? field.required }} value={draft.values[field.key]} set={(value) => setDraft({ ...draft, values: { ...draft.values, [field.key]: value } })} />;
              return <>
                {primaryFields.map(renderField)}
                <details className="group rounded-xl border bg-muted/20 p-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span><span className="block text-sm">{spec.experience.copy.advancedOptions}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{spec.experience.copy.advancedOptionsHint}</span></span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 grid gap-4 border-t pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField label={spec.copy.fields.priority} value={draft.priority} options={spec.copy.priorities} set={(value) => setDraft({ ...draft, priority: value })} />
                      <TextField label={spec.copy.fields.dueAt} type="date" locale={spec.locale} value={draft.dueAt} set={(value) => setDraft({ ...draft, dueAt: value })} />
                    </div>
                    {advancedFields.map(renderField)}
                  </div>
                </details>
              </>;
            })()}
            <PanelActions copy={spec.copy} saving={saving} cancel={() => setPanel(null)} save={createRecord} />
          </div>
        </Drawer>
      )}
      {panel === "policy" && (
        <Drawer title={spec.copy.createPolicy} closeLabel={spec.copy.close} close={() => setPanel(null)}>
          <div className="grid gap-4">
            <SelectField label={spec.copy.fields.policyType} value={policy.policyType} options={spec.policyTypes} set={(value) => setPolicy({ ...policy, policyType: value })} />
            <TextField label={spec.copy.fields.name} value={policy.name} set={(value) => setPolicy({ ...policy, name: value })} required />
            <TextField label={spec.copy.fields.effectiveFrom} type="date" locale={spec.locale} value={policy.effectiveFrom} set={(value) => setPolicy({ ...policy, effectiveFrom: value })} required />
            <div className="rounded-xl bg-muted/35 p-4">
              <SelectField label={spec.experience.copy.experienceLevel} value={experienceLevel} options={[
                { value: "basic", label: spec.experience.copy.basic },
                { value: "standard", label: spec.experience.copy.standard },
                { value: "advanced", label: spec.experience.copy.advanced },
              ]} set={(value) => setExperienceLevel(value as WorkspaceExperienceLevel)} />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{spec.experience.copy.experienceLevelHint}</p>
            </div>
            {!!spec.experience.capabilities.length && <fieldset className="rounded-xl border p-4">
              <legend className="px-1 text-sm font-semibold">{spec.experience.copy.optionalCapabilities}</legend>
              <p className="mb-3 text-xs leading-5 text-muted-foreground">{spec.experience.copy.optionalCapabilitiesHint}</p>
              <div className="grid gap-3">{spec.experience.capabilities.map((capability) => <label key={capability.key} className="flex min-h-[44px] items-start gap-3 rounded-lg bg-muted/35 p-3 text-sm">
                <AppCheckboxInput className="mt-1" checked={enabledFeatures.has(capability.key)} onChange={(event) => setEnabledFeatures((current) => { const next = new Set(current); if (event.target.checked) next.add(capability.key); else next.delete(capability.key); return next; })} />
                <span><strong className="block">{capability.label}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{capability.description}</span></span>
              </label>)}</div>
            </fieldset>}
            <details className="group rounded-xl border bg-muted/20 p-3">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium"><span>{spec.experience.copy.advancedOptions}</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
              <div className="mt-3 grid gap-4 border-t pt-4 sm:grid-cols-2">
                <TextField label={spec.copy.fields.region} value={policy.region} set={(value) => setPolicy({ ...policy, region: value })} />
                <TextField label={spec.copy.fields.code} value={policy.code} set={(value) => setPolicy({ ...policy, code: value })} />
                <TextField label={spec.copy.fields.version} type="number" value={policy.version} set={(value) => setPolicy({ ...policy, version: value })} />
                <TextField label={spec.copy.fields.threshold} type="number" value={policy.threshold} set={(value) => setPolicy({ ...policy, threshold: value })} />
                <TextField label={spec.copy.fields.tolerance} type="number" value={policy.tolerance} set={(value) => setPolicy({ ...policy, tolerance: value })} />
              </div>
            </details>
            <PanelActions copy={spec.copy} saving={saving} cancel={() => setPanel(null)} save={savePolicy} />
          </div>
        </Drawer>
      )}
      {panel === "transition" && selectedRecord && (
        <Drawer title={`${spec.copy.actions.advance} · ${selectedRecord.number}`} closeLabel={spec.copy.close} close={() => setPanel(null)}>
          <div className="grid gap-4">
            <SelectField label={spec.copy.fields.state} value={transitionTarget} options={(spec.transitions[selectedRecord.state] || []).map((value) => ({ value, label: spec.states.find((item) => item.value === value)?.label || value }))} set={setTransitionTarget} />
            <TextField label={spec.copy.fields.evidence} type="textarea" value={evidence} set={setEvidence} required />
            <p className="text-sm leading-6 text-muted-foreground">{spec.copy.evidenceHint}</p>
            <PanelActions copy={spec.copy} saving={saving} cancel={() => setPanel(null)} save={transition} />
          </div>
        </Drawer>
      )}
      {panel === "reconcile" && selectedRecord && (
        <Drawer title={`${spec.copy.actions.reconcile} · ${selectedRecord.number}`} closeLabel={spec.copy.close} close={() => setPanel(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={spec.copy.fields.expected} type="number" value={reconciliation.expected} set={(value) => setReconciliation({ ...reconciliation, expected: value })} required />
            <TextField label={spec.copy.fields.actual} type="number" value={reconciliation.actual} set={(value) => setReconciliation({ ...reconciliation, actual: value })} required />
            <TextField label={spec.copy.fields.tolerance} type="number" value={reconciliation.tolerance} set={(value) => setReconciliation({ ...reconciliation, tolerance: value })} required />
            <div />
            <div className="sm:col-span-2"><TextField label={spec.copy.fields.resolution} type="textarea" value={reconciliation.resolution} set={(value) => setReconciliation({ ...reconciliation, resolution: value })} /></div>
            <div className="sm:col-span-2"><PanelActions copy={spec.copy} saving={saving} cancel={() => setPanel(null)} save={reconcile} /></div>
          </div>
        </Drawer>
      )}
      {panel === "help" && (
        <Drawer title={spec.copy.help} closeLabel={spec.copy.close} close={() => setPanel(null)}>
          <div className="grid gap-5">
            {spec.help.map((section, index) => (
              <section key={section.title} className="rounded-xl bg-muted/35 p-4">
                <p className="text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-1 font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
                <ol className="mt-3 grid gap-2 text-sm leading-6">{section.steps.map((step) => <li key={step} className="flex gap-2"><span className="text-muted-foreground">—</span><span>{step}</span></li>)}</ol>
              </section>
            ))}
          </div>
        </Drawer>
      )}
    </AppPage>
  );
}

function Action({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-background hover:bg-accent"}`}>{children}</button>;
}

function Banner({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={`my-4 flex items-center gap-2 rounded-xl border p-4 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{children}</div>;
}

function StateBadge({ label }: { label: string }) {
  return <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">{label}</span>;
}

function Drawer({ title, closeLabel, close, children }: { title: string; closeLabel: string; close: () => void; children: ReactNode }) {
  return <AppModal open onClose={close} title={title} closeLabel={closeLabel} size="lg">{children}</AppModal>;
}

function TextField({ label, value, set, type = "text", required = false, locale = "en" }: { label: string; value: string; set: (value: string) => void; type?: "text" | "number" | "date" | "datetime-local" | "textarea"; required?: boolean; locale?: string }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required ? " *" : ""}</span>{type === "textarea" ? <textarea className="enterprise-input min-h-[112px] resize-y" value={value} required={required} onChange={(event) => set(event.target.value)} /> : type === "date" ? <AppDatePicker value={value} onChange={set} locale={locale} clearable={!required} aria-label={label} popoverLayer="aboveModal" /> : type === "datetime-local" ? <AppDateTimePicker value={value} onChange={set} locale={locale} clearable={!required} aria-label={label} popoverLayer="aboveModal" /> : <input className="enterprise-input min-h-[44px]" type={type} value={value} required={required} onChange={(event) => set(event.target.value)} />}</label>;
}

function SelectField({ label, value, options, set }: { label: string; value: string; options: readonly WorkspaceOption[]; set: (value: string) => void }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><AppSelectInput className="enterprise-input min-h-[44px]" value={value} onChange={(event) => set(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</AppSelectInput></label>;
}

function DynamicField({ field, value, set, locale }: { field: WorkspaceField; value: BusinessFieldValue | undefined; set: (value: BusinessFieldValue) => void; locale: string }) {
  if (field.type === "select") return <div><SelectField label={field.label} value={String(value || field.options?.[0]?.value || "")} options={field.options || []} set={set} />{field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}</div>;
  return <div><TextField label={field.label} type={field.type} locale={locale} value={String(value ?? "")} set={(next) => set(field.type === "number" && next !== "" ? Number(next) : next)} required={field.required} />{field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}</div>;
}

function PanelActions({ copy, saving, cancel, save }: { copy: TaskWorkspaceSpec["copy"]; saving: boolean; cancel: () => void; save: () => void }) {
  return <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Action onClick={cancel}>{copy.actions.cancel}</Action><Action primary disabled={saving} onClick={save}>{copy.actions.save}</Action></div>;
}
