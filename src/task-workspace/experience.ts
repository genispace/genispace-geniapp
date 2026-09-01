import type { WorkspaceField, WorkspaceOption } from "./index";

export type WorkspaceExperienceLevel = "basic" | "standard" | "advanced";

export type WorkspaceRecordProfile = {
  level: WorkspaceExperienceLevel;
  fieldKeys: string[];
  advancedFieldKeys: string[];
  requiredFieldKeys: string[];
  supportsReconciliation: boolean;
  capabilityKey?: string;
};

export type WorkspaceCapability = {
  key: string;
  label: string;
  description: string;
  recordTypes: string[];
  defaultEnabled: boolean;
};

export type WorkspaceExperience = {
  applicationId: string;
  recordProfiles: Record<string, WorkspaceRecordProfile>;
  capabilities: WorkspaceCapability[];
  copy: {
    advancedOptions: string;
    advancedOptionsHint: string;
    experienceLevel: string;
    experienceLevelHint: string;
    optionalCapabilities: string;
    optionalCapabilitiesHint: string;
    basic: string;
    standard: string;
    advanced: string;
    featureDisabled: string;
  };
};

type CatalogEntry = {
  basicTypes: string[];
  advancedTypes: string[];
  reconcileTypes: string[];
  advancedFields: string[];
  compact?: Record<string, string[]>;
};

// Product language and progressive disclosure belong to the shared interaction
// contract. Business states, permissions and transaction checks remain owned by
// each GeniApp.
const catalog: Record<string, CatalogEntry> = {
  "enterprise-performance-management": {
    basicTypes: ["budget", "forecast", "variance"],
    advancedTypes: ["allocation", "consolidation", "profitability"],
    reconcileTypes: ["budget", "forecast", "consolidation", "profitability", "variance"],
    advancedFields: ["driver_value"],
    compact: { driver: ["planning_basis", "legal_entity_code", "fiscal_period", "scenario_code", "driver_value"] },
  },
  "product-lifecycle-management": {
    basicTypes: ["item_revision", "engineering_change", "specification"],
    advancedTypes: ["cost_release", "retirement"],
    reconcileTypes: ["bom", "routing", "cost_release"],
    advancedFields: ["quantity", "unit"],
    compact: { retirement: ["product_code", "revision", "effective_from", "change_reason"] },
  },
  "supply-chain-planning": {
    basicTypes: ["demand_signal", "forecast", "demand_plan", "exception"],
    advancedTypes: ["capacity_plan", "mrp_run", "accuracy_review"],
    reconcileTypes: ["forecast", "demand_plan", "supply_plan", "capacity_plan", "accuracy_review"],
    advancedFields: ["confidence"],
    compact: { exception: ["market_code", "location_code", "product_code", "quantity", "unit"] },
  },
  "manufacturing-operations": {
    basicTypes: ["production_order", "operation", "completion"],
    advancedTypes: ["batch_genealogy", "cost_variance"],
    reconcileTypes: ["material_issue", "material_return", "labor_report", "completion", "cost_variance"],
    advancedFields: ["revision", "planned_end"],
    compact: { labor_report: ["plant_code", "batch_number", "quantity", "unit", "planned_start"] },
  },
  "quality-management": {
    basicTypes: ["inspection_plan", "inspection", "nonconformance"],
    advancedTypes: ["supplier_quality", "capa", "verification"],
    reconcileTypes: ["inspection", "nonconformance", "disposition", "verification"],
    advancedFields: ["sample_size", "defect_quantity", "disposition_code"],
    compact: { quarantine: ["product_code", "lot_number", "disposition_code"] },
  },
  "discovery-service-mapping": {
    basicTypes: ["source_connection", "discovery_schedule", "discovery_run", "finding"],
    advancedTypes: ["pattern", "identification_result", "topology_map", "retry"],
    reconcileTypes: ["discovery_run", "identification_result", "topology_map"],
    advancedFields: ["credential_reference", "timeout_minutes"],
    compact: { finding: ["source_type", "scope", "service_code"] },
  },
  "event-management": {
    basicTypes: ["raw_event", "normalized_event", "alert", "service_impact"],
    advancedTypes: ["correlation_group", "suppression_rule", "post_event_review"],
    reconcileTypes: ["correlation_group", "service_impact", "post_event_review"],
    advancedFields: ["correlation_key"],
    compact: { post_event_review: ["source_code", "service_code", "occurred_at", "summary"] },
  },
  "software-asset-management": {
    basicTypes: ["software_model", "entitlement", "installation", "renewal"],
    advancedTypes: ["usage_measurement", "license_position", "compliance_review"],
    reconcileTypes: ["entitlement", "usage_measurement", "license_position", "renewal", "compliance_review"],
    advancedFields: ["amount", "currency"],
    compact: { installation: ["publisher", "product_name", "edition_version"] },
  },
  "field-service-management": {
    basicTypes: ["work_order", "appointment", "dispatch", "work_log"],
    advancedTypes: ["travel", "billing_handoff", "follow_up"],
    reconcileTypes: ["part_usage", "billing_handoff"],
    advancedFields: ["part_code"],
    compact: { customer_signature: ["customer_or_site", "asset_tag", "resolution_target"] },
  },
  "security-operations": {
    basicTypes: ["security_event", "security_incident", "vulnerability"],
    advancedTypes: ["exposure", "evidence", "post_incident_review"],
    reconcileTypes: ["recovery_task", "post_incident_review"],
    advancedFields: ["evidence_reference"],
    compact: { evidence: ["detection_source", "affected_service", "detected_at", "evidence_reference"] },
  },
  "risk-compliance-audit": {
    basicTypes: ["risk", "control", "assessment", "remediation"],
    advancedTypes: ["audit", "residual_risk", "continuity_plan"],
    reconcileTypes: ["control_test", "audit", "remediation", "residual_risk"],
    advancedFields: ["test_evidence", "remediation_due"],
    compact: { policy: ["risk_domain", "business_entity", "control_code", "owner"] },
  },
  "sustainability-management": {
    basicTypes: ["activity_data", "calculation", "target", "initiative"],
    advancedTypes: ["allocation", "disclosure", "assurance_evidence"],
    reconcileTypes: ["calculation", "allocation", "target", "disclosure"],
    advancedFields: ["factor_version", "evidence_reference"],
    compact: { emission_factor: ["scope", "activity_category", "unit", "factor_version", "reporting_period"] },
  },
  "service-configuration": {
    basicTypes: ["configuration_item", "ci_relationship", "business_service", "quality_issue"],
    advancedTypes: ["ci_class", "ci_model", "reconciliation_rule"],
    reconcileTypes: ["reconciliation_rule", "quality_issue"],
    advancedFields: ["correlation_key", "owner_group"],
    compact: { business_service: ["service_code", "environment", "criticality", "owner_group"] },
  },
  "talent-management": {
    basicTypes: ["requisition", "application", "offer", "onboarding", "goal", "review"],
    advancedTypes: ["succession_slate", "appeal"],
    reconcileTypes: ["goal", "review", "learning_assignment", "appeal"],
    advancedFields: ["appeal_window_days", "evidence_reference"],
    compact: { goal: ["process_stage", "effective_date", "accountable_owner", "target_outcome"] },
  },
  crm: {
    basicTypes: ["customer_360", "consent", "opportunity_outcome", "service_relationship"],
    advancedTypes: ["commercial_attribution", "quote_handoff", "order_handoff"],
    reconcileTypes: ["opportunity_outcome", "quote_handoff", "order_handoff", "commercial_attribution"],
    advancedFields: ["provider_receipt"],
    compact: { consent: ["relationship_type", "customer_number", "consent_purpose", "consent_version"] },
  },
  product: {
    basicTypes: ["commercial_variant", "assortment_release", "regional_effectivity", "lifecycle_event"],
    advancedTypes: ["engineering_release", "quality_spec_link", "product_retirement"],
    reconcileTypes: ["assortment_release", "engineering_release", "product_retirement"],
    advancedFields: ["quality_specification", "retirement_reason"],
    compact: { regional_effectivity: ["commercial_product_code", "variant_code", "market_scope", "effective_from"] },
  },
  "retail-crm": {
    basicTypes: ["commerce_touchpoint", "consent_evidence", "service_outcome"],
    advancedTypes: ["brand_access", "commercial_attribution", "pos_receipt"],
    reconcileTypes: ["fulfillment_outcome", "pos_receipt", "service_outcome"],
    advancedFields: ["consent_version", "attribution_rule"],
    compact: { consent_evidence: ["channel_family", "member_number", "consent_purpose", "consent_version"] },
  },
  "short-drama": {
    basicTypes: ["delivery_package", "acceptance", "revision_request"],
    advancedTypes: ["rights_clearance", "distribution_receipt", "production_outcome"],
    reconcileTypes: ["acceptance", "distribution_receipt", "production_outcome"],
    advancedFields: ["provider_receipt", "expected_units", "accepted_units"],
    compact: { rights_clearance: ["production_project_code", "delivery_version", "rights_reference"] },
  },
};

export function createWorkspaceExperience(
  applicationId: string,
  locale: "zh" | "en",
  recordTypes: readonly WorkspaceOption[],
  fields: readonly WorkspaceField[],
): WorkspaceExperience {
  const entry = catalog[applicationId];
  const allFieldKeys = fields.map((field) => field.key);
  const basicTypes = new Set(entry?.basicTypes ?? recordTypes.slice(0, 2).map((item) => item.value));
  const advancedTypes = new Set(entry?.advancedTypes ?? []);
  const reconcileTypes = new Set(entry?.reconcileTypes ?? []);
  const advancedFields = new Set(entry?.advancedFields ?? []);
  const advancedTypeLabels = recordTypes.filter((item) => advancedTypes.has(item.value)).map((item) => item.label);
  const recordProfiles = Object.fromEntries(recordTypes.map((type) => {
    const fieldKeys = entry?.compact?.[type.value] ?? allFieldKeys;
    const advancedFieldKeys = fieldKeys.filter((key) => advancedFields.has(key));
    const requiredFieldKeys = fields
      .filter((field) => field.required && fieldKeys.includes(field.key) && !advancedFields.has(field.key))
      .map((field) => field.key);
    const level: WorkspaceExperienceLevel = basicTypes.has(type.value) ? "basic" : advancedTypes.has(type.value) ? "advanced" : "standard";
    return [type.value, {
      level,
      fieldKeys,
      advancedFieldKeys,
      requiredFieldKeys,
      supportsReconciliation: reconcileTypes.has(type.value),
      capabilityKey: advancedTypes.has(type.value) ? "specialized_scenarios" : undefined,
    } satisfies WorkspaceRecordProfile];
  }));
  return {
    applicationId,
    recordProfiles,
    capabilities: advancedTypes.size ? [{
      key: "specialized_scenarios",
      label: locale === "zh" ? "启用特定业务场景" : "Enable specialized scenarios",
      description: locale === "zh"
        ? `仅在团队确实需要时启用：${advancedTypeLabels.join("、")}。已有记录不会被删除。`
        : `Enable only when the team needs: ${advancedTypeLabels.join(", ")}. Existing records are never deleted.`,
      recordTypes: [...advancedTypes],
      defaultEnabled: false,
    }] : [],
    copy: locale === "zh" ? {
      advancedOptions: "更多选项",
      advancedOptionsHint: "这些信息只在当前场景需要时填写，不影响基本流程。",
      experienceLevel: "默认工作方式",
      experienceLevelHint: "“基础”只提供最常用入口；“标准”适合多数团队；“高级”仍需单独启用特定场景。",
      optionalCapabilities: "按需启用的场景",
      optionalCapabilitiesHint: "这里只控制是否提供入口，不会扩大任何人的数据权限。",
      basic: "基础",
      standard: "标准（推荐）",
      advanced: "高级",
      featureDisabled: "该场景尚未由业务管理员启用。",
    } : {
      advancedOptions: "More options",
      advancedOptionsHint: "Complete these only when this case needs them; the basic flow is unchanged.",
      experienceLevel: "Default way of working",
      experienceLevelHint: "Basic shows the most common entry points; Standard suits most teams; specialized scenarios still need explicit enablement.",
      optionalCapabilities: "Scenarios enabled when needed",
      optionalCapabilitiesHint: "This controls entry points only and never expands anyone's data access.",
      basic: "Basic",
      standard: "Standard (recommended)",
      advanced: "Advanced",
      featureDisabled: "A business administrator has not enabled this scenario.",
    },
  };
}

export function readExperienceConfiguration(policies: Array<{ state: string; effective_from?: string; configuration?: unknown }>, experience: WorkspaceExperience) {
  const today = new Date().toISOString().slice(0, 10);
  const candidate = policies
    .filter((policy) => policy.state === "active" && (!policy.effective_from || policy.effective_from <= today))
    .map((policy) => {
      if (typeof policy.configuration === "string") {
        try { return { ...policy, configuration: JSON.parse(policy.configuration) as Record<string, unknown> }; } catch { return { ...policy, configuration: {} }; }
      }
      return { ...policy, configuration: policy.configuration && typeof policy.configuration === "object" ? policy.configuration as Record<string, unknown> : {} };
    })
    .filter((policy) => "experience_level" in policy.configuration || "enabled_features" in policy.configuration)
    .at(-1);
  const level = candidate?.configuration.experience_level;
  const experienceLevel: WorkspaceExperienceLevel = level === "basic" || level === "advanced" ? level : "standard";
  const configured = Array.isArray(candidate?.configuration.enabled_features) ? candidate.configuration.enabled_features.filter((value): value is string => typeof value === "string") : [];
  const enabledFeatures = new Set(experience.capabilities.filter((item) => item.defaultEnabled).map((item) => item.key));
  configured.forEach((key) => enabledFeatures.add(key));
  return { experienceLevel, enabledFeatures };
}

export function availableRecordTypes(recordTypes: readonly WorkspaceOption[], experience: WorkspaceExperience, level: WorkspaceExperienceLevel, enabledFeatures: ReadonlySet<string>) {
  const rank = { basic: 0, standard: 1, advanced: 2 } as const;
  return recordTypes.filter((type) => {
    const profile = experience.recordProfiles[type.value];
    if (!profile) return true;
    if (rank[profile.level] > rank[level]) return false;
    return !profile.capabilityKey || enabledFeatures.has(profile.capabilityKey);
  });
}

export function experiencePolicyConfiguration(experienceLevel: WorkspaceExperienceLevel, enabledFeatures: ReadonlySet<string>, experience: WorkspaceExperience) {
  const enabled = experience.capabilities.filter((item) => enabledFeatures.has(item.key));
  const allowedLevels = experienceLevel === "basic" ? new Set(["basic"]) : experienceLevel === "standard" ? new Set(["basic", "standard"]) : new Set(["basic", "standard", "advanced"]);
  const enabledRecordTypes = Object.entries(experience.recordProfiles)
    .filter(([, profile]) => allowedLevels.has(profile.level) && (!profile.capabilityKey || enabledFeatures.has(profile.capabilityKey)))
    .map(([type]) => type);
  return { experience_level: experienceLevel, enabled_features: enabled.map((item) => item.key), enabled_record_types: enabledRecordTypes };
}
