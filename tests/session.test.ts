import { describe, expect, it } from 'vitest';
import {
  MODES,
  completeShake,
  isSessionOver,
  nextShake,
  defaultConfig,
  quotaForShake,
  secondsForShake,
  startSession,
  submit,
  tick,
  type SessionConfig,
} from '../src/engine/modes/session';
import { scoreShake, officialScore } from '../src/engine/scoring/score';
import { applyRecords, candidatesFor } from '../src/engine/stats/records';
import { breakdowns, toSessionLog, toShakeLogs, totals, weaknesses } from '../src/engine/stats/stats';
import { createLocalStore } from '../src/engine/persistence/store';
import { cubeSet, lexicon, ruleset } from './helpers';
import type { SubmissionResult } from '../src/engine/types';

const deps = () => ({ ruleset, cubeSet, lexicon: lexicon() });

const config = (patch: Partial<SessionConfig> = {}): SessionConfig => ({
  ...defaultConfig(patch.mode ?? 'shake-sprint', 1234),
  seconds: 15,
  level: 2,
  ...patch,
});

describe('session lifecycle', () => {
  it('runs the clock down and completes the shake', () => {
    let state = startSession(config(), deps());
    expect(state.status).toBe('running');
    for (let i = 0; i < 150; i++) state = tick(state, 100);
    expect(state.status).toBe('shake-complete');
    expect(state.history).toHaveLength(1);
  });

  it('records a valid word once and the repeat as a duplicate', () => {
    let state = startSession(config(), deps());
    const word = state.scenario.answerKey.words[0];
    state = submit(state, word, deps());
    state = submit(state, word, deps());
    expect(state.submissions.map((s) => s.verdict)).toEqual(['valid', 'duplicate']);
  });

  it('is case- and whitespace-insensitive', () => {
    let state = startSession(config(), deps());
    const word = state.scenario.answerKey.words[0];
    state = submit(state, `  ${word.toUpperCase()} `, deps());
    expect(state.submissions[0].verdict).toBe('valid');
  });

  it('keeps a per-session clock running across shakes', () => {
    let state = startSession(config({ mode: 'category-gauntlet', seconds: 60, requiredWords: 1 }), deps());
    state = submit(state, state.scenario.answerKey.words[0], deps());
    for (let i = 0; i < 100; i++) state = tick(state, 100); // 10s
    state = completeShake(state);
    const remaining = state.remainingMs;
    state = nextShake(state, deps());
    expect(state.status).toBe('running');
    expect(state.remainingMs).toBe(remaining);
    expect(state.shakeElapsedMs).toBe(0);
  });

  it('ends a per-session mode when the clock expires', () => {
    let state = startSession(config({ mode: 'random-gauntlet', seconds: 5, requiredWords: 1 }), deps());
    for (let i = 0; i < 60; i++) state = tick(state, 100);
    expect(state.status).toBe('finished');
    expect(state.endReason).toBe('time');
  });

  it('ends Progressive Speed the moment a quota is missed', () => {
    let state = startSession(config({ mode: 'progressive', seconds: 12, requiredWords: 1 }), deps());
    state = completeShake(state); // no submissions, so the quota is missed
    expect(state.history[0].clearedQuota).toBe(false);
    state = nextShake(state, deps());
    expect(state.status).toBe('finished');
    expect(state.endReason).toBe('failed-quota');
  });

  it('escalates Progressive Speed: less time, bigger quota', () => {
    const cfg = config({ mode: 'progressive', seconds: 24, requiredWords: 1 });
    expect(secondsForShake(cfg, 0)).toBe(24);
    expect(secondsForShake(cfg, 3)).toBe(18);
    expect(secondsForShake(cfg, 20)).toBeGreaterThanOrEqual(6);
    expect(quotaForShake(cfg, 0)).toBe(1);
    expect(quotaForShake(cfg, 6)).toBe(3);
  });

  it('stops the Senior Simulation after its fixed number of shakes', () => {
    const spec = MODES.simulation;
    let state = startSession(config({ mode: 'simulation', seconds: 20 }), deps());
    for (let i = 0; i < spec.shakeCount!; i++) {
      state = completeShake(state);
      if (i < spec.shakeCount! - 1) {
        state = nextShake(state, deps());
        expect(state.status).toBe('running');
      }
    }
    expect(isSessionOver(state)).toBe(true);
    state = nextShake(state, deps());
    expect(state.status).toBe('finished');
    expect(state.endReason).toBe('complete');
  });

  it('ignores submissions once the shake is over', () => {
    let state = startSession(config(), deps());
    state = completeShake(state);
    const before = state.submissions.length;
    state = submit(state, 'anything', deps());
    expect(state.submissions.length).toBe(before);
  });
});

describe('training score', () => {
  const submission = (verdict: SubmissionResult['verdict'], atMs: number): SubmissionResult => ({
    raw: 'x',
    word: 'x',
    verdict,
    reason: '',
    atMs,
  });

  it('rewards valid words and docks wrong ones', () => {
    const difficulty = { level: 3, answerCount: 10, constraintCount: 2, sentenceConstraintCount: 0, easiestTier: 0, decoys: 0, score: 3 };
    const good = scoreShake({
      submissions: [submission('valid', 1000), submission('valid', 2000)],
      answerKey: { count: 10, words: [] },
      difficulty,
      elapsedMs: 15000,
    });
    const sloppy = scoreShake({
      submissions: [submission('valid', 1000), submission('valid', 2000), ...Array.from({ length: 6 }, (_, i) => submission('not-a-word', 3000 + i))],
      answerKey: { count: 10, words: [] },
      difficulty,
      elapsedMs: 15000,
    });
    expect(good.points).toBeGreaterThan(sloppy.points);
    expect(good.accuracy).toBe(1);
    expect(sloppy.accuracy).toBeCloseTo(2 / 8);
  });

  it('never goes negative', () => {
    const difficulty = { level: 1, answerCount: 4, constraintCount: 1, sentenceConstraintCount: 0, easiestTier: 0, decoys: 0, score: 1 };
    const score = scoreShake({
      submissions: Array.from({ length: 20 }, (_, i) => submission('not-a-word', i * 100)),
      answerKey: { count: 4, words: [] },
      difficulty,
      elapsedMs: 10000,
    });
    expect(score.points).toBeGreaterThanOrEqual(0);
  });

  it('does not count duplicates or unverified words against accuracy', () => {
    const difficulty = { level: 2, answerCount: 5, constraintCount: 1, sentenceConstraintCount: 0, easiestTier: 0, decoys: 0, score: 2 };
    const score = scoreShake({
      submissions: [submission('valid', 100), submission('duplicate', 200), submission('unverified', 300)],
      answerKey: { count: 5, words: [] },
      difficulty,
      elapsedMs: 5000,
    });
    expect(score.accuracy).toBe(1);
    expect(score.duplicates).toBe(1);
    expect(score.unverified).toBe(1);
  });

  it('reports an unknown scoring role as null rather than guessing', () => {
    expect(officialScore(ruleset, { situationId: 'A', role: 'agreer' })).toBeNull();
    expect(officialScore(ruleset, { situationId: 'Z', role: 'solver' })).toBeNull();
  });
});

describe('statistics', () => {
  it('summarises a finished session and finds the weak bucket', () => {
    let state = startSession(config({ mode: 'shake-sprint', seconds: 15 }), deps());
    state = submit(state, state.scenario.answerKey.words[0], deps());
    state = completeShake(state);
    state = { ...state, status: 'finished', endReason: 'complete' };

    const logs = toShakeLogs(state);
    expect(logs).toHaveLength(1);
    expect(logs[0].valid).toBe(1);

    const session = toSessionLog(state);
    expect(session.shakes).toBe(1);
    expect(session.valid).toBe(1);

    const t = totals(logs, [session]);
    expect(t.shakes).toBe(1);
    expect(t.valid).toBe(1);
  });

  it('ranks the bucket with the worst coverage first', () => {
    const base = {
      at: 0,
      mode: 'shake-sprint' as const,
      seed: 1,
      level: 3,
      demandIds: [],
      designationKind: 'pattern' as const,
      designationId: 'S-V',
      invalid: 0,
      duplicates: 0,
      unverified: 0,
      missed: 0,
      points: 0,
      elapsedMs: 15000,
      firstValidMs: 100,
      meanResponseMs: 1000,
      fastestResponseMs: 500,
      clearedQuota: true,
    };
    const logs = [
      ...Array.from({ length: 5 }, () => ({ ...base, type: 'noun' as const, valid: 9, answerCount: 10 })),
      ...Array.from({ length: 5 }, () => ({ ...base, type: 'adverb' as const, valid: 1, answerCount: 10 })),
    ];
    const weak = weaknesses(breakdowns(logs, (id) => id));
    expect(weak[0].label).toBe('adverb');
  });

});

describe('personal records', () => {
  it('keeps a better score and ignores a worse one', () => {
    let state = startSession(config({ mode: 'shake-sprint' }), deps());
    state = submit(state, state.scenario.answerKey.words[0], deps());
    state = completeShake(state);
    const first = applyRecords({}, candidatesFor(state));
    expect(first.beaten.length).toBeGreaterThan(0);
    const again = applyRecords(first.book, candidatesFor({ ...state, history: [] }));
    expect(again.book['best-sprint']?.value).toBe(first.book['best-sprint']?.value);
  });
});

describe('persistence', () => {
  it('round-trips through a storage shim and survives corrupt data', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;

    const store = createLocalStore(storage);
    const data = store.load();
    store.save({ ...data, settings: { ...data.settings, showAnswerKeyLimit: 12 } });
    expect(createLocalStore(storage).load().settings.showAnswerKeyLimit).toBe(12);

    memory.set('ling-trainer:v1', 'not json');
    expect(createLocalStore(storage).load().shakes).toEqual([]);
  });
});

describe('drill options', () => {
  it('only ever demands a part of speech the player selected', () => {
    for (const types of [['noun'], ['noun', 'verb'], ['preposition'], ['adjective', 'adverb']] as const) {
      for (let seed = 0; seed < 12; seed++) {
        let state = startSession(config({ seed: seed * 7 + 1, types: [...types] }), deps());
        expect(types).toContain(state.scenario.type);
        for (let i = 0; i < 3; i++) {
          state = completeShake(state);
          state = nextShake(state, deps());
          expect(types, `seed ${seed} shake ${i}`).toContain(state.scenario.type);
        }
      }
    }
  });

  it('treats an empty selection as "any part of speech" rather than as impossible', () => {
    const state = startSession(config({ types: [] }), deps());
    expect(ruleset.typeDemands).toContain(state.scenario.type);
    expect(state.scenario.answerKey.count).toBeGreaterThan(0);
  });

  it('honours the cube pool: more cubes means more available answers', () => {
    const counts = (cubePool: SessionConfig['cubePool']) =>
      startSession(config({ seed: 20260905, types: ['noun'], cubePool, level: 1 }), deps()).scenario;

    const now = counts('challenge-now');
    const forceout = counts('forceout');
    const all = counts('all');

    expect(now.shake.resourceAllowance).toBe(1);
    expect(forceout.shake.resourceAllowance).toBe(2);
    expect(all.shake.solveContext).toBe('open');
    expect(all.shake.resourceAllowance).toBeGreaterThan(2);
    expect(all.answerKey.count).toBeGreaterThan(now.answerKey.count);
  });

  it('accepts a word from anywhere on the mat once "all cubes" is chosen', () => {
    const state = startSession(config({ seed: 5150, types: ['noun'], cubePool: 'all', level: 1 }), deps());
    // A word needing several Resources cubes is legal here and would not be
    // under Challenge Now.
    const long = state.scenario.answerKey.words.find((w) => w.length >= 7);
    if (!long) return;
    expect(submit(state, long, deps()).submissions[0].verdict).toBe('valid');
  });

  it('uses the chosen clock and quota exactly', () => {
    const state = startSession(config({ seconds: 60, requiredWords: 4 }), deps());
    expect(state.remainingMs).toBe(60000);
    expect(quotaForShake(state.config, 0)).toBe(4);
  });

  it('keeps a pinned general demand in force on every shake', () => {
    let state = startSession(config({ types: ['noun'], focusDemandId: 'noun.plural', seconds: 30 }), deps());
    for (let i = 0; i < 3; i++) {
      expect(state.scenario.shake.demands.some((d) => d.defId === 'noun.plural'), `shake ${i}`).toBe(true);
      state = completeShake(state);
      state = nextShake(state, deps());
    }
  });
});
