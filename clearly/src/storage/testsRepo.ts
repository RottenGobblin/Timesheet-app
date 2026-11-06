import { validateReadings, type Readings, type ValidationIssue } from '../engine';
import { isObject, num } from './guards';
import type { KeyValueStore } from './kv';
import { readRecord, STORAGE_KEYS, writeRecord } from './record';

/** One saved water test. */
export interface TestRecord {
  id: string;
  /** ISO timestamp of when the test was taken. */
  takenAt: string;
  readings: Readings;
  notes: string;
}

export const TESTS_VERSION = 1;

export class TestValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(issues.map((i) => i.message).join(' '));
    this.name = 'TestValidationError';
  }
}

function parseReadings(x: unknown): Readings {
  if (!isObject(x)) return {};
  const r: Readings = {};
  const fc = num(x.fc);
  const ph = num(x.ph);
  const ta = num(x.ta);
  const cya = num(x.cya);
  if (fc !== undefined) r.fc = fc;
  if (ph !== undefined) r.ph = ph;
  if (ta !== undefined) r.ta = ta;
  if (cya !== undefined) r.cya = cya;
  return r;
}

export function parseTest(x: unknown): TestRecord | null {
  if (!isObject(x)) return null;
  if (typeof x.id !== 'string' || typeof x.takenAt !== 'string' || Number.isNaN(Date.parse(x.takenAt))) {
    return null;
  }
  return {
    id: x.id,
    takenAt: x.takenAt,
    readings: parseReadings(x.readings),
    notes: typeof x.notes === 'string' ? x.notes : '',
  };
}

function newestFirst(a: TestRecord, b: TestRecord): number {
  return Date.parse(b.takenAt) - Date.parse(a.takenAt);
}

/** All saved tests, newest first. Unreadable entries are skipped rather than losing the rest. */
export async function listTests(store: KeyValueStore): Promise<TestRecord[]> {
  const record = await readRecord(store, STORAGE_KEYS.tests);
  if (!record || !Array.isArray(record.data)) return [];
  return record.data
    .map(parseTest)
    .filter((t): t is TestRecord => t !== null)
    .sort(newestFirst);
}

async function writeAll(store: KeyValueStore, tests: TestRecord[]): Promise<void> {
  await writeRecord(store, STORAGE_KEYS.tests, TESTS_VERSION, [...tests].sort(newestFirst));
}

export function makeId(now: Date = new Date()): string {
  return `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function addTest(
  store: KeyValueStore,
  input: { readings: Readings; notes?: string; takenAt?: Date },
): Promise<TestRecord> {
  const issues = validateReadings(input.readings);
  if (issues.length > 0) throw new TestValidationError(issues);
  const takenAt = input.takenAt ?? new Date();
  const test: TestRecord = {
    id: makeId(takenAt),
    takenAt: takenAt.toISOString(),
    readings: parseReadings(input.readings),
    notes: (input.notes ?? '').trim(),
  };
  const tests = await listTests(store);
  await writeAll(store, [test, ...tests]);
  return test;
}

export async function updateTestNotes(store: KeyValueStore, id: string, notes: string): Promise<TestRecord | null> {
  const tests = await listTests(store);
  const target = tests.find((t) => t.id === id);
  if (!target) return null;
  const updated = { ...target, notes: notes.trim() };
  await writeAll(store, tests.map((t) => (t.id === id ? updated : t)));
  return updated;
}

export async function deleteTest(store: KeyValueStore, id: string): Promise<boolean> {
  const tests = await listTests(store);
  const remaining = tests.filter((t) => t.id !== id);
  if (remaining.length === tests.length) return false;
  await writeAll(store, remaining);
  return true;
}

export async function latestTest(store: KeyValueStore): Promise<TestRecord | null> {
  return (await listTests(store))[0] ?? null;
}
