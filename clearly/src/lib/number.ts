/**
 * Parse a number typed by a person. Accepts "9,600", "9 600", "12.5" and "12,5"
 * (comma as decimal when there's exactly one and it's followed by 1 or 2 digits).
 * Returns undefined for empty or unreadable input.
 */
export function parseNumber(input: string): number | undefined {
  let s = input.trim().replace(/\s+/g, '');
  if (s === '') return undefined;
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  if (!/^-?\d*\.?\d+$/.test(s) && !/^-?\d+\.$/.test(s)) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Format litres for display, e.g. 9600 → "9,600". */
export function formatLitres(litres: number): string {
  return Math.round(litres).toLocaleString('en-AU');
}

/** Step a value and keep it inside a range, avoiding floating point noise. */
export function stepValue(value: number, step: number, min: number, max: number): number {
  const next = Math.round((value + step) * 100) / 100;
  return Math.min(max, Math.max(min, next));
}
