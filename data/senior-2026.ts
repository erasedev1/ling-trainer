/**
 * RULE CONFIGURATION — Senior Division, 2026–27.
 *
 * This file is data, not logic. Everything the trainer knows about what is
 * legal in a Senior shake lives here, transcribed from:
 *
 *   • LinguiSHTIK Tournament Rules 2026-27 (revised June 2026)   — "LT n"
 *   • Order of Play Sheet, Senior Division (revised June 2026)   — "Sr OOP"
 *   • Handbook & Judges Manual, 2026-27 Edition (Aug 1 2026)     — "HB §"
 *   • LinguiSHTIK Scoring Chart (revised July 2025)              — "SC"
 *   • Dictionary of Terms (July 2024)                            — "DoT"
 *
 * When AGLOA revises the rules, add a new file next to this one and register it
 * in `src/engine/rules/index.ts`. No engine code hard-codes any of these values.
 */

import type { DemandDef, Division, PartOfSpeech } from '../src/engine/types';

export interface ScoringSituation {
  id: string;
  label: string;
  six: string[];
  four: string[];
  two: string[];
  note?: string;
}

export interface Ruleset {
  id: string;
  division: Division;
  label: string;
  season: string;
  revised: string;
  sources: { title: string; revised: string; url: string }[];

  word: {
    minLetters: number;
    maxLetters: number;
    /** LT 22 A–I, shown to the player and enforced where machine-checkable. */
    legality: string[];
  };

  sentence: {
    maxWords: number;
    patterns: { id: string; label: string; seniorOnly?: boolean; requiresPassive?: boolean; cite: string }[];
    structures: { id: string; label: string; cite: string }[];
    purposes: { id: string; label: string; cite: string }[];
    /** LT 23 A–H. */
    legality: string[];
  };

  typeDemands: PartOfSpeech[];
  functionDemands: Record<PartOfSpeech, { id: string; label: string; seniorOnly?: boolean }[]>;
  generalDemands: DemandDef[];

  /** LT 16 R — which functions may be demanded of each clause / phrase. */
  clausePhraseFunctions: Record<string, string[]>;

  /** LT 16 M/N and LT 16 Q limits. */
  limits: {
    clauseAndPhraseTotal: number;
    mustNotBeContainedIn: number;
    colorWild: number;
    mustContain: number;
    mustNotContain: number;
    letterTransfer: number;
  };

  timing: {
    /** seconds */
    designation: number;
    move: number;
    demand: number;
    writeSolution: number;
    checkSolution: number;
    countdown: number;
    roundMinutes: number;
    warningMinutes: number;
  };

  penalties: { id: string; label: string; points: number; cite: string }[];

  scoring: {
    note: string;
    situations: ScoringSituation[];
    roles: { id: string; label: string }[];
  };

  challenge: {
    minLettersForChallengeNow: number;
    challengeNowResourceCubes: number;
    forceoutResourceCubes: number;
    forceoutCorrect: number;
    forceoutIncorrect: number;
    endOfRoundCorrect: number;
    endOfRoundIncorrect: number;
  };

  references: { dictionary: string; dictionaryOnline: string; grammar: string[]; judging: string };
}

const SR = 'Sr OOP (June 2026)';

export const SENIOR_2026: Ruleset = {
  id: 'senior-2026',
  division: 'senior',
  label: 'Senior Division — 2026',
  season: '2026–27',
  revised: 'June 2026 rules / August 1 2026 handbook',
  sources: [
    { title: 'LinguiSHTIK Tournament Rules', revised: 'June 14, 2026', url: 'https://agloa.org/wp-content/uploads/LingRules2627.pdf' },
    { title: 'Order of Play — Senior Division', revised: 'June 2026', url: 'https://agloa.org/wp-content/uploads/LingOrderOfPlaySr2627.pdf' },
    { title: 'Handbook and Judges Manual', revised: 'August 1, 2026', url: 'https://agloa.org/wp-content/uploads/LingHandbookManual2627.pdf' },
    { title: 'Scoring Chart', revised: 'July 30, 2025', url: 'https://agloa.org/wp-content/uploads/LingScoringChart2526.pdf' },
    { title: 'Dictionary of Terms', revised: 'July 2024', url: 'https://agloa.org/wp-content/uploads/LingDictionaryOfTerms2425.pdf' },
    { title: 'List of Demands Form', revised: 'August 21, 2022', url: 'https://agloa.org/wp-content/uploads/LingDemandsListForm2223.pdf' },
  ],

  word: {
    minLetters: 4,
    maxLetters: 10,
    legality: [
      'No contraction, hyphenated word, or proper noun; no apostrophe; no diacritical mark. (LT 22 A)',
      'Not labelled obsolete in the official dictionary — archaic is allowed. (LT 22 B)',
      'Must be listed with a definition in the official dictionary. (LT 22 C)',
      'No profanity, vulgar, slang, substandard, obscene or offensive usage. (LT 22 D)',
      'No abbreviated version of the word. (LT 22 E)',
      'Must be used accurately per its dictionary definition; follow "var of" to the alternate spelling. (LT 22 F)',
      'Must be used in the way it is normally used — the dictionary decides whether it can be the demanded part of speech. (LT 22 G)',
      'The word to be formed must not be contained in a title. (LT 22 H)',
      'Rulings favour the subject matter of the game over a "gimmick". (LT 22 I)',
    ],
  },

  sentence: {
    maxWords: 20,
    patterns: [
      { id: 'S-V', label: 'S-V', cite: 'HB II.A.1' },
      { id: 'S-V-DO', label: 'S-V-DO', cite: 'HB II.A.2' },
      { id: 'S-LV-PN', label: 'S-LV-PN', cite: 'HB II.A.3' },
      { id: 'S-LV-PA', label: 'S-LV-PA', cite: 'HB II.A.4' },
      { id: 'S-V-IO-DO', label: 'S-V-IO-DO', cite: 'HB II.A.5' },
      { id: 'INVERTED', label: 'Inverted', cite: 'HB II.A.6' },
      { id: 'S-V-DO-OC-N', label: 'S-V-DO-OC (noun)', cite: 'HB II.A.7' },
      { id: 'S-V-DO-OC-ADJ', label: 'S-V-DO-OC (adj.)', cite: 'HB II.A.8' },
      { id: 'S-V-RET-DO', label: 'S-V-Retained DO', seniorOnly: true, requiresPassive: true, cite: 'HB II.A.9' },
      { id: 'S-V-RET-IO', label: 'S-V-Retained IO', seniorOnly: true, requiresPassive: true, cite: 'HB II.A.10' },
      { id: 'S-V-RET-OC-N', label: 'S-V-Retained OC (noun)', seniorOnly: true, requiresPassive: true, cite: 'HB II.A.11' },
      { id: 'S-V-RET-OC-ADJ', label: 'S-V-Retained OC (adj.)', seniorOnly: true, requiresPassive: true, cite: 'HB II.A.12' },
    ],
    structures: [
      { id: 'simple', label: 'simple', cite: 'HB II.B.1' },
      { id: 'compound', label: 'compound', cite: 'HB II.B.2' },
      { id: 'complex', label: 'complex', cite: 'HB II.B.3' },
      { id: 'compound-complex', label: 'compound-complex', cite: 'HB II.B.4' },
    ],
    purposes: [
      { id: 'declarative', label: 'declarative', cite: 'HB II.C.1' },
      { id: 'interrogative', label: 'interrogative', cite: 'HB II.C.2' },
      { id: 'imperative', label: 'imperative', cite: 'HB II.C.3' },
      { id: 'exclamatory', label: 'exclamatory', cite: 'HB II.C.4' },
    ],
    legality: [
      'Must be justifiable as reality — no "in my dream", "in the movie". (LT 23 A)',
      'Grammatically correct, including subject-verb agreement. (LT 23 B)',
      'All words spelled correctly, proper capitalisation. (LT 23 C)',
      'Begins with a capital letter, closes with the proper punctuation. (LT 23 D)',
      'All words properly punctuated, including possessives and diacritics. (LT 23 E)',
      'Internal punctuation applies to possessives, interjections, appositives, nouns of direct address, direct quotes and conjunctive adverbs. (LT 23 F)',
      'Not unintelligible or cumbersome. (LT 23 G)',
      'At most 20 words. (LT 23 H)',
    ],
  },

  typeDemands: ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'],

  functionDemands: {
    noun: [
      { id: 'subject', label: 'subject' },
      { id: 'direct-object', label: 'direct object' },
      { id: 'indirect-object', label: 'indirect object' },
      { id: 'predicate-noun', label: 'predicate noun' },
      { id: 'object-of-preposition', label: 'object of the preposition' },
      { id: 'appositive', label: 'appositive' },
      { id: 'noun-as-adjective', label: 'noun used as adjective' },
      { id: 'objective-complement', label: 'objective complement' },
      { id: 'retained-do', label: 'retained direct object', seniorOnly: true },
      { id: 'retained-io', label: 'retained indirect object', seniorOnly: true },
      { id: 'retained-oc', label: 'retained objective complement', seniorOnly: true },
    ],
    pronoun: [
      { id: 'subject', label: 'subject' },
      { id: 'direct-object', label: 'direct object' },
      { id: 'indirect-object', label: 'indirect object' },
      { id: 'predicate-noun', label: 'predicate noun' },
      { id: 'object-of-preposition', label: 'object of the preposition' },
      { id: 'appositive', label: 'appositive' },
      { id: 'objective-complement', label: 'objective complement' },
      { id: 'retained-do', label: 'retained direct object', seniorOnly: true },
      { id: 'retained-io', label: 'retained indirect object', seniorOnly: true },
      { id: 'retained-oc', label: 'retained objective complement', seniorOnly: true },
    ],
    verb: [
      { id: 'main-verb', label: 'main verb' },
      { id: 'auxiliary', label: 'auxiliary' },
      { id: 'infinitive', label: 'infinitive' },
      { id: 'gerund', label: 'gerund' },
      { id: 'participle', label: 'participle' },
    ],
    adjective: [
      { id: 'noun-modifier', label: 'noun modifier' },
      { id: 'pronoun-modifier', label: 'pronoun modifier' },
      { id: 'predicate-adjective', label: 'predicate adjective' },
      { id: 'adjacent-adjective', label: 'adjacent adjective' },
      { id: 'objective-complement', label: 'objective complement' },
      { id: 'retained-oc', label: 'retained objective complement', seniorOnly: true },
    ],
    adverb: [
      { id: 'verb-modifier', label: 'verb modifier' },
      { id: 'adjective-modifier', label: 'adjective modifier' },
      { id: 'adverb-modifier', label: 'adverb modifier' },
    ],
    preposition: [
      { id: 'intro-adjective-phrase', label: 'introductory word in an adjective phrase' },
      { id: 'intro-adverb-phrase', label: 'introductory word in an adverb phrase' },
    ],
    conjunction: [
      { id: 'subordinator', label: 'subordinator' },
      { id: 'conjunctive-adverb', label: 'conjunctive adverb' },
    ],
    interjection: [],
  },

  // ---------------------------------------------------------------------
  // General Demands — LT 16 A–R, Senior list. `scope` decides whether the
  // engine can grade a typed word against the demand (see docs/RESEARCH.md §3).
  // ---------------------------------------------------------------------
  generalDemands: [
    // A–G: all divisions, once per shake each.
    { id: 'gen.colorWild', label: 'Color wild', category: 'general', scope: 'board', param: 'color', oncePerShake: true, cite: 'LT 16 A', hint: 'Cubes of the wild colour may each stand for any letter.' },
    { id: 'gen.mustContain', label: 'Must contain letter', category: 'general', scope: 'word', param: 'letter', oncePerShake: true, cite: 'LT 16 B' },
    { id: 'gen.mustNotContain', label: 'Must not contain letter', category: 'general', scope: 'word', param: 'letter', oncePerShake: true, cite: 'LT 16 C' },
    { id: 'gen.letterTransfer', label: 'Letter transfer', category: 'general', scope: 'board', param: 'letterPair', oncePerShake: true, cite: 'LT 16 D', hint: 'Every cube showing the first letter now shows the second.' },
    { id: 'gen.numberOfLetters', label: 'Number of letters', category: 'general', scope: 'word', param: 'count', oncePerShake: true, cite: 'LT 16 E' },
    { id: 'gen.doubleVowel', label: 'Double vowel', category: 'general', scope: 'word', oncePerShake: true, cite: 'LT 16 F', hint: 'Two consecutive vowels of the same letter — ee, oo, aa.' },
    { id: 'gen.doubleConsonant', label: 'Double consonant', category: 'general', scope: 'word', oncePerShake: true, cite: 'LT 16 G', hint: 'Two consecutive consonants of the same letter — tt, pp.' },

    // H. Noun
    { id: 'noun.singular', label: 'singular', category: 'noun', scope: 'word', requiresType: 'noun', cite: 'LT 16 H1', hint: 'Not applicable to a noun used as adjective.' },
    { id: 'noun.plural', label: 'plural', category: 'noun', scope: 'word', requiresType: 'noun', cite: 'LT 16 H2', hint: 'Not applicable to a noun used as adjective.' },
    { id: 'noun.collective', label: 'collective', category: 'noun', scope: 'word', requiresType: 'noun', cite: 'LT 16 H3', hint: 'Names a group as one item; mass nouns do not count (HB III.C.3).' },
    { id: 'noun.nominative', label: 'nominative case', category: 'noun', scope: 'sentence', requiresType: 'noun', cite: 'LT 16 H4', hint: 'English nouns have no distinct case form — case follows function (HB III.C.4).' },
    { id: 'noun.objective', label: 'objective case', category: 'noun', scope: 'sentence', requiresType: 'noun', cite: 'LT 16 H5', hint: 'English nouns have no distinct case form — case follows function (HB III.C.5).' },

    // I. Pronoun
    { id: 'pronoun.singular', label: 'singular', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I1' },
    { id: 'pronoun.plural', label: 'plural', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I2' },
    { id: 'pronoun.indefinite', label: 'indefinite', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I3' },
    { id: 'pronoun.personal', label: 'personal', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I4' },
    { id: 'pronoun.interrogative', label: 'interrogative', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I5' },
    { id: 'pronoun.demonstrative', label: 'demonstrative', category: 'pronoun', scope: 'word', requiresType: 'pronoun', seniorOnly: true, cite: 'LT 16 I6' },
    { id: 'pronoun.relative', label: 'relative', category: 'pronoun', scope: 'word', requiresType: 'pronoun', seniorOnly: true, cite: 'LT 16 I7' },
    { id: 'pronoun.nominative', label: 'nominative case', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I8' },
    { id: 'pronoun.objective', label: 'objective case', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I9' },
    { id: 'pronoun.possessive', label: 'possessive case', category: 'pronoun', scope: 'word', requiresType: 'pronoun', cite: 'LT 16 I10' },

    // J. Verb
    { id: 'verb.singular', label: 'singular form', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J1', hint: 'Trainer reads this as the third-person -s form (see docs/RESEARCH.md open question 2).' },
    { id: 'verb.plural', label: 'plural form', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J2', hint: 'Trainer reads this as the bare form.' },
    { id: 'verb.linking', label: 'linking', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J3', hint: 'be and its forms, plus appear become feel grow look remain seem smell sound stay taste turn (HB IV.A.3).' },
    { id: 'verb.regular', label: 'regular', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J4' },
    { id: 'verb.irregular', label: 'irregular', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J5' },
    { id: 'verb.presentParticiple', label: 'present participle', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J6' },
    { id: 'verb.pastParticiple', label: 'past participle', category: 'verb', scope: 'word', requiresType: 'verb', cite: 'LT 16 J7' },
    { id: 'verb.simpleTense', label: 'simple tense', category: 'verb', scope: 'sentence', requiresType: 'verb', param: 'choice', choices: ['present', 'past', 'future'], cite: 'LT 16 J8', hint: 'The auxiliary can carry the tense, so the word alone does not settle it.' },
    { id: 'verb.perfectTense', label: 'perfect tense', category: 'verb', scope: 'sentence', requiresType: 'verb', param: 'choice', choices: ['present', 'past', 'future'], cite: 'LT 16 J9' },
    { id: 'verb.progressive', label: 'progressive form', category: 'verb', scope: 'sentence', requiresType: 'verb', param: 'choice', choices: ['present', 'past', 'future'], cite: 'LT 16 J10' },
    { id: 'verb.perfectProgressive', label: 'perfect progressive form', category: 'verb', scope: 'sentence', requiresType: 'verb', param: 'choice', choices: ['present', 'past', 'future'], cite: 'LT 16 J11' },
    { id: 'verb.infinitiveFunction', label: 'function for infinitive', category: 'verb', scope: 'sentence', requiresType: 'verb', cite: 'LT 16 J12' },
    { id: 'verb.gerundFunction', label: 'function for gerund', category: 'verb', scope: 'sentence', requiresType: 'verb', cite: 'LT 16 J13' },
    { id: 'verb.activeVoice', label: 'active voice', category: 'verb', scope: 'sentence', requiresType: 'verb', seniorOnly: true, cite: 'LT 16 J14' },
    { id: 'verb.passiveVoice', label: 'passive voice', category: 'verb', scope: 'sentence', requiresType: 'verb', seniorOnly: true, cite: 'LT 16 J15' },

    // K. Adjective / L. Adverb
    { id: 'adjective.positive', label: 'positive degree', category: 'adjective', scope: 'sentence', requiresType: 'adjective', cite: 'LT 16 K1', hint: 'Modifiers with no degrees count as positive (HB V.C.1).' },
    { id: 'adjective.comparative', label: 'comparative degree', category: 'adjective', scope: 'sentence', requiresType: 'adjective', cite: 'LT 16 K2', hint: '"more common" makes common comparative, so the word alone does not settle it (HB XVIII #44).' },
    { id: 'adjective.superlative', label: 'superlative degree', category: 'adjective', scope: 'sentence', requiresType: 'adjective', cite: 'LT 16 K3' },
    { id: 'adjective.regular', label: 'regular', category: 'adjective', scope: 'word', requiresType: 'adjective', cite: 'LT 16 K4' },
    { id: 'adjective.irregular', label: 'irregular', category: 'adjective', scope: 'word', requiresType: 'adjective', cite: 'LT 16 K5' },
    { id: 'adverb.positive', label: 'positive degree', category: 'adverb', scope: 'sentence', requiresType: 'adverb', cite: 'LT 16 L1' },
    { id: 'adverb.comparative', label: 'comparative degree', category: 'adverb', scope: 'sentence', requiresType: 'adverb', cite: 'LT 16 L2' },
    { id: 'adverb.superlative', label: 'superlative degree', category: 'adverb', scope: 'sentence', requiresType: 'adverb', cite: 'LT 16 L3' },
    { id: 'adverb.regular', label: 'regular', category: 'adverb', scope: 'word', requiresType: 'adverb', cite: 'LT 16 L4' },
    { id: 'adverb.irregular', label: 'irregular', category: 'adverb', scope: 'word', requiresType: 'adverb', cite: 'LT 16 L5' },

    // M. Clauses / N. Phrases (word must be contained in)
    { id: 'clause.noun', label: 'in a noun clause', category: 'clause', scope: 'sentence', cite: 'LT 16 M1' },
    { id: 'clause.adjective', label: 'in an adjective clause', category: 'clause', scope: 'sentence', cite: 'LT 16 M2' },
    { id: 'clause.adverb', label: 'in an adverb clause', category: 'clause', scope: 'sentence', cite: 'LT 16 M3' },
    { id: 'clause.infinitive', label: 'in an infinitive clause', category: 'clause', scope: 'sentence', cite: 'LT 16 M4' },
    { id: 'clause.elliptical', label: 'in an elliptical clause', category: 'clause', scope: 'sentence', seniorOnly: true, cite: 'LT 16 M5', hint: 'Words left out but understood; must be a dependent clause (DoT).' },
    { id: 'phrase.appositive', label: 'in an appositive phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N1' },
    { id: 'phrase.adjective', label: 'in an adjective phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N2' },
    { id: 'phrase.adverb', label: 'in an adverb phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N3' },
    { id: 'phrase.infinitive', label: 'in an infinitive phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N4' },
    { id: 'phrase.gerund', label: 'in a gerund phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N5' },
    { id: 'phrase.participial', label: 'in a participial phrase', category: 'phrase', scope: 'sentence', cite: 'LT 16 N6' },

    // O. Compound word
    { id: 'word.compound', label: 'compound word', category: 'wordform', scope: 'word', oncePerShake: true, cite: 'LT 16 O', hint: 'One solidly written word made of smaller words keeping their meanings, no part acting as an affix (DoT).' },

    // P. Quotes / Q. Must not be contained in
    { id: 'quote.direct', label: 'part of a direct quote', category: 'quote', scope: 'sentence', cite: 'LT 16 P1' },
    { id: 'quote.indirect', label: 'part of an indirect quote', category: 'quote', scope: 'sentence', cite: 'LT 16 P2' },
    { id: 'not.in', label: 'must NOT be contained in', category: 'clausePhraseFunction', scope: 'sentence', param: 'choice', oncePerShake: true, choices: ['noun clause', 'adjective clause', 'adverb clause', 'infinitive clause', 'elliptical clause', 'direct quote', 'indirect quote', 'appositive phrase', 'adjective phrase', 'adverb phrase', 'infinitive phrase', 'gerund phrase', 'participial phrase'], cite: 'LT 16 Q' },

    // R. Clause / phrase function (Senior only)
    { id: 'cpf.function', label: 'clause/phrase function', category: 'clausePhraseFunction', scope: 'sentence', seniorOnly: true, param: 'choice', cite: 'LT 16 R', hint: 'Only after the word has been demanded to be in that clause or phrase.' },
  ],

  // LT 16 R, transcribed verbatim from the Senior Order of Play. Clauses and
  // phrases not listed here (elliptical clause, appositive phrase) take no
  // function demand.
  clausePhraseFunctions: {
    'clause.noun': ['subject', 'direct object', 'indirect object', 'predicate noun', 'object of the preposition', 'appositive', 'objective complement (noun)'],
    'phrase.gerund': ['subject', 'direct object', 'indirect object', 'predicate noun', 'object of the preposition', 'appositive'],
    'clause.infinitive': ['direct object', 'predicate noun', 'object of the preposition'],
    'phrase.infinitive': ['subject', 'direct object', 'predicate noun', 'object of the preposition', 'verb modifier', 'adjective modifier', 'adverb modifier'],
    'clause.adjective': ['objective complement (adj.)', 'noun modifier', 'pronoun modifier'],
    'phrase.adjective': ['noun modifier', 'pronoun modifier'],
    'phrase.participial': ['noun modifier', 'pronoun modifier'],
    'clause.adverb': ['verb modifier', 'adjective modifier', 'adverb modifier'],
    'phrase.adverb': ['verb modifier', 'adjective modifier', 'adverb modifier'],
  },

  limits: {
    clauseAndPhraseTotal: 2,
    mustNotBeContainedIn: 1,
    colorWild: 1,
    mustContain: 1,
    mustNotContain: 1,
    letterTransfer: 1,
  },

  timing: {
    designation: 60,
    move: 60,
    demand: 60,
    writeSolution: 180,
    checkSolution: 120,
    countdown: 10,
    roundMinutes: 30,
    warningMinutes: 5,
  },

  penalties: [
    { id: 'time', label: 'Failed to move or demand within one minute', points: -1, cite: 'LT 13 A' },
    { id: 'challenge-now-short', label: 'Challenge Now with fewer than 3 cubes in Letters', points: -1, cite: 'LT 13 A5' },
    { id: 'illegal-procedure', label: 'Illegal Procedure not corrected in time', points: -1, cite: 'LT 13 B1' },
    { id: 'duplicate-demand', label: 'Duplicate Demand', points: -1, cite: 'LT 13 B2' },
    { id: 'invalid-challenge', label: 'Picked up the block and made an invalid challenge', points: -1, cite: 'LT 18' },
    { id: 'absent', label: 'Absent for a shake', points: -2, cite: 'LT 34' },
  ],

  scoring: {
    note: 'Official AGLOA per-shake scoring, three players. Used by the trainer for rule drills; solo drills use a separate, clearly labelled training score.',
    roles: [
      { id: 'challenger', label: 'Challenger — picked up the block and stated a challenge' },
      { id: 'solver', label: 'Solver — a player other than the Challenger who presents a correct solution' },
      { id: 'neutral', label: 'Neutral — presents no solution' },
      { id: 'wrong', label: 'Wrong — presents an incorrect solution' },
      { id: 'mover', label: 'Mover — made the last move before a Challenge Impossible' },
      { id: 'agreer', label: 'Agreer — agreed to a Forceout and presents a correct solution' },
    ],
    situations: [
      { id: 'A', label: 'Challenge Now — challenger has a correct solution', six: ['challenger'], four: ['solver'], two: ['neutral', 'wrong'] },
      { id: 'B', label: 'Challenge Now — challenger wrong, another player solves', six: ['solver'], four: ['neutral'], two: ['challenger', 'wrong'] },
      { id: 'C', label: 'Challenge Now — no player has a correct solution', six: [], four: ['challenger', 'neutral'], two: ['wrong'], note: 'LT 26 #3: a Neutral player scores 6 instead of 4 if the leader was four or more points ahead at the five-minute warning and called Challenge Now.' },
      { id: 'D', label: 'Challenge Impossible — no player has a correct solution', six: ['challenger'], four: ['neutral'], two: ['mover', 'wrong'] },
      { id: 'E', label: 'Challenge Impossible — at least one player solves', six: ['solver'], four: ['challenger'], two: ['wrong'] },
      { id: 'F', label: 'Forceout — all players agreed', six: [], four: ['agreer'], two: ['neutral', 'wrong'] },
    ],
  },

  challenge: {
    minLettersForChallengeNow: 3,
    challengeNowResourceCubes: 1,
    forceoutResourceCubes: 2,
    forceoutCorrect: 4,
    forceoutIncorrect: 2,
    endOfRoundCorrect: 4,
    endOfRoundIncorrect: 2,
  },

  references: {
    dictionary: "Webster's Third New International Unabridged",
    dictionaryOnline: 'dictionary.eb.com (the online unabridged version is the competition reference)',
    grammar: ['Elements of Language, 6th Course (Holt Rinehart Winston) — primary', 'Prentice-Hall Grammar and Composition, Levels 1-6', 'The Plain English Handbook'],
    judging: 'LinguiSHTIK Handbook and Judges Manual, 2026 revision',
  },
};

export const SENIOR_ONLY_DEMAND_IDS = new Set(
  SENIOR_2026.generalDemands.filter((d) => d.seniorOnly).map((d) => d.id),
);

/** Cited above as `SR`; kept so the constant is not dropped by tree shaking. */
export const SENIOR_ORDER_OF_PLAY = SR;
