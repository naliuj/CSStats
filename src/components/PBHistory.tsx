import { useMemo } from 'react';
import { Chart } from './Chart';
import { Card } from './Card';
import { axis, base, swatch, timeTick } from '../chartStyle';
import { formatDate, formatTime } from '../lib/format';
import { pbProgression } from '../lib/pbs';
import type { Stats } from '../lib/stats';
import type { Palette } from '../theme';

export function PBHistory({ stats, p }: { stats: Stats; p: Palette }) {
  const { option, total } = useMemo(() => {
    const tracks = [
      { name: 'single', series: stats.times as ArrayLike<number>, slot: 0 },
      { name: 'ao5', series: stats.rolling.ao5, slot: 1 },
      { name: 'ao12', series: stats.rolling.ao12, slot: 2 },
      { name: 'ao100', series: stats.rolling.ao100, slot: 3 },
    ];
    const lastDate = stats.dates[stats.dates.length - 1];
    let total = 0;
    const series = tracks
      .map((t) => {
        const pts = pbProgression(t.series, stats.dates);
        total += pts.length;
        const data = pts.map((pt) => ({ value: [pt.date, pt.value], index: pt.index }));
        // Extend the last PB to the end so the current standing is visible.
        if (pts.length) data.push({ value: [lastDate, pts[pts.length - 1].value], index: -1 });
        return {
          name: t.name,
          type: 'line',
          step: 'end',
          data,
          symbol: 'circle',
          symbolSize: (_: unknown, params: { data: { index: number } }) => (params.data.index < 0 ? 0 : 7),
          lineStyle: { width: 2, color: p.series[t.slot] },
          itemStyle: { color: p.series[t.slot], borderColor: p.surface, borderWidth: 2 },
        };
      })
      .filter((s) => s.data.length);

    return {
      total,
      option: {
        ...base(p),
        legend: { ...base(p).legend, type: 'scroll', right: 0 },
        grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
        tooltip: {
          ...base(p).tooltip,
          trigger: 'item',
          formatter: ({ seriesName, data, color }: { seriesName: string; color: string; data: { value: [number, number]; index: number } }) =>
            data.index < 0
              ? `${swatch(color)}Current ${seriesName} PB <b>${formatTime(data.value[1])}</b>`
              : `${swatch(color)}New ${seriesName} PB <b>${formatTime(data.value[1])}</b><br/><span style="color:${p.textSecondary}">${formatDate(data.value[0])} · solve #${(data.index + 1).toLocaleString()}</span>`,
        },
        xAxis: axis(p, { type: 'time', splitLine: { show: false } }),
        yAxis: axis(p, { type: 'value', scale: true, axisLabel: { color: p.textMuted, formatter: timeTick } }),
        series,
      },
    };
  }, [stats, p]);

  return (
    <Card title="Personal bests" sub={`${total.toLocaleString()} PBs set in this range. Each step is a new record.`}>
      <Chart option={option} height={300} label="Personal best progression over time" />
    </Card>
  );
}
