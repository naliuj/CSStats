import { useMemo, useState } from 'react';
import { Chart } from './Chart';
import { Card, Segmented } from './Card';
import { axis, base, timeTick } from '../chartStyle';
import { formatTime } from '../lib/format';
import { quantile, type Stats } from '../lib/stats';
import { binWidth, type Density } from '../lib/compare';
import type { Palette } from '../theme';

export function Histogram({ stats, p }: { stats: Stats; p: Palette }) {
  const [density, setDensity] = useState<Density>('auto');

  const option = useMemo(() => {
    const lo = quantile(stats.times, 0);
    const hi = quantile(stats.times, 0.99);
    const w = binWidth(lo, hi, density);
    const start = Math.floor(lo / w) * w;
    const nBins = Math.max(1, Math.floor((hi - start) / w) + 1);
    const counts = new Array(nBins).fill(0);
    for (const t of stats.times) {
      if (!Number.isFinite(t)) continue;
      const b = Math.floor((t - start) / w);
      if (b < nBins) counts[b]++;
    }
    const data = counts.map((c, i) => [start + i * w + w / 2, c]);
    const total = stats.times.filter(Number.isFinite).length;

    return {
      ...base(p),
      grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
      tooltip: {
        ...base(p).tooltip,
        trigger: 'item',
        formatter: ({ value }: { value: [number, number] }) => {
          const a = value[0] - w / 2;
          return `${formatTime(a)} – ${formatTime(a + w)}<br/><b>${value[1].toLocaleString()}</b> solves (${((value[1] / total) * 100).toFixed(1)}%)`;
        },
      },
      xAxis: axis(p, {
        type: 'value',
        min: start,
        max: start + nBins * w,
        splitLine: { show: false },
        axisLabel: { color: p.textMuted, formatter: timeTick, hideOverlap: true, showMinLabel: false, showMaxLabel: false },
      }),
      yAxis: axis(p, { type: 'value', minInterval: 1 }),
      series: [
        {
          type: 'bar',
          data,
          barWidth: '88%',
          itemStyle: { color: p.series[0], borderRadius: [3, 3, 0, 0] },
          emphasis: { itemStyle: { color: p.dark ? '#5598e7' : '#256abf' } },
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { color: p.textSecondary, type: 'dashed', width: 1 },
            label: { color: p.textSecondary, formatter: `mean ${formatTime(stats.mean)}`, position: 'end' },
            data: Number.isFinite(stats.mean) ? [{ xAxis: stats.mean }] : [],
          },
        },
      ],
    };
  }, [stats, density, p]);

  return (
    <Card
      title="Distribution"
      sub="How often each time comes up. The slowest 1% are hidden to keep the scale readable."
      controls={
        <Segmented
          label="Bin size"
          value={density}
          onChange={setDensity}
          options={[
            { value: 'fine', label: 'Fine' },
            { value: 'auto', label: 'Auto' },
            { value: 'coarse', label: 'Coarse' },
          ]}
        />
      }
    >
      <Chart option={option} height={300} label="Histogram of solve times" />
    </Card>
  );
}
