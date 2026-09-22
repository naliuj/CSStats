import { useMemo, useState } from 'react';
import type { Session } from '../lib/types';
import { computeStats } from '../lib/stats';
import { formatDate } from '../lib/format';
import type { Palette } from '../theme';
import { ALL_TIME, rangeAfterSelect, Toolbar, type Range } from './Toolbar';
import { StatsSummary } from './StatsSummary';
import { TrendChart } from './TrendChart';
import { Histogram } from './Histogram';
import { PBHistory } from './PBHistory';
import { CalendarHeatmap } from './CalendarHeatmap';
import { TimeOfDay, WeeklyVolume } from './Habits';
import { RecentSolves } from './RecentSolves';
import { CommonTimes, LastDigit } from './CommonTimes';
import { SessionManager } from './SessionManager';
import type { ApplyEdit, Remap } from '../App';
import { mapIds } from '../lib/remap';
import { filterByRange, selectSolves, validIds } from '../lib/select';

export function Dashboard({ sessions, p, onEdit, remap }: { sessions: Session[]; p: Palette; onEdit: ApplyEdit; remap: Remap }) {
  const [picked, setSelected] = useState(() => new Set([sessions[0].id]));

  // Edits renumber sessions. Selection changes made in the same event use pre-edit ids, so
  // translate after them (render-time update, applied after anything already queued).
  const [seen, setSeen] = useState(remap.n);
  if (seen !== remap.n) {
    setSeen(remap.n);
    setSelected((cur) => new Set(mapIds(cur, remap.ids)));
  }
  const [range, setRange] = useState<Range>(ALL_TIME);
  const [managing, setManaging] = useState(false);

  // Edits can remove sessions (or empty them out of the list); fall back to the first one.
  const selected = useMemo(() => validIds(sessions, picked), [picked, sessions]);


  const merged = useMemo(() => selectSolves(sessions, selected), [sessions, selected]);

  const latest = merged.length ? merged[merged.length - 1].date : Date.now();

  const filtered = useMemo(() => filterByRange(merged, range), [merged, range]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const names = sessions.filter((s) => selected.has(s.id)).map((s) => s.name).join(' + ');

  return (
    <div className="dashboard">
      <Toolbar
        sessions={sessions}
        selected={selected}
        onSelect={(s) => {
          setSelected(s);
          setRange(rangeAfterSelect(range));
        }}
        range={range}
        onRange={setRange}
        latest={latest}
        onManage={() => setManaging(true)}
      />
      {managing && <SessionManager sessions={sessions} onEdit={onEdit} onSelect={setSelected} onClose={() => setManaging(false)} />}
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
            <CommonTimes stats={stats} />
            <LastDigit stats={stats} p={p} />
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
