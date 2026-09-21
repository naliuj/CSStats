import { useMemo, useState } from 'react';
import { Chart } from './Chart';
import { Card, Segmented } from './Card';
import { base } from '../chartStyle';
import { byDay } from '../lib/aggregate';
import { formatDate, formatTime } from '../lib/format';
import type { Stats } from '../lib/stats';
import type { Palette } from '../theme';

export function CalendarHeatmap({ stats, p }: { stats: Stats; p: Palette }) {
  const days = useMemo(() => byDay(stats.solves), [stats]);
  const years = useMemo(() => [...new Set([...days.keys()].map((k) => k.slice(0, 4)))].sort().reverse(), [days]);
  const [picked, setPicked] = useState<string | null>(null);
  const year = picked && years.includes(picked) ? picked : years[0];

  const option = useMemo(() => {
    const data: [string, number, number][] = [];
    let yearTotal = 0;
    for (const [k, b] of days) {
      if (!k.startsWith(year)) continue;
      data.push([k, b.count, b.mean]);
      yearTotal += b.count;
    }
    // Cap the scale at the 90th percentile so a few marathon days don't wash out the rest.
    const sorted = data.map((d) => d[1]).sort((a, b) => a - b);
    const max = Math.max(2, sorted[Math.floor(sorted.length * 0.9)] ?? 1);
    return {
      yearTotal,
      activeDays: data.length,
      option: {
        ...base(p),
        tooltip: {
          ...base(p).tooltip,
          trigger: 'item',
          formatter: ({ value }: { value: [string, number, number] }) => {
            const [y, m, d] = value[0].split('-').map(Number);
            return `${formatDate(new Date(y, m - 1, d).getTime())}<br/><b>${value[1].toLocaleString()}</b> solves · mean ${formatTime(value[2])}`;
          },
        },
        visualMap: {
          show: false,
          min: 1,
          max,
          inRange: { color: p.seq },
        },
        calendar: {
          range: year,
          top: 24,
          left: 36,
          right: 8,
          bottom: 4,
          cellSize: ['auto', 15],
          splitLine: { show: false },
          itemStyle: { color: p.dark ? '#242423' : '#efeeea', borderColor: p.surface, borderWidth: 3 },
          dayLabel: { firstDay: 1, nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''], color: p.textMuted, fontSize: 11 },
          monthLabel: { color: p.textMuted, fontSize: 11 },
          yearLabel: { show: false },
        },
        series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }],
      },
    };
  }, [days, year, p]);

  return (
    <Card
      wide
      title="Practice calendar"
      sub={`${option.yearTotal.toLocaleString()} solves on ${option.activeDays} days in ${year}. Stronger color means more solves.`}
      controls={
        years.length > 1 && (
          <Segmented label="Year" value={year} onChange={setPicked} options={years.map((y) => ({ value: y, label: y }))} />
        )
      }
    >
      <div className="scroll-x">
        <div style={{ minWidth: 720 }}>
          <Chart option={option.option} height={150} label={`Solves per day in ${year}`} />
        </div>
      </div>
    </Card>
  );
}
