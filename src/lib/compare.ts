import { quantile } from './stats';

export const NICE_BINS = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000];

export type Density = 'fine' | 'auto' | 'coarse';

/** A bin width giving ~30 bins across lo..hi, stepped finer or coarser. */
export function binWidth(lo: number, hi: number, density: Density = 'auto'): number {
  const target = (hi - lo) / 30;
  const idx = Math.max(0, NICE_BINS.findIndex((b) => b >= target));
  const i = density === 'fine' ? idx - 1 : density === 'coarse' ? idx + 1 : idx;
  return NICE_BINS[Math.min(NICE_BINS.length - 1, Math.max(0, i))] ?? NICE_BINS[NICE_BINS.length - 1];
}

export interface SharedHistogram {
  start: number;
  width: number;
  /** Bin centres. */
  centers: number[];
  /** Per side, % of that side's finite solves in each bin. */
  percent: number[][];
}

/**
 * Histograms over the same bins for several sets of times, as percentages so sides with
 * different solve counts are comparable. The slowest 1% of each side is left out of the scale.
 */
export function sharedHistogram(sides: readonly (readonly number[])[], density: Density = 'auto'): SharedHistogram {
  const los = sides.map((t) => quantile(t, 0)).filter(Number.isFinite);
  const his = sides.map((t) => quantile(t, 0.99)).filter(Number.isFinite);
  if (!los.length) return { start: 0, width: 1000, centers: [], percent: sides.map(() => []) };
  const lo = Math.min(...los);
  const hi = Math.max(...his);
  const width = binWidth(lo, hi, density);
  const start = Math.floor(lo / width) * width;
  const n = Math.max(1, Math.floor((hi - start) / width) + 1);
  const centers = Array.from({ length: n }, (_, i) => start + i * width + width / 2);
  const percent = sides.map((times) => {
    const counts = new Array<number>(n).fill(0);
    let total = 0;
    for (const t of times) {
      if (!Number.isFinite(t)) continue;
      total++;
      const b = Math.floor((t - start) / width);
      if (b >= 0 && b < n) counts[b]++;
    }
    return counts.map((c) => (total ? (c / total) * 100 : 0));
  });
  return { start, width, centers, percent };
}

/** b − a for times, or NaN when either is missing or a DNF (no meaningful difference). */
export function delta(a: number, b: number): number {
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : NaN;
}
