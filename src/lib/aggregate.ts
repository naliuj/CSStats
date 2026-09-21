import type { Solve } from './types';

export interface Bucket {
  count: number;
  /** Mean of non-DNF times, NaN if none. */
  mean: number;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local-time YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local-time Monday of the week containing ms, as YYYY-MM-DD. */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const offset = (d.getDay() + 6) % 7;
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime());
}

function groupBy(solves: readonly Solve[], key: (s: Solve) => string): Map<string, Bucket> {
  const acc = new Map<string, { count: number; sum: number; ok: number }>();
  for (const s of solves) {
    const k = key(s);
    let a = acc.get(k);
    if (!a) acc.set(k, (a = { count: 0, sum: 0, ok: 0 }));
    a.count++;
    if (Number.isFinite(s.time)) {
      a.sum += s.time;
      a.ok++;
    }
  }
  const out = new Map<string, Bucket>();
  for (const [k, a] of [...acc].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))) {
    out.set(k, { count: a.count, mean: a.ok ? a.sum / a.ok : NaN });
  }
  return out;
}

export const byDay = (solves: readonly Solve[]) => groupBy(solves, (s) => dayKey(s.date));
export const byWeek = (solves: readonly Solve[]) => groupBy(solves, (s) => weekKey(s.date));

/** 24 buckets indexed by local hour. */
export function byHour(solves: readonly Solve[]): Bucket[] {
  const m = groupBy(solves, (s) => pad(new Date(s.date).getHours()));
  return Array.from({ length: 24 }, (_, h) => m.get(pad(h)) ?? { count: 0, mean: NaN });
}

/** 7 buckets, Monday first. */
export function byWeekday(solves: readonly Solve[]): Bucket[] {
  const m = groupBy(solves, (s) => String((new Date(s.date).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, d) => m.get(String(d)) ?? { count: 0, mean: NaN });
}
