import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Lexicon } from '../src/engine/lexicon/lexicon';
import type { LexiconPayload } from '../src/engine/lexicon/types';
import { SENIOR_2026 } from '../data/senior-2026';
import { APPROXIMATE_2026 } from '../data/cube-sets';
import type { Demand, PartOfSpeech, RolledCube, ShakeState } from '../src/engine/types';

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

let cubeCounter = 0;
export function cubes(letters: string, color: RolledCube['color'] = 'red'): RolledCube[] {
  return letters.split('').map((letter) => ({ cubeId: `t${cubeCounter++}`, color, letter: letter.toUpperCase() }));
}

export function typeDemand(pos: PartOfSpeech): Demand {
  return { defId: 'demand.type', label: pos, scope: 'word', category: 'type', cite: 'LT 9', params: { pos } };
}

export function functionDemand(functionId: string, label = functionId): Demand {
  return { defId: 'demand.function', label, scope: 'sentence', category: 'function', cite: 'LT 10', params: { functionId } };
}

export function generalDemand(defId: string, params?: Record<string, string | number>): Demand {
  const def = SENIOR_2026.generalDemands.find((d) => d.id === defId);
  if (!def) throw new Error(`no such demand: ${defId}`);
  return { defId: def.id, label: def.label, scope: def.scope, category: def.category, cite: def.cite, params };
}

export function shake(partial: Partial<ShakeState> & { letters: RolledCube[]; demands: Demand[] }): ShakeState {
  return {
    seed: 1,
    resources: [],
    demandCubes: [],
    resourceAllowance: 1,
    solveContext: 'challenge-now',
    ...partial,
  };
}
