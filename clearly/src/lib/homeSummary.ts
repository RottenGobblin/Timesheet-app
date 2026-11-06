import type { DosePlan, DoseStep, ReadingKey } from '../engine';
import type { AppSettings, TestRecord } from '../storage';
import { daysSince } from './dates';
import { STEP_NOUN } from './followUps';
import { allDone, formatClock, stepStates, type Ticks } from './planProgress';
import { OVERDUE_DAYS, planReminders } from './reminderSchedule';

/**
 * none   = no tests yet
 * clear  = crystal clear
 * tweak  = something to do
 * act    = act now
 * sorted = every step in the plan is ticked off
 * stale  = last test is old enough that it no longer says much
 */
export type Mood = 'none' | 'clear' | 'tweak' | 'act' | 'sorted' | 'stale';

export interface HomeSummary {
  mood: Mood;
  headline: string;
  /** Short line under the headline, e.g. when the last test was. */
  subline: string;
  /** Water level in the card, 0 to 1. Higher is healthier. */
  level: number;
  /** Plain safety line shown on the card (no swimming). */
  alert?: string;
  action: { label: string; detail?: string; route: '/test' | '/plan' };
}

export const LEVEL: Record<Mood, number> = {
  none: 0.15,
  stale: 0.3,
  act: 0.22,
  tweak: 0.45,
  sorted: 0.62,
  clear: 0.72,
};

const READING_NAME: Record<ReadingKey, string> = {
  fc: 'chlorine',
  ph: 'pH',
  ta: 'alkalinity',
  cya: 'stabiliser',
};

function listNames(keys: ReadingKey[]): string {
  const names = keys.map((k) => READING_NAME[k]);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Add 650 g bicarb", "Drain about 60%". */
export function stepAction(step: DoseStep): string {
  if (step.kind === 'drain') return `Drain about ${step.drainPercent}% and refill`;
  return `Add ${step.amount?.display ?? ''} ${STEP_NOUN[step.kind]}`.trim();
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayLabel(d: Date, now: Date): string {
  const days = daysSince(now.toISOString(), d);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return WEEKDAYS[d.getDay()]!;
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function lastTestLine(test: TestRecord, now: Date): string {
  const days = daysSince(test.takenAt, now);
  if (days === 0) return 'Tested today';
  if (days === 1) return 'Tested yesterday';
  return `Tested ${days} days ago`;
}

/** Everything the Home card shows, worked out from the latest test and plan progress. */
export function homeSummary(input: {
  latest: TestRecord | undefined;
  plan: DosePlan | null;
  ticks: Ticks;
  settings: AppSettings;
  now: Date;
}): HomeSummary {
  const { latest, plan, ticks, settings, now } = input;

  if (!latest || !plan) {
    return {
      mood: 'none',
      headline: 'Let’s see how your water’s going',
      subline: 'No tests yet',
      level: LEVEL.none,
      action: { label: 'Test your water', detail: 'Two minutes with your strips or kit.', route: '/test' },
    };
  }

  const subline = lastTestLine(latest, now);
  const days = daysSince(latest.takenAt, now);
  if (days >= OVERDUE_DAYS) {
    return {
      mood: 'stale',
      headline: 'Your pool might be getting ideas',
      subline,
      level: LEVEL.stale,
      action: { label: 'Test your water', detail: `It’s been ${days} days, so a fresh test will tell us more.`, route: '/test' },
    };
  }

  const alert = plan.warnings.find((w) => w.code === 'no-swimming-high-chlorine')?.message;
  const steps = plan.steps;
  const states = stepStates(steps, ticks, now);

  if (steps.length > 0 && allDone(states)) {
    return {
      mood: 'sorted',
      headline: 'Clearly sorted',
      subline,
      level: LEVEL.sorted,
      alert,
      action: {
        label: 'Test again',
        detail: steps.some((s) => s.kind === 'drain')
          ? 'Test once the pool is refilled and has run for a few hours.'
          : 'Retest tomorrow to check everything has landed.',
        route: '/test',
      },
    };
  }

  if (steps.length > 0) {
    const index = states.findIndex((s) => s.status !== 'done');
    const step = steps[index]!;
    const state = states[index]!;
    const mood = plan.status === 'act' ? 'act' : 'tweak';
    const headline = mood === 'act' ? 'Act now' : 'Needs a tweak';
    const position = steps.length > 1 ? `Step ${index + 1} of ${steps.length}` : 'One step';
    const detail =
      state.status === 'waiting'
        ? `${position}. Ready at ${formatClock(state.readyAt, now)}.`
        : state.status === 'ready' && state.eveningHint
          ? `${position}. Best done this evening.`
          : `${position}.`;
    return {
      mood,
      headline,
      subline,
      level: LEVEL[mood],
      alert,
      action: { label: state.status === 'waiting' ? `Next: ${stepAction(step).replace(/^Add/, 'add')}` : stepAction(step), detail, route: '/plan' },
    };
  }

  // No dose steps.
  if (plan.status === 'act') {
    return {
      mood: 'act',
      headline: 'Act now',
      subline,
      level: LEVEL.act,
      alert,
      action: { label: 'See what to do', route: '/plan' },
    };
  }

  const testedOff = plan.testedStatus !== 'clear';
  if (testedOff) {
    return {
      mood: 'tweak',
      headline: 'Needs a tweak',
      subline,
      level: LEVEL.tweak,
      alert,
      action: { label: 'See what to do', detail: 'Something’s a little off, here’s why.', route: '/plan' },
    };
  }

  if (plan.missing.length > 0) {
    return {
      mood: 'tweak',
      headline: 'Looking good so far',
      subline,
      level: LEVEL.tweak + 0.1,
      action: {
        label: 'Test the rest',
        detail: `${listNames(plan.missing).replace(/^./, (c) => c.toUpperCase())} ${plan.missing.length === 1 ? 'wasn’t' : 'weren’t'} tested.`,
        route: '/test',
      },
    };
  }

  const next = settings.reminders.test
    ? planReminders({ settings, lastTestAt: new Date(latest.takenAt), now }).find((r) => r.kind === 'test-reminder')
    : undefined;
  return {
    mood: 'clear',
    headline: 'Crystal clear, go jump in',
    subline,
    level: LEVEL.clear,
    action: {
      label: 'Test water',
      detail: next ? `Next test due ${dayLabel(next.at, now)}.` : 'Test again in a few days.',
      route: '/test',
    },
  };
}
