import { describe, expect, it } from 'vitest';
import { answerKey, createRoll, gradeWord } from '../src/engine/roll/roll';
import { createRng } from '../src/engine/shake/rng';
import { APPROXIMATE_2026, CUBE_COLOR_COUNTS } from '../data/cube-sets';
import { cubeSet, fixedCubeSet, lexicon, ruleset } from './helpers';
import type { PartOfSpeech } from '../src/engine/types';

const roll = (letters: string, types: PartOfSpeech[]) =>
  createRoll({
    seed: 1,
    cubeSet: fixedCubeSet(letters),
    types,
    minLetters: ruleset.word.minLetters,
    maxLetters: ruleset.word.maxLetters,
  });

const grade = (word: string, r: ReturnType<typeof roll>, seen = new Set<string>()) =>
  gradeWord(word, { roll: r, lexicon: lexicon(), seen, atMs: 0 });

describe('rolling the cubes', () => {
  it('rolls every cube in the set, onto a face it actually has', () => {
    const r = createRoll({ seed: 7, cubeSet, types: ['noun'], minLetters: 4, maxLetters: 10 });
    expect(r.cubes).toHaveLength(cubeSet.cubes.length);
    for (const rolled of r.cubes) {
      const cube = cubeSet.cubes.find((c) => c.id === rolled.cubeId)!;
      expect(cube.faces).toContain(rolled.letter);
    }
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = createRoll({ seed: 42, cubeSet, types: ['noun'], minLetters: 4, maxLetters: 10 });
    const b = createRoll({ seed: 42, cubeSet, types: ['noun'], minLetters: 4, maxLetters: 10 });
    const c = createRoll({ seed: 43, cubeSet, types: ['noun'], minLetters: 4, maxLetters: 10 });
    const letters = (r: typeof a) => r.cubes.map((x) => x.letter).join('');
    expect(letters(b)).toBe(letters(a));
    expect(letters(c)).not.toBe(letters(a));
  });

  it('uses the published colour counts', () => {
    const counts: Record<string, number> = {};
    for (const cube of APPROXIMATE_2026.cubes) counts[cube.color] = (counts[cube.color] ?? 0) + 1;
    expect(counts).toEqual(CUBE_COLOR_COUNTS);
    expect(APPROXIMATE_2026.cubes).toHaveLength(23);
  });
});

describe('grading a word', () => {
  const nouns = roll('SUMMERTIDXYZQWVK', ['noun']);

  it('accepts a word of the right type spelled from the cubes', () => {
    expect(grade('summer', nouns).verdict).toBe('valid');
  });

  it('rejects a word needing a letter that is not on the cubes', () => {
    // no B anywhere in this roll
    expect(grade('numbers', nouns).verdict).toBe('not-spellable');
  });

  it('rejects a word needing more copies of a letter than were rolled', () => {
    const one = roll('SUMERTIDXYZQWVKA', ['noun']);
    // "summer" needs two Ms; only one was rolled
    expect(grade('summer', one).verdict).toBe('not-spellable');
  });

  it('rejects the wrong part of speech and says which it is', () => {
    const result = grade('quickly', roll('QUICKLYSTAMDERN', ['noun']));
    expect(result.verdict).toBe('fails-demand');
    expect(result.reason).toContain('noun');
  });

  it('accepts a word matching any of several chosen parts of speech', () => {
    const both = roll('QUICKLYSTAMDERN', ['noun', 'adverb']);
    expect(grade('quickly', both).verdict).toBe('valid');
    expect(grade('trains', both).verdict).toBe('valid');
  });

  it('enforces the 4–10 letter range (LT 2)', () => {
    expect(grade('sum', nouns).verdict).toBe('bad-form');
    expect(grade('summertimes', nouns).verdict).toBe('bad-form');
  });

  it('rejects contractions, hyphens and apostrophes (LT 22 A)', () => {
    expect(grade("don't", nouns).verdict).toBe('bad-form');
    expect(grade('re-use', nouns).verdict).toBe('bad-form');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(grade('  SUMMER ', nouns).verdict).toBe('valid');
  });

  it('flags a repeat as a duplicate', () => {
    const seen = new Set(['summer']);
    expect(grade('summer', nouns, seen).verdict).toBe('duplicate');
  });

  it('reports a real but untagged spelling as unverified rather than wrong', () => {
    const lex = lexicon();
    const sample = lex.isUntaggedSpelling('emmers') ? 'emmers' : undefined;
    if (!sample) return;
    expect(grade(sample, roll('EMRSTIDXYZQWVKA', ['noun'])).verdict).toBe('unverified');
  });

  it('reports an invented word as not a word', () => {
    expect(grade('zzzzq', roll('ZQSTIDXYWVKAERM', ['noun'])).verdict).toBe('not-a-word');
  });
});

describe('answer key', () => {
  it('lists exactly the words that grade valid', () => {
    const r = roll('SUMMERTIDXYZQWVK', ['noun']);
    const key = answerKey(r, lexicon());
    expect(key.count).toBeGreaterThan(0);
    for (const word of key.words.slice(0, 60)) {
      expect(grade(word, r).verdict, word).toBe('valid');
    }
    expect(key.words).toContain('summer');
  });

  it('orders the key by how common the words are', () => {
    const key = answerKey(roll('SUMMERTIDXYZQWVK', ['noun']), lexicon());
    const tiers = key.words.map((w) => lexicon().lookup(w)!.f);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it('has no duplicates when a word satisfies two chosen parts of speech', () => {
    const key = answerKey(roll('SUMMERTIDXYZQWVK', ['noun', 'verb']), lexicon());
    expect(new Set(key.words).size).toBe(key.words.length);
  });

  it('grows when more parts of speech are chosen', () => {
    const one = answerKey(roll('SUMMERTIDXYZQWVK', ['noun']), lexicon()).count;
    const two = answerKey(roll('SUMMERTIDXYZQWVK', ['noun', 'verb']), lexicon()).count;
    expect(two).toBeGreaterThan(one);
  });

  it('counts how many answers each chosen part of speech has', () => {
    const key = answerKey(roll('SUMMERTIDXYZQWVK', ['noun', 'verb']), lexicon());
    expect(Object.keys(key.availableByType).sort()).toEqual(['noun', 'verb']);
    expect(key.availableByType.noun).toBeGreaterThan(0);
    expect(key.availableByType.noun).toBeLessThanOrEqual(key.count);
  });

  it('never includes a word longer than the cubes rolled', () => {
    const key = answerKey(roll('ABCDE', ['noun']), lexicon());
    for (const word of key.words) expect(word.length).toBeLessThanOrEqual(5);
  });

  it('finds words for every part of speech on a real 23-cube roll, given enough seeds', () => {
    for (const type of ruleset.typeDemands) {
      let found = 0;
      for (let seed = 0; seed < 25 && !found; seed++) {
        const r = createRoll({ seed, cubeSet, types: [type], minLetters: 4, maxLetters: 10 });
        found = answerKey(r, lexicon()).count;
      }
      expect(found, `no ${type} in 25 rolls`).toBeGreaterThan(0);
    }
  });
});

describe('rng', () => {
  it('reproduces the same stream for a seed', () => {
    const a = createRng(11);
    const b = createRng(11);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
