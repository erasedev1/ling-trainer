/** Deterministic RNG so a shake can be replayed, shared, and unit tested. */
export interface Rng {
  (): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: T[]): T[];
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = next as Rng;
  rng.int = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  rng.pick = <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  rng.shuffle = <T,>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  rng.chance = (p: number) => next() < p;
  return rng;
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
