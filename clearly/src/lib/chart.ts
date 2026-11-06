import type { Range, ReadingKey } from '../engine';
import type { TestRecord } from '../storage';

export interface Point {
  /** Timestamp, ms. */
  t: number;
  v: number;
}

export type Period = '30d' | '90d' | 'all';

const DAY = 86_400_000;
const PERIOD_DAYS: Record<Exclude<Period, 'all'>, number> = { '30d': 30, '90d': 90 };

/** One reading's values over time, oldest first. Tests without that reading are skipped. */
export function seriesFor(tests: TestRecord[], key: ReadingKey): Point[] {
  return tests
    .flatMap((t) => {
      const v = t.readings[key];
      return v === undefined ? [] : [{ t: Date.parse(t.takenAt), v }];
    })
    .sort((a, b) => a.t - b.t);
}

export function inPeriod(points: Point[], period: Period, now: Date): Point[] {
  if (period === 'all') return points;
  const from = now.getTime() - PERIOD_DAYS[period] * DAY;
  return points.filter((p) => p.t >= from);
}

/**
 * Y axis range: covers the data and the ideal band with a little headroom, rounded to
 * steps that suit the reading (0.1 for pH, 1 for chlorine, 10 for TA and CYA).
 */
export function yDomain(points: Point[], band: Range, key: ReadingKey): [number, number] {
  const step = key === 'ph' ? 0.1 : key === 'fc' ? 1 : 10;
  const values = [...points.map((p) => p.v), band.min, band.max];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.1, step);
  lo = Math.floor((lo - pad) / step) * step;
  hi = Math.ceil((hi + pad) / step) * step;
  if (key !== 'ph') lo = Math.max(0, lo);
  return [round(lo), round(hi)];
}

export interface ChartBox {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface ChartLayout {
  dots: { x: number; y: number; v: number; t: number }[];
  /** SVG path through the dots, empty if fewer than 2. */
  path: string;
  /** Ideal band as a y range in pixels (top is the smaller number). */
  bandTop: number;
  bandBottom: number;
  yTicks: { y: number; label: number }[];
}

/** Turn points into pixel positions. x is spaced by time across the period shown. */
export function layoutChart(
  points: Point[],
  band: Range,
  domain: [number, number],
  xRange: [number, number],
  box: ChartBox,
): ChartLayout {
  const plotW = box.width - box.padLeft - box.padRight;
  const plotH = box.height - box.padTop - box.padBottom;
  const [lo, hi] = domain;
  const [t0, t1] = xRange;

  const yOf = (v: number) => box.padTop + plotH * (1 - (clamp(v, lo, hi) - lo) / (hi - lo || 1));
  const xOf = (t: number) => (t1 === t0 ? box.padLeft + plotW / 2 : box.padLeft + (plotW * (t - t0)) / (t1 - t0));

  const dots = points.map((p) => ({ x: round(xOf(p.t)), y: round(yOf(p.v)), v: p.v, t: p.t }));
  const path = dots.length < 2 ? '' : dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x} ${d.y}`).join(' ');

  return {
    dots,
    path,
    bandTop: round(yOf(band.max)),
    bandBottom: round(yOf(band.min)),
    yTicks: [lo, (lo + hi) / 2, hi].map((label) => ({ y: round(yOf(label)), label: round(label) })),
  };
}

/** x range for the chart: the period's window, or the data's span for "all". */
export function xRangeFor(points: Point[], period: Period, now: Date): [number, number] {
  if (period !== 'all') return [now.getTime() - PERIOD_DAYS[period] * DAY, now.getTime()];
  if (points.length === 0) return [now.getTime(), now.getTime()];
  return [points[0]!.t, Math.max(points[points.length - 1]!.t, points[0]!.t)];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
