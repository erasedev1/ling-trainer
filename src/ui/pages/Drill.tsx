import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../app-state';
import { navigate, type Route } from '../router';
import { Board, DemandStack, DesignationLine, solveContextNote } from '../components/Board';
import { AnswerInput } from '../components/AnswerInput';
import { Stat, Timer } from '../components/Timer';
import {
  MODES,
  completeShake,
  isSessionOver,
  nextShake,
  quotaForShake,
  secondsForShake,
  startSession,
  submit,
  tick,
  type ModeId,
  type SessionConfig,
  type SessionState,
} from '../../engine/modes/session';
import { TRAINING_SCORE_LABEL } from '../../engine/scoring/score';
import { toSessionLog, toShakeLogs } from '../../engine/stats/stats';
import { applyRecords, candidatesFor, type PersonalRecord } from '../../engine/stats/records';
import { randomSeed } from '../../engine/shake/rng';
import type { PartOfSpeech } from '../../engine/types';

const TICK_MS = 100;

/**
 * Where the trainer's word list is knowingly incomplete.
 *
 * The Handbook's own lists for these classes say they are not all-inclusive, and
 * interjections are decided case by case by the dictionary ("lists the word as an
 * interjection or as 'used interjectionally'", LT 10 note). The drill still
 * grades against them, but it says so.
 */
const CLOSED_CLASS_NOTE: Partial<Record<PartOfSpeech, string>> = {
  preposition:
    'Prepositions are graded against the Handbook\u2019s "Commonly Used Prepositions" list, which is not exhaustive.',
  conjunction:
    'Conjunctions are graded against the Handbook\u2019s subordinating-conjunction and conjunctive-adverb lists, which it states are not all-inclusive.',
  interjection:
    'Interjections are graded against a curated list. In play, any word the official dictionary lists as an interjection \u2014 or as "used interjectionally" \u2014 is legal.',
  pronoun:
    'Pronouns are graded against the Handbook\u2019s pronoun charts, which note they are not a comprehensive list.',
};

export function Drill({ route }: { route: Route }) {
  const app = useApp();
  const mode = (route.params.get('mode') ?? 'shake-sprint') as ModeId;
  const spec = MODES[mode] ?? MODES['shake-sprint'];

  const config: SessionConfig = useMemo(
    () => ({
      mode: spec.id,
      seed: Number(route.params.get('seed')) || randomSeed(),
      seconds: Number(route.params.get('seconds')) || spec.defaultSeconds,
      requiredWords: route.params.get('words') ? Number(route.params.get('words')) : spec.requiredWords,
      level: Number(route.params.get('level')) || 3,
      focusType: (route.params.get('type') as PartOfSpeech) || undefined,
      focusDemandId: route.params.get('demand') || undefined,
    }),
    // The config is intentionally frozen for the life of the session: a drill
    // whose parameters can change mid-run is not a measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.params.toString(), spec.id],
  );

  const deps = useMemo(
    () => (app.lexicon ? { ruleset: app.ruleset, cubeSet: app.cubeSet, lexicon: app.lexicon } : undefined),
    [app.lexicon, app.ruleset, app.cubeSet],
  );

  const [session, setSession] = useState<SessionState>();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const savedShakes = useRef(0);
  const savedSession = useRef(false);

  useEffect(() => {
    if (!deps) return;
    savedShakes.current = 0;
    savedSession.current = false;
    setRecords([]);
    setSession(startSession(config, deps));
  }, [deps, config]);

  // Clock. A plain interval is enough at 100 ms and costs nothing on a phone.
  useEffect(() => {
    if (!deps || !session || session.status !== 'running') return;
    const id = window.setInterval(() => setSession((s) => (s ? tick(s, TICK_MS) : s)), TICK_MS);
    return () => window.clearInterval(id);
  }, [deps, session?.status, session?.shakeIndex, session]);

  // Persist each shake as it finishes. Endless modes (Shake Sprint, Max Out)
  // have no natural end, so waiting for one would silently lose the data.
  useEffect(() => {
    if (!session || session.history.length <= savedShakes.current) return;
    const fresh = toShakeLogs(session).slice(savedShakes.current);
    savedShakes.current = session.history.length;
    app.recordShakes(fresh);
  }, [session, app]);

  // The session summary and any personal records are written once, at the end.
  useEffect(() => {
    if (!session || session.status !== 'finished' || savedSession.current) return;
    savedSession.current = true;
    const update = applyRecords(app.data.records, candidatesFor(session));
    setRecords(update.beaten);
    app.recordSession(toSessionLog(session), update.book);
  }, [session, app]);

  // Leaving the drill closes the session rather than dropping it.
  const sessionRef = useRef<SessionState | undefined>(undefined);
  sessionRef.current = session;
  useEffect(
    () => () => {
      const last = sessionRef.current;
      if (!last || savedSession.current || !last.history.length) return;
      savedSession.current = true;
      const update = applyRecords(app.data.records, candidatesFor(last));
      app.recordSession(toSessionLog(last), update.book);
    },
    // Only on unmount: the callback reads the latest session through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const advance = useCallback(() => {
    if (!deps) return;
    setSession((s) => (s ? nextShake(s, deps) : s));
  }, [deps]);

  const endNow = useCallback(() => {
    setSession((s) => (s && s.status === 'running' ? completeShake(s) : s));
  }, []);

  // Enter / Space on a results screen moves on; Escape leaves the drill unless
  // the mode is locked (Senior Simulation controls everything — LT-style).
  useEffect(() => {
    if (!session) return;
    const onKey = (event: KeyboardEvent) => {
      if (session.status === 'shake-complete' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (isSessionOver(session)) setSession((s) => (s ? { ...s, status: 'finished' } : s));
        else advance();
      }
      if (event.key === 'Escape' && !spec.locked) navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, advance, spec.locked]);

  if (app.lexiconError) {
    return (
      <div className="page page-narrow">
        <div className="notice">Could not load the trainer dictionary: {app.lexiconError}</div>
      </div>
    );
  }
  if (!deps || !session) {
    return (
      <div className="page page-narrow">
        <p className="dim">Loading the dictionary…</p>
      </div>
    );
  }

  if (session.status === 'finished') {
    return <SessionReport session={session} records={records} config={config} />;
  }

  const quota = quotaForShake(config, session.shakeIndex);
  const totalMs =
    spec.clock === 'per-session' ? config.seconds * 1000 : secondsForShake(config, session.shakeIndex) * 1000;
  const validSoFar = session.submissions.filter((s) => s.verdict === 'valid').length;

  return (
    <div className="page">
      <div className="drill">
        <div className="drill-meta">
          <span>{spec.name}</span>
          <span>
            shake {session.shakeIndex + 1}
            {spec.shakeCount ? ` / ${spec.shakeCount}` : ''}
          </span>
          <span>level {session.scenario.difficulty.level}</span>
          {quota > 0 && (
            <span style={{ color: validSoFar >= quota ? 'var(--accent)' : undefined }}>
              {validSoFar} / {quota} needed
            </span>
          )}
        </div>

        <DesignationLine designation={session.scenario.designation} />
        <Board shake={session.scenario.shake} />
        <DemandStack demands={session.scenario.shake.demands} />

        {session.status === 'running' ? (
          <>
            <Timer remainingMs={session.remainingMs} totalMs={totalMs} />
            <div className="answer-block">
              <AnswerInput
                submissions={session.submissions}
                onSubmit={(word) => setSession((s) => (s ? submit(s, word, deps) : s))}
              />
              <div className="livecount">
                <b>{validSoFar}</b> valid
              </div>
            </div>
            <div className="hint">
              <kbd>Enter</kbd> submits · {solveContextNote(session.scenario.shake)}
            </div>
            {!spec.locked && (
              <button className="btn btn-sm" onClick={endNow}>
                Stop this shake
              </button>
            )}
          </>
        ) : (
          <ShakeResult
            session={session}
            onNext={() => (isSessionOver(session) ? setSession({ ...session, status: 'finished' }) : advance())}
            onEnd={spec.locked ? undefined : () => setSession({ ...session, status: 'finished', endReason: 'complete' })}
          />
        )}
      </div>
    </div>
  );
}

function ShakeResult({
  session,
  onNext,
  onEnd,
}: {
  session: SessionState;
  onNext(): void;
  onEnd?: () => void;
}) {
  const app = useApp();
  const record = session.history[session.history.length - 1];
  if (!record) return null;
  const { score, scenario } = record;
  const found = new Set(record.submissions.filter((s) => s.verdict === 'valid').map((s) => s.word));
  const missed = scenario.answerKey.words.filter((w) => !found.has(w));
  const wrong = record.submissions.filter(
    (s) => s.verdict !== 'valid' && s.verdict !== 'duplicate' && s.verdict !== 'unverified',
  );
  const unverified = record.submissions.filter((s) => s.verdict === 'unverified');
  const limit = app.data.settings.showAnswerKeyLimit;
  const over = isSessionOver(session);

  return (
    <div className="grid" style={{ width: '100%', maxWidth: 720, gap: 14, textAlign: 'left' }}>
      <div className="statgrid">
        <Stat label="valid" value={score.valid} />
        <Stat label="invalid" value={score.invalid} />
        <Stat label="missed" value={score.missed} />
        <Stat label="accuracy" value={`${Math.round(score.accuracy * 100)}%`} />
        <Stat label="words/min" value={score.wpm.toFixed(0)} />
        <Stat label="score" value={score.points} hint={TRAINING_SCORE_LABEL} />
      </div>

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

      {CLOSED_CLASS_NOTE[scenario.type] && (
        <div className="notice">
          {CLOSED_CLASS_NOTE[scenario.type]} The official dictionary is the final authority on whether a word may be
          used as the demanded part of speech (LT 22 G), so treat a rejection here as a prompt to look the word up
          rather than a ruling.
        </div>
      )}

      {unverified.length > 0 && (
        <div className="notice notice-info">
          {unverified.map((s) => s.word).join(', ')} — real spellings the trainer has no grammar data for. Not scored
          either way; the official dictionary would settle them.
        </div>
      )}

      {missed.length > 0 && (
        <div className="card">
          <div className="row spread" style={{ marginBottom: 8 }}>
            <div className="eyebrow">missed — {missed.length} more existed</div>
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

      {missed.length === 0 && score.valid > 0 && (
        <div className="notice" style={{ borderLeftColor: 'var(--accent)' }}>
          Cleared the shake — you found every word the trainer knows of.
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={onNext} autoFocus>
          {over ? 'See report' : 'Next shake'} <kbd>Enter</kbd>
        </button>
        {!over && onEnd && (
          <button className="btn" onClick={onEnd}>
            End session
          </button>
        )}
      </div>
    </div>
  );
}

function SessionReport({
  session,
  records,
  config,
}: {
  session: SessionState;
  records: PersonalRecord[];
  config: SessionConfig;
}) {
  const spec = MODES[session.config.mode];
  const valid = session.history.reduce((s, r) => s + r.score.valid, 0);
  const invalid = session.history.reduce((s, r) => s + r.score.invalid, 0);
  const attempts = valid + invalid;
  const points = session.history.reduce((s, r) => s + r.score.points, 0);
  const cleared = session.history.filter((r) => r.clearedQuota).length;
  const responses = session.history.map((r) => r.score.meanResponseMs).filter((v): v is number => v != null);
  const fastest = session.history.map((r) => r.score.fastestResponseMs).filter((v): v is number => v != null);

  // Per-category strength inside this one session, so the report answers
  // "what did I just fail at" without waiting for the dashboard to fill up.
  const byType = new Map<string, { valid: number; answers: number }>();
  for (const record of session.history) {
    const bucket = byType.get(record.scenario.type) ?? { valid: 0, answers: 0 };
    bucket.valid += record.score.valid;
    bucket.answers += record.scenario.answerKey.count;
    byType.set(record.scenario.type, bucket);
  }
  const ranked = [...byType.entries()]
    .filter(([, b]) => b.answers > 0)
    .map(([type, b]) => ({ type, coverage: b.valid / b.answers }))
    .sort((a, b) => b.coverage - a.coverage);

  return (
    <div className="page page-narrow">
      <div className="eyebrow">{spec.name.toUpperCase()} COMPLETE</div>
      <h1 style={{ fontSize: 30, margin: '6px 0 18px' }}>
        {session.endReason === 'failed-quota'
          ? `Run ended at level ${cleared + 1}`
          : session.endReason === 'time'
            ? 'Time'
            : 'Session complete'}
      </h1>

      <div className="statgrid" style={{ marginBottom: 14 }}>
        <Stat label="score" value={points} hint={TRAINING_SCORE_LABEL} />
        <Stat label="shakes" value={session.history.length} />
        <Stat label="attempts" value={attempts} />
        <Stat label="valid" value={valid} />
        <Stat label="accuracy" value={attempts ? `${((valid / attempts) * 100).toFixed(1)}%` : '—'} />
        <Stat
          label="avg response"
          value={responses.length ? `${(responses.reduce((a, b) => a + b, 0) / responses.length / 1000).toFixed(1)}s` : '—'}
        />
        <Stat label="best response" value={fastest.length ? `${(Math.min(...fastest) / 1000).toFixed(1)}s` : '—'} />
        {spec.escalating && <Stat label="levels cleared" value={cleared} />}
      </div>

      {ranked.length > 1 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            this session by type demand
          </div>
          {ranked.map((row) => (
            <div key={row.type} className="bar">
              <span style={{ textTransform: 'capitalize' }}>{row.type}</span>
              <span className={`track${row.coverage < 0.3 ? ' weak' : row.coverage < 0.6 ? ' mid' : ''}`}>
                <i style={{ width: `${Math.round(row.coverage * 100)}%` }} />
              </span>
              <span className="n">{Math.round(row.coverage * 100)}%</span>
            </div>
          ))}
          <p className="small dim" style={{ margin: '10px 0 0' }}>
            Strongest: <b style={{ color: 'var(--ink)' }}>{ranked[0].type}</b> · Weakest:{' '}
            <b style={{ color: 'var(--ink)' }}>{ranked[ranked.length - 1].type}</b>
          </p>
        </div>
      )}

      {records.length > 0 && (
        <div className="notice" style={{ borderLeftColor: 'var(--accent)', marginBottom: 14 }}>
          <b style={{ color: 'var(--accent)' }}>Personal best</b> —{' '}
          {records.map((r) => `${r.label}: ${r.value.toFixed(r.unit === '%' || r.unit === 's' ? 1 : 0)} ${r.unit}`).join(' · ')}
        </div>
      )}

      <p className="tiny faint" style={{ marginBottom: 18 }}>
        {TRAINING_SCORE_LABEL}. Official AGLOA scoring awards 6 / 4 / 2 per shake among three players — see Rules.
      </p>

      <div className="row">
        <button
          className="btn btn-primary btn-lg"
          onClick={() =>
            navigate('/drill', {
              mode: config.mode,
              seconds: config.seconds,
              words: config.requiredWords,
              level: config.level,
              type: config.focusType,
              demand: config.focusDemandId,
              seed: randomSeed(),
            })
          }
        >
          Run it again
        </button>
        <button className="btn" onClick={() => navigate('/stats')}>
          Statistics
        </button>
        <button className="btn" onClick={() => navigate('/')}>
          Modes
        </button>
      </div>
    </div>
  );
}
