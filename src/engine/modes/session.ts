import type { PartOfSpeech, SubmissionResult } from '../types';
import type { Lexicon } from '../lexicon/lexicon';
import type { Ruleset } from '../../../data/senior-2026';
import type { CubeSet } from '../types';
import { generateAtLevel, type Scenario } from '../generator/scenario';
import { gradeSubmission } from '../demands/solve';
import { scoreShake, type ShakeScore } from '../scoring/score';

export type ModeId =
  | 'shake-sprint'
  | 'x-in-y'
  | 'max-out'
  | 'category-gauntlet'
  | 'random-gauntlet'
  | 'progressive'
  | 'simulation';

export interface ModeSpec {
  id: ModeId;
  name: string;
  tagline: string;
  /** Seconds on the clock for one shake, or for the whole session. */
  clock: 'per-shake' | 'per-session';
  defaultSeconds: number;
  /** Valid words required to clear a shake, if any. */
  requiredWords?: number;
  /** The session ends after this many shakes, if fixed. */
  shakeCount?: number;
  /** Difficulty escalates with each cleared shake. */
  escalating?: boolean;
  /** Player cannot change any setting once started (LT-style discipline). */
  locked?: boolean;
  description: string;
}

export const MODES: Record<ModeId, ModeSpec> = {
  'shake-sprint': {
    id: 'shake-sprint',
    name: 'Shake Sprint',
    tagline: 'One shake. One clock. Every word you can find.',
    clock: 'per-shake',
    defaultSeconds: 15,
    description:
      'A generated Senior shake with a full demand stack. Type every legal word you can before the clock stops, then see what you missed.',
  },
  'x-in-y': {
    id: 'x-in-y',
    name: 'X in Y',
    tagline: 'Hit the quota before the clock does.',
    clock: 'per-shake',
    defaultSeconds: 15,
    requiredWords: 3,
    description:
      'Find a set number of valid words inside a set time. The shake is chosen so the quota is reachable — difficulty comes from the demands, not from an impossible target.',
  },
  'max-out': {
    id: 'max-out',
    name: 'Max Out',
    tagline: 'How many can you find in thirty seconds?',
    clock: 'per-shake',
    defaultSeconds: 30,
    description: 'One open shake, a long clock, and a personal record to beat.',
  },
  'category-gauntlet': {
    id: 'category-gauntlet',
    name: 'Category Gauntlet',
    tagline: 'Grind one weak area until it stops being weak.',
    clock: 'per-session',
    defaultSeconds: 60,
    requiredWords: 1,
    description:
      'Consecutive shakes that all use the Type Demand or general demand you pick. Clear a shake by finding a valid word; the session clock never stops.',
  },
  'random-gauntlet': {
    id: 'random-gauntlet',
    name: 'Random Gauntlet',
    tagline: 'You do not get to know what is coming.',
    clock: 'per-session',
    defaultSeconds: 60,
    requiredWords: 1,
    description: 'Same as the Category Gauntlet, with the demand stack drawn at random each shake. Trains adaptability.',
  },
  progressive: {
    id: 'progressive',
    name: 'Progressive Speed',
    tagline: 'Less time, more words, harder shakes. How far do you get?',
    clock: 'per-shake',
    defaultSeconds: 24,
    requiredWords: 1,
    escalating: true,
    description:
      'Every level cuts the clock, raises the word quota, and adds constraints. Miss the quota once and the run ends.',
  },
  simulation: {
    id: 'simulation',
    name: 'Senior Simulation',
    tagline: 'A fixed sequence. No pausing, no skipping, no restarts.',
    clock: 'per-shake',
    defaultSeconds: 20,
    shakeCount: 12,
    locked: true,
    description:
      'Twelve shakes drawn across the whole Senior demand set at competition-like pressure, then a full performance report. Nothing is adjustable once it starts.',
  },
};

/**
 * How much of the mat a solver may use.
 *
 * The rules ration Resources differently depending on how the shake ends, and
 * each is worth practising: 'challenge-now' is the live-play case (LT 19 A),
 * 'forceout' the two-cube case (LT 24), and 'all' opens every rolled cube for a
 * pure vocabulary sprint.
 */
export type CubePool = 'challenge-now' | 'forceout' | 'all';

export const CUBE_POOLS: { id: CubePool; label: string; detail: string }[] = [
  { id: 'challenge-now', label: 'Letters + 1', detail: 'Challenge Now — the cubes on the mat plus one from Resources (LT 19 A)' },
  { id: 'forceout', label: 'Letters + 2', detail: 'Forceout — the cubes on the mat plus two from Resources (LT 24)' },
  { id: 'all', label: 'All cubes', detail: 'Every rolled cube is available — a pure speed drill, not a live-play position' },
];

export interface SessionConfig {
  mode: ModeId;
  seed: number;
  seconds: number;
  requiredWords?: number;
  /** Extra general demands stacked on the shake, 1 (none) … 5 (heavy). */
  level: number;
  /** Type Demands the shake may use. Empty means all of them. */
  types: PartOfSpeech[];
  /** Which cubes the solver may draw on. */
  cubePool: CubePool;
  /** Pin one general demand into every shake. */
  focusDemandId?: string;
}

/** Config for a mode with nothing chosen yet. */
export function defaultConfig(mode: ModeId, seed: number): SessionConfig {
  const spec = MODES[mode];
  return {
    mode,
    seed,
    seconds: spec.defaultSeconds,
    requiredWords: spec.requiredWords,
    level: 3,
    types: [],
    cubePool: 'challenge-now',
  };
}

export interface ShakeRecord {
  scenario: Scenario;
  submissions: SubmissionResult[];
  score: ShakeScore;
  clearedQuota: boolean;
  elapsedMs: number;
  level: number;
}

export interface SessionState {
  config: SessionConfig;
  status: 'idle' | 'running' | 'shake-complete' | 'finished';
  scenario: Scenario;
  /** Shakes already finished this session. */
  history: ShakeRecord[];
  submissions: SubmissionResult[];
  seen: Set<string>;
  /** ms remaining on whichever clock the mode uses. */
  remainingMs: number;
  /** ms elapsed on the current shake. */
  shakeElapsedMs: number;
  /** ms elapsed across the whole session. */
  sessionElapsedMs: number;
  level: number;
  shakeIndex: number;
  /** Set when the session ended, with the reason. */
  endReason?: 'time' | 'failed-quota' | 'complete';
}

export interface SessionDeps {
  ruleset: Ruleset;
  cubeSet: CubeSet;
  lexicon: Lexicon;
}

function nextScenario(config: SessionConfig, deps: SessionDeps, index: number): Scenario {
  const spec = MODES[config.mode];
  const level = spec.escalating ? Math.min(5, 1 + Math.floor(index / 2)) : config.level;
  return generateAtLevel({
    seed: (config.seed + index * 104729) >>> 0,
    ruleset: deps.ruleset,
    cubeSet: deps.cubeSet,
    lexicon: deps.lexicon,
    targetLevel: level,
    types: config.types,
    requireDemandId: config.focusDemandId,
    solveContext: config.cubePool === 'all' ? 'open' : config.cubePool,
    minAnswers: Math.max(1, (config.requiredWords ?? spec.requiredWords ?? 1) + 1),
  });
}

/** Seconds allowed for shake `index`, which shrinks in escalating modes. */
export function secondsForShake(config: SessionConfig, index: number): number {
  const spec = MODES[config.mode];
  if (!spec.escalating) return config.seconds;
  return Math.max(6, config.seconds - index * 2);
}

/** Valid words needed to clear shake `index`. */
export function quotaForShake(config: SessionConfig, index: number): number {
  const spec = MODES[config.mode];
  const base = config.requiredWords ?? spec.requiredWords ?? 0;
  if (!spec.escalating) return base;
  return base + Math.floor(index / 3);
}

export function startSession(config: SessionConfig, deps: SessionDeps): SessionState {
  const spec = MODES[config.mode];
  const scenario = nextScenario(config, deps, 0);
  const clockMs =
    spec.clock === 'per-session' ? config.seconds * 1000 : secondsForShake(config, 0) * 1000;
  return {
    config,
    status: 'running',
    scenario,
    history: [],
    submissions: [],
    seen: new Set(),
    remainingMs: clockMs,
    shakeElapsedMs: 0,
    sessionElapsedMs: 0,
    level: scenario.difficulty.level,
    shakeIndex: 0,
  };
}

export function submit(state: SessionState, raw: string, deps: SessionDeps): SessionState {
  if (state.status !== 'running') return state;
  const result = gradeSubmission(raw, {
    shake: state.scenario.shake,
    lexicon: deps.lexicon,
    ruleset: deps.ruleset,
    seen: state.seen,
    atMs: state.shakeElapsedMs,
  });
  const seen = new Set(state.seen);
  if (result.verdict === 'valid' || result.verdict === 'unverified') seen.add(result.word);
  return { ...state, submissions: [...state.submissions, result], seen };
}

export function tick(state: SessionState, deltaMs: number): SessionState {
  if (state.status !== 'running') return state;
  const spec = MODES[state.config.mode];
  const remainingMs = state.remainingMs - deltaMs;
  const next: SessionState = {
    ...state,
    remainingMs,
    shakeElapsedMs: state.shakeElapsedMs + deltaMs,
    sessionElapsedMs: state.sessionElapsedMs + deltaMs,
  };
  if (remainingMs > 0) return next;
  return spec.clock === 'per-session' ? finishSession(completeShake(next), 'time') : completeShake(next);
}

/** End the current shake and record it. Does not advance. */
export function completeShake(state: SessionState): SessionState {
  const quota = quotaForShake(state.config, state.shakeIndex);
  const score = scoreShake({
    submissions: state.submissions,
    answerKey: state.scenario.answerKey,
    difficulty: state.scenario.difficulty,
    elapsedMs: state.shakeElapsedMs,
  });
  const record: ShakeRecord = {
    scenario: state.scenario,
    submissions: state.submissions,
    score,
    clearedQuota: score.valid >= quota,
    elapsedMs: state.shakeElapsedMs,
    level: state.scenario.difficulty.level,
  };
  return { ...state, status: 'shake-complete', history: [...state.history, record] };
}

export function nextShake(state: SessionState, deps: SessionDeps): SessionState {
  const spec = MODES[state.config.mode];
  const last = state.history[state.history.length - 1];

  if (spec.escalating && last && !last.clearedQuota) return finishSession(state, 'failed-quota');
  if (spec.shakeCount && state.history.length >= spec.shakeCount) return finishSession(state, 'complete');
  if (spec.clock === 'per-session' && state.remainingMs <= 0) return finishSession(state, 'time');

  const index = state.shakeIndex + 1;
  const scenario = nextScenario(state.config, deps, index);
  return {
    ...state,
    status: 'running',
    scenario,
    submissions: [],
    seen: new Set(),
    shakeIndex: index,
    shakeElapsedMs: 0,
    remainingMs: spec.clock === 'per-session' ? state.remainingMs : secondsForShake(state.config, index) * 1000,
    level: scenario.difficulty.level,
  };
}

export function finishSession(state: SessionState, reason: SessionState['endReason']): SessionState {
  return { ...state, status: 'finished', endReason: reason };
}

/** Whether the session has more shakes to give. */
export function isSessionOver(state: SessionState): boolean {
  const spec = MODES[state.config.mode];
  if (state.status === 'finished') return true;
  const last = state.history[state.history.length - 1];
  if (spec.escalating && last && !last.clearedQuota) return true;
  if (spec.shakeCount && state.history.length >= spec.shakeCount) return true;
  if (spec.clock === 'per-session' && state.remainingMs <= 0) return true;
  return false;
}
