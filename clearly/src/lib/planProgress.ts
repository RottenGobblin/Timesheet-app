import type { DoseStep, StepKind } from '../engine';

/** When each step was ticked off, keyed by step kind (unique within a plan). */
export type Ticks = Partial<Record<StepKind, string>>;

export type StepState =
  | { status: 'done'; doneAt: Date }
  | { status: 'ready'; eveningHint: boolean }
  | { status: 'waiting'; readyAt: Date }
  | { status: 'locked' };

const HOUR = 3_600_000;

/** Hour of day after which "best in the evening" steps count as evening. */
export const EVENING_HOUR = 17;

/**
 * Work out where each step is up to. Steps go in order: only the first unticked step can
 * be done, and only once the previous step's wait has passed.
 */
export function stepStates(steps: DoseStep[], ticks: Ticks, now: Date): StepState[] {
  const states: StepState[] = [];
  let blocked = false;
  let prevDoneAt: Date | null = null;
  let prevWait = 0;

  steps.forEach((step, i) => {
    const tick = ticks[step.kind];
    if (tick && !blocked) {
      const doneAt = new Date(tick);
      states.push({ status: 'done', doneAt });
      prevDoneAt = doneAt;
      prevWait = step.waitHours;
      return;
    }
    if (blocked) {
      states.push({ status: 'locked' });
      return;
    }
    blocked = true;
    const readyAt: Date | null = i > 0 && prevDoneAt ? new Date((prevDoneAt as Date).getTime() + prevWait * HOUR) : null;
    if (readyAt && now < readyAt) {
      states.push({ status: 'waiting', readyAt });
    } else {
      states.push({ status: 'ready', eveningHint: step.bestTime === 'evening' && now.getHours() < EVENING_HOUR });
    }
  });

  return states;
}

export function allDone(states: StepState[]): boolean {
  return states.length > 0 && states.every((s) => s.status === 'done');
}

/** Only the most recent tick can be undone, so the order stays consistent. */
export function canUntick(states: StepState[], index: number): boolean {
  if (states[index]?.status !== 'done') return false;
  const next = states[index + 1];
  return next === undefined || next.status !== 'done';
}

export function tick(ticks: Ticks, kind: StepKind, now: Date): Ticks {
  return { ...ticks, [kind]: now.toISOString() };
}

export function untick(ticks: Ticks, kind: StepKind): Ticks {
  const next = { ...ticks };
  delete next[kind];
  return next;
}

/** "3 h 20 m", "45 m", "under a minute". */
export function formatDuration(ms: number): string {
  const mins = Math.ceil(ms / 60_000);
  if (mins <= 0) return 'under a minute';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} m`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/** "4:15 pm", with "tomorrow" if it's not today. */
export function formatClock(d: Date, now: Date): string {
  const h = d.getHours();
  const time = `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === d.toDateString();
  if (sameDay) return time;
  if (tomorrow) return `${time} tomorrow`;
  return `${time} ${d.getDate()}/${d.getMonth() + 1}`;
}
