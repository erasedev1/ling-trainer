import { useApp } from '../app-state';
import { navigate } from '../router';
import { randomSeed } from '../../engine/shake/rng';
import { bestFor } from '../../engine/stats/records';
import type { PartOfSpeech } from '../../engine/types';

const SECONDS = [30, 60, 90, 120, 180];

/**
 * The whole setup: which parts of speech count, and how long you get.
 * Everything else is a roll of the cubes.
 */
export function Home() {
  const app = useApp();
  const { types, seconds } = app.data.settings;
  const best = bestFor(app.data.records, seconds);

  const toggle = (pos: PartOfSpeech) => {
    const next = types.includes(pos) ? types.filter((p) => p !== pos) : [...types, pos];
    app.updateSettings({ types: next });
  };

  const roll = () => navigate('/drill', { seed: randomSeed(), seconds, types: types.join(',') });

  return (
    <div className="page page-narrow">
      <div className="eyebrow">senior division · 2026</div>
      <h1 style={{ fontSize: 30, marginBottom: 22 }}>Roll the cubes. Find the words.</h1>

      <div className="setup">
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          which parts of speech count
        </div>
        <div className="chips" style={{ marginBottom: 22 }}>
          {app.ruleset.typeDemands.map((pos) => (
            <button
              key={pos}
              className={`chip chip-toggle${types.includes(pos) ? ' chip-on' : ''}`}
              aria-pressed={types.includes(pos)}
              onClick={() => toggle(pos)}
            >
              {pos}
            </button>
          ))}
        </div>

        <div className="eyebrow" style={{ marginBottom: 8 }}>
          how long
        </div>
        <div className="chips" style={{ marginBottom: 24 }}>
          {SECONDS.map((n) => (
            <button
              key={n}
              className={`chip chip-toggle${seconds === n ? ' chip-on' : ''}`}
              aria-pressed={seconds === n}
              onClick={() => app.updateSettings({ seconds: n })}
            >
              {n}s
            </button>
          ))}
          <span className="numberbox">
            <input
              type="number"
              min={5}
              max={900}
              value={seconds}
              aria-label="seconds"
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) app.updateSettings({ seconds: Math.max(5, Math.min(900, Math.round(n))) });
              }}
            />
            s
          </span>
        </div>

        <button className="btn btn-primary btn-huge" onClick={roll} disabled={!types.length}>
          Roll
        </button>
        {!types.length && <div className="tiny faint" style={{ marginTop: 10 }}>Pick at least one part of speech.</div>}
        {Boolean(types.length) && (
          <div className="small dim" style={{ marginTop: 12 }}>
            {types.join(' + ')} · {seconds}s
            {best !== undefined && <> · your best at {seconds}s is <b style={{ color: 'var(--accent)' }}>{best}</b></>}
          </div>
        )}
      </div>

      <p className="tiny faint" style={{ marginTop: 28, lineHeight: 1.6 }}>
        All 23 cubes are rolled, the way Player One starts a shake. Words are {app.ruleset.word.minLetters}–
        {app.ruleset.word.maxLetters} letters (LT 2), spelled from the cubes shown, and must be usable as one of the
        parts of speech you picked (LT 22 G).
      </p>
    </div>
  );
}
