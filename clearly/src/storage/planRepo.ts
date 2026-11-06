import type { StepKind } from '../engine';
import { isObject } from './guards';
import type { KeyValueStore } from './kv';
import { readRecord, STORAGE_KEYS, writeRecord } from './record';

const STEP_KINDS: readonly StepKind[] = [
  'raise-alkalinity',
  'lower-ph',
  'raise-ph',
  'raise-stabiliser',
  'drain',
  'raise-chlorine',
];

/** Progress through the dose plan for one test. Only the latest test's plan is kept. */
export interface PlanProgress {
  testId: string;
  /** ISO time each step was ticked. */
  ticks: Partial<Record<StepKind, string>>;
  /** Scheduled follow-up notification, so it can be cancelled if a tick is undone. */
  reminderId?: string;
}

export const PLAN_PROGRESS_VERSION = 1;

export function parseProgress(x: unknown): PlanProgress | null {
  if (!isObject(x) || typeof x.testId !== 'string') return null;
  const ticks: PlanProgress['ticks'] = {};
  if (isObject(x.ticks)) {
    for (const kind of STEP_KINDS) {
      const v = x.ticks[kind];
      if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) ticks[kind] = v;
    }
  }
  const progress: PlanProgress = { testId: x.testId, ticks };
  if (typeof x.reminderId === 'string') progress.reminderId = x.reminderId;
  return progress;
}

/** Progress for this test, or a fresh start if what's saved belongs to an older test. */
export async function loadProgress(store: KeyValueStore, testId: string): Promise<PlanProgress> {
  const record = await readRecord(store, STORAGE_KEYS.planProgress);
  const saved = record ? parseProgress(record.data) : null;
  return saved && saved.testId === testId ? saved : { testId, ticks: {} };
}

/** The saved progress whatever test it's for, e.g. to cancel a stale reminder. */
export async function loadAnyProgress(store: KeyValueStore): Promise<PlanProgress | null> {
  const record = await readRecord(store, STORAGE_KEYS.planProgress);
  return record ? parseProgress(record.data) : null;
}

export async function saveProgress(store: KeyValueStore, progress: PlanProgress): Promise<void> {
  await writeRecord(store, STORAGE_KEYS.planProgress, PLAN_PROGRESS_VERSION, progress);
}
