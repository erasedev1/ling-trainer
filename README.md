# LING Trainer — Senior Division 2026

A speed-training simulator for Academic Games **LinguiSHTIK**, built around the current
**Senior Division** rules: LinguiSHTIK Tournament Rules 2026-27 (June 2026), the Senior
Order of Play (June 2026), and the Handbook & Judges Manual (August 1, 2026).

It is not a quiz site. The loop is:

```
SHAKE  →  DEMANDS  →  15 SECONDS  →  TYPE  →  VALIDATE  →  MISSED WORDS  →  NEXT
```

Open it, press **Shake Sprint**, and you are typing within a second.

## Quick start

```bash
npm install
npm run lexicon     # builds public/data/lexicon.json (needs python3 + network, once)
npm run dev         # http://localhost:5173
npm test            # 93 engine tests
npm run build       # static site in dist/ — host it anywhere
```

The build is entirely static: no server, no accounts, no network at runtime. All training
data lives in the browser's local storage.

## Deploying to GitHub Pages

`.github/workflows/pages.yml` builds the site and publishes `dist/` on every push to the
default branch. **One repository setting has to be changed by hand, once:**

> **Settings → Pages → Build and deployment → Source: _GitHub Actions_**

This cannot be automated. GitHub blocks the Pages settings API for a workflow's
`GITHUB_TOKEN`: `PUT /repos/{owner}/{repo}/pages` answers `403 Resource not accessible by
integration` even when the job is granted `pages: write`.

Until that setting is changed, Pages stays in branch ("legacy") mode and GitHub's own
*"pages build and deployment"* workflow runs on every push, publishing the repository
*source*. The browser is handed `index.html`'s `<script src="/src/main.tsx">`, cannot execute
TypeScript, and renders a **blank page**. Both workflows write to the same site, so whichever
finishes last wins and the site flickers between the real build and a blank page — a blank
page next to a green checkmark on the deploy is exactly that race.

The `check` job in the workflow reports the current build source and writes a warning into
the run summary when it is wrong, so this can never look like success again.

The site is built with a relative base (`base: './'` in `vite.config.ts`) and uses hash
routing, so it works from a project subpath such as `https://<user>.github.io/ling-trainer/`
with no extra configuration, and deep links like `#/drill?mode=max-out` survive a refresh.

## What it trains

| Mode | What it is for |
| --- | --- |
| **Shake Sprint** | The core loop. One generated Senior shake, one clock, every word you can find. |
| **X in Y** | Hit a word quota inside a time limit. |
| **Max Out** | Thirty seconds, maximise. Built for beating your own record. |
| **Category Gauntlet** | Consecutive shakes that all use one Type Demand or general demand — for grinding a weak area. |
| **Random Gauntlet** | Same, with the demand stack drawn at random. Adaptability. |
| **Progressive Speed** | Less time, bigger quota, harder shakes each level. Ends the first time you miss. |
| **Senior Simulation** | Twelve shakes, fixed sequence, nothing adjustable, full report at the end. |

## Setting up a drill

Every mode except the Senior Simulation opens to its own options, and each one changes what
the engine actually generates:

| Option | What it does |
| --- | --- |
| **Parts of speech** | Which Type Demands the shakes may use. Pick any combination — "noun + verb", "prepositions only". Deselecting everything means *any*. |
| **Cubes** | `Letters + 1` is live play — the mat plus one cube from Resources (LT 19 A). `Letters + 2` is the Forceout case (LT 24). `All cubes` opens every rolled cube: not a real board position, but the best pure vocabulary sprint. |
| **Seconds** | Presets, or type an exact number. |
| **Words to clear** | The quota, where the mode has one. |
| **Extra demands** | How many general demands stack on the Type Demand — None through Brutal. |
| **Always demand** | Pin one general demand into every shake (plural nouns, double consonant, past participle …) to grind exactly that. |

The choices ride in the URL, so a drill is shareable and repeatable:
`#/drill?mode=shake-sprint&types=noun,verb&cubes=all&seconds=60`.

## Two things worth knowing before you use it

**1. The cube faces are an approximation.** AGLOA publishes the cube *colours* (four each of
red, black, green, pink and yellow, plus three orange) and two facts about their content —
two red cubes must contain a U, and some red cubes carry a C instead — but no official
document lists the six faces of any cube. The shipped set matches the published colour
counts and is labelled `approximate` everywhere it appears. **Settings → cube set** lets you
type in the real faces from a physical set, after which every generated shake is exact.

**2. Only word-level demands are graded.** The official dictionary is Webster's Third
Unabridged, which is not redistributable, and demands like *subject*, *in a gerund phrase*
or *passive voice* are properties of the sentence you would write, not of the word. So:

- word-level demands (part of speech, letter count, must contain, double consonant, plural,
  participle, collective, compound, pronoun class and case, regular/irregular…) are graded
  against a complete answer key;
- sentence-level demands are displayed and marked `sentence` — they are yours to satisfy in a
  real solution, and the trainer does not pretend to grade them;
- a real word the trainer has no grammar data for is reported **UNVERIFIED** and counts
  neither for nor against you.

The full reasoning, and the two genuinely open questions, are in
[`docs/RESEARCH.md`](docs/RESEARCH.md).

## Scoring

The per-drill number is a **training score, not official AGLOA scoring** — it is labelled that
way in the app. Official scoring awards 6 / 4 / 2 per shake among three players and has no
meaning for a solo drill. The real chart is still implemented in `data/senior-2026.ts` and
covered by tests.

## Documentation

- [`docs/RESEARCH.md`](docs/RESEARCH.md) — how Senior LinguiSHTIK actually works, the complete
  Senior demand structure, what can and cannot be validated automatically, open questions
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the engine is separated from the UI, how
  shakes are generated and verified, and where club features will attach

## When the rules change

`data/senior-2026.ts` is the whole rule configuration: patterns, structures, purposes, type and
function demands, every general demand LT 16 A–R, limits, timings, penalties and the scoring
chart. Copy it, edit it, point the app at the new file. No engine code hard-codes a rule, and
the drill options are built from the same object, so the parts of speech and demands a player
can pick cannot drift from what the engine enforces.
