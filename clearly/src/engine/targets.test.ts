import { describe, expect, it } from 'vitest';
import { chlorineTarget, classify, getTargets } from './targets';

describe('getTargets', () => {
  it('uses the liquid/salt alkalinity range and outdoor chlorine stabiliser range', () => {
    const t = getTargets({ sanitiser: 'liquid', location: 'outdoor' });
    expect(t.ph).toEqual({ min: 7.2, ideal: 7.4, max: 7.6 });
    expect(t.ta).toEqual({ min: 60, ideal: 80, max: 120 });
    expect(t.cya).toEqual({ min: 30, ideal: 40, max: 60 });
  });

  it('uses the higher alkalinity range for granular chlorine', () => {
    expect(getTargets({ sanitiser: 'granular', location: 'outdoor' }).ta).toEqual({ min: 80, ideal: 100, max: 150 });
  });

  it('uses the salt stabiliser range outdoors', () => {
    expect(getTargets({ sanitiser: 'salt', location: 'outdoor' }).cya).toEqual({ min: 50, ideal: 60, max: 80 });
  });

  it('uses the indoor stabiliser range regardless of sanitiser', () => {
    expect(getTargets({ sanitiser: 'salt', location: 'indoor' }).cya).toEqual({ min: 0, ideal: 0, max: 20 });
  });

  it('scales chlorine from the measured stabiliser, or the ideal when not given', () => {
    expect(getTargets({ sanitiser: 'liquid', location: 'outdoor' }, 80).fc).toEqual(chlorineTarget(80));
    expect(getTargets({ sanitiser: 'liquid', location: 'outdoor' }).fc).toEqual(chlorineTarget(40));
  });
});

describe('chlorineTarget', () => {
  it('has floors at low stabiliser', () => {
    expect(chlorineTarget(0)).toEqual({ min: 1, ideal: 3, max: 6 });
  });

  it('scales with stabiliser', () => {
    expect(chlorineTarget(40)).toEqual({ min: 3, ideal: 4, max: 8 });
    expect(chlorineTarget(60)).toEqual({ min: 4.5, ideal: 6, max: 12 });
    expect(chlorineTarget(100)).toEqual({ min: 7.5, ideal: 10, max: 20 });
  });
});

describe('classify', () => {
  const range = { min: 7.2, ideal: 7.4, max: 7.6 };
  it('bands values as low, ideal or high with inclusive edges', () => {
    expect(classify(7.1, range)).toBe('low');
    expect(classify(7.2, range)).toBe('ideal');
    expect(classify(7.6, range)).toBe('ideal');
    expect(classify(7.7, range)).toBe('high');
  });
});
