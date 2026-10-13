import { describe, expect, it } from 'vitest';
import example from './fixtures/ptimer-export.ptimer.json';
import { looksLikeMoves, MOVE_UNITS, TIME_UNITS, unitOf } from '../units';
import { parseExport } from '../parse';
import { computeStats } from '../stats';
import type { Solve } from '../types';

describe('Fewest Moves units', () => {
  it('shows singles as moves and averages to two decimals, never as minutes', () => {
    expect(MOVE_UNITS.single(28000)).toBe('28');
    expect(MOVE_UNITS.avg(29333.33)).toBe('29.33');
    expect(MOVE_UNITS.avg(65000)).toBe('65.00');
    expect(TIME_UNITS.avg(65000)).toBe('1:05.00');
    expect(MOVE_UNITS.avg(Infinity)).toBe('DNF');
    expect(MOVE_UNITS.avg(NaN)).toBe('–');
    expect(MOVE_UNITS.solve({ raw: 31000, penalty: -1, time: Infinity })).toBe('DNF');
    expect(MOVE_UNITS.tick(30000)).toBe('30');
  });

  it('marks PTimer Fewest Moves sessions, and csTimer ones that hold move counts', () => {
    expect(parseExport(JSON.stringify(example)).map((s) => s.unit ?? 'time')).toEqual(['time', 'time', 'moves']);
    expect(looksLikeMoves('333fm', [31000, 0, 28000])).toBe(true);
    expect(looksLikeMoves('333fm', [2712345])).toBe(false); // a timed attempt
    expect(looksLikeMoves('333fm', [95000])).toBe(false); // more moves than anyone submits
    expect(looksLikeMoves('333', [31000])).toBe(false);
    expect(looksLikeMoves('333fm', [0])).toBe(false); // nothing to go on
  });

  it('uses moves only when every session shown is Fewest Moves', () => {
    expect(unitOf([{ unit: 'moves' }, { unit: 'moves' }])).toBe('moves');
    expect(unitOf([{ unit: 'moves' }, {}])).toBe('time');
    expect(unitOf([])).toBe('time');
  });
});

describe('sessions with no finished solves', () => {
  it('computes stats for a lone DNF without failing', () => {
    const dnf: Solve = { raw: 0, penalty: -1, time: Infinity, scramble: '', comment: '', date: 1 };
    const s = computeStats([dnf]);
    expect(s).toMatchObject({ count: 1, dnf: 1 });
    expect(s.mean).toBeNaN();
    expect(s.single.best).toBe(Infinity);
  });
});
