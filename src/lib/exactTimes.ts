/** Bucket size in ms: 10 = hundredths (as displayed), 100 = tenths. */
export type Precision = 10 | 100;

export interface TimeCount {
  /** Time truncated to the precision, in ms. */
  time: number;
  count: number;
  /** Index of the most recent solve with this time. */
  lastIndex: number;
}

export interface ExactTimeStats {
  /** Sorted by count desc, then most recent first. */
  ranked: TimeCount[];
  /** Number of non-DNF solves counted. */
  total: number;
  distinct: number;
  /** Times that came up exactly once. */
  singletons: number;
}

/**
 * Count how often each displayed time occurs. Truncates like csTimer does for singles,
 * so every key matches what csTimer shows. DNFs are skipped; +2s count at their final time.
 */
export function exactTimeStats(times: readonly number[], precision: Precision): ExactTimeStats {
  const map = new Map<number, TimeCount>();
  let total = 0;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (!Number.isFinite(t)) continue;
    total++;
    const key = Math.floor(t / precision) * precision;
    const e = map.get(key);
    if (e) {
      e.count++;
      e.lastIndex = i;
    } else {
      map.set(key, { time: key, count: 1, lastIndex: i });
    }
  }
  const ranked = [...map.values()].sort((a, b) => b.count - a.count || b.lastIndex - a.lastIndex);
  let singletons = 0;
  for (const e of ranked) if (e.count === 1) singletons++;
  return { ranked, total, distinct: ranked.length, singletons };
}

/** How often each final hundredths digit (0-9) appears, as displayed. */
export function lastDigitCounts(times: readonly number[]): number[] {
  const out = new Array(10).fill(0);
  for (const t of times) if (Number.isFinite(t)) out[Math.floor(t / 10) % 10]++;
  return out;
}
