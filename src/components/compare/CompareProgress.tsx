import { useMemo, useState } from 'react';
import { Chart } from '../Chart';
import { Card, Segmented } from '../Card';
import { axis, base, swatch, timeAxisBounds, timeTick } from '../../chartStyle';
import { formatDate, formatTime } from '../../lib/format';
import { AVERAGES, type AvgKey } from '../../lib/stats';
import type { Palette } from '../../theme';
import type { Side } from './CompareView';

type XMode = 'index' | 'date';
const WINDOWS: AvgKey[] = ['ao5', 'ao12', 'ao50', 'ao100', 'ao1000'];
const size = (k: AvgKey) => AVERAGES.find((a) => a.key === k)!.n;

/** The longest window that still gives every side a real line (3+ windows' worth of solves). */
function defaultWindow(sides: Side[]): AvgKey {
  const least = Math.min(...sides.map((s) => s.stats.count));
  return [...WINDOWS].reverse().find((k) => least >= size(k) * 3) ?? 'ao5';
}

export function CompareProgress({ sides, p }: { sides: Side[]; p: Palette }) {
  const [mode, setMode] = useState<XMode>('index');
  const [picked, setPicked] = useState<AvgKey | null>(null);
  const available = WINDOWS.filter((k) => sides.some((s) => s.stats.count >= size(k)));
  const win = picked && available.includes(picked) ? picked : defaultWindow(sides);

  const option = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    const series = sides.map((s) => {
      const r = s.stats.rolling[win];
      const data: [number, number][] = [];
      for (let i = 0; i < r.length; i++) {
        if (!Number.isFinite(r[i])) continue;
        data.push([mode === 'index' ? i + 1 : s.stats.dates[i], r[i]]);
        lo = Math.min(lo, r[i]);
        hi = Math.max(hi, r[i]);
      }
      return {
        name: s.label,
        type: 'line',
        data,
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 2, color: s.color },
        itemStyle: { color: s.color },
        emphasis: { disabled: true },
      };
    });

    return {
      ...base(p),
      legend: { ...base(p).legend, type: 'scroll', right: 0 },
      grid: { left: 8, right: 16, top: 36, bottom: 56, containLabel: true },
      tooltip: {
        ...base(p).tooltip,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: p.axis } },
        formatter: (items: { seriesName: string; value: [number, number]; color: string }[]) => {
          if (!items.length) return '';
          const xv = items[0].value[0];
          const head = mode === 'index' ? `Solve #${xv.toLocaleString()}` : formatDate(xv);
          const rows = items.map((it) => `${swatch(it.color)}${it.seriesName} <b style="float:right;margin-left:16px">${formatTime(it.value[1])}</b>`).join('<br/>');
          return `<div style="margin-bottom:4px;color:${p.textSecondary}">${head} · ${win}</div>${rows}`;
        },
      },
      xAxis: axis(p, { type: mode === 'index' ? 'value' : 'time', min: mode === 'index' ? 1 : 'dataMin', max: 'dataMax', splitLine: { show: false } }),
      yAxis: axis(p, {
        type: 'value',
        ...(Number.isFinite(lo) ? timeAxisBounds(lo, hi) : {}),
        axisLabel: { color: p.textMuted, formatter: timeTick },
      }),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 22,
          bottom: 8,
          borderColor: p.grid,
          fillerColor: p.dark ? 'rgba(57,135,229,.18)' : 'rgba(42,120,214,.12)',
          handleStyle: { color: p.surface, borderColor: p.axis },
          moveHandleStyle: { color: p.axis },
          dataBackground: { lineStyle: { color: p.axis }, areaStyle: { color: p.grid } },
          selectedDataBackground: { lineStyle: { color: p.axis }, areaStyle: { color: p.grid } },
          textStyle: { color: p.textMuted },
          labelFormatter: mode === 'index' ? (v: number) => `#${Math.round(v).toLocaleString()}` : (v: number) => formatDate(v),
        },
      ],
      series,
    };
  }, [sides, mode, win, p]);

  return (
    <Card
      wide
      title="Progress"
      sub={mode === 'index' ? 'Rolling average by solve number, so sides line up from their first solve.' : 'Rolling average over calendar time.'}
      controls={
        <div className="card-controls-row">
          <Segmented label="Average" value={win} onChange={setPicked} options={available.map((k) => ({ value: k, label: k }))} />
          <Segmented label="X axis" value={mode} onChange={setMode} options={[{ value: 'index', label: 'Solve #' }, { value: 'date', label: 'Date' }]} />
        </div>
      }
    >
      <Chart option={option} height={360} label="Rolling averages of each side" />
    </Card>
  );
}
