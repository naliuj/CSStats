import { useId } from 'react';
import type { Session } from '../lib/types';
import { dayKey } from '../lib/aggregate';

export type Preset = 'all' | '365' | '90' | '30' | '7' | 'custom';

export interface Range {
  preset: Preset;
  from: string; // YYYY-MM-DD, inclusive, '' = open
  to: string;
}

export const ALL_TIME: Range = { preset: 'all', from: '', to: '' };

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '365', label: '1 year' },
  { value: '90', label: '90 days' },
  { value: '30', label: '30 days' },
  { value: '7', label: '7 days' },
];

/** Resolve a preset against the latest solve in the selection, so stale exports still show data. */
export function presetRange(preset: Preset, latest: number): Range {
  if (preset === 'all' || preset === 'custom') return { preset, from: '', to: '' };
  const d = new Date(latest);
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - Number(preset) + 1);
  return { preset, from: dayKey(from.getTime()), to: '' };
}

/** Relative presets depend on the selection's latest solve, so reset them when the selection changes. */
export const rangeAfterSelect = (range: Range): Range => (range.preset !== 'all' && range.preset !== 'custom' ? ALL_TIME : range);

/** Session chips: click to view one, Ctrl/⌘/Shift-click to combine. */
export function SessionChips({ sessions, selected, onSelect, labelledBy }: {
  sessions: Session[];
  selected: ReadonlySet<string>;
  onSelect: (s: Set<string>) => void;
  labelledBy: string;
}) {
  const toggle = (id: string, additive: boolean) => {
    if (!additive) return onSelect(new Set([id]));
    const next = new Set(selected);
    if (next.has(id) && next.size > 1) next.delete(id);
    else next.add(id);
    onSelect(next);
  };

  return (
    <div className="chips" role="group" aria-labelledby={labelledBy}>
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`chip${selected.has(s.id) ? ' on' : ''}`}
          aria-pressed={selected.has(s.id)}
          onClick={(e) => toggle(s.id, e.metaKey || e.ctrlKey || e.shiftKey)}
          title="Click to view. Ctrl/⌘-click to combine sessions."
        >
          {s.name} <span className="chip-count">{s.solves.length.toLocaleString()}</span>
        </button>
      ))}
    </div>
  );
}

export function RangePicker({ range, onRange, latest, labelledBy }: {
  range: Range;
  onRange: (r: Range) => void;
  latest: number;
  labelledBy: string;
}) {
  return (
    <>
      <div className="chips" role="group" aria-labelledby={labelledBy}>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`chip${range.preset === p.value ? ' on' : ''}`}
            aria-pressed={range.preset === p.value}
            onClick={() => onRange(presetRange(p.value, latest))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="dates">
        <label>
          <span className="sr-only">From</span>
          <input type="date" value={range.from} onChange={(e) => onRange({ ...range, preset: 'custom', from: e.target.value })} />
        </label>
        <span className="muted">to</span>
        <label>
          <span className="sr-only">To</span>
          <input type="date" value={range.to} onChange={(e) => onRange({ ...range, preset: 'custom', to: e.target.value })} />
        </label>
      </div>
    </>
  );
}

export function Toolbar({ sessions, selected, onSelect, range, onRange, latest, onManage }: {
  sessions: Session[];
  selected: Set<string>;
  onSelect: (s: Set<string>) => void;
  range: Range;
  onRange: (r: Range) => void;
  latest: number;
  onManage: () => void;
}) {
  const id = useId();
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <span className="toolbar-label" id={`${id}-sess`}>Session</span>
        <SessionChips sessions={sessions} selected={selected} onSelect={onSelect} labelledBy={`${id}-sess`} />
        <button type="button" className="ghost manage" onClick={onManage}>
          Edit sessions…
        </button>
      </div>
      <div className="toolbar-row">
        <span className="toolbar-label" id={`${id}-range`}>Range</span>
        <RangePicker range={range} onRange={onRange} latest={latest} labelledBy={`${id}-range`} />
      </div>
    </div>
  );
}
