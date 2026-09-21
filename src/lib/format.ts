/** Format ms as csTimer does: "9.87", "1:02.34", "1:02:03.45"; DNF for Infinity; "–" for NaN. */
export function formatTime(ms: number, decimals = 2): string {
  if (Number.isNaN(ms)) return '–';
  if (ms === Infinity) return 'DNF';
  const scale = 10 ** decimals;
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
