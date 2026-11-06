import type { DoseStep, StepKind } from '../engine';
import type { Ticks } from './planProgress';

export interface QuietHours {
  /** Hour quiet time starts, 0 to 23. Default 21 (9 pm). */
  startHour: number;
  /** Hour quiet time ends, 0 to 23. Default 7 (7 am). */
  endHour: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { startHour: 21, endHour: 7 };

/** Chlorine reminders favour evenings: not before this hour. */
export const CHLORINE_REMINDER_HOUR = 18;

export function isQuiet(d: Date, quiet: QuietHours): boolean {
  const h = d.getHours();
  if (quiet.startHour === quiet.endHour) return false;
  return quiet.startHour > quiet.endHour
    ? h >= quiet.startHour || h < quiet.endHour
    : h >= quiet.startHour && h < quiet.endHour;
}

/** Move a time out of quiet hours to when they end. */
export function outOfQuietHours(d: Date, quiet: QuietHours): Date {
  if (!isQuiet(d, quiet)) return d;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), quiet.endHour, 0, 0, 0);
  if (end <= d) end.setDate(end.getDate() + 1);
  return end;
}

/**
 * When to send a dose follow-up. Chlorine steps are nudged to the evening if the wait ends
 * earlier in the day, and nothing fires during quiet hours.
 */
export function followUpTime(readyAt: Date, nextStep: Pick<DoseStep, 'bestTime'>, quiet: QuietHours): Date {
  let at = readyAt;
  if (nextStep.bestTime === 'evening' && at.getHours() < CHLORINE_REMINDER_HOUR && !isQuiet(at, quiet)) {
    at = new Date(at.getFullYear(), at.getMonth(), at.getDate(), CHLORINE_REMINDER_HOUR, 0, 0, 0);
  }
  return outOfQuietHours(at, quiet);
}

const NOUN: Record<StepKind, string> = {
  'raise-alkalinity': 'bicarb',
  'lower-ph': 'acid',
  'raise-ph': 'soda ash',
  'raise-stabiliser': 'stabiliser',
  drain: 'drain',
  'raise-chlorine': 'chlorine',
};

/** "4 hours are up, ready for the chlorine?" */
export function followUpMessage(waitHours: number, next: StepKind): string {
  const hours = waitHours === 1 ? '1 hour is' : `${waitHours} hours are`;
  return `${hours} up, ready for the ${NOUN[next]}?`;
}

export interface FollowUp {
  /** Step the reminder is for. */
  kind: StepKind;
  at: Date;
  title: string;
  body: string;
}

/**
 * The follow-up to schedule after the latest tick, if the next step has a wait before it.
 * Returns null when there's nothing to wait for or the plan is finished.
 */
export function followUpFor(steps: DoseStep[], ticks: Ticks, quiet: QuietHours = DEFAULT_QUIET_HOURS): FollowUp | null {
  let lastDone = -1;
  for (let i = 0; i < steps.length; i++) {
    if (ticks[steps[i]!.kind]) lastDone = i;
    else break;
  }
  const done = steps[lastDone];
  const next = steps[lastDone + 1];
  if (!done || !next || done.waitHours <= 0) return null;
  const readyAt = new Date(new Date(ticks[done.kind]!).getTime() + done.waitHours * 3_600_000);
  return {
    kind: next.kind,
    at: followUpTime(readyAt, next, quiet),
    title: 'Next dose step',
    body: followUpMessage(done.waitHours, next.kind),
  };
}
