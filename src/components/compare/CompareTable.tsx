import { AVERAGES, type Stats } from '../../lib/stats';
import { delta } from '../../lib/compare';
import { formatDuration, formatSingle, formatTime } from '../../lib/format';
import type { Side } from './CompareView';

type Kind = 'time' | 'single' | 'count' | 'duration' | 'pct';

interface Row {
  label: string;
  kind: Kind;
  get: (s: Stats) => number;
  /** Lower is better (times, penalty rates). Rows without it are just counts. */
  lowerBetter?: boolean;
}

const pct = (n: number, d: number) => (d ? (n / d) * 100 : NaN);

const ROWS: Row[] = [
  { label: 'Solves', kind: 'count', get: (s) => s.count },
  { label: 'Active days', kind: 'count', get: (s) => s.activeDays },
  { label: 'Practice time', kind: 'duration', get: (s) => s.totalTime },
  { label: 'Best single', kind: 'single', get: (s) => s.single.best, lowerBetter: true },
  ...AVERAGES.map((a): Row => ({ label: `Best ${a.key}`, kind: 'time', get: (s) => s.best[a.key].best, lowerBetter: true })),
  ...(['ao5', 'ao12', 'ao100'] as const).map((k): Row => ({ label: `Current ${k}`, kind: 'time', get: (s) => s.best[k].current, lowerBetter: true })),
  { label: 'Mean', kind: 'time', get: (s) => s.mean, lowerBetter: true },
  { label: 'σ', kind: 'time', get: (s) => s.stdDev, lowerBetter: true },
  { label: 'DNF rate', kind: 'pct', get: (s) => pct(s.dnf, s.count), lowerBetter: true },
  { label: '+2 rate', kind: 'pct', get: (s) => pct(s.plus2, s.count), lowerBetter: true },
];

function fmt(kind: Kind, v: number) {
  if (kind === 'count') return v.toLocaleString();
  if (kind === 'duration') return formatDuration(v);
  if (kind === 'pct') return Number.isNaN(v) ? '–' : `${v.toFixed(1)}%`;
  if (kind === 'single') return formatSingle(v);
  return formatTime(v);
}

function Delta({ kind, a, b }: { kind: Kind; a: number; b: number }) {
  const d = delta(a, b);
  if (Number.isNaN(d) || d === 0 || kind === 'count' || kind === 'duration') return null;
  const faster = d < 0;
  const text = kind === 'pct' ? `${Math.abs(d).toFixed(1)}` : formatTime(Math.abs(d));
  return (
    <span className={`delta ${faster ? 'better' : 'worse'}`} title={`${faster ? 'Lower' : 'Higher'} than A`}>
      {faster ? '▼' : '▲'}
      {text}
    </span>
  );
}

export function CompareTable({ sides }: { sides: Side[] }) {
  const rows = ROWS.filter((r) => sides.some((s) => s.stats.count && Number.isFinite(r.get(s.stats)) && !Number.isNaN(r.get(s.stats))));
  const a = sides[0];

  return (
    <section className="card compare-card">
      <div className="scroll-x">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col"></th>
              {sides.map((s) => (
                <th scope="col" key={s.letter}>
                  <span className="side-dot" style={{ background: s.color }} aria-hidden />
                  <b>{s.letter}</b> {s.sessionNames}
                  <div className="muted col-file">{s.fileName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const values = sides.map((s) => (s.stats.count ? r.get(s.stats) : NaN));
              const finite = values.filter(Number.isFinite);
              const best = r.lowerBetter && sides.length > 1 && finite.length > 1 ? Math.min(...finite) : NaN;
              return (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {values.map((v, i) => (
                    <td key={sides[i].letter} className={v === best ? 'best' : ''}>
                      {sides[i].stats.count ? fmt(r.kind, v) : '–'}
                      {i > 0 && a.stats.count > 0 && <Delta kind={r.kind} a={values[0]} b={v} />}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sides.length > 1 && <p className="card-sub compare-legend">Differences are relative to A. ▼ is lower (faster), ▲ is higher. Bold marks the best in each row.</p>}
    </section>
  );
}
