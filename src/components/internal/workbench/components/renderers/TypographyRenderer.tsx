import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Blockquote,
  InlineCode,
  Muted,
  P,
} from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { applyCustomStyles } from '@/utils/styleUtils';
import type { CustomStylesConfig } from '@/types/components';
import type { ParameterValue } from '@/types/parameters';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { queryDatabaseColumnValue as fetchDatabaseColumnValue } from '@/utils/databaseDatasourceColumnValue';
import {
  extractParameterNamesFromCondition,
  processDataSourceParametersForQuery,
  replaceParametersInConditionString,
} from '@/utils/databaseDatasourceParams';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import { useTranslation } from 'react-i18next';
import type {
  ParagraphRendererProps,
  TextRendererProps,
  TitleRendererProps,
  TypographyContentSegment,
  TypographyDatabaseSegment,
  TypographyProps,
  TypographySegmentTextType,
} from './types';

const typographyRendererRootClass =
  // py-2.5 (not p-4): a single line fits the default 50px grid row after auto-fit;
  // the old p-4 shell almost always quantized to 2 rows and left a blank band.
  'typography-renderer bg-card text-card-foreground rounded-lg border border-border shadow-sm px-4 py-2.5';

function semanticTextClass(
  variant: string | undefined,
  hasExplicitColor: boolean
): string {
  if (hasExplicitColor) return '';
  switch (variant) {
    case 'secondary':
      return 'text-neutral-500 dark:text-neutral-400';
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'warning':
      return 'text-amber-600 dark:text-amber-400';
    case 'danger':
      return 'text-red-600 dark:text-red-400';
    case 'default':
    default:
      return '';
  }
}

export function normalizeFontSizeInput(
  fontSize?: string | number | null
): string | undefined {
  if (fontSize === undefined || fontSize === null) return undefined;
  if (typeof fontSize === 'number' && !Number.isNaN(fontSize)) {
    return `${fontSize}px`;
  }
  const s = String(fontSize).trim();
  if (s === '') return undefined;
  if (/^\d+(\.\d+)?(px|em|rem|%|pt|vh|vw|ch|ex)$/i.test(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

export function normalizeTypographyColor(
  color?: string | null
): string | undefined {
  if (color == null) return undefined;
  const raw = String(color).trim();
  if (raw === '') return undefined;
  const c = raw.toLowerCase();
  if (c === '#000' || c === '#000000') return undefined;
  // Design-system ink black — use theme foreground so dark mode stays readable
  if (c === '#171717') return undefined;
  if (c === 'black') return undefined;
  if (c === 'rgb(0,0,0)' || c === 'rgb(0, 0, 0)') return undefined;
  return raw;
}

function mergeTypographyRestWithRootFontSize<T extends { fontSize?: unknown }>(
  rest: T,
  rootFontSize: React.CSSProperties['fontSize'] | undefined
): T {
  const hasExplicit =
    rest.fontSize !== undefined &&
    rest.fontSize !== null &&
    String(rest.fontSize).trim() !== '';
  if (hasExplicit) return rest;
  if (rootFontSize === undefined || rootFontSize === null) return rest;
  if (typeof rootFontSize === 'string' && rootFontSize.trim() === '')
    return rest;
  return { ...rest, fontSize: rootFontSize };
}

function buildTypographyStyle(
  fontSize?: string | number,
  color?: string,
  align?: 'left' | 'center' | 'right'
): React.CSSProperties {
  const style: React.CSSProperties = {};
  const fs = normalizeFontSizeInput(fontSize);
  if (fs) style.fontSize = fs;
  if (color) style.color = color;
  if (align) style.textAlign = align;
  return style;
}

type EffectFields = Pick<
  TextRendererProps,
  | 'strong'
  | 'italic'
  | 'underline'
  | 'delete'
  | 'mark'
  | 'code'
  | 'keyboard'
  | 'copyable'
  | 'ellipsis'
  | 'disabled'
>;

function buildRichContent(
  content: string | React.ReactNode | undefined,
  effects: EffectFields
): React.ReactNode {
  const {
    strong,
    italic,
    underline,
    delete: strike,
    mark,
    code,
    keyboard,
    copyable,
    ellipsis,
    disabled,
  } = effects;

  let node: React.ReactNode = content;

  if (code) {
    node = <InlineCode>{content}</InlineCode>;
  } else if (keyboard) {
    node = (
      <kbd
        className={cn(
          'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 font-mono text-[10px] font-medium text-neutral-800 opacity-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'
        )}
      >
        {content}
      </kbd>
    );
  } else if (strong || italic || underline || strike) {
    node = (
      <span
        className={cn(
          strong && 'font-bold',
          italic && 'italic',
          underline && 'underline',
          strike && 'line-through'
        )}
      >
        {content}
      </span>
    );
  }

  if (mark && !code) {
    node = (
      <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/40">
        {node}
      </mark>
    );
  }

  if (ellipsis) {
    node = (
      <span className="block min-w-0 max-w-full truncate">{node}</span>
    );
  }

  if (copyable && content != null && content !== '') {
    const text = String(content);
    node = (
      <CopyableInline text={text} disabled={disabled}>
        {node}
      </CopyableInline>
    );
  }

  if (disabled) {
    node = (
      <span className="pointer-events-none opacity-50 select-none">
        {node}
      </span>
    );
  }

  return node;
}

interface CopyableInlineProps {
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
}

const CopyableInline: React.FC<CopyableInlineProps> = ({
  text,
  disabled,
  children,
}) => {
  const { t } = useTranslation('workbench');
  const onCopy = useCallback(() => {
    if (disabled) return;
    void navigator.clipboard?.writeText(text);
  }, [disabled, text]);

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        !disabled && 'cursor-pointer underline decoration-dotted',
        'outline-none'
      )}
      title={t('typography.click_to_copy', 'Click to copy')}
      onClick={onCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCopy();
        }
      }}
    >
      {children}
    </span>
  );
};

function pickEffectProps(
  p: TextRendererProps | TitleRendererProps | ParagraphRendererProps
): EffectFields {
  const disabled = p.disabled;
  return {
    strong: p.strong,
    italic: p.italic,
    underline: p.underline,
    delete: p.delete,
    mark: p.mark,
    code: p.code,
    keyboard: p.keyboard,
    copyable: Boolean(p.copyable) && !disabled,
    ellipsis: Boolean(p.ellipsis),
    disabled,
  };
}

export function formatParameterValueForDisplay(value: ParameterValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if (value !== null && 'id' in (value as object)) {
      return String((value as { id: unknown }).id);
    }
    if (value !== null && 'value' in (value as object)) {
      return String((value as { value: unknown }).value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function segmentSpanStyle(
  color: string | undefined,
  textType?: TypographySegmentTextType,
  marginBefore?: string,
  marginAfter?: string
): { className: string; style: React.CSSProperties } {
  const tt = textType && textType !== 'default' ? textType : undefined;
  const effectiveColor = normalizeTypographyColor(color);
  const hasExplicit = Boolean(effectiveColor);
  const semantic = semanticTextClass(tt, hasExplicit);
  const style: React.CSSProperties = {};
  if (effectiveColor) style.color = effectiveColor;
  const mb = marginBefore?.trim();
  const ma = marginAfter?.trim();
  if (mb) style.marginInlineStart = mb;
  if (ma) style.marginInlineEnd = ma;
  return { className: cn('inline', semantic), style };
}

interface TypographySegmentsRendererProps
  extends Omit<TypographyProps, 'contentSegments' | 'id' | 'customStyles' | 'loading'> {
  contentSegments: TypographyContentSegment[];
  pageParams?: TypographyProps['pageParams'];
  componentParameterConfig?: TypographyProps['componentParameterConfig'];
  componentId?: string;
}

function getEffectiveDatabaseConfig(
  seg: TypographyDatabaseSegment,
  globalConfig: DatabaseDataSourceConfig | null | undefined
): DatabaseDataSourceConfig | null {
  if (seg.useCustomDataSource && seg.databaseDataSourceConfig?.datasourceId) {
    return seg.databaseDataSourceConfig;
  }
  if (globalConfig?.datasourceId) {
    return globalConfig;
  }
  if (seg.databaseDataSourceConfig?.datasourceId) {
    return seg.databaseDataSourceConfig;
  }
  return null;
}

function collectDatabaseListenKeys(
  segments: TypographyContentSegment[],
  globalConfig: DatabaseDataSourceConfig | null | undefined
): string[] {
  const keys: string[] = [];
  for (const seg of segments) {
    if (seg.kind !== 'database') continue;
    const cfg = getEffectiveDatabaseConfig(seg, globalConfig);
    if (!cfg?.parameters) continue;
    Object.values(cfg.parameters).forEach((v) => {
      if (v && typeof v === 'object' && (v as { type?: string }).type === 'parameter') {
        const src = (v as { source: string }).source;
        if (src) keys.push(src);
      }
    });
    if (seg.statisticCondition) {
      keys.push(...extractParameterNamesFromCondition(seg.statisticCondition));
    }
  }
  return keys;
}

const TypographySegmentsRenderer: React.FC<TypographySegmentsRendererProps> = (
  props
) => {
  const {
    type = 'paragraph',
    contentSegments,
    pageParams,
    componentParameterConfig,
    componentId = 'typography',
    databaseDataSourceConfig: globalDbConfig,
    followPageRefresh = false,
    useMockData,
    mockData,
    ...rest
  } = props;

  const isMobileFlow = useMobileFlowLayout();

  const { rawParams } = useParameterHandler({
    pageParams,
    componentId,
    componentParameterConfig,
  });

  const listenParameters = useMemo(() => {
    const fromParamSeg = contentSegments
      .filter((s): s is Extract<TypographyContentSegment, { kind: 'parameter' }> => s.kind === 'parameter')
      .map((s) => s.source)
      .filter(Boolean);
    const fromDb = collectDatabaseListenKeys(contentSegments, globalDbConfig);
    const explicit = componentParameterConfig?.listenToParameters ?? [];
    return Array.from(new Set([...fromParamSeg, ...fromDb, ...explicit]));
  }, [contentSegments, globalDbConfig, componentParameterConfig?.listenToParameters]);

  const { getCurrentParameter, subscribe } = useComponentCommunication({
    componentId,
    listenParameters,
    autoCleanup: true,
  });

  const mockRecord = useMemo(() => {
    if (!useMockData || mockData == null || typeof mockData !== 'object' || Array.isArray(mockData)) {
      return null;
    }
    return mockData as Record<string, ParameterValue>;
  }, [useMockData, mockData]);

  const resolveParameterText = useCallback(
    (source: string, fallback?: string): string => {
      const v =
        getCurrentParameter(source) ??
        rawParams[source] ??
        (mockRecord ? mockRecord[source] : undefined);
      if (v === undefined || v === null || v === '') {
        return fallback ?? '';
      }
      return formatParameterValueForDisplay(v as ParameterValue);
    },
    [getCurrentParameter, rawParams, mockRecord]
  );

  const [dbTexts, setDbTexts] = useState<Record<number, string>>({});
  const fetchGenRef = useRef(0);

  const runDatabaseFetches = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    const next: Record<number, string> = {};

    for (let i = 0; i < contentSegments.length; i++) {
      const seg = contentSegments[i];
      if (seg.kind !== 'database') continue;

      if (useMockData) {
        const mockKey = `dbSegment_${i}`;
        const m =
          mockRecord && mockRecord[mockKey] !== undefined
            ? formatParameterValueForDisplay(mockRecord[mockKey] as ParameterValue)
            : seg.fallback ?? '';
        next[i] = m;
        continue;
      }

      const effective = getEffectiveDatabaseConfig(seg, globalDbConfig);
      if (!effective?.datasourceId || !seg.field?.trim()) {
        next[i] = seg.fallback ?? '';
        continue;
      }

      const effectiveForRequest: DatabaseDataSourceConfig = {
        ...effective,
        outputFields:
          effective.outputFields && effective.outputFields.length > 0
            ? Array.from(new Set([...effective.outputFields, seg.field]))
            : [seg.field],
      };

      const processed = processDataSourceParametersForQuery(
        effectiveForRequest.parameters as Record<string, unknown> | undefined,
        effectiveForRequest.parameterTypes,
        getCurrentParameter,
        rawParams
      );
      const cond = replaceParametersInConditionString(
        seg.statisticCondition,
        getCurrentParameter,
        rawParams
      );

      const { result, error } = await fetchDatabaseColumnValue(
        effectiveForRequest,
        seg.field,
        processed,
        cond
      );

      if (gen !== fetchGenRef.current) return;

      if (error) {
        next[i] = seg.fallback ?? '';
      } else {
        next[i] = formatParameterValueForDisplay(result as ParameterValue);
      }
    }

    if (gen === fetchGenRef.current) {
      setDbTexts((prev) => ({ ...prev, ...next }));
    }
  }, [
    contentSegments,
    globalDbConfig,
    getCurrentParameter,
    rawParams,
    useMockData,
    mockRecord,
  ]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDbFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runDatabaseFetches();
    }, 200);
  }, [runDatabaseFetches]);

  useEffect(() => {
    void runDatabaseFetches();
  }, [runDatabaseFetches]);

  const chartRefreshTrigger = pageParams?.chartRefreshTrigger;
  const previousChartRefreshTriggerRef = useRef(chartRefreshTrigger);

  useEffect(() => {
    const changed = previousChartRefreshTriggerRef.current !== chartRefreshTrigger;
    previousChartRefreshTriggerRef.current = chartRefreshTrigger;
    if (!followPageRefresh || !changed) return;
    void runDatabaseFetches();
  }, [followPageRefresh, chartRefreshTrigger, runDatabaseFetches]);

  useEffect(() => {
    if (!listenParameters.length) return;
    const unsub = subscribe(listenParameters, () => {
      scheduleDbFetch();
    });
    return unsub;
  }, [listenParameters, subscribe, scheduleDbFetch]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const { nodes, plainText } = useMemo(() => {
    const parts: string[] = [];
    const spanNodes = contentSegments.map((seg, i) => {
      let text: string;
      if (seg.kind === 'text') {
        text = seg.value;
      } else if (seg.kind === 'parameter') {
        text = resolveParameterText(seg.source, seg.fallback);
      } else {
        text = dbTexts[i] ?? seg.fallback ?? '';
      }
      parts.push(text);
      const { className, style } = segmentSpanStyle(
        seg.color,
        seg.textType,
        seg.marginBefore,
        seg.marginAfter
      );
      return (
        <span key={i} className={className} style={style}>
          {text}
        </span>
      );
    });
    return { nodes: spanNodes, plainText: parts.join('') };
  }, [contentSegments, resolveParameterText, dbTexts]);

  const {
    fontSize,
    color,
    align,
    textType,
    className = '',
    level = 1,
  } = rest;

  const effectiveColor = normalizeTypographyColor(color);
  const hasCustomFontSize = Boolean(normalizeFontSizeInput(fontSize));
  const rootStyle = buildTypographyStyle(fontSize, undefined, align);
  const rootSemantic =
    textType && textType !== 'default' ? textType : undefined;
  const headingClass = cn(
    'min-w-0',
    semanticTextClass(rootSemantic, Boolean(effectiveColor)),
    !effectiveColor && !rootSemantic && 'text-foreground',
    className
  );

  const effects = pickEffectProps(rest as ParagraphRendererProps);
  let inner: React.ReactNode = nodes;

  if (effects.ellipsis) {
    inner = (
      <span className="inline-block min-w-0 max-w-full truncate">{inner}</span>
    );
  }

  if (effects.copyable && plainText !== '') {
    inner = (
      <CopyableInline text={plainText} disabled={effects.disabled}>
        {inner}
      </CopyableInline>
    );
  }

  if (effects.disabled) {
    inner = (
      <span className="pointer-events-none opacity-50 select-none">{inner}</span>
    );
  }

  switch (type) {
    case 'title': {
      const style = buildTypographyStyle(fontSize, effectiveColor, align);
      switch (level) {
        case 1:
          return (
            <h1
              className={cn(
                'scroll-m-20 font-extrabold tracking-tight',
                !hasCustomFontSize &&
                  (isMobileFlow ? 'text-3xl' : 'text-4xl lg:text-5xl'),
                headingClass
              )}
              style={style}
            >
              {inner}
            </h1>
          );
        case 2:
          return (
            <h2
              className={cn(
                'scroll-m-20 font-semibold tracking-tight first:mt-0',
                !hasCustomFontSize && 'text-3xl',
                headingClass
              )}
              style={style}
            >
              {inner}
            </h2>
          );
        case 3:
          return (
            <h3
              className={cn(
                'scroll-m-20 font-semibold tracking-tight',
                !hasCustomFontSize && 'text-2xl',
                headingClass
              )}
              style={style}
            >
              {inner}
            </h3>
          );
        case 4:
          return (
            <h4
              className={cn(
                'scroll-m-20 font-semibold tracking-tight',
                !hasCustomFontSize && 'text-xl',
                headingClass
              )}
              style={style}
            >
              {inner}
            </h4>
          );
        case 5:
        case 6:
          return (
            <h4
              className={cn(
                'scroll-m-20 font-semibold tracking-tight',
                !hasCustomFontSize && level === 5 ? 'text-lg' : 'text-base',
                headingClass
              )}
              style={style}
            >
              {inner}
            </h4>
          );
        default:
          return (
            <h1
              className={cn(
                'scroll-m-20 font-extrabold tracking-tight',
                !hasCustomFontSize &&
                  (isMobileFlow ? 'text-3xl' : 'text-4xl lg:text-5xl'),
                headingClass
              )}
              style={style}
            >
              {inner}
            </h1>
          );
      }
    }
    case 'text': {
      const variant =
        textType && textType !== 'default'
          ? textType
          : (rest as TextRendererProps).type || 'secondary';
      const resolvedFs = normalizeFontSizeInput(fontSize);
      const style = rootStyle;
      const semantic = semanticTextClass(variant, Boolean(effectiveColor));
      const useMutedShell =
        variant === 'secondary' &&
        !effectiveColor &&
        !resolvedFs &&
        !align;

      if (useMutedShell) {
        return (
          <Muted className={cn('min-w-0', semantic, className)} style={style}>
            {inner}
          </Muted>
        );
      }

      return (
        <p
          className={cn(
            'min-w-0 leading-6',
            !resolvedFs && 'text-sm',
            semantic,
            !semantic && !effectiveColor && 'text-neutral-900 dark:text-neutral-100',
            className
          )}
          style={style}
        >
          {inner}
        </p>
      );
    }
    case 'blockquote': {
      const bqVariant =
        textType && textType !== 'default' ? textType : undefined;
      return (
        <Blockquote
          className={cn('min-w-0', semanticTextClass(bqVariant, Boolean(effectiveColor)))}
          style={buildTypographyStyle(fontSize, effectiveColor, align)}
        >
          {inner}
        </Blockquote>
      );
    }
    case 'paragraph':
    default: {
      const paragraphVariant = (rest as ParagraphRendererProps).type;
      const variant =
        textType && textType !== 'default' ? textType : paragraphVariant;
      const style = buildTypographyStyle(fontSize, effectiveColor, align);
      const semantic = semanticTextClass(variant, Boolean(effectiveColor));
      return (
        <P
          className={cn(
            'min-w-0',
            semantic,
            !semantic && !effectiveColor && 'text-foreground',
            className
          )}
          style={style}
        >
          {inner}
        </P>
      );
    }
  }
};

export const TextRenderer: React.FC<TextRendererProps> = (props) => {
  const {
    content,
    type = 'secondary',
    className = '',
    textType,
    fontSize,
    color,
    align,
  } = props;

  const variant =
    textType && textType !== 'default'
      ? textType
      : type || 'secondary';

  const resolvedFs = normalizeFontSizeInput(fontSize);
  const effectiveColor = normalizeTypographyColor(color);
  const style = buildTypographyStyle(fontSize, effectiveColor, align);
  const semantic = semanticTextClass(variant, Boolean(effectiveColor));
  const effects = pickEffectProps(props);
  const inner = buildRichContent(content, effects);

  const useMutedShell =
    variant === 'secondary' &&
    !effectiveColor &&
    !resolvedFs &&
    !align;

  if (useMutedShell) {
    return (
      <Muted className={cn('min-w-0', semantic, className)} style={style}>
        {inner}
      </Muted>
    );
  }

  return (
    <p
      className={cn(
        'min-w-0 leading-6',
        !resolvedFs && 'text-sm',
        semantic,
        !semantic && !effectiveColor && 'text-neutral-900 dark:text-neutral-100',
        className
      )}
      style={style}
    >
      {inner}
    </p>
  );
};

// Page-title component: size is fixed to match console's PageLayout header
// (text-xl sm:text-2xl font-bold); `level` and `fontSize` are intentionally ignored.
export const TitleRenderer: React.FC<TitleRendererProps> = (props) => {
  const {
    content,
    className = '',
    textType,
    color,
    align,
  } = props;

  const variant =
    textType && textType !== 'default' ? textType : props.type;

  const isMobileFlow = useMobileFlowLayout();
  const effectiveColor = normalizeTypographyColor(color);
  const style = buildTypographyStyle(undefined, effectiveColor, align);
  const semantic = semanticTextClass(variant, Boolean(effectiveColor));
  const effects = pickEffectProps(props);
  const inner = buildRichContent(content, effects);

  return (
    // px-3 optically aligns the text with sibling cards' straight border edge (rounded-xl = 12px radius)
    <h1
      className={cn(
        'min-w-0 px-3 text-xl font-bold',
        // sm: is viewport-based, so it must be dropped (not just overridden) in the
        // narrow flow: inside the studio phone frame the viewport is still desktop-wide.
        !isMobileFlow && 'sm:text-2xl',
        semantic,
        !effectiveColor && !semantic && 'text-foreground',
        className
      )}
      style={style}
    >
      {inner}
    </h1>
  );
};

// Page-description component: size is fixed to match console's PageLayout
// description (text-sm text-muted-foreground); `fontSize` is intentionally ignored.
export const ParagraphRenderer: React.FC<ParagraphRendererProps> = (props) => {
  const {
    content,
    className = '',
    textType,
    color,
    align,
    type: paragraphVariant,
  } = props;

  const variant =
    textType && textType !== 'default' ? textType : paragraphVariant;

  const effectiveColor = normalizeTypographyColor(color);
  const style = buildTypographyStyle(undefined, effectiveColor, align);
  const semantic = semanticTextClass(variant, Boolean(effectiveColor));
  const effects = pickEffectProps(props);
  const inner = buildRichContent(content, effects);

  return (
    // px-3 keeps the description aligned with the Title above it (see TitleRenderer)
    <p
      className={cn(
        'min-w-0 px-3 text-sm leading-6',
        semantic,
        !semantic && !effectiveColor && 'text-muted-foreground',
        className
      )}
      style={style}
    >
      {inner}
    </p>
  );
};

export const TypographyRenderer: React.FC<TypographyProps> = (props) => {
  const {
    type = 'paragraph',
    id,
    customStyles,
    loading: _loading,
    useMockData,
    mockData,
    contentSegments,
    pageParams,
    componentParameterConfig,
    componentId,
    databaseDataSourceConfig,
    followPageRefresh,
    className,
    ...rest
  } = props;

  const { className: scopedClass, style: rootStyle } = id
    ? applyCustomStyles(id, customStyles as CustomStylesConfig | undefined, 'typography-renderer')
    : {
        className: 'typography-renderer',
        style: {} as React.CSSProperties,
      };

  const { fontSize: rootFontSize, ...wrapperStyle } = rootStyle;
  const mergedRest = mergeTypographyRestWithRootFontSize(rest, rootFontSize);
  const rootClassName = cn(typographyRendererRootClass, scopedClass, className);

  if (contentSegments && contentSegments.length > 0) {
    return (
      <div className={rootClassName} style={wrapperStyle}>
        <TypographySegmentsRenderer
          {...(mergedRest as Omit<TypographyProps, 'contentSegments'>)}
          type={type}
          contentSegments={contentSegments}
          pageParams={pageParams}
          componentParameterConfig={componentParameterConfig}
          componentId={componentId}
          databaseDataSourceConfig={databaseDataSourceConfig}
          followPageRefresh={followPageRefresh}
          useMockData={useMockData}
          mockData={mockData}
        />
      </div>
    );
  }

  switch (type) {
    case 'title':
      return (
        <div className={rootClassName} style={wrapperStyle}>
          <TitleRenderer {...(mergedRest as TitleRendererProps)} />
        </div>
      );
    case 'text':
      return (
        <div className={rootClassName} style={wrapperStyle}>
          <TextRenderer {...(mergedRest as TextRendererProps)} />
        </div>
      );
    case 'blockquote': {
      const bq = mergedRest;
      const bqVariant =
        bq.textType && bq.textType !== 'default' ? bq.textType : undefined;
      const bqColor = normalizeTypographyColor(bq.color as string | undefined);
      return (
        <div className={rootClassName} style={wrapperStyle}>
          <Blockquote
            className={cn(
              'min-w-0',
              semanticTextClass(bqVariant, Boolean(bqColor))
            )}
            style={buildTypographyStyle(
              bq.fontSize,
              bqColor,
              bq.align
            )}
          >
            {buildRichContent(
              bq.content,
              pickEffectProps(bq as ParagraphRendererProps)
            )}
          </Blockquote>
        </div>
      );
    }
    case 'paragraph':
    default:
      return (
        <div className={rootClassName} style={wrapperStyle}>
          <ParagraphRenderer {...(mergedRest as ParagraphRendererProps)} />
        </div>
      );
  }
};

export default {
  Text: TextRenderer,
  Title: TitleRenderer,
  Paragraph: ParagraphRenderer,
};
