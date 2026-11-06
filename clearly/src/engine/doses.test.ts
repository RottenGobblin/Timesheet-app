import { describe, expect, it } from 'vitest';
import {
  bicarbGrams,
  drainPercentForStabiliser,
  granularChlorineGrams,
  liquidChlorineMl,
  stabiliserGrams,
} from './doses';

const V = 9600;

describe('dose formulas', () => {
  it('liquid chlorine: Δppm × V ÷ (strength% × 10)', () => {
    expect(liquidChlorineMl(3, V, 12.5)).toBeCloseTo(230.4, 6);
    expect(liquidChlorineMl(1, 10_000, 10)).toBeCloseTo(100, 6);
  });

  it('granular chlorine: Δppm × V ÷ 1000 ÷ (strength% ÷ 100)', () => {
    expect(granularChlorineGrams(3, V, 65)).toBeCloseTo(44.31, 2);
    expect(granularChlorineGrams(1, 10_000, 100)).toBeCloseTo(10, 6);
  });

  it('bicarb: ΔTA × V × 0.00168', () => {
    expect(bicarbGrams(40, V)).toBeCloseTo(645.12, 6);
  });

  it('stabiliser: ΔCYA × V ÷ 1000', () => {
    expect(stabiliserGrams(30, V)).toBeCloseTo(288, 6);
  });

  it('drain: (1 − ideal ÷ current) × 100', () => {
    expect(drainPercentForStabiliser(100, 40)).toBeCloseTo(60, 6);
    expect(drainPercentForStabiliser(80, 60)).toBeCloseTo(25, 6);
    expect(drainPercentForStabiliser(30, 40)).toBe(0);
  });
});
