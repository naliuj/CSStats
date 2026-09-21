import { useEffect, useState } from 'react';
import { del, get, set } from 'idb-keyval';
import { parseExport, ParseError } from './lib/parse';
import type { Session } from './lib/types';
import { useTheme, type ThemePref } from './theme';
import { UploadDropzone } from './components/UploadDropzone';
import { Dashboard } from './components/Dashboard';

const STORE_KEY = 'csstats-export';

interface Loaded {
  name: string;
  sessions: Session[];
}

const THEME_NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemePref, string> = { system: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark' };

export default function App() {
  const [palette, pref, setPref] = useTheme();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    get<{ name: string; text: string }>(STORE_KEY)
      .then((v) => {
        if (v) setLoaded({ name: v.name, sessions: parseExport(v.text) });
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

  async function handleFile(file: File) {
    try {
      const text = await file.text();
      const sessions = parseExport(text);
      setLoaded({ name: file.name, sessions });
      setError(null);
      set(STORE_KEY, { name: file.name, text }).catch(() => {});
    } catch (e) {
      setError(e instanceof ParseError ? e.message : 'Could not read that file.');
    }
  }

  function clear() {
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
          <Dashboard key={loaded.name + loaded.sessions.length} sessions={loaded.sessions} p={palette} />
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
