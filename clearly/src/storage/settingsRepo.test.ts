import { describe, expect, it } from 'vitest';
import { createMemoryStore, DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, STORAGE_KEYS } from './index';

describe('settings storage', () => {
  it('uses the brief’s defaults when nothing is saved', async () => {
    const s = await loadSettings(createMemoryStore());
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(s.quietHours).toEqual({ startHour: 21, endHour: 7 });
    expect(s.testSchedule).toMatchObject({ summer: 2, winter: 1 });
  });

  it('saves and loads', async () => {
    const store = createMemoryStore();
    const changed = { ...DEFAULT_SETTINGS, sunMode: true, reminders: { ...DEFAULT_SETTINGS.reminders, overdue: false } };
    await saveSettings(store, changed);
    expect(await loadSettings(store)).toEqual(changed);
  });

  it('fills in missing or invalid fields with defaults', () => {
    const s = parseSettings({ sunMode: true, quietHours: { startHour: 25, endHour: 6 }, testSchedule: { summer: 7, time: 'noon' } });
    expect(s.sunMode).toBe(true);
    expect(s.quietHours).toEqual({ startHour: 21, endHour: 6 });
    expect(s.testSchedule).toEqual(DEFAULT_SETTINGS.testSchedule);
    expect(s.reminders).toEqual(DEFAULT_SETTINGS.reminders);
  });

  it('does not share nested objects with the defaults', () => {
    const s = parseSettings(null);
    s.reminders.test = false;
    expect(DEFAULT_SETTINGS.reminders.test).toBe(true);
  });

  it('treats corrupt data as defaults', async () => {
    const store = createMemoryStore({ [STORAGE_KEYS.settings]: 'nope' });
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });
});
