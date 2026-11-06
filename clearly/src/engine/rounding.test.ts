import { describe, expect, it } from 'vitest';
import { roundMeasurable, toAmount } from './rounding';

describe('roundMeasurable', () => {
  it('uses steps of 5 under 50', () => {
    expect(roundMeasurable(12)).toBe(10);
    expect(roundMeasurable(13)).toBe(15);
    expect(roundMeasurable(47.4)).toBe(45);
  });

  it('uses steps of 10 under 500', () => {
    expect(roundMeasurable(230.4)).toBe(230);
    expect(roundMeasurable(288)).toBe(290);
    expect(roundMeasurable(494)).toBe(490);
  });

  it('uses steps of 50 from 500 up', () => {
    expect(roundMeasurable(645.12)).toBe(650);
    expect(roundMeasurable(1240)).toBe(1250);
  });

  it('never rounds a real dose down to nothing', () => {
    expect(roundMeasurable(1)).toBe(5);
    expect(roundMeasurable(0.2)).toBe(5);
  });

  it('returns 0 for zero, negative or non-finite input', () => {
    expect(roundMeasurable(0)).toBe(0);
    expect(roundMeasurable(-10)).toBe(0);
    expect(roundMeasurable(Number.NaN)).toBe(0);
  });
});

describe('toAmount', () => {
  it('keeps mL and g under 1000', () => {
    expect(toAmount(230.4, 'mL')).toMatchObject({ base: 230, unit: 'mL', display: '230 mL' });
    expect(toAmount(645, 'g')).toMatchObject({ base: 650, unit: 'g', display: '650 g' });
  });

  it('switches to L and kg at 1000', () => {
    expect(toAmount(1000, 'mL')).toMatchObject({ base: 1000, value: 1, unit: 'L', display: '1 L' });
    expect(toAmount(1240, 'g')).toMatchObject({ base: 1250, value: 1.25, unit: 'kg', display: '1.25 kg' });
    expect(toAmount(2510, 'mL').display).toBe('2.5 L');
  });

  it('switches unit when rounding crosses 1000', () => {
    expect(toAmount(990, 'g')).toMatchObject({ base: 1000, unit: 'kg', display: '1 kg' });
  });
});
