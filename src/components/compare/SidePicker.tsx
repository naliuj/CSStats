import { useId } from 'react';
import type { Session } from '../../lib/types';
import { formatDate } from '../../lib/format';
import { RangePicker, SessionChips, type Range } from '../Toolbar';
import type { Side } from './CompareView';

export function SidePicker({ side, files, file, sessions, selected, range, onFile, onSelect, onRange, onRemove }: {
  side: Side;
  files: { id: string; name: string }[];
  file: string;
  sessions: Session[];
  selected: Set<string>;
  range: Range;
  onFile: (id: string) => void;
  onSelect: (ids: Set<string>) => void;
  onRange: (r: Range) => void;
  onRemove?: () => void;
}) {
  const id = useId();
  const { stats } = side;
  // Presets count back from the latest solve in the selected sessions, not the filtered range.
  const latest = Math.max(0, ...sessions.filter((s) => selected.has(s.id)).map((s) => s.solves.reduce((m, x) => Math.max(m, x.date), 0)));

  return (
    <section className="side-card" style={{ borderTopColor: side.color }} aria-label={`Side ${side.letter}`}>
      <header className="side-head">
        <span className="side-letter" style={{ background: side.color }}>
          {side.letter}
        </span>
        <span className="side-summary muted">
          {stats.count ? `${stats.count.toLocaleString()} solves · ${formatDate(stats.dates[0])} – ${formatDate(stats.dates[stats.count - 1])}` : 'No solves in range'}
        </span>
        {onRemove && (
          <button type="button" className="pill-x" onClick={onRemove} aria-label={`Remove side ${side.letter}`} title="Remove side">
            ×
          </button>
        )}
      </header>
      {files.length > 1 && (
        <label className="side-file">
          <span className="sr-only">File</span>
          <select value={file} onChange={(e) => onFile(e.target.value)}>
            {files.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="sr-only" id={`${id}-s`}>Sessions for side {side.letter}</span>
      <SessionChips sessions={sessions} selected={selected} onSelect={onSelect} labelledBy={`${id}-s`} />
      <span className="sr-only" id={`${id}-r`}>Date range for side {side.letter}</span>
      <div className="side-range">
        <RangePicker range={range} onRange={onRange} latest={latest} labelledBy={`${id}-r`} />
      </div>
    </section>
  );
}
