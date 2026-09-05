import type { PartOfSpeech, SubmissionResult } from '../types';
import type { CubeSet } from '../types';
import type { Lexicon } from '../lexicon/lexicon';
import { answerKey, createRoll, rollCounts, gradeWord, type AnswerKey, type Roll } from './roll';

export interface DrillConfig {
  seed: number;
  /** Parts of speech that count. Empty means every part of speech. */
  types: PartOfSpeech[];
  seconds: number;
}

export interface DrillDeps {
  cubeSet: CubeSet;
  lexicon: Lexicon;
  minLetters: number;
  maxLetters: number;
}

export interface DrillResult {
  valid: number;
  invalid: number;
  duplicates: number;
  unverified: number;
  missed: number;
  accuracy: number;
  /** Valid words per minute. */
  wordsPerMinute: number;
  /** ms to the first valid word. */
  firstValidMs: number | null;
  /** Mean gap between valid words, ms. */
  meanGapMs: number | null;
  fastestGapMs: number | null;
  /** How many words the roll allowed at all — context, not a target. */
  available: number;
  /** Words found that are usable as each chosen part of speech. */
  foundByType: Record<string, number>;
}

export interface DrillState {
  config: DrillConfig;
  status: 'running' | 'finished';
  roll: Roll;
  key: AnswerKey;
  /** Cached letter counts so grading never rebuilds them. */
  available: Int16Array;
  submissions: SubmissionResult[];
  seen: Set<string>;
  remainingMs: number;
  elapsedMs: number;
}

export function startDrill(config: DrillConfig, deps: DrillDeps): DrillState {
  const roll = createRoll({
    seed: config.seed,
    cubeSet: deps.cubeSet,
    types: config.types,
    minLetters: deps.minLetters,
    maxLetters: deps.maxLetters,
  });
  return {
    config,
    status: 'running',
    roll,
    key: answerKey(roll, deps.lexicon),
    available: rollCounts(roll),
    submissions: [],
    seen: new Set(),
    remainingMs: config.seconds * 1000,
    elapsedMs: 0,
  };
}

export function submitWord(state: DrillState, raw: string, deps: DrillDeps): DrillState {
  if (state.status !== 'running') return state;
  const result = gradeWord(raw, {
    roll: state.roll,
    lexicon: deps.lexicon,
    seen: state.seen,
    atMs: state.elapsedMs,
    available: state.available,
  });
  const seen = new Set(state.seen);
  if (result.verdict === 'valid' || result.verdict === 'unverified') seen.add(result.word);
  return { ...state, submissions: [...state.submissions, result], seen };
}

export function tickDrill(state: DrillState, deltaMs: number): DrillState {
  if (state.status !== 'running') return state;
  const remainingMs = state.remainingMs - deltaMs;
  const next: DrillState = { ...state, remainingMs, elapsedMs: state.elapsedMs + deltaMs };
  return remainingMs > 0 ? next : finishDrill(next);
}

export function finishDrill(state: DrillState): DrillState {
  return { ...state, status: 'finished', remainingMs: Math.max(0, state.remainingMs) };
}

export function resultOf(state: DrillState, lexicon: Lexicon): DrillResult {
  const valid = state.submissions.filter((s) => s.verdict === 'valid');
  const duplicates = state.submissions.filter((s) => s.verdict === 'duplicate').length;
  const unverified = state.submissions.filter((s) => s.verdict === 'unverified').length;
  const invalid = state.submissions.filter(
    (s) =>
      s.verdict === 'not-a-word' ||
      s.verdict === 'not-spellable' ||
      s.verdict === 'fails-demand' ||
      s.verdict === 'bad-form',
  ).length;

  const graded = valid.length + invalid;
  const times = valid.map((s) => s.atMs).sort((a, b) => a - b);
  const gaps = times.map((t, i) => t - (i === 0 ? 0 : times[i - 1]));

  const foundByType: Record<string, number> = {};
  for (const type of Object.keys(state.key.availableByType)) foundByType[type] = 0;
  for (const submission of valid) {
    const entry = lexicon.lookup(submission.word);
    if (!entry) continue;
    for (const type of Object.keys(foundByType)) {
      if (entry.pos.includes(type as PartOfSpeech)) foundByType[type]++;
    }
  }

  const elapsed = Math.max(1, state.elapsedMs);
  return {
    valid: valid.length,
    invalid,
    duplicates,
    unverified,
    missed: Math.max(0, state.key.count - valid.length),
    accuracy: graded ? valid.length / graded : 1,
    wordsPerMinute: (valid.length / elapsed) * 60000,
    firstValidMs: times.length ? times[0] : null,
    meanGapMs: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    fastestGapMs: gaps.length ? Math.min(...gaps) : null,
    available: state.key.count,
    foundByType,
  };
}
