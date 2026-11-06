import type { Band, PoolProfile, Range, ReadingKey, Targets } from './types';

const PH: Range = { min: 7.2, ideal: 7.4, max: 7.6 };
const TA_LIQUID_OR_SALT: Range = { min: 60, ideal: 80, max: 120 };
const TA_GRANULAR: Range = { min: 80, ideal: 100, max: 150 };
const CYA_OUTDOOR_CHLORINE: Range = { min: 30, ideal: 40, max: 60 };
const CYA_OUTDOOR_SALT: Range = { min: 50, ideal: 60, max: 80 };
const CYA_INDOOR: Range = { min: 0, ideal: 0, max: 20 };

export function stabiliserTarget(profile: Pick<PoolProfile, 'location' | 'sanitiser'>): Range {
  if (profile.location === 'indoor') return { ...CYA_INDOOR };
  return profile.sanitiser === 'salt' ? { ...CYA_OUTDOOR_SALT } : { ...CYA_OUTDOOR_CHLORINE };
}

export function alkalinityTarget(profile: Pick<PoolProfile, 'sanitiser'>): Range {
  return profile.sanitiser === 'granular' ? { ...TA_GRANULAR } : { ...TA_LIQUID_OR_SALT };
}

/** Free chlorine target scales with stabiliser, since CYA holds chlorine in reserve. */
export function chlorineTarget(cya: number): Range {
  const min = Math.max(1, 0.075 * cya);
  const ideal = Math.max(3, 0.1 * cya);
  const max = Math.max(2 * ideal, 6);
  return { min: round1(min), ideal: round1(ideal), max: round1(max) };
}

/**
 * Targets for a pool. Chlorine depends on stabiliser: pass the measured CYA,
 * or leave it out to use the ideal stabiliser level for the pool.
 */
export function getTargets(
  profile: Pick<PoolProfile, 'location' | 'sanitiser'>,
  cya?: number,
): Targets {
  const cyaRange = stabiliserTarget(profile);
  return {
    ph: { ...PH },
    ta: alkalinityTarget(profile),
    cya: cyaRange,
    fc: chlorineTarget(cya ?? cyaRange.ideal),
  };
}

/** Where a value sits against its range, for the low / ideal / high bands on the Test screen. */
export function classify(value: number, range: Range): Band {
  if (value < range.min) return 'low';
  if (value > range.max) return 'high';
  return 'ideal';
}

export function classifyReading(key: ReadingKey, value: number, targets: Targets): Band {
  return classify(value, targets[key]);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
