import { formatSingle, formatTime } from './format';
import { timeTick } from '../chartStyle';
import { puzzleOf } from './events';

/**
 * What a session's results measure. Fewest Moves results are move counts stored like times
 * (28 moves = 28000), which keeps averages right ("29.33") but must be shown as moves.
 */
export type Unit = 'time' | 'moves';

export interface Units {
  unit: Unit;
  /** A single result: "12.34" or "28". */
  single: (ms: number) => string;
  /** A solve with its penalty, as listed: "12.34+", "DNF(12.34)", "DNF", "28". */
  solve: (s: { raw: number; penalty: number; time: number }) => string;
  /** An average or mean: "12.35", "29.33". */
  avg: (ms: number) => string;
  /** An axis label. */
  tick: (v: number) => string;
  /** How finely to bucket results when counting the most common ones, in ms. */
  buckets: readonly (10 | 100 | 1000)[];
}

export const TIME_UNITS: Units = {
  unit: 'time',
  single: formatSingle,
  solve: (s) => (s.penalty === -1 ? (s.raw > 0 ? `DNF(${formatSingle(s.raw)})` : 'DNF') : formatSingle(s.time) + (s.penalty ? '+' : '')),
  avg: (ms) => formatTime(ms),
  tick: timeTick,
  buckets: [10, 100],
};

const moves = (ms: number) => (Number.isNaN(ms) ? '–' : ms === Infinity ? 'DNF' : String(Math.round(ms / 1000)));

export const MOVE_UNITS: Units = {
  unit: 'moves',
  single: moves,
  // Fewest Moves has no +2; a DNF's recorded count isn't a result.
  solve: (s) => (s.penalty === -1 ? 'DNF' : moves(s.time)),
  // Two decimals, rounded half-up like times, but never as minutes: 65 moves is "65.00", not "1:05.00".
  avg: (ms) => (Number.isNaN(ms) ? '–' : ms === Infinity ? 'DNF' : (Math.round(ms / 10) / 100).toFixed(2)),
  tick: (v) => String(Math.round(v / 100) / 10),
  buckets: [1000],
};

export const unitsFor = (u: Unit) => (u === 'moves' ? MOVE_UNITS : TIME_UNITS);

/** Moves only when every session shown is Fewest Moves; anything mixed is shown as time. */
export const unitOf = (sessions: readonly { unit?: Unit }[]): Unit =>
  sessions.length > 0 && sessions.every((s) => s.unit === 'moves') ? 'moves' : 'time';

/**
 * Whether a csTimer session holds move counts: a Fewest Moves scramble type with every result a
 * whole number of moves, at most 80. That's how PTimer exports Fewest Moves to csTimer, and timed
 * attempts (minutes long) never look like it.
 */
export function looksLikeMoves(scrType: string, raws: readonly number[]): boolean {
  return puzzleOf(scrType) === '333fm' && raws.some((r) => r > 0) && raws.every((r) => r === 0 || (r % 1000 === 0 && r <= 80000));
}
