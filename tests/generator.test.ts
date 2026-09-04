import { describe, expect, it } from 'vitest';
import { generateAtLevel, generateScenario } from '../src/engine/generator/scenario';
import { gradeSubmission, solveShake } from '../src/engine/demands/solve';
import { stackViolations } from '../src/engine/demands/legality';
import { createRng } from '../src/engine/shake/rng';
import { cubeSet, lexicon, ruleset } from './helpers';

const base = { ruleset, cubeSet, lexicon: lexicon() };

describe('shake generation', () => {
  it('is deterministic for a seed', () => {
    const a = generateScenario({ ...base, seed: 4242 });
    const b = generateScenario({ ...base, seed: 4242 });
    expect(b.shake.letters.map((c) => c.letter)).toEqual(a.shake.letters.map((c) => c.letter));
    expect(b.answerKey.words).toEqual(a.answerKey.words);
    expect(b.shake.demands.map((d) => d.defId)).toEqual(a.shake.demands.map((d) => d.defId));
  });

  it('never rolls a cube onto a face it does not have', () => {
    for (let seed = 0; seed < 40; seed++) {
      const scenario = generateScenario({ ...base, seed });
      const all = [...scenario.shake.letters, ...scenario.shake.resources, ...scenario.shake.demandCubes];
      for (const rolled of all) {
        const cube = cubeSet.cubes.find((c) => c.id === rolled.cubeId)!;
        expect(cube.faces, `${rolled.cubeId}`).toContain(rolled.letter);
      }
    }
  });

  it('uses each cube exactly once across letters, resources and demands', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { shake } = generateScenario({ ...base, seed });
      const ids = [...shake.letters, ...shake.resources, ...shake.demandCubes].map((c) => c.cubeId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(cubeSet.cubes.length);
    }
  });

  it('places at least the minimum cubes for a Challenge Now (LT 13 A5)', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { shake } = generateScenario({ ...base, seed });
      expect(shake.letters.length).toBeGreaterThanOrEqual(ruleset.challenge.minLettersForChallengeNow);
    }
  });

  it('always produces a solvable shake at the requested level', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (const level of [1, 3, 5]) {
        const scenario = generateAtLevel({ ...base, seed: seed * 31 + level, targetLevel: level });
        expect(scenario.answerKey.count, `seed ${seed} level ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('never emits a demand stack that breaks the counting rules', () => {
    for (let seed = 0; seed < 80; seed++) {
      const scenario = generateScenario({ ...base, seed, targetLevel: 5 });
      expect(stackViolations(ruleset, scenario.shake.demands), `seed ${seed}`).toEqual([]);
    }
  });

  it('never puts a clause or quote demand under a simple or compound designation', () => {
    for (let seed = 0; seed < 200; seed++) {
      const scenario = generateScenario({ ...base, seed, targetLevel: 4 });
      if (scenario.designation.kind !== 'structure') continue;
      if (scenario.designation.id !== 'simple' && scenario.designation.id !== 'compound') continue;
      const bad = scenario.shake.demands.filter((d) => d.category === 'clause' || d.category === 'quote');
      expect(bad, `seed ${seed} ${scenario.designation.id}`).toEqual([]);
    }
  });

  it('produces answer keys whose every word actually grades valid', () => {
    for (let seed = 0; seed < 25; seed++) {
      const scenario = generateScenario({ ...base, seed: seed * 977 });
      for (const word of scenario.answerKey.words.slice(0, 12)) {
        const result = gradeSubmission(word, {
          shake: scenario.shake,
          lexicon: lexicon(),
          ruleset,
          seen: new Set(),
          atMs: 0,
        });
        expect(result.verdict, `${word} @ seed ${seed}`).toBe('valid');
      }
    }
  });

  it('honours a requested Type Demand', () => {
    for (const type of ['verb', 'adjective', 'pronoun'] as const) {
      const scenario = generateAtLevel({ ...base, seed: 99, type, targetLevel: 2 });
      expect(scenario.type).toBe(type);
      expect(scenario.shake.demands.find((d) => d.category === 'type')?.params?.pos).toBe(type);
    }
  });

  it('honours a required general demand', () => {
    const scenario = generateAtLevel({
      ...base,
      seed: 7,
      type: 'noun',
      requireDemandId: 'noun.collective',
      targetLevel: 2,
    });
    expect(scenario.shake.demands.some((d) => d.defId === 'noun.collective')).toBe(true);
    expect(scenario.answerKey.count).toBeGreaterThan(0);
  });

  it('rates scarcer shakes as harder than plentiful ones', () => {
    const samples = Array.from({ length: 60 }, (_, i) => generateScenario({ ...base, seed: i * 13 + 1 }));
    const plentiful = samples.filter((s) => s.answerKey.count >= 20);
    const scarce = samples.filter((s) => s.answerKey.count > 0 && s.answerKey.count <= 3);
    if (!plentiful.length || !scarce.length) return;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(scarce.map((s) => s.difficulty.score))).toBeGreaterThan(mean(plentiful.map((s) => s.difficulty.score)));
  });
});

describe('rng', () => {
  it('reproduces the same stream for a seed', () => {
    const a = createRng(11);
    const b = createRng(11);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('shuffles without losing or duplicating elements', () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    const shuffled = createRng(5).shuffle([...items]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
  });
});
