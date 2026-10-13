/**
 * PTimer's file format (exports and backups share it; see PTimer/src/db/backup.ts). Rows are kept
 * as they are, so anything this app doesn't use (settings, practice solves, algorithms, fields
 * from newer versions) survives an edit and the file can go back into PTimer.
 *
 * Unlike csTimer, PTimer always shows a session's solves in date order, session ids are never
 * renumbered, and reconstructions link to solves by id.
 */
import type { Session, Solve } from './types';
import type { EditResult, ImportPlan, ImportResult, MergeOptions } from './edit';
import { ParseError } from './errors';
import { dupeKey, type PortableSession } from './portable';
import { eventFromCstimer, isPTimerEvent } from './events';

export interface PtSession {
  id: number;
  name: string;
  event: string;
  rank: number;
  createdAt: number;
  targets?: { ao5?: number; ao12?: number };
  [k: string]: unknown;
}

export interface PtSolve {
  id: number;
  sessionId: number;
  raw: number;
  penalty: 0 | 2000 | -1;
  scramble: string;
  comment: string;
  date: number;
  solution?: string;
  [k: string]: unknown;
}

export interface PtRecon {
  id: number;
  solveId: number | null;
  date: number;
  scramble: string;
  solution: string;
  [k: string]: unknown;
}

export interface PtDoc {
  app: 'PTimer';
  format: number;
  kind?: 'backup' | 'export';
  sessions: PtSession[];
  solves: PtSolve[];
  reconstructions?: PtRecon[];
  [k: string]: unknown;
}

export const isPTimerDoc = (v: unknown): v is PtDoc => typeof v === 'object' && v !== null && (v as { app?: unknown }).app === 'PTimer';

type Row = Record<string, unknown>;
const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown) => Number.isInteger(v) && (v as number) > 0;
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown) => typeof v === 'string';
const isPenalty = (v: unknown) => v === 0 || v === 2000 || v === -1;

/** The same checks PTimer makes before importing, so a file this app accepts is one PTimer accepts. */
function validate(doc: PtDoc): void {
  if (typeof doc.format === 'number' && doc.format > 1) throw new ParseError('That PTimer file is from a newer version of PTimer than this app understands.');
  if (doc.format !== 1) throw new ParseError('That PTimer file is damaged: its format is missing.');
  const check = (key: 'sessions' | 'solves', name: string, ok: (r: Row) => boolean) => {
    const rows: unknown = doc[key];
    if (!Array.isArray(rows)) throw new ParseError(`That PTimer file is damaged: ${key} is missing.`);
    const ids = new Set<number>();
    rows.forEach((r, i) => {
      if (!isObj(r) || !ok(r)) throw new ParseError(`That PTimer file is damaged: ${name} ${i + 1} is incomplete.`);
      if (ids.has(r.id as number)) throw new ParseError(`That PTimer file is damaged: two ${key} share id ${r.id}.`);
      ids.add(r.id as number);
    });
  };
  // Events aren't limited to the ones known here, so files from newer PTimers still open.
  check('sessions', 'session', (r) => isId(r.id) && isStr(r.name) && isStr(r.event) && isNum(r.rank));
  check('solves', 'solve', (r) => isId(r.id) && isId(r.sessionId) && isNum(r.raw) && isPenalty(r.penalty) && isStr(r.scramble) && isStr(r.comment) && isNum(r.date));
  const sessionIds = new Set(doc.sessions.map((s) => s.id));
  const orphan = doc.solves.findIndex((s) => !sessionIds.has(s.sessionId));
  if (orphan >= 0) throw new ParseError(`That PTimer file is damaged: solve ${orphan + 1} belongs to a session that isn't in it.`);
}

/** A session's solves in PTimer's order: by date, then by id. */
function solvesOf(doc: PtDoc, sessionId: number): PtSolve[] {
  return doc.solves.filter((s) => s.sessionId === sessionId).sort((a, b) => a.date - b.date || a.id - b.id);
}

/** Non-empty sessions in PTimer's order. */
export function parsePTimer(doc: PtDoc): Session[] {
  validate(doc);
  const sessions: Session[] = [];
  for (const s of [...doc.sessions].sort((a, b) => a.rank - b.rank)) {
    const solves = solvesOf(doc, s.id).map(
      (r): Solve => ({ raw: r.raw, penalty: r.penalty, time: r.penalty === -1 ? Infinity : r.raw + r.penalty, scramble: r.scramble, comment: r.comment, date: r.date }),
    );
    if (!solves.length) continue;
    sessions.push({ id: String(s.id), name: s.name || `Session ${s.id}`, scrType: s.event, rank: s.rank, solves });
  }
  if (!sessions.length) throw new ParseError('No solves found in that PTimer file.');
  return sessions;
}

/** A session as a format-neutral bundle, for importing into another file. */
export function ptimerPortable(doc: PtDoc, id: string): PortableSession | null {
  const s = doc.sessions.find((x) => String(x.id) === id);
  if (!s) return null;
  return {
    name: s.name,
    type: s.event,
    createdAt: s.createdAt,
    targets: s.targets,
    solves: solvesOf(doc, s.id).map((r) => ({
      raw: r.raw,
      penalty: r.penalty,
      scramble: r.scramble,
      comment: r.comment,
      date: r.date,
      ptId: r.id,
      ...(r.solution !== undefined ? { solution: r.solution } : {}),
    })),
  };
}

const maxId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0);
const reconKey = (r: PtRecon) => `${r.date}|${r.scramble}|${r.solution}`;

/**
 * Merge sessions into `targetId`. PTimer orders solves by date, so there's no append order.
 * Duplicates dropped from a source keep their reconstructions, relinked to the solve that stays.
 */
export function mergePTimer(input: PtDoc, { targetId, sourceIds, name, dedupe = false }: MergeOptions): EditResult {
  const doc = structuredClone(input);
  const target = Number(targetId);
  const sources = new Set(sourceIds.map(Number).filter((id) => id !== target));
  if (!sources.size) throw new Error('Pick at least one other session to merge.');

  const seen = new Map<string, number>();
  if (dedupe) for (const s of solvesOf(doc, target)) seen.set(dupeKey(s), s.id);
  const relink = new Map<number, number>();
  const moved = doc.solves.filter((s) => sources.has(s.sessionId)).sort((a, b) => a.date - b.date || a.id - b.id);
  const dropped = new Set<number>();
  for (const s of moved) {
    const kept = dedupe ? seen.get(dupeKey(s)) : undefined;
    if (kept !== undefined) {
      dropped.add(s.id);
      relink.set(s.id, kept);
      continue;
    }
    s.sessionId = target;
    if (dedupe) seen.set(dupeKey(s), s.id);
  }
  doc.solves = doc.solves.filter((s) => !dropped.has(s.id));
  for (const r of doc.reconstructions ?? []) if (r.solveId !== null && relink.has(r.solveId)) r.solveId = relink.get(r.solveId)!;

  doc.sessions = doc.sessions.filter((s) => !sources.has(s.id));
  const t = doc.sessions.find((s) => s.id === target);
  if (t && name?.trim()) t.name = name.trim();
  return { doc, ids: new Map(doc.sessions.map((s) => [String(s.id), String(s.id)])) };
}

/**
 * Add sessions from another file (either format). New sessions keep the source's event (csTimer
 * scramble types are mapped to PTimer events), targets and creation date; reconstructions of
 * imported PTimer solves come along too.
 */
export function importPTimer(
  input: PtDoc,
  sources: Map<string, PortableSession>,
  sourceRecons: PtRecon[],
  plan: ImportPlan[],
  { dedupe = true } = {},
): ImportResult {
  const doc = structuredClone(input);
  let nextSession = maxId(doc.sessions) + 1;
  let nextSolve = maxId(doc.solves) + 1;
  let rank = doc.sessions.reduce((m, s) => Math.max(m, s.rank), 0) + 1;
  const solveIds = new Map<number, number>(); // source PTimer solve id → id here
  let added = 0;
  let skipped = 0;

  for (const p of plan) {
    const src = sources.get(p.sourceId);
    if (!src) continue;
    let sessionId: number;
    const seen = new Map<string, number>();
    if (p.into === 'new') {
      sessionId = nextSession++;
      doc.sessions.push({
        id: sessionId,
        name: src.name || `Session ${p.sourceId}`,
        event: isPTimerEvent(src.type) ? src.type : eventFromCstimer(src.type),
        rank: rank++,
        createdAt: src.createdAt ?? src.solves[0]?.date ?? Date.now(),
        ...(src.targets ? { targets: src.targets } : {}),
      });
    } else {
      sessionId = Number(p.into);
      if (dedupe) for (const s of solvesOf(doc, sessionId)) seen.set(dupeKey(s), s.id);
    }
    for (const s of src.solves) {
      const already = dedupe && p.into !== 'new' ? seen.get(dupeKey(s)) : undefined;
      if (already !== undefined) {
        if (s.ptId !== undefined) solveIds.set(s.ptId, already);
        skipped++;
        continue;
      }
      const id = nextSolve++;
      doc.solves.push({
        id,
        sessionId,
        raw: s.raw,
        penalty: s.penalty,
        scramble: s.scramble,
        comment: s.comment,
        date: s.date,
        ...(s.solution !== undefined ? { solution: s.solution } : {}),
      });
      if (dedupe && p.into !== 'new') seen.set(dupeKey(s), id);
      if (s.ptId !== undefined) solveIds.set(s.ptId, id);
      added++;
    }
  }

  // Reconstructions of the solves that came across, unless this file already has them.
  if (sourceRecons.length) {
    doc.reconstructions ??= [];
    const have = new Set(doc.reconstructions.map(reconKey));
    let nextRecon = maxId(doc.reconstructions) + 1;
    for (const r of sourceRecons) {
      const to = r.solveId === null ? undefined : solveIds.get(r.solveId);
      if (to === undefined || have.has(reconKey(r))) continue;
      doc.reconstructions.push({ ...structuredClone(r), id: nextRecon++, solveId: to });
      have.add(reconKey(r));
    }
  }

  return { doc, ids: new Map(input.sessions.map((s) => [String(s.id), String(s.id)])), added, skipped };
}
