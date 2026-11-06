import { describe, expect, it } from 'vitest';
import { getTargets } from '../engine';
import {
  bandScale,
  clampReading,
  formatReading,
  markerPosition,
  startingValue,
  stepReading,
  verdict,
} from './readings';

const outdoor = getTargets({ sanitiser: 'liquid', location: 'outdoor' }, 40);

describe('stepping', () => {
  it('steps by kit resolution without floating point noise', () => {
    expect(stepReading('ph', 7.4, 1)).toBe(7.5);
    expect(stepReading('ph', 7.2, -1)).toBe(7.1);
    expect(stepReading('fc', 1.5, 1)).toBe(2);
    expect(stepReading('ta', 80, -1)).toBe(70);
    expect(stepReading('cya', 40, 1)).toBe(50);
  });

  it('stays inside the accepted ranges', () => {
    expect(stepReading('fc', 0, -1)).toBe(0);
    expect(stepReading('ph', 9, 1)).toBe(9);
    expect(stepReading('ph', 6, -1)).toBe(6);
    expect(clampReading('ta', 450)).toBe(400);
  });
});

describe('startingValue', () => {
  it('starts at the ideal when there is no previous test', () => {
    expect(startingValue('fc', outdoor)).toBe(4);
    expect(startingValue('ph', outdoor)).toBe(7.4);
    expect(startingValue('ta', outdoor)).toBe(80);
    expect(startingValue('cya', outdoor)).toBe(40);
  });

  it('starts at the last reading when there is one, rounded to the step', () => {
    expect(startingValue('ph', outdoor, { ph: 7.63 })).toBe(7.6);
    expect(startingValue('ta', outdoor, { ta: 96 })).toBe(100);
    expect(startingValue('fc', outdoor, { ph: 7.2 })).toBe(4);
  });
});

describe('formatReading', () => {
  it('shows one decimal for FC and pH, none for TA and CYA', () => {
    expect(formatReading('fc', 3)).toBe('3.0');
    expect(formatReading('ph', 7.4)).toBe('7.4');
    expect(formatReading('ta', 80)).toBe('80');
  });
});

describe('bandScale and markerPosition', () => {
  it('puts the ideal zone in the right place for pH', () => {
    const s = bandScale('ph', outdoor);
    expect(s.from).toBe(6.8);
    expect(s.to).toBe(8.2);
    expect(s.idealStart).toBeCloseTo(0.2857, 3);
    expect(s.idealEnd).toBeCloseTo(0.5714, 3);
    expect(markerPosition(7.5, s)).toBeCloseTo(0.5, 6);
  });

  it('pins markers to the ends when off the scale', () => {
    const s = bandScale('ph', outdoor);
    expect(markerPosition(6.0, s)).toBe(0);
    expect(markerPosition(9.0, s)).toBe(1);
  });

  it('scales the chlorine bar with stabiliser', () => {
    const low = bandScale('fc', getTargets({ sanitiser: 'liquid', location: 'outdoor' }, 0));
    const high = bandScale('fc', getTargets({ sanitiser: 'liquid', location: 'outdoor' }, 100));
    expect(high.to).toBeGreaterThan(low.to);
  });

  it('handles the indoor stabiliser range with no low zone', () => {
    const s = bandScale('cya', getTargets({ sanitiser: 'liquid', location: 'indoor' }));
    expect(s.idealStart).toBe(0);
    expect(s.idealEnd).toBeGreaterThan(0);
  });
});

describe('verdict', () => {
  it('is good in range and adjust just outside it', () => {
    expect(verdict('ph', 7.4, outdoor)).toMatchObject({ band: 'ideal', severity: 'good' });
    expect(verdict('ph', 7.8, outdoor)).toMatchObject({ band: 'high', severity: 'adjust' });
    expect(verdict('fc', 2, outdoor)).toMatchObject({ band: 'low', severity: 'adjust' });
    expect(verdict('fc', 2, outdoor).message).toMatch(/lazy day/);
  });

  it('uses danger and plain wording for act-now and safety cases', () => {
    expect(verdict('fc', 12, outdoor)).toMatchObject({ severity: 'danger', message: expect.stringMatching(/No swimming/) });
    expect(verdict('fc', 1, outdoor).severity).toBe('danger');
    expect(verdict('ph', 6.8, outdoor).severity).toBe('danger');
    expect(verdict('ph', 8.2, outdoor).severity).toBe('danger');
  });

  it('keeps FC between max and 10 as adjust, not danger', () => {
    expect(verdict('fc', 9, outdoor)).toMatchObject({ band: 'high', severity: 'adjust' });
  });
});
