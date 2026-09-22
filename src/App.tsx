import { useEffect, useState } from 'react';
import { del, get, set } from 'idb-keyval';
import { parseExport, ParseError } from './lib/parse';
import type { CsDoc, EditResult } from './lib/edit';
import type { Session } from './lib/types';
import { compose, identity, invert, type IdMap } from './lib/remap';
import { useTheme, type ThemePref } from './theme';
import { UploadDropzone } from './components/UploadDropzone';
import { Dashboard } from './components/Dashboard';
import { CompareView, type CompareFile } from './components/compare/CompareView';
import { Segmented } from './components/Card';

const STORE_KEY = 'csstats-export';
const COMPARE_KEY = 'csstats-compare';

type View = 'dashboard' | 'compare';

interface Stored {
  name: string;
  /** Current export text, with any edits applied. Always a valid csTimer export. */
  text: string;
  /** The file as loaded, for reverting. Absent when nothing has been edited. */
  original?: string;
}

interface Loaded {
  name: string;
  text: string;
  original: string;
  sessions: Session[];
  /** Previous states, most recent last. In-memory only. */
  undo: UndoEntry[];
}

interface UndoEntry {
  text: string;
  /** Session ids now → ids in `text`. */
  back: IdMap;
}

/** Bumped on every edit, undo and revert, with how session ids moved (old → new). */
export interface Remap {
  n: number;
  ids: IdMap;
}

/** Applies an edit to the export and reports how session ids moved. */
export type ApplyEdit = (edit: (doc: CsDoc) => EditResult) => Map<string, string>;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const editedName = (name: string) => name.replace(/(-edited)?(\.[^.]+)?$/, (_m, _e, ext) => `-edited${ext || '.txt'}`);

const THEME_NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemePref, string> = { system: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };

export default function App() {
  const [palette, pref, setPref] = useTheme();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [compareFiles, setCompareFiles] = useState<(CompareFile & { text: string })[]>([]);

  useEffect(() => {
    Promise.all([
      get<Stored>(STORE_KEY)
        .then((v) => {
          if (v) setLoaded({ name: v.name, text: v.text, original: v.original ?? v.text, sessions: parseExport(v.text), undo: [] });
        })
        .catch(() => {}),
      get<{ id: string; name: string; text: string }[]>(COMPARE_KEY)
        .then((list) => {
          const files = [];
          for (const f of list ?? []) {
            try {
              files.push({ ...f, sessions: parseExport(f.text) });
            } catch {
              // skip anything that no longer parses
            }
          }
          setCompareFiles(files);
        })
        .catch(() => {}),
    ]).finally(() => setRestoring(false));
  }, []);

  function saveCompare(files: (CompareFile & { text: string })[]) {
    setCompareFiles(files);
    set(COMPARE_KEY, files.map(({ id, name, text }) => ({ id, name, text }))).catch(() => {});
  }

  async function addCompareFile(file: File) {
    try {
      const text = await file.text();
      const sessions = parseExport(text);
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      saveCompare([...compareFiles, { id, name: file.name, text, sessions }]);
      setError(null);
      setView('compare');
    } catch (e) {
      setError(e instanceof ParseError ? e.message : 'Could not read that file.');
    }
  }

  async function handleFile(file: File) {
    if (edited && !confirm('Load a new file? Your edits will be lost unless you download them first.')) return;
    try {
      const text = await file.text();
      const sessions = parseExport(text);
      setLoaded({ name: file.name, text, original: text, sessions, undo: [] });
      setError(null);
      set(STORE_KEY, { name: file.name, text } satisfies Stored).catch(() => {});
    } catch (e) {
      setError(e instanceof ParseError ? e.message : 'Could not read that file.');
    }
  }

  const edited = !!loaded && loaded.text !== loaded.original;

  const [remap, setRemap] = useState<Remap>({ n: 0, ids: new Map() });

  function commit(cur: Loaded, text: string, undo: UndoEntry[], ids: IdMap) {
    setLoaded({ ...cur, text, sessions: parseExport(text), undo });
    setRemap((r) => ({ n: r.n + 1, ids }));
    const stored: Stored = { name: cur.name, text, original: text === cur.original ? undefined : cur.original };
    set(STORE_KEY, stored).catch(() => {});
  }

  const applyEdit: ApplyEdit = (edit) => {
    if (!loaded) return new Map();
    const { doc, ids } = edit(JSON.parse(loaded.text));
    commit(loaded, JSON.stringify(doc), [...loaded.undo, { text: loaded.text, back: invert(ids) }].slice(-50), ids);
    return ids;
  };

  function undo() {
    if (!loaded?.undo.length) return;
    const { text, back } = loaded.undo[loaded.undo.length - 1];
    commit(loaded, text, loaded.undo.slice(0, -1), back);
  }

  function revert() {
    if (!loaded || !edited) return;
    if (!confirm('Discard all edits and go back to the file as you loaded it? You can undo this.')) return;
    // Walk the undo history back to the original to find where each session ends up.
    let toOriginal: IdMap = identity(loaded.sessions.map((s) => s.id));
    for (let i = loaded.undo.length - 1; i >= 0; i--) toOriginal = compose(toOriginal, loaded.undo[i].back);
    commit(loaded, loaded.original, [...loaded.undo, { text: loaded.text, back: invert(toOriginal) }], toOriginal);
  }

  function clear() {
    if (edited && !confirm('Clear data? Your edits will be lost unless you download them first.')) return;
    setLoaded(null);
    setCompareFiles([]);
    setView('dashboard');
    del(STORE_KEY).catch(() => {});
    del(COMPARE_KEY).catch(() => {});
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo" src={`${import.meta.env.BASE_URL}cube.svg`} alt="" />
          <h1>CSStats</h1>
          {loaded && <span className="filename" title={loaded.name}>{loaded.name}</span>}
        </div>
        <div className="topbar-actions">
          {loaded && (edited || loaded.undo.length > 0) && (
            <div className="edit-actions">
              {edited && <span className="edited-badge">Edited</span>}
              <button type="button" className="ghost" onClick={undo} disabled={!loaded.undo.length}>
                Undo
              </button>
              {edited && (
                <>
                  <button type="button" className="ghost" onClick={revert}>
                    Revert
                  </button>
                  <button
                    type="button"
                    className="ghost accent"
                    onClick={() => download(editedName(loaded.name), loaded.text)}
                    title="Download the edited file. Import it in csTimer via Export → Import from file."
                  >
                    Download for csTimer
                  </button>
                </>
              )}
            </div>
          )}
          {loaded && (
            <>
              <label className="ghost">
                Load another file
                <input
                  type="file"
                  accept=".txt,.json,application/json,text/plain"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="ghost" onClick={clear}>
                Clear data
              </button>
            </>
          )}
          <button type="button" className="ghost" onClick={() => setPref(THEME_NEXT[pref])}>
            {THEME_LABEL[pref]}
          </button>
        </div>
      </header>
      {error && loaded && (
        <p className="error banner" role="alert">
          {error}
        </p>
      )}
      <main>
        {restoring ? null : loaded ? (
          <>
            <div className="view-switch">
              <Segmented
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: 'dashboard', label: 'Dashboard' },
                  { value: 'compare', label: 'Compare' },
                ]}
              />
            </div>
            {/* Both stay mounted so each keeps its selections when switching. */}
            <div hidden={view !== 'dashboard'}>
              <Dashboard key={loaded.name} sessions={loaded.sessions} p={palette} onEdit={applyEdit} remap={remap} />
            </div>
            <div hidden={view !== 'compare'}>
              <CompareView
                key={loaded.name}
                mainName={loaded.name}
                mainSessions={loaded.sessions}
                remap={remap}
                files={compareFiles}
                onAddFile={addCompareFile}
                onRemoveFile={(id) => saveCompare(compareFiles.filter((f) => f.id !== id))}
                p={palette}
              />
            </div>
          </>
        ) : (
          <UploadDropzone onFile={handleFile} error={error} />
        )}
      </main>
      <footer className="footer">
        Works with exports from <a href="https://cstimer.net" target="_blank" rel="noreferrer">csTimer</a>. Your data stays in this browser.
      </footer>
    </div>
  );
}
