import type { Ruleset } from '../../../data/senior-2026';
import type { Demand, DemandDef } from '../types';

export interface StackContext {
  /** Demands already in force this shake. */
  existing: Demand[];
  /** The Function Demand id in force, if any. */
  functionId?: string;
  /** Sentence designation kind and id, e.g. `structure` / `simple`. */
  designation?: { kind: 'pattern' | 'structure' | 'purpose'; id: string };
}

const CLAUSE_OR_PHRASE = (id: string) => id.startsWith('clause.') || id.startsWith('phrase.');

/** Groups where the rules (or plain sense) permit only one member per shake. */
const EXCLUSIVE_GROUPS: string[][] = [
  ['noun.singular', 'noun.plural'],
  ['noun.nominative', 'noun.objective'],
  ['pronoun.singular', 'pronoun.plural'],
  ['pronoun.nominative', 'pronoun.objective', 'pronoun.possessive'],
  ['pronoun.indefinite', 'pronoun.personal', 'pronoun.interrogative', 'pronoun.demonstrative', 'pronoun.relative'],
  ['verb.singular', 'verb.plural'],
  ['verb.regular', 'verb.irregular'],
  ['verb.presentParticiple', 'verb.pastParticiple'],
  ['verb.simpleTense', 'verb.perfectTense', 'verb.progressive', 'verb.perfectProgressive'],
  ['verb.activeVoice', 'verb.passiveVoice'],
  ['adjective.positive', 'adjective.comparative', 'adjective.superlative'],
  ['adjective.regular', 'adjective.irregular'],
  ['adverb.positive', 'adverb.comparative', 'adverb.superlative'],
  ['adverb.regular', 'adverb.irregular'],
  ['quote.direct', 'quote.indirect'],
];

/**
 * May `def` be added to the demands already in force?
 *
 * Encodes the counting limits the rules state outright (LT 13 B2 duplicates,
 * LT 16 M/N "twice in this division", LT 16 Q "limited to once") plus the
 * dependencies the Handbook spells out — a "function for gerund" demand only
 * exists once gerund is the Function Demand (LT 16 J13), section R only applies
 * after a clause or phrase has been demanded (LT 16 R), and a dependent clause
 * turns a simple sentence into a complex one (HB II.B.1), so a clause demand
 * cannot sit under a `simple` designation.
 */
export function canAddDemand(ruleset: Ruleset, def: DemandDef, ctx: StackContext): boolean {
  const ids = ctx.existing.map((d) => d.defId);

  if (def.oncePerShake && ids.includes(def.id)) return false;

  for (const group of EXCLUSIVE_GROUPS) {
    if (group.includes(def.id) && group.some((id) => ids.includes(id))) return false;
  }

  // LT 16 M & N: at most two clause-or-phrase containment demands per shake.
  if (CLAUSE_OR_PHRASE(def.id)) {
    if (ids.filter(CLAUSE_OR_PHRASE).length >= ruleset.limits.clauseAndPhraseTotal) return false;
    if (ids.includes(def.id)) return false;
  }

  // LT 16 Q: "must NOT be contained in" is limited to once.
  if (def.id === 'not.in' && ids.filter((id) => id === 'not.in').length >= ruleset.limits.mustNotBeContainedIn) {
    return false;
  }

  // LT 16 J12-13: these presuppose the matching Function Demand.
  if (def.id === 'verb.infinitiveFunction' && ctx.functionId !== 'infinitive') return false;
  if (def.id === 'verb.gerundFunction' && ctx.functionId !== 'gerund') return false;

  // LT 16 R applies only after a clause or phrase that *has* listed functions.
  if (def.id === 'cpf.function' && !ids.some((id) => ruleset.clausePhraseFunctions[id])) return false;

  // HB II.B.1-2: a simple sentence has no dependent clause, and a compound
  // sentence has "NO dependent clause" either; a quote containing a subject and
  // verb is itself a noun clause (HB II.B.1, XVIII #4). So under those two
  // designations a clause or quote demand would be self-contradictory.
  const structure = ctx.designation?.kind === 'structure' ? ctx.designation.id : undefined;
  if (structure === 'simple' || structure === 'compound') {
    if (def.id.startsWith('clause.') || def.id.startsWith('quote.')) return false;
  }

  // LT 16 H note: singular / plural do not apply to a noun used as adjective.
  if (ctx.functionId === 'noun-as-adjective' && (def.id === 'noun.singular' || def.id === 'noun.plural')) return false;

  return true;
}

/** Explain why a stack is or is not legal — used by the rule-knowledge drills. */
export function stackViolations(ruleset: Ruleset, demands: Demand[]): string[] {
  const problems: string[] = [];
  const ids = demands.map((d) => d.defId);
  const clausePhrase = ids.filter(CLAUSE_OR_PHRASE).length;
  if (clausePhrase > ruleset.limits.clauseAndPhraseTotal) {
    problems.push(
      `LT 16 M & N — at most ${ruleset.limits.clauseAndPhraseTotal} clause or phrase demands per shake, found ${clausePhrase}.`,
    );
  }
  if (ids.filter((id) => id === 'not.in').length > ruleset.limits.mustNotBeContainedIn) {
    problems.push('LT 16 Q — "must NOT be contained in" may be demanded only once per shake.');
  }
  const counted = new Map<string, number>();
  for (const id of ids) counted.set(id, (counted.get(id) ?? 0) + 1);
  for (const def of ruleset.generalDemands) {
    if (def.oncePerShake && (counted.get(def.id) ?? 0) > 1) {
      problems.push(`LT 13 B2 — Duplicate Demand: ${def.label} was called twice (-1 penalty).`);
    }
  }
  return problems;
}
