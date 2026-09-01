import { beforeEach, describe, expect, it } from 'vitest';

import { mountWorkbench } from './runtime';
import type { WorkbenchConfig } from './types';

const config: WorkbenchConfig = {
  schemaVersion: 1,
  appConfig: {
    appId: 'portable-test',
    name: 'Operations',
    description: 'Portable application',
    defaultPage: 'overview',
    navigation: { items: [{ key: 'overview', title: 'Overview', linkedPage: 'overview' }] },
  },
  pages: {
    overview: {
      title: 'Overview',
      components: [
        { id: 'cards', type: 'DataGridCard', props: { title: 'Candidates', columns: [{ title: 'Name', dataIndex: 'name', primary: true }] }, mockData: [{ name: 'Taylor' }] },
        { id: 'task', type: 'TaskInput', props: { title: 'Import', submitButtonText: 'Run import' } },
      ],
    },
  },
  metadata: {
    locales: {
      zh: {
        appConfig: { name: '运营中心' },
        pages: { overview: { title: '概览' } },
        labels: { Candidates: '候选人', Import: '导入', 'Run import': '运行导入' },
      },
    },
  },
};

describe('portable Workbench runtime', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    localStorage.clear();
    window.location.hash = '';
  });

  it('renders portable components and switches locale and theme', () => {
    const root = document.getElementById('root')!;
    mountWorkbench(root, config);

    expect(root.textContent).toContain('Candidates');
    expect(root.textContent).toContain('Taylor');
    expect(root.textContent).toContain('Run import');

    root.querySelector<HTMLElement>('[data-locale-toggle]')!.click();
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(root.textContent).toContain('候选人');
    expect(root.textContent).toContain('运行导入');

    root.querySelector<HTMLElement>('[data-theme-toggle]')!.click();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.dataset.colorMode).toBe('dark');
  });
});
