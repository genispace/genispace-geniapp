import { describe, expect, it } from 'vitest';
import { geniappOptimizeDeps } from './vite';

describe('geniappOptimizeDeps', () => {
  it('pre-bundles the public runtime and its CommonJS transitive dependencies', () => {
    expect(geniappOptimizeDeps.exclude).toEqual(['@genispace/sdk']);
    expect(geniappOptimizeDeps.exclude).not.toContain('@genispace/geniapp');
    expect(geniappOptimizeDeps.exclude).not.toContain('lucide-react');
  });
});
