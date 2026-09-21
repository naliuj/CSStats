import { AVERAGES, type Stats } from '../lib/stats';
import { formatDate, formatDuration, formatTime } from '../lib/format';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

export function StatsSummary({ stats }: { stats: Stats }) {
  const { solves, single, best } = stats;
  const dateOf = (i: number) => (i >= 0 ? formatDate(solves[i].date) : '');
  const rows = [
    { key: 'single', label: 'Single', bc: single },
    ...AVERAGES.map((a) => ({ key: a.key, label: a.key, bc: best[a.key] })),
  ].filter((r) => r.bc.bestIndex >= 0);

  return (
    <section className="summary">
      <div className="tiles">
        <Tile label="Solves" value={stats.count.toLocaleString()} sub={`${stats.activeDays.toLocaleString()} active days`} />
        <Tile label="Best single" value={formatTime(single.best)} sub={dateOf(single.bestIndex)} />
        <Tile label="Best ao5" value={formatTime(best.ao5.best)} sub={dateOf(best.ao5.bestIndex)} />
        <Tile label="Best ao12" value={formatTime(best.ao12.best)} sub={dateOf(best.ao12.bestIndex)} />
        <Tile label="Mean" value={formatTime(stats.mean)} sub={`σ ${formatTime(stats.stdDev)}`} />
        <Tile
          label="Practice time"
          value={formatDuration(stats.totalTime)}
          sub={stats.dnf || stats.plus2 ? `${stats.plus2} +2 · ${stats.dnf} DNF` : 'no penalties'}
        />
      </div>
      <div className="card table-card">
        <table className="avg-table">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Current</th>
              <th scope="col">Best</th>
              <th scope="col">Best set</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td>{formatTime(r.bc.current)}</td>
                <td className="best">{formatTime(r.bc.best)}</td>
                <td className="muted">
                  {dateOf(r.bc.bestIndex)} <span className="solve-no">#{(r.bc.bestIndex + 1).toLocaleString()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
