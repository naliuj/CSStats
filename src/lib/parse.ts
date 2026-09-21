import type { Penalty, Session, Solve } from './types';

interface SessionMeta {
  name?: string | number;
  rank?: number;
  opt?: { scrType?: string };
}

export class ParseError extends Error {}

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

/** Parse the text of a csTimer "export to file" into non-empty sessions, ordered as in csTimer. */
export function parseExport(text: string): Session[] {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ParseError('File is not valid JSON. Export it from csTimer via Export → "Export to file".');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ParseError('Unrecognized file format.');
  }

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
    throw new ParseError('No solves found. Is this a csTimer export file?');
  }
  sessions.sort((a, b) => a.rank - b.rank);
  return sessions;
}
