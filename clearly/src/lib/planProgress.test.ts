import { describe, expect, it } from 'vitest';
import { buildDosePlan, DEFAULT_STRENGTHS, type PoolProfile } from '../engine';
import { allDone, canUntick, formatClock, formatDuration, stepStates, tick, untick } from './planProgress';

const POOL: PoolProfile = { volumeLitres: 9600, sanitiser: 'liquid', location: 'outdoor', strengths: DEFAULT_STRENGTHS };
// Alkalinity (6 h wait), pH (4 h wait), stabiliser, chlorine
const steps = buildDosePlan(POOL, { fc: 0.5, ph: 7.8, ta: 40, cya: 10 }).steps;
const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m);

describe('stepStates', () => {
  it('has the four steps this test expects', () => {
    expect(steps.map((s) => s.kind)).toEqual(['raise-alkalinity', 'lower-ph', 'raise-stabiliser', 'raise-chlorine']);
  });

  it('starts with the first step ready and the rest locked', () => {
    const s = stepStates(steps, {}, at(9));
    expect(s.map((x) => x.status)).toEqual(['ready', 'locked', 'locked', 'locked']);
  });

  it('makes the next step wait for the previous step’s timer', () => {
    const s = stepStates(steps, { 'raise-alkalinity': at(9).toISOString() }, at(10));
    expect(s[0]!.status).toBe('done');
    expect(s[1]).toEqual({ status: 'waiting', readyAt: at(15) });
    expect(s[2]!.status).toBe('locked');
  });

  it('unlocks the next step once the wait is over', () => {
    const s = stepStates(steps, { 'raise-alkalinity': at(9).toISOString() }, at(15));
    expect(s[1]!.status).toBe('ready');
  });

  it('readies a step straight away when the previous one has no wait', () => {
    const ticks = { 'raise-alkalinity': at(6).toISOString(), 'lower-ph': at(12).toISOString(), 'raise-stabiliser': at(16).toISOString() };
    const s = stepStates(steps, ticks, at(16, 1));
    expect(s[3]).toEqual({ status: 'ready', eveningHint: true });
  });

  it('drops the evening hint once it is evening', () => {
    const ticks = { 'raise-alkalinity': at(6).toISOString(), 'lower-ph': at(12).toISOString(), 'raise-stabiliser': at(16).toISOString() };
    expect(stepStates(steps, ticks, at(18))[3]).toEqual({ status: 'ready', eveningHint: false });
  });

  it('ignores ticks after a gap so the order holds', () => {
    const s = stepStates(steps, { 'raise-chlorine': at(9).toISOString() }, at(10));
    expect(s.map((x) => x.status)).toEqual(['ready', 'locked', 'locked', 'locked']);
  });

  it('knows when everything is done', () => {
    const ticks = Object.fromEntries(steps.map((s, i) => [s.kind, at(6 + i * 6 > 23 ? 23 : 6 + i * 6).toISOString()]));
    expect(allDone(stepStates(steps, ticks, at(23, 30)))).toBe(true);
    expect(allDone(stepStates(steps, {}, at(9)))).toBe(false);
    expect(allDone([])).toBe(false);
  });
});

describe('ticking', () => {
  it('ticks and unticks', () => {
    const t = tick({}, 'lower-ph', at(9));
    expect(t['lower-ph']).toBe(at(9).toISOString());
    expect(untick(t, 'lower-ph')).toEqual({});
  });

  it('only lets the latest tick be undone', () => {
    const ticks = { 'raise-alkalinity': at(6).toISOString(), 'lower-ph': at(12).toISOString() };
    const s = stepStates(steps, ticks, at(13));
    expect(canUntick(s, 0)).toBe(false);
    expect(canUntick(s, 1)).toBe(true);
    expect(canUntick(s, 2)).toBe(false);
  });
});

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(3 * 3_600_000 + 20 * 60_000)).toBe('3 h 20 m');
    expect(formatDuration(4 * 3_600_000)).toBe('4 h');
    expect(formatDuration(45 * 60_000)).toBe('45 m');
    expect(formatDuration(10_000)).toBe('1 m');
    expect(formatDuration(0)).toBe('under a minute');
  });

  it('formats clock times relative to today', () => {
    expect(formatClock(at(16, 15), at(9))).toBe('4:15 pm');
    expect(formatClock(new Date(2026, 10, 7, 7, 0), at(22))).toBe('7:00 am tomorrow');
    expect(formatClock(new Date(2026, 10, 9, 7, 0), at(22))).toBe('7:00 am 9/11');
  });
});
