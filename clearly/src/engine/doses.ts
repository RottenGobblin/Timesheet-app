/**
 * Raw (unrounded) dose formulas from the brief. V is pool volume in litres.
 */

/** Liquid chlorine, mL = Δppm × V ÷ (strength% × 10). */
export function liquidChlorineMl(deltaPpm: number, volumeLitres: number, strengthPct: number): number {
  return (deltaPpm * volumeLitres) / (strengthPct * 10);
}

/** Granular chlorine, g = Δppm × V ÷ 1000 ÷ (strength% ÷ 100). */
export function granularChlorineGrams(deltaPpm: number, volumeLitres: number, strengthPct: number): number {
  return (deltaPpm * volumeLitres) / 1000 / (strengthPct / 100);
}

/** Sodium bicarbonate, g = ΔTA × V × 0.00168. */
export function bicarbGrams(deltaTa: number, volumeLitres: number): number {
  return deltaTa * volumeLitres * 0.00168;
}

/** Stabiliser (cyanuric acid), g = ΔCYA × V ÷ 1000. */
export function stabiliserGrams(deltaCya: number, volumeLitres: number): number {
  return (deltaCya * volumeLitres) / 1000;
}

/** Percentage of the pool to drain and refill to bring stabiliser down to the ideal. */
export function drainPercentForStabiliser(current: number, ideal: number): number {
  if (current <= ideal || current <= 0) return 0;
  return (1 - ideal / current) * 100;
}
