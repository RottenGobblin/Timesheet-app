import {
  classify,
  FC_ACT_FRACTION,
  NO_SWIM_FC,
  PH_ACT_HIGH,
  PH_ACT_LOW,
  READING_LIMITS,
  type Band,
  type ReadingKey,
  type Readings,
  type Targets,
} from '../engine';

/** Display order on the Test screen. */
export const READING_ORDER: ReadingKey[] = ['fc', 'ph', 'ta', 'cya'];

export interface ReadingConfig {
  label: string;
  unit: string;
  /** Stepper increment, matching common test kit resolution. */
  step: number;
  decimals: number;
}

export const READING_CONFIG: Record<ReadingKey, ReadingConfig> = {
  fc: { label: 'Free chlorine', unit: 'ppm', step: 0.5, decimals: 1 },
  ph: { label: 'pH', unit: '', step: 0.1, decimals: 1 },
  ta: { label: 'Alkalinity', unit: 'ppm', step: 10, decimals: 0 },
  cya: { label: 'Stabiliser', unit: 'ppm', step: 10, decimals: 0 },
};

export function formatReading(key: ReadingKey, value: number): string {
  return value.toFixed(READING_CONFIG[key].decimals);
}

function roundToStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

/** Clamp to the accepted input range and round off floating point noise. */
export function clampReading(key: ReadingKey, value: number): number {
  const { min, max } = READING_LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

export function stepReading(key: ReadingKey, value: number, direction: 1 | -1): number {
  return clampReading(key, value + direction * READING_CONFIG[key].step);
}

/**
 * Where a new reading starts when the owner taps "Add": last test's value if there is
 * one (water rarely moves far between tests), otherwise the ideal. Rounded to the step.
 */
export function startingValue(key: ReadingKey, targets: Targets, last?: Readings): number {
  const value = last?.[key] ?? targets[key].ideal;
  return clampReading(key, roundToStep(value, READING_CONFIG[key].step));
}

export interface BandScale {
  /** Left edge of the bar. */
  from: number;
  /** Right edge of the bar. */
  to: number;
  /** Fractions (0 to 1) where the ideal zone starts and ends. */
  idealStart: number;
  idealEnd: number;
}

/** The visible range of the low / ideal / high bar for a reading. */
export function bandScale(key: ReadingKey, targets: Targets): BandScale {
  const range = targets[key];
  const from = key === 'ph' ? 6.8 : 0;
  const to = key === 'ph' ? 8.2 : Math.max(range.max * 1.6, range.ideal * 2, 10);
  return {
    from,
    to,
    idealStart: fraction(range.min, from, to),
    idealEnd: fraction(range.max, from, to),
  };
}

/** Marker position (0 to 1) on the bar. Values off the ends sit at the ends. */
export function markerPosition(value: number, scale: BandScale): number {
  return fraction(value, scale.from, scale.to);
}

function fraction(value: number, from: number, to: number): number {
  if (to <= from) return 0;
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

/** good = lime, adjust = coral, danger = deep red (act now and safety only). */
export type Severity = 'good' | 'adjust' | 'danger';

export interface ReadingVerdict {
  band: Band;
  severity: Severity;
  /** Short line under the value. */
  message: string;
}

const MESSAGES: Record<ReadingKey, Record<Band, string>> = {
  fc: {
    low: 'Your chlorine’s having a lazy day',
    ideal: 'Spot on',
    high: 'On the high side, hold off adding more',
  },
  ph: {
    low: 'A bit acidic',
    ideal: 'Spot on',
    high: 'Running a bit high',
  },
  ta: {
    low: 'A bit low, so pH may bounce around',
    ideal: 'Nice and steady',
    high: 'On the high side',
  },
  cya: {
    low: 'Not much sun protection for your chlorine',
    ideal: 'Spot on',
    high: 'Too high, chlorine gets sluggish',
  },
};

/** How a single reading looks against its target, for the coloured band and its message. */
export function verdict(key: ReadingKey, value: number, targets: Targets): ReadingVerdict {
  const range = targets[key];
  const band = classify(value, range);

  // Safety and "act now" cases get plain wording and the deeper red.
  if (key === 'fc' && value > NO_SWIM_FC) {
    return { band, severity: 'danger', message: `Above ${NO_SWIM_FC} ppm. No swimming until it drops.` };
  }
  if (key === 'fc' && value < range.min * FC_ACT_FRACTION) {
    return { band, severity: 'danger', message: 'Too low to keep the water safe' };
  }
  if (key === 'ph' && value < PH_ACT_LOW) {
    return { band, severity: 'danger', message: 'Very low. This can sting eyes and damage the pool.' };
  }
  if (key === 'ph' && value > PH_ACT_HIGH) {
    return { band, severity: 'danger', message: 'Very high. Chlorine barely works at this pH.' };
  }

  return { band, severity: band === 'ideal' ? 'good' : 'adjust', message: MESSAGES[key][band] };
}
