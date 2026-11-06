import { describe, expect, it } from 'vitest';
import { DEFAULT_STRENGTHS } from '../engine';
import { emptyPoolForm, formToPool, poolToForm, relevantStrengths } from './poolForm';

describe('formToPool', () => {
  it('builds a pool from a filled-in form', () => {
    const result = formToPool({ ...emptyPoolForm(), name: '  Backyard  ', volume: '9,600' });
    expect(result).toEqual({
      ok: true,
      pool: {
        name: 'Backyard',
        volumeLitres: 9600,
        sanitiser: 'liquid',
        location: 'outdoor',
        strengths: DEFAULT_STRENGTHS,
      },
    });
  });

  it('asks for a volume when it is blank or unreadable', () => {
    for (const volume of ['', 'lots']) {
      const result = formToPool({ ...emptyPoolForm(), volume });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.volume).toMatch(/Enter your pool volume/);
    }
  });

  it('flags volumes that are unlikely for a home pool', () => {
    for (const volume of ['500', '600000']) {
      const result = formToPool({ ...emptyPoolForm(), volume });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.volume).toMatch(/looks off/);
    }
  });

  it('passes through strength errors from the engine', () => {
    const form = emptyPoolForm();
    form.volume = '9600';
    form.strengths.hydrochloricAcidPct = 0;
    const result = formToPool(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['hydrochloricAcidPct']);
  });
});

describe('poolToForm', () => {
  it('round-trips a saved pool', () => {
    const pool = {
      name: 'Backyard',
      volumeLitres: 42000,
      sanitiser: 'salt' as const,
      location: 'outdoor' as const,
      strengths: { ...DEFAULT_STRENGTHS, acidType: 'dryAcid' as const },
      updatedAt: '2026-11-06T00:00:00.000Z',
    };
    const result = formToPool(poolToForm(pool));
    expect(result).toEqual({ ok: true, pool: { ...pool, updatedAt: undefined } });
  });
});

describe('relevantStrengths', () => {
  it('shows liquid chlorine and hydrochloric acid by default', () => {
    expect(relevantStrengths(emptyPoolForm())).toEqual(['liquidChlorinePct', 'acidType', 'hydrochloricAcidPct']);
  });

  it('shows granular strength for granular pools and purity for dry acid', () => {
    const form = { sanitiser: 'granular' as const, strengths: { ...DEFAULT_STRENGTHS, acidType: 'dryAcid' as const } };
    expect(relevantStrengths(form)).toEqual(['granularChlorinePct', 'acidType', 'dryAcidPurityPct']);
  });

  it('salt pools top up with liquid chlorine', () => {
    expect(relevantStrengths({ ...emptyPoolForm(), sanitiser: 'salt' })).toContain('liquidChlorinePct');
  });
});
