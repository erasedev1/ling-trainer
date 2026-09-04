import { describe, expect, it } from 'vitest';
import { gradeSubmission, solveShake } from '../src/engine/demands/solve';
import { officialScore } from '../src/engine/scoring/score';
import { stackViolations, canAddDemand } from '../src/engine/demands/legality';
import { JUDGEMENT_BANK, RULE_BANK } from '../data/judgement-bank';
import { APPROXIMATE_2026, CUBE_COLOR_COUNTS } from '../data/cube-sets';
import { cubes, functionDemand, generalDemand, lexicon, ruleset, shake, typeDemand } from './helpers';

/**
 * The worked shake in AGLOA's own "Playing LinguiSHTIK — A Step by Step Guide"
 * (rev. 2023): pattern S-V-DO, Type NOUN, Function SUBJECT, yellow wild, exactly
 * six letters, double consonant. Donna calls Challenge Now and writes
 * "Summer brings sunburn." with summer underlined; the judges score it correct.
 */
describe('official worked example — "Playing LinguiSHTIK" (rev. 2023)', () => {
  const officialShake = shake({
    // orange E, pink S, red M, yellow Z (wild), orange D, pink R
    letters: [
      ...cubes('E', 'orange'),
      ...cubes('S', 'pink'),
      ...cubes('M', 'red'),
      ...cubes('Z', 'yellow'),
      ...cubes('D', 'orange'),
      ...cubes('R', 'pink'),
    ],
    resources: cubes('UTAIN'),
    wildColor: 'yellow',
    resourceAllowance: 1,
    demands: [
      typeDemand('noun'),
      functionDemand('subject'),
      generalDemand('gen.numberOfLetters', { count: 6 }),
      generalDemand('gen.doubleConsonant'),
      generalDemand('gen.colorWild', { color: 'yellow' }),
    ],
  });

  const grade = (word: string) =>
    gradeSubmission(word, { shake: officialShake, lexicon: lexicon(), ruleset, seen: new Set(), atMs: 0 });

  it('accepts the solution the judges accepted', () => {
    expect(grade('summer').verdict).toBe('valid');
  });

  it('appears in the generated answer key', () => {
    expect(solveShake(officialShake, lexicon(), ruleset).words).toContain('summer');
  });

  it('rejects a six-letter noun with no double consonant', () => {
    // "misted" fits the letters but has no doubled consonant (LT 16 G)
    const result = grade('misted');
    expect(result.verdict).not.toBe('valid');
  });

  it('rejects a word of the wrong length even when it satisfies everything else', () => {
    expect(grade('dresser').verdict).not.toBe('valid');
  });
});

describe('official scoring chart (rev. July 2025)', () => {
  const cases: [string, string, number][] = [
    ['A', 'challenger', 6],
    ['A', 'solver', 4],
    ['A', 'neutral', 2],
    ['A', 'wrong', 2],
    ['B', 'solver', 6],
    ['B', 'neutral', 4],
    ['B', 'challenger', 2],
    ['C', 'challenger', 4],
    ['C', 'neutral', 4],
    ['C', 'wrong', 2],
    ['D', 'challenger', 6],
    ['D', 'neutral', 4],
    ['D', 'mover', 2],
    ['E', 'solver', 6],
    ['E', 'challenger', 4],
    ['E', 'wrong', 2],
    ['F', 'agreer', 4],
    ['F', 'neutral', 2],
    ['F', 'wrong', 2],
  ];

  it.each(cases)('situation %s, %s scores %i', (situationId, role, expected) => {
    expect(officialScore(ruleset, { situationId, role })).toBe(expected);
  });

  it('gives a Neutral player 6 under LT 26 #3', () => {
    expect(officialScore(ruleset, { situationId: 'C', role: 'neutral', fourAheadAtWarning: true })).toBe(6);
  });
});

describe('demand stack limits', () => {
  const def = (id: string) => ruleset.generalDemands.find((d) => d.id === id)!;

  it('allows two clause-or-phrase demands and refuses a third (LT 16 M & N)', () => {
    const existing = [generalDemand('clause.noun'), generalDemand('phrase.gerund')];
    expect(canAddDemand(ruleset, def('clause.adverb'), { existing })).toBe(false);
    expect(canAddDemand(ruleset, def('clause.adverb'), { existing: existing.slice(0, 1) })).toBe(true);
  });

  it('refuses a clause demand under a SIMPLE designation (HB II.B.1)', () => {
    expect(
      canAddDemand(ruleset, def('clause.noun'), { existing: [], designation: { kind: 'structure', id: 'simple' } }),
    ).toBe(false);
    expect(
      canAddDemand(ruleset, def('clause.noun'), { existing: [], designation: { kind: 'structure', id: 'complex' } }),
    ).toBe(true);
  });

  it('refuses "function for gerund" unless gerund is the Function Demand (LT 16 J13)', () => {
    expect(canAddDemand(ruleset, def('verb.gerundFunction'), { existing: [], functionId: 'infinitive' })).toBe(false);
    expect(canAddDemand(ruleset, def('verb.gerundFunction'), { existing: [], functionId: 'gerund' })).toBe(true);
  });

  it('refuses a section R function demand before any clause or phrase (LT 16 R)', () => {
    expect(canAddDemand(ruleset, def('cpf.function'), { existing: [] })).toBe(false);
    expect(canAddDemand(ruleset, def('cpf.function'), { existing: [generalDemand('clause.noun')] })).toBe(true);
  });

  it('reports a repeated MUST CONTAIN as a Duplicate Demand (LT 13 B2)', () => {
    const violations = stackViolations(ruleset, [
      generalDemand('gen.mustContain', { letter: 'A' }),
      generalDemand('gen.mustContain', { letter: 'E' }),
    ]);
    expect(violations.join(' ')).toContain('Duplicate Demand');
  });
});

describe('cube set matches the published colour counts', () => {
  it('has 23 cubes in the documented colours', () => {
    expect(APPROXIMATE_2026.cubes).toHaveLength(23);
    const counts: Record<string, number> = {};
    for (const cube of APPROXIMATE_2026.cubes) counts[cube.color] = (counts[cube.color] ?? 0) + 1;
    expect(counts).toEqual(CUBE_COLOR_COUNTS);
  });

  it('gives every cube six faces and covers the whole alphabet', () => {
    const seen = new Set<string>();
    for (const cube of APPROXIMATE_2026.cubes) {
      expect(cube.faces).toHaveLength(6);
      for (const face of cube.faces) seen.add(face);
    }
    expect(seen.size).toBe(26);
  });

  it('puts U on exactly two red cubes, as the rules require (LT 3)', () => {
    const reds = APPROXIMATE_2026.cubes.filter((c) => c.color === 'red');
    expect(reds.filter((c) => c.faces.includes('U'))).toHaveLength(2);
  });

  it('only allows black and green cubes to be played as demands (LT 8)', () => {
    expect(APPROXIMATE_2026.demandColors.sort()).toEqual(['black', 'green']);
  });
});

describe('curated question banks', () => {
  it('has unique judgement ids, a yes/no answer and an explanation for each', () => {
    const ids = new Set<string>();
    for (const item of JUDGEMENT_BANK) {
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      expect(['yes', 'no']).toContain(item.answer);
      expect(item.explanation.length).toBeGreaterThan(20);
      expect(item.topics.length).toBeGreaterThan(0);
      expect(item.source.length).toBeGreaterThan(0);
    }
    expect(JUDGEMENT_BANK.length).toBeGreaterThanOrEqual(55);
  });

  it('has rule items whose correct index points at a real option', () => {
    const ids = new Set<string>();
    for (const item of RULE_BANK) {
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      expect(item.options.length).toBeGreaterThanOrEqual(3);
      expect(item.correct).toBeGreaterThanOrEqual(0);
      expect(item.correct).toBeLessThan(item.options.length);
      expect(item.explanation.length).toBeGreaterThan(20);
    }
  });
});
