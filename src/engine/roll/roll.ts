import type { PartOfSpeech, RolledCube, SubmissionResult, SubmissionVerdict } from '../types';
import type { CubeSet } from '../types';
import type { Lexicon } from '../lexicon/lexicon';
import { letterCounts, letterIndex } from '../lexicon/lexicon';
import { createRng } from '../shake/rng';

/**
 * One roll of the cubes.
 *
 * Player One rolls all the cubes into Resources to start a shake (LT 6), so a
 * roll is every cube in the set showing one face. The drill is: from those
 * letters, how many words of the chosen parts of speech can you find before the
 * clock stops?
 */
export interface Roll {
  seed: number;
  cubes: RolledCube[];
  /** Parts of speech that count. Never empty. */
  types: PartOfSpeech[];
  minLetters: number;
  maxLetters: number;
}

export interface RollOptions {
  seed: number;
  cubeSet: CubeSet;
  types: PartOfSpeech[];
  minLetters: number;
  maxLetters: number;
}

export function createRoll({ seed, cubeSet, types, minLetters, maxLetters }: RollOptions): Roll {
  const rng = createRng(seed);
  return {
    seed,
    cubes: cubeSet.cubes.map((cube) => ({
      cubeId: cube.id,
      color: cube.color,
      letter: rng.pick(cube.faces),
    })),
    types: types.length ? types : [],
    minLetters,
    maxLetters,
  };
}

/** Letters available, counted per letter of the alphabet. */
export function rollCounts(roll: Roll): Int16Array {
  const counts = new Int16Array(26);
  for (const cube of roll.cubes) {
    const index = letterIndex(cube.letter);
    if (index >= 0 && index < 26) counts[index]++;
  }
  return counts;
}

/** Can `need` be spelled from the rolled cubes? One cube spells one letter. */
export function canSpellFromRoll(need: ArrayLike<number>, available: ArrayLike<number>, offset = 0): boolean {
  for (let i = 0; i < 26; i++) {
    if ((need[offset + i] || 0) > available[i]) return false;
  }
  return true;
}

/** Does the entry count as one of the parts of speech the player picked? */
function matchesTypes(pos: readonly PartOfSpeech[], types: readonly PartOfSpeech[]): boolean {
  if (!types.length) return true;
  for (const type of types) if (pos.includes(type)) return true;
  return false;
}

export interface AnswerKey {
  /** Every word that counts, most common first. */
  words: string[];
  count: number;
  /** How many of the answers are usable as each chosen part of speech. */
  availableByType: Record<string, number>;
}

/**
 * Every word in the lexicon that the roll allows.
 *
 * A word counts if it is 4–10 letters (LT 2), spellable from the cubes, and
 * usable as at least one of the chosen parts of speech.
 */
export function answerKey(roll: Roll, lexicon: Lexicon): AnswerKey {
  const available = rollCounts(roll);
  const counts = lexicon.countsView();
  const types = roll.types.length ? roll.types : lexicon.allPartsOfSpeech();
  const seen = new Set<number>();
  const hits: { w: string; f: number; pos: PartOfSpeech[] }[] = [];

  for (const type of types) {
    for (const index of lexicon.indicesForPos(type)) {
      if (seen.has(index)) continue;
      seen.add(index);
      const length = lexicon.lengthAt(index);
      if (length < roll.minLetters || length > roll.maxLetters) continue;
      if (!canSpellFromRoll(counts, available, index * 26)) continue;
      const entry = lexicon.entryAt(index);
      hits.push({ w: entry.w, f: entry.f, pos: entry.pos });
    }
  }

  hits.sort((a, b) => a.f - b.f || a.w.localeCompare(b.w));

  const availableByType: Record<string, number> = {};
  for (const type of types) availableByType[type] = 0;
  for (const hit of hits) {
    for (const type of types) if (hit.pos.includes(type)) availableByType[type]++;
  }

  return { words: hits.map((h) => h.w), count: hits.length, availableByType };
}

const REASONS: Record<SubmissionVerdict, string> = {
  valid: 'Valid.',
  duplicate: 'Already found this one.',
  'not-a-word': 'Not in the trainer dictionary.',
  unverified: 'A real spelling, but the trainer has no part-of-speech data for it — not scored either way.',
  'not-spellable': 'Those letters are not all on the cubes.',
  'fails-demand': 'Wrong part of speech.',
  'bad-form': 'Not a legal word form.',
};

export interface GradeOptions {
  roll: Roll;
  lexicon: Lexicon;
  seen: Set<string>;
  atMs: number;
  /** Precomputed letter counts, so grading a keystroke stays cheap. */
  available?: Int16Array;
}

/** Grade one typed word against the roll. Pure; never mutates `seen`. */
export function gradeWord(raw: string, opts: GradeOptions): SubmissionResult {
  const { roll, lexicon, seen, atMs } = opts;
  const word = raw.trim().toLowerCase();
  const result = (verdict: SubmissionVerdict, reason?: string): SubmissionResult => ({
    raw,
    word,
    verdict,
    reason: reason ?? REASONS[verdict],
    atMs,
  });

  if (!word) return result('bad-form', 'Empty.');
  if (!/^[a-z]+$/.test(word)) {
    // LT 22 A: no contractions, hyphens, apostrophes, diacritics or proper nouns.
    return result('bad-form', 'No contractions, hyphens, apostrophes or proper nouns (LT 22 A).');
  }
  if (word.length < roll.minLetters || word.length > roll.maxLetters) {
    return result('bad-form', `Words are ${roll.minLetters}–${roll.maxLetters} letters (LT 2).`);
  }
  if (seen.has(word)) return result('duplicate');

  const entry = lexicon.lookup(word);
  if (!entry) return result(lexicon.isUntaggedSpelling(word) ? 'unverified' : 'not-a-word');

  const available = opts.available ?? rollCounts(roll);
  if (!canSpellFromRoll(letterCounts(word), available)) return result('not-spellable');

  if (!matchesTypes(entry.pos, roll.types)) {
    const wanted = roll.types.join(' or ');
    return result('fails-demand', `Not usable as a ${wanted} — it is a ${entry.pos.join('/')}.`);
  }
  return result('valid');
}
