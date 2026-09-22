import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '../../lib/types';
import { computeStats, type Stats } from '../../lib/stats';
import { filterByRange, selectSolves, validIds } from '../../lib/select';
import type { Palette } from '../../theme';
import { ALL_TIME, type Range } from '../Toolbar';
import type { Remap } from '../../App';
import { mapIds } from '../../lib/remap';
import { SidePicker } from './SidePicker';
import { CompareTable } from './CompareTable';
import { CompareProgress } from './CompareProgress';
import { CompareDistribution } from './CompareDistribution';
import { ComparePBs } from './ComparePBs';

export interface CompareFile {
  id: string;
  name: string;
  sessions: Session[];
}

export const MAIN = 'main';
export const MAX_SIDES = 4;
const LETTERS = ['A', 'B', 'C', 'D'];

interface SideState {
  key: number;
  file: string;
  sessionIds: string[];
  range: Range;
}

/** A side resolved against the loaded files, ready to display. */
export interface Side {
  letter: string;
  color: string;
  /** Legend/column label, unique per side. */
  label: string;
  fileName: string;
  sessionNames: string;
  stats: Stats;
}

let nextKey = 1;
const side = (file: string, sessionIds: string[]): SideState => ({ key: nextKey++, file, sessionIds, range: ALL_TIME });

/** Pick a session in `sessions` that matches `like` by name, else the first one. */
function matching(sessions: Session[], like?: Session) {
  return (like && sessions.find((s) => s.name === like.name)) ?? sessions[0];
}

function initialSides(main: Session[], files: CompareFile[]): SideState[] {
  const a = side(MAIN, [main[0].id]);
  if (files.length) return [a, side(files[0].id, [matching(files[0].sessions, main[0]).id])];
  return main.length > 1 ? [a, side(MAIN, [main[1].id])] : [a];
}

export function CompareView({ mainName, mainSessions, remap, files, onAddFile, onRemoveFile, p }: {
  mainName: string;
  mainSessions: Session[];
  remap: Remap;
  files: CompareFile[];
  onAddFile: (f: File) => void;
  onRemoveFile: (id: string) => void;
  p: Palette;
}) {
  const [sides, setSides] = useState<SideState[]>(() => initialSides(mainSessions, files));

  // Keep main-file sides on the same sessions when an edit renumbers them.
  const [seen, setSeen] = useState(remap.n);
  if (seen !== remap.n) {
    setSeen(remap.n);
    setSides((cur) => cur.map((s) => (s.file === MAIN ? { ...s, sessionIds: mapIds(s.sessionIds, remap.ids) } : s)));
  }

  const sourceOf = (file: string) => (file === MAIN ? null : files.find((f) => f.id === file)) ?? null;
  const sessionsOf = (file: string) => sourceOf(file)?.sessions ?? mainSessions;

  // A new comparison file goes into side B (or a new side if there's only A). Sides on a removed
  // file move to the main file, onto the session with the same name if there is one.
  const prevFiles = useRef(files);
  useEffect(() => {
    const prev = prevFiles.current;
    prevFiles.current = files;
    const added = files.filter((f) => !prev.some((p) => p.id === f.id));
    const removed = prev.filter((p) => !files.some((f) => f.id === p.id));
    if (!added.length && !removed.length) return;
    setSides((cur) => {
      let next = cur.map((s) => {
        const gone = removed.find((r) => r.id === s.file);
        if (!gone) return s;
        const was = gone.sessions.find((x) => x.id === s.sessionIds[0]);
        return { ...s, file: MAIN, sessionIds: [matching(mainSessions, was).id], range: ALL_TIME };
      });
      const f = added[added.length - 1];
      if (f) {
        const aSession = sessionsOf(next[0].file).find((x) => x.id === next[0].sessionIds[0]);
        const b = side(f.id, [matching(f.sessions, aSession).id]);
        next = next.length > 1 ? [next[0], { ...b, key: next[1].key }, ...next.slice(2)] : [...next, b];
      }
      return next;
    });
    // sessionsOf and mainSessions are read at the time files change, which is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const resolved: Side[] = useMemo(
    () =>
      sides.map((s, i) => {
        const src = sourceOf(s.file);
        const sessions = src?.sessions ?? mainSessions;
        const ids = validIds(sessions, s.sessionIds);
        const stats = computeStats(filterByRange(selectSolves(sessions, ids), s.range));
        const sessionNames = sessions.filter((x) => ids.has(x.id)).map((x) => x.name).join(' + ');
        return {
          letter: LETTERS[i],
          color: p.series[i],
          label: `${LETTERS[i]} · ${sessionNames}`,
          fileName: src?.name ?? mainName,
          sessionNames,
          stats,
        };
      }),
    // sourceOf/sessionsOf are derived from files and mainSessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sides, files, mainSessions, mainName, p],
  );

  const update = (i: number, patch: Partial<SideState>) => setSides((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const addSide = () => {
    const last = sides[sides.length - 1];
    const list = sessionsOf(last.file);
    const used = new Set(sides.filter((s) => s.file === last.file).flatMap((s) => s.sessionIds));
    const next = list.find((s) => !used.has(s.id)) ?? list[0];
    setSides([...sides, side(last.file, [next.id])]);
  };

  const shown = resolved.filter((s) => s.stats.count > 0);

  return (
    <div className="compare">
      <div className="files-strip">
        <span className="toolbar-label">Files</span>
        <span className="file-pill">
          {mainName} <span className="muted">(main)</span>
        </span>
        {files.map((f) => (
          <span key={f.id} className="file-pill">
            {f.name}
            <button type="button" className="pill-x" onClick={() => onRemoveFile(f.id)} aria-label={`Remove ${f.name}`} title="Remove">
              ×
            </button>
          </span>
        ))}
        <label className="ghost">
          Load file to compare…
          <input
            type="file"
            accept=".txt,.json,application/json,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAddFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <button type="button" className="ghost add-side" onClick={addSide} disabled={sides.length >= MAX_SIDES} title={sides.length >= MAX_SIDES ? `Up to ${MAX_SIDES} sides` : undefined}>
          + Add side
        </button>
      </div>

      <div className="compare-sides">
        {sides.map((s, i) => (
          <SidePicker
            key={s.key}
            side={resolved[i]}
            files={[{ id: MAIN, name: mainName }, ...files.map((f) => ({ id: f.id, name: f.name }))]}
            file={sourceOf(s.file) ? s.file : MAIN}
            sessions={sessionsOf(s.file)}
            selected={validIds(sessionsOf(s.file), s.sessionIds)}
            range={s.range}
            onFile={(file) => {
              const aSession = sessionsOf(sides[0].file).find((x) => x.id === sides[0].sessionIds[0]);
              update(i, { file, sessionIds: [matching(sessionsOf(file), aSession).id], range: ALL_TIME });
            }}
            onSelect={(ids) => update(i, { sessionIds: [...ids], range: s.range.preset === 'all' || s.range.preset === 'custom' ? s.range : ALL_TIME })}
            onRange={(range) => update(i, { range })}
            onRemove={sides.length > 1 ? () => setSides((cur) => cur.filter((_, j) => j !== i)) : undefined}
          />
        ))}
      </div>

      {sides.length < 2 && <p className="muted compare-hint">Add a side, or load another file, to compare.</p>}

      <CompareTable sides={resolved} />
      {shown.length > 0 && (
        <div className="grid">
          <CompareProgress sides={shown} p={p} />
          <CompareDistribution sides={shown} p={p} />
          <ComparePBs sides={shown} p={p} />
        </div>
      )}
    </div>
  );
}
