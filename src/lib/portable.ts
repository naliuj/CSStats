/**
 * A format-neutral session, for moving sessions between files of different formats (csTimer ↔
 * PTimer). Each format reads its sessions into this shape and writes it back out.
 */
export interface PortableSolve {
  /** ms as recorded, before penalties. */
  raw: number;
  /** 0, 2000 (+2) or -1 (DNF). */
  penalty: 0 | 2000 | -1;
  scramble: string;
  comment: string;
  /** Epoch ms. */
  date: number;
  /** PTimer Fewest Moves solution. */
  solution?: string;
  /** The original csTimer entry, so csTimer → csTimer keeps every field. */
  cs?: unknown[];
  /** The solve's id in a PTimer file, to carry its reconstructions along. */
  ptId?: number;
}

export interface PortableSession {
  name: string;
  /** csTimer scramble type or PTimer event id, as the source file had it. */
  type: string;
  createdAt?: number;
  /** PTimer averages to beat. */
  targets?: { ao5?: number; ao12?: number };
  /** csTimer session options, so csTimer → csTimer keeps them. */
  csOpt?: Record<string, unknown>;
  solves: PortableSolve[];
}

export const normPenalty = (p: unknown): 0 | 2000 | -1 => (p === -1 ? -1 : typeof p === 'number' && p > 0 ? 2000 : 0);

/**
 * Identifies a solve across files and formats: same time, penalty, scramble and second. csTimer
 * keeps whole seconds, so dates are compared to the second (as PTimer's import does).
 */
export const dupeKey = (s: { raw: number; penalty: number; date: number; scramble: string }) =>
  `${s.raw}|${normPenalty(s.penalty)}|${Math.round(s.date / 1000)}|${s.scramble}`;
