import { randomSeed } from '../engine/shake/rng';
import type { Weakness } from '../engine/stats/stats';

/**
 * Route a weakness to the drill that can actually fix it.
 *
 * A word-level weakness (a type demand, a general demand) goes to a Category
 * Gauntlet focused on it; a sentence-level one goes to the judgement bank
 * filtered to that topic, because no generated shake can grade it.
 */
export function drillFor(weakness: Weakness): [string, Record<string, string | number>] {
  if (weakness.kind === 'topic') return ['/judgement', { topic: weakness.key }];
  return [
    '/drill',
    {
      mode: 'category-gauntlet',
      seed: randomSeed(),
      seconds: 90,
      ...(weakness.kind === 'type' ? { type: weakness.key } : { demand: weakness.key }),
    },
  ];
}
