import type { PartOfSpeech } from '../types';
import type { DrillResult, DrillState } from '../roll/session';

/** One finished drill, flattened for storage. */
export interface RollLog {
  at: number;
  seed: number;
  seconds: number;
  /** Parts of speech the player selected. Empty means all of them. */
  types: PartOfSpeech[];
  valid: number;
  invalid: number;
  duplicates: number;
  unverified: number;
  available: number;
  accuracy: number;
  wordsPerMinute: number;
  fastestGapMs: number | null;
  /** Words found and words available, per selected part of speech. */
  foundByType: Record<string, number>;
  availableByType: Record<string, number>;
}

export function toRollLog(state: DrillState, result: DrillResult): RollLog {
  return {
    at: Date.now(),
    seed: state.config.seed,
    seconds: state.config.seconds,
    types: state.config.types,
    valid: result.valid,
    invalid: result.invalid,
    duplicates: result.duplicates,
    unverified: result.unverified,
    available: state.key.count,
    accuracy: result.accuracy,
    wordsPerMinute: result.wordsPerMinute,
    fastestGapMs: result.fastestGapMs,
    foundByType: result.foundByType,
    availableByType: state.key.availableByType,
  };
}

export interface Totals {
  rolls: number;
  submitted: number;
  valid: number;
  invalid: number;
  duplicates: number;
  accuracy: number;
  wordsPerMinute: number;
  timeMs: number;
}

export function totals(logs: RollLog[]): Totals {
  const valid = logs.reduce((s, l) => s + l.valid, 0);
  const invalid = logs.reduce((s, l) => s + l.invalid, 0);
  const duplicates = logs.reduce((s, l) => s + l.duplicates, 0);
  const timeMs = logs.reduce((s, l) => s + l.seconds * 1000, 0);
  return {
    rolls: logs.length,
    submitted: valid + invalid + duplicates,
    valid,
    invalid,
    duplicates,
    accuracy: valid + invalid ? valid / (valid + invalid) : 1,
    wordsPerMinute: timeMs ? (valid / timeMs) * 60000 : 0,
    timeMs,
  };
}

export interface TypeStat {
  type: PartOfSpeech;
  /** Rolls where this part of speech was in play. */
  rolls: number;
  found: number;
  secondsSpent: number;
  /** Words of this part of speech found per minute. */
  perMinute: number;
}

/**
 * Per part of speech, how fast you find words of it.
 *
 * Rate, not coverage: a roll of all 23 cubes typically allows thousands of
 * words, so "share of what was available" would sit near zero for everyone and
 * say nothing. How many you actually get per minute is the number that moves.
 *
 * A word that is both a noun and a verb counts towards both, which is the
 * honest reading — you found a word that satisfied either demand.
 */
export function byType(logs: RollLog[]): TypeStat[] {
  const found = new Map<string, number>();
  const seconds = new Map<string, number>();
  const rolls = new Map<string, number>();

  for (const log of logs) {
    for (const type of Object.keys(log.availableByType)) {
      seconds.set(type, (seconds.get(type) ?? 0) + log.seconds);
      rolls.set(type, (rolls.get(type) ?? 0) + 1);
      found.set(type, (found.get(type) ?? 0) + (log.foundByType[type] ?? 0));
    }
  }

  return [...seconds.keys()]
    .map((type) => {
      const secondsSpent = seconds.get(type) ?? 0;
      const f = found.get(type) ?? 0;
      return {
        type: type as PartOfSpeech,
        rolls: rolls.get(type) ?? 0,
        found: f,
        secondsSpent,
        perMinute: secondsSpent ? (f / secondsSpent) * 60 : 0,
      };
    })
    .sort((x, y) => x.perMinute - y.perMinute);
}

/**
 * The part of speech worth practising next, or nothing.
 *
 * Needs a few rolls before it will say anything, and only speaks up when one
 * part of speech is clearly behind the player's best — an empty result means
 * "nothing stands out yet", not "everything is fine".
 */
export function weakestType(stats: TypeStat[], minRolls = 3, behindFactor = 0.6): TypeStat | undefined {
  const eligible = stats.filter((s) => s.rolls >= minRolls);
  if (eligible.length < 2) return undefined;
  const best = Math.max(...eligible.map((s) => s.perMinute));
  if (best <= 0) return undefined;
  const worst = eligible[0];
  return worst.perMinute < best * behindFactor ? worst : undefined;
}
