import type { Session, Solve } from './types';

/** A date filter: YYYY-MM-DD bounds, inclusive, '' = open. */
export interface DateBounds {
  from: string;
  to: string;
}

export function parseDay(s: string, endOfDay: boolean): number {
  const [y, m, d] = s.split('-').map(Number);
  return endOfDay ? new Date(y, m - 1, d + 1).getTime() - 1 : new Date(y, m - 1, d).getTime();
}

/** Solves of the chosen sessions; several sessions are interleaved by date. */
export function selectSolves(sessions: Session[], ids: ReadonlySet<string>): Solve[] {
  const picked = sessions.filter((s) => ids.has(s.id));
  const all = picked.flatMap((s) => s.solves);
  if (picked.length > 1) all.sort((a, b) => a.date - b.date);
  return all;
}

export function filterByRange(solves: Solve[], { from, to }: DateBounds): Solve[] {
  if (!from && !to) return solves;
  const lo = from ? parseDay(from, false) : -Infinity;
  const hi = to ? parseDay(to, true) : Infinity;
  return solves.filter((s) => s.date >= lo && s.date <= hi);
}

/** Keep the ids that still exist; fall back to the first session when none do. */
export function validIds(sessions: Session[], ids: Iterable<string>): Set<string> {
  const valid = new Set([...ids].filter((id) => sessions.some((s) => s.id === id)));
  return valid.size || !sessions.length ? valid : new Set([sessions[0].id]);
}
