import { useMemo } from 'react';
import { useApp } from '../app-state';
import { navigate } from '../router';
import { Stat } from '../components/Timer';
import { breakdowns, totals, weaknesses, type Bucket } from '../../engine/stats/stats';
import { RECORD_DEFS } from '../../engine/stats/records';
import { MODES } from '../../engine/modes/session';
import { randomSeed } from '../../engine/shake/rng';
import { drillFor } from '../weakness';
import { TRAINING_SCORE_LABEL } from '../../engine/scoring/score';

export function Stats() {
  const app = useApp();
  const { shakes, sessions, judgement, records } = app.data;

  const breaks = useMemo(
    () =>
      breakdowns(shakes, (id) => app.ruleset.generalDemands.find((d) => d.id === id)?.label ?? id, judgement),
    [shakes, judgement, app.ruleset],
  );
  const weak = useMemo(() => weaknesses(breaks), [breaks]);
  const t = useMemo(() => totals(shakes, sessions), [shakes, sessions]);

  if (!shakes.length && !judgement.length) {
    return (
      <div className="page page-narrow">
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>No data yet</h1>
        <p className="dim">Run a drill and this page starts answering the only question that matters: what next?</p>
        <button className="btn btn-primary" onClick={() => navigate('/drill', { mode: 'shake-sprint', seed: randomSeed() })}>
          Shake Sprint
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: 26, marginBottom: 14 }}>Statistics</h1>

      <div className="statgrid" style={{ marginBottom: 18 }}>
        <Stat label="sessions" value={t.sessions} />
        <Stat label="shakes" value={t.shakes} />
        <Stat label="submitted" value={t.submitted} />
        <Stat label="valid" value={t.valid} />
        <Stat label="accuracy" value={`${(t.accuracy * 100).toFixed(1)}%`} hint="valid ÷ (valid + invalid)" />
        <Stat label="coverage" value={`${(t.coverage * 100).toFixed(0)}%`} hint="valid ÷ words that existed" />
        <Stat label="words/min" value={t.wordsPerMinute.toFixed(1)} />
        <Stat label="best response" value={t.fastestResponseMs != null ? `${(t.fastestResponseMs / 1000).toFixed(1)}s` : '—'} />
        <Stat label="score" value={t.points} hint={TRAINING_SCORE_LABEL} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          what to practise next
        </div>
        {weak.length === 0 ? (
          <p className="dim" style={{ margin: 0 }}>
            Nothing is clearly weak yet. Keep running drills — a category needs four shakes or four judgement items
            before it is worth calling out, and the trainer will not invent a weakness to fill the space.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 17 }}>
              Your weakest area is <b style={{ color: 'var(--warn)' }}>{weak[0].label}</b>. {weak[0].message}
            </p>
            <div className="row">
              <button className="btn btn-primary" onClick={() => navigate(...drillFor(weak[0]))}>
                Drill {weak[0].label}
              </button>
              {weak[1] && (
                <button className="btn" onClick={() => navigate(...drillFor(weak[1]))}>
                  Or {weak[1].label}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="split" style={{ marginBottom: 18 }}>
        <BucketCard title="by type demand" buckets={breaks.byType} />
        <BucketCard title="by difficulty" buckets={breaks.byLevel} />
      </div>

      <div className="split" style={{ marginBottom: 18 }}>
        <BucketCard title="by general demand" buckets={breaks.byDemand} limit={12} />
        <BucketCard title="by sentence designation" buckets={breaks.byDesignation} limit={12} />
      </div>

      {breaks.byTopic.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row spread" style={{ marginBottom: 10 }}>
            <span className="eyebrow">judgement topics — functions, clauses, phrases, rules</span>
            <span className="tiny faint">accuracy · items</span>
          </div>
          {[...breaks.byTopic]
            .sort((a, b) => b.shakes - a.shakes)
            .slice(0, 16)
            .map((bucket) => (
              <div key={bucket.key} className="bar">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{bucket.label}</span>
                <span className={`track${bucket.accuracy < 0.5 ? ' weak' : bucket.accuracy < 0.75 ? ' mid' : ''}`}>
                  <i style={{ width: `${Math.round(bucket.accuracy * 100)}%` }} />
                </span>
                <span className="n">
                  {Math.round(bucket.accuracy * 100)}%<span className="faint tiny"> ·{bucket.shakes}</span>
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          personal records
        </div>
        <table className="data">
          <tbody>
            {RECORD_DEFS.map((def) => {
              const record = records[def.id];
              return (
                <tr key={def.id}>
                  <td>{def.label}</td>
                  <td className="num">
                    {record ? `${record.value.toFixed(def.unit === '%' || def.unit === 's' ? 1 : 0)} ${def.unit}` : '—'}
                  </td>
                  <td className="num faint tiny">{record ? new Date(record.at).toLocaleDateString() : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          recent sessions
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>when</th>
              <th>mode</th>
              <th style={{ textAlign: 'right' }}>shakes</th>
              <th style={{ textAlign: 'right' }}>valid</th>
              <th style={{ textAlign: 'right' }}>accuracy</th>
              <th style={{ textAlign: 'right' }}>score</th>
            </tr>
          </thead>
          <tbody>
            {[...sessions]
              .reverse()
              .slice(0, 15)
              .map((session) => (
                <tr key={session.id}>
                  <td className="tiny dim">{new Date(session.at).toLocaleString()}</td>
                  <td>{MODES[session.mode]?.name ?? session.mode}</td>
                  <td className="num">{session.shakes}</td>
                  <td className="num">{session.valid}</td>
                  <td className="num">{(session.accuracy * 100).toFixed(0)}%</td>
                  <td className="num">{session.points}</td>
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

function BucketCard({ title, buckets, limit = 8 }: { title: string; buckets: Bucket[]; limit?: number }) {
  const rows = [...buckets].sort((a, b) => b.shakes - a.shakes).slice(0, limit);
  if (!rows.length) return null;
  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="eyebrow">{title}</span>
        <span className="tiny faint">coverage · shakes</span>
      </div>
      {rows.map((bucket) => (
        <div key={bucket.key} className="bar" title={`${Math.round(bucket.accuracy * 100)}% of submissions legal`}>
          <span style={{ textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bucket.label}
          </span>
          <span className={`track${bucket.coverage < 0.3 ? ' weak' : bucket.coverage < 0.6 ? ' mid' : ''}`}>
            <i style={{ width: `${Math.round(bucket.coverage * 100)}%` }} />
          </span>
          <span className="n">
            {Math.round(bucket.coverage * 100)}%
            <span className="faint tiny"> ·{bucket.shakes}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
