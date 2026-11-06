import type { ProductStrengths } from './types';

export const DEFAULT_STRENGTHS: ProductStrengths = {
  liquidChlorinePct: 12.5,
  granularChlorinePct: 65,
  acidType: 'hydrochloric',
  hydrochloricAcidPct: 32,
  dryAcidPurityPct: 93,
};

/** Accepted input ranges for readings. */
export const READING_LIMITS = {
  ph: { min: 6, max: 9 },
  fc: { min: 0, max: 30 },
  ta: { min: 0, max: 400 },
  cya: { min: 0, max: 300 },
} as const;

/** Free chlorine above this: no swimming until it drops. */
export const NO_SWIM_FC = 10;

/** Only mention the alkalinity drop from an acid dose when it's at least this big (ppm). */
export const REPORT_TA_DROP_PPM = 5;

/** Suggested waits between steps, in hours. */
export const WAIT_HOURS = {
  alkalinity: 6,
  ph: 4,
} as const;

/** Days to wait before retesting stabiliser after adding it. */
export const STABILISER_RETEST_DAYS = 7;
