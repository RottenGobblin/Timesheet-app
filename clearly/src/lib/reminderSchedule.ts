import type { AppSettings, ReminderTime, TimesPerWeek } from '../storage';
import { outOfQuietHours } from './followUps';

export type ScheduledKind = 'test-reminder' | 'overdue';

export interface PlannedReminder {
  kind: ScheduledKind;
  at: Date;
  title: string;
  body: string;
}

/** Australian summer for pool purposes: November to March. */
export function isSummer(d: Date): boolean {
  const m = d.getMonth();
  return m >= 10 || m <= 2;
}

/** Days of the week (0 = Sunday) for each schedule. Weekends suit most people. */
export const TEST_DAYS: Record<TimesPerWeek, number[]> = {
  1: [6],
  2: [3, 6],
  3: [1, 3, 6],
};

export const REMINDER_HOUR: Record<ReminderTime, number> = { morning: 8, evening: 18 };

export const OVERDUE_DAYS = 10;

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function atHour(d: Date, h: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0);
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

const TEST_COPY = { title: 'Time for a quick test', body: 'Two minutes now keeps it crystal clear.' };
const OVERDUE_COPY = {
  title: 'Your pool might be getting ideas',
  body: `It’s been ${OVERDUE_DAYS} days since your last test. A quick one keeps it in check.`,
};

/**
 * Test and overdue reminders for the next few weeks.
 *
 * Rules from the brief:
 * - Test reminders follow the summer (Nov to Mar) or winter schedule.
 * - One overdue nudge 10 days after the last test, then back off: no more reminders of
 *   either kind until the next test.
 * - At most one of these per day (the overdue nudge wins). Dose follow-ups are separate.
 * - Nothing in quiet hours.
 * - No test reminder on the day of a test or the day after.
 */
export function planReminders(input: {
  settings: AppSettings;
  lastTestAt: Date | null;
  now: Date;
  horizonDays?: number;
}): PlannedReminder[] {
  const { settings, lastTestAt, now, horizonDays = 28 } = input;
  const hour = REMINDER_HOUR[settings.testSchedule.time];
  const quiet = settings.quietHours;
  const result: PlannedReminder[] = [];

  // After the overdue date we back off entirely until they test again.
  const overdueDay = lastTestAt ? addDays(dayStart(lastTestAt), OVERDUE_DAYS) : null;

  let overdueAt: Date | null = null;
  if (settings.reminders.overdue && overdueDay) {
    const at = outOfQuietHours(atHour(overdueDay, hour), quiet);
    if (at > now) {
      overdueAt = at;
      result.push({ kind: 'overdue', at, ...OVERDUE_COPY });
    }
  }

  if (settings.reminders.test) {
    const quietAfterTest = lastTestAt ? addDays(dayStart(lastTestAt), 2) : null;
    for (let i = 0; i <= horizonDays; i++) {
      const day = addDays(dayStart(now), i);
      if (overdueDay && day >= overdueDay) break;
      const perWeek = isSummer(day) ? settings.testSchedule.summer : settings.testSchedule.winter;
      if (!TEST_DAYS[perWeek].includes(day.getDay())) continue;
      if (quietAfterTest && day < quietAfterTest) continue;
      const at = outOfQuietHours(atHour(day, hour), quiet);
      if (at <= now) continue;
      if (overdueAt && sameDay(at, overdueAt)) continue;
      if (result.some((r) => sameDay(r.at, at))) continue;
      result.push({ kind: 'test-reminder', at, ...TEST_COPY });
    }
  }

  return result.sort((a, b) => a.at.getTime() - b.at.getTime());
}
