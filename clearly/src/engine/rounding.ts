import type { Amount } from './types';

/**
 * Round to an amount people can actually measure:
 * steps of 5 under 50, 10 under 500, 50 from 500 up.
 * Anything above zero rounds to at least the smallest step.
 */
export function roundMeasurable(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const step = raw < 50 ? 5 : raw < 500 ? 10 : 50;
  return Math.max(step, Math.round(raw / step) * step);
}

/** Round and format a liquid (mL) or dry (g) amount, switching to L or kg at 1000. */
export function toAmount(raw: number, baseUnit: 'mL' | 'g'): Amount {
  const base = roundMeasurable(raw);
  if (base >= 1000) {
    const value = base / 1000;
    const unit = baseUnit === 'mL' ? 'L' : 'kg';
    return { base, baseUnit, value, unit, display: `${formatNumber(value)} ${unit}` };
  }
  return { base, baseUnit, value: base, unit: baseUnit, display: `${base} ${baseUnit}` };
}

function formatNumber(n: number): string {
  // At most two decimals, no trailing zeros: 1, 1.5, 1.25
  return String(Math.round(n * 100) / 100);
}
