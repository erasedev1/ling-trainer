import type { SubmissionResult } from '../types';
import type { DifficultyProfile } from '../generator/scenario';
import type { Ruleset, ScoringSituation } from '../../../data/senior-2026';

/**
 * TRAINING SCORE — not official AGLOA scoring.
 *
 * Official scoring (LT 19–20, Scoring Chart) awards 6/4/2 to three players per
 * shake and has no meaning for a solo speed drill. This is a separate,
 * deliberately-labelled measure. `officialScore()` below implements the real
 * chart and is used by the rule-knowledge drills.
 */
export const TRAINING_SCORE_LABEL = 'Training score (not official AGLOA scoring)';

export interface ShakeScore {
  /** Points for this shake. */
  points: number;
  valid: number;
  invalid: number;
  duplicates: number;
  unverified: number;
  missed: number;
  accuracy: number;
  /** Valid words per minute. */
  wpm: number;
  /** ms to the first valid word, or null. */
  firstValidMs: number | null;
  /** Mean gap between valid submissions, ms. */
  meanResponseMs: number | null;
  fastestResponseMs: number | null;
}

export interface ScoreInput {
  submissions: SubmissionResult[];
  answerKey: { count: number; words: string[] };
  difficulty: DifficultyProfile;
  elapsedMs: number;
}

/**
 * Points reward *hard* words found *fast*, and dock careless guessing.
 *
 * A valid word is worth more when the shake is constrained (difficulty level)
 * and when few answers exist. Wrong submissions cost a point each, capped so a
 * bad shake cannot go arbitrarily negative — the aim is to discourage spraying
 * the keyboard, not to punish a player into quitting.
 */
export function scoreShake(input: ScoreInput): ShakeScore {
  const { submissions, answerKey, difficulty, elapsedMs } = input;
  const valid = submissions.filter((s) => s.verdict === 'valid');
  const duplicates = submissions.filter((s) => s.verdict === 'duplicate').length;
  const unverified = submissions.filter((s) => s.verdict === 'unverified').length;
  const invalid = submissions.filter(
    (s) => s.verdict === 'not-a-word' || s.verdict === 'not-spellable' || s.verdict === 'fails-demand' || s.verdict === 'bad-form',
  ).length;

  const graded = valid.length + invalid;
  const accuracy = graded ? valid.length / graded : 1;

  const perWord = 8 + difficulty.level * 3;
  const scarcityBonus = answerKey.count > 0 && answerKey.count <= 6 ? 6 : 0;
  const base = valid.length * (perWord + scarcityBonus);
  const penalty = Math.min(invalid * 6, base * 0.5 + 12);

  // Finding most of what exists is worth as much as raw speed.
  const coverage = answerKey.count ? valid.length / answerKey.count : 0;
  const completion = coverage >= 0.999 ? 25 : Math.round(coverage * 20);

  const times = valid.map((s) => s.atMs).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 0; i < times.length; i++) gaps.push(times[i] - (i === 0 ? 0 : times[i - 1]));

  return {
    points: Math.max(0, Math.round(base - penalty + completion)),
    valid: valid.length,
    invalid,
    duplicates,
    unverified,
    missed: Math.max(0, answerKey.count - valid.length),
    accuracy,
    wpm: elapsedMs > 0 ? (valid.length / elapsedMs) * 60000 : 0,
    firstValidMs: times.length ? times[0] : null,
    meanResponseMs: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    fastestResponseMs: gaps.length ? Math.min(...gaps) : null,
  };
}

export interface OfficialScoreQuery {
  situationId: string;
  role: string;
  /** LT 26 #3 — leader four or more ahead at the warning. */
  fourAheadAtWarning?: boolean;
}

/** Official per-shake points from the Scoring Chart, for the rule drills. */
export function officialScore(ruleset: Ruleset, query: OfficialScoreQuery): number | null {
  const situation: ScoringSituation | undefined = ruleset.scoring.situations.find((s) => s.id === query.situationId);
  if (!situation) return null;
  if (query.situationId === 'C' && query.role === 'neutral' && query.fourAheadAtWarning) return 6;
  if (situation.six.includes(query.role)) return 6;
  if (situation.four.includes(query.role)) return 4;
  if (situation.two.includes(query.role)) return 2;
  return null;
}
