import { describe, expect, it } from 'vitest';
import example from './fixtures/ptimer-export.ptimer.json';
import { formatOf, parseExport, parseFile, ParseError } from '../parse';
import { importSessions, mergeSessions, type CsDoc } from '../edit';
import { isPTimerEvent } from '../events';
import type { PtDoc } from '../ptimer';

const text = JSON.stringify(example);
const doc = (): PtDoc => structuredClone(example) as PtDoc;

/** What PTimer itself requires of a file before importing it, beyond what parsing checks. */
function expectPTimerValid(d: CsDoc) {
  const pt = d as PtDoc;
  expect(() => parseFile(JSON.stringify(d))).not.toThrow();
  for (const s of pt.sessions) {
    expect(isPTimerEvent(s.event)).toBe(true);
    expect(typeof s.createdAt).toBe('number');
  }
  const solveIds = new Set(pt.solves.map((s) => s.id));
  for (const r of pt.reconstructions ?? []) if (r.solveId !== null) expect(solveIds.has(r.solveId)).toBe(true);
}

describe('PTimer files', () => {
  it('parses sessions in rank order, with solves by date', () => {
    const { format, sessions } = parseFile(text);
    expect(format).toBe('ptimer');
    expect(sessions.map((s) => [s.id, s.name, s.scrType, s.solves.length])).toEqual([
      ['1', '3x3', '333', 5],
      ['4', '2-4 relay', 'r234', 1],
      ['7', 'FMC', '333fm', 2],
    ]);
    const [a, b, c, d] = sessions[0].solves;
    expect(a).toMatchObject({ raw: 11234, time: 11234, date: 1791810000123 });
    expect(b).toMatchObject({ raw: 10876, penalty: 2000, time: 12876, comment: 'inspection ran over' });
    expect(c.time).toBe(Infinity);
    expect(d).toMatchObject({ raw: 0, penalty: -1, time: Infinity });
  });

  it('tells formats apart', () => {
    expect(formatOf(example)).toBe('ptimer');
    expect(formatOf({ session1: [] })).toBe('cstimer');
  });

  it('rejects damaged or newer files with a reason', () => {
    const bad = (patch: (d: PtDoc) => void) => {
      const d = doc();
      patch(d);
      return () => parseExport(JSON.stringify(d));
    };
    expect(bad((d) => (d.format = 2))).toThrow(/newer version/);
    expect(bad((d) => (d.solves[0].sessionId = 99))).toThrow(/session that isn't in it/);
    expect(bad((d) => ((d.solves[1] as { penalty: number }).penalty = 5))).toThrow(ParseError);
    expect(bad((d) => (d.solves = d.solves.slice(0, 0)))).toThrow(/No solves/);
  });
});

describe('editing PTimer files', () => {
  it('merges by date, keeps ids, and relinks reconstructions of dropped duplicates', () => {
    const d = doc();
    // Session 4 gets a copy of solve 105 (which has a reconstruction) plus its own reconstruction of that copy.
    d.solves.push({ ...d.solves[4], id: 900, sessionId: 4 });
    d.reconstructions!.push({ ...d.reconstructions![0], id: 3, solveId: 900, solution: 'different' });
    const { doc: out, ids } = mergeSessions(d, { targetId: '1', sourceIds: ['4'], mode: 'append', name: '3x3 + relay', dedupe: true });
    const pt = out as PtDoc;
    expect(pt.sessions.map((s) => s.id)).toEqual([1, 7]);
    expect(pt.sessions[0].name).toBe('3x3 + relay');
    expect([...ids]).toEqual([['1', '1'], ['7', '7']]);
    expect(pt.solves.find((s) => s.id === 900)).toBeUndefined();
    expect(pt.solves.find((s) => s.id === 201)?.sessionId).toBe(1);
    expect(pt.reconstructions!.find((r) => r.id === 3)?.solveId).toBe(105);
    // Everything else in the file is untouched.
    expect(pt.trainingSolves).toEqual(example.trainingSolves);
    expect(pt.algs).toEqual(example.algs);
    expectPTimerValid(out);
    // PTimer orders by date regardless of the requested mode.
    const merged = parseExport(JSON.stringify(out))[0].solves.map((s) => s.date);
    expect(merged).toEqual([...merged].sort((a, b) => a - b));
  });

  it('imports csTimer sessions into a PTimer file, mapping events and skipping duplicates', () => {
    const cs: CsDoc = {
      // The first solve is solve 101 as csTimer stores it: whole seconds.
      session1: [[[0, 11234], example.solves[0].scramble, '', 1791810000], [[2000, 9000], 'R U', 'new one', 1791900000]],
      session2: [[[-1, 4000], 'R', '', 1791900100]],
      properties: { sessionData: JSON.stringify({ 1: { name: '3x3', opt: {} }, 2: { name: 'Two', opt: { scrType: '222so' } } }) },
    };
    const r = importSessions(doc(), cs, [
      { sourceId: '1', into: '1', mode: 'date' },
      { sourceId: '2', into: 'new', mode: 'date' },
    ]);
    expect(r).toMatchObject({ added: 2, skipped: 1 });
    const pt = r.doc as PtDoc;
    const two = pt.sessions.find((s) => s.name === 'Two')!;
    expect(two).toMatchObject({ id: 8, event: '222', rank: 4, createdAt: 1791900100000 });
    expect(pt.solves.filter((s) => s.sessionId === two.id)).toEqual([
      { id: 304, sessionId: 8, raw: 4000, penalty: -1, scramble: 'R', comment: '', date: 1791900100000 },
    ]);
    expectPTimerValid(r.doc);
  });

  it('imports PTimer sessions into a csTimer file', () => {
    const cs: CsDoc = { session1: [[[0, 1000], 'U', '', 1]], properties: { sessionN: 1, sessionData: JSON.stringify({ 1: { name: 'Main', opt: {}, rank: 1 } }) } };
    const r = importSessions(cs, doc(), [
      { sourceId: '1', into: 'new', mode: 'date' },
      { sourceId: '4', into: 'new', mode: 'date' },
    ]);
    const meta = JSON.parse((r.doc.properties as { sessionData: string }).sessionData);
    expect(meta[2]).toMatchObject({ name: '3x3', opt: {}, rank: 2, stat: [5, 2, 11327] });
    expect(meta[3]).toMatchObject({ name: '2-4 relay', opt: { scrType: 'r234w' } });
    expect((r.doc.session2 as unknown[][])[3]).toEqual([[-1, 0], example.solves[3].scramble, '', 1791810150]);
    expect(parseExport(JSON.stringify(r.doc)).map((s) => s.name)).toEqual(['Main', '3x3', '2-4 relay']);
  });

  it('brings reconstructions and Fewest Moves solutions along between PTimer files', () => {
    const empty: PtDoc = { app: 'PTimer', format: 1, kind: 'export', sessions: [{ id: 1, name: 'Other', event: '333', rank: 1, createdAt: 1 }], solves: [{ id: 1, sessionId: 1, raw: 1, penalty: 0, scramble: 'x', comment: '', date: 1 }], reconstructions: [] };
    const r = importSessions(empty, doc(), [
      { sourceId: '1', into: 'new', mode: 'date' },
      { sourceId: '7', into: 'new', mode: 'date' },
    ]);
    const pt = r.doc as PtDoc;
    expect(pt.solves.find((s) => s.raw === 31000)?.solution).toContain('// EO');
    // Solve 105's reconstruction comes across linked to its new id; the one with no solve doesn't.
    expect(pt.reconstructions).toHaveLength(1);
    const linked = pt.solves.find((s) => s.id === pt.reconstructions![0].solveId)!;
    expect(linked.raw).toBe(9872);
    expectPTimerValid(r.doc);
  });
});
