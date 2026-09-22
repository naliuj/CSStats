import { describe, expect, it } from 'vitest';
import { importSessions, mergeSessions, type CsDoc } from '../edit';
import { parseExport } from '../parse';

const solve = (ms: number, t: number, pen = 0) => [[pen, ms], `scr${ms}`, '', t];

function doc(): CsDoc {
  return {
    session1: [solve(10000, 100), solve(11000, 300)],
    session2: [],
    session3: [solve(20000, 200), solve(21000, 400, -1)],
    session4: [solve(30000, 50, 2000)],
    properties: {
      session: 4,
      sessionN: 4,
      sessionData: JSON.stringify({
        1: { name: 'A', opt: {}, rank: 1 },
        2: { name: 'Empty', opt: {}, rank: 2 },
        3: { name: 'B', opt: { scrType: '333' }, rank: 3 },
        4: { name: 'C', opt: {}, rank: 4 },
      }),
      color: 'keep-me',
    },
  };
}

const times = (d: CsDoc, id: string) => (d[`session${id}`] as number[][][]).map((s) => s[0][1]);
const meta = (d: CsDoc) => JSON.parse((d.properties as { sessionData: string }).sessionData);

describe('mergeSessions', () => {
  it('interleaves by date', () => {
    const { doc: d } = mergeSessions(doc(), { targetId: '1', sourceIds: ['3', '4'], mode: 'date' });
    expect(times(d, '1')).toEqual([30000, 10000, 20000, 11000, 21000]);
  });

  it('appends in the given order', () => {
    const { doc: d } = mergeSessions(doc(), { targetId: '1', sourceIds: ['4', '3'], mode: 'append' });
    expect(times(d, '1')).toEqual([10000, 11000, 30000, 20000, 21000]);
  });

  it('removes sources, compacts ids and keeps other data', () => {
    const { doc: d, ids } = mergeSessions(doc(), { targetId: '3', sourceIds: ['1'], mode: 'date', name: ' Merged ' });
    expect(Object.keys(d).filter((k) => k.startsWith('session')).sort()).toEqual(['session1', 'session2', 'session3']);
    expect([...ids]).toEqual([['2', '1'], ['3', '2'], ['4', '3']]);
    const m = meta(d);
    expect(m[2]).toMatchObject({ name: 'Merged', rank: 2, stat: [4, 1, 13667], date: [100, 400] });
    expect(m[1].name).toBe('Empty');
    expect(Object.keys(m)).toEqual(['1', '2', '3']);
    const p = d.properties as Record<string, unknown>;
    expect(p).toMatchObject({ sessionN: 3, session: 3, color: 'keep-me' });
  });

  it('does not mutate its input and round-trips through the parser', () => {
    const input = doc();
    const before = JSON.stringify(input);
    const { doc: d } = mergeSessions(input, { targetId: '1', sourceIds: ['3'], mode: 'date' });
    expect(JSON.stringify(input)).toBe(before);
    const sessions = parseExport(JSON.stringify(d));
    expect(sessions.map((s) => [s.name, s.solves.length])).toEqual([['A', 4], ['C', 1]]);
  });

  it('rejects merging a session into itself', () => {
    expect(() => mergeSessions(doc(), { targetId: '1', sourceIds: ['1'], mode: 'date' })).toThrow();
  });
});

describe('importSessions', () => {
  const other = (): CsDoc => ({
    session1: [solve(10000, 100), solve(12000, 250)], // first is a duplicate of A's
    session2: [solve(40000, 500)],
    properties: { sessionData: JSON.stringify({ 1: { name: 'A old' }, 2: { name: 'OH', opt: { scrType: '333oh' } } }) },
  });

  it('merges into existing sessions, skipping duplicates, and adds new ones', () => {
    const r = importSessions(doc(), other(), [
      { sourceId: '1', into: '1', mode: 'date' },
      { sourceId: '2', into: 'new', mode: 'date' },
    ]);
    expect(times(r.doc, '1')).toEqual([10000, 12000, 11000]);
    expect(times(r.doc, '5')).toEqual([40000]);
    expect(meta(r.doc)[5]).toMatchObject({ name: 'OH', opt: { scrType: '333oh' }, rank: 5, stat: [1, 0, 40000] });
    expect(r).toMatchObject({ added: 2, skipped: 1 });
    expect((r.doc.properties as Record<string, unknown>).sessionN).toBe(5);
    expect(parseExport(JSON.stringify(r.doc)).map((s) => s.name)).toEqual(['A', 'B', 'C', 'OH']);
  });

  it('keeps duplicates when asked, and appends in append mode', () => {
    const r = importSessions(doc(), other(), [{ sourceId: '1', into: '1', mode: 'append' }], { dedupe: false });
    expect(times(r.doc, '1')).toEqual([10000, 11000, 10000, 12000]);
  });
});
