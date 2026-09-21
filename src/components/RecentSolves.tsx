import { useState } from 'react';
import { Card } from './Card';
import { formatSingle, formatTime } from '../lib/format';
import type { Stats } from '../lib/stats';

const PAGE = 25;
const dt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function RecentSolves({ stats }: { stats: Stats }) {
  const [shown, setShown] = useState(PAGE);
  const n = stats.count;
  const rows = [];
  for (let i = n - 1; i >= Math.max(0, n - shown); i--) rows.push(i);

  return (
    <Card wide title="Solves" sub="Most recent first. Averages are the ones ending at each solve.">
      <div className="scroll-x">
        <table className="solves">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Time</th>
              <th scope="col">ao5</th>
              <th scope="col">ao12</th>
              <th scope="col">Date</th>
              <th scope="col">Scramble</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const s = stats.solves[i];
              return (
                <tr key={i}>
                  <td className="muted">{(i + 1).toLocaleString()}</td>
                  <td className={i === stats.single.bestIndex ? 'best' : ''}>
                    {s.penalty === -1 ? `DNF(${formatSingle(s.raw)})` : formatSingle(s.time) + (s.penalty ? '+' : '')}
                  </td>
                  <td>{formatTime(stats.rolling.ao5[i])}</td>
                  <td>{formatTime(stats.rolling.ao12[i])}</td>
                  <td className="muted nowrap">{dt.format(s.date)}</td>
                  <td className="scramble" title={s.comment || undefined}>{s.scramble}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown < n && (
        <button type="button" className="more" onClick={() => setShown(shown + PAGE * 4)}>
          Show more
        </button>
      )}
    </Card>
  );
}
