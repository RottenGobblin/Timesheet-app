import type { KeyValueStore } from './kv';

export const STORAGE_KEYS = {
  pool: 'clearly/pool',
  tests: 'clearly/tests',
  planProgress: 'clearly/plan-progress',
  settings: 'clearly/settings',
} as const;

/**
 * Everything is stored as { v, data } so the shape can change later without
 * losing anyone's history: bump the version and add a migration in the repository.
 */
interface Envelope {
  v: number;
  data: unknown;
}

function isEnvelope(x: unknown): x is Envelope {
  return typeof x === 'object' && x !== null && typeof (x as Envelope).v === 'number' && 'data' in x;
}

/** Read a stored record. Returns null if missing or unreadable, never throws on bad data. */
export async function readRecord(store: KeyValueStore, key: string): Promise<Envelope | null> {
  const raw = await store.getItem(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeRecord(store: KeyValueStore, key: string, v: number, data: unknown): Promise<void> {
  await store.setItem(key, JSON.stringify({ v, data }));
}
