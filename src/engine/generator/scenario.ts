import type { Ruleset } from '../../../data/senior-2026';
import type { Cube, CubeColor, CubeSet, Demand, DemandDef, PartOfSpeech, RolledCube, ShakeState } from '../types';
import type { Lexicon } from '../lexicon/lexicon';
import { createRng, type Rng } from '../shake/rng';
import { solveShake, type AnswerKey } from '../demands/solve';
import { buildPool, canSpell } from '../shake/pool';
import { canAddDemand } from '../demands/legality';

export interface Designation {
  kind: 'pattern' | 'structure' | 'purpose';
  id: string;
  label: string;
  cite: string;
  seniorOnly?: boolean;
}

export interface Scenario {
  seed: number;
  shake: ShakeState;
  designation: Designation;
  type: PartOfSpeech;
  functionDemand?: { id: string; label: string };
  answerKey: AnswerKey;
  difficulty: DifficultyProfile;
}

/**
 * Difficulty as *gameplay* difficulty, not sentence length.
 *
 * `decoys` is the important one: words that fit the letters and the general
 * demands but are the wrong part of speech or wrong form. A shake with many
 * decoys punishes sloppy pattern recognition even when answers are plentiful.
 */
export interface DifficultyProfile {
  /** 1 (gentle) … 5 (brutal). */
  level: number;
  answerCount: number;
  /** Word-scope demands the player must satisfy simultaneously. */
  constraintCount: number;
  /** Demands shown but graded only by a judge in real play. */
  sentenceConstraintCount: number;
  /** Frequency tier of the most common answer: 0 everyday … 5 obscure. */
  easiestTier: number;
  decoys: number;
  score: number;
}

export interface GeneratorOptions {
  seed: number;
  ruleset: Ruleset;
  cubeSet: CubeSet;
  lexicon: Lexicon;
  /** 1..5; the generator tunes constraints and letters to hit this. */
  targetLevel?: number;
  /** Restrict the Type Demand to exactly this part of speech. */
  type?: PartOfSpeech;
  /**
   * Restrict the Type Demand to a chosen set — "nouns and verbs only". One is
   * drawn per shake, by the same weighting as the unrestricted pool. Empty or
   * omitted means every part of speech is fair game.
   */
  types?: PartOfSpeech[];
  /** Require a specific general demand to be in force, for focused drilling. */
  requireDemandId?: string;
  /** Never generate a shake with fewer answers than this. */
  minAnswers?: number;
  /** Solve context, which decides how many Resources cubes may be used. */
  solveContext?: ShakeState['solveContext'];
}

const TYPE_WEIGHTS: [PartOfSpeech, number][] = [
  ['noun', 30],
  ['verb', 24],
  ['adjective', 16],
  ['adverb', 10],
  ['pronoun', 6],
  ['preposition', 5],
  ['conjunction', 5],
  ['interjection', 4],
];

/** Closed classes have tiny answer sets by nature; they get more letters, fewer demands. */
const CLOSED_CLASS: PartOfSpeech[] = ['pronoun', 'preposition', 'conjunction', 'interjection'];

function weightedType(rng: Rng, allowed?: PartOfSpeech[]): PartOfSpeech {
  const pool = allowed?.length ? TYPE_WEIGHTS.filter(([type]) => allowed.includes(type)) : TYPE_WEIGHTS;
  if (!pool.length) return 'noun';
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [type, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return pool[pool.length - 1][0];
}

export function rollCubes(cubeSet: CubeSet, rng: Rng): RolledCube[] {
  return cubeSet.cubes.map((cube: Cube) => ({
    cubeId: cube.id,
    color: cube.color,
    letter: rng.pick(cube.faces),
  }));
}

function pickDesignation(ruleset: Ruleset, rng: Rng): Designation {
  const roll = rng();
  if (roll < 0.6) {
    const p = rng.pick(ruleset.sentence.patterns);
    return { kind: 'pattern', id: p.id, label: p.label, cite: p.cite, seniorOnly: p.seniorOnly };
  }
  if (roll < 0.82) {
    const s = rng.pick(ruleset.sentence.structures);
    return { kind: 'structure', id: s.id, label: s.label, cite: s.cite };
  }
  const p = rng.pick(ruleset.sentence.purposes);
  return { kind: 'purpose', id: p.id, label: p.label, cite: p.cite };
}

function toDemand(def: DemandDef, params?: Record<string, string | number>): Demand {
  return { defId: def.id, label: def.label, scope: def.scope, category: def.category, cite: def.cite, params };
}

function defsFor(ruleset: Ruleset, type: PartOfSpeech, scope: 'word' | 'sentence' | 'board'): DemandDef[] {
  return ruleset.generalDemands.filter(
    (d) => d.scope === scope && (!d.requiresType || d.requiresType === type),
  );
}

/** Instantiate a demand definition with concrete parameters. */
function instantiate(
  def: DemandDef,
  rng: Rng,
  ruleset: Ruleset,
  letters: RolledCube[],
  inForce: Demand[] = [],
): Demand | undefined {
  switch (def.param) {
    case 'letter': {
      // MUST CONTAIN is only interesting when the letter is actually reachable.
      const pool = letters.map((c) => c.letter);
      if (def.id === 'gen.mustContain') {
        if (!pool.length) return undefined;
        return toDemand(def, { letter: rng.pick(pool) });
      }
      const absent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((l) => !pool.includes(l));
      return toDemand(def, { letter: rng.pick(absent.length ? absent : pool) });
    }
    case 'count': {
      const min = ruleset.word.minLetters;
      const max = Math.min(ruleset.word.maxLetters, Math.max(min, letters.length + 1));
      return toDemand(def, { count: min + rng.int(Math.max(1, max - min + 1)) });
    }
    case 'letterPair': {
      const from = rng.pick('BCDFGHJKLMNPRSTVWY'.split(''));
      let to = rng.pick('AEIOULNRST'.split(''));
      if (to === from) to = 'E';
      return toDemand(def, { from, to });
    }
    case 'color':
      return toDemand(def, { color: rng.pick(['red', 'black', 'green', 'pink', 'yellow', 'orange'] as CubeColor[]) });
    case 'choice': {
      let choices = def.choices ?? [];
      if (def.id === 'cpf.function') {
        // LT 16 R: the available functions depend on which clause or phrase the
        // word has already been demanded to be in.
        const target = inForce.find((d) => ruleset.clausePhraseFunctions[d.defId]);
        if (!target) return undefined;
        const fns = ruleset.clausePhraseFunctions[target.defId];
        return toDemand(def, { of: target.label, choice: rng.pick(fns) });
      }
      if (def.id === 'not.in') {
        // LT 16 Q must not contradict a containment already demanded (LT 16 M/N/P).
        const positives = new Set(
          inForce
            .filter((d) => d.category === 'clause' || d.category === 'phrase' || d.category === 'quote')
            .map((d) => d.label.replace(/^in an? /, '').replace(/^part of an? /, '')),
        );
        choices = choices.filter((c) => !positives.has(c));
        if (!choices.length) return undefined;
      }
      if (!choices.length) return undefined;
      return toDemand(def, { choice: rng.pick(choices) });
    }
    default:
      return toDemand(def);
  }
}

function countDecoys(shake: ShakeState, lexicon: Lexicon, ruleset: Ruleset): number {
  // Words that fit the letters and the letter-shaped demands but are the wrong
  // part of speech: the near-misses a rushing player types.
  const pool = buildPool(shake);
  const counts = lexicon.countsView();
  const type = shake.demands.find((d) => d.category === 'type')?.params?.pos;
  // Only words a player would actually reach for count as decoys.
  const common = lexicon.commonIndices(2);
  let decoys = 0;
  for (let c = 0; c < common.length && decoys < 400; c++) {
    const i = common[c];
    const length = lexicon.lengthAt(i);
    if (length < ruleset.word.minLetters || length > pool.maxLength) continue;
    if (lexicon.entryAt(i).pos.includes(type as PartOfSpeech)) continue;
    if (canSpell(counts, length, pool, i * 26)) decoys++;
  }
  return decoys;
}

function profile(answerKey: AnswerKey, shake: ShakeState, decoys: number): DifficultyProfile {
  const constraintCount = shake.demands.filter((d) => d.scope === 'word').length + 1; // + the Type Demand
  const sentenceConstraintCount = shake.demands.filter((d) => d.scope === 'sentence').length;
  const easiestTier = answerKey.count ? Math.min(...Object.keys(answerKey.byTier).map(Number)) : 5;

  // Scarcity dominates: a shake with three answers is hard however few demands
  // it carries. Rarity and decoys then push it further.
  const scarcity = answerKey.count === 0 ? 5 : Math.max(0, 3.2 - Math.log2(answerKey.count + 1));
  const score =
    scarcity * 1.15 + constraintCount * 0.42 + easiestTier * 0.5 + Math.min(decoys, 200) / 90 + sentenceConstraintCount * 0.12;
  const level = Math.max(1, Math.min(5, Math.round(score / 1.35)));
  return { level, answerCount: answerKey.count, constraintCount, sentenceConstraintCount, easiestTier, decoys, score };
}

/**
 * Build one training shake.
 *
 * Strategy: roll, designate, set the Type and Function Demands, then *grow* the
 * LETTERS section until the shake has answers, then *add* demands while it still
 * has enough. That ordering is what keeps generated shakes solvable — the
 * generator never emits a scenario whose answer key it has not verified.
 */
export function generateScenario(opts: GeneratorOptions): Scenario {
  const { ruleset, cubeSet, lexicon } = opts;
  const rng = createRng(opts.seed);
  const targetLevel = opts.targetLevel ?? 3;
  const type = opts.type ?? weightedType(rng, opts.types);
  const closed = CLOSED_CLASS.includes(type);
  const minAnswers = opts.minAnswers ?? (closed ? 1 : targetLevel >= 4 ? 3 : 6);

  const rolled = rng.shuffle(rollCubes(cubeSet, rng));
  const demandable = rolled.filter((c) => cubeSet.demandColors.includes(c.color));
  const plain = rolled.filter((c) => !cubeSet.demandColors.includes(c.color));

  const designation = pickDesignation(ruleset, rng);
  const functions = ruleset.functionDemands[type];
  let functionDemand = functions.length ? rng.pick(functions) : undefined;

  const demands: Demand[] = [
    {
      defId: 'demand.type',
      label: type,
      scope: 'word',
      category: 'type',
      cite: 'LT 9',
      params: { pos: type },
    },
  ];
  if (functionDemand) {
    demands.push({
      defId: 'demand.function',
      label: functionDemand.label,
      scope: 'sentence',
      category: 'function',
      cite: 'LT 10',
      params: { functionId: functionDemand.id },
    });
  }

  // Two black/green cubes are consumed by the Type and Function Demands (LT 8).
  let demandCubesUsed = functionDemand ? 2 : 1;

  const build = (letterCount: number, extra: Demand[]): ShakeState => {
    const letters = plain.slice(0, letterCount);
    const usedIds = new Set([...letters.map((c) => c.cubeId), ...demandable.slice(0, demandCubesUsed).map((c) => c.cubeId)]);
    const all = [...demands, ...extra];
    const wild = all.find((d) => d.defId === 'gen.colorWild');
    const transferDemand = all.find((d) => d.defId === 'gen.letterTransfer');
    return {
      seed: opts.seed,
      letters,
      resources: rolled.filter((c) => !usedIds.has(c.cubeId)),
      demandCubes: demandable.slice(0, demandCubesUsed),
      demands: all,
      wildColor: wild?.params?.color as CubeColor | undefined,
      transfer: transferDemand
        ? { from: String(transferDemand.params?.from), to: String(transferDemand.params?.to) }
        : undefined,
      resourceAllowance:
        opts.solveContext === 'forceout'
          ? ruleset.challenge.forceoutResourceCubes
          : opts.solveContext === 'impossible' || opts.solveContext === 'open'
            ? Number.POSITIVE_INFINITY
            : ruleset.challenge.challengeNowResourceCubes,
      solveContext: opts.solveContext ?? 'challenge-now',
    };
  };

  // 1. A required demand (Category Gauntlet) goes on before anything else, so the
  //    letters are grown to satisfy it rather than around it.
  let extra: Demand[] = [];
  const required = opts.requireDemandId
    ? ruleset.generalDemands.find((d) => d.id === opts.requireDemandId)
    : undefined;
  if (required && canAddDemand(ruleset, required, { existing: demands, functionId: functionDemand?.id, designation })) {
    const demand = instantiate(required, rng, ruleset, plain, demands);
    if (demand) {
      extra = [demand];
      demandCubesUsed++;
    }
  }

  // 2. Grow LETTERS until the shake has answers at all.
  let letterCount = Math.max(ruleset.challenge.minLettersForChallengeNow, closed ? 5 : 4);
  let shake = build(letterCount, extra);
  let key = solveShake(shake, lexicon, ruleset);
  const maxLetters = Math.min(plain.length, closed || required ? 12 : 9);
  while (key.count < minAnswers && letterCount < maxLetters) {
    letterCount++;
    shake = build(letterCount, extra);
    key = solveShake(shake, lexicon, ruleset);
  }

  // These letters simply cannot make this part of speech. Open every remaining
  // cube and drop the Function Demand's word constraint before giving up.
  if (key.count === 0) {
    letterCount = plain.length;
    shake = build(letterCount, extra);
    key = solveShake(shake, lexicon, ruleset);
  }
  if (key.count === 0 && functionDemand) {
    functionDemand = undefined;
    demands.splice(1);
    shake = build(letterCount, extra);
    key = solveShake(shake, lexicon, ruleset);
  }

  // 3. Add demands while the shake stays solvable, until it reaches the target level.
  const wordDefs = rng.shuffle(defsFor(ruleset, type, 'word'));
  const boardDefs = rng.shuffle(defsFor(ruleset, type, 'board'));
  const sentenceDefs = rng.shuffle(defsFor(ruleset, type, 'sentence'));
  const queue: DemandDef[] = [...wordDefs];
  if (targetLevel >= 3) queue.push(...boardDefs.slice(0, 1));

  const maxWordDemands = closed ? 1 : targetLevel <= 2 ? 1 : targetLevel === 3 ? 2 : 3;
  let added = extra.length;
  const usedDefIds = new Set<string>(extra.map((d) => d.defId));
  for (const def of queue) {
    if (added >= maxWordDemands) continue;
    if (usedDefIds.has(def.id)) continue;
    if (demandCubesUsed >= demandable.length) break;
    if (!canAddDemand(ruleset, def, { existing: [...demands, ...extra], functionId: functionDemand?.id, designation })) continue;
    const demand = instantiate(def, rng, ruleset, plain.slice(0, letterCount), [...demands, ...extra]);
    if (!demand) continue;

    const candidateExtra = [...extra, demand];
    demandCubesUsed++;
    const candidate = build(letterCount, candidateExtra);
    const candidateKey = solveShake(candidate, lexicon, ruleset);
    if (candidateKey.count >= minAnswers) {
      extra = candidateExtra;
      shake = candidate;
      key = candidateKey;
      usedDefIds.add(def.id);
      added++;
    } else {
      demandCubesUsed--;
    }
  }

  // 4. One or two sentence-scope demands for realism. They are displayed and
  //    explained, never graded (docs/RESEARCH.md §3.2).
  const sentenceQuota = targetLevel >= 4 ? 2 : targetLevel >= 2 ? 1 : 0;
  let sentenceAdded = 0;
  for (const def of sentenceDefs) {
    if (sentenceAdded >= sentenceQuota) break;
    if (demandCubesUsed >= demandable.length) break;
    if (usedDefIds.has(def.id)) continue;
    if (!canAddDemand(ruleset, def, { existing: [...demands, ...extra], functionId: functionDemand?.id, designation })) continue;
    const demand = instantiate(def, rng, ruleset, plain.slice(0, letterCount), [...demands, ...extra]);
    if (!demand) continue;
    extra = [...extra, demand];
    usedDefIds.add(def.id);
    demandCubesUsed++;
    sentenceAdded++;
  }
  shake = build(letterCount, extra);
  key = solveShake(shake, lexicon, ruleset);

  const decoys = countDecoys(shake, lexicon, ruleset);
  return {
    seed: opts.seed,
    shake,
    designation,
    type,
    functionDemand: functionDemand ? { id: functionDemand.id, label: functionDemand.label } : undefined,
    answerKey: key,
    difficulty: profile(key, shake, decoys),
  };
}

/**
 * Generate a scenario whose difficulty is close to `targetLevel`, retrying with
 * fresh seeds. Deterministic: the same seed always yields the same scenario.
 */
export function generateAtLevel(opts: GeneratorOptions & { attempts?: number }): Scenario {
  const attempts = opts.attempts ?? 6;
  const target = opts.targetLevel ?? 3;
  let best: Scenario | undefined;
  for (let i = 0; i < attempts; i++) {
    const scenario = generateScenario({ ...opts, seed: (opts.seed + i * 7919) >>> 0 });
    if (scenario.answerKey.count === 0) continue;
    if (!best || Math.abs(scenario.difficulty.level - target) < Math.abs(best.difficulty.level - target)) {
      best = scenario;
    }
    if (best.difficulty.level === target) break;
  }
  if (best) return best;
  // Nothing at the requested level was solvable. Fall back to the gentlest shake
  // the player's chosen parts of speech allow — never a part of speech they
  // deselected, even if that means an easier shake than they asked for.
  return generateScenario({ ...opts, targetLevel: 1, minAnswers: 1 });
}
