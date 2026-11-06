import { isObject, num, oneOf } from './guards';
import type { KeyValueStore } from './kv';
import { readRecord, STORAGE_KEYS, writeRecord } from './record';

export type TimesPerWeek = 1 | 2 | 3;
export type ReminderTime = 'morning' | 'evening';

export interface AppSettings {
  reminders: {
    /** Regular "time to test" reminders. */
    test: boolean;
    /** Reminders when a dose step's wait is up. */
    doseFollowUps: boolean;
    /** One nudge after 10 days without a test. */
    overdue: boolean;
  };
  testSchedule: {
    /** Tests per week, November to March. */
    summer: TimesPerWeek;
    /** Tests per week, April to October. */
    winter: TimesPerWeek;
    time: ReminderTime;
  };
  quietHours: { startHour: number; endHour: number };
  /** High-contrast colours for reading outdoors. */
  sunMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  reminders: { test: true, doseFollowUps: true, overdue: true },
  testSchedule: { summer: 2, winter: 1, time: 'evening' },
  quietHours: { startHour: 21, endHour: 7 },
  sunMode: false,
};

export const SETTINGS_VERSION = 1;

function bool(x: unknown, fallback: boolean): boolean {
  return typeof x === 'boolean' ? x : fallback;
}

function hour(x: unknown, fallback: number): number {
  const n = num(x);
  return n !== undefined && Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
}

function perWeek(x: unknown, fallback: TimesPerWeek): TimesPerWeek {
  return x === 1 || x === 2 || x === 3 ? x : fallback;
}

/** Read stored settings, filling anything missing or invalid with the defaults. */
export function parseSettings(x: unknown): AppSettings {
  const d = DEFAULT_SETTINGS;
  if (!isObject(x)) return structuredCloneSettings(d);
  const r = isObject(x.reminders) ? x.reminders : {};
  const t = isObject(x.testSchedule) ? x.testSchedule : {};
  const q = isObject(x.quietHours) ? x.quietHours : {};
  return {
    reminders: {
      test: bool(r.test, d.reminders.test),
      doseFollowUps: bool(r.doseFollowUps, d.reminders.doseFollowUps),
      overdue: bool(r.overdue, d.reminders.overdue),
    },
    testSchedule: {
      summer: perWeek(t.summer, d.testSchedule.summer),
      winter: perWeek(t.winter, d.testSchedule.winter),
      time: oneOf(t.time, ['morning', 'evening'] as const) ?? d.testSchedule.time,
    },
    quietHours: { startHour: hour(q.startHour, d.quietHours.startHour), endHour: hour(q.endHour, d.quietHours.endHour) },
    sunMode: bool(x.sunMode, d.sunMode),
  };
}

function structuredCloneSettings(s: AppSettings): AppSettings {
  return {
    reminders: { ...s.reminders },
    testSchedule: { ...s.testSchedule },
    quietHours: { ...s.quietHours },
    sunMode: s.sunMode,
  };
}

export async function loadSettings(store: KeyValueStore): Promise<AppSettings> {
  const record = await readRecord(store, STORAGE_KEYS.settings);
  return parseSettings(record?.data);
}

export async function saveSettings(store: KeyValueStore, settings: AppSettings): Promise<AppSettings> {
  const clean = parseSettings(settings);
  await writeRecord(store, STORAGE_KEYS.settings, SETTINGS_VERSION, clean);
  return clean;
}
