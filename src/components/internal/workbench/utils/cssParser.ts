import { CustomStylesConfig } from '../types/components';
import i18n from '@/locales/i18n';

export function validateCss(cssCode: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!cssCode.trim()) {
    return { isValid: true, errors: [] };
  }

  try {

    const openBraces = (cssCode.match(/\{/g) || []).length;
    const closeBraces = (cssCode.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push(i18n.t('css_parser.braces_mismatch', 'CSS braces mismatch: found {{open}} opening braces but only {{close}} closing braces', { open: openBraces, close: closeBraces }));
    }

    const hasValidStructure = cssCode.includes('{') && cssCode.includes('}');
    if (!hasValidStructure && cssCode.includes(':')) {
      void 0;
    } else if (!hasValidStructure) {
      errors.push(i18n.t('css_parser.missing_valid_selector_or_declaration', 'CSS code missing valid selector or declaration block'));
    }

    const declarationBlocks = cssCode.match(/\{([^}]+)\}/g);
    if (declarationBlocks) {
      declarationBlocks.forEach((block, index) => {
        const content = block.slice(1, -1).trim();

        if (content.includes('{') || content.includes('@media') || content.includes('@keyframes')) {
          return; 
        }

        const declarations = content.split(';').filter(d => d.trim());

        declarations.forEach(declaration => {
          const trimmed = declaration.trim();

          const isValidDeclaration = 
            trimmed === '' ||                           
            trimmed.includes(':') ||                    
            trimmed.startsWith('/*') ||                 
            trimmed.endsWith('*/') ||                   
            trimmed.startsWith('@apply') ||             // Tailwind @apply
            trimmed.startsWith('@media') ||             
            trimmed.startsWith('@keyframes') ||         
            trimmed.startsWith('@import') ||            
            trimmed.startsWith('@charset') ||           
            trimmed.startsWith('@font-face') ||         
            trimmed.startsWith('@supports') ||          
            trimmed.startsWith('@layer') ||             
            trimmed.match(/^\d+%/) ||                   
            trimmed.match(/^(from|to)/) ||              
            trimmed.match(/^[.#]?[\w-]+\s*\{/) ||       
            trimmed.match(/^[.#]?[\w-]+,/) ||           
            trimmed.match(/^[.#]?[\w-]+\s*$/) ||        
            trimmed.match(/^[a-zA-Z-]+\s*\{/);          

          if (!isValidDeclaration) {
            errors.push(i18n.t('css_parser.syntax_error_in_declaration', 'Syntax error in declaration block {{index}}: "{{declaration}}"', { index: index + 1, declaration: trimmed }));
          }
        });
      });
    }

  } catch (error) {
    errors.push(i18n.t('css_parser.css_parse_exception', 'CSS parsing exception: {{error}}', { error: error instanceof Error ? error.message : i18n.t('css_parser.unknown_error', 'Unknown error') }));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function mergeStyleConfigs(
  base: CustomStylesConfig,
  override: Partial<CustomStylesConfig>
): CustomStylesConfig {
  return {
    rootStyles: { ...base.rootStyles, ...override.rootStyles },
    childStyles: { ...base.childStyles, ...override.childStyles },
    stateStyles: { ...base.stateStyles, ...override.stateStyles },
    responsiveStyles: { ...base.responsiveStyles, ...override.responsiveStyles },
    customCss: override.customCss !== undefined ? override.customCss : base.customCss,
  };
} 
