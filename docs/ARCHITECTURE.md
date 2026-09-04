# Phase 2 — Architecture

The rule is simple: **no LinguiSHTIK logic lives in a React component.** Everything under
`src/engine/` is plain TypeScript with no DOM and no framework, so the whole game engine
is unit-testable on its own — `tests/` imports it directly, and the 93 tests never touch
a browser.

```
data/                       RULE CONFIGURATION — data, never logic
  senior-2026.ts              the Senior Division ruleset (add a file per revision)
  cube-sets.ts                the 23 cubes, labelled by provenance
  closed-class.json           pronouns / prepositions / conjunctions / interjections /
                              linking verbs / auxiliaries / collective nouns, from the Handbook
  judgement-bank.ts           the Handbook's 55-item self-test + 25 rule items

scripts/
  build_lexicon.py          builds public/data/lexicon.json from open sources

src/engine/                 THE ENGINE — no React, no DOM
  types.ts                    shared vocabulary
  lexicon/                    dictionary provider: spellings, tags, frequency, indices
  shake/rng.ts                seeded RNG (every shake is reproducible from its seed)
  shake/pool.ts               what letters a solver may use, with wilds and letter transfer
  demands/predicates.ts       one predicate per word-level demand
  demands/legality.ts         which demands may be stacked together (LT 13 B2, LT 16 M/N/Q/R)
  demands/solve.ts            answer-key solver + submission grading
  generator/scenario.ts       shake generation and difficulty profiling
  scoring/score.ts            training score, plus the official chart for rule drills
  modes/session.ts            every training mode as one pure state machine
  stats/stats.ts              breakdowns, weakness detection
  stats/records.ts            personal records
  persistence/store.ts        local storage behind a `Store` interface

src/ui/                     REACT — rendering and input only
  app-state.tsx               loads the lexicon once, owns persisted data
  router.ts                   hash routing; a drill URL carries its own configuration
  components/                 Board, AnswerInput, Timer
  pages/                      Home, Drill, Judgement, Stats, Rules, Settings
```

## The two decisions that shape everything

### 1. Word-scope vs sentence-scope demands

Every demand in `data/senior-2026.ts` carries a `scope`:

| scope | meaning | example |
| --- | --- | --- |
| `word` | decidable from the word alone → **graded** | double consonant, plural noun, past participle |
| `sentence` | a property of the sentence the player would write → **shown, never graded** | subject, in a gerund phrase, passive voice |
| `board` | changes what letters exist → applied to the pool | colour wild, letter transfer |

The Shake Sprint answer key is *complete* with respect to `word` demands, so "you missed 6"
is a true statement rather than a guess. Sentence-scope demands still appear on screen —
reading a full demand stack at speed is itself a trained skill — with a visible `sentence`
tag so nothing is misrepresented. The reasoning is in [RESEARCH.md §3](RESEARCH.md#3-what-can-and-cannot-be-validated-automatically).

Sentence-scope skill is measured instead through the curated judgement bank, and both
feed one weakness dashboard.

### 2. Generate, then verify

`generateScenario` never emits a shake whose answer key it has not computed:

1. roll all 23 cubes, designate a pattern / structure / purpose;
2. set the Type and Function Demands;
3. **grow** LETTERS one cube at a time until answers exist;
4. **add** demands one at a time, keeping each only if the shake still has enough answers;
5. add one or two sentence-scope demands for realism;
6. re-solve and profile the difficulty.

Every candidate demand passes `canAddDemand` first, which encodes the counting limits
(LT 13 B2, LT 16 M/N/Q) and the dependencies the Handbook states — no clause demand under a
`simple` or `compound` designation, no section-R function before a clause or phrase exists,
no "function for gerund" unless gerund is the Function Demand.

The cost is a handful of solves per shake (~5 ms); the payoff is that an unsolvable or
self-contradictory scenario cannot reach the player.

### Difficulty is gameplay difficulty

`DifficultyProfile` blends four things, none of which is sentence length:

- **scarcity** — how few answers exist (dominant term)
- **constraint count** — simultaneous word-level demands
- **rarity** — frequency tier of the easiest answer
- **decoys** — common words that fit the letters but are the wrong part of speech, which is
  what punishes sloppy pattern recognition even when answers are plentiful

## Modes

All seven modes are one state machine (`modes/session.ts`) driven by a `ModeSpec`:
per-shake or per-session clock, an optional word quota, an optional fixed shake count,
`escalating` for Progressive Speed, `locked` for the Senior Simulation. Adding a mode is
adding a spec, not a new code path.

## Performance

The lexicon is stored as one packed `Uint8Array` of 26-slot letter counts. `canSpell` reads
that array at an offset instead of copying, and the solver walks a cached per-part-of-speech
index. A full re-solve of the tagged lexicon is a few milliseconds, so an answer key can be
recomputed on demand rather than cached and invalidated.

## Rule changes

`data/senior-2026.ts` is versioned data. When AGLOA revises the rules, copy it to
`senior-2027.ts`, edit, and point the app at it. Engine code reads limits, timings,
demand definitions, patterns and the scoring chart out of the ruleset — nothing is
hard-coded, and the in-app Rules page renders straight from the same object, so the
reference can never drift from what the engine enforces.

## Club features — the seams, not the feature

Deliberately **not** built yet, but the joins are in place:

- `persistence/store.ts` is an interface (`load` / `save` / `clear`) with a `Profile`, so a
  remote store drops in without touching the UI.
- `ShakeLog` / `SessionLog` / `JudgementLog` are flat, serialisable rows — already the shape
  a leaderboard or club table would want.
- Every shake is reproducible from `(seed, ruleset, cubeSet)`, so a weekly challenge or a
  head-to-head is a shared seed, not a shared payload.
- `generateAtLevel` is deterministic, so two players given the same seed get the same shakes.

## Testing

`npm test` runs 93 tests: letter pools with wilds and transfers, word and demand validation,
demand-stack legality, generator invariants over hundreds of seeds, the session state
machine, scoring, statistics, records and persistence. Two suites are regression tests
against official material — the worked shake from AGLOA's own step-by-step guide
("Summer brings sunburn."), and the complete scoring chart.
