import { describe, expect, it } from 'vitest';
import { formatLitres, parseNumber, stepValue } from './number';

describe('parseNumber', () => {
  it.each([
    ['9600', 9600],
    ['9,600', 9600],
    ['9 600', 9600],
    ['42,000', 42000],
    ['12.5', 12.5],
    ['12,5', 12.5],
    [' 7.4 ', 7.4],
    ['.5', 0.5],
    ['12.', 12],
  ])('reads %j as %d', (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '1.2.3', '12a'])('rejects %j', (input) => {
    expect(parseNumber(input)).toBeUndefined();
  });
});

describe('formatLitres', () => {
  it('adds thousands separators', () => {
    expect(formatLitres(9600)).toBe('9,600');
    expect(formatLitres(42000)).toBe('42,000');
  });
});

describe('stepValue', () => {
  it('steps without floating point noise and clamps', () => {
    expect(stepValue(12.5, 0.5, 1, 100)).toBe(13);
    expect(stepValue(0.1, 0.2, 0, 1)).toBe(0.3);
    expect(stepValue(99.5, 1, 1, 100)).toBe(100);
    expect(stepValue(1, -1, 1, 100)).toBe(1);
  });
});
