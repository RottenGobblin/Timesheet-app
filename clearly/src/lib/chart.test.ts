import { describe, expect, it } from 'vitest';
import type { TestRecord } from '../storage';
import { inPeriod, layoutChart, seriesFor, xRangeFor, yDomain } from './chart';

const day = (d: number) => new Date(2026, 10, d, 9).toISOString();
const tests: TestRecord[] = [
  { id: 'c', takenAt: day(5), readings: { fc: 4, ph: 7.6 }, notes: '' },
  { id: 'a', takenAt: day(1), readings: { fc: 2, ph: 7.4 }, notes: '' },
  { id: 'b', takenAt: day(3), readings: { ph: 7.5 }, notes: '' },
];
const now = new Date(2026, 10, 6, 9);

describe('seriesFor', () => {
  it('returns values oldest first and skips missing readings', () => {
    expect(seriesFor(tests, 'fc').map((p) => p.v)).toEqual([2, 4]);
    expect(seriesFor(tests, 'ph').map((p) => p.v)).toEqual([7.4, 7.5, 7.6]);
    expect(seriesFor(tests, 'ta')).toEqual([]);
  });
});

describe('inPeriod', () => {
  it('keeps points inside the window', () => {
    const old = [{ t: new Date(2026, 6, 1).getTime(), v: 1 }, ...seriesFor(tests, 'fc')];
    expect(inPeriod(old, '30d', now)).toHaveLength(2);
    expect(inPeriod(old, 'all', now)).toHaveLength(3);
  });
});

describe('yDomain', () => {
  it('covers the data and the ideal band with headroom', () => {
    const [lo, hi] = yDomain(seriesFor(tests, 'ph'), { min: 7.2, ideal: 7.4, max: 7.6 }, 'ph');
    expect(lo).toBeLessThan(7.2);
    expect(hi).toBeGreaterThan(7.6);
  });

  it('never goes below zero for ppm readings', () => {
    expect(yDomain([{ t: 0, v: 0 }], { min: 3, ideal: 4, max: 8 }, 'fc')[0]).toBe(0);
  });

  it('stretches to fit out-of-range values', () => {
    expect(yDomain([{ t: 0, v: 15 }], { min: 3, ideal: 4, max: 8 }, 'fc')[1]).toBeGreaterThanOrEqual(15);
  });
});

describe('layoutChart', () => {
  const box = { width: 300, height: 120, padLeft: 30, padRight: 10, padTop: 10, padBottom: 10 };

  it('maps time to x and value to y, with higher values nearer the top', () => {
    const pts = seriesFor(tests, 'fc');
    const l = layoutChart(pts, { min: 3, ideal: 4, max: 8 }, [0, 10], xRangeFor(pts, 'all', now), box);
    expect(l.dots[0]).toMatchObject({ x: 30, y: 90 });
    expect(l.dots[1]).toMatchObject({ x: 290, y: 70 });
    expect(l.path).toBe('M30 90 L290 70');
    expect(l.bandTop).toBe(30);
    expect(l.bandBottom).toBe(80);
  });

  it('centres a single point and draws no line', () => {
    const pts = [{ t: 1000, v: 5 }];
    const l = layoutChart(pts, { min: 3, ideal: 4, max: 8 }, [0, 10], xRangeFor(pts, 'all', now), box);
    expect(l.dots[0]!.x).toBe(160);
    expect(l.path).toBe('');
  });

  it('gives three y ticks', () => {
    const l = layoutChart([], { min: 3, ideal: 4, max: 8 }, [0, 10], [0, 1], box);
    expect(l.yTicks.map((t) => t.label)).toEqual([0, 5, 10]);
  });
});
