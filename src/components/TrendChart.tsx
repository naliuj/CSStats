import { useMemo, useState } from 'react';
import { Chart } from './Chart';
import { Card, Segmented } from './Card';
import { axis, base, swatch, timeAxisBounds, timeTick } from '../chartStyle';
import { formatDate, formatSingle, formatTime } from '../lib/format';
import { quantile, type AvgKey, type Stats } from '../lib/stats';
import type { Palette } from '../theme';

type XMode = 'index' | 'date';
const LINES: { key: AvgKey; slot: number }[] = [
  { key: 'ao12', slot: 0 },
  { key: 'ao100', slot: 1 },
  { key: 'ao1000', slot: 2 },
  { key: 'ao5', slot: 3 },
];

/** Short windows turn into noise over long histories, so default to the longer ones there. */
function defaultOn(key: AvgKey, count: number) {
  if (key === 'ao5') return false;
  if (key === 'ao12') return count <= 3000;
  return true;
}

export function TrendChart({ stats, p }: { stats: Stats; p: Palette }) {
  const [mode, setMode] = useState<XMode>('index');

  const option = useMemo(() => {
    const { times, dates, rolling, count } = stats;
    const x = (i: number) => (mode === 'index' ? i + 1 : dates[i]);
    const dots: [number, number][] = [];
    for (let i = 0; i < count; i++) if (Number.isFinite(times[i])) dots.push([x(i), times[i]]);

    const lines = LINES.filter((l) => count >= Number(l.key.slice(2))).map((l) => {
      const r = rolling[l.key];
      const data: [number, number][] = [];
      for (let i = 0; i < r.length; i++) if (Number.isFinite(r[i])) data.push([x(i), r[i]]);
      return {
        name: l.key,
        type: 'line',
        data,
        showSymbol: false,
        sampling: 'lttb',
        progressive: 0,
        lineStyle: { width: 2, color: p.series[l.slot] },
        itemStyle: { color: p.series[l.slot] },
        emphasis: { disabled: true },
        // Longer windows draw on top so the smooth trend stays readable over the noisy ones.
        z: 3 + Math.log10(Number(l.key.slice(2))),
      };
    });

    const lo = quantile(times, 0);
    const hi = quantile(times, 0.99);
    const selected = Object.fromEntries(LINES.map((l) => [l.key, defaultOn(l.key, count)]));

    return {
      ...base(p),
      legend: { ...base(p).legend, type: 'scroll', right: 0, selected, data: ['Solves', ...lines.map((l) => l.name)] },
      grid: { left: 8, right: 16, top: 36, bottom: 56, containLabel: true },
      tooltip: {
        ...base(p).tooltip,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: p.axis } },
        formatter: (items: { seriesName: string; value: [number, number]; color: string }[]) => {
          if (!items.length) return '';
          const xv = items[0].value[0];
          const head = mode === 'index' ? `Solve #${xv.toLocaleString()}` : formatDate(xv);
          const rows = items
            .map((it) => `${swatch(it.color)}${it.seriesName} <b style="float:right;margin-left:16px">${(it.seriesName === 'Solves' ? formatSingle : formatTime)(it.value[1])}</b>`)
            .join('<br/>');
          return `<div style="margin-bottom:4px;color:${p.textSecondary}">${head}</div>${rows}`;
        },
      },
      xAxis: axis(p, {
        type: mode === 'index' ? 'value' : 'time',
        min: mode === 'index' ? 1 : 'dataMin',
        max: mode === 'index' ? Math.max(count, 2) : 'dataMax',
        splitLine: { show: false },
      }),
      yAxis: axis(p, {
        type: 'value',
        ...timeAxisBounds(lo, hi),
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
          selectedDataBackground: { lineStyle: { color: p.series[0] }, areaStyle: { color: p.grid } },
          textStyle: { color: p.textMuted },
          labelFormatter: mode === 'index' ? (v: number) => `#${Math.round(v).toLocaleString()}` : (v: number) => formatDate(v),
        },
      ],
      series: [
        {
          name: 'Solves',
          type: 'scatter',
          data: dots,
          symbolSize: dots.length > 5000 ? 3 : dots.length > 500 ? 4 : 6,
          itemStyle: { color: p.dots, opacity: dots.length > 10000 ? 0.55 : 1 },
          large: dots.length > 2000,
          largeThreshold: 2000,
          emphasis: { disabled: true },
          z: 1,
        },
        ...lines,
      ],
    };
  }, [stats, mode, p]);

  return (
    <Card
      wide
      title="Progress"
      sub="Every solve, with rolling averages. Scroll or drag the slider to zoom; click legend items to toggle."
      controls={
        <Segmented
          label="X axis"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'index', label: 'Solve #' },
            { value: 'date', label: 'Date' },
          ]}
        />
      }
    >
      <Chart option={option} height={380} label="Solve times and rolling averages over time" />
    </Card>
  );
}
