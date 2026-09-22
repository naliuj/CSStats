import { useMemo, useState } from 'react';
import { Chart } from '../Chart';
import { Card, Segmented } from '../Card';
import { axis, base, swatch, timeTick } from '../../chartStyle';
import { formatTime } from '../../lib/format';
import { sharedHistogram, type Density } from '../../lib/compare';
import type { Palette } from '../../theme';
import type { Side } from './CompareView';

export function CompareDistribution({ sides, p }: { sides: Side[]; p: Palette }) {
  const [density, setDensity] = useState<Density>('auto');

  const option = useMemo(() => {
    const h = sharedHistogram(sides.map((s) => s.stats.times), density);
    return {
      ...base(p),
      legend: { ...base(p).legend, type: 'scroll', right: 0 },
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        ...base(p).tooltip,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: p.axis } },
        formatter: (items: { seriesName: string; value: [number, number]; color: string }[]) => {
          if (!items.length) return '';
          const a = items[0].value[0] - h.width / 2;
          const rows = items.map((it) => `${swatch(it.color)}${it.seriesName} <b style="float:right;margin-left:16px">${it.value[1].toFixed(1)}%</b>`).join('<br/>');
          return `<div style="margin-bottom:4px;color:${p.textSecondary}">${formatTime(a)} – ${formatTime(a + h.width)}</div>${rows}`;
        },
      },
      xAxis: axis(p, {
        type: 'value',
        min: h.start,
        max: h.start + h.centers.length * h.width,
        splitLine: { show: false },
        axisLabel: { color: p.textMuted, formatter: timeTick, hideOverlap: true, showMinLabel: false, showMaxLabel: false },
      }),
      yAxis: axis(p, { type: 'value', axisLabel: { color: p.textMuted, formatter: (v: number) => `${v}%` } }),
      series: sides.map((s, i) => ({
        name: s.label,
        type: 'line',
        data: h.centers.map((c, j) => [c, h.percent[i][j]]),
        showSymbol: false,
        smooth: 0.25,
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.08 },
        emphasis: { disabled: true },
      })),
    };
  }, [sides, density, p]);

  return (
    <Card
      title="Distribution"
      sub="Share of each side's solves in each time bin. The slowest 1% are off the scale."
      controls={
        <Segmented label="Bin size" value={density} onChange={setDensity} options={[{ value: 'fine', label: 'Fine' }, { value: 'auto', label: 'Auto' }, { value: 'coarse', label: 'Coarse' }]} />
      }
    >
      <Chart option={option} height={300} label="Overlaid distribution of solve times" />
    </Card>
  );
}
