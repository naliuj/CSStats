/** Number of solves trimmed from each end of an aoN (csTimer/WCA: 5%, rounded up). */
export function trimCount(n: number): number {
  return n <= 3 ? 0 : Math.ceil(n / 20);
}

/** Plain mean of finite times; Infinity if any DNF; NaN if empty. */
export function mean(times: readonly number[]): number {
  if (!times.length) return NaN;
  let sum = 0;
  for (const t of times) sum += t;
  return sum / times.length;
}

/** Trimmed average of exactly the given window (DNF = Infinity). */
export function average(window: readonly number[], trim = trimCount(window.length)): number {
  const n = window.length;
  if (!n) return NaN;
  const sorted = [...window].sort((a, b) => a - b);
  let dnf = 0;
  for (const t of sorted) if (t === Infinity) dnf++;
  if (dnf > trim) return Infinity;
  let sum = 0;
  for (let i = trim; i < n - trim; i++) sum += sorted[i];
  return sum / (n - 2 * trim);
}

function lowerBound(arr: number[], v: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Rolling trimmed average: out[i] is the aoN of times[i-n+1..i], NaN for i < n-1.
 * Keeps the window sorted, so each step is O(n) splice + O(trim) sums.
 */
export function rollingAverage(times: readonly number[], n: number, trim = trimCount(n)): Float64Array {
  const out = new Float64Array(times.length).fill(NaN);
  if (n <= 0 || times.length < n) return out;
  const win: number[] = [];
  let finiteSum = 0;
  let dnf = 0;
  const keep = n - 2 * trim;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    win.splice(lowerBound(win, t), 0, t);
    if (t === Infinity) dnf++;
    else finiteSum += t;
    if (i >= n) {
      const old = times[i - n];
      win.splice(lowerBound(win, old), 1);
      if (old === Infinity) dnf--;
      else finiteSum -= old;
    }
    if (i < n - 1) continue;
    if (dnf > trim) {
      out[i] = Infinity;
      continue;
    }
    // Middle sum = finite total minus the `trim` smallest and the finite part of the `trim` largest.
    let sum = finiteSum;
    for (let k = 0; k < trim; k++) sum -= win[k];
    for (let k = n - trim; k < n; k++) if (win[k] !== Infinity) sum -= win[k];
    out[i] = sum / keep;
  }
  return out;
}

export interface BestCurrent {
  best: number;
  bestIndex: number;
  current: number;
}

/** Best (lowest) and latest values of a rolling series; NaN entries are ignored. */
export function bestAndCurrent(series: ArrayLike<number>): BestCurrent {
  let best = NaN;
  let bestIndex = -1;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (Number.isNaN(v)) continue;
    if (bestIndex === -1 || v < best) {
      best = v;
      bestIndex = i;
    }
  }
  return { best, bestIndex, current: series.length ? series[series.length - 1] : NaN };
}

export function stdDev(times: readonly number[]): number {
  const finite = times.filter(Number.isFinite);
  if (finite.length < 2) return NaN;
  const m = mean(finite);
  let ss = 0;
  for (const t of finite) ss += (t - m) ** 2;
  return Math.sqrt(ss / (finite.length - 1));
}
