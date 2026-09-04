import type { ModeId, SessionState, ShakeRecord } from '../modes/session';
import type { PartOfSpeech } from '../types';

/** One finished shake, flattened for storage. Everything the stats need. */
export interface ShakeLog {
  at: number;
  mode: ModeId;
  seed: number;
  level: number;
  type: PartOfSpeech;
  functionId?: string;
  /** Demand def ids in force, so weakness can be attributed to a demand. */
  demandIds: string[];
  designationKind: 'pattern' | 'structure' | 'purpose';
  designationId: string;
  valid: number;
  invalid: number;
  duplicates: number;
  unverified: number;
  missed: number;
  answerCount: number;
  points: number;
  elapsedMs: number;
  firstValidMs: number | null;
  meanResponseMs: number | null;
  fastestResponseMs: number | null;
  clearedQuota: boolean;
}

export interface SessionLog {
  id: string;
  at: number;
  mode: ModeId;
  seed: number;
  durationMs: number;
  points: number;
  shakes: number;
  valid: number;
  invalid: number;
  accuracy: number;
  /** Progressive Speed only. */
  level?: number;
}

export function toShakeLogs(state: SessionState): ShakeLog[] {
  return state.history.map((record: ShakeRecord) => ({
    at: Date.now(),
    mode: state.config.mode,
    seed: record.scenario.seed,
    level: record.level,
    type: record.scenario.type,
    functionId: record.scenario.functionDemand?.id,
    demandIds: record.scenario.shake.demands.map((d) => d.defId),
    designationKind: record.scenario.designation.kind,
    designationId: record.scenario.designation.id,
    valid: record.score.valid,
    invalid: record.score.invalid,
    duplicates: record.score.duplicates,
    unverified: record.score.unverified,
    missed: record.score.missed,
    answerCount: record.scenario.answerKey.count,
    points: record.score.points,
    elapsedMs: record.elapsedMs,
    firstValidMs: record.score.firstValidMs,
    meanResponseMs: record.score.meanResponseMs,
    fastestResponseMs: record.score.fastestResponseMs,
    clearedQuota: record.clearedQuota,
  }));
}

export function toSessionLog(state: SessionState): SessionLog {
  const valid = state.history.reduce((s, r) => s + r.score.valid, 0);
  const invalid = state.history.reduce((s, r) => s + r.score.invalid, 0);
  return {
    id: `${state.config.mode}-${state.config.seed}-${Date.now()}`,
    at: Date.now(),
    mode: state.config.mode,
    seed: state.config.seed,
    durationMs: state.sessionElapsedMs,
    points: state.history.reduce((s, r) => s + r.score.points, 0),
    shakes: state.history.length,
    valid,
    invalid,
    accuracy: valid + invalid ? valid / (valid + invalid) : 1,
    level: state.history.length ? Math.max(...state.history.map((r) => r.level)) : undefined,
  };
}

/**
 * One answered judgement item. These carry the sentence-level topics — clause
 * function, phrase function, retained objects — that the shake drills cannot
 * measure, so the dashboard needs both logs to answer "what should I practise?".
 */
export interface JudgementLog {
  at: number;
  itemId: string;
  kind: 'analysis' | 'validation' | 'rule';
  topics: string[];
  correct: boolean;
}

export interface Bucket {
  key: string;
  label: string;
  shakes: number;
  valid: number;
  invalid: number;
  missed: number;
  answerCount: number;
  /** Valid ÷ (valid + invalid) — how clean the player's guesses are. */
  accuracy: number;
  /** Valid ÷ answers available — how much of the shake they actually found. */
  coverage: number;
  meanResponseMs: number | null;
  points: number;
}

function emptyBucket(key: string, label: string): Bucket {
  return { key, label, shakes: 0, valid: 0, invalid: 0, missed: 0, answerCount: 0, accuracy: 1, coverage: 0, meanResponseMs: null, points: 0 };
}

function finalise(bucket: Bucket, responseTotals: { sum: number; n: number }): Bucket {
  const graded = bucket.valid + bucket.invalid;
  return {
    ...bucket,
    accuracy: graded ? bucket.valid / graded : 1,
    coverage: bucket.answerCount ? bucket.valid / bucket.answerCount : 0,
    meanResponseMs: responseTotals.n ? responseTotals.sum / responseTotals.n : null,
  };
}

function group(logs: ShakeLog[], keyOf: (log: ShakeLog) => string[], label: (key: string) => string): Bucket[] {
  const buckets = new Map<string, Bucket>();
  const responses = new Map<string, { sum: number; n: number }>();
  for (const log of logs) {
    for (const key of keyOf(log)) {
      const bucket = buckets.get(key) ?? emptyBucket(key, label(key));
      bucket.shakes += 1;
      bucket.valid += log.valid;
      bucket.invalid += log.invalid;
      bucket.missed += log.missed;
      bucket.answerCount += log.answerCount;
      bucket.points += log.points;
      buckets.set(key, bucket);
      const r = responses.get(key) ?? { sum: 0, n: 0 };
      if (log.meanResponseMs != null) {
        r.sum += log.meanResponseMs;
        r.n += 1;
      }
      responses.set(key, r);
    }
  }
  return [...buckets.values()].map((b) => finalise(b, responses.get(b.key) ?? { sum: 0, n: 0 }));
}

export interface Breakdowns {
  byType: Bucket[];
  byDemand: Bucket[];
  byDesignation: Bucket[];
  byLevel: Bucket[];
  byTopic: Bucket[];
}

/** Human label for a judgement topic key such as `phrase.gerund`. */
export function topicLabel(key: string): string {
  const [head, ...rest] = key.split(/[.:]/);
  const tail = rest.join(' ').replace(/-/g, ' ');
  switch (head) {
    case 'clause':
      return `${tail} clause`;
    case 'phrase':
      return `${tail} phrase`;
    case 'function':
      return `${tail} (function)`;
    case 'pattern':
      return `pattern ${tail}`;
    case 'structure':
      return `${tail} structure`;
    case 'purpose':
      return `${tail} purpose`;
    case 'type':
      return `${tail} (type demand)`;
    case 'quote':
      return `${tail} quote`;
    case 'rule':
      return `rule: ${tail}`;
    case 'word':
    case 'sentence':
      return `${head} — ${tail}`;
    default:
      return key.replace(/[.:]/g, ' ');
  }
}

/**
 * Judgement items graded per topic. Coverage and accuracy are the same number
 * here (an item is right or wrong), which keeps them comparable with the shake
 * buckets when weaknesses are ranked.
 */
export function topicBreakdown(logs: JudgementLog[]): Bucket[] {
  const buckets = new Map<string, Bucket>();
  for (const log of logs) {
    for (const topic of log.topics) {
      const bucket = buckets.get(topic) ?? emptyBucket(topic, topicLabel(topic));
      bucket.shakes += 1;
      bucket.answerCount += 1;
      bucket.valid += log.correct ? 1 : 0;
      bucket.invalid += log.correct ? 0 : 1;
      buckets.set(topic, bucket);
    }
  }
  return [...buckets.values()].map((b) => finalise(b, { sum: 0, n: 0 }));
}

export function breakdowns(
  logs: ShakeLog[],
  demandLabel: (id: string) => string,
  judgement: JudgementLog[] = [],
): Breakdowns {
  return {
    byTopic: topicBreakdown(judgement),
    byType: group(logs, (l) => [l.type], (k) => k),
    byDemand: group(
      logs,
      (l) => l.demandIds.filter((id) => id !== 'demand.type' && id !== 'demand.function'),
      demandLabel,
    ),
    byDesignation: group(logs, (l) => [`${l.designationKind}:${l.designationId}`], (k) => k.split(':')[1]),
    byLevel: group(logs, (l) => [`L${l.level}`], (k) => `Level ${k.slice(1)}`),
  };
}

export interface Weakness {
  key: string;
  label: string;
  /** What the dashboard should say. */
  message: string;
  /** 0..1 — lower is worse. */
  strength: number;
  shakes: number;
  kind: 'type' | 'demand' | 'designation' | 'topic';
}

/**
 * Answer the only question statistics need to answer: what should I practise next?
 *
 * Strength blends coverage (did you find what was there?) with accuracy (were
 * your guesses clean?), because either failure mode loses a shake in real play.
 * Buckets with too little data are ignored rather than guessed at, and a bucket
 * the player is already good at is never reported — an empty result means
 * "nothing is clearly weak yet", not "everything is bad".
 */
export function weaknesses(
  breaks: Breakdowns,
  { minShakes = 4, maxStrength = 0.8 }: { minShakes?: number; maxStrength?: number } = {},
): Weakness[] {
  const out: Weakness[] = [];
  const consider = (buckets: Bucket[], kind: Weakness['kind']) => {
    for (const bucket of buckets) {
      if (bucket.shakes < minShakes) continue;
      const strength = kind === 'topic' ? bucket.accuracy : bucket.coverage * 0.6 + bucket.accuracy * 0.4;
      // A bucket the player is good at is not a weakness, however it ranks.
      if (strength > maxStrength) continue;
      out.push({
        key: bucket.key,
        label: bucket.label,
        kind,
        strength,
        shakes: bucket.shakes,
        message:
          kind === 'topic'
            ? `You answer ${Math.round(bucket.accuracy * 100)}% of these judgement items correctly.`
            : bucket.accuracy < 0.7
              ? `${Math.round(bucket.accuracy * 100)}% of your submissions here are legal — you are guessing.`
              : `You find ${Math.round(bucket.coverage * 100)}% of the available words here.`,
      });
    }
  };
  consider(breaks.byType, 'type');
  consider(breaks.byDemand, 'demand');
  consider(breaks.byDesignation, 'designation');
  consider(breaks.byTopic, 'topic');
  return out.sort((a, b) => a.strength - b.strength);
}

export interface Totals {
  sessions: number;
  shakes: number;
  submitted: number;
  valid: number;
  invalid: number;
  duplicates: number;
  unverified: number;
  accuracy: number;
  coverage: number;
  points: number;
  wordsPerMinute: number;
  fastestResponseMs: number | null;
  meanResponseMs: number | null;
  timeMs: number;
}

export function totals(logs: ShakeLog[], sessions: SessionLog[]): Totals {
  const valid = logs.reduce((s, l) => s + l.valid, 0);
  const invalid = logs.reduce((s, l) => s + l.invalid, 0);
  const duplicates = logs.reduce((s, l) => s + l.duplicates, 0);
  const unverified = logs.reduce((s, l) => s + l.unverified, 0);
  const answers = logs.reduce((s, l) => s + l.answerCount, 0);
  const timeMs = logs.reduce((s, l) => s + l.elapsedMs, 0);
  const responses = logs.map((l) => l.meanResponseMs).filter((v): v is number => v != null);
  const fastest = logs.map((l) => l.fastestResponseMs).filter((v): v is number => v != null);
  return {
    sessions: sessions.length,
    shakes: logs.length,
    submitted: valid + invalid + duplicates + unverified,
    valid,
    invalid,
    duplicates,
    unverified,
    accuracy: valid + invalid ? valid / (valid + invalid) : 1,
    coverage: answers ? valid / answers : 0,
    points: logs.reduce((s, l) => s + l.points, 0),
    wordsPerMinute: timeMs ? (valid / timeMs) * 60000 : 0,
    fastestResponseMs: fastest.length ? Math.min(...fastest) : null,
    meanResponseMs: responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null,
    timeMs,
  };
}
