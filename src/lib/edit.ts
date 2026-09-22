/**
 * Edits applied directly to the raw csTimer export document, so everything csTimer stores
 * (solution data, properties, empty sessions) survives and the result can be re-imported.
 *
 * csTimer keeps session ids contiguous (1..sessionN), with display order in sessionData[id].rank.
 * Operations that remove sessions renumber the rest and report the mapping in `ids`.
 */

export type CsDoc = Record<string, unknown>;
type RawSolve = unknown[];

interface MetaEntry {
  name?: string | number;
  rank?: number;
  opt?: Record<string, unknown>;
  stat?: unknown[];
  date?: unknown[];
  [k: string]: unknown;
}
type Meta = Record<string, MetaEntry>;

export interface EditResult {
  doc: CsDoc;
  /** Old session id → new id, for every session that still exists. */
  ids: Map<string, string>;
}

export type MergeMode = 'date' | 'append';

export interface MergeOptions {
  /** Session whose position and settings are kept. */
  targetId: string;
  /** Sessions folded into the target, in the order they're appended. They're removed afterwards. */
  sourceIds: string[];
  /** 'date' interleaves every solve by timestamp; 'append' puts source solves after the target's. */
  mode: MergeMode;
  name?: string;
  /** Skip solves identical to one already kept (same time, penalty, scramble and timestamp). */
  dedupe?: boolean;
}

export interface ImportPlan {
  /** Session id in the other file. */
  sourceId: string;
  /** 'new' adds it as its own session; otherwise the id of a session in this file to merge into. */
  into: 'new' | string;
  mode: MergeMode;
}

export interface ImportResult extends EditResult {
  added: number;
  skipped: number;
}

const clone = (doc: CsDoc): CsDoc => structuredClone(doc);

function props(doc: CsDoc): Record<string, unknown> {
  if (!doc.properties || typeof doc.properties !== 'object') doc.properties = {};
  return doc.properties as Record<string, unknown>;
}

function readMeta(doc: CsDoc): Meta {
  const raw = (doc.properties as Record<string, unknown> | undefined)?.sessionData;
  try {
    if (typeof raw === 'string') return JSON.parse(raw) ?? {};
    if (raw && typeof raw === 'object') return raw as Meta;
  } catch {
    // fall through
  }
  return {};
}

function writeMeta(doc: CsDoc, meta: Meta) {
  const p = props(doc);
  // csTimer stores sessionData as a JSON string; keep whatever shape the file had.
  p.sessionData = typeof p.sessionData === 'object' && p.sessionData !== null ? meta : JSON.stringify(meta);
}

function sessionIds(doc: CsDoc): string[] {
  return Object.keys(doc)
    .map((k) => /^session(\d+)$/.exec(k)?.[1])
    .filter((id): id is string => id != null)
    .sort((a, b) => Number(a) - Number(b));
}

function readSolves(doc: CsDoc, id: string): RawSolve[] {
  let v = doc[`session${id}`];
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = [];
    }
  }
  return Array.isArray(v) ? (v as RawSolve[]) : [];
}

const ts = (s: RawSolve) => (typeof s[3] === 'number' ? s[3] : 0);

/** Recompute the cached [count, dnfs, mean] and [first, last] csTimer keeps per session. */
function refreshStat(entry: MetaEntry, solves: RawSolve[]) {
  let dnf = 0;
  let sum = 0;
  for (const s of solves) {
    const [pen, raw] = (Array.isArray(s[0]) ? s[0] : []) as number[];
    if (pen === -1) dnf++;
    else sum += (raw ?? 0) + (pen > 0 ? pen : 0);
  }
  const ok = solves.length - dnf;
  entry.stat = [solves.length, dnf, ok ? Math.round(sum / ok) : -1];
  entry.date = [solves[0]?.[3], solves.at(-1)?.[3]];
}

/** Drop sessions and renumber the remainder to 1..N, preserving their relative order and rank. */
function removeAndCompact(doc: CsDoc, remove: Set<string>): EditResult {
  const meta = readMeta(doc);
  const keep = sessionIds(doc).filter((id) => !remove.has(id));
  const ids = new Map<string, string>();
  const solves = keep.map((id) => doc[`session${id}`]);
  const entries = keep.map((id) => meta[id] ?? { name: Number(id), opt: {} });

  for (const id of sessionIds(doc)) delete doc[`session${id}`];
  const nextMeta: Meta = {};
  keep.forEach((oldId, i) => {
    const id = String(i + 1);
    ids.set(oldId, id);
    doc[`session${id}`] = solves[i];
    nextMeta[id] = entries[i];
  });

  // Tidy ranks back to 1..N in their existing order.
  Object.values(nextMeta)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .forEach((e, i) => (e.rank = i + 1));
  writeMeta(doc, nextMeta);

  const p = props(doc);
  p.sessionN = keep.length;
  const current = p.session != null ? ids.get(String(p.session)) : undefined;
  if (p.session != null) p.session = current ? Number(current) : 1;
  return { doc, ids };
}

const solveKey = (s: RawSolve) => JSON.stringify([s[0], s[1], s[3]]);

/** Put `extra` into session `targetId`, returning how many solves were added and skipped as duplicates. */
function mergeInto(doc: CsDoc, targetId: string, extra: RawSolve[], mode: MergeMode, dedupe: boolean) {
  const base = readSolves(doc, targetId);
  const seen = new Set(dedupe ? base.map(solveKey) : []);
  const add: RawSolve[] = [];
  for (const s of extra) {
    if (dedupe) {
      const k = solveKey(s);
      if (seen.has(k)) continue;
      seen.add(k);
    }
    add.push(s);
  }
  let merged = base.concat(add);
  if (mode === 'date') merged = merged.map((s, i) => [s, i] as const).sort((a, b) => ts(a[0]) - ts(b[0]) || a[1] - b[1]).map(([s]) => s);
  doc[`session${targetId}`] = merged;
  return { added: add.length, skipped: extra.length - add.length };
}

function finishSession(doc: CsDoc, id: string, name?: string) {
  const meta = readMeta(doc);
  const entry = (meta[id] ??= { name: Number(id), opt: {} });
  if (name?.trim()) entry.name = name.trim();
  refreshStat(entry, readSolves(doc, id));
  writeMeta(doc, meta);
}

/** Count what a merge would add, without doing it. */
export function previewMerge(base: { raw: number; penalty: number; scramble: string; date: number }[], extra: typeof base) {
  const key = (s: (typeof base)[number]) => `${s.date}|${s.raw}|${s.penalty}|${s.scramble}`;
  const seen = new Set(base.map(key));
  let dupes = 0;
  for (const s of extra) {
    const k = key(s);
    if (seen.has(k)) dupes++;
    else seen.add(k);
  }
  return dupes;
}

/** Merge several sessions into one. */
export function mergeSessions(input: CsDoc, { targetId, sourceIds, mode, name, dedupe = false }: MergeOptions): EditResult {
  const doc = clone(input);
  const sources = sourceIds.filter((id) => id !== targetId);
  if (!sources.length) throw new Error('Pick at least one other session to merge.');

  mergeInto(doc, targetId, sources.flatMap((id) => readSolves(doc, id)), mode, dedupe);
  finishSession(doc, targetId, name);
  return removeAndCompact(doc, new Set(sources));
}

/** Bring sessions from another export into this one, as new sessions or merged into existing ones. */
export function importSessions(input: CsDoc, other: CsDoc, plan: ImportPlan[], { dedupe = true } = {}): ImportResult {
  const doc = clone(input);
  const otherMeta = readMeta(other);
  let nextId = Math.max(0, ...sessionIds(doc).map(Number)) + 1;
  let nextRank = Math.max(0, ...Object.values(readMeta(doc)).map((m) => m.rank ?? 0)) + 1;
  let added = 0;
  let skipped = 0;

  for (const { sourceId, into, mode } of plan) {
    const solves = structuredClone(readSolves(other, sourceId));
    let target = into;
    if (into === 'new') {
      target = String(nextId++);
      const src = otherMeta[sourceId] ?? {};
      const meta = readMeta(doc);
      meta[target] = { name: src.name ?? `Session ${sourceId}`, opt: structuredClone(src.opt ?? {}), rank: nextRank++ };
      writeMeta(doc, meta);
      doc[`session${target}`] = [];
    }
    const r = mergeInto(doc, target, solves, mode, dedupe && into !== 'new');
    added += r.added;
    skipped += r.skipped;
    finishSession(doc, target);
  }
  props(doc).sessionN = nextId - 1;
  const ids = new Map(sessionIds(input).map((id) => [id, id]));
  return { doc, ids, added, skipped };
}
