import type { Demand, PartOfSpeech } from '../types';
import type { LexEntry } from '../lexicon/types';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** What else is in force when a word-level demand is checked. */
export interface DemandContext {
  /** The Type Demand (LT 9) — always present in a well-formed shake. */
  type: PartOfSpeech;
  /** The Function Demand id (LT 10), if one has been made. */
  functionId?: string;
}

export type WordPredicate = (entry: LexEntry, word: string, demand: Demand, ctx: DemandContext) => boolean;

function hasDouble(word: string, wantVowel: boolean): boolean {
  for (let i = 1; i < word.length; i++) {
    if (word[i] === word[i - 1] && VOWELS.has(word[i]) === wantVowel) return true;
  }
  return false;
}

function nounNumber(entry: LexEntry, want: 'sg' | 'pl', ctx: DemandContext): boolean {
  // LT 16 H: singular / plural are "not applicable to noun used as adjective",
  // and HB XVIII #29: "there is no such thing as a plural noun used as adjective".
  if (ctx.functionId === 'noun-as-adjective') return false;
  return Boolean(entry.n?.num?.includes(want));
}

/**
 * Word-level demand predicates.
 *
 * Only demands whose `scope` is `word` in the ruleset appear here. Everything
 * else is a property of the sentence the player would write and cannot be
 * decided from the word alone — see docs/RESEARCH.md §3.
 */
export const WORD_PREDICATES: Record<string, WordPredicate> = {
  'gen.mustContain': (_e, word, d) => word.includes(String(d.params?.letter ?? '').toLowerCase()),
  'gen.mustNotContain': (_e, word, d) => !word.includes(String(d.params?.letter ?? '').toLowerCase()),
  'gen.numberOfLetters': (_e, word, d) => word.length === Number(d.params?.count),
  'gen.doubleVowel': (_e, word) => hasDouble(word, true),
  'gen.doubleConsonant': (_e, word) => hasDouble(word, false),

  'noun.singular': (e, _w, _d, ctx) => nounNumber(e, 'sg', ctx),
  'noun.plural': (e, _w, _d, ctx) => nounNumber(e, 'pl', ctx),
  'noun.collective': (e, _w, _d, ctx) =>
    // HB III.C.3 note: a collective noun used as an adjective loses number and case,
    // but it is still collective, so the function does not disqualify it.
    Boolean(e.n?.collective) && ctx.type === 'noun',

  'pronoun.singular': (e) => e.p?.num === 'sg' || e.p?.num === 'both',
  'pronoun.plural': (e) => e.p?.num === 'pl' || e.p?.num === 'both',
  'pronoun.indefinite': (e) => Boolean(e.p?.cls.includes('indefinite')),
  'pronoun.personal': (e) => Boolean(e.p?.cls.includes('personal')),
  'pronoun.interrogative': (e) => Boolean(e.p?.cls.includes('interrogative')),
  'pronoun.demonstrative': (e) => Boolean(e.p?.cls.includes('demonstrative')),
  'pronoun.relative': (e) => Boolean(e.p?.cls.includes('relative')),
  'pronoun.nominative': (e) => Boolean(e.p?.case.includes('nominative')),
  'pronoun.objective': (e) => Boolean(e.p?.case.includes('objective')),
  'pronoun.possessive': (e) => Boolean(e.p?.case.includes('possessive')),

  // LT 16 J1-2. Read morphologically; see docs/RESEARCH.md open question 2.
  'verb.singular': (e) => Boolean(e.v?.forms.includes('thirdSg') || e.v?.num?.includes('sg')),
  'verb.plural': (e) => Boolean(e.v?.forms.includes('base') || e.v?.num?.includes('pl')),
  'verb.linking': (e) => Boolean(e.v?.linking),
  'verb.regular': (e) => Boolean(e.v?.reg),
  'verb.irregular': (e) => Boolean(e.v?.irr),
  'verb.presentParticiple': (e) => Boolean(e.v?.forms.includes('presPart')),
  'verb.pastParticiple': (e) => Boolean(e.v?.forms.includes('pastPart')),

  'adjective.regular': (e) => Boolean(e.a?.reg),
  'adjective.irregular': (e) => Boolean(e.a?.irr),
  'adverb.regular': (e) => Boolean(e.d?.reg),
  'adverb.irregular': (e) => Boolean(e.d?.irr),

  'word.compound': (e) => e.c === 1,
};

/**
 * Function Demands that also constrain the *word* rather than only the sentence.
 * All of them are verb functions (LT 10): a gerund is an -ing form, an infinitive
 * is the bare form, an auxiliary comes from a closed list.
 */
export const FUNCTION_WORD_PREDICATES: Record<string, (entry: LexEntry) => boolean> = {
  infinitive: (e) => Boolean(e.v?.forms.includes('base')),
  gerund: (e) => Boolean(e.v?.forms.includes('presPart')),
  participle: (e) => Boolean(e.v?.forms.includes('presPart') || e.v?.forms.includes('pastPart')),
  auxiliary: (e) => Boolean(e.v?.aux),
};

export function isWordScoped(demandId: string): boolean {
  return demandId in WORD_PREDICATES;
}
