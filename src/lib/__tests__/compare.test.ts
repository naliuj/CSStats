import { describe, expect, it } from 'vitest';
import { binWidth, delta, sharedHistogram } from '../compare';
import { filterByRange, selectSolves, validIds } from '../select';
import type { Session, Solve } from '../types';
import { compose, identity, invert, mapIds } from '../remap';

const solve = (time: number, date: number): Solve => ({ time, raw: time, penalty: 0, scramble: '', comment: '', date });
const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

const sessions: Session[] = [
  { id: '1', name: 'A', scrType: '333', rank: 1, solves: [solve(10, day(2025, 1, 1)), solve(11, day(2025, 1, 3))] },
  { id: '2', name: 'B', scrType: '333', rank: 2, solves: [solve(20, day(2025, 1, 2))] },
];

describe('select', () => {
  it('keeps one session in its own order and interleaves several by date', () => {
    expect(selectSolves(sessions, new Set(['1'])).map((s) => s.time)).toEqual([10, 11]);
    expect(selectSolves(sessions, new Set(['1', '2'])).map((s) => s.time)).toEqual([10, 20, 11]);
  });
  it('filters by inclusive day bounds', () => {
    const all = selectSolves(sessions, new Set(['1', '2']));
    expect(filterByRange(all, { from: '2025-01-02', to: '' }).map((s) => s.time)).toEqual([20, 11]);
    expect(filterByRange(all, { from: '', to: '2025-01-02' }).map((s) => s.time)).toEqual([10, 20]);
    expect(filterByRange(all, { from: '', to: '' })).toBe(all);
  });
  it('drops stale ids and falls back to the first session', () => {
    expect([...validIds(sessions, ['2', '9'])]).toEqual(['2']);
    expect([...validIds(sessions, ['9'])]).toEqual(['1']);
    expect([...validIds([], ['9'])]).toEqual([]);
  });
});

describe('compare', () => {
  it('delta ignores DNFs and missing values', () => {
    expect(delta(10, 12)).toBe(2);
    expect(delta(10, Infinity)).toBeNaN();
    expect(delta(NaN, 5)).toBeNaN();
  });
  it('bin width steps with density', () => {
    expect(binWidth(10000, 40000)).toBe(1000);
    expect(binWidth(10000, 40000, 'fine')).toBe(500);
    expect(binWidth(10000, 40000, 'coarse')).toBe(2000);
  });
  it('shares bins and normalizes each side to percent', () => {
    const a = Array.from({ length: 200 }, (_, i) => 10000 + i * 50);
    const b = [...Array.from({ length: 100 }, (_, i) => 12000 + i * 40), Infinity];
    const h = sharedHistogram([a, b]);
    expect(h.percent).toHaveLength(2);
    expect(h.centers.length).toBe(h.percent[0].length);
    const sum = (x: number[]) => x.reduce((m, y) => m + y, 0);
    // The slowest 1% of the combined scale falls off the end; DNFs don't count towards the total.
    expect(sum(h.percent[0])).toBeGreaterThan(98);
    expect(sum(h.percent[1])).toBeCloseTo(100);
    expect(h.centers[0]).toBeLessThanOrEqual(10000 + h.width / 2);
  });
  it('handles sides with no finite times', () => {
    expect(sharedHistogram([[Infinity], []]).centers).toEqual([]);
  });
});

describe('remap', () => {
  it('inverts, composes and maps ids', () => {
    // Merge removed session 1: 2→1, 3→2.
    const fwd = new Map([['2', '1'], ['3', '2']]);
    const back = invert(fwd);
    expect(mapIds(['3', '1'], fwd)).toEqual(['2']);
    expect(mapIds(['2'], back)).toEqual(['3']);
    expect([...compose(fwd, back)]).toEqual([['2', '2'], ['3', '3']]);
    expect([...compose(identity(['1', '2']), back)]).toEqual([['1', '2'], ['2', '3']]);
  });
});
