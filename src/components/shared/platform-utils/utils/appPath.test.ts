import { describe, expect, it } from 'vitest';
import { pathnameWithinBase } from './appPath';

describe('pathnameWithinBase', () => {
  it('strips versioned Vite base', () => {
    expect(pathnameWithinBase('/account/1.0.0/dashboard', '/account/1.0.0/')).toBe('dashboard');
    expect(pathnameWithinBase('/account/1.0.0/foo/bar', '/account/1.0.0/')).toBe('foo/bar');
  });

  it('returns empty string at base root', () => {
    expect(pathnameWithinBase('/account/1.0.0', '/account/1.0.0/')).toBe('');
    expect(pathnameWithinBase('/account/1.0.0/', '/account/1.0.0/')).toBe('');
  });

  it('dev base / passes pathname without slashes at ends', () => {
    expect(pathnameWithinBase('/dashboard', '/')).toBe('dashboard');
    expect(pathnameWithinBase('/crm/pipeline', '/')).toBe('crm/pipeline');
  });

  it('normalizes duplicate slashes in pathname', () => {
    expect(pathnameWithinBase('/account/1.0.0//invoices', '/account/1.0.0/')).toBe('invoices');
  });
});
