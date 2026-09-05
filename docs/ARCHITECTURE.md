# Architecture

**No LinguiSHTIK logic lives in a React component.** Everything under `src/engine/` is plain
TypeScript with no DOM and no framework, so the engine is unit tested on its own — `tests/`
imports it directly and never touches a browser.

```
data/
  senior-2026.ts        rule configuration: parts of speech (LT 9), word rules (LT 2, LT 22)
  cube-sets.ts          the 23 cubes, labelled by provenance
  closed-class.json     pronouns / prepositions / conjunctions / interjections / linking
                        verbs / auxiliaries / collective nouns, from the Handbook

scripts/
  build_lexicon.py      builds public/data/lexicon.json from open sources

src/engine/
  types.ts              shared vocabulary
  lexicon/              the dictionary: spellings, part-of-speech tags, frequency, indices
  shake/rng.ts          seeded RNG — every roll is reproducible from its seed
  roll/roll.ts          the roll, its letters, the answer key, and grading one word
  roll/session.ts       the drill as a pure state machine: start, submit, tick, finish
  stats/                per-part-of-speech rates, totals, personal bests
  persistence/store.ts  local storage behind a `Store` interface

src/ui/
  app-state.tsx         loads the lexicon once, owns persisted data
  router.ts             hash routing; a drill URL carries its own configuration
  pages/                Home (setup), Drill, Stats, Settings
```

## The drill

`createRoll` rolls every cube in the set onto one face. `answerKey` then walks the lexicon
once per chosen part of speech and keeps every word that is 4–10 letters, spellable from the
rolled letters, and tagged with that part of speech — deduplicated, ordered most-common
first. `gradeWord` applies the same rules to one typed word, so the key and the grader can
never disagree; a test asserts exactly that.

Spelling is a plain multiset check: one cube spells one letter, so a word needing two Ms
needs two M cubes. Letter counts for the whole lexicon are precomputed as one packed
`Uint8Array`, and the roll's own counts are computed once per drill, so grading a submission
is 26 integer comparisons.

## Why rate, not coverage

A roll of all 23 cubes typically allows a few *thousand* words. "Share of what was available"
would sit near zero for everybody and say nothing, so the statistics track **words found per
minute** per part of speech instead, and only call one out when it is clearly behind the
player's own best across at least three rolls. An empty result means "nothing stands out
yet", not "everything is fine".

Personal bests for word counts are kept per clock length, because 12 words in 30 seconds and
12 in 120 seconds are not the same achievement.

## Rule changes

`data/senior-2026.ts` is versioned data. Copy it, edit it, point the app at the new file.
The engine reads the letter range and the parts of speech from it; nothing is hard-coded,
and the setup screen builds its chips from the same list, so what a player can pick cannot
drift from what the engine enforces.

## Testing

`npm test` covers rolling (determinism, every cube on a face it has, published colour
counts), grading (letter multisets, part of speech, the 4–10 range, duplicates, contractions,
untagged spellings), the answer key (agrees with the grader, ordered, deduplicated, grows
with more parts of speech), the drill state machine, results arithmetic, personal bests, the
statistics, and persistence including recovery from corrupt storage.
