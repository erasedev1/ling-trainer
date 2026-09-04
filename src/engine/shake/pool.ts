import type { CubeColor, RolledCube, ShakeState } from '../types';
import { letterIndex } from '../lexicon/lexicon';

/**
 * The letters a solver may actually use, derived from a shake.
 *
 * Split in two because the rules treat them differently: cubes already in
 * LETTERS are free, while cubes still in Resources are rationed — one for a
 * Challenge Now (LT 19 A), two for a Forceout (LT 24), unlimited when the Mover
 * answers a Challenge Impossible (LT 20 B) or a round ends (LT 26).
 */
export interface LetterPool {
  /** Concrete letters in LETTERS, counts indexed 0..25. */
  fixed: Int16Array;
  /** Wild cubes in LETTERS (LT 16 A) — each may stand for any single letter. */
  wildInLetters: number;
  /** Concrete letters showing in Resources. */
  resource: Int16Array;
  wildInResources: number;
  /** How many Resources cubes may be taken. */
  allowance: number;
  /** Total cubes reachable, for quick length pruning. */
  maxLength: number;
}

function applyTransfer(letter: string, transfer?: { from: string; to: string }): string {
  if (!transfer) return letter;
  return letter.toUpperCase() === transfer.from.toUpperCase() ? transfer.to.toUpperCase() : letter;
}

function tally(cubes: RolledCube[], wildColor: CubeColor | undefined, transfer: ShakeState['transfer']) {
  const counts = new Int16Array(26);
  let wild = 0;
  for (const cube of cubes) {
    if (wildColor && cube.color === wildColor) {
      wild++;
      continue;
    }
    const idx = letterIndex(applyTransfer(cube.letter, transfer));
    if (idx >= 0 && idx < 26) counts[idx]++;
  }
  return { counts, wild };
}

export function buildPool(shake: ShakeState): LetterPool {
  const letters = tally(shake.letters, shake.wildColor, shake.transfer);
  const resources = tally(shake.resources, shake.wildColor, shake.transfer);
  const allowance = Math.min(shake.resourceAllowance, shake.resources.length);
  return {
    fixed: letters.counts,
    wildInLetters: letters.wild,
    resource: resources.counts,
    wildInResources: resources.wild,
    allowance,
    maxLength: shake.letters.length + allowance,
  };
}

/**
 * Can `need` (a 26-slot letter count of a candidate word) be spelled from the pool?
 *
 * Wild cubes are fungible, so every deficit is equally coverable by a wild; what
 * remains must be covered one-cube-per-letter out of Resources, within the
 * allowance.
 */
export function canSpell(need: ArrayLike<number>, wordLength: number, pool: LetterPool, offset = 0): boolean {
  if (wordLength > pool.maxLength) return false;

  let deficit = 0;
  let resourceCapacity = pool.wildInResources;
  for (let i = 0; i < 26; i++) {
    const short = (need[offset + i] || 0) - pool.fixed[i];
    if (short > 0) {
      deficit += short;
      const fromResources = pool.resource[i] < short ? pool.resource[i] : short;
      resourceCapacity += fromResources;
    }
  }

  if (deficit <= pool.wildInLetters) return true;
  const remaining = deficit - pool.wildInLetters;
  return remaining <= pool.allowance && remaining <= resourceCapacity;
}

/** Letters visible on the mat, for display. */
export function poolLetters(shake: ShakeState): { letter: string; color: CubeColor; wild: boolean }[] {
  return shake.letters.map((cube) => ({
    letter: shake.wildColor && cube.color === shake.wildColor ? '★' : applyTransfer(cube.letter, shake.transfer),
    color: cube.color,
    wild: Boolean(shake.wildColor && cube.color === shake.wildColor),
  }));
}

export function resourceLetters(shake: ShakeState): { letter: string; color: CubeColor; wild: boolean }[] {
  return shake.resources.map((cube) => ({
    letter: shake.wildColor && cube.color === shake.wildColor ? '★' : applyTransfer(cube.letter, shake.transfer),
    color: cube.color,
    wild: Boolean(shake.wildColor && cube.color === shake.wildColor),
  }));
}
