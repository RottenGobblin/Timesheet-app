import { describe, expect, it } from 'vitest';
import { buildDosePlan, DEFAULT_STRENGTHS, type PoolProfile } from '../engine';
import { DEFAULT_QUIET_HOURS, followUpFor, followUpMessage, followUpTime, isQuiet, outOfQuietHours } from './followUps';

const POOL: PoolProfile = { volumeLitres: 9600, sanitiser: 'liquid', location: 'outdoor', strengths: DEFAULT_STRENGTHS };
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const Q = DEFAULT_QUIET_HOURS;

describe('quiet hours (9 pm to 7 am)', () => {
  it('knows what counts as quiet', () => {
    expect(isQuiet(at(6, 20, 59), Q)).toBe(false);
    expect(isQuiet(at(6, 21), Q)).toBe(true);
    expect(isQuiet(at(6, 3), Q)).toBe(true);
    expect(isQuiet(at(6, 7), Q)).toBe(false);
  });

  it('moves late-night times to 7 am the next day', () => {
    expect(outOfQuietHours(at(6, 22, 30), Q)).toEqual(at(7, 7));
  });

  it('moves early-morning times to 7 am the same day', () => {
    expect(outOfQuietHours(at(6, 4), Q)).toEqual(at(6, 7));
  });

  it('leaves daytime alone', () => {
    expect(outOfQuietHours(at(6, 13), Q)).toEqual(at(6, 13));
  });

  it('supports quiet hours that do not cross midnight', () => {
    expect(isQuiet(at(6, 13), { startHour: 12, endHour: 14 })).toBe(true);
    expect(isQuiet(at(6, 15), { startHour: 12, endHour: 14 })).toBe(false);
  });
});

describe('followUpTime', () => {
  it('fires when the wait ends for non-chlorine steps', () => {
    expect(followUpTime(at(6, 14), {}, Q)).toEqual(at(6, 14));
  });

  it('nudges chlorine reminders to the evening', () => {
    expect(followUpTime(at(6, 14), { bestTime: 'evening' }, Q)).toEqual(at(6, 18));
    expect(followUpTime(at(6, 19, 30), { bestTime: 'evening' }, Q)).toEqual(at(6, 19, 30));
  });

  it('never fires during quiet hours', () => {
    expect(followUpTime(at(6, 23), { bestTime: 'evening' }, Q)).toEqual(at(7, 7));
    expect(followUpTime(at(6, 2), {}, Q)).toEqual(at(6, 7));
  });
});

describe('followUpMessage', () => {
  it('matches the brief’s wording', () => {
    expect(followUpMessage(4, 'raise-chlorine')).toBe('4 hours are up, ready for the chlorine?');
    expect(followUpMessage(1, 'lower-ph')).toBe('1 hour is up, ready for the acid?');
  });
});

describe('followUpFor', () => {
  const steps = buildDosePlan(POOL, { fc: 1, ph: 7.9, ta: 80, cya: 40 }).steps; // acid (4 h), chlorine

  it('schedules the chlorine reminder 4 hours after the acid', () => {
    const f = followUpFor(steps, { 'lower-ph': at(6, 15).toISOString() });
    expect(f).toMatchObject({ kind: 'raise-chlorine', at: at(6, 19), body: '4 hours are up, ready for the chlorine?' });
  });

  it('pushes it to the evening when the acid went in early', () => {
    expect(followUpFor(steps, { 'lower-ph': at(6, 8).toISOString() })?.at).toEqual(at(6, 18));
  });

  it('returns nothing before the first tick or once finished', () => {
    expect(followUpFor(steps, {})).toBeNull();
    expect(
      followUpFor(steps, { 'lower-ph': at(6, 8).toISOString(), 'raise-chlorine': at(6, 18).toISOString() }),
    ).toBeNull();
  });

  it('returns nothing when the ticked step has no wait', () => {
    const s = buildDosePlan(POOL, { fc: 0.5, ph: 7.4, ta: 80, cya: 10 }).steps; // stabiliser, chlorine
    expect(s.map((x) => x.kind)).toEqual(['raise-stabiliser', 'raise-chlorine']);
    expect(followUpFor(s, { 'raise-stabiliser': at(6, 10).toISOString() })).toBeNull();
  });
});
