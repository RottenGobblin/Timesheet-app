import { describe, expect, it } from 'vitest';
import { buildDosePlan, DEFAULT_STRENGTHS, type DosePlan, type PoolProfile, type Readings } from './index';

/** Reference pool from the brief: 9,600 L outdoor liquid-chlorine pool, 12.5% chlorine, 32% acid. */
const POOL: PoolProfile = {
  volumeLitres: 9600,
  sanitiser: 'liquid',
  location: 'outdoor',
  strengths: { ...DEFAULT_STRENGTHS },
};

const IDEAL: Required<Readings> = { fc: 4, ph: 7.4, ta: 80, cya: 40 };

function plan(readings: Readings, profile: PoolProfile = POOL): DosePlan {
  return buildDosePlan(profile, readings);
}

function kinds(p: DosePlan) {
  return p.steps.map((s) => s.kind);
}

function codes(p: DosePlan) {
  return p.warnings.map((w) => w.code);
}

describe('brief test cases (9,600 L outdoor liquid pool)', () => {
  it('FC 4, pH 7.4, TA 80, CYA 40: no steps, all good', () => {
    const p = plan(IDEAL);
    expect(p.steps).toEqual([]);
    expect(p.status).toBe('clear');
    expect(p.warnings).toEqual([]);
    expect(p.missing).toEqual([]);
  });

  it('FC 1 (others ideal): 230 mL liquid chlorine', () => {
    const p = plan({ ...IDEAL, fc: 1 });
    expect(kinds(p)).toEqual(['raise-chlorine']);
    const step = p.steps[0]!;
    expect(step.amount).toMatchObject({ base: 230, unit: 'mL', display: '230 mL' });
    expect(step.from).toBe(1);
    expect(step.to).toBe(4);
    expect(step.bestTime).toBe('evening');
  });

  it('TA 40, pH 7.0, FC 0.5: bicarb first (650 g), chlorine last', () => {
    const p = plan({ ...IDEAL, ta: 40, ph: 7.0, fc: 0.5 });
    expect(p.steps[0]!.kind).toBe('raise-alkalinity');
    expect(p.steps[0]!.amount).toMatchObject({ base: 650, unit: 'g' });
    expect(p.steps[0]!.waitHours).toBe(6);
    expect(p.steps.at(-1)!.kind).toBe('raise-chlorine');
    expect(p.steps.at(-1)!.amount!.base).toBe(270);
    expect(p.status).toBe('act');
  });

  it('CYA 10: 290 g stabiliser', () => {
    const p = plan({ ...IDEAL, cya: 10, fc: 3 });
    const step = p.steps.find((s) => s.kind === 'raise-stabiliser')!;
    expect(step.amount).toMatchObject({ base: 290, unit: 'g' });
    expect(step.retestAfterDays).toBe(7);
  });

  it('CYA 100: recommend draining about 60%', () => {
    const p = plan({ ...IDEAL, cya: 100 });
    expect(kinds(p)).toEqual(['drain']);
    expect(p.steps[0]!.drainPercent).toBe(60);
    expect(codes(p)).toContain('retest-after-drain');
  });

  it('pH 7.9, TA 80: acid dose in a realistic range (roughly 60 to 250 mL)', () => {
    const p = plan({ ...IDEAL, ph: 7.9 });
    expect(kinds(p)).toEqual(['lower-ph']);
    const step = p.steps[0]!;
    expect(step.amount!.unit).toBe('mL');
    expect(step.amount!.base).toBeGreaterThanOrEqual(60);
    expect(step.amount!.base).toBeLessThanOrEqual(250);
    expect(step.waitHours).toBe(4);
  });
});

describe('step order', () => {
  it('goes alkalinity, pH, stabiliser, chlorine', () => {
    // Low TA and low CYA, and high pH that bicarb will push higher still
    const p = plan({ fc: 0.5, ph: 7.8, ta: 40, cya: 10 });
    expect(kinds(p)).toEqual(['raise-alkalinity', 'lower-ph', 'raise-stabiliser', 'raise-chlorine']);
  });

  it('recalculates pH after bicarb before deciding on pH correction', () => {
    // Bicarb lifts pH 7.0 into range, so no soda ash is needed
    const p = plan({ ...IDEAL, ta: 40, ph: 7.0 });
    expect(kinds(p)).toEqual(['raise-alkalinity']);
    expect(p.steps[0]!.notes.join(' ')).toMatch(/pH up to about 7\.2/);
  });

  it('bases the pH step on the predicted pH after bicarb', () => {
    const p = plan({ ...IDEAL, ta: 40, ph: 7.7 });
    const ph = p.steps.find((s) => s.kind === 'lower-ph')!;
    expect(ph.from).toBeGreaterThan(7.7);
    expect(ph.notes.join(' ')).toMatch(/expected pH/);
  });
});

describe('pH', () => {
  it('uses soda ash when pH is low and alkalinity is fine', () => {
    const p = plan({ ...IDEAL, ph: 7.0 });
    expect(kinds(p)).toEqual(['raise-ph']);
    expect(p.steps[0]!.chemical).toMatch(/Soda ash/);
    expect(p.steps[0]!.amount!.unit).toBe('g');
    expect(p.steps[0]!.amount!.base).toBeGreaterThan(0);
  });

  it('gives dry acid in grams when that is the chosen acid', () => {
    const p = plan(
      { ...IDEAL, ph: 7.9 },
      { ...POOL, strengths: { ...DEFAULT_STRENGTHS, acidType: 'dryAcid' } },
    );
    expect(p.steps[0]!.chemical).toMatch(/Dry acid/);
    expect(p.steps[0]!.amount!.unit).toBe('g');
  });

  it('needs more acid at higher alkalinity', () => {
    const low = plan({ ...IDEAL, ph: 7.9, ta: 60 }).steps[0]!.amount!.base;
    const high = plan({ ...IDEAL, ph: 7.9, ta: 120 }).steps[0]!.amount!.base;
    expect(high).toBeGreaterThan(low);
  });

  it('reports the alkalinity drop from acid only when it is 5 ppm or more', () => {
    const big = plan({ ...IDEAL, ph: 8.2, ta: 120 }).steps[0]!;
    expect(big.notes.join(' ')).toMatch(/lower alkalinity by about \d+ ppm/);

    const small = plan({ ...IDEAL, ph: 7.7, ta: 60 }).steps[0]!;
    expect(small.kind).toBe('lower-ph');
    expect(small.notes.join(' ')).not.toMatch(/lower alkalinity/);
  });

  it('asks for alkalinity before giving a pH dose', () => {
    const p = plan({ fc: 4, ph: 7.9, cya: 40 });
    expect(p.steps).toEqual([]);
    expect(codes(p)).toContain('need-alkalinity-for-ph');
    expect(p.missing).toEqual(['ta']);
  });
});

describe('chlorine', () => {
  it('doses granular chlorine in grams for granular pools', () => {
    const p = plan({ ...IDEAL, fc: 1, ta: 100 }, { ...POOL, sanitiser: 'granular' });
    const step = p.steps[0]!;
    expect(step.kind).toBe('raise-chlorine');
    expect(step.chemical).toMatch(/Granular/);
    // 3 ppm × 9600 ÷ 1000 ÷ 0.65 = 44.3 g, rounds to 45 g
    expect(step.amount).toMatchObject({ base: 45, unit: 'g' });
  });

  it('tops up salt pools with liquid chlorine and flags the chlorinator', () => {
    const p = plan({ fc: 1, ph: 7.4, ta: 80, cya: 60 }, { ...POOL, sanitiser: 'salt' });
    const step = p.steps[0]!;
    expect(step.chemical).toMatch(/Liquid chlorine/);
    // Salt CYA 60 → ideal FC 6; Δ5 × 9600 ÷ 125 = 384 → 380 mL
    expect(step.amount!.base).toBe(380);
    expect(codes(p)).toContain('salt-chlorinator');
  });

  it('scales the chlorine target with stabiliser', () => {
    // CYA 60 → min 4.5, so FC 4 needs a top-up to 6
    const p = plan({ ...IDEAL, cya: 60 });
    expect(p.steps[0]!.to).toBe(6);
  });

  it('does not dose when chlorine is within range', () => {
    expect(plan({ ...IDEAL, fc: 3 }).steps).toEqual([]);
  });

  it('warns no swimming above 10 ppm', () => {
    const p = plan({ ...IDEAL, fc: 12 });
    const w = p.warnings.find((x) => x.code === 'no-swimming-high-chlorine')!;
    expect(w.severity).toBe('safety');
    expect(p.status).toBe('act');
  });
});

describe('warnings', () => {
  it('warns never to mix acid and chlorine when a plan has both', () => {
    const p = plan({ ...IDEAL, ph: 7.9, fc: 1 });
    expect(kinds(p)).toEqual(['lower-ph', 'raise-chlorine']);
    expect(p.warnings[0]!.code).toBe('never-mix-acid-chlorine');
    expect(p.warnings[0]!.severity).toBe('safety');
  });

  it('explains that high alkalinity comes down slowly, without a dose step', () => {
    const p = plan({ ...IDEAL, ta: 180 });
    expect(p.steps).toEqual([]);
    expect(codes(p)).toContain('high-alkalinity');
    expect(p.status).toBe('tweak');
  });

  it('lists readings that were not tested', () => {
    const p = plan({ fc: 4, ph: 7.4 });
    expect(p.missing).toEqual(['ta', 'cya']);
    expect(codes(p)).toContain('missing-readings');
    expect(codes(p)).toContain('assumed-stabiliser');
    expect(p.status).toBe('tweak');
  });

  it('handles an empty test', () => {
    const p = plan({});
    expect(p.steps).toEqual([]);
    expect(p.missing).toEqual(['fc', 'ph', 'ta', 'cya']);
    expect(p.status).toBe('tweak');
  });
});

describe('validation', () => {
  it.each([
    ['ph', 5.9],
    ['ph', 9.1],
    ['fc', -1],
    ['fc', 31],
    ['ta', 401],
    ['cya', 301],
  ] as const)('rejects %s = %s', (field, value) => {
    const p = plan({ ...IDEAL, [field]: value });
    expect(p.errors.map((e) => e.field)).toContain(field);
    expect(p.steps).toEqual([]);
  });

  it('accepts the edges of each range', () => {
    expect(plan({ fc: 0, ph: 6, ta: 0, cya: 0 }).errors).toEqual([]);
    expect(plan({ fc: 30, ph: 9, ta: 400, cya: 300 }).errors).toEqual([]);
  });

  it('rejects a pool with no volume', () => {
    expect(plan(IDEAL, { ...POOL, volumeLitres: 0 }).errors[0]!.field).toBe('volumeLitres');
  });

  it('rejects impossible product strengths', () => {
    const bad = { ...POOL, strengths: { ...DEFAULT_STRENGTHS, liquidChlorinePct: 0 } };
    expect(plan(IDEAL, bad).errors[0]!.field).toBe('liquidChlorinePct');
  });
});

describe('indoor pools', () => {
  it('never adds stabiliser indoors', () => {
    const p = plan({ fc: 3, ph: 7.4, ta: 80, cya: 0 }, { ...POOL, location: 'indoor' });
    expect(p.steps).toEqual([]);
    expect(p.status).toBe('clear');
  });

  it('drains to a sensible level rather than 100% when indoor stabiliser is high', () => {
    const p = plan({ fc: 3, ph: 7.4, ta: 80, cya: 40 }, { ...POOL, location: 'indoor' });
    expect(p.steps[0]!.kind).toBe('drain');
    expect(p.steps[0]!.drainPercent).toBeLessThan(100);
  });
});

describe('scaling', () => {
  it('scales doses with pool volume', () => {
    const big = plan({ ...IDEAL, fc: 1 }, { ...POOL, volumeLitres: 50_000 });
    // 3 × 50000 ÷ 125 = 1200 mL
    expect(big.steps[0]!.amount).toMatchObject({ base: 1200, unit: 'L', display: '1.2 L' });
  });
});
