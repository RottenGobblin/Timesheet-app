import { describe, expect, it } from 'vitest';
import { daysSince, formatHour, formatTestDate, stepHour } from './dates';

// Local times, so the tests don't depend on the machine's time zone.
const now = new Date(2026, 10, 6, 18, 0);

describe('formatTestDate', () => {
  it('says today and yesterday with a time', () => {
    expect(formatTestDate(new Date(2026, 10, 6, 18, 40).toISOString(), now)).toBe('Today, 6:40 pm');
    expect(formatTestDate(new Date(2026, 10, 5, 8, 5).toISOString(), now)).toBe('Yesterday, 8:05 am');
    expect(formatTestDate(new Date(2026, 10, 6, 0, 15).toISOString(), now)).toBe('Today, 12:15 am');
    expect(formatTestDate(new Date(2026, 10, 6, 12, 0).toISOString(), now)).toBe('Today, 12:00 pm');
  });

  it('counts days within the week', () => {
    expect(formatTestDate(new Date(2026, 10, 3, 9, 0).toISOString(), now)).toBe('3 days ago');
  });

  it('shows the date after a week, with the year only if different', () => {
    expect(formatTestDate(new Date(2026, 9, 12, 9, 0).toISOString(), now)).toBe('12 Oct');
    expect(formatTestDate(new Date(2025, 11, 30, 9, 0).toISOString(), now)).toBe('30 Dec 2025');
  });
});

describe('daysSince', () => {
  it('counts calendar days', () => {
    expect(daysSince(new Date(2026, 10, 6, 1, 0).toISOString(), now)).toBe(0);
    expect(daysSince(new Date(2026, 9, 27, 23, 0).toISOString(), now)).toBe(10);
  });
});

describe('formatHour', () => {
  it('formats hours as am/pm', () => {
    expect(formatHour(21)).toBe('9 pm');
    expect(formatHour(7)).toBe('7 am');
    expect(formatHour(0)).toBe('12 am');
    expect(formatHour(12)).toBe('12 pm');
  });
});

describe('stepHour', () => {
  it('wraps around midnight', () => {
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
    expect(stepHour(9, 1)).toBe(10);
  });
});
