/**
 * Clearly dosing engine. Pure TypeScript, no React or Expo, so it can be tested
 * in isolation and reused on web or a backend later.
 */
export * from './types';
export { DEFAULT_STRENGTHS, READING_LIMITS, NO_SWIM_FC, PH_ACT_LOW, PH_ACT_HIGH, FC_ACT_FRACTION } from './defaults';
export { getTargets, chlorineTarget, stabiliserTarget, alkalinityTarget, classify, classifyReading } from './targets';
export { roundMeasurable, toAmount } from './rounding';
export { validateReadings, validateProfile, READING_LABELS } from './validate';
export { buildDosePlan } from './plan';
