/**
 * Core vocabulary of the trainer.
 *
 * Nothing in `src/engine` imports React or touches the DOM: the engine is a
 * plain-TypeScript library so it can be unit tested on its own (see `tests/`).
 */

export type Division = 'elementary' | 'middle' | 'junior' | 'senior';

export type PartOfSpeech =
  | 'noun'
  | 'pronoun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'interjection';

export type CubeColor = 'red' | 'black' | 'green' | 'pink' | 'yellow' | 'orange';

export interface Cube {
  /** Stable id, e.g. `red-1`. */
  id: string;
  color: CubeColor;
  /** Six upper-case letters. */
  faces: string[];
}

export interface CubeSet {
  id: string;
  label: string;
  /** Shown in the UI wherever the set is not known to be exact. */
  provenance: 'official' | 'approximate' | 'custom';
  note: string;
  cubes: Cube[];
  /** Colours whose cubes may be placed in the Demands section (LT 8). */
  demandColors: CubeColor[];
}

/** One cube after a roll: a cube showing one face. */
export interface RolledCube {
  cubeId: string;
  color: CubeColor;
  letter: string;
}

export type SubmissionVerdict =
  | 'valid'
  | 'duplicate'
  | 'not-a-word'
  | 'unverified'
  | 'not-spellable'
  | 'fails-demand'
  | 'bad-form';

export interface SubmissionResult {
  raw: string;
  word: string;
  verdict: SubmissionVerdict;
  /** Human-readable reason, always populated. */
  reason: string;
  /** ms since the clock started. */
  atMs: number;
}
