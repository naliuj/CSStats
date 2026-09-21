import { bestAndCurrent, mean, rollingAverage, stdDev, trimCount, type BestCurrent } from './averages';
import type { Solve } from './types';

export const AVERAGES = [
  { key: 'mo3', n: 3, trim: 0 },
  { key: 'ao5', n: 5, trim: trimCount(5) },
  { key: 'ao12', n: 12, trim: trimCount(12) },
  { key: 'ao50', n: 50, trim: trimCount(50) },
  { key: 'ao100', n: 100, trim: trimCount(100) },
  { key: 'ao1000', n: 1000, trim: trimCount(1000) },
] as const;

export type AvgKey = (typeof AVERAGES)[number]['key'];

export interface Stats {
  solves: Solve[];
  times: number[];
  dates: number[];
  count: number;
  dnf: number;
  plus2: number;
  mean: number;
  stdDev: number;
  single: BestCurrent;
  rolling: Record<AvgKey, Float64Array>;
  best: Record<AvgKey, BestCurrent>;
  totalTime: number;
  activeDays: number;
}

export function computeStats(solves: Solve[]): Stats {
  const times = solves.map((s) => s.time);
  const dates = solves.map((s) => s.date);
  const finite = times.filter(Number.isFinite);
  const rolling = {} as Record<AvgKey, Float64Array>;
  const best = {} as Record<AvgKey, BestCurrent>;
  for (const a of AVERAGES) {
    rolling[a.key] = rollingAverage(times, a.n, a.trim);
    best[a.key] = bestAndCurrent(rolling[a.key]);
  }
  const days = new Set<string>();
  for (const d of dates) {
    const x = new Date(d);
    days.add(`${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`);
  }
  return {
    solves,
    times,
    dates,
    count: solves.length,
    dnf: solves.filter((s) => s.penalty === -1).length,
    plus2: solves.filter((s) => s.penalty === 2000).length,
    mean: mean(finite),
    stdDev: stdDev(finite),
    single: bestAndCurrent(times),
    rolling,
    best,
    totalTime: solves.reduce((sum, s) => sum + s.raw + (s.penalty > 0 ? s.penalty : 0), 0),
    activeDays: days.size,
  };
}

/** Value at quantile q (0..1) of the finite times. */
export function quantile(times: readonly number[], q: number): number {
  const f = times.filter(Number.isFinite).sort((a, b) => a - b);
  if (!f.length) return NaN;
  return f[Math.min(f.length - 1, Math.max(0, Math.floor(q * (f.length - 1))))];
}
