/**
 * RULE CONFIGURATION — Senior Division, 2026–27.
 *
 * Data, not logic. Transcribed from:
 *   • LinguiSHTIK Tournament Rules 2026-27 (revised June 2026)  — "LT n"
 *   • Order of Play Sheet, Senior Division (revised June 2026)
 *   • Handbook & Judges Manual, 2026-27 Edition (Aug 1 2026)
 *
 * The trainer drills one thing — find words of a chosen part of speech from a
 * roll of the cubes — so this holds what that needs: the Type Demands a Senior
 * player can be given (LT 9), and what makes a word legal (LT 2, LT 22).
 *
 * When AGLOA revises the rules, copy this file, edit it, and point the app at
 * the new one. Nothing downstream hard-codes a rule.
 */

import type { Division, PartOfSpeech } from '../src/engine/types';

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
    /** LT 22 A–I, shown to the player; enforced where machine-checkable. */
    legality: string[];
  };

  /** LT 9 — the parts of speech Player Two may demand. */
  typeDemands: PartOfSpeech[];

  references: { dictionary: string; dictionaryOnline: string; grammar: string };
}

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
  ],

  word: {
    // LT 2: the object of the game is to make a 4 to 10 letter word.
    minLetters: 4,
    maxLetters: 10,
    legality: [
      'No contraction, hyphenated word, or proper noun; no apostrophe; no diacritical mark. (LT 22 A)',
      'Not labelled obsolete in the official dictionary — archaic is allowed. (LT 22 B)',
      'Must be listed with a definition in the official dictionary. (LT 22 C)',
      'No profanity, vulgar, slang, substandard, obscene or offensive usage. (LT 22 D)',
      'No abbreviated version of the word. (LT 22 E)',
      'Must be used accurately per its dictionary definition. (LT 22 F)',
      'Must be used in the way it is normally used — the dictionary decides whether it can be the demanded part of speech. (LT 22 G)',
    ],
  },

  typeDemands: ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'],

  references: {
    dictionary: "Webster's Third New International Unabridged",
    dictionaryOnline: 'dictionary.eb.com (the online unabridged version is the competition reference)',
    grammar: 'Elements of Language, 6th Course (Holt Rinehart Winston)',
  },
};
