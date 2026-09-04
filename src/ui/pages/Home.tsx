import { useState } from 'react';
import { useApp } from '../app-state';
import { navigate } from '../router';
import { MODES, type ModeId } from '../../engine/modes/session';
import { randomSeed } from '../../engine/shake/rng';
import { breakdowns, weaknesses } from '../../engine/stats/stats';
import type { PartOfSpeech } from '../../engine/types';
import { drillFor } from '../weakness';

const ORDER: ModeId[] = [
  'shake-sprint',
  'x-in-y',
  'max-out',
  'category-gauntlet',
  'random-gauntlet',
  'progressive',
  'simulation',
];

export function Home() {
  const app = useApp();
  const [open, setOpen] = useState<ModeId | null>(null);

  const breaks = breakdowns(
    app.data.shakes,
    (id) => app.ruleset.generalDemands.find((d) => d.id === id)?.label ?? id,
    app.data.judgement,
  );
  const weakest = weaknesses(breaks)[0];

  return (
    <div className="page">
      <div className="row spread" style={{ marginBottom: 6 }}>
        <div>
          <div className="eyebrow">senior division · 2026</div>
          <h1 style={{ fontSize: 28 }}>Pick a drill and start typing.</h1>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/drill', { mode: 'shake-sprint', seed: randomSeed() })}
        >
          Shake Sprint · 15s
        </button>
      </div>

      {weakest && (
        <div className="notice" style={{ margin: '14px 0' }}>
          Your weakest area is <b style={{ color: 'var(--ink)' }}>{weakest.label}</b> — {weakest.message}{' '}
          <button
            className="btn btn-sm"
            style={{ marginLeft: 8 }}
            onClick={() => navigate(...drillFor(weakest))}
          >
            Drill it
          </button>
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        {ORDER.map((id) => {
          const spec = MODES[id];
          return (
            <div key={id}>
              <button className="modecard" onClick={() => setOpen(open === id ? null : id)}>
                <h3>{spec.name}</h3>
                <div className="tagline">{spec.tagline}</div>
                <p>{spec.description}</p>
              </button>
              {open === id && <ModeLauncher mode={id} />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-2" style={{ marginTop: 22 }}>
        <button className="modecard" onClick={() => navigate('/judgement')}>
          <h3>Judgement Drills</h3>
          <div className="tagline">The parts a machine cannot grade.</div>
          <p>
            The 55 questions from the Handbook&apos;s own Judge&apos;s Self-Test plus 25 rules items — functions,
            clauses, phrases, challenges and scoring, each with AGLOA&apos;s answer and explanation.
          </p>
        </button>
        <button className="modecard" onClick={() => navigate('/rules')}>
          <h3>Senior Reference</h3>
          <div className="tagline">Every Senior demand, in one place.</div>
          <p>
            The complete Senior demand structure, the scoring chart, the time limits and the word rules, each carrying
            its rule number and a link to the official PDF.
          </p>
        </button>
      </div>
    </div>
  );
}

function ModeLauncher({ mode }: { mode: ModeId }) {
  const app = useApp();
  const spec = MODES[mode];
  const [seconds, setSeconds] = useState(spec.defaultSeconds);
  const [words, setWords] = useState(spec.requiredWords ?? 3);
  const [level, setLevel] = useState(3);
  const [type, setType] = useState<PartOfSpeech | ''>('');
  const [demandId, setDemandId] = useState('');

  const go = () =>
    navigate('/drill', {
      mode,
      seed: randomSeed(),
      seconds,
      words: spec.requiredWords ? words : undefined,
      level,
      type: type || undefined,
      demand: demandId || undefined,
    });

  if (spec.locked) {
    return (
      <div className="card" style={{ marginTop: 8 }}>
        <p className="small dim" style={{ margin: '0 0 12px' }}>
          Nothing here is adjustable. Twelve shakes, a fixed clock, no pausing and no restarting an individual
          question — the same discipline as a real round.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/drill', { mode, seed: randomSeed() })}>
          Start Senior Simulation
        </button>
      </div>
    );
  }

  const wordDemands = app.ruleset.generalDemands.filter((d) => d.scope === 'word');

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="grid" style={{ gap: 12 }}>
        <Field label={spec.clock === 'per-session' ? 'session length' : 'seconds per shake'}>
          <div className="seg">
            {(spec.clock === 'per-session' ? [60, 90, 120, 180] : [10, 15, 20, 30]).map((n) => (
              <button key={n} aria-pressed={seconds === n} onClick={() => setSeconds(n)}>
                {n}s
              </button>
            ))}
          </div>
        </Field>

        {spec.requiredWords !== undefined && !spec.escalating && (
          <Field label="valid words required">
            <div className="seg">
              {[1, 3, 5, 10].map((n) => (
                <button key={n} aria-pressed={words === n} onClick={() => setWords(n)}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
        )}

        {!spec.escalating && (
          <Field label="difficulty">
            <div className="seg">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} aria-pressed={level === n} onClick={() => setLevel(n)}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
        )}

        {mode === 'category-gauntlet' && (
          <>
            <Field label="type demand">
              <select
                className="btn btn-sm"
                value={type}
                onChange={(e) => setType(e.target.value as PartOfSpeech | '')}
                style={{ background: 'var(--bg-sunken)' }}
              >
                <option value="">any</option>
                {app.ruleset.typeDemands.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="general demand always in force">
              <select
                className="btn btn-sm"
                value={demandId}
                onChange={(e) => setDemandId(e.target.value)}
                style={{ background: 'var(--bg-sunken)', maxWidth: '100%' }}
              >
                <option value="">none</option>
                {wordDemands
                  .filter((d) => !d.requiresType || !type || d.requiresType === type)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.requiresType ? `${d.requiresType}: ` : ''}
                      {d.label}
                    </option>
                  ))}
              </select>
            </Field>
          </>
        )}

        <div>
          <button className="btn btn-primary" onClick={go}>
            Start {spec.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row spread" style={{ gap: 12 }}>
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  );
}
