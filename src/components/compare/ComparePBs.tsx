import { useMemo, useState } from 'react';
import { Chart } from '../Chart';
import { Card, Segmented } from '../Card';
import { axis, base, swatch, timeTick } from '../../chartStyle';
import { formatDate, formatSingle, formatTime } from '../../lib/format';
import { pbProgression } from '../../lib/pbs';
import type { Stats } from '../../lib/stats';
import type { Palette } from '../../theme';
import type { Side } from './CompareView';

type Track = 'single' | 'ao5' | 'ao12' | 'ao100';
const TRACKS: Track[] = ['single', 'ao5', 'ao12', 'ao100'];
const seriesOf = (s: Stats, t: Track): ArrayLike<number> => (t === 'single' ? s.times : s.rolling[t]);

export function ComparePBs({ sides, p }: { sides: Side[]; p: Palette }) {
  const [track, setTrack] = useState<Track>('ao5');

  const option = useMemo(() => {
    const fmt = track === 'single' ? formatSingle : formatTime;
    const series = sides.map((s) => {
      const pts = pbProgression(seriesOf(s.stats, track), s.stats.dates);
      const data = pts.map((pt) => ({ value: [pt.date, pt.value], index: pt.index }));
      // Extend the last PB to the side's last solve so its current standing is visible.
      if (pts.length) data.push({ value: [s.stats.dates[s.stats.count - 1], pts[pts.length - 1].value], index: -1 });
      return {
        name: s.label,
        type: 'line',
        step: 'end',
        data,
        symbol: 'circle',
        symbolSize: (_: unknown, params: { data: { index: number } }) => (params.data.index < 0 ? 0 : 6),
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color, borderColor: p.surface, borderWidth: 2 },
      };
    });
    return {
      ...base(p),
      legend: { ...base(p).legend, type: 'scroll', right: 0 },
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        ...base(p).tooltip,
        trigger: 'item',
        formatter: ({ seriesName, data, color }: { seriesName: string; color: string; data: { value: [number, number]; index: number } }) =>
          data.index < 0
            ? `${swatch(color)}${seriesName}<br/>Current ${track} PB <b>${fmt(data.value[1])}</b>`
            : `${swatch(color)}${seriesName}<br/>New ${track} PB <b>${fmt(data.value[1])}</b><br/><span style="color:${p.textSecondary}">${formatDate(data.value[0])} · solve #${(data.index + 1).toLocaleString()}</span>`,
      },
      xAxis: axis(p, { type: 'time', splitLine: { show: false } }),
      yAxis: axis(p, { type: 'value', scale: true, axisLabel: { color: p.textMuted, formatter: timeTick } }),
      series,
    };
  }, [sides, track, p]);

  return (
    <Card
      title="Personal bests"
      sub="How each side's record improved over time."
      controls={<Segmented label="PB type" value={track} onChange={setTrack} options={TRACKS.map((t) => ({ value: t, label: t }))} />}
    >
      <Chart option={option} height={300} label="Personal best progression of each side" />
    </Card>
  );
}
