import { describe, expect, it } from 'vitest';
import { buildPool, canSpell } from '../src/engine/shake/pool';
import { letterCounts } from '../src/engine/lexicon/lexicon';
import { cubes, shake, typeDemand } from './helpers';

const spell = (word: string, state: Parameters<typeof buildPool>[0]) =>
  canSpell(letterCounts(word), word.length, buildPool(state));

describe('letter pool (LT 12 A, LT 19 A, LT 16 A/D)', () => {
  it('spells a word entirely from LETTERS', () => {
    const s = shake({ letters: cubes('SUMMER'), demands: [typeDemand('noun')] });
    expect(spell('summer', s)).toBe(true);
    expect(spell('summers', s)).toBe(false);
  });

  it('honours the one-cube Challenge Now allowance (LT 19 A)', () => {
    const s = shake({
      letters: cubes('SUMER'),
      resources: cubes('MXQZ'),
      demands: [typeDemand('noun')],
      resourceAllowance: 1,
    });
    // needs one more M, and an M is showing in Resources
    expect(spell('summer', s)).toBe(true);
  });

  it('refuses a word needing two cubes from Resources under Challenge Now', () => {
    const s = shake({
      letters: cubes('SUER'),
      resources: cubes('MMXZ'),
      demands: [typeDemand('noun')],
      resourceAllowance: 1,
    });
    expect(spell('summer', s)).toBe(false);
  });

  it('allows two cubes from Resources in a Forceout (LT 24)', () => {
    const s = shake({
      letters: cubes('SUER'),
      resources: cubes('MMXZ'),
      demands: [typeDemand('noun')],
      resourceAllowance: 2,
      solveContext: 'forceout',
    });
    expect(spell('summer', s)).toBe(true);
  });

  it('lets a wild colour stand for different letters (LT 16 A)', () => {
    const s = shake({
      letters: [...cubes('SUM'), ...cubes('AB', 'yellow')],
      demands: [typeDemand('noun')],
      wildColor: 'yellow',
    });
    // the two yellow cubes become M and E
    expect(spell('summe', s)).toBe(true);
  });

  it('applies a letter transfer to every occurrence (LT 16 D)', () => {
    const s = shake({
      letters: cubes('PPACK'),
      demands: [typeDemand('noun')],
      transfer: { from: 'P', to: 'T' },
    });
    expect(spell('tack', s)).toBe(true);
    expect(spell('pack', s)).toBe(false);
  });
});
