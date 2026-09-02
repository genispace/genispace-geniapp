import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { CustomStylesConfig } from '@/types/components';
import { applyCustomStyles } from '@/utils/styleUtils';

interface CustomContentRendererProps {
  html?: string;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
  id?: string;
  customStyles?: CustomStylesConfig;
}

/**
 * Declarative escape hatch for content that is not covered by a built-in
 * component. It deliberately supports HTML + scoped CSS only: scripts, inline
 * event handlers, forms, embedded documents and inline styles are stripped.
 * Interactivity remains the responsibility of audited platform components.
 */
export const sanitizeCustomContentHtml = (html: string): string => {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'svg',
      'math',
    ],
    FORBID_ATTR: ['style', 'srcdoc', 'formaction'],
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
  });

  if (typeof document === 'undefined') return sanitized;
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  template.content.querySelectorAll('a[target="_blank"]').forEach((anchor) => {
    anchor.setAttribute('rel', 'noopener noreferrer');
  });
  return template.innerHTML;
};

const CustomContentRenderer: React.FC<CustomContentRendererProps> = ({
  html = '',
  emptyText = 'Custom content',
  ariaLabel,
  className = '',
  id,
  customStyles,
}) => {
  const safeHtml = useMemo(() => sanitizeCustomContentHtml(html), [html]);
  const customStyleProps = id
    ? applyCustomStyles(id, customStyles, `custom-content-renderer ${className}`)
    : { className: `custom-content-renderer ${className}`.trim(), style: {} };

  if (!safeHtml.trim()) {
    return (
      <div
        className={customStyleProps.className}
        style={customStyleProps.style}
        aria-label={ariaLabel}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={customStyleProps.className}
      style={customStyleProps.style}
      aria-label={ariaLabel}
      // The value is always produced by DOMPurify above.
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default CustomContentRenderer;
