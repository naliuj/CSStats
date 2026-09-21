import { describe, expect, it } from 'vitest';
import { parseExport, ParseError } from '../parse';
import { average, bestAndCurrent, mean, rollingAverage, trimCount } from '../averages';
import { pbProgression } from '../pbs';
import { formatTime } from '../format';
import { byHour, dayKey } from '../aggregate';

const sample = JSON.stringify({
  session1: [
    [[0, 12268], 'R U', '', 1701738288],
    [[2000, 11000], 'F', 'plus two', 1701738349],
    [[-1, 9000], 'L', '', 1701738375],
  ],
  session2: [],
  session3: [[[0, 50000], 'Rw', '', 1712804896, [[1, 2]]]],
  properties: {
    sessionData: JSON.stringify({
      1: { name: '3x3', opt: {}, rank: 2 },
      3: { name: '4x4', opt: { scrType: '444wca' }, rank: 1 },
    }),
  },
});

describe('parseExport', () => {
  it('parses sessions, penalties and metadata', () => {
    const s = parseExport(sample);
    expect(s.map((x) => x.name)).toEqual(['4x4', '3x3']);
    expect(s[0].scrType).toBe('444wca');
    const [a, b, c] = s[1].solves;
    expect(a).toMatchObject({ time: 12268, penalty: 0, date: 1701738288000 });
    expect(b).toMatchObject({ time: 13000, raw: 11000, penalty: 2000, comment: 'plus two' });
    expect(c.time).toBe(Infinity);
  });
  it('falls back to default names without sessionData', () => {
    const s = parseExport(JSON.stringify({ session4: [[[0, 1000], '', '', 1]] }));
    expect(s[0].name).toBe('Session 4');
  });
  it('rejects bad input', () => {
    expect(() => parseExport('nope')).toThrow(ParseError);
    expect(() => parseExport('{"properties":{}}')).toThrow(ParseError);
  });
});

describe('averages', () => {
  it('trim counts follow csTimer', () => {
    expect([3, 5, 12, 50, 100, 1000].map(trimCount)).toEqual([0, 1, 1, 3, 5, 50]);
  });
  it('ao5 drops best and worst', () => {
    expect(average([10, 20, 30, 40, 1000])).toBe(30);
    expect(average([10, 20, 30, 40, Infinity])).toBe(30);
    expect(average([10, 20, 30, Infinity, Infinity])).toBe(Infinity);
  });
  it('mo3 is DNF with any DNF', () => {
    expect(average([1, 2, Infinity], 0)).toBe(Infinity);
    expect(mean([1, 2, 3])).toBe(2);
  });
  it('rolling matches naive for random data with DNFs', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const times = Array.from({ length: 600 }, () => (rnd() < 0.05 ? Infinity : Math.round(8000 + rnd() * 8000)));
    for (const n of [3, 5, 12, 50, 100]) {
      const trim = n === 3 ? 0 : trimCount(n);
      const r = rollingAverage(times, n, trim);
      for (let i = 0; i < times.length; i++) {
        if (i < n - 1) expect(r[i]).toBeNaN();
        else expect(r[i]).toBeCloseTo(average(times.slice(i - n + 1, i + 1), trim), 6);
      }
    }
  });
  it('bestAndCurrent ignores NaN', () => {
    expect(bestAndCurrent([NaN, 5, 3, 4])).toEqual({ best: 3, bestIndex: 2, current: 4 });
  });
});

describe('pbProgression', () => {
  it('records new bests only', () => {
    expect(pbProgression([NaN, 5, 6, 4, Infinity, 4, 3], [0, 1, 2, 3, 4, 5, 6]).map((p) => p.value)).toEqual([5, 4, 3]);
  });
});

describe('format', () => {
  it('formats times', () => {
    expect(formatTime(9876)).toBe('9.88');
    expect(formatTime(62340)).toBe('1:02.34');
    expect(formatTime(59999)).toBe('1:00.00');
    expect(formatTime(3723450)).toBe('1:02:03.45');
    expect(formatTime(Infinity)).toBe('DNF');
    expect(formatTime(NaN)).toBe('–');
  });
});

describe('aggregate', () => {
  it('buckets by hour', () => {
    const d = new Date(2024, 0, 1, 13, 30).getTime();
    const h = byHour([{ time: 10, raw: 10, penalty: 0, scramble: '', comment: '', date: d }]);
    expect(h[13]).toEqual({ count: 1, mean: 10 });
    expect(dayKey(d)).toBe('2024-01-01');
  });
});
