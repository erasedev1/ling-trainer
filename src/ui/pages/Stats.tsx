import { useMemo } from 'react';
import { useApp } from '../app-state';
import { navigate } from '../router';
import { byType, totals, weakestType } from '../../engine/stats/stats';

export function Stats() {
  const app = useApp();
  const { rolls, records } = app.data;

  const t = useMemo(() => totals(rolls), [rolls]);
  const types = useMemo(() => byType(rolls), [rolls]);
  const weakest = useMemo(() => weakestType(types), [types]);
  const fastest = useMemo(() => Math.max(0, ...types.map((t) => t.perMinute)), [types]);

  if (!rolls.length) {
    return (
      <div className="page page-narrow">
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>No data yet</h1>
        <p className="dim">Do a few rolls and this page starts telling you what to practise.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Roll
        </button>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1 style={{ fontSize: 26, marginBottom: 14 }}>Statistics</h1>

      <div className="statgrid" style={{ marginBottom: 18 }}>
        <Stat label="rolls" value={t.rolls} />
        <Stat label="words found" value={t.valid} />
        <Stat label="wrong" value={t.invalid} />
        <Stat label="accuracy" value={`${(t.accuracy * 100).toFixed(0)}%`} />
        <Stat label="words/min" value={t.wordsPerMinute.toFixed(1)} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row spread" style={{ marginBottom: 10 }}>
          <span className="eyebrow">words found per minute</span>
          <span className="tiny faint">rate · rolls</span>
        </div>
        {types.map((row) => (
          <div key={row.type} className="bar">
            <span style={{ textTransform: 'capitalize' }}>{row.type}</span>
            <span className={`track${weakest?.type === row.type ? ' weak' : ''}`}>
              <i style={{ width: `${fastest ? Math.round((row.perMinute / fastest) * 100) : 0}%` }} />
            </span>
            <span className="n">
              {row.perMinute.toFixed(1)}
              <span className="faint tiny"> ·{row.rolls}</span>
            </span>
          </div>
        ))}
        <p className="small dim" style={{ margin: '12px 0 0' }}>
          {weakest ? (
            <>
              Slowest so far: <b style={{ color: 'var(--warn)' }}>{weakest.type}</b> — {weakest.perMinute.toFixed(1)} a
              minute, well behind your best.
            </>
          ) : (
            'Nothing stands out yet. Two parts of speech need three rolls each before this will compare them.'
          )}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          personal bests
        </div>
        <table className="data">
          <tbody>
            {Object.entries(records.mostWords)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([seconds, record]) => (
                <tr key={seconds}>
                  <td>Most words in {seconds}s</td>
                  <td className="num">{record!.value}</td>
                  <td className="num faint tiny">{record!.types.join(' + ')}</td>
                </tr>
              ))}
            {records.bestWordsPerMinute && (
              <tr>
                <td>Best words per minute</td>
                <td className="num">{records.bestWordsPerMinute.value.toFixed(1)}</td>
                <td className="num faint tiny">{records.bestWordsPerMinute.types.join(' + ')}</td>
              </tr>
            )}
            {records.bestAccuracy && (
              <tr>
                <td>Best accuracy</td>
                <td className="num">{(records.bestAccuracy.value * 100).toFixed(0)}%</td>
                <td className="num faint tiny">{records.bestAccuracy.types.join(' + ')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          recent rolls
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>when</th>
              <th>parts of speech</th>
              <th style={{ textAlign: 'right' }}>found</th>
              <th style={{ textAlign: 'right' }}>accuracy</th>
            </tr>
          </thead>
          <tbody>
            {[...rolls]
              .reverse()
              .slice(0, 20)
              .map((roll, i) => (
                <tr key={`${roll.at}-${i}`}>
                  <td className="tiny dim">{new Date(roll.at).toLocaleString()}</td>
                  <td className="tiny">{roll.types.join(' + ') || 'any'}</td>
                  <td className="num">{roll.valid}</td>
                  <td className="num">{(roll.accuracy * 100).toFixed(0)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button
          className="btn btn-sm"
          onClick={() => {
            if (confirm('Delete all local training data? This cannot be undone.')) app.clearAll();
          }}
        >
          Clear all data
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
