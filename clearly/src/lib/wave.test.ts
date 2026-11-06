import { describe, expect, it } from 'vitest';
import { wavePath } from './wave';

describe('wavePath', () => {
  it('starts at the left edge and finishes exactly at the right edge', () => {
    const d = wavePath(339, 132, 0, 300);
    expect(d.startsWith('M0 ')).toBe(true);
    expect(d).toMatch(/L339 [\d.]+ L339 132 L0 132 Z$/);
  });

  it('stays within the wave band at the top', () => {
    const ys = [...wavePath(200, 100, 1, 150).matchAll(/[ML]\d+ ([\d.]+)/g)].map((m) => Number(m[1]));
    const surface = ys.slice(0, -2);
    expect(Math.min(...surface)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...surface)).toBeLessThanOrEqual(12);
  });
});
