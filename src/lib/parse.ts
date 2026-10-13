import type { Penalty, Session, Solve } from './types';
import { ParseError } from './errors';
import { isPTimerDoc, parsePTimer } from './ptimer';

interface SessionMeta {
  name?: string | number;
  rank?: number;
  opt?: { scrType?: string };
}

export { ParseError };

function toPenalty(p: unknown): Penalty {
  if (p === -1) return -1;
  if (typeof p === 'number' && p > 0) return 2000;
  return 0;
}

function parseSolve(entry: unknown): Solve | null {
  if (!Array.isArray(entry) || !Array.isArray(entry[0])) return null;
  const [pen, raw] = entry[0] as unknown[];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const penalty = toPenalty(pen);
  const ts = typeof entry[3] === 'number' ? entry[3] : 0;
  return {
    raw,
    penalty,
    time: penalty === -1 ? Infinity : raw + penalty,
    scramble: typeof entry[1] === 'string' ? entry[1] : '',
    comment: typeof entry[2] === 'string' ? entry[2] : '',
    date: ts * 1000,
  };
}

export type FileFormat = 'cstimer' | 'ptimer';

export const formatOf = (doc: unknown): FileFormat => (isPTimerDoc(doc) ? 'ptimer' : 'cstimer');

/** The file's format and its non-empty sessions, in the order the timer shows them. */
export function parseFile(text: string): { format: FileFormat; sessions: Session[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ParseError('File is not valid JSON. Use a csTimer export (Export → "Export to file") or a PTimer export or backup.');
  }
  if (isPTimerDoc(data)) return { format: 'ptimer', sessions: parsePTimer(data) };
  return { format: 'cstimer', sessions: parseCstimer(data) };
}

/** Sessions from a csTimer export or a PTimer export/backup. */
export const parseExport = (text: string): Session[] => parseFile(text).sessions;

function parseCstimer(raw: unknown): Session[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ParseError('Unrecognized file format.');
  }
  const data = raw as Record<string, unknown>;

  let meta: Record<string, SessionMeta> = {};
  const props = data.properties as Record<string, unknown> | undefined;
  const rawMeta = props?.sessionData;
  try {
    if (typeof rawMeta === 'string') meta = JSON.parse(rawMeta);
    else if (rawMeta && typeof rawMeta === 'object') meta = rawMeta as Record<string, SessionMeta>;
  } catch {
    meta = {};
  }

  const sessions: Session[] = [];
  for (const [key, value] of Object.entries(data)) {
    const m = /^session(\d+)$/.exec(key);
    if (!m || !Array.isArray(value)) continue;
    const id = m[1];
    const solves: Solve[] = [];
    for (const entry of value) {
      const s = parseSolve(entry);
      if (s) solves.push(s);
    }
    if (!solves.length) continue;
    const info = meta[id] ?? {};
    sessions.push({
      id,
      name: info.name != null && String(info.name) !== '' ? String(info.name) : `Session ${id}`,
      scrType: info.opt?.scrType ?? '333',
      rank: typeof info.rank === 'number' ? info.rank : Number(id),
      solves,
    });
  }

  if (!sessions.length) {
    throw new ParseError('No solves found. Is this a csTimer or PTimer export?');
  }
  sessions.sort((a, b) => a.rank - b.rank);
  return sessions;
}
