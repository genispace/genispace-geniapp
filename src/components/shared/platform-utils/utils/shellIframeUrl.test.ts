import { describe, expect, it } from 'vitest';
import { buildAppIframeSrc, isExpandedGeniappIframeBase, shellPathnameToInnerPath } from './shellIframeUrl';

describe('isExpandedGeniappIframeBase', () => {
  it('detects expanded CDN directory', () => {
    expect(isExpandedGeniappIframeBase('https://geniapps.test.genispace.cn/custom-project/1.1.0/', 'custom-project')).toBe(true);
    expect(isExpandedGeniappIframeBase('https://cdn.example.test/apps/custom-project/1.1.0/', 'custom-project')).toBe(true);
  });

  it('treats bare dev origin as legacy', () => {
    expect(isExpandedGeniappIframeBase('http://127.0.0.1:5245/', 'custom-project')).toBe(false);
    expect(isExpandedGeniappIframeBase('https://cdn.example.test/custom-project/assets/', 'custom-project')).toBe(false);
  });
});

describe('buildAppIframeSrc', () => {
  it('loads CDN app root without duplicating identifier', () => {
    expect(
      buildAppIframeSrc('https://geniapps.test.genispace.cn/custom-project/1.1.0/', 'custom-project', '')
    ).toBe('https://geniapps.test.genispace.cn/custom-project/1.1.0/');
  });

  it('loads the CDN app root for deep shell routes', () => {
    expect(
      buildAppIframeSrc('https://geniapps.test.genispace.cn/custom-project/1.1.0/', 'custom-project', 'test-defects')
    ).toBe('https://geniapps.test.genispace.cn/custom-project/1.1.0/');
    expect(
      buildAppIframeSrc(
        'https://geniapps.test.genispace.cn/custom-project/1.1.0/',
        'custom-project',
        'reports/project?period=current',
      ),
    ).toBe('https://geniapps.test.genispace.cn/custom-project/1.1.0/');
  });

  it('keeps legacy dev origin + identifier prefix', () => {
    expect(buildAppIframeSrc('http://127.0.0.1:5220/', 'hr-timesheet', '')).toBe('http://127.0.0.1:5220/hr-timesheet/');
    expect(buildAppIframeSrc('http://127.0.0.1:5220/', 'hr-timesheet', 'reports/project')).toBe(
      'http://127.0.0.1:5220/hr-timesheet/reports/project'
    );
  });
});

describe('shellPathnameToInnerPath', () => {
  it('strips shell app slug', () => {
    expect(shellPathnameToInnerPath('/custom-project/test-defects', 'custom-project')).toBe('test-defects');
    expect(shellPathnameToInnerPath('/custom-project', 'custom-project')).toBe('');
  });
});
