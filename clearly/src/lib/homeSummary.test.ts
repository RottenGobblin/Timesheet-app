import { describe, expect, it } from 'vitest';
import { buildDosePlan, DEFAULT_STRENGTHS, type PoolProfile, type Readings } from '../engine';
import { DEFAULT_SETTINGS, type TestRecord } from '../storage';
import { homeSummary, LEVEL, stepAction } from './homeSummary';

const POOL: PoolProfile = { volumeLitres: 9600, sanitiser: 'liquid', location: 'outdoor', strengths: DEFAULT_STRENGTHS };
// Friday 6 Nov 2026, 9 am
const now = new Date(2026, 10, 6, 9);
const IDEAL: Readings = { fc: 4, ph: 7.4, ta: 80, cya: 40 };

function summary(readings: Readings, opts: { takenAt?: Date; ticks?: Record<string, string> } = {}) {
  const latest: TestRecord = { id: 't', takenAt: (opts.takenAt ?? now).toISOString(), readings, notes: '' };
  return homeSummary({
    latest,
    plan: buildDosePlan(POOL, readings),
    ticks: opts.ticks ?? {},
    settings: DEFAULT_SETTINGS,
    now,
  });
}

describe('homeSummary', () => {
  it('invites a first test when there are none', () => {
    const s = homeSummary({ latest: undefined, plan: null, ticks: {}, settings: DEFAULT_SETTINGS, now });
    expect(s).toMatchObject({ mood: 'none', subline: 'No tests yet', action: { label: 'Test your water', route: '/test' } });
  });

  it('says crystal clear and when the next test is due', () => {
    const s = summary(IDEAL);
    expect(s.mood).toBe('clear');
    expect(s.headline).toBe('Crystal clear, go jump in');
    expect(s.subline).toBe('Tested today');
    // Tested Friday: Saturday is skipped, next is Wednesday
    expect(s.action.detail).toBe('Next test due Wednesday.');
    expect(s.level).toBe(LEVEL.clear);
  });

  it('points at the first step when there is a plan', () => {
    const s = summary({ ...IDEAL, fc: 1 });
    expect(s.mood).toBe('act');
    expect(s.action).toMatchObject({ label: 'Add 230 mL chlorine', route: '/plan' });
    expect(s.action.detail).toBe('One step. Best done this evening.');
  });

  it('shows the step count and the wait when a step is waiting', () => {
    const s = summary({ ...IDEAL, ph: 7.9, fc: 1 }, { ticks: { 'lower-ph': new Date(2026, 10, 6, 8).toISOString() } });
    expect(s.action.label).toBe('Next: add 230 mL chlorine');
    expect(s.action.detail).toBe('Step 2 of 2. Ready at 12:00 pm.');
  });

  it('says clearly sorted once every step is ticked', () => {
    const s = summary({ ...IDEAL, fc: 3, cya: 10 }, { ticks: { 'raise-stabiliser': now.toISOString() } });
    expect(s.mood).toBe('sorted');
    expect(s.headline).toBe('Clearly sorted');
    expect(s.action.route).toBe('/test');
  });

  it('asks for the rest when readings were skipped but the rest look fine', () => {
    const s = summary({ fc: 4, ph: 7.4 });
    expect(s.headline).toBe('Looking good so far');
    expect(s.action).toMatchObject({ label: 'Test the rest', detail: 'Alkalinity and stabiliser weren’t tested.' });
  });

  it('sends you to the plan when a tested reading is off but has no dose', () => {
    const s = summary({ ...IDEAL, ta: 180 });
    expect(s).toMatchObject({ mood: 'tweak', action: { route: '/plan' } });
  });

  it('flags a stale test after 10 days', () => {
    const s = summary(IDEAL, { takenAt: new Date(2026, 9, 25, 9) });
    expect(s).toMatchObject({ mood: 'stale', headline: 'Your pool might be getting ideas', subline: 'Tested 12 days ago' });
  });

  it('carries the no-swimming warning onto the card', () => {
    expect(summary({ ...IDEAL, fc: 12 }).alert).toMatch(/No swimming/);
  });

  it('orders water levels by health', () => {
    expect(LEVEL.clear).toBeGreaterThan(LEVEL.sorted);
    expect(LEVEL.sorted).toBeGreaterThan(LEVEL.tweak);
    expect(LEVEL.tweak).toBeGreaterThan(LEVEL.act);
  });
});

describe('stepAction', () => {
  it('describes dose and drain steps', () => {
    const p = buildDosePlan(POOL, { ...IDEAL, ta: 40 });
    expect(stepAction(p.steps[0]!)).toBe('Add 650 g bicarb');
    const d = buildDosePlan(POOL, { ...IDEAL, cya: 100 });
    expect(stepAction(d.steps[0]!)).toBe('Drain about 60% and refill');
  });
});
