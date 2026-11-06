import { describe, expect, it } from 'vitest';
import { poolVolumeLitres } from './volume';

describe('poolVolumeLitres', () => {
  it('rectangle with a sloping floor uses the average depth', () => {
    // 8 × 4 × ((1.0 + 2.0) / 2) = 48 m³
    expect(poolVolumeLitres('rectangle', { length: 8, width: 4, shallowDepth: 1, deepDepth: 2 })).toBe(48_000);
  });

  it('rectangle with a flat floor', () => {
    // 6 × 3.2 × 0.5 = 9.6 m³, the brief's reference pool
    expect(poolVolumeLitres('rectangle', { length: 6, width: 3.2, shallowDepth: 0.5 })).toBe(9600);
  });

  it('round pool from diameter', () => {
    // π × 2² × 1.2 = 15.08 m³
    expect(poolVolumeLitres('round', { length: 4, shallowDepth: 1.2 })).toBe(15_100);
  });

  it('oval pool', () => {
    // π × 3 × 1.5 × 1.2 = 16.96 m³
    expect(poolVolumeLitres('oval', { length: 6, width: 3, shallowDepth: 1.2 })).toBe(17_000);
  });

  it('returns 0 when a dimension is missing or not positive', () => {
    expect(poolVolumeLitres('rectangle', { length: 8, shallowDepth: 1 })).toBe(0);
    expect(poolVolumeLitres('round', { length: 0, shallowDepth: 1 })).toBe(0);
    expect(poolVolumeLitres('rectangle', { length: 8, width: 4, shallowDepth: -1 })).toBe(0);
  });
});
