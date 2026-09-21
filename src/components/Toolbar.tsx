import type { Session } from '../lib/types';
import { dayKey } from '../lib/aggregate';

export type Preset = 'all' | '365' | '90' | '30' | '7' | 'custom';

export interface Range {
  preset: Preset;
  from: string; // YYYY-MM-DD, inclusive, '' = open
  to: string;
}

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

export function Toolbar({ sessions, selected, onSelect, range, onRange, latest }: {
  sessions: Session[];
  selected: Set<string>;
  onSelect: (s: Set<string>) => void;
  range: Range;
  onRange: (r: Range) => void;
  latest: number;
}) {
  const toggle = (id: string, additive: boolean) => {
    if (!additive) return onSelect(new Set([id]));
    const next = new Set(selected);
    if (next.has(id) && next.size > 1) next.delete(id);
    else next.add(id);
    onSelect(next);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <span className="toolbar-label" id="sess-label">Session</span>
        <div className="chips" role="group" aria-labelledby="sess-label">
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
      </div>
      <div className="toolbar-row">
        <span className="toolbar-label" id="range-label">Range</span>
        <div className="chips" role="group" aria-labelledby="range-label">
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
      </div>
    </div>
  );
}
