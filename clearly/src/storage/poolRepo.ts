import {
  DEFAULT_STRENGTHS,
  validateProfile,
  type PoolProfile,
  type ProductStrengths,
  type ValidationIssue,
} from '../engine';
import { isObject, num, oneOf } from './guards';
import type { KeyValueStore } from './kv';
import { readRecord, STORAGE_KEYS, writeRecord } from './record';

/** The saved pool: the engine's profile plus app-only details. */
export interface Pool extends PoolProfile {
  /** Optional nickname, e.g. "Backyard pool". */
  name: string;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

export const POOL_VERSION = 1;

export class PoolValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(issues.map((i) => i.message).join(' '));
    this.name = 'PoolValidationError';
  }
}

/**
 * Turn stored data back into a Pool. Missing product strengths fall back to defaults
 * (so adding a new strength later doesn't break old saves). Returns null if the core
 * fields are missing or nonsense.
 */
export function parsePool(data: unknown): Pool | null {
  if (!isObject(data)) return null;
  const volumeLitres = num(data.volumeLitres);
  const sanitiser = oneOf(data.sanitiser, ['liquid', 'granular', 'salt'] as const);
  const location = oneOf(data.location, ['outdoor', 'indoor'] as const);
  if (volumeLitres === undefined || volumeLitres <= 0 || !sanitiser || !location) return null;

  const s = isObject(data.strengths) ? data.strengths : {};
  const strengths: ProductStrengths = {
    liquidChlorinePct: num(s.liquidChlorinePct) ?? DEFAULT_STRENGTHS.liquidChlorinePct,
    granularChlorinePct: num(s.granularChlorinePct) ?? DEFAULT_STRENGTHS.granularChlorinePct,
    acidType: oneOf(s.acidType, ['hydrochloric', 'dryAcid'] as const) ?? DEFAULT_STRENGTHS.acidType,
    hydrochloricAcidPct: num(s.hydrochloricAcidPct) ?? DEFAULT_STRENGTHS.hydrochloricAcidPct,
    dryAcidPurityPct: num(s.dryAcidPurityPct) ?? DEFAULT_STRENGTHS.dryAcidPurityPct,
  };

  return {
    name: typeof data.name === 'string' ? data.name : '',
    volumeLitres,
    sanitiser,
    location,
    strengths,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString(),
  };
}

export async function loadPool(store: KeyValueStore): Promise<Pool | null> {
  const record = await readRecord(store, STORAGE_KEYS.pool);
  if (!record) return null;
  // Future migrations go here: if (record.v < 2) record.data = migrateV1(record.data)
  return parsePool(record.data);
}

/** Validate and save. Throws PoolValidationError if the profile can't be dosed against. */
export async function savePool(
  store: KeyValueStore,
  pool: Omit<Pool, 'updatedAt'>,
  now: Date = new Date(),
): Promise<Pool> {
  const issues = validateProfile(pool);
  if (issues.length > 0) throw new PoolValidationError(issues);
  const saved: Pool = { ...pool, name: pool.name.trim(), updatedAt: now.toISOString() };
  await writeRecord(store, STORAGE_KEYS.pool, POOL_VERSION, saved);
  return saved;
}

export async function clearPool(store: KeyValueStore): Promise<void> {
  await store.removeItem(STORAGE_KEYS.pool);
}
