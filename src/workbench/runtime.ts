// @ts-nocheck -- The runtime intentionally accepts forward-compatible Workbench JSON.
import type { WorkbenchConfig } from './types';

function createPortableRuntime() {
  const state = {
    sourceConfig: null,
    config: null,
    root: null,
    activePage: null,
    activeTabs: new Map(),
    locale: 'en',
    theme: 'light',
    collapsed: false,
    mobileDrawerOpen: false,
    allowedShellOrigins: new Set(),
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const normalizeLocale = (value) => String(value || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const normalizeTheme = (value) => value === 'dark' ? 'dark' : 'light';
  const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const itemKey = (item, index) => ['key', 'dataIndex', 'id', 'value', 'name']
    .map((key) => item?.[key])
    .find((value) => value !== undefined && value !== null && String(value).trim() !== '') ?? `__index_${index}`;

  const mergeLocaleValue = (base, patch) => {
    if (Array.isArray(base) && Array.isArray(patch)) {
      const patches = new Map(patch.map((item, index) => [String(itemKey(item, index)), item]));
      return base.map((item, index) => {
        const match = patches.get(String(itemKey(item, index)));
        return isPlainObject(item) && isPlainObject(match) ? mergeLocaleValue(item, match) : item;
      });
    }
    if (isPlainObject(base) && isPlainObject(patch)) {
      const result = { ...base };
      Object.entries(patch).forEach(([key, value]) => {
        if (value !== undefined) result[key] = mergeLocaleValue(result[key], value);
      });
      return result;
    }
    return patch === undefined ? base : patch;
  };

  const localizeComponentTree = (component, patches) => {
    const ownPatch = component?.id ? patches?.[component.id] : null;
    const result = ownPatch ? mergeLocaleValue(component, ownPatch) : { ...component };
    ['components', 'children'].forEach((key) => {
      if (Array.isArray(result[key])) result[key] = result[key].map((child) => localizeComponentTree(child, patches));
    });
    if (Array.isArray(result.props?.components)) {
      result.props = { ...result.props, components: result.props.components.map((child) => localizeComponentTree(child, patches)) };
    }
    if (Array.isArray(result.props?.items)) {
      result.props = {
        ...result.props,
        items: result.props.items.map((item) => ({
          ...item,
          ...(item.component ? { component: localizeComponentTree(item.component, patches) } : {}),
          ...(Array.isArray(item.components) ? { components: item.components.map((child) => localizeComponentTree(child, patches)) } : {}),
        })),
      };
    }
    return result;
  };

  const applyLocale = (config, locale) => {
    const result = clone(config || {});
    const localePatch = result.metadata?.locales?.[locale];
    if (!localePatch) return result;
    if (localePatch.appConfig) result.appConfig = mergeLocaleValue(result.appConfig || {}, localePatch.appConfig);
    Object.entries(localePatch.pages || {}).forEach(([pageId, patch]) => {
      const page = result.pages?.[pageId];
      if (!page) return;
      const localized = { ...page };
      if (patch.title !== undefined) localized.title = patch.title;
      if (patch.description !== undefined) localized.description = patch.description;
      if (Array.isArray(localized.components)) {
        localized.components = localized.components.map((component) => localizeComponentTree(component, patch.components || {}));
      }
      result.pages[pageId] = localized;
    });
    return result;
  };

  const labelMap = () => state.sourceConfig?.metadata?.locales?.[state.locale]?.labels || {};
  const localizeLabel = (value) => {
    const raw = String(value ?? '');
    const labels = labelMap();
    if (labels[raw]) return labels[raw];
    return Object.keys(labels).sort((left, right) => right.length - left.length)
      .reduce((result, key) => key && result.includes(key) ? result.split(key).join(labels[key]) : result, raw);
  };
  const textValue = (value) => {
    if (value === null || value === undefined) return '';
    if (isPlainObject(value)) {
      const picked = value[state.locale] ?? value.zh ?? value.en;
      return picked === undefined || isPlainObject(picked) ? '' : localizeLabel(picked);
    }
    return localizeLabel(value);
  };

  const toKebab = (value) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const styleText = (styles) => Object.entries(styles || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${toKebab(key)}:${String(value)}`)
    .join(';');
  const safeCustomCss = (css) => {
    const source = String(css || '');
    if (/@import|javascript:|expression\s*\(|url\s*\(\s*['"]?data:text\/html/i.test(source)) return '';
    return source;
  };
  const customStyleTag = (entity, scope) => {
    const customStyles = entity?.customStyles || entity?.props?.customStyles;
    if (!customStyles) return '';
    const rules = [];
    Object.entries(customStyles.childStyles || {}).forEach(([selector, styles]) => rules.push(`${scope} ${selector}{${styleText(styles)}}`));
    Object.entries(customStyles.stateStyles || {}).forEach(([selector, styles]) => {
      const normalized = selector.startsWith(':') ? selector : `:${selector}`;
      rules.push(`${scope}${normalized}{${styleText(styles)}}`);
    });
    const customCss = safeCustomCss(customStyles.customCss);
    if (customCss) rules.push(customCss.replaceAll('&', scope));
    return rules.length ? `<style>${rules.join('\n')}</style>` : '';
  };

  const iconSvg = (name, className = 'portable-icon') => {
    const paths = {
      LayoutDashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      Activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
      ClipboardList: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
      Menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      X: '<path d="m6 6 12 12M18 6 6 18"/>',
      ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
      ChevronRight: '<path d="m9 18 6-6-6-6"/>',
      Languages: '<path d="M4 5h7M7.5 3v2c0 4-2 7-5 9M5 9c1 2 3 4 6 5M13 20l4-9 4 9M14.5 17h5"/>',
      Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      Moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    };
    const body = paths[name] || '<circle cx="12" cy="12" r="8"/><path d="M9 12h6"/>';
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };

  const formatValue = (value, column) => {
    if (value === null || value === undefined) return '—';
    if (column?.render === 'currency') {
      const number = Number(value);
      return Number.isFinite(number) ? new Intl.NumberFormat(state.locale === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD' }).format(number) : value;
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.map(textValue).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return textValue(value);
  };
  const titleBlock = (title, subtitle) => title
    ? `<div class="portable-section-heading"><div><h2>${escapeHtml(textValue(title))}</h2>${subtitle ? `<p>${escapeHtml(textValue(subtitle))}</p>` : ''}</div></div>`
    : '';
  const renderTypography = (component) => {
    const props = component.props || {};
    const text = props.content ?? props.text ?? props.children ?? props.title ?? '';
    const variant = String(props.variant || 'paragraph').toLowerCase();
    const tag = variant === 'title' || variant.startsWith('h') ? (variant.match(/^h[1-6]$/)?.[0] || 'h2') : 'p';
    return `<${tag} class="portable-typography portable-typography-${escapeHtml(variant)}">${escapeHtml(textValue(text))}</${tag}>`;
  };
  const renderStatistics = (component) => {
    const props = component.props || {};
    const items = props.items || component.mockData || [];
    const columns = Math.max(1, Math.min(6, Number(props.grid?.cols || props.columns || items.length || 1)));
    return `<div class="portable-stat-grid" style="--stat-columns:${columns}">${items.map((item) => {
      const trend = item.trend;
      const direction = trend?.type === 'down' ? 'down' : 'up';
      const trendText = trend ? `${direction === 'down' ? '↓' : '↑'} ${trend.value ?? ''}${trend.suffix ?? ''}` : '';
      return `<article class="portable-stat"><div class="portable-stat-title">${escapeHtml(textValue(item.title || item.label))}</div><div class="portable-stat-value">${escapeHtml(item.prefix || '')}${escapeHtml(item.value)}${escapeHtml(item.suffix || '')}</div>${trend ? `<div class="portable-stat-trend ${direction}">${escapeHtml(trendText)} <span>${escapeHtml(textValue(trend.description || ''))}</span></div>` : ''}</article>`;
    }).join('')}</div>`;
  };
  const renderTable = (component) => {
    const props = component.props || {};
    const rows = component.mockData || props.data || props.rows || [];
    const columns = props.columns?.length ? props.columns : Object.keys(rows[0] || {}).map((key) => ({ key, dataIndex: key, title: key }));
    return `${titleBlock(props.title, props.description)}<div class="portable-table-wrap"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(textValue(column.title || column.label || column.key))}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(formatValue(row[column.dataIndex || column.key], column))}</td>`).join('')}</tr>`).join('')}</tbody></table>${rows.length === 0 ? '<div class="portable-empty">No data</div>' : ''}</div>`;
  };
  const renderDataGridCard = (component) => {
    const props = component.props || {};
    const rows = component.mockData || props.mockData || props.data || props.rows || [];
    const columns = props.columns || [];
    const primary = columns.find((column) => column.primary) || columns[0];
    const secondary = columns.find((column) => column.secondary) || columns[1];
    const details = columns.filter((column) => column !== primary && column !== secondary);
    const gridValue = (row, column) => {
      const value = row?.[column?.dataIndex || column?.key];
      const mapped = column?.render?.text?.[value] ?? value;
      if (column?.render?.type === 'Progress') {
        const progress = Math.max(0, Math.min(100, Number(value) || 0));
        return `<span class="portable-progress"><span style="width:${progress}%"></span></span><small>${escapeHtml(`${progress}%`)}</small>`;
      }
      if (column?.render?.type === 'Tag') {
        return `<span class="portable-tag">${escapeHtml(textValue(mapped))}</span>`;
      }
      return escapeHtml(formatValue(mapped, column));
    };
    return `${titleBlock(props.title, props.description)}${props.showSearch ? `<div class="portable-grid-search"><input type="search" placeholder="${escapeHtml(textValue(props.searchPlaceholder || 'Search...'))}" /></div>` : ''}<div class="portable-card-grid">${rows.map((row) => `<article><header><div><strong>${primary ? gridValue(row, primary) : ''}</strong>${secondary ? `<p>${gridValue(row, secondary)}</p>` : ''}</div><span aria-hidden="true">›</span></header>${details.length ? `<dl>${details.map((column) => `<div><dt>${escapeHtml(textValue(column.title || column.label || column.key))}</dt><dd>${gridValue(row, column)}</dd></div>`).join('')}</dl>` : ''}</article>`).join('')}${rows.length === 0 ? '<div class="portable-empty">No data</div>' : ''}</div>`;
  };
  const numericEntries = (row) => Object.entries(row || {}).filter(([, value]) => typeof value === 'number');
  const renderChart = (component) => {
    const props = component.props || {};
    const rows = component.mockData || props.data || [];
    const values = rows.map((row) => numericEntries(row)[0]?.[1] || 0);
    const labels = rows.map((row, index) => textValue(Object.values(row).find((value) => typeof value === 'string') || index + 1));
    const max = Math.max(...values, 1);
    const width = 720;
    const height = Math.max(180, Number(props.height || 260));
    const chartType = String(props.chartType || props.type || 'bar').toLowerCase();
    let graphic = '';
    if (chartType.includes('line')) {
      const points = values.map((value, index) => {
        const x = values.length === 1 ? width / 2 : 24 + index * ((width - 48) / Math.max(1, values.length - 1));
        const y = height - 36 - (value / max) * (height - 72);
        return `${x},${y}`;
      }).join(' ');
      graphic = `<polyline points="${points}" fill="none" stroke="var(--portable-accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${points.split(' ').map((point) => { const [x, y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="5" fill="var(--portable-surface)" stroke="var(--portable-accent)" stroke-width="3"/>`; }).join('')}`;
    } else {
      const step = (width - 48) / Math.max(1, values.length);
      graphic = values.map((value, index) => {
        const barHeight = (value / max) * (height - 72);
        return `<rect x="${24 + index * step + step * 0.16}" y="${height - 36 - barHeight}" width="${step * 0.68}" height="${barHeight}" rx="5" fill="var(--portable-accent)" opacity="${0.7 + (index % 3) * 0.12}"/>`;
      }).join('');
    }
    const axis = labels.map((label, index) => {
      const x = values.length === 1 ? width / 2 : 24 + index * ((width - 48) / Math.max(1, values.length - 1));
      return `<text x="${x}" y="${height - 10}" text-anchor="middle">${escapeHtml(label)}</text>`;
    }).join('');
    return `${titleBlock(props.title, props.description)}<div class="portable-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(textValue(props.title || 'Chart'))}">${graphic}${axis}</svg></div>`;
  };
  const renderForm = (component) => {
    const props = component.props || {};
    const fields = props.fields || props.items || [];
    return `${titleBlock(props.title, props.description)}<form class="portable-form" onsubmit="return false">${fields.map((field) => {
      const type = field.type === 'textarea' ? 'textarea' : 'input';
      const control = type === 'textarea'
        ? `<textarea placeholder="${escapeHtml(textValue(field.placeholder || ''))}">${escapeHtml(textValue(field.defaultValue || ''))}</textarea>`
        : `<input type="${escapeHtml(field.type === 'number' ? 'number' : 'text')}" value="${escapeHtml(textValue(field.defaultValue || ''))}" placeholder="${escapeHtml(textValue(field.placeholder || ''))}"/>`;
      return `<label><span>${escapeHtml(textValue(field.label || field.title || field.name))}</span>${control}</label>`;
    }).join('')}<button type="button">${escapeHtml(textValue(props.submitButtonText || props.submitText || 'Submit'))}</button></form>`;
  };
  const renderTaskInput = (component) => {
    const props = component.props || {};
    const title = props.title || component.mockTitle;
    const description = props.description || component.mockDescription;
    const files = props.mockFileData?.files || component.mockFileData?.files || [];
    const fields = props.fields || component.parameterConfig?.fields || [];
    return `${titleBlock(props.showTitle === false ? '' : title, props.showDescription === false ? '' : description)}<div class="portable-task-input">${fields.length ? `<div class="portable-task-fields">${fields.map((field) => `<label><span>${escapeHtml(textValue(field.label || field.title || field.name))}</span><input type="text" placeholder="${escapeHtml(textValue(field.placeholder || ''))}" /></label>`).join('')}</div>` : ''}<label class="portable-file-drop"><input type="file" multiple /><span class="portable-file-icon">↑</span><strong>${escapeHtml(textValue(props.uploadText || 'Choose files or drop them here'))}</strong><small>${escapeHtml(textValue(props.uploadHint || 'Files remain local in this portable preview'))}</small></label>${files.length ? `<div class="portable-file-list">${files.map((file) => `<div><span>${escapeHtml(file.name || 'File')}</span><small>${escapeHtml(file.type || '')}</small></div>`).join('')}</div>` : ''}<button type="button" class="portable-task-submit">${escapeHtml(textValue(props.submitButtonText || 'Run task'))}</button></div>`;
  };
  const renderList = (component) => {
    const props = component.props || {};
    const rows = component.mockData || props.items || [];
    return `${titleBlock(props.title, props.description)}<div class="portable-list">${rows.map((row) => {
      const title = typeof row === 'object' ? row.title || row.name || row.label || Object.values(row)[0] : row;
      const description = typeof row === 'object' ? row.description || row.subtitle || Object.values(row)[1] : '';
      return `<article><strong>${escapeHtml(textValue(title))}</strong>${description ? `<p>${escapeHtml(textValue(description))}</p>` : ''}</article>`;
    }).join('')}</div>`;
  };
  const renderTabs = (component) => {
    const props = component.props || {};
    const items = props.items || props.tabs || [];
    const activeKey = state.activeTabs.get(component.id) || items[0]?.key || items[0]?.id;
    const active = items.find((item) => (item.key || item.id) === activeKey) || items[0];
    const activeComponents = active?.components || (active?.component ? [active.component] : []);
    return `<div class="portable-tabs" data-tabs="${escapeHtml(component.id)}"><div class="portable-tab-list">${items.map((item) => `<button type="button" data-tab-key="${escapeHtml(item.key || item.id)}" class="${(item.key || item.id) === activeKey ? 'active' : ''}">${escapeHtml(textValue(item.title || item.label))}</button>`).join('')}</div><div class="portable-tab-panel">${activeComponents.map(renderComponent).join('') || escapeHtml(textValue(active?.content || ''))}</div></div>`;
  };
  const renderContainer = (component) => {
    const props = component.props || {};
    const children = component.components || component.children || props.components || props.children;
    if (Array.isArray(children)) return `<div class="portable-container">${children.map(renderComponent).join('')}</div>`;
    return `${titleBlock(props.title, props.subtitle)}${props.content ? `<p>${escapeHtml(textValue(props.content))}</p>` : ''}`;
  };
  const sanitizeHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    template.content.querySelectorAll('script,iframe,object,embed,link,meta').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (/^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name);
      });
    });
    return template.innerHTML;
  };

  function renderComponent(component) {
    const props = component?.props || {};
    const scopeClass = `portable-component-${String(component?.id || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const rootStyles = component?.customStyles?.rootStyles || props.customStyles?.rootStyles || {};
    let content;
    switch (component?.type) {
      case 'Typography': case 'Text': case 'Title': case 'Paragraph': content = renderTypography(component); break;
      case 'Statistic': case 'StatisticGroup': content = renderStatistics(component); break;
      case 'Table': case 'EditableTable': case 'AnalyticsTable': content = renderTable(component); break;
      case 'DataGridCard': content = renderDataGridCard(component); break;
      case 'Chart': case 'EChartsChart': case 'RadarChart': content = renderChart(component); break;
      case 'Form': content = renderForm(component); break;
      case 'TaskInput': case 'TaskInputRenderer': content = renderTaskInput(component); break;
      case 'List': content = renderList(component); break;
      case 'Tabs': content = renderTabs(component); break;
      case 'Container': case 'Card': content = renderContainer(component); break;
      case 'CustomContent': content = sanitizeHtml(props.html || props.content || ''); break;
      case 'FilterPanel': content = renderForm({ ...component, props: { ...props, submitText: props.submitText || 'Apply filters' } }); break;
      default: content = `<div class="portable-unsupported">Unsupported component: ${escapeHtml(component?.type)}</div>`;
    }
    return `${customStyleTag(component, `.${scopeClass}`)}<section class="portable-component ${scopeClass} portable-type-${escapeHtml(component?.type || 'unknown')}" style="${escapeHtml(styleText(rootStyles))}" data-component-id="${escapeHtml(component?.id)}">${content}</section>`;
  }

  const isVisibleForDevice = (item, device) => !item?.visibility?.devices?.length || item.visibility.devices.includes(device);
  const firstPageForNavigation = (item, device) => {
    if (!isVisibleForDevice(item, device)) return null;
    if (item.linkedPage) return item.linkedPage;
    for (const child of item.children || []) {
      const page = firstPageForNavigation(child, device);
      if (page) return page;
    }
    return null;
  };
  const flattenNavigation = (items, device, depth = 0) => (items || []).flatMap((item) => {
    if (!isVisibleForDevice(item, device)) return [];
    const current = item.linkedPage ? [{ ...item, depth }] : [];
    return current.concat(flattenNavigation(item.children, device, depth + 1));
  });
  const mobileTabs = (items) => (items || []).flatMap((item) => {
    const page = firstPageForNavigation(item, 'mobile');
    return page ? [{ ...item, linkedPage: page }] : [];
  });
  const renderNavItems = (items, device) => flattenNavigation(items, device).map((item) => `
    <button type="button" data-page="${escapeHtml(item.linkedPage)}" class="portable-nav-item ${item.linkedPage === state.activePage ? 'active' : ''}" style="--nav-depth:${item.depth}">
      ${iconSvg(item.icon)}<span>${escapeHtml(textValue(item.title || item.key))}</span>
    </button>`).join('');
  const renderControls = (compact = false) => `<div class="portable-controls ${compact ? 'compact' : ''}">
    <button type="button" data-locale-toggle aria-label="Change language">${iconSvg('Languages')}<span>${state.locale === 'zh' ? 'EN' : 'ZH'}</span></button>
    <button type="button" data-theme-toggle aria-label="Change color theme">${iconSvg(state.theme === 'dark' ? 'Sun' : 'Moon')}<span>${state.theme === 'dark' ? 'Light' : 'Dark'}</span></button>
  </div>`;
  const renderBrand = (collapsed = false) => {
    const appConfig = state.config.appConfig || {};
    return `<div class="portable-brand ${collapsed ? 'collapsed' : ''}"><span>${escapeHtml(textValue(appConfig.name || 'G').slice(0, 1))}</span>${collapsed ? '' : `<div><strong>${escapeHtml(textValue(appConfig.name || 'GeniApp'))}</strong><small>${escapeHtml(textValue(appConfig.description || 'Exported from Workbench'))}</small></div>`}</div>`;
  };

  const renderPage = () => {
    const page = state.config.pages?.[state.activePage] || Object.values(state.config.pages || {})[0];
    const pageKey = state.activePage || Object.keys(state.config.pages || {})[0];
    if (!page) return '<main class="portable-page"><div class="portable-empty">No pages were exported.</div></main>';
    const pageScope = `.portable-page-${String(pageKey).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const pageRoot = page.customStyles?.rootStyles || {};
    const placementList = page.layout?.type === 'grid-24' ? page.layout.components || [] : [];
    const placements = placementList.reduce((result, placement) => {
      if (placement?.id) result[placement.id] = placement;
      return result;
    }, page.layout?.placements || {});
    const components = (page.components || []).map((component) => {
      const placement = placements[component.id];
      const placementStyle = placement
        ? `grid-column:${Number(placement.colStart || 0) + 1} / span ${Number(placement.colSpan || 24)};grid-row:${Number(placement.rowStart || 0) + 1} / span ${Number(placement.rowSpan || 1)};`
        : '';
      return `<div class="portable-placement" style="${placementStyle}">${renderComponent(component)}</div>`;
    }).join('');
    return `${customStyleTag(page, pageScope)}<main class="portable-page ${pageScope}" style="${escapeHtml(styleText(pageRoot))}"><header class="portable-page-header"><div><span class="portable-eyebrow">${escapeHtml(textValue(state.config.appConfig?.name || ''))}</span><h1>${escapeHtml(textValue(page.title || pageKey))}</h1>${page.description ? `<p>${escapeHtml(textValue(page.description))}</p>` : ''}</div></header><div class="portable-page-grid ${page.layout?.type === 'grid-24' ? 'grid-24' : ''}">${components}</div></main>`;
  };

  const applyDocumentUi = () => {
    document.documentElement.lang = state.locale === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.documentElement.dataset.colorMode = state.theme;
    document.documentElement.style.colorScheme = state.theme;
  };
  const renderAndPersistLocale = (locale) => {
    state.locale = normalizeLocale(locale);
    state.config = applyLocale(state.sourceConfig, state.locale);
    try { localStorage.setItem('language', state.locale); } catch { /* ignore */ }
    applyDocumentUi();
    renderApp();
  };
  const renderAndPersistTheme = (theme) => {
    state.theme = normalizeTheme(theme);
    try { localStorage.setItem('theme', state.theme); } catch { /* ignore */ }
    applyDocumentUi();
    renderApp();
  };
  const navigatePage = (page) => {
    if (!state.config.pages?.[page]) return;
    state.activePage = page;
    state.mobileDrawerOpen = false;
    if (decodeURIComponent(window.location.hash.replace(/^#/, '')) !== page) window.location.hash = encodeURIComponent(page);
    renderApp();
  };

  const bindShellBridge = () => {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || message.v !== 1 || typeof message !== 'object') return;
      const normalizedOrigin = event.origin.replace(/\/$/, '');
      if (message.type === 'GENISPACE_SHELL_INIT') {
        const payload = message.payload || {};
        const origins = [payload.shellOrigin, ...(Array.isArray(payload.allowedShellOrigins) ? payload.allowedShellOrigins : [])]
          .filter(Boolean).map((origin) => String(origin).replace(/\/$/, ''));
        if (origins.length && !origins.includes(normalizedOrigin)) return;
        state.allowedShellOrigins = new Set(origins.length ? origins : [normalizedOrigin]);
        if (payload.locale) state.locale = normalizeLocale(payload.locale);
        if (payload.theme) state.theme = normalizeTheme(payload.theme);
        state.config = applyLocale(state.sourceConfig, state.locale);
        applyDocumentUi();
        renderApp();
        window.parent.postMessage({ type: 'GENISPACE_IFRAME_READY', v: 1, identifier: state.config.appConfig?.appId || '' }, event.origin);
        return;
      }
      if (message.type === 'GENISPACE_SHELL_UI' && state.allowedShellOrigins.has(normalizedOrigin)) {
        if (message.locale) state.locale = normalizeLocale(message.locale);
        if (message.theme) state.theme = normalizeTheme(message.theme);
        state.config = applyLocale(state.sourceConfig, state.locale);
        applyDocumentUi();
        renderApp();
      }
    });
  };

  function renderApp() {
    const root = state.root;
    if (!root || !state.config) return;
    const navigation = state.config.appConfig?.navigation?.items || [];
    const mobileNavigation = mobileTabs(navigation);
    root.innerHTML = `<div class="portable-shell ${state.collapsed ? 'sidebar-collapsed' : ''}">
      <aside class="portable-sidebar">
        <div class="portable-sidebar-header">${renderBrand(state.collapsed)}</div>
        <button type="button" class="portable-collapse" data-collapse aria-label="${state.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">${iconSvg(state.collapsed ? 'ChevronRight' : 'ChevronLeft')}</button>
        <nav aria-label="Application navigation">${renderNavItems(navigation, 'desktop')}</nav>
        <footer>${renderControls(state.collapsed)}</footer>
      </aside>
      <header class="portable-mobile-header"><button type="button" data-mobile-drawer aria-label="Open navigation">${iconSvg('Menu')}</button>${renderBrand(false)}${renderControls(true)}</header>
      ${state.mobileDrawerOpen ? `<div class="portable-mobile-backdrop" data-mobile-close></div><aside class="portable-mobile-drawer"><div class="portable-mobile-drawer-close"><button type="button" data-mobile-close aria-label="Close navigation">${iconSvg('X')}</button></div><div class="portable-sidebar-header">${renderBrand(false)}</div><nav>${renderNavItems(navigation, 'mobile')}</nav><footer>${renderControls(false)}</footer></aside>` : ''}
      <div class="portable-content">${renderPage()}</div>
      <nav class="portable-mobile-nav" aria-label="Workbench bottom navigation">${mobileNavigation.map((item) => `<button type="button" data-page="${escapeHtml(item.linkedPage)}" class="${item.linkedPage === state.activePage ? 'active' : ''}" aria-current="${item.linkedPage === state.activePage ? 'page' : 'false'}">${iconSvg(item.icon)}<span>${escapeHtml(textValue(item.title || item.key))}</span></button>`).join('')}</nav>
    </div>`;
    root.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => navigatePage(button.dataset.page)));
    root.querySelectorAll('[data-tabs] [data-tab-key]').forEach((button) => button.addEventListener('click', () => {
      const tabs = button.closest('[data-tabs]');
      state.activeTabs.set(tabs.dataset.tabs, button.dataset.tabKey);
      renderApp();
    }));
    root.querySelectorAll('[data-locale-toggle]').forEach((button) => button.addEventListener('click', () => renderAndPersistLocale(state.locale === 'zh' ? 'en' : 'zh')));
    root.querySelectorAll('[data-theme-toggle]').forEach((button) => button.addEventListener('click', () => renderAndPersistTheme(state.theme === 'dark' ? 'light' : 'dark')));
    root.querySelector('[data-collapse]')?.addEventListener('click', () => {
      state.collapsed = !state.collapsed;
      try { localStorage.setItem('portable_sidebar_collapsed', JSON.stringify(state.collapsed)); } catch { /* ignore */ }
      renderApp();
    });
    root.querySelector('[data-mobile-drawer]')?.addEventListener('click', () => { state.mobileDrawerOpen = true; renderApp(); });
    root.querySelectorAll('[data-mobile-close]').forEach((button) => button.addEventListener('click', () => { state.mobileDrawerOpen = false; renderApp(); }));
  }

  const mountWorkbench = (root, config) => {
    if (!root) throw new Error('A root element is required.');
    state.root = root;
    state.sourceConfig = config || {};
    const search = new URLSearchParams(window.location.search);
    let savedLocale = '';
    let savedTheme = '';
    let savedCollapsed = false;
    try {
      savedLocale = localStorage.getItem('language') || '';
      savedTheme = localStorage.getItem('theme') || '';
      savedCollapsed = JSON.parse(localStorage.getItem('portable_sidebar_collapsed') || 'false');
    } catch { /* ignore */ }
    state.locale = normalizeLocale(search.get('lng') || savedLocale || document.documentElement.lang || 'en');
    state.theme = normalizeTheme(search.get('theme') || savedTheme || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    state.collapsed = Boolean(savedCollapsed);
    state.config = applyLocale(state.sourceConfig, state.locale);
    const requestedPage = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    state.activePage = state.config.pages?.[requestedPage]
      ? requestedPage
      : state.config.appConfig?.defaultPage || Object.keys(state.config.pages || {})[0];
    state.allowedShellOrigins.add(window.location.origin.replace(/\/$/, ''));
    applyDocumentUi();
    bindShellBridge();
    window.addEventListener('hashchange', () => {
      const requested = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (state.config.pages?.[requested] && requested !== state.activePage) {
        state.activePage = requested;
        renderApp();
      }
    });
    renderApp();
    if (window.parent !== window) window.parent.postMessage({ type: 'GENIAPP_READY', app: state.config.appConfig?.appId || '' }, '*');
  };

  return { mountWorkbench };
}


const portableRuntime = createPortableRuntime();

export const mountWorkbench = portableRuntime.mountWorkbench as (
  root: HTMLElement,
  config: WorkbenchConfig,
) => void;

