import { DEFAULT_STRENGTHS, validateProfile, type PoolLocation, type ProductStrengths, type Sanitiser } from '../engine';
import type { Pool } from '../storage';
import { parseNumber } from './number';

/** What the pool profile screen edits. Volume is a string while typing. */
export interface PoolForm {
  name: string;
  volume: string;
  sanitiser: Sanitiser;
  location: PoolLocation;
  strengths: ProductStrengths;
}

export type PoolFormField = 'volume' | keyof ProductStrengths;

export type PoolFormErrors = Partial<Record<PoolFormField, string>>;

export function emptyPoolForm(): PoolForm {
  return {
    name: '',
    volume: '',
    sanitiser: 'liquid',
    location: 'outdoor',
    strengths: { ...DEFAULT_STRENGTHS },
  };
}

export function poolToForm(pool: Pool): PoolForm {
  return {
    name: pool.name,
    volume: String(pool.volumeLitres),
    sanitiser: pool.sanitiser,
    location: pool.location,
    strengths: { ...pool.strengths },
  };
}

/** Sensible limits for a home pool, beyond the engine's "more than 0" check. */
export const VOLUME_LIMITS = { min: 1000, max: 500_000 } as const;

export type FormResult =
  | { ok: true; pool: Omit<Pool, 'updatedAt'> }
  | { ok: false; errors: PoolFormErrors };

export function formToPool(form: PoolForm): FormResult {
  const errors: PoolFormErrors = {};
  const volume = parseNumber(form.volume);

  if (volume === undefined) {
    errors.volume = 'Enter your pool volume in litres, or work it out from the size.';
  } else if (volume < VOLUME_LIMITS.min || volume > VOLUME_LIMITS.max) {
    errors.volume = `That looks off for a home pool. Enter a volume between ${VOLUME_LIMITS.min.toLocaleString('en-AU')} and ${VOLUME_LIMITS.max.toLocaleString('en-AU')} litres.`;
  }

  const pool = {
    name: form.name.trim(),
    volumeLitres: volume ?? 0,
    sanitiser: form.sanitiser,
    location: form.location,
    strengths: { ...form.strengths },
  };

  for (const issue of validateProfile(pool)) {
    if (issue.field === 'volumeLitres') continue; // covered above, with friendlier wording
    if (issue.field in DEFAULT_STRENGTHS) errors[issue.field as keyof ProductStrengths] = issue.message;
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, pool };
}

/** Which product strengths matter for this pool, so the form only shows those. */
export function relevantStrengths(form: Pick<PoolForm, 'sanitiser' | 'strengths'>): (keyof ProductStrengths)[] {
  const fields: (keyof ProductStrengths)[] = [];
  fields.push(form.sanitiser === 'granular' ? 'granularChlorinePct' : 'liquidChlorinePct');
  fields.push('acidType');
  fields.push(form.strengths.acidType === 'dryAcid' ? 'dryAcidPurityPct' : 'hydrochloricAcidPct');
  return fields;
}
