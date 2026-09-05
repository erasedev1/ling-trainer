import { useState } from 'react';
import { useApp } from '../app-state';
import { navigate } from '../router';
import { CUBE_POOLS, MODES, defaultConfig, type ModeId, type SessionConfig } from '../../engine/modes/session';
import { randomSeed } from '../../engine/shake/rng';
import { breakdowns, weaknesses } from '../../engine/stats/stats';
import { drillFor } from '../weakness';
import type { PartOfSpeech } from '../../engine/types';

const ORDER: ModeId[] = [
  'shake-sprint',
  'x-in-y',
  'max-out',
  'category-gauntlet',
  'random-gauntlet',
  'progressive',
  'simulation',
];

const SECONDS = [10, 15, 20, 30, 45, 60, 90, 120];
const WORDS = [1, 2, 3, 5, 10];

const DEMAND_PRESSURE: { level: number; label: string }[] = [
  { level: 1, label: 'None' },
  { level: 2, label: 'Light' },
  { level: 3, label: 'Standard' },
  { level: 4, label: 'Heavy' },
  { level: 5, label: 'Brutal' },
];

export function Home() {
  const app = useApp();
  const [open, setOpen] = useState<ModeId | null>('shake-sprint');

  const breaks = breakdowns(app.data.shakes, (id) => app.ruleset.generalDemands.find((d) => d.id === id)?.label ?? id);
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
          onClick={() => navigate('/drill', { ...toParams(defaultConfig('shake-sprint', randomSeed())) })}
        >
          Quick Sprint · 15s
        </button>
      </div>

      {weakest && (
        <div className="notice" style={{ margin: '14px 0' }}>
          Your weakest area is <b style={{ color: 'var(--ink)' }}>{weakest.label}</b> — {weakest.message}{' '}
          <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate(...drillFor(weakest))}>
            Drill it
          </button>
        </div>
      )}

      <div className="modelist" style={{ marginTop: 18 }}>
        {ORDER.map((id) => {
          const spec = MODES[id];
          const isOpen = open === id;
          return (
            <div key={id} className={`modeblock${isOpen ? ' modeblock-open' : ''}`}>
              <button className="modehead" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                <div>
                  <h3>{spec.name}</h3>
                  <div className="tagline">{spec.tagline}</div>
                </div>
                <span className="chev">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <ModeOptions mode={id} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeOptions({ mode }: { mode: ModeId }) {
  const app = useApp();
  const spec = MODES[mode];
  const [config, setConfig] = useState<SessionConfig>(() => defaultConfig(mode, randomSeed()));
  const set = (patch: Partial<SessionConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const start = () => navigate('/drill', toParams({ ...config, seed: randomSeed() }));

  if (spec.locked) {
    return (
      <div className="modebody">
        <p className="small dim" style={{ margin: '0 0 12px' }}>
          {spec.description} Nothing here is adjustable — that is the point.
        </p>
        <button className="btn btn-primary btn-lg" onClick={start}>
          Start Senior Simulation
        </button>
      </div>
    );
  }

  const allTypes = app.ruleset.typeDemands;
  const chosen = config.types.length ? config.types : allTypes;
  const wordDemands = app.ruleset.generalDemands.filter((d) => d.scope === 'word');
  const availableDemands = wordDemands.filter(
    (d) => !d.requiresType || chosen.includes(d.requiresType),
  );

  const toggleType = (pos: PartOfSpeech) => {
    const current = config.types.length ? config.types : allTypes;
    const next = current.includes(pos) ? current.filter((p) => p !== pos) : [...current, pos];
    // Deselecting everything means "any", not "impossible".
    set({ types: next.length ? next : [] });
    // A pinned demand that belongs to a deselected part of speech has to go.
    const pinned = wordDemands.find((d) => d.id === config.focusDemandId);
    if (pinned?.requiresType && !next.includes(pinned.requiresType)) set({ focusDemandId: undefined });
  };

  return (
    <div className="modebody">
      <p className="small dim" style={{ margin: '0 0 16px' }}>
        {spec.description}
      </p>

      <Field label="parts of speech">
        <div className="chips">
          {allTypes.map((pos) => (
            <button
              key={pos}
              className={`chip chip-toggle${chosen.includes(pos) ? ' chip-on' : ''}`}
              aria-pressed={chosen.includes(pos)}
              onClick={() => toggleType(pos)}
            >
              {pos}
            </button>
          ))}
          <button className="chip chip-plain" onClick={() => set({ types: [] })}>
            all
          </button>
        </div>
      </Field>

      <Field label="cubes">
        <div className="seg">
          {CUBE_POOLS.map((pool) => (
            <button key={pool.id} aria-pressed={config.cubePool === pool.id} onClick={() => set({ cubePool: pool.id })}>
              {pool.label}
            </button>
          ))}
        </div>
        <div className="tiny faint" style={{ marginTop: 6 }}>
          {CUBE_POOLS.find((p) => p.id === config.cubePool)!.detail}
        </div>
      </Field>

      <Field label={spec.clock === 'per-session' ? 'session length' : 'seconds per shake'}>
        <div className="chips">
          {SECONDS.map((n) => (
            <button
              key={n}
              className={`chip chip-toggle${config.seconds === n ? ' chip-on' : ''}`}
              aria-pressed={config.seconds === n}
              onClick={() => set({ seconds: n })}
            >
              {n}s
            </button>
          ))}
          <NumberBox value={config.seconds} min={5} max={600} suffix="s" onChange={(seconds) => set({ seconds })} />
        </div>
        {spec.escalating && <div className="tiny faint" style={{ marginTop: 6 }}>Starting clock — it shortens every level.</div>}
      </Field>

      {spec.requiredWords !== undefined && (
        <Field label="valid words to clear a shake">
          <div className="chips">
            {WORDS.map((n) => (
              <button
                key={n}
                className={`chip chip-toggle${config.requiredWords === n ? ' chip-on' : ''}`}
                aria-pressed={config.requiredWords === n}
                onClick={() => set({ requiredWords: n })}
              >
                {n}
              </button>
            ))}
            <NumberBox
              value={config.requiredWords ?? 1}
              min={1}
              max={50}
              onChange={(requiredWords) => set({ requiredWords })}
            />
          </div>
        </Field>
      )}

      {!spec.escalating && (
        <Field label="extra demands">
          <div className="seg">
            {DEMAND_PRESSURE.map((p) => (
              <button key={p.level} aria-pressed={config.level === p.level} onClick={() => set({ level: p.level })}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="tiny faint" style={{ marginTop: 6 }}>
            How many general demands stack on top of the Type Demand — letter counts, double letters, plural, participle
            and so on.
          </div>
        </Field>
      )}

      <Field label="always demand (optional)">
        <select
          className="select"
          value={config.focusDemandId ?? ''}
          onChange={(e) => set({ focusDemandId: e.target.value || undefined })}
        >
          <option value="">nothing pinned</option>
          {availableDemands.map((d) => (
            <option key={d.id} value={d.id}>
              {d.requiresType ? `${d.requiresType}: ` : ''}
              {d.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="row spread" style={{ marginTop: 18, gap: 12 }}>
        <div className="mono small dim">{summarise(config, allTypes)}</div>
        <button className="btn btn-primary btn-lg" onClick={start}>
          Start {spec.name}
        </button>
      </div>
    </div>
  );
}

function NumberBox({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange(value: number): void;
}) {
  return (
    <span className="numberbox">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        aria-label="custom value"
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
        }}
      />
      {suffix}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 7 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/** The one-line "here is exactly what you are about to play" readout. */
export function summarise(config: SessionConfig, allTypes: PartOfSpeech[]): string {
  const types = config.types.length && config.types.length < allTypes.length ? config.types.join(' + ') : 'any type';
  const pool = CUBE_POOLS.find((p) => p.id === config.cubePool)!.label.toLowerCase();
  const bits = [types, pool, `${config.seconds}s`];
  if (config.requiredWords) bits.push(`${config.requiredWords} to clear`);
  return bits.join(' · ');
}

/** Config → URL params, so a drill can be linked and replayed exactly. */
export function toParams(config: SessionConfig): Record<string, string | number | undefined> {
  return {
    mode: config.mode,
    seed: config.seed,
    seconds: config.seconds,
    words: config.requiredWords,
    level: config.level,
    types: config.types.length ? config.types.join(',') : undefined,
    cubes: config.cubePool,
    demand: config.focusDemandId,
  };
}
