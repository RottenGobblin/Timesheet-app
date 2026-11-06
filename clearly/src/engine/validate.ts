import { READING_LIMITS } from './defaults';
import type { PoolProfile, ReadingKey, Readings, ValidationIssue } from './types';

const READING_LABELS: Record<ReadingKey, string> = {
  fc: 'Free chlorine',
  ph: 'pH',
  ta: 'Alkalinity',
  cya: 'Stabiliser',
};

export function validateReadings(readings: Readings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of Object.keys(READING_LIMITS) as ReadingKey[]) {
    const value = readings[key];
    if (value === undefined) continue;
    const { min, max } = READING_LIMITS[key];
    if (!Number.isFinite(value)) {
      issues.push({ field: key, message: `${READING_LABELS[key]} needs to be a number.` });
    } else if (value < min || value > max) {
      const unit = key === 'ph' ? '' : ' ppm';
      issues.push({
        field: key,
        message: `${READING_LABELS[key]} should be between ${min} and ${max}${unit}. Check the reading and try again.`,
      });
    }
  }
  return issues;
}

export function validateProfile(profile: PoolProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isFinite(profile.volumeLitres) || profile.volumeLitres <= 0) {
    issues.push({ field: 'volumeLitres', message: 'Pool volume needs to be more than 0 litres.' });
  }
  const s = profile.strengths;
  const pctFields = [
    ['liquidChlorinePct', s.liquidChlorinePct, 'Liquid chlorine strength'],
    ['granularChlorinePct', s.granularChlorinePct, 'Granular chlorine strength'],
    ['hydrochloricAcidPct', s.hydrochloricAcidPct, 'Acid strength'],
    ['dryAcidPurityPct', s.dryAcidPurityPct, 'Dry acid purity'],
  ] as const;
  for (const [field, value, label] of pctFields) {
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      issues.push({ field, message: `${label} should be between 0 and 100%.` });
    }
  }
  return issues;
}

export { READING_LABELS };
