import { useEffect, useState } from 'react';
import { del, get, set } from 'idb-keyval';
import { parseExport, ParseError } from './lib/parse';
import type { CsDoc, EditResult } from './lib/edit';
import type { Session } from './lib/types';
import { useTheme, type ThemePref } from './theme';
import { UploadDropzone } from './components/UploadDropzone';
import { Dashboard } from './components/Dashboard';

const STORE_KEY = 'csstats-export';

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
  /** Previous texts, most recent last. In-memory only. */
  undo: string[];
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

  useEffect(() => {
    get<Stored>(STORE_KEY)
      .then((v) => {
        if (v) setLoaded({ name: v.name, text: v.text, original: v.original ?? v.text, sessions: parseExport(v.text), undo: [] });
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

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

  function commit(cur: Loaded, text: string, undo: string[]) {
    setLoaded({ ...cur, text, sessions: parseExport(text), undo });
    const stored: Stored = { name: cur.name, text, original: text === cur.original ? undefined : cur.original };
    set(STORE_KEY, stored).catch(() => {});
  }

  const applyEdit: ApplyEdit = (edit) => {
    if (!loaded) return new Map();
    const { doc, ids } = edit(JSON.parse(loaded.text));
    commit(loaded, JSON.stringify(doc), [...loaded.undo, loaded.text].slice(-50));
    return ids;
  };

  function undo() {
    if (!loaded?.undo.length) return;
    commit(loaded, loaded.undo[loaded.undo.length - 1], loaded.undo.slice(0, -1));
  }

  function revert() {
    if (!loaded || !edited) return;
    if (!confirm('Discard all edits and go back to the file as you loaded it? You can undo this.')) return;
    commit(loaded, loaded.original, [...loaded.undo, loaded.text]);
  }

  function clear() {
    if (edited && !confirm('Clear data? Your edits will be lost unless you download them first.')) return;
    setLoaded(null);
    del(STORE_KEY).catch(() => {});
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
          <Dashboard key={loaded.name} sessions={loaded.sessions} p={palette} onEdit={applyEdit} />
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
