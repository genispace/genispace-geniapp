import { CustomStylesConfig } from '../types/components';
import i18n from '@/locales/i18n';

const UNSAFE_CUSTOM_CSS =
  /@import|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|<\/style|url\s*\(\s*["']?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i;

export const validateCustomCssSafety = (
  cssCode: string
): { isSafe: boolean; error?: string } => {
  if (!UNSAFE_CUSTOM_CSS.test(cssCode)) return { isSafe: true };
  return {
    isSafe: false,
    error: i18n.t(
      'common:style_utils.unsafe_css',
      'CSS imports, executable protocols, expressions, and style-tag breakouts are not allowed'
    ),
  };
};

export const styleObjectToCss = (styleObj: React.CSSProperties): string => {
  return Object.entries(styleObj)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join('; ');
};

export const getResponsiveStyles = (responsiveStyles?: { [breakpoint: string]: React.CSSProperties }): React.CSSProperties => {
  if (!responsiveStyles) return {};

  return responsiveStyles['default'] || {};
};

const processCssWithScope = (cssCode: string, uniqueId: string): string => {
  if (!cssCode.trim()) return '';

  const cssRuleRegex = /([^{]+)\s*\{([^}]+)\}/g;
  let processedCss = '';

  cssCode.replace(cssRuleRegex, (match, selectorsPart, declarationsPart) => {
    const selectors = selectorsPart.split(',').map(s => s.trim());
    const processedSelectors = selectors.map(selector => {

      if (selector.startsWith('@')) {

        return selector;
      } else if (selector === '.root' || selector === '.component') {

        return `.${uniqueId}`;
      } else if (selector.includes(':')) {

        const [baseSelector, ...pseudoParts] = selector.split(':');
        const pseudo = pseudoParts.join(':');

        if (baseSelector === '.root' || baseSelector === '.component') {
          return `.${uniqueId}:${pseudo}`;
        } else if (baseSelector.startsWith('.')) {

          return `.${uniqueId} ${baseSelector}:${pseudo}`;
        } else {

          return `.${uniqueId} ${selector}`;
        }
      } else if (selector.startsWith('.')) {

        return `.${uniqueId} ${selector}`;
      } else if (selector.includes(' ')) {

        return `.${uniqueId} ${selector}`;
      } else {

        return `.${uniqueId} ${selector}`;
      }
    });

    processedCss += `${processedSelectors.join(', ')} {${declarationsPart}}\n`;
    return match;
  });

  return processedCss;
};

export const injectCustomCSS = (uniqueId: string, styles: CustomStylesConfig): void => {
  const styleId = `custom-styles-${uniqueId}`;
  let existingStyle = document.getElementById(styleId) as HTMLStyleElement;

  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = styleId;
    document.head.appendChild(existingStyle);
  }

  let cssText = '';

  if (styles.childStyles) {
    Object.entries(styles.childStyles).forEach(([selector, styleProps]) => {

      const childSelector = selector.startsWith('.') ? selector : `.${selector}`;
      const cssRule = `.${uniqueId} ${childSelector} { ${styleObjectToCss(styleProps)} }\n`;
      cssText += cssRule;
    });
  }

  if (styles.stateStyles) {
    Object.entries(styles.stateStyles).forEach(([state, styleProps]) => {
      const cssRule = `.${uniqueId}:${state} { ${styleObjectToCss(styleProps)} }\n`;
      cssText += cssRule;
    });
  }

  if (styles.customCss) {
    const safety = validateCustomCssSafety(styles.customCss);
    if (safety.isSafe) {
      const processedCss = processCssWithScope(styles.customCss, uniqueId);
      cssText += processedCss;
    }
  }

  existingStyle.textContent = cssText;
};

export const removeCustomCSS = (uniqueId: string): void => {
  const styleId = `custom-styles-${uniqueId}`;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
};

export const applyCustomStyles = (
  componentId: string,
  customStyles?: CustomStylesConfig,
  baseClassName: string = ''
): {
  className: string;
  style: React.CSSProperties;
} => {

  if (!customStyles) {
    return { className: baseClassName, style: {} };
  }

  const uniqueId = `custom-${componentId}`;

  if (customStyles.customCss || customStyles.childStyles || customStyles.stateStyles) {
    injectCustomCSS(uniqueId, customStyles);
  }

  const result = {
    className: `${baseClassName} ${uniqueId}`.trim(),
    style: {
      ...customStyles.rootStyles,
      ...getResponsiveStyles(customStyles.responsiveStyles)
    }
  };

  return result;
};

export const mergeStyleConfigs = (
  base: CustomStylesConfig = {},
  override: CustomStylesConfig = {}
): CustomStylesConfig => {
  return {
    rootStyles: { ...base.rootStyles, ...override.rootStyles },
    childStyles: { ...base.childStyles, ...override.childStyles },
    stateStyles: { ...base.stateStyles, ...override.stateStyles },
    responsiveStyles: { ...base.responsiveStyles, ...override.responsiveStyles },
    customCss: override.customCss || base.customCss
  };
};

export const validateStyleConfig = (styles: CustomStylesConfig): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (styles.customCss) {
    const safety = validateCustomCssSafety(styles.customCss);
    if (!safety.isSafe && safety.error) {
      errors.push(safety.error);
    }
    try {

      const rules = styles.customCss.split('}').filter(rule => rule.trim());
      rules.forEach((rule, index) => {
        if (rule.trim() && !rule.includes('{')) {
          errors.push(i18n.t('common:style_utils.css_rule_syntax_error', 'Custom CSS rule {{index}} syntax error', { index: index + 1 }));
        }
      });
    } catch (error) {
      errors.push(i18n.t('common:style_utils.css_syntax_error', 'Custom CSS syntax error'));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getStylePresets = (): { [key: string]: { name: string; styles: CustomStylesConfig } } => ({
  'modern-card': {
    name: i18n.t('common:style_presets.modern_card', 'Modern Card'),
    styles: {
      rootStyles: {
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgb(229 229 229)',
        padding: '24px',
        backgroundColor: 'rgb(255 255 255)'
      },
      responsiveStyles: {
        '@media (prefers-color-scheme: dark)': {
          backgroundColor: 'rgb(38 38 38)',
          border: '1px solid rgb(64 64 64)',
          color: 'rgb(250 250 250)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
        }
      }
    }
  },
  'glassmorphism': {
    name: i18n.t('common:style_presets.glassmorphism', 'Glassmorphism'),
    styles: {
      rootStyles: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        padding: '20px',
        color: 'rgb(17 24 39)'
      },
      responsiveStyles: {
        '@media (prefers-color-scheme: dark)': {
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgb(249 250 251)'
        }
      }
    }
  },
  'minimal': {
    name: i18n.t('common:style_presets.minimal', 'Minimal Style'),
    styles: {
      rootStyles: {
        border: 'none',
        borderRadius: '4px',
        padding: '16px',
        backgroundColor: 'rgb(248 249 250)',
        color: 'rgb(51 51 51)'
      },
      responsiveStyles: {
        '@media (prefers-color-scheme: dark)': {
          backgroundColor: 'rgb(23 23 23)',
          color: 'rgb(212 212 212)'
        }
      }
    }
  },
  'colorful': {
    name: i18n.t('common:style_presets.colorful', 'Colorful Gradient'),
    styles: {
      rootStyles: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '8px',
        padding: '20px',
        border: 'none',
        boxShadow: '0 4px 15px -3px rgba(102, 126, 234, 0.3)'
      },
      childStyles: {
        'h1, h2, h3, h4, h5, h6': {
          color: 'white',
          marginBottom: '16px',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        },
        'p': {
          color: 'rgba(255, 255, 255, 0.95)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
        },
        'button': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(4px)'
        }
      },
      responsiveStyles: {
        '@media (prefers-color-scheme: dark)': {
          background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)',
          boxShadow: '0 4px 15px -3px rgba(67, 56, 202, 0.5)'
        }
      }
    }
  },
  'dark-theme': {
    name: i18n.t('common:style_presets.dark_theme', 'Dark Theme'),
    styles: {
      rootStyles: {
        backgroundColor: 'rgb(23 23 23)',
        color: 'rgb(250 250 250)',
        border: '1px solid rgb(64 64 64)',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
      },
      childStyles: {
        'button': {
          backgroundColor: 'rgb(64 64 64)',
          color: 'rgb(250 250 250)',
          border: '1px solid rgb(115 115 115)',
          borderRadius: '6px',
          transition: 'all 0.2s ease'
        },
        'button:hover': {
          backgroundColor: 'rgb(82 82 82)',
          borderColor: 'rgb(156 163 175)'
        },
        'input, textarea': {
          backgroundColor: 'rgb(38 38 38)',
          color: 'rgb(250 250 250)',
          border: '1px solid rgb(82 82 82)',
          borderRadius: '6px'
        },
        'input:focus, textarea:focus': {
          borderColor: 'rgb(59 130 246)',
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
        }
      },
      responsiveStyles: {
        '@media (prefers-color-scheme: light)': {
          backgroundColor: 'rgb(255 255 255)',
          color: 'rgb(17 24 39)',
          border: '1px solid rgb(229 229 229)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }
      }
    }
  }
});

export const STYLE_PRESETS = getStylePresets();

/** Resolves spacing prop (number or CSS length) to a CSS length string. */
export function resolveGapCSSValue(
  gap: string | number | undefined | null
): string | undefined {
  if (gap === undefined || gap === null || gap === '') return undefined;
  if (typeof gap === 'number') return `${gap}px`;
  const trimmed = String(gap).trim();
  if (!trimmed) return undefined;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
}
