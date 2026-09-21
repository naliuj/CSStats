import { useMemo } from 'react';
import { Chart } from './Chart';
import { Card } from './Card';
import { axis, base, timeTick } from '../chartStyle';
import { byHour, byWeek, dayKey, type Bucket } from '../lib/aggregate';
import { formatDate, formatMonth, formatTime } from '../lib/format';
import type { Stats } from '../lib/stats';
import type { Palette } from '../theme';

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;

export function TimeOfDay({ stats, p }: { stats: Stats; p: Palette }) {
  const { countOpt, meanOpt, bestHour } = useMemo(() => {
    const hours = byHour(stats.solves);
    const hLabels = hours.map((_, h) => hourLabel(h));
    const minN = Math.max(20, stats.count * 0.005);
    let bestHour = -1;
    hours.forEach((b, h) => {
      if (b.count >= minN && (bestHour < 0 || b.mean < hours[bestHour].mean)) bestHour = h;
    });
    const tip = (h: number) =>
      `${hourLabel(h)}m – ${hourLabel((h + 1) % 24)}m<br/><b>${hours[h].count.toLocaleString()}</b> solves · mean <b>${formatTime(hours[h].mean)}</b>`;
    const common = {
      ...base(p),
      tooltip: { ...base(p).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: p.grid, opacity: 0.6 } }, formatter: (it: { dataIndex: number }[]) => tip(it[0].dataIndex) },
      xAxis: axis(p, { type: 'category', data: hLabels, splitLine: { show: false }, axisLabel: { color: p.textMuted, interval: 2 } }),
    };
    return {
      bestHour,
      countOpt: {
        ...common,
        grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
        yAxis: axis(p, { type: 'value', minInterval: 1 }),
        series: [{ type: 'bar', data: hours.map((b) => b.count), barWidth: '70%', itemStyle: { color: p.series[0], borderRadius: [3, 3, 0, 0] } }],
      },
      meanOpt: {
        ...common,
        grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
        yAxis: axis(p, { type: 'value', scale: true, axisLabel: { color: p.textMuted, formatter: timeTick } }),
        series: [
          {
            type: 'line',
            // Hours with too few solves are left out: their means are noise.
            data: hours.map((b) => (b.count >= minN ? b.mean : null)),
            connectNulls: false,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 2, color: p.series[1] },
            itemStyle: { color: p.series[1], borderColor: p.surface, borderWidth: 2 },
          },
        ],
      },
    };
  }, [stats, p]);

  return (
    <Card
      title="Time of day"
      sub={bestHour >= 0 ? `You're fastest around ${hourLabel(bestHour)}m (local time).` : 'Solves and mean by local hour.'}
    >
      <h3 className="mini-title">Solves per hour</h3>
      <Chart option={countOpt} height={150} label="Number of solves by hour of day" />
      <h3 className="mini-title">Mean time per hour</h3>
      <Chart option={meanOpt} height={150} label="Mean solve time by hour of day" />
    </Card>
  );
}

export function WeeklyVolume({ stats, p }: { stats: Stats; p: Palette }) {
  const { countOpt, meanOpt, weeks } = useMemo(() => {
    const toMs = (k: string) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m - 1, d).getTime();
    };
    // Fill weeks without solves so gaps in practice show as gaps.
    const seen = byWeek(stats.solves);
    const keys = [...seen.keys()];
    const w: [string, Bucket][] = [];
    if (keys.length) {
      const end = toMs(keys[keys.length - 1]);
      for (let d = new Date(toMs(keys[0])); d.getTime() <= end; d.setDate(d.getDate() + 7)) {
        const k = dayKey(d.getTime());
        w.push([k, seen.get(k) ?? { count: 0, mean: NaN }]);
      }
    }
    const active = keys.length;
    const tip = (i: number) => `Week of ${formatDate(toMs(w[i][0]))}<br/><b>${w[i][1].count.toLocaleString()}</b> solves · mean <b>${formatTime(w[i][1].mean)}</b>`;
    const common = {
      ...base(p),
      tooltip: { ...base(p).tooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: p.grid, opacity: 0.6 } }, formatter: (it: { dataIndex: number }[]) => tip(it[0].dataIndex) },
      xAxis: axis(p, {
        type: 'category',
        data: w.map(([k]) => k),
        splitLine: { show: false },
        axisLabel: { color: p.textMuted, hideOverlap: true, formatter: (k: string) => formatMonth(toMs(k)) },
      }),
    };
    return {
      weeks: active,
      countOpt: {
        ...common,
        grid: { left: 8, right: 16, top: 12, bottom: 4, containLabel: true },
        yAxis: axis(p, { type: 'value', minInterval: 1 }),
        series: [{ type: 'bar', data: w.map(([, b]) => b.count), barMaxWidth: 14, itemStyle: { color: p.series[0], borderRadius: [2, 2, 0, 0] } }],
      },
      meanOpt: {
        ...common,
        grid: { left: 8, right: 16, top: 12, bottom: 4, containLabel: true },
        yAxis: axis(p, { type: 'value', scale: true, axisLabel: { color: p.textMuted, formatter: timeTick } }),
        series: [
          {
            type: 'line',
            data: w.map(([, b]) => (Number.isFinite(b.mean) ? b.mean : null)),
            showSymbol: w.length < 60,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { width: 2, color: p.series[1] },
            itemStyle: { color: p.series[1] },
          },
        ],
      },
    };
  }, [stats, p]);

  return (
    <Card title="Weekly volume" sub={`${weeks.toLocaleString()} weeks with at least one solve.`}>
      <h3 className="mini-title">Solves per week</h3>
      <Chart option={countOpt} height={150} label="Solves per week" />
      <h3 className="mini-title">Weekly mean</h3>
      <Chart option={meanOpt} height={150} label="Mean solve time per week" />
    </Card>
  );
}
