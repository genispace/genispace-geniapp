export type OperatorLang = 'en' | 'zh';

export function normalizeOperatorLang(language: string | undefined): OperatorLang {
  const raw = (language || 'en').split('-')[0].toLowerCase();
  return raw.startsWith('zh') ? 'zh' : 'en';
}

type SchemaNode = Record<string, unknown>;

function isObject(v: unknown): v is SchemaNode {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function mergeSchemaLocale(base: unknown, patch: unknown): unknown {
  if (!isObject(base) || !isObject(patch)) {
    return base;
  }
  const out: SchemaNode = { ...base };
  if (patch.description !== undefined) {
    out.description = patch.description;
  }
  if (patch.title !== undefined) {
    out.title = patch.title;
  }
  if (patch.properties && isObject(base.properties)) {
    out.properties = { ...base.properties } as SchemaNode;
    const propsOut = out.properties as SchemaNode;
    const pProps = patch.properties;
    if (isObject(pProps)) {
      for (const [key, pPatch] of Object.entries(pProps)) {
        if (propsOut[key] && isObject(pPatch)) {
          propsOut[key] = mergeSchemaLocale(propsOut[key], pPatch) as unknown;
        }
      }
    }
  }
  if (patch.items && base.items !== undefined) {
    if (Array.isArray(base.items) && Array.isArray(patch.items)) {
      out.items = base.items.map((sub, i) => {
        const pEl = (patch.items as unknown[])[i];
        return pEl && isObject(pEl) ? mergeSchemaLocale(sub, pEl) : sub;
      });
    } else {
      out.items = mergeSchemaLocale(base.items, patch.items);
    }
  }
  for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
    const bArr = base[key];
    const pArr = patch[key];
    if (Array.isArray(bArr) && Array.isArray(pArr) && pArr.length) {
      out[key] = bArr.map((sub, i) => {
        const pEl = pArr[i];
        return pEl && isObject(pEl) ? mergeSchemaLocale(sub, pEl) : sub;
      });
    }
  }
  if (isObject(base.not) && isObject(patch.not)) {
    out.not = mergeSchemaLocale(base.not, patch.not);
  }
  if (
    isObject(base.additionalProperties) &&
    isObject(patch.additionalProperties)
  ) {
    out.additionalProperties = mergeSchemaLocale(
      base.additionalProperties,
      patch.additionalProperties
    );
  }
  return out;
}

function patchSchemaNodeHasContent(node: unknown): boolean {
  if (!isObject(node)) return false;
  if (node.title !== undefined || node.description !== undefined) return true;
  if (isObject(node.properties)) {
    for (const k of Object.keys(node.properties)) {
      if (patchSchemaNodeHasContent(node.properties[k])) return true;
    }
  }
  if (Array.isArray(node.items)) {
    for (const el of node.items) {
      if (el !== null && el !== undefined && patchSchemaNodeHasContent(el)) return true;
    }
  }
  for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
    const arr = node[key];
    if (Array.isArray(arr)) {
      for (const el of arr) {
        if (el !== null && el !== undefined && patchSchemaNodeHasContent(el)) return true;
      }
    }
  }
  if (isObject(node.not) && patchSchemaNodeHasContent(node.not)) return true;
  if (isObject(node.additionalProperties) && patchSchemaNodeHasContent(node.additionalProperties))
    return true;
  return false;
}

function pickLocaleTitle(canonical: SchemaNode, patch: SchemaNode): string | undefined {
  const ct = typeof canonical.title === 'string' ? canonical.title : undefined;
  const pt = patch.title !== undefined && typeof patch.title === 'string' ? patch.title : undefined;
  if (pt !== undefined && pt.length > 0) return pt;
  if (ct !== undefined && ct.length > 0) return ct;
  return undefined;
}

function pickLocaleDescription(canonical: SchemaNode, patch: SchemaNode): unknown {
  const cd = canonical.description;
  const pd = patch.description;
  if (pd !== undefined && pd !== null && String(pd).length > 0) return pd;
  if (cd !== undefined && cd !== null && String(cd).length > 0) return cd;
  return undefined;
}

export function syncSchemaLocalePatchWithCanonical(
  canonical: unknown,
  existingPatch: unknown
): Record<string, unknown> | undefined {
  if (!isObject(canonical)) return undefined;
  const p = isObject(existingPatch) ? existingPatch : {};
  const out: SchemaNode = {};

  const t = pickLocaleTitle(canonical, p);
  if (t !== undefined) out.title = t;
  const d = pickLocaleDescription(canonical, p);
  if (d !== undefined) out.description = d;

  if (isObject(canonical.properties)) {
    const pProps = isObject(p.properties) ? p.properties : {};
    const propsOut: SchemaNode = {};
    for (const key of Object.keys(canonical.properties)) {
      const sub = syncSchemaLocalePatchWithCanonical(canonical.properties[key], pProps[key]);
      if (sub !== undefined && patchSchemaNodeHasContent(sub)) {
        propsOut[key] = sub;
      }
    }
    if (Object.keys(propsOut).length > 0) {
      out.properties = propsOut;
    }
  }

  if (canonical.items !== undefined) {
    const pItems = p.items;
    if (Array.isArray(canonical.items)) {
      const pArr = Array.isArray(pItems) ? pItems : [];
      const outItems = canonical.items.map((sub, i) => {
        const el = syncSchemaLocalePatchWithCanonical(sub, pArr[i]);
        return el !== undefined && patchSchemaNodeHasContent(el) ? el : null;
      });
      if (outItems.some((x) => x !== null)) {
        out.items = outItems;
      }
    } else {
      const one = syncSchemaLocalePatchWithCanonical(canonical.items, pItems);
      if (one !== undefined && patchSchemaNodeHasContent(one)) {
        out.items = one;
      }
    }
  }

  for (const key of ['oneOf', 'anyOf', 'allOf'] as const) {
    const bArr = canonical[key];
    const pArr = p[key];
    if (Array.isArray(bArr) && bArr.length > 0) {
      const pList = Array.isArray(pArr) ? pArr : [];
      const built = bArr.map((sub, i) => {
        const el = syncSchemaLocalePatchWithCanonical(sub, pList[i]);
        return el !== undefined && patchSchemaNodeHasContent(el) ? el : null;
      });
      if (built.some((x) => x !== null)) {
        out[key] = built;
      }
    }
  }

  if (isObject(canonical.not)) {
    const n = syncSchemaLocalePatchWithCanonical(canonical.not, p.not);
    if (n !== undefined && patchSchemaNodeHasContent(n)) {
      out.not = n;
    }
  }
  if (isObject(canonical.additionalProperties)) {
    const ap = syncSchemaLocalePatchWithCanonical(
      canonical.additionalProperties,
      p.additionalProperties
    );
    if (ap !== undefined && patchSchemaNodeHasContent(ap)) {
      out.additionalProperties = ap;
    }
  }

  if (!patchSchemaNodeHasContent(out)) return undefined;
  return out;
}

export type CanonicalMethodForLocaleSync = {
  identifier: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
};

export function syncOperatorMetadataLocalesWithCanonicalSchemas(options: {
  metadata: Record<string, unknown>;
  methods: CanonicalMethodForLocaleSync[];
  operatorInputSchema?: unknown;
  operatorOutputSchema?: unknown;
}): Record<string, unknown> {
  const md: Record<string, unknown> = isObject(options.metadata) ? { ...options.metadata } : {};
  const localesRaw = md.locales;
  if (!isObject(localesRaw)) {
    return md;
  }
  const locales: SchemaNode = { ...(localesRaw as SchemaNode) };
  const validIds = new Set(options.methods.map((m) => m.identifier));
  const methodById = new Map(options.methods.map((m) => [m.identifier, m]));

  for (const localeKey of Object.keys(locales)) {
    const block = locales[localeKey];
    if (!isObject(block)) continue;
    const nextBlock: SchemaNode = { ...block };

    if (options.operatorInputSchema !== undefined) {
      const synced = syncSchemaLocalePatchWithCanonical(
        options.operatorInputSchema,
        nextBlock.inputSchema
      );
      if (synced) nextBlock.inputSchema = synced;
      else delete nextBlock.inputSchema;
    }
    if (options.operatorOutputSchema !== undefined) {
      const synced = syncSchemaLocalePatchWithCanonical(
        options.operatorOutputSchema,
        nextBlock.outputSchema
      );
      if (synced) nextBlock.outputSchema = synced;
      else delete nextBlock.outputSchema;
    }

    if (Array.isArray(block.methods)) {
      const kept: unknown[] = [];
      for (const row of block.methods) {
        if (!isObject(row) || typeof row.identifier !== 'string') continue;
        if (!validIds.has(row.identifier)) continue;
        const canon = methodById.get(row.identifier);
        if (!canon) continue;
        const nm: SchemaNode = { ...row };
        const inS = syncSchemaLocalePatchWithCanonical(canon.inputSchema, row.inputSchema);
        if (inS) nm.inputSchema = inS;
        else delete nm.inputSchema;
        const outS = syncSchemaLocalePatchWithCanonical(canon.outputSchema, row.outputSchema);
        if (outS) nm.outputSchema = outS;
        else delete nm.outputSchema;
        kept.push(nm);
      }
      nextBlock.methods = kept;
    }

    locales[localeKey] = nextBlock;
  }

  md.locales = locales;
  return md;
}

type LocaleMethodEntry = {
  identifier?: string;
  name?: string;
  description?: unknown;
  inputSchema?: unknown;
  outputSchema?: unknown;
};

export function stripTenantOperatorSystemConfigurationDeep(op: Record<string, unknown>): void {
  delete op.systemConfiguration;
  if (Array.isArray(op.methods)) {
    op.methods = op.methods.map((m) => {
      if (!isObject(m)) return m;
      const node = m as SchemaNode;
      const { systemConfiguration, ...rest } = node;
      void systemConfiguration;
      return rest;
    });
  }
  const uo = op.userOperator;
  if (isObject(uo)) {
    stripTenantOperatorSystemConfigurationDeep(uo as Record<string, unknown>);
  }
}

function userZhBlockHasContent(uoZh: SchemaNode | null): boolean {
  if (!uoZh) return false;
  return !!(
    uoZh.name ||
    (uoZh.description !== undefined && uoZh.description !== null) ||
    uoZh.inputSchema ||
    uoZh.outputSchema ||
    (Array.isArray(uoZh.methods) && uoZh.methods.length > 0)
  );
}

function mergeLinkedSystemLocalesIntoTenantOperator(op: Record<string, unknown>): void {
  const linked = op.linkedSystemMetadata;
  if (!isObject(linked)) {
    delete op.linkedSystemMetadata;
    return;
  }
  const lmeta = linked.metadata;
  if (!isObject(lmeta) || !isObject(lmeta.locales)) {
    delete op.linkedSystemMetadata;
    return;
  }
  const sysLocales = lmeta.locales as SchemaNode;
  const sysZh = isObject(sysLocales.zh) ? sysLocales.zh : null;
  if (!sysZh) {
    delete op.linkedSystemMetadata;
    return;
  }
  const userMeta = isObject(op.metadata) ? { ...op.metadata } : {};
  const userLocales = isObject(userMeta.locales) ? { ...userMeta.locales } : {};
  const userZh = isObject(userLocales.zh) ? (userLocales.zh as SchemaNode) : null;
  if (!userZhBlockHasContent(userZh)) {
    userLocales.zh = { ...sysZh };
    userMeta.locales = userLocales;
    op.metadata = userMeta;
  }
  delete op.linkedSystemMetadata;
}

function mergeZhLocaleIntoOperatorRecord(
  op: Record<string, unknown>,
  language: string | undefined
): void {
  if (normalizeOperatorLang(language) !== 'zh') {
    return;
  }
  const meta = op.metadata;
  if (!isObject(meta)) {
    return;
  }
  const locales = meta.locales;
  if (!isObject(locales)) {
    return;
  }
  const zh = locales.zh;
  if (!isObject(zh)) {
    return;
  }

  if (typeof zh.name === 'string' && zh.name) {
    op.name = zh.name;
  }
  if (zh.description !== undefined && zh.description !== null) {
    op.description = zh.description;
  }

  const zhMethods = zh.methods;
  if (Array.isArray(op.methods) && Array.isArray(zhMethods)) {
    const byId = new Map<string, LocaleMethodEntry>(
      zhMethods
        .filter((m): m is LocaleMethodEntry => isObject(m) && typeof m.identifier === 'string')
        .map((m) => [m.identifier as string, m])
    );
    op.methods = (op.methods as Record<string, unknown>[]).map((method) => {
      const id = method.identifier;
      const loc = typeof id === 'string' ? byId.get(id) : undefined;
      if (!loc) {
        return { ...method };
      }
      const nm = { ...method };
      if (typeof loc.name === 'string' && loc.name) {
        nm.name = loc.name;
      }
      if (loc.description !== undefined && loc.description !== null) {
        nm.description = loc.description as unknown;
      }
      if (loc.inputSchema && nm.inputSchema) {
        nm.inputSchema = mergeSchemaLocale(nm.inputSchema, loc.inputSchema);
      }
      if (loc.outputSchema && nm.outputSchema) {
        nm.outputSchema = mergeSchemaLocale(nm.outputSchema, loc.outputSchema);
      }
      return nm;
    }) as unknown as typeof op.methods;
  }

  if (zh.inputSchema && op.inputSchema) {
    op.inputSchema = mergeSchemaLocale(op.inputSchema, zh.inputSchema);
  }
  if (zh.outputSchema && op.outputSchema) {
    op.outputSchema = mergeSchemaLocale(op.outputSchema, zh.outputSchema);
  }
}

export function prepareTenantOperatorApiResponseForConsole(
  raw: unknown,
  language: string | undefined
): unknown {
  if (!isObject(raw)) {
    return raw;
  }
  let c: Record<string, unknown>;
  try {
    c = structuredClone(raw) as Record<string, unknown>;
  } catch {
    c = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  }
  stripTenantOperatorSystemConfigurationDeep(c);
  const uo = c.userOperator;
  if (isObject(uo)) {
    mergeLinkedSystemLocalesIntoTenantOperator(uo as Record<string, unknown>);
    mergeZhLocaleIntoOperatorRecord(uo as Record<string, unknown>, language);
  }
  mergeLinkedSystemLocalesIntoTenantOperator(c);
  mergeZhLocaleIntoOperatorRecord(c, language);
  return c;
}

export function mergeImportedOperatorDefinitionLocale<T extends { operator: Record<string, unknown> }>(
  definition: T,
  language: string | undefined
): T {
  let clone: T;
  try {
    clone = structuredClone(definition);
  } catch {
    clone = JSON.parse(JSON.stringify(definition)) as T;
  }
  mergeZhLocaleIntoOperatorRecord(clone.operator, language);
  return clone;
}

export type OperatorDefinitionDisplay = {
  name: string;
  description: string;
  methods: Array<{ identifier: string; name: string; description: string }>;
};

export function getOperatorDefinitionDisplay(
  definition: { operator: Record<string, unknown> },
  language: string | undefined
): OperatorDefinitionDisplay {
  const op = definition.operator;
  const lng = normalizeOperatorLang(language);
  const methodsRaw = Array.isArray(op.methods) ? (op.methods as Record<string, unknown>[]) : [];

  const methodRows = (list: Record<string, unknown>[]) =>
    list.map((m) => ({
      identifier: typeof m.identifier === 'string' ? m.identifier : String(m.identifier ?? ''),
      name: typeof m.name === 'string' ? m.name : String(m.name ?? ''),
      description: m.description != null ? String(m.description) : '',
    }));

  if (lng !== 'zh') {
    return {
      name: typeof op.name === 'string' ? op.name : String(op.name ?? ''),
      description: op.description != null ? String(op.description) : '',
      methods: methodRows(methodsRaw),
    };
  }

  const meta = op.metadata;
  const zh =
    isObject(meta) && isObject(meta.locales) && isObject((meta.locales as SchemaNode).zh)
      ? ((meta.locales as SchemaNode).zh as SchemaNode)
      : null;

  let name = typeof op.name === 'string' ? op.name : String(op.name ?? '');
  let description = op.description != null ? String(op.description) : '';

  if (zh) {
    if (typeof zh.name === 'string' && zh.name) {
      name = zh.name;
    }
    if (zh.description !== undefined && zh.description !== null) {
      description = String(zh.description);
    }
  }

  const zhMethods = zh && Array.isArray(zh.methods) ? (zh.methods as unknown[]) : [];
  if (zhMethods.length > 0) {
    const byId = new Map<string, LocaleMethodEntry>(
      zhMethods
        .filter((m): m is LocaleMethodEntry => isObject(m) && typeof m.identifier === 'string')
        .map((m) => [m.identifier as string, m])
    );
    const methods = methodsRaw.map((method) => {
      const id = typeof method.identifier === 'string' ? method.identifier : String(method.identifier ?? '');
      const loc = byId.get(id);
      let displayName = typeof method.name === 'string' ? method.name : String(method.name ?? '');
      let displayDesc = method.description != null ? String(method.description) : '';
      if (loc) {
        if (typeof loc.name === 'string' && loc.name) {
          displayName = loc.name;
        }
        if (loc.description !== undefined && loc.description !== null) {
          displayDesc = String(loc.description);
        }
      }
      return { identifier: id, name: displayName, description: displayDesc };
    });
    return { name, description, methods };
  }

  return {
    name,
    description,
    methods: methodRows(methodsRaw),
  };
}
