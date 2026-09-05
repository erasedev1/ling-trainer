import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../app-state';
import { navigate, type Route } from '../router';
import { AnswerInput } from '../components/AnswerInput';
import { Timer } from '../components/Timer';
import { randomSeed } from '../../engine/shake/rng';
import {
  finishDrill,
  resultOf,
  startDrill,
  submitWord,
  tickDrill,
  type DrillConfig,
  type DrillState,
} from '../../engine/roll/session';
import { applyRecords, bestFor } from '../../engine/stats/records';
import { toRollLog } from '../../engine/stats/stats';
import type { PartOfSpeech } from '../../engine/types';

const TICK_MS = 100;

export function Drill({ route }: { route: Route }) {
  const app = useApp();

  const config: DrillConfig = useMemo(
    () => ({
      seed: Number(route.params.get('seed')) || randomSeed(),
      seconds: Number(route.params.get('seconds')) || app.data.settings.seconds,
      types: (route.params.get('types') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean) as PartOfSpeech[],
    }),
    // Frozen for the life of the drill: settings that change mid-run are not a
    // measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.params.toString()],
  );

  const deps = useMemo(
    () =>
      app.lexicon
        ? {
            cubeSet: app.cubeSet,
            lexicon: app.lexicon,
            minLetters: app.ruleset.word.minLetters,
            maxLetters: app.ruleset.word.maxLetters,
          }
        : undefined,
    [app.lexicon, app.cubeSet, app.ruleset],
  );

  const [state, setState] = useState<DrillState>();
  const [beaten, setBeaten] = useState<string[]>([]);
  const saved = useRef(false);

  useEffect(() => {
    if (!deps) return;
    saved.current = false;
    setBeaten([]);
    setState(startDrill(config, deps));
  }, [deps, config]);

  useEffect(() => {
    if (!state || state.status !== 'running') return;
    const id = window.setInterval(() => setState((s) => (s ? tickDrill(s, TICK_MS) : s)), TICK_MS);
    return () => window.clearInterval(id);
  }, [state?.status, state]);

  // Record once, when the clock stops.
  useEffect(() => {
    if (!state || state.status !== 'finished' || saved.current || !app.lexicon) return;
    saved.current = true;
    const result = resultOf(state, app.lexicon);
    const update = applyRecords(app.data.records, state, result);
    setBeaten(update.beaten);
    app.recordRoll(toRollLog(state, result), update.book);
  }, [state, app]);

  const again = useCallback(
    () => navigate('/drill', { seed: randomSeed(), seconds: config.seconds, types: config.types.join(',') }),
    [config],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (state.status === 'finished' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        again();
      }
      if (event.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, again]);

  if (app.lexiconError) {
    return (
      <div className="page page-narrow">
        <div className="notice">Could not load the dictionary: {app.lexiconError}</div>
      </div>
    );
  }
  if (!deps || !state) {
    return (
      <div className="page page-narrow">
        <p className="dim">Loading the dictionary…</p>
      </div>
    );
  }

  const valid = state.submissions.filter((s) => s.verdict === 'valid').length;

  return (
    <div className="page">
      <div className="drill">
        <div className="cubes">
          {state.roll.cubes.map((cube, i) => (
            <span key={i} className={`cube cube-${cube.color}`} title={`${cube.color} cube`}>
              {cube.letter}
            </span>
          ))}
        </div>

        <div className="demand demand-graded">{state.roll.types.join(' or ')}</div>

        {state.status === 'running' ? (
          <>
            <Timer remainingMs={state.remainingMs} totalMs={config.seconds * 1000} />
            <div className="answer-block">
              <AnswerInput
                submissions={state.submissions}
                onSubmit={(word) => setState((s) => (s ? submitWord(s, word, deps) : s))}
              />
              <div className="livecount">
                <b>{valid}</b> found
              </div>
            </div>
            <button className="btn btn-sm" onClick={() => setState((s) => (s ? finishDrill(s) : s))}>
              Stop
            </button>
          </>
        ) : (
          <Results state={state} beaten={beaten} onAgain={again} />
        )}
      </div>
    </div>
  );
}

function Results({ state, beaten, onAgain }: { state: DrillState; beaten: string[]; onAgain(): void }) {
  const app = useApp();
  const result = resultOf(state, app.lexicon!);
  const found = new Set(state.submissions.filter((s) => s.verdict === 'valid').map((s) => s.word));
  const missed = state.key.words.filter((w) => !found.has(w));
  const wrong = state.submissions.filter(
    (s) => s.verdict !== 'valid' && s.verdict !== 'duplicate' && s.verdict !== 'unverified',
  );
  const limit = app.data.settings.showMissedLimit;
  const best = bestFor(app.data.records, state.config.seconds);

  return (
    <div className="grid" style={{ width: '100%', maxWidth: 720, gap: 14, textAlign: 'left' }}>
      <div className="statgrid">
        <Stat label="found" value={result.valid} />
        <Stat label="wrong" value={result.invalid} />
        <Stat label="accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat label="words/min" value={result.wordsPerMinute.toFixed(0)} />
        {best !== undefined && <Stat label={`best · ${state.config.seconds}s`} value={best} />}
      </div>

      <div className="small dim" style={{ marginTop: -4 }}>
        {result.valid} of {result.available.toLocaleString()} words this roll allowed.
      </div>

      {beaten.length > 0 && (
        <div className="notice" style={{ borderLeftColor: 'var(--accent)' }}>
          <b style={{ color: 'var(--accent)' }}>Personal best</b> — {beaten.join(' · ')}
        </div>
      )}

      {wrong.length > 0 && (
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            rejected
          </div>
          {wrong.map((submission, i) => (
            <div key={i} className="small" style={{ marginBottom: 4 }}>
              <span className="mono" style={{ color: 'var(--bad)' }}>
                {submission.word}
              </span>{' '}
              <span className="dim">— {submission.reason}</span>
            </div>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <div className="card">
          <div className="row spread" style={{ marginBottom: 8 }}>
            <div className="eyebrow">common ones you did not get</div>
            <div className="tiny faint">most common first</div>
          </div>
          <div className="wordlist">
            {missed.slice(0, limit).map((word) => (
              <span key={word}>{word}</span>
            ))}
            {missed.length > limit && <span className="faint">+{missed.length - limit} more</span>}
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center', marginTop: 4 }}>
        <button className="btn btn-primary btn-lg" onClick={onAgain} autoFocus>
          Roll again <kbd>Enter</kbd>
        </button>
        <button className="btn" onClick={() => navigate('/')}>
          Change setup
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
