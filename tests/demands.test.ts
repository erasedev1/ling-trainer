import { describe, expect, it } from 'vitest';
import { gradeSubmission, solveShake } from '../src/engine/demands/solve';
import { cubes, functionDemand, generalDemand, lexicon, ruleset, shake, typeDemand } from './helpers';

const grade = (word: string, state: Parameters<typeof gradeSubmission>[1]['shake'], seen = new Set<string>()) =>
  gradeSubmission(word, { shake: state, lexicon: lexicon(), ruleset, seen, atMs: 0 });

describe('word legality (LT 2, LT 22)', () => {
  const base = shake({ letters: cubes('SUMMERTID'), demands: [typeDemand('noun')] });

  it('rejects words shorter than four letters (LT 2)', () => {
    expect(grade('sum', base).verdict).toBe('bad-form');
  });

  it('rejects contractions, hyphens and apostrophes (LT 22 A)', () => {
    expect(grade("don't", base).verdict).toBe('bad-form');
    expect(grade('re-use', base).verdict).toBe('bad-form');
  });

  it('accepts a valid word and then flags the repeat as a duplicate', () => {
    const seen = new Set<string>();
    expect(grade('summer', base, seen).verdict).toBe('valid');
    seen.add('summer');
    expect(grade('summer', base, seen).verdict).toBe('duplicate');
  });

  it('reports a real but untagged spelling as unverified rather than wrong', () => {
    const lex = lexicon();
    const sample = lex.isUntaggedSpelling('emmers') ? 'emmers' : undefined;
    if (!sample) return; // lexicon build changed; nothing to assert
    const s = shake({ letters: cubes('EMMERS'), demands: [typeDemand('noun')] });
    expect(grade(sample, s).verdict).toBe('unverified');
  });
});

describe('general demands (LT 16 A–G, O)', () => {
  const letters = cubes('SUMMERTID');

  it('enforces MUST CONTAIN (LT 16 B)', () => {
    const s = shake({ letters, demands: [typeDemand('noun'), generalDemand('gen.mustContain', { letter: 'D' })] });
    expect(grade('dimmer', s).verdict).toBe('valid');
    expect(grade('summer', s).verdict).toBe('fails-demand');
  });

  it('enforces MUST NOT CONTAIN (LT 16 C)', () => {
    const s = shake({ letters, demands: [typeDemand('noun'), generalDemand('gen.mustNotContain', { letter: 'S' })] });
    expect(grade('summer', s).verdict).toBe('fails-demand');
  });

  it('enforces NUMBER OF LETTERS exactly (LT 16 E)', () => {
    const s = shake({ letters, demands: [typeDemand('noun'), generalDemand('gen.numberOfLetters', { count: 6 })] });
    expect(grade('summer', s).verdict).toBe('valid');
    expect(grade('trim', s).verdict).toBe('fails-demand');
  });

  it('requires two consecutive identical vowels for DOUBLE VOWEL (LT 16 F)', () => {
    const s = shake({ letters: cubes('DEERSTMU'), demands: [typeDemand('noun'), generalDemand('gen.doubleVowel')] });
    expect(grade('deer', s).verdict).toBe('valid');
    // "muse" has two vowels but not two consecutive identical ones
    expect(grade('muse', s).verdict).toBe('fails-demand');
  });

  it('requires two consecutive identical consonants for DOUBLE CONSONANT (LT 16 G)', () => {
    const s = shake({ letters: cubes('SUMMERTID'), demands: [typeDemand('noun'), generalDemand('gen.doubleConsonant')] });
    expect(grade('summer', s).verdict).toBe('valid');
    expect(grade('times', s).verdict).toBe('fails-demand');
  });

  it('enforces COMPOUND WORD (LT 16 O)', () => {
    const s = shake({ letters: cubes('SUNBURNIT'), demands: [typeDemand('noun'), generalDemand('word.compound')] });
    expect(grade('sunburn', s).verdict).toBe('valid');
    expect(grade('burns', s).verdict).toBe('fails-demand');
  });
});

describe('type and form demands (LT 9, LT 16 H–L)', () => {
  it('rejects a word that cannot be the demanded part of speech (LT 22 G)', () => {
    const s = shake({ letters: cubes('QUICKLY'), demands: [typeDemand('noun')] });
    expect(grade('quickly', s).verdict).toBe('fails-demand');
    expect(grade('quickly', s).failed).toContain('type');
  });

  it('checks noun singular and plural (LT 16 H1-2)', () => {
    const plural = shake({ letters: cubes('GEEESHOR'), demands: [typeDemand('noun'), generalDemand('noun.plural')] });
    expect(grade('geese', plural).verdict).toBe('valid');
    expect(grade('hose', plural).verdict).toBe('fails-demand');
  });

  it('refuses singular or plural for a noun used as adjective (LT 16 H note, HB XVIII #29)', () => {
    const s = shake({
      letters: cubes('SUMMERTID'),
      demands: [typeDemand('noun'), functionDemand('noun-as-adjective'), generalDemand('noun.singular')],
    });
    expect(grade('summer', s).verdict).toBe('fails-demand');
  });

  it('checks collective nouns (LT 16 H3)', () => {
    const s = shake({ letters: cubes('FLOCKSRT'), demands: [typeDemand('noun'), generalDemand('noun.collective')] });
    expect(grade('flock', s).verdict).toBe('valid');
    expect(grade('rocks', s).verdict).toBe('fails-demand');
  });

  it('checks linking verbs against the Handbook list (LT 16 J3, HB IV.A.3)', () => {
    const s = shake({ letters: cubes('BECOMESTAY'), demands: [typeDemand('verb'), generalDemand('verb.linking')] });
    expect(grade('become', s).verdict).toBe('valid');
    expect(grade('comes', s).verdict).toBe('fails-demand');
  });

  it('checks regular versus irregular verbs (LT 16 J4-5, HB IV.C)', () => {
    const regular = shake({ letters: cubes('WALKEDS'), demands: [typeDemand('verb'), generalDemand('verb.regular')] });
    expect(grade('walked', regular).verdict).toBe('valid');
    const irregular = shake({ letters: cubes('SWAMTOLD'), demands: [typeDemand('verb'), generalDemand('verb.irregular')] });
    expect(grade('swam', irregular).verdict).toBe('valid');
    expect(grade('moats', irregular).verdict).toBe('fails-demand');
  });

  it('checks past and present participles (LT 16 J6-7)', () => {
    const present = shake({ letters: cubes('WALKING'), demands: [typeDemand('verb'), generalDemand('verb.presentParticiple')] });
    expect(grade('walking', present).verdict).toBe('valid');
    const past = shake({ letters: cubes('WRITTENS'), demands: [typeDemand('verb'), generalDemand('verb.pastParticiple')] });
    expect(grade('written', past).verdict).toBe('valid');
  });

  it('checks pronoun class and case (LT 16 I)', () => {
    const demonstrative = shake({
      letters: cubes('THOSEIR'),
      demands: [typeDemand('pronoun'), generalDemand('pronoun.demonstrative')],
    });
    expect(grade('those', demonstrative).verdict).toBe('valid');
    expect(grade('their', demonstrative).verdict).toBe('fails-demand');

    const possessive = shake({ letters: cubes('THEIRS'), demands: [typeDemand('pronoun'), generalDemand('pronoun.possessive')] });
    expect(grade('theirs', possessive).verdict).toBe('valid');
  });

  it('constrains verb functions that are morphological (LT 10)', () => {
    const gerund = shake({
      letters: cubes('WALKING'),
      demands: [typeDemand('verb'), functionDemand('gerund')],
    });
    expect(grade('walking', gerund).verdict).toBe('valid');
    expect(grade('walk', gerund).verdict).toBe('fails-demand');

    const auxiliary = shake({
      letters: cubes('WOULDBEN'),
      demands: [typeDemand('verb'), functionDemand('auxiliary')],
    });
    expect(grade('would', auxiliary).verdict).toBe('valid');
    expect(grade('lube', auxiliary).verdict).toBe('fails-demand');
  });
});

describe('answer key', () => {
  it('contains exactly the words that grade valid', () => {
    const s = shake({
      letters: cubes('SUMMERTI'),
      demands: [typeDemand('noun'), generalDemand('gen.numberOfLetters', { count: 6 })],
    });
    const key = solveShake(s, lexicon(), ruleset);
    expect(key.count).toBeGreaterThan(0);
    for (const word of key.words.slice(0, 40)) {
      expect(grade(word, s).verdict, word).toBe('valid');
    }
    expect(key.words).toContain('summer');
    expect(key.words.every((w) => w.length === 6)).toBe(true);
  });

  it('orders the key by how common the words are', () => {
    const s = shake({ letters: cubes('SUMMERTID'), demands: [typeDemand('noun')] });
    const key = solveShake(s, lexicon(), ruleset);
    const tiers = key.words.map((w) => lexicon().lookup(w)!.f);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });
});
