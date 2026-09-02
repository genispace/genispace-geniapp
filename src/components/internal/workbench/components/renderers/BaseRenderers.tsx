import React from 'react';
import i18n from '@/locales/i18n';

export interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
}

export function renderByType(type: string, props: any) {
  if (!type) return null;

  return <div>{i18n.t('renderers:base_renderer.generic_render', 'Generic Render')}: {type}</div>;
} 