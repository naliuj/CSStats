export interface PBPoint {
  index: number;
  date: number;
  value: number;
}

/** Every point where the series sets a new best (finite values only). */
export function pbProgression(series: ArrayLike<number>, dates: readonly number[]): PBPoint[] {
  const out: PBPoint[] = [];
  let best = Infinity;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (Number.isFinite(v) && v < best) {
      best = v;
      out.push({ index: i, date: dates[i], value: v });
    }
  }
  return out;
}
