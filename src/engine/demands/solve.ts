import type { Demand, PartOfSpeech, ShakeState, SubmissionResult, SubmissionVerdict } from '../types';
import type { LexEntry } from '../lexicon/types';
import { Lexicon, letterCounts } from '../lexicon/lexicon';
import { buildPool, canSpell, type LetterPool } from '../shake/pool';
import { DemandContext, FUNCTION_WORD_PREDICATES, WORD_PREDICATES } from './predicates';
import type { Ruleset } from '../../../data/senior-2026';

export function demandContext(shake: ShakeState): DemandContext {
  const type = shake.demands.find((d) => d.category === 'type');
  const fn = shake.demands.find((d) => d.category === 'function');
  return {
    type: (type?.params?.pos as PartOfSpeech) ?? 'noun',
    functionId: fn?.params?.functionId as string | undefined,
  };
}

export function wordScopedDemands(shake: ShakeState): Demand[] {
  return shake.demands.filter((d) => d.scope === 'word');
}

export function sentenceScopedDemands(shake: ShakeState): Demand[] {
  return shake.demands.filter((d) => d.scope === 'sentence');
}

/** Which word-scope demands does this entry fail? */
export function failedDemands(entry: LexEntry, word: string, shake: ShakeState, ctx = demandContext(shake)): string[] {
  const failed: string[] = [];
  if (!entry.pos.includes(ctx.type)) failed.push('type');
  if (ctx.functionId) {
    const fn = FUNCTION_WORD_PREDICATES[ctx.functionId];
    if (fn && !fn(entry)) failed.push(`function:${ctx.functionId}`);
  }
  for (const demand of wordScopedDemands(shake)) {
    const predicate = WORD_PREDICATES[demand.defId];
    if (predicate && !predicate(entry, word, demand, ctx)) failed.push(demand.defId);
  }
  return failed;
}

export interface AnswerKey {
  /** Every tagged word that satisfies the shake, easiest (most common) first. */
  words: string[];
  /** Words grouped by frequency tier, for the "how obscure was the miss" display. */
  byTier: Record<number, string[]>;
  /** How many answers exist at all — the drill's difficulty signal. */
  count: number;
}

/**
 * Enumerate every word in the lexicon that satisfies the shake.
 *
 * Only word-scope demands are applied (docs/RESEARCH.md §3), so the key is
 * complete with respect to what the trainer grades — it does not claim that
 * every listed word could be written into a legal sentence.
 */
export function solveShake(shake: ShakeState, lexicon: Lexicon, ruleset: Ruleset): AnswerKey {
  const pool = buildPool(shake);
  const ctx = demandContext(shake);
  const demands = wordScopedDemands(shake);
  const fnPredicate = ctx.functionId ? FUNCTION_WORD_PREDICATES[ctx.functionId] : undefined;
  const counts = lexicon.countsView();
  const hits: LexEntry[] = [];

  const candidates = lexicon.indicesForPos(ctx.type);
  for (let c = 0; c < candidates.length; c++) {
    const i = candidates[c];
    const length = lexicon.lengthAt(i);
    if (length < ruleset.word.minLetters || length > ruleset.word.maxLetters) continue;
    if (length > pool.maxLength) continue;

    const entry = lexicon.entryAt(i);
    if (fnPredicate && !fnPredicate(entry)) continue;

    let ok = true;
    for (const demand of demands) {
      const predicate = WORD_PREDICATES[demand.defId];
      if (predicate && !predicate(entry, entry.w, demand, ctx)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    if (!canSpell(counts, length, pool, i * 26)) continue;
    hits.push(entry);
  }

  hits.sort((a, b) => a.f - b.f || a.w.localeCompare(b.w));
  const byTier: Record<number, string[]> = {};
  for (const entry of hits) (byTier[entry.f] ??= []).push(entry.w);
  return { words: hits.map((e) => e.w), byTier, count: hits.length };
}

export interface GradeOptions {
  shake: ShakeState;
  lexicon: Lexicon;
  ruleset: Ruleset;
  /** Words already accepted this drill, for duplicate detection. */
  seen: Set<string>;
  atMs: number;
  pool?: LetterPool;
}

const REASONS: Record<SubmissionVerdict, string> = {
  valid: 'Valid.',
  duplicate: 'Already submitted this shake.',
  'not-a-word': 'Not in the trainer dictionary.',
  unverified: 'Real spelling, but the trainer has no part-of-speech data for it — not scored either way.',
  'not-spellable': 'Cannot be made from the cubes available.',
  'fails-demand': 'Does not satisfy every demand.',
  'bad-form': 'Not a legal word form.',
};

/** Grade one typed submission against the shake. Pure; never mutates `seen`. */
export function gradeSubmission(raw: string, opts: GradeOptions): SubmissionResult {
  const { shake, lexicon, ruleset, seen, atMs } = opts;
  const word = raw.trim().toLowerCase();
  const result = (verdict: SubmissionVerdict, extra?: Partial<SubmissionResult>): SubmissionResult => ({
    raw,
    word,
    verdict,
    reason: REASONS[verdict],
    atMs,
    ...extra,
  });

  if (!word) return result('bad-form', { reason: 'Empty submission.' });
  if (!/^[a-z]+$/.test(word)) {
    // LT 22 A: no contractions, hyphens, apostrophes, diacritics or proper nouns.
    return result('bad-form', {
      reason: 'LT 22 A — no contractions, hyphens, apostrophes, diacritics or proper nouns.',
    });
  }
  if (word.length < ruleset.word.minLetters || word.length > ruleset.word.maxLetters) {
    return result('bad-form', {
      reason: `LT 2 — the word must be ${ruleset.word.minLetters}–${ruleset.word.maxLetters} letters.`,
    });
  }
  if (seen.has(word)) return result('duplicate');

  const entry = lexicon.lookup(word);
  if (!entry) {
    return result(lexicon.isUntaggedSpelling(word) ? 'unverified' : 'not-a-word');
  }

  const pool = opts.pool ?? buildPool(shake);
  if (!canSpell(letterCounts(word), word.length, pool)) return result('not-spellable');

  const failed = failedDemands(entry, word, shake);
  if (failed.length) {
    return result('fails-demand', { failed, reason: describeFailure(failed, shake) });
  }
  return result('valid');
}

function describeFailure(failed: string[], shake: ShakeState): string {
  const labels = failed.map((id) => {
    if (id === 'type') {
      const type = shake.demands.find((d) => d.category === 'type');
      return `not usable as a ${type?.params?.pos ?? 'the demanded part of speech'}`;
    }
    if (id.startsWith('function:')) {
      const fn = shake.demands.find((d) => d.category === 'function');
      return `cannot be the ${fn?.label ?? 'demanded function'}`;
    }
    return shake.demands.find((d) => d.defId === id)?.label ?? id;
  });
  return `Fails: ${labels.join(', ')}.`;
}
