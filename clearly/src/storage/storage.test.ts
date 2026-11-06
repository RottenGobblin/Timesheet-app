import { describe, expect, it } from 'vitest';
import { DEFAULT_STRENGTHS } from '../engine';
import {
  addTest,
  clearPool,
  createMemoryStore,
  deleteTest,
  latestTest,
  listTests,
  loadPool,
  PoolValidationError,
  savePool,
  STORAGE_KEYS,
  TestValidationError,
  updateTestNotes,
} from './index';

const POOL = {
  name: 'Backyard',
  volumeLitres: 9600,
  sanitiser: 'liquid' as const,
  location: 'outdoor' as const,
  strengths: { ...DEFAULT_STRENGTHS },
};

describe('pool profile storage', () => {
  it('returns null when nothing is saved', async () => {
    expect(await loadPool(createMemoryStore())).toBeNull();
  });

  it('saves and loads a pool', async () => {
    const store = createMemoryStore();
    const now = new Date('2026-11-06T09:00:00Z');
    const saved = await savePool(store, POOL, now);
    expect(saved.updatedAt).toBe('2026-11-06T09:00:00.000Z');
    expect(await loadPool(store)).toEqual(saved);
  });

  it('stores a versioned record', async () => {
    const store = createMemoryStore();
    await savePool(store, POOL);
    const raw = JSON.parse(store.snapshot()[STORAGE_KEYS.pool]!);
    expect(raw.v).toBe(1);
    expect(raw.data.volumeLitres).toBe(9600);
  });

  it('trims the pool name', async () => {
    const saved = await savePool(createMemoryStore(), { ...POOL, name: '  Backyard  ' });
    expect(saved.name).toBe('Backyard');
  });

  it('refuses to save a pool the engine cannot dose', async () => {
    const store = createMemoryStore();
    await expect(savePool(store, { ...POOL, volumeLitres: 0 })).rejects.toBeInstanceOf(PoolValidationError);
    expect(await loadPool(store)).toBeNull();
  });

  it('fills in missing product strengths with defaults', async () => {
    const store = createMemoryStore({
      [STORAGE_KEYS.pool]: JSON.stringify({
        v: 1,
        data: { name: 'Old', volumeLitres: 20000, sanitiser: 'salt', location: 'outdoor', strengths: { liquidChlorinePct: 10 } },
      }),
    });
    const pool = await loadPool(store);
    expect(pool?.strengths).toEqual({ ...DEFAULT_STRENGTHS, liquidChlorinePct: 10 });
  });

  it.each([
    ['not JSON', '{oops'],
    ['no envelope', JSON.stringify({ volumeLitres: 9600 })],
    ['bad sanitiser', JSON.stringify({ v: 1, data: { ...POOL, sanitiser: 'bromine' } })],
    ['no volume', JSON.stringify({ v: 1, data: { ...POOL, volumeLitres: undefined } })],
  ])('treats corrupt data (%s) as no pool rather than crashing', async (_label, raw) => {
    const store = createMemoryStore({ [STORAGE_KEYS.pool]: raw });
    expect(await loadPool(store)).toBeNull();
  });

  it('clears the pool', async () => {
    const store = createMemoryStore();
    await savePool(store, POOL);
    await clearPool(store);
    expect(await loadPool(store)).toBeNull();
  });
});

describe('test history storage', () => {
  it('starts empty', async () => {
    const store = createMemoryStore();
    expect(await listTests(store)).toEqual([]);
    expect(await latestTest(store)).toBeNull();
  });

  it('adds tests and lists them newest first', async () => {
    const store = createMemoryStore();
    await addTest(store, { readings: { fc: 2 }, takenAt: new Date('2026-11-01T08:00:00Z') });
    await addTest(store, { readings: { fc: 4 }, takenAt: new Date('2026-11-05T08:00:00Z') });
    await addTest(store, { readings: { fc: 3 }, takenAt: new Date('2026-11-03T08:00:00Z') });
    const tests = await listTests(store);
    expect(tests.map((t) => t.readings.fc)).toEqual([4, 3, 2]);
    expect((await latestTest(store))?.readings.fc).toBe(4);
  });

  it('keeps only the readings that were entered', async () => {
    const store = createMemoryStore();
    const t = await addTest(store, { readings: { fc: 4, ph: 7.4 }, notes: '  after rain  ' });
    expect(t.readings).toEqual({ fc: 4, ph: 7.4 });
    expect(t.notes).toBe('after rain');
  });

  it('rejects out-of-range readings', async () => {
    const store = createMemoryStore();
    await expect(addTest(store, { readings: { ph: 10 } })).rejects.toBeInstanceOf(TestValidationError);
    expect(await listTests(store)).toEqual([]);
  });

  it('updates notes and deletes tests', async () => {
    const store = createMemoryStore();
    const a = await addTest(store, { readings: { fc: 4 } });
    const b = await addTest(store, { readings: { fc: 3 } });
    expect((await updateTestNotes(store, a.id, 'cloudy'))?.notes).toBe('cloudy');
    expect(await deleteTest(store, b.id)).toBe(true);
    expect(await deleteTest(store, 'nope')).toBe(false);
    const tests = await listTests(store);
    expect(tests).toHaveLength(1);
    expect(tests[0]!.notes).toBe('cloudy');
  });

  it('skips unreadable entries instead of losing the rest', async () => {
    const store = createMemoryStore({
      [STORAGE_KEYS.tests]: JSON.stringify({
        v: 1,
        data: [
          { id: 'a', takenAt: '2026-11-01T08:00:00Z', readings: { fc: 4, ph: 'x' }, notes: '' },
          { id: 'b', takenAt: 'not a date', readings: {} },
          'junk',
        ],
      }),
    });
    const tests = await listTests(store);
    expect(tests).toHaveLength(1);
    expect(tests[0]!.readings).toEqual({ fc: 4 });
  });
});
