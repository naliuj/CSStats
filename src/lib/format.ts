/**
 * Format ms like csTimer: "9.87", "1:02.34", "1:02:03.45"; DNF for Infinity; "–" for NaN.
 * Rounds half-up, which is how csTimer shows averages. Use formatSingle for single solves.
 */
export function formatTime(ms: number, decimals = 2, truncate = false): string {
  if (Number.isNaN(ms)) return '–';
  if (ms === Infinity) return 'DNF';
  const scale = 10 ** decimals;
  if (truncate) {
    const unit = 1000 / scale;
    ms = Math.floor(ms / unit) * unit;
  }
  const total = Math.round((ms / 1000) * scale) / scale;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total - h * 3600 - m * 60;
  let sec = s.toFixed(decimals);
  if (h || m) sec = sec.padStart(decimals ? decimals + 3 : 2, '0');
  if (h) return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  if (m) return `${m}:${sec}`;
  return sec;
}

/** A single solve time, truncated like csTimer does (12.268 → "12.26"). */
export const formatSingle = (ms: number) => formatTime(ms, 2, true);

/** Human duration for total practice time, e.g. "4d 3h", "5h 12m", "42m". */
export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export const formatDate = (ms: number) => dateFmt.format(ms);

const monthFmt = new Intl.DateTimeFormat(undefined, { year: '2-digit', month: 'short' });
export const formatMonth = (ms: number) => monthFmt.format(ms);
