import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session, Solve } from '../lib/types';
import { importSessions, mergeSessions, previewMerge, type CsDoc, type ImportPlan, type MergeMode } from '../lib/edit';
import { parseExport, ParseError } from '../lib/parse';
import { formatDate } from '../lib/format';
import type { ApplyEdit } from '../App';
import { Segmented } from './Card';

const EVENTS: Record<string, string> = {
  '333': '3x3', '222so': '2x2', '444wca': '4x4', '555wca': '5x5', '666wca': '6x6', '777wca': '7x7',
  '333oh': 'OH', '333ni': '3BLD', '333fm': 'FMC', pyrso: 'Pyraminx', skbso: 'Skewb', sqrs: 'Square-1',
  clkwca: 'Clock', mgmp: 'Megaminx', '444bld': '4BLD', '555bld': '5BLD', input: 'Typed', nocache_333: '3x3',
};
const eventName = (t: string) => EVENTS[t] ?? t;

const MODES: { value: MergeMode; label: string }[] = [
  { value: 'date', label: 'By date' },
  { value: 'append', label: 'Append to end' },
];
const MODE_HELP: Record<MergeMode, string> = {
  date: 'Every solve is placed in order of when it was done, as if they had all been timed in one session.',
  append: 'The kept session’s solves stay first, then each other session’s solves follow in the order below. Dates are left as they are.',
};

// Solves aren't guaranteed to be in date order (e.g. after an append), so scan for the extremes.
const firstDate = (s: Session) => s.solves.reduce((m, x) => Math.min(m, x.date), Infinity);
const lastDate = (s: Session) => s.solves.reduce((m, x) => Math.max(m, x.date), -Infinity);

function span(s: Session) {
  if (!s.solves.length) return '–';
  const a = formatDate(firstDate(s));
  const b = formatDate(lastDate(s));
  return a === b ? a : `${a} – ${b}`;
}

type View = { kind: 'list' } | { kind: 'merge'; ids: string[] } | { kind: 'import'; name: string; doc: CsDoc; sessions: Session[] };

export function SessionManager({ sessions, onEdit, onSelect, onClose }: {
  sessions: Session[];
  onEdit: ApplyEdit;
  onSelect: (ids: Set<string>) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);

  // No close() on cleanup: it fires the close event (→ onClose) during StrictMode's remount, and
  // unmounting removes the dialog anyway.
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Drop checks for sessions that no longer exist after an edit.
  const live = useMemo(() => new Set([...checked].filter((id) => sessions.some((s) => s.id === id))), [checked, sessions]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function pickFile(file: File) {
    try {
      const text = await file.text();
      const parsed = parseExport(text);
      setNote(null);
      setView({ kind: 'import', name: file.name, doc: JSON.parse(text), sessions: parsed });
    } catch (e) {
      setNote({ text: e instanceof ParseError ? e.message : 'Could not read that file.', error: true });
    }
  }

  const title = view.kind === 'merge' ? 'Merge sessions' : view.kind === 'import' ? 'Import from another file' : 'Edit sessions';

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} aria-labelledby="sm-title">
      <header className="modal-head">
        <h2 id="sm-title">{title}</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close">
          Close
        </button>
      </header>

      {note && (
        <p className={note.error ? 'error' : 'success'} role="status">
          {note.text}
        </p>
      )}

      {view.kind === 'list' && (
        <>
          <p className="muted modal-intro">
            Select sessions to act on them in bulk. Edits are kept in this browser; use <b>Download for csTimer</b> in the top
            bar to take them back to csTimer.
          </p>
          <div className="scroll-x">
            <table className="sm-table">
              <thead>
                <tr>
                  <th scope="col">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={live.size === sessions.length}
                      ref={(el) => {
                        if (el) el.indeterminate = live.size > 0 && live.size < sessions.length;
                      }}
                      onChange={() => setChecked(live.size === sessions.length ? new Set() : new Set(sessions.map((s) => s.id)))}
                    />
                  </th>
                  <th scope="col">Session</th>
                  <th scope="col">Event</th>
                  <th scope="col" className="num">Solves</th>
                  <th scope="col">Dates</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className={live.has(s.id) ? 'on' : ''} onClick={() => toggle(s.id)}>
                    <td>
                      <input type="checkbox" checked={live.has(s.id)} onChange={() => toggle(s.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${s.name}`} />
                    </td>
                    <td>{s.name}</td>
                    <td className="muted">{eventName(s.scrType)}</td>
                    <td className="num">{s.solves.length.toLocaleString()}</td>
                    <td className="muted nowrap">{span(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="modal-actions">
            <label className="ghost">
              Import from another file…
              <input
                type="file"
                accept=".txt,.json,application/json,text/plain"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="spacer" />
            <button
              type="button"
              className="primary"
              disabled={live.size < 2}
              title={live.size < 2 ? 'Select two or more sessions' : undefined}
              onClick={() => {
                setNote(null);
                setView({ kind: 'merge', ids: sessions.filter((s) => live.has(s.id)).map((s) => s.id) });
              }}
            >
              Merge {live.size >= 2 ? live.size : ''} sessions
            </button>
          </footer>
        </>
      )}

      {view.kind === 'merge' && (
        <MergeForm
          picked={view.ids.map((id) => sessions.find((s) => s.id === id)!).filter(Boolean)}
          onBack={() => setView({ kind: 'list' })}
          onMerge={(opts, label) => {
            const ids = onEdit((doc) => mergeSessions(doc, opts));
            const target = ids.get(opts.targetId);
            if (target) onSelect(new Set([target]));
            setChecked(new Set());
            setNote({ text: label });
            setView({ kind: 'list' });
          }}
        />
      )}

      {view.kind === 'import' && (
        <ImportForm
          name={view.name}
          theirs={view.sessions}
          ours={sessions}
          onBack={() => setView({ kind: 'list' })}
          onImport={(plan, dedupe) => {
            let result = { added: 0, skipped: 0 };
            onEdit((doc) => {
              const r = importSessions(doc, view.doc, plan, { dedupe });
              result = r;
              return r;
            });
            const into = plan.filter((p) => p.into !== 'new').length;
            const fresh = plan.length - into;
            const parts = [`Imported ${result.added.toLocaleString()} solves`];
            if (fresh) parts.push(`${fresh} new session${fresh > 1 ? 's' : ''}`);
            if (result.skipped) parts.push(`${result.skipped.toLocaleString()} duplicates skipped`);
            setNote({ text: parts.join(' · ') + '.' });
            setView({ kind: 'list' });
          }}
        />
      )}
    </dialog>
  );
}

function MergeForm({ picked, onBack, onMerge }: {
  picked: Session[];
  onBack: () => void;
  onMerge: (opts: Parameters<typeof mergeSessions>[1], label: string) => void;
}) {
  const [targetId, setTargetId] = useState(picked[0].id);
  const [order, setOrder] = useState(() => picked.map((s) => s.id));
  const [mode, setMode] = useState<MergeMode>('date');
  const [dedupe, setDedupe] = useState(true);
  const target = picked.find((s) => s.id === targetId)!;
  const [name, setName] = useState(target.name);
  const [nameTouched, setNameTouched] = useState(false);

  const sources = order.filter((id) => id !== targetId).map((id) => picked.find((s) => s.id === id)!);
  const extra = sources.flatMap((s) => s.solves);
  const dupes = dedupe ? previewMerge(target.solves, extra) : 0;
  const total = target.solves.length + extra.length - dupes;
  const events = new Set(picked.map((s) => s.scrType));
  // Appending keeps each session's order, so it's only chronological if every session ends before the next begins.
  const chain = [target, ...sources];
  const outOfOrder = mode === 'append' && chain.some((s, i) => i > 0 && chain.slice(0, i).some((p) => lastDate(p) > firstDate(s)));

  const move = (id: string, dir: -1 | 1) => {
    const list = order.filter((x) => x !== targetId);
    const i = list.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setOrder([targetId, ...list]);
  };

  return (
    <form
      className="sm-form"
      onSubmit={(e) => {
        e.preventDefault();
        onMerge(
          { targetId, sourceIds: sources.map((s) => s.id), mode, name, dedupe },
          `Merged ${picked.length} sessions into “${name.trim() || target.name}” (${total.toLocaleString()} solves).`,
        );
      }}
    >
      <fieldset>
        <legend>Merge into</legend>
        <p className="field-help">
          All {picked.length} sessions below are combined into one. Pick the one to keep: it keeps its place and settings, and the
          others are removed once their solves move into it.
        </p>
        <div className="radio-list">
          {picked.map((s) => (
            <label key={s.id} className={s.id === targetId ? 'on' : ''}>
              <input
                type="radio"
                name="target"
                checked={s.id === targetId}
                onChange={() => {
                  setTargetId(s.id);
                  setOrder([s.id, ...order.filter((x) => x !== s.id)]);
                  if (!nameTouched) setName(s.name);
                }}
              />
              <span>{s.name}</span>
              <span className="muted">
                {eventName(s.scrType)} · {s.solves.length.toLocaleString()} solves · {span(s)}
              </span>
              <span className={`role-tag${s.id === targetId ? ' keep' : ''}`}>{s.id === targetId ? 'Kept' : 'Merged in, then removed'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
          }}
        />
      </label>

      <fieldset>
        <legend>Order solves</legend>
        <Segmented value={mode} options={MODES} onChange={setMode} label="Order solves" />
        <p className="field-help">{MODE_HELP[mode]}</p>
        {mode === 'append' && (
          <ol className="order-list">
            <li>
              <b>{target.name}</b> <span className="muted">(kept)</span>
            </li>
            {sources.map((s, i) => (
              <li key={s.id}>
                <span>{s.name}</span>
                <span className="order-btns">
                  <button type="button" className="ghost" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label={`Move ${s.name} up`}>
                    ↑
                  </button>
                  <button type="button" className="ghost" onClick={() => move(s.id, 1)} disabled={i === sources.length - 1} aria-label={`Move ${s.name} down`}>
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </fieldset>

      <label className="check">
        <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
        Skip duplicate solves <span className="muted">(same time, scramble and timestamp)</span>
      </label>

      <div className="preview">
        <div>
          <b>{total.toLocaleString()}</b> solves in “{name.trim() || target.name}”
          {dupes > 0 && <span className="muted"> · {dupes.toLocaleString()} duplicates skipped</span>}
        </div>
        {events.size > 1 && <p className="warn">These sessions use different puzzles or scramble types ({[...events].map(eventName).join(', ')}).</p>}
        {outOfOrder && <p className="warn">Appending will put solves out of date order, so date-based charts may jump backwards.</p>}
      </div>

      <footer className="modal-actions">
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
        <span className="spacer" />
        <button type="submit" className="primary">
          Merge
        </button>
      </footer>
    </form>
  );
}

function ImportForm({ name, theirs, ours, onBack, onImport }: {
  name: string;
  theirs: Session[];
  ours: Session[];
  onBack: () => void;
  onImport: (plan: ImportPlan[], dedupe: boolean) => void;
}) {
  // Default: merge into a session with the same name, otherwise add as a new session.
  const [dest, setDest] = useState<Record<string, string>>(() =>
    Object.fromEntries(theirs.map((t) => [t.id, ours.find((o) => o.name === t.name)?.id ?? 'new'])),
  );
  const [mode, setMode] = useState<MergeMode>('date');
  const [dedupe, setDedupe] = useState(true);

  const plan: ImportPlan[] = theirs.filter((t) => dest[t.id] !== 'skip').map((t) => ({ sourceId: t.id, into: dest[t.id], mode }));

  // Preview, grouped by destination so duplicates across several sources are counted once.
  let adds = 0;
  let dupes = 0;
  const byTarget = new Map<string, Solve[]>();
  for (const p of plan) {
    const src = theirs.find((t) => t.id === p.sourceId)!.solves;
    if (p.into === 'new') {
      adds += src.length;
      continue;
    }
    byTarget.set(p.into, [...(byTarget.get(p.into) ?? []), ...src]);
  }
  for (const [id, extra] of byTarget) {
    const d = dedupe ? previewMerge(ours.find((o) => o.id === id)!.solves, extra) : 0;
    dupes += d;
    adds += extra.length - d;
  }
  const merging = plan.some((p) => p.into !== 'new');
  const fresh = plan.filter((p) => p.into === 'new').length;

  return (
    <form
      className="sm-form"
      onSubmit={(e) => {
        e.preventDefault();
        onImport(plan, dedupe);
      }}
    >
      <p className="muted modal-intro">
        Sessions in <b>{name}</b>. Choose where each one goes.
      </p>
      <div className="scroll-x">
        <table className="sm-table">
          <thead>
            <tr>
              <th scope="col">Session</th>
              <th scope="col" className="num">Solves</th>
              <th scope="col">Dates</th>
              <th scope="col">Destination</th>
            </tr>
          </thead>
          <tbody>
            {theirs.map((t) => (
              <tr key={t.id} className={dest[t.id] === 'skip' ? 'dim' : ''}>
                <td className="nowrap">
                  {t.name} <span className="muted">· {eventName(t.scrType)}</span>
                </td>
                <td className="num">{t.solves.length.toLocaleString()}</td>
                <td className="muted nowrap">{span(t)}</td>
                <td>
                  <select value={dest[t.id]} onChange={(e) => setDest({ ...dest, [t.id]: e.target.value })} aria-label={`Destination for ${t.name}`}>
                    <option value="skip">Don’t import</option>
                    <option value="new">New session</option>
                    <optgroup label="Merge into">
                      {ours.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {merging && (
        <fieldset>
          <legend>When merging, order solves</legend>
          <Segmented value={mode} options={MODES} onChange={setMode} label="Order solves" />
          <p className="field-help">
            {mode === 'date'
              ? 'Imported solves are placed among the existing ones by when they were done.'
              : 'Imported solves go after the existing ones. Dates are left as they are.'}
          </p>
        </fieldset>
      )}
      {merging && (
        <label className="check">
          <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
          Skip duplicate solves <span className="muted">(useful when both files share history)</span>
        </label>
      )}

      <div className="preview">
        {plan.length ? (
          <div>
            Adds <b>{adds.toLocaleString()}</b> solves
            {fresh > 0 && <> · {fresh} new session{fresh > 1 ? 's' : ''}</>}
            {dupes > 0 && <span className="muted"> · {dupes.toLocaleString()} duplicates skipped</span>}
          </div>
        ) : (
          <div className="muted">Nothing selected to import.</div>
        )}
      </div>

      <footer className="modal-actions">
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
        <span className="spacer" />
        <button type="submit" className="primary" disabled={!plan.length}>
          Import
        </button>
      </footer>
    </form>
  );
}
