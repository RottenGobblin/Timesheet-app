import { describe, expect, it } from 'vitest';
import { createMemoryStore, loadAnyProgress, loadProgress, saveProgress, STORAGE_KEYS } from './index';

describe('plan progress storage', () => {
  it('starts fresh when nothing is saved', async () => {
    expect(await loadProgress(createMemoryStore(), 't1')).toEqual({ testId: 't1', ticks: {} });
  });

  it('saves and loads progress for the same test', async () => {
    const store = createMemoryStore();
    const progress = { testId: 't1', ticks: { 'lower-ph': '2026-11-06T05:00:00.000Z' }, reminderId: 'n1' };
    await saveProgress(store, progress);
    expect(await loadProgress(store, 't1')).toEqual(progress);
  });

  it('starts fresh for a newer test but still exposes the old progress', async () => {
    const store = createMemoryStore();
    await saveProgress(store, { testId: 't1', ticks: { 'lower-ph': '2026-11-06T05:00:00.000Z' }, reminderId: 'n1' });
    expect(await loadProgress(store, 't2')).toEqual({ testId: 't2', ticks: {} });
    expect((await loadAnyProgress(store))?.reminderId).toBe('n1');
  });

  it('drops unknown steps and bad dates', async () => {
    const store = createMemoryStore({
      [STORAGE_KEYS.planProgress]: JSON.stringify({
        v: 1,
        data: { testId: 't1', ticks: { 'lower-ph': 'nope', 'raise-chlorine': '2026-11-06T05:00:00.000Z', bogus: '2026-11-06T05:00:00.000Z' } },
      }),
    });
    expect((await loadProgress(store, 't1')).ticks).toEqual({ 'raise-chlorine': '2026-11-06T05:00:00.000Z' });
  });

  it('treats corrupt data as no progress', async () => {
    const store = createMemoryStore({ [STORAGE_KEYS.planProgress]: '{bad' });
    expect(await loadProgress(store, 't1')).toEqual({ testId: 't1', ticks: {} });
  });
});
