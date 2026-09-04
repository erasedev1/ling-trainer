/**
 * Core vocabulary of the LinguiSHTIK training engine.
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

/** One cube after Player One's roll: a cube showing one face. */
export interface RolledCube {
  cubeId: string;
  color: CubeColor;
  letter: string;
}

/**
 * Where a demand bites. Only `word` demands can be graded from a typed word;
 * `sentence` demands are about the sentence the player would write, and `board`
 * demands change what letters are available. See docs/RESEARCH.md §3.
 */
export type DemandScope = 'word' | 'sentence' | 'board';

export type DemandCategory =
  | 'designation'
  | 'type'
  | 'function'
  | 'general'
  | 'noun'
  | 'pronoun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'clause'
  | 'phrase'
  | 'wordform'
  | 'quote'
  | 'clausePhraseFunction';

/** A demand *definition* from the rule configuration (not yet instantiated). */
export interface DemandDef {
  id: string;
  label: string;
  category: DemandCategory;
  scope: DemandScope;
  /** Rule citation, shown in the UI so a player can look it up. */
  cite: string;
  /** Type Demand this depends on, if any (LT 16 H–L are per part of speech). */
  requiresType?: PartOfSpeech;
  /** Demands that may only be called once per shake (LT 13 B2). */
  oncePerShake?: boolean;
  /** Parameter the demand carries, if any. */
  param?: 'letter' | 'letterPair' | 'count' | 'color' | 'choice';
  /** Allowed values when `param` is `choice`. */
  choices?: string[];
  /** Marks a Senior-Division-only demand. */
  seniorOnly?: boolean;
  /** Explanation shown on the results screen when a word fails this demand. */
  hint?: string;
}

/** A demand actually in force in a shake. */
export interface Demand {
  defId: string;
  label: string;
  scope: DemandScope;
  category: DemandCategory;
  cite: string;
  /** e.g. `{ letter: 'R' }`, `{ count: 6 }`, `{ color: 'yellow' }`. */
  params?: Record<string, string | number>;
}

/** The state of a simulated shake at the moment the player is asked to solve. */
export interface ShakeState {
  seed: number;
  /** Cubes played to the LETTERS section of the mat. */
  letters: RolledCube[];
  /** Cubes still in Resources (each showing its rolled face). */
  resources: RolledCube[];
  /** Cubes consumed as Demands (black/green), kept for display fidelity. */
  demandCubes: RolledCube[];
  demands: Demand[];
  /** Colour declared wild, if the COLOR WILD demand is in force (LT 16 A). */
  wildColor?: CubeColor;
  /** Letter transfer in force (LT 16 D). */
  transfer?: { from: string; to: string };
  /**
   * How many cubes may be taken from Resources when solving.
   * 1 = Challenge Now (LT 19 A), 2 = Forceout (LT 24), Infinity = Challenge
   * Impossible / end-of-round (LT 20 B, LT 26).
   */
  resourceAllowance: number;
  /** Which rule the allowance came from, for the UI. */
  solveContext: 'challenge-now' | 'forceout' | 'impossible' | 'open';
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
  /** Demand ids the word failed, when `verdict` is `fails-demand`. */
  failed?: string[];
  /** Human-readable reason, always populated. */
  reason: string;
  /** ms since the drill's clock started. */
  atMs: number;
}
