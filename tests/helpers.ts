import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Lexicon } from '../src/engine/lexicon/lexicon';
import type { LexiconPayload } from '../src/engine/lexicon/types';
import { SENIOR_2026 } from '../data/senior-2026';
import { APPROXIMATE_2026 } from '../data/cube-sets';
import type { Cube, CubeSet } from '../src/engine/types';

let cached: Lexicon | undefined;

export function lexicon(): Lexicon {
  if (!cached) {
    const path = resolve(__dirname, '..', 'public', 'data', 'lexicon.json');
    cached = new Lexicon(JSON.parse(readFileSync(path, 'utf8')) as LexiconPayload);
  }
  return cached;
}

export const ruleset = SENIOR_2026;
export const cubeSet = APPROXIMATE_2026;

export const deps = () => ({
  cubeSet,
  lexicon: lexicon(),
  minLetters: ruleset.word.minLetters,
  maxLetters: ruleset.word.maxLetters,
});

/**
 * A cube set whose every face is the same letter, so a test can pin exactly
 * which letters a roll produces regardless of the RNG.
 */
export function fixedCubeSet(letters: string): CubeSet {
  const cubes: Cube[] = letters.split('').map((letter, i) => ({
    id: `fixed-${i}`,
    color: 'red',
    faces: [letter, letter, letter, letter, letter, letter].map((l) => l.toUpperCase()),
  }));
  return {
    id: 'fixed',
    label: 'Fixed test set',
    provenance: 'custom',
    note: 'test fixture',
    demandColors: ['black', 'green'],
    cubes,
  };
}
