import { useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import { computeStats } from '../lib/stats';
import { formatDate } from '../lib/format';
import type { Palette } from '../theme';
import { Toolbar, type Range } from './Toolbar';
import { StatsSummary } from './StatsSummary';
import { TrendChart } from './TrendChart';
import { Histogram } from './Histogram';
import { PBHistory } from './PBHistory';
import { CalendarHeatmap } from './CalendarHeatmap';
import { TimeOfDay, WeeklyVolume } from './Habits';
import { RecentSolves } from './RecentSolves';

function parseDay(s: string, endOfDay: boolean): number {
  const [y, m, d] = s.split('-').map(Number);
  return endOfDay ? new Date(y, m - 1, d + 1).getTime() - 1 : new Date(y, m - 1, d).getTime();
}

export function Dashboard({ sessions, p }: { sessions: Session[]; p: Palette }) {
  const [selected, setSelected] = useState(() => new Set([sessions[0].id]));
  const [range, setRange] = useState<Range>({ preset: 'all', from: '', to: '' });

  const merged = useMemo(() => {
    const picked = sessions.filter((s) => selected.has(s.id));
    const all = picked.flatMap((s) => s.solves);
    if (picked.length > 1) all.sort((a, b) => a.date - b.date);
    return all;
  }, [sessions, selected]);

  const latest = merged.length ? merged[merged.length - 1].date : Date.now();

  const filtered = useMemo(() => {
    if (!range.from && !range.to) return merged;
    const lo = range.from ? parseDay(range.from, false) : -Infinity;
    const hi = range.to ? parseDay(range.to, true) : Infinity;
    return merged.filter((s) => s.date >= lo && s.date <= hi);
  }, [merged, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const names = sessions.filter((s) => selected.has(s.id)).map((s) => s.name).join(' + ');

  return (
    <div className="dashboard">
      <Toolbar
        sessions={sessions}
        selected={selected}
        onSelect={(s) => {
          setSelected(s);
          if (range.preset !== 'all' && range.preset !== 'custom') setRange({ preset: 'all', from: '', to: '' });
        }}
        range={range}
        onRange={setRange}
        latest={latest}
      />
      {stats.count === 0 ? (
        <div className="card empty">No solves in this date range.</div>
      ) : (
        <>
          <p className="range-note">
            <b>{names}</b> · {formatDate(stats.dates[0])} – {formatDate(stats.dates[stats.count - 1])}
          </p>
          <StatsSummary stats={stats} />
          <div className="grid">
            <TrendChart stats={stats} p={p} />
            <Histogram stats={stats} p={p} />
            <PBHistory stats={stats} p={p} />
            <CalendarHeatmap stats={stats} p={p} />
            <TimeOfDay stats={stats} p={p} />
            <WeeklyVolume stats={stats} p={p} />
            <RecentSolves stats={stats} />
          </div>
        </>
      )}
    </div>
  );
}
