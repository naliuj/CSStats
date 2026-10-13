import { AVERAGES, type Stats } from '../lib/stats';
import { formatDate, formatDuration } from '../lib/format';
import { useUnits } from './UnitsContext';

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
  const u = useUnits();
  const dateOf = (i: number) => (i >= 0 ? formatDate(solves[i].date) : '');
  const rows = [
    { key: 'single', label: 'Single', bc: single, fmt: u.single },
    ...AVERAGES.map((a) => ({ key: a.key, label: a.key, bc: best[a.key], fmt: u.avg })),
  ].filter((r) => r.bc.bestIndex >= 0);

  return (
    <section className="summary">
      <div className="tiles">
        <Tile label="Solves" value={stats.count.toLocaleString()} sub={`${stats.activeDays.toLocaleString()} active days`} />
        <Tile label="Best single" value={u.single(single.best)} sub={dateOf(single.bestIndex)} />
        <Tile label="Best ao5" value={u.avg(best.ao5.best)} sub={dateOf(best.ao5.bestIndex)} />
        <Tile label="Best ao12" value={u.avg(best.ao12.best)} sub={dateOf(best.ao12.bestIndex)} />
        <Tile label="Mean" value={u.avg(stats.mean)} sub={`σ ${u.avg(stats.stdDev)}`} />
        {u.unit === 'moves' ? (
          // Move counts don't add up to time spent, so show how many attempts were finished instead.
          <Tile label="Finished" value={`${(stats.count - stats.dnf).toLocaleString()}/${stats.count.toLocaleString()}`} sub={stats.dnf ? `${stats.dnf} DNF` : 'no DNFs'} />
        ) : (
          <Tile
            label="Practice time"
            value={formatDuration(stats.totalTime)}
            sub={stats.dnf || stats.plus2 ? `${stats.plus2} +2 · ${stats.dnf} DNF` : 'no penalties'}
          />
        )}
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
                <td>{r.fmt(r.bc.current)}</td>
                <td className="best">{r.fmt(r.bc.best)}</td>
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
