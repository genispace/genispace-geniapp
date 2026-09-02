import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PageConfig } from '@/types/components';
import {
  applyAppConfigLocale,
  applyPageConfigLocale,
  applyWorkbenchConfigLocale,
  getPageLocalePatch,
  type WorkbenchConfigWithLocales,
  type WorkbenchLocaleMetadata,
} from '@/utils/workbenchConfigLocale';
import {
  getLocaleLabelMap,
  localizeDataRows,
  localizeDisplayText,
  resolveBilingualText,
  type LocaleLabelMap,
} from '@/utils/workbenchDisplayLocale';

type WorkbenchConfigLocaleContextValue = {
  language: string;
  metadata: WorkbenchLocaleMetadata | undefined;
  labelMap: LocaleLabelMap | undefined;
  localizeText: (text: string | null | undefined) => string;
  resolveBilingualText: (text: unknown) => string;
  localizeRows: <T extends Record<string, unknown>>(rows: T[] | null | undefined) => T[];
  localizeWorkbenchConfig: (
    config: WorkbenchConfigWithLocales | null | undefined
  ) => WorkbenchConfigWithLocales | null | undefined;
  localizeAppConfig: <T extends Record<string, unknown>>(appConfig: T | undefined) => T | undefined;
  localizePageConfig: <T extends Record<string, unknown>>(
    pageId: string,
    pageConfig: T | undefined
  ) => T | undefined;
};

const WorkbenchConfigLocaleContext = createContext<WorkbenchConfigLocaleContextValue | null>(null);

export const WorkbenchConfigLocaleProvider: React.FC<{
  metadata: WorkbenchLocaleMetadata | undefined;
  children: React.ReactNode;
}> = ({ metadata, children }) => {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  const value = useMemo<WorkbenchConfigLocaleContextValue>(() => {
    const labelMap = getLocaleLabelMap(metadata, language);

    const localizeText = (text: string | null | undefined) =>
      localizeDisplayText(text, labelMap, language);

    const resolveBilingual = (text: unknown) => resolveBilingualText(text, language);

    const localizeRows = <T extends Record<string, unknown>>(rows: T[] | null | undefined) =>
      localizeDataRows(rows, labelMap, language);

    const localizePageConfig = <T extends Record<string, unknown>>(
      pageId: string,
      pageConfig: T | undefined
    ): T | undefined => {
      if (!pageConfig) {
        return pageConfig;
      }
      const pagePatch = getPageLocalePatch(metadata, language, pageId);
      return pagePatch ? applyPageConfigLocale(pageConfig, pagePatch) : pageConfig;
    };

    return {
      language,
      metadata,
      labelMap,
      localizeText,
      resolveBilingualText: resolveBilingual,
      localizeRows,
      localizeWorkbenchConfig: (config) => applyWorkbenchConfigLocale(config, language),
      localizeAppConfig: (appConfig) => {
        if (!appConfig) {
          return appConfig;
        }
        const appConfigPatch = metadata?.locales?.[language]?.appConfig;
        return appConfigPatch ? applyAppConfigLocale(appConfig, appConfigPatch) : appConfig;
      },
      localizePageConfig,
    };
  }, [language, metadata]);

  return (
    <WorkbenchConfigLocaleContext.Provider value={value}>
      {children}
    </WorkbenchConfigLocaleContext.Provider>
  );
};

export const useWorkbenchConfigLocale = (): WorkbenchConfigLocaleContextValue => {
  const context = useContext(WorkbenchConfigLocaleContext);
  if (!context) {
    return {
      language: 'en',
      metadata: undefined,
      labelMap: undefined,
      localizeText: (text) => (text == null ? '' : String(text)),
      resolveBilingualText: (text) => resolveBilingualText(text, 'en'),
      localizeRows: (rows) => rows ?? [],
      localizeWorkbenchConfig: (config) => config,
      localizeAppConfig: (appConfig) => appConfig,
      localizePageConfig: (_pageId, pageConfig) => pageConfig,
    };
  }
  return context;
};

export const useLocalizedPageConfig = (
  pageId: string,
  pageConfig: PageConfig | undefined
): PageConfig | undefined => {
  const { localizePageConfig, language } = useWorkbenchConfigLocale();
  return useMemo(
    () =>
      pageConfig
        ? (localizePageConfig(
            pageId,
            pageConfig as unknown as Record<string, unknown>
          ) as unknown as PageConfig)
        : undefined,
    [localizePageConfig, language, pageId, pageConfig]
  );
};
