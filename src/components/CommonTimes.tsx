import { useMemo, useState } from 'react';
import { Chart } from './Chart';
import { Card, Segmented } from './Card';
import { axis, base } from '../chartStyle';
import { exactTimeStats, lastDigitCounts, type Precision } from '../lib/exactTimes';
import { formatDate, formatTime } from '../lib/format';
import type { Stats } from '../lib/stats';
import type { Palette } from '../theme';

const PAGE = 10;

export function CommonTimes({ stats }: { stats: Stats }) {
  const [precision, setPrecision] = useState<Precision>(10);
  const [shown, setShown] = useState(PAGE);
  const s = useMemo(() => exactTimeStats(stats.times, precision), [stats, precision]);
  const rows = s.ranked.slice(0, shown);
  const max = rows[0]?.count ?? 1;
  const decimals = precision === 10 ? 2 : 1;

  return (
    <Card
      title="Most common times"
      sub={`${s.distinct.toLocaleString()} different times across ${s.total.toLocaleString()} solves. ${s.singletons.toLocaleString()} came up only once.`}
      controls={
        <Segmented
          label="Precision"
          value={String(precision) as '10' | '100'}
          onChange={(v) => {
            setPrecision(Number(v) as Precision);
            setShown(PAGE);
          }}
          options={[
            { value: '10', label: '0.01s' },
            { value: '100', label: '0.1s' },
          ]}
        />
      }
    >
      <div className="scroll-x">
        <table className="common">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Time</th>
              <th scope="col" className="bar-col">
                <span className="sr-only">Share</span>
              </th>
              <th scope="col">Count</th>
              <th scope="col" className="last-col">Last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.time}>
                <td className="muted">{i + 1}</td>
                <td className="best">{formatTime(r.time, decimals)}</td>
                <td className="bar-col">
                  <div className="bar" style={{ width: `${(r.count / max) * 100}%` }} />
                </td>
                <td>×{r.count.toLocaleString()}</td>
                <td className="muted nowrap last-col">{formatDate(stats.solves[r.lastIndex].date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown < Math.min(s.ranked.length, 50) && (
        <button type="button" className="more" onClick={() => setShown(Math.min(shown + 20, 50))}>
          Show more
        </button>
      )}
    </Card>
  );
}

/** Pearson chi-square statistic against a uniform distribution. */
function chiSquare(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  const e = total / counts.length;
  return counts.reduce((sum, o) => sum + (o - e) ** 2 / e, 0);
}

// Chi-square critical value for 9 degrees of freedom at p = 0.01.
const CHI2_9_P01 = 21.67;

export function LastDigit({ stats, p }: { stats: Stats; p: Palette }) {
  const { option, verdict } = useMemo(() => {
    const counts = lastDigitCounts(stats.times);
    const total = counts.reduce((a, b) => a + b, 0);
    const expected = total / 10;
    const chi2 = chiSquare(counts);
    let verdict = 'Each digit should show up about 10% of the time.';
    if (total >= 200) {
      verdict =
        chi2 > CHI2_9_P01
          ? `Uneven: some digits come up more than chance explains (χ² = ${chi2.toFixed(0)}, p < 0.01). This usually comes from how often your timer or input device checks the time.`
          : `Even: no digit comes up more than chance would explain (χ² = ${chi2.toFixed(1)}).`;
    }
    return {
      verdict,
      option: {
        ...base(p),
        grid: { left: 8, right: 16, top: 24, bottom: 4, containLabel: true },
        tooltip: {
          ...base(p).tooltip,
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: p.grid, opacity: 0.6 } },
          formatter: (it: { dataIndex: number }[]) => {
            const d = it[0].dataIndex;
            return `Ends in <b>…${d}</b><br/>${counts[d].toLocaleString()} solves (${((counts[d] / total) * 100).toFixed(1)}%)`;
          },
        },
        xAxis: axis(p, { type: 'category', data: counts.map((_, d) => String(d)), splitLine: { show: false } }),
        yAxis: axis(p, { type: 'value', minInterval: 1 }),
        series: [
          {
            type: 'bar',
            data: counts,
            barWidth: '70%',
            itemStyle: { color: p.series[0], borderRadius: [3, 3, 0, 0] },
            markLine: {
              symbol: 'none',
              silent: true,
              lineStyle: { color: p.textSecondary, type: 'dashed', width: 1 },
              label: { color: p.textSecondary, formatter: 'expected', position: 'insideEndTop' },
              data: total ? [{ yAxis: expected }] : [],
            },
          },
        ],
      },
    };
  }, [stats, p]);

  return (
    <Card title="Last digit" sub={verdict}>
      <Chart option={option} height={300} label="How often each final hundredths digit appears" />
    </Card>
  );
}
