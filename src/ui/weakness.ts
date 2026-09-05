import { randomSeed } from '../engine/shake/rng';
import type { Weakness } from '../engine/stats/stats';

/**
 * Route a weakness to a Category Gauntlet focused on it.
 */
export function drillFor(weakness: Weakness): [string, Record<string, string | number>] {
  return [
    '/drill',
    {
      mode: 'category-gauntlet',
      seed: randomSeed(),
      seconds: 90,
      cubes: 'challenge-now',
      ...(weakness.kind === 'type' ? { types: weakness.key } : { demand: weakness.key }),
    },
  ];
}
