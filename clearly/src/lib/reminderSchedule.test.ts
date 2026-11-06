import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '../storage';
import { isSummer, planReminders } from './reminderSchedule';

const settings = (patch: Partial<AppSettings> = {}): AppSettings => ({
  ...DEFAULT_SETTINGS,
  reminders: { ...DEFAULT_SETTINGS.reminders },
  testSchedule: { ...DEFAULT_SETTINGS.testSchedule },
  quietHours: { ...DEFAULT_SETTINGS.quietHours },
  ...patch,
});

// Friday 6 November 2026 (summer), 9 am
const now = new Date(2026, 10, 6, 9);
const at = (m: number, d: number, h: number) => new Date(2026, m, d, h);

describe('isSummer', () => {
  it('runs November to March', () => {
    expect(isSummer(new Date(2026, 10, 1))).toBe(true);
    expect(isSummer(new Date(2027, 2, 31))).toBe(true);
    expect(isSummer(new Date(2027, 3, 1))).toBe(false);
    expect(isSummer(new Date(2026, 9, 31))).toBe(false);
  });
});

describe('planReminders', () => {
  it('reminds twice a week in summer (Wed and Sat) at 6 pm', () => {
    const r = planReminders({ settings: settings(), lastTestAt: null, now, horizonDays: 10 });
    expect(r.map((x) => x.at)).toEqual([at(10, 7, 18), at(10, 11, 18), at(10, 14, 18)]);
    expect(r.every((x) => x.kind === 'test-reminder')).toBe(true);
  });

  it('reminds weekly in winter', () => {
    const winterNow = new Date(2026, 5, 1, 9); // Monday 1 June
    const r = planReminders({ settings: settings(), lastTestAt: null, now: winterNow, horizonDays: 14 });
    expect(r.map((x) => x.at.getDay())).toEqual([6, 6]);
  });

  it('uses the morning time when chosen', () => {
    const s = settings({ testSchedule: { summer: 2, winter: 1, time: 'morning' } });
    expect(planReminders({ settings: s, lastTestAt: null, now, horizonDays: 2 })[0]!.at).toEqual(at(10, 7, 8));
  });

  it('skips the day of a test and the day after', () => {
    // Tested Friday morning: no reminder Saturday
    const r = planReminders({ settings: settings(), lastTestAt: at(10, 6, 8), now, horizonDays: 10 });
    expect(r[0]!.at).toEqual(at(10, 11, 18));
  });

  it('nudges once at 10 days, then backs off', () => {
    const last = at(10, 1, 9); // Sunday 1 Nov
    const r = planReminders({ settings: settings(), lastTestAt: last, now, horizonDays: 28 });
    const overdue = r.filter((x) => x.kind === 'overdue');
    expect(overdue).toHaveLength(1);
    expect(overdue[0]!.at).toEqual(at(10, 11, 18));
    expect(overdue[0]!.title).toBe('Your pool might be getting ideas');
    // Nothing after the nudge, and never two on one day
    expect(r[r.length - 1]!.kind).toBe('overdue');
    const days = r.map((x) => x.at.toDateString());
    expect(new Set(days).size).toBe(days.length);
  });

  it('respects each toggle', () => {
    const last = at(10, 1, 9);
    const noTests = settings({ reminders: { test: false, doseFollowUps: true, overdue: true } });
    expect(planReminders({ settings: noTests, lastTestAt: last, now }).map((x) => x.kind)).toEqual(['overdue']);
    const noOverdue = settings({ reminders: { test: true, doseFollowUps: true, overdue: false } });
    expect(planReminders({ settings: noOverdue, lastTestAt: last, now }).some((x) => x.kind === 'overdue')).toBe(false);
  });

  it('moves reminders out of quiet hours', () => {
    const s = settings({ quietHours: { startHour: 17, endHour: 7 } });
    const r = planReminders({ settings: s, lastTestAt: null, now, horizonDays: 2 });
    expect(r[0]!.at).toEqual(at(10, 8, 7));
  });

  it('never schedules in the past', () => {
    const lateSaturday = new Date(2026, 10, 7, 19);
    const r = planReminders({ settings: settings(), lastTestAt: null, now: lateSaturday, horizonDays: 5 });
    expect(r[0]!.at).toEqual(at(10, 11, 18));
  });
});
